-- ============================================================================
-- ACCOUNT DELETION SYSTEM - PHASE 1: DATABASE SETUP
-- ============================================================================
-- This migration creates the account deletion tracking system with 30-day grace period
-- 
-- Features:
-- - Track deletion requests with scheduled dates
-- - 30-day grace period before actual deletion
-- - Cancellation support
-- - Audit trail
-- - Preserve entitlements (ethical commitment)
--
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- 1. Create account_deletion_requests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'processing', 'completed')),
    
    -- Cancellation token for email links
    cancellation_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    
    -- Audit information
    requested_from_ip INET,
    cancelled_from_ip INET,
    
    -- Metadata
    reason TEXT,
    notes TEXT,
    
    -- Indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add helpful comment
COMMENT ON TABLE public.account_deletion_requests IS 'Tracks account deletion requests with 30-day grace period and cancellation support';
COMMENT ON COLUMN public.account_deletion_requests.scheduled_for IS 'Date when account will be automatically deleted (typically +30 days from request)';
COMMENT ON COLUMN public.account_deletion_requests.cancellation_token IS 'Unique token for one-click cancellation via email link';
COMMENT ON COLUMN public.account_deletion_requests.status IS 'scheduled=awaiting deletion, cancelled=user cancelled, processing=being deleted, completed=deleted';


-- 2. Add soft-delete columns to existing tables
-- ============================================================================

-- Add deletion tracking to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.user_profiles.deletion_requested_at IS 'When user requested account deletion';
COMMENT ON COLUMN public.user_profiles.deletion_scheduled_for IS 'When account is scheduled to be deleted';
COMMENT ON COLUMN public.user_profiles.deleted_at IS 'When account was actually deleted (soft delete timestamp)';

-- Add soft delete to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete to user_notifications
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete to login_activity
ALTER TABLE public.login_activity 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete to user_2fa
ALTER TABLE public.user_2fa 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete to user_sessions
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- NOTE: entitlements table is NEVER deleted (ethical commitment)


-- 3. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id 
    ON public.account_deletion_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status 
    ON public.account_deletion_requests(status) 
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_for 
    ON public.account_deletion_requests(scheduled_for) 
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_deletion_requests_token 
    ON public.account_deletion_requests(cancellation_token);

CREATE INDEX IF NOT EXISTS idx_user_profiles_deletion_scheduled 
    ON public.user_profiles(deletion_scheduled_for) 
    WHERE deletion_scheduled_for IS NOT NULL;


-- 4. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests" 
ON public.account_deletion_requests FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own deletion requests
DROP POLICY IF EXISTS "Users can create own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can create own deletion requests" 
ON public.account_deletion_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own deletion requests (for cancellation)
DROP POLICY IF EXISTS "Users can update own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can update own deletion requests" 
ON public.account_deletion_requests FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role can do everything (for automated processing)
DROP POLICY IF EXISTS "Service role can manage deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Service role can manage deletion requests" 
ON public.account_deletion_requests FOR ALL 
USING (true);


-- 5. Helper function: Check if user has pending deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_pending_deletion(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.account_deletion_requests 
        WHERE user_id = user_uuid 
        AND status = 'scheduled'
        AND scheduled_for > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_pending_deletion IS 'Check if user has a pending account deletion scheduled';

-- Grant permission
GRANT EXECUTE ON FUNCTION public.has_pending_deletion TO authenticated;


-- 6. Helper function: Get deletion request details
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_deletion_request(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    deletion_id UUID,
    requested_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    status TEXT,
    cancellation_token UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        account_deletion_requests.requested_at,
        account_deletion_requests.scheduled_for,
        EXTRACT(DAY FROM (account_deletion_requests.scheduled_for - NOW()))::INTEGER as days_remaining,
        account_deletion_requests.status,
        account_deletion_requests.cancellation_token
    FROM public.account_deletion_requests
    WHERE user_id = user_uuid 
    AND account_deletion_requests.status = 'scheduled'
    ORDER BY account_deletion_requests.requested_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_deletion_request IS 'Get active deletion request details for a user';

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_deletion_request TO authenticated;


-- 7. Trigger: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_deletion_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deletion_request_timestamp ON public.account_deletion_requests;
CREATE TRIGGER update_deletion_request_timestamp
    BEFORE UPDATE ON public.account_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_deletion_request_timestamp();


-- 8. Trigger: Sync deletion status to user_profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_deletion_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When deletion is requested
    IF NEW.status = 'scheduled' AND (OLD IS NULL OR OLD.status != 'scheduled') THEN
        UPDATE public.user_profiles
        SET 
            deletion_requested_at = NEW.requested_at,
            deletion_scheduled_for = NEW.scheduled_for
        WHERE id = NEW.user_id;
    END IF;
    
    -- When deletion is cancelled
    IF NEW.status = 'cancelled' AND OLD.status = 'scheduled' THEN
        UPDATE public.user_profiles
        SET 
            deletion_requested_at = NULL,
            deletion_scheduled_for = NULL
        WHERE id = NEW.user_id;
    END IF;
    
    -- When deletion is completed
    IF NEW.status = 'completed' THEN
        UPDATE public.user_profiles
        SET deleted_at = NEW.processed_at
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_deletion_to_profile ON public.account_deletion_requests;
CREATE TRIGGER sync_deletion_to_profile
    AFTER INSERT OR UPDATE ON public.account_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_deletion_to_profile();


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'account_deletion_requests'
) as deletion_table_exists;

-- Check if columns were added
SELECT 
    column_name, 
    data_type,
    table_name
FROM information_schema.columns 
WHERE table_schema = 'public'
AND column_name IN ('deleted_at', 'deletion_requested_at', 'deletion_scheduled_for')
ORDER BY table_name, column_name;

-- Check if functions were created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
    'has_pending_deletion',
    'get_deletion_request',
    'sync_deletion_to_profile',
    'update_deletion_request_timestamp'
)
ORDER BY routine_name;

-- Check if indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE '%deletion%'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'account_deletion_requests'
ORDER BY policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Phase 1 Complete: Account Deletion Database Setup';
    RAISE NOTICE '📊 Tables: account_deletion_requests created';
    RAISE NOTICE '📊 Columns: Soft-delete columns added to 6 tables';
    RAISE NOTICE '🔒 RLS: Policies enabled and configured';
    RAISE NOTICE '⚡ Functions: 4 helper functions created';
    RAISE NOTICE '📇 Indexes: Performance indexes created';
    RAISE NOTICE '🔄 Triggers: Auto-sync triggers configured';
    RAISE NOTICE '';
    RAISE NOTICE '➡️  Next: Phase 2 - Create edge functions';
END $$;


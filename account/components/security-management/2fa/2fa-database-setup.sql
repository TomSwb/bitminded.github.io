-- ============================================================================
-- Two-Factor Authentication Database Setup
-- ============================================================================
-- This script adds all necessary database components for 2FA functionality
-- Execute this in the Supabase SQL Editor
--
-- IMPORTANT: The main user_2fa table already exists in database-schema.sql
-- This script only adds enhancements and supporting tables
-- ============================================================================

-- ============================================================================
-- 1. ADD PERFORMANCE INDEXES
-- ============================================================================
-- These indexes improve query performance for 2FA lookups

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id 
ON public.user_2fa(user_id);

-- Index for checking enabled status
CREATE INDEX IF NOT EXISTS idx_user_2fa_is_enabled 
ON public.user_2fa(is_enabled);

-- ============================================================================
-- 2. ADD LAST VERIFIED TIMESTAMP (Optional but Recommended)
-- ============================================================================
-- Track when 2FA was last successfully used

ALTER TABLE public.user_2fa 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 3. CREATE 2FA ATTEMPTS TRACKING TABLE
-- ============================================================================
-- Track all 2FA verification attempts for security and auditing
-- Helps prevent brute force attacks

CREATE TABLE IF NOT EXISTS public.user_2fa_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,
    attempt_type TEXT DEFAULT 'totp' -- 'totp' or 'backup_code'
);

-- Add helpful comment
COMMENT ON TABLE public.user_2fa_attempts IS 'Tracks all 2FA verification attempts for security monitoring and brute force prevention';

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ATTEMPTS TABLE
-- ============================================================================

ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own 2FA attempts
CREATE POLICY "Users can view own 2FA attempts" 
ON public.user_2fa_attempts
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow insert for logging attempts (needed for both client and server)
CREATE POLICY "Allow insert 2FA attempts" 
ON public.user_2fa_attempts
FOR INSERT 
WITH CHECK (true);

-- Only allow updates and deletes for admins (for cleanup)
CREATE POLICY "Admins can manage 2FA attempts" 
ON public.user_2fa_attempts
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- 5. ADD INDEXES FOR ATTEMPTS TABLE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_user_id 
ON public.user_2fa_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_time 
ON public.user_2fa_attempts(attempt_time);

CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_success 
ON public.user_2fa_attempts(success);

-- ============================================================================
-- 6. ADD UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically update the updated_at timestamp when 2FA settings change

-- Create or replace the trigger function (may already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_2fa table
DROP TRIGGER IF EXISTS update_user_2fa_updated_at ON public.user_2fa;
CREATE TRIGGER update_user_2fa_updated_at 
    BEFORE UPDATE ON public.user_2fa 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HELPER FUNCTIONS FOR 2FA MANAGEMENT
-- ============================================================================

-- Function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION public.user_has_2fa_enabled(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_2fa 
        WHERE user_id = user_uuid 
        AND is_enabled = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get failed attempt count in last N minutes
CREATE OR REPLACE FUNCTION public.get_2fa_failed_attempts(
    user_uuid UUID DEFAULT auth.uid(),
    minutes_ago INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_2fa_attempts 
        WHERE user_id = user_uuid 
        AND success = FALSE 
        AND attempt_time > (NOW() - INTERVAL '1 minute' * minutes_ago)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is temporarily locked due to failed attempts
CREATE OR REPLACE FUNCTION public.is_2fa_account_locked(
    user_uuid UUID DEFAULT auth.uid(),
    max_attempts INTEGER DEFAULT 5,
    lockout_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    failed_attempts INTEGER;
BEGIN
    failed_attempts := public.get_2fa_failed_attempts(user_uuid, lockout_minutes);
    RETURN failed_attempts >= max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CLEANUP FUNCTION FOR OLD ATTEMPTS
-- ============================================================================
-- Function to clean up old 2FA attempts (run periodically via cron or manually)

CREATE OR REPLACE FUNCTION public.cleanup_old_2fa_attempts(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_2fa_attempts
    WHERE attempt_time < (NOW() - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_2fa_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_2fa_failed_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_2fa_account_locked TO authenticated;

-- Only admins can run cleanup function
REVOKE EXECUTE ON FUNCTION public.cleanup_old_2fa_attempts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_2fa_attempts TO service_role;

-- ============================================================================
-- 10. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.user_2fa.secret_key IS 'Base32 encoded TOTP secret key';
COMMENT ON COLUMN public.user_2fa.backup_codes IS 'Array of hashed backup codes for account recovery';
COMMENT ON COLUMN public.user_2fa.is_enabled IS 'Whether 2FA is currently active for this user';
COMMENT ON COLUMN public.user_2fa.last_verified_at IS 'Timestamp of last successful 2FA verification';

COMMENT ON FUNCTION public.user_has_2fa_enabled IS 'Check if a user has 2FA enabled';
COMMENT ON FUNCTION public.get_2fa_failed_attempts IS 'Get count of failed 2FA attempts in specified time window';
COMMENT ON FUNCTION public.is_2fa_account_locked IS 'Check if account is temporarily locked due to failed 2FA attempts';
COMMENT ON FUNCTION public.cleanup_old_2fa_attempts IS 'Remove old 2FA attempt records (for maintenance)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after executing the script to verify everything was created

-- Check if all indexes exist
DO $$
BEGIN
    RAISE NOTICE 'Verifying indexes...';
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_2fa_user_id') THEN
        RAISE NOTICE '✓ idx_user_2fa_user_id exists';
    ELSE
        RAISE WARNING '✗ idx_user_2fa_user_id missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_2fa_is_enabled') THEN
        RAISE NOTICE '✓ idx_user_2fa_is_enabled exists';
    ELSE
        RAISE WARNING '✗ idx_user_2fa_is_enabled missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_2fa_attempts_user_id') THEN
        RAISE NOTICE '✓ idx_user_2fa_attempts_user_id exists';
    ELSE
        RAISE WARNING '✗ idx_user_2fa_attempts_user_id missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_2fa_attempts_time') THEN
        RAISE NOTICE '✓ idx_user_2fa_attempts_time exists';
    ELSE
        RAISE WARNING '✗ idx_user_2fa_attempts_time missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_2fa_attempts_success') THEN
        RAISE NOTICE '✓ idx_user_2fa_attempts_success exists';
    ELSE
        RAISE WARNING '✗ idx_user_2fa_attempts_success missing';
    END IF;
END $$;

-- Check if user_2fa_attempts table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_2fa_attempts') THEN
        RAISE NOTICE '✓ user_2fa_attempts table exists';
    ELSE
        RAISE WARNING '✗ user_2fa_attempts table missing';
    END IF;
END $$;

-- Check if helper functions exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_2fa_enabled') THEN
        RAISE NOTICE '✓ user_has_2fa_enabled function exists';
    ELSE
        RAISE WARNING '✗ user_has_2fa_enabled function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_2fa_failed_attempts') THEN
        RAISE NOTICE '✓ get_2fa_failed_attempts function exists';
    ELSE
        RAISE WARNING '✗ get_2fa_failed_attempts function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_2fa_account_locked') THEN
        RAISE NOTICE '✓ is_2fa_account_locked function exists';
    ELSE
        RAISE WARNING '✗ is_2fa_account_locked function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_2fa_attempts') THEN
        RAISE NOTICE '✓ cleanup_old_2fa_attempts function exists';
    ELSE
        RAISE WARNING '✗ cleanup_old_2fa_attempts function missing';
    END IF;
END $$;

-- Check if last_verified_at column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_2fa' 
        AND column_name = 'last_verified_at'
    ) THEN
        RAISE NOTICE '✓ last_verified_at column exists';
    ELSE
        RAISE WARNING '✗ last_verified_at column missing';
    END IF;
END $$;

-- ============================================================================
-- SAMPLE TEST QUERIES (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these to test the functions after setup

-- Test if current user has 2FA enabled
-- SELECT public.user_has_2fa_enabled();

-- Test getting failed attempts count
-- SELECT public.get_2fa_failed_attempts(auth.uid(), 15);

-- Test if account is locked
-- SELECT public.is_2fa_account_locked(auth.uid(), 5, 15);

-- View all 2FA attempts for current user
-- SELECT * FROM public.user_2fa_attempts WHERE user_id = auth.uid() ORDER BY attempt_time DESC LIMIT 10;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '2FA Database Setup Complete!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Review the verification output above';
    RAISE NOTICE '2. Create the Edge Function for TOTP verification';
    RAISE NOTICE '3. Start implementing the frontend components';
    RAISE NOTICE '============================================================================';
END $$;

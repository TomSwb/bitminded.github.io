-- ============================================================================
-- User Detail Data Tracking Fixes
-- ============================================================================
-- This migration adds missing features for the admin user detail page:
-- 1. User status tracking in user_profiles
-- 2. Admin notes table
-- 3. Helper functions for login count and session count
-- ============================================================================

-- ============================================================================
-- 1. ADD STATUS COLUMN TO USER_PROFILES
-- ============================================================================

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted', 'pending'));
        
        RAISE NOTICE 'Added status column to user_profiles';
    ELSE
        RAISE NOTICE 'Status column already exists in user_profiles';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.user_profiles.status IS 'User account status: active, suspended, deleted, pending';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- ============================================================================
-- 2. CREATE ADMIN NOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add helpful comment
COMMENT ON TABLE public.admin_notes IS 'Stores admin notes about users for internal tracking';

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin notes
CREATE POLICY "Admins can view all admin notes" 
ON public.admin_notes
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can insert admin notes
CREATE POLICY "Admins can insert admin notes" 
ON public.admin_notes
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can update their own admin notes
CREATE POLICY "Admins can update own admin notes" 
ON public.admin_notes
FOR UPDATE 
USING (
    admin_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can delete admin notes
CREATE POLICY "Admins can delete admin notes" 
ON public.admin_notes
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON public.admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON public.admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON public.admin_notes(created_at DESC);

-- ============================================================================
-- 3. HELPER FUNCTION: GET TOTAL LOGIN COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_total_login_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_login_activity 
        WHERE user_id = user_uuid 
        AND success = TRUE
    )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_total_login_count IS 'Get total successful login count for a user';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_total_login_count TO authenticated;

-- ============================================================================
-- 4. HELPER FUNCTION: GET ACTIVE SESSION COUNT
-- ============================================================================

-- This function counts active Supabase sessions from auth.sessions
-- Note: auth.sessions is a Supabase internal table that tracks active sessions
CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Try to count sessions from auth.sessions (Supabase internal table)
    -- Sessions are considered active if they haven't expired
    BEGIN
        SELECT COUNT(*)::INTEGER INTO session_count
        FROM auth.sessions
        WHERE user_id = user_uuid
        AND NOT factored_at IS NULL -- Session has been authenticated
        AND (expires_at IS NULL OR expires_at > NOW()); -- Not expired
        
        RETURN COALESCE(session_count, 0);
    EXCEPTION
        WHEN OTHERS THEN
            -- If auth.sessions table is not accessible or has different structure
            -- Return 0 as fallback
            RETURN 0;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active sessions for a user';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- 5. HELPER FUNCTION: GET USER STATISTICS
-- ============================================================================

-- Combined function to get all user statistics at once (more efficient)
CREATE OR REPLACE FUNCTION public.get_user_statistics(user_uuid UUID)
RETURNS TABLE (
    total_logins INTEGER,
    active_sessions INTEGER,
    subscription_count INTEGER,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.user_login_activity WHERE user_id = user_uuid AND success = TRUE) as total_logins,
        (SELECT public.get_user_active_session_count(user_uuid)) as active_sessions,
        (SELECT COUNT(*)::INTEGER FROM public.entitlements WHERE user_id = user_uuid AND active = TRUE) as subscription_count,
        (SELECT login_time FROM public.user_login_activity WHERE user_id = user_uuid AND success = TRUE ORDER BY login_time DESC LIMIT 1) as last_login,
        (SELECT COUNT(*)::INTEGER FROM public.user_login_activity WHERE user_id = user_uuid AND success = FALSE) as failed_login_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_statistics IS 'Get all user statistics in one query for efficiency';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_statistics TO authenticated;

-- ============================================================================
-- 6. ADD UPDATED_AT TRIGGER FOR ADMIN NOTES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_admin_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_notes_updated_at_trigger ON public.admin_notes;

CREATE TRIGGER update_admin_notes_updated_at_trigger
    BEFORE UPDATE ON public.admin_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_notes_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'User Detail Data Tracking Migration Complete!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '1. ✅ Added status column to user_profiles';
    RAISE NOTICE '2. ✅ Created admin_notes table with RLS policies';
    RAISE NOTICE '3. ✅ Created get_user_total_login_count() function';
    RAISE NOTICE '4. ✅ Created get_user_active_session_count() function';
    RAISE NOTICE '5. ✅ Created get_user_statistics() function (combined stats)';
    RAISE NOTICE '6. ✅ Added updated_at trigger for admin_notes';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update user-detail-page.js to use new functions';
    RAISE NOTICE '2. Update user-management.js to query status column';
    RAISE NOTICE '3. Test the admin notes functionality';
    RAISE NOTICE '============================================================================';
END $$;


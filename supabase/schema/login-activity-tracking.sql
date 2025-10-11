-- ============================================================================
-- Login Activity Tracking System
-- ============================================================================
-- This creates a comprehensive login activity tracking table
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- 1. CREATE LOGIN ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.user_login_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- 'invalid_credentials', 'invalid_2fa', 'account_locked', etc.
    ip_address INET,
    user_agent TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT, -- 'Chrome', 'Firefox', 'Safari', etc.
    os TEXT, -- 'Windows', 'macOS', 'iOS', 'Android', 'Linux'
    location_country TEXT,
    location_city TEXT,
    used_2fa BOOLEAN DEFAULT FALSE,
    session_id TEXT -- Link to Supabase session if available
);

-- Add helpful comment
COMMENT ON TABLE public.user_login_activity IS 'Tracks all login attempts (successful and failed) for security monitoring';

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_login_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own login activity
CREATE POLICY "Users can view own login activity" 
ON public.user_login_activity
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow insert for logging (needed for both client and server)
CREATE POLICY "Allow insert login activity" 
ON public.user_login_activity
FOR INSERT 
WITH CHECK (true);

-- Admins can view all login activity
CREATE POLICY "Admins can view all login activity" 
ON public.user_login_activity
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_login_activity_user_id 
ON public.user_login_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_login_activity_time 
ON public.user_login_activity(login_time DESC);

CREATE INDEX IF NOT EXISTS idx_login_activity_success 
ON public.user_login_activity(success);

CREATE INDEX IF NOT EXISTS idx_login_activity_user_time 
ON public.user_login_activity(user_id, login_time DESC);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to get recent login activity for a user
CREATE OR REPLACE FUNCTION public.get_recent_login_activity(
    user_uuid UUID DEFAULT auth.uid(),
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    login_time TIMESTAMP WITH TIME ZONE,
    success BOOLEAN,
    failure_reason TEXT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location_city TEXT,
    location_country TEXT,
    used_2fa BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.login_time,
        la.success,
        la.failure_reason,
        la.ip_address,
        la.device_type,
        la.browser,
        la.os,
        la.location_city,
        la.location_country,
        la.used_2fa
    FROM public.user_login_activity la
    WHERE la.user_id = user_uuid
    ORDER BY la.login_time DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count failed login attempts in time window
CREATE OR REPLACE FUNCTION public.count_failed_logins(
    user_uuid UUID DEFAULT auth.uid(),
    minutes_ago INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_login_activity 
        WHERE user_id = user_uuid 
        AND success = FALSE 
        AND login_time > (NOW() - INTERVAL '1 minute' * minutes_ago)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get last successful login
CREATE OR REPLACE FUNCTION public.get_last_successful_login(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN (
        SELECT login_time 
        FROM public.user_login_activity 
        WHERE user_id = user_uuid 
        AND success = TRUE 
        ORDER BY login_time DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old login activity (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_activity(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_login_activity
    WHERE login_time < (NOW() - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_recent_login_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_failed_logins TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_successful_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_activity TO service_role;

-- ============================================================================
-- 7. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.user_login_activity.success IS 'Whether the login was successful';
COMMENT ON COLUMN public.user_login_activity.failure_reason IS 'Reason for failure if success=false';
COMMENT ON COLUMN public.user_login_activity.used_2fa IS 'Whether 2FA was used for this login';
COMMENT ON FUNCTION public.get_recent_login_activity IS 'Get recent login activity for a user';
COMMENT ON FUNCTION public.count_failed_logins IS 'Count failed login attempts in specified time window';
COMMENT ON FUNCTION public.get_last_successful_login IS 'Get timestamp of last successful login';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Login Activity Tracking Setup Complete!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update login-form.js to log login attempts';
    RAISE NOTICE '2. Create login-activity component to display activity';
    RAISE NOTICE '3. Test the logging functionality';
    RAISE NOTICE '';
    RAISE NOTICE 'Table: user_login_activity created';
    RAISE NOTICE 'Helper functions: 4 functions created';
    RAISE NOTICE 'RLS policies: Applied';
    RAISE NOTICE '============================================================================';
END $$;


-- ============================================================================
-- AUTO-CLEANUP: Delete expired auth.sessions automatically via pg_cron
-- ============================================================================
-- This prevents the issue where expired sessions accumulate and cause
-- multiple TOKEN_REFRESHED events on page load

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists (ignore error if it doesn't exist)
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup-expired-auth-sessions');
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore error if job doesn't exist
END $$;

-- Schedule cleanup job every 10 minutes
-- Note: We use a function with SECURITY DEFINER to access auth schema
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Delete expired sessions from auth.sessions
    DELETE FROM auth.sessions
    WHERE not_after < NOW();
    
    RAISE NOTICE 'Cleaned up expired auth sessions';
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO service_role;

-- Schedule the cleanup job
SELECT cron.schedule(
    'cleanup-expired-auth-sessions',
    '*/10 * * * *',  -- Every 10 minutes
    $$
    SELECT public.cleanup_expired_auth_sessions();
    $$
);

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-auth-sessions';

-- Run cleanup immediately
SELECT public.cleanup_expired_auth_sessions();


-- ============================================================================
-- AUTO-CLEANUP: Delete expired sessions automatically via pg_cron
-- ============================================================================
-- Run cleanup every 5 minutes to keep user_sessions table clean

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists (ignore error if it doesn't exist)
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup-expired-sessions');
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore error if job doesn't exist
END $$;

-- Schedule cleanup job every 5 minutes
SELECT cron.schedule(
    'cleanup-expired-sessions',
    '*/5 * * * *',  -- Every 5 minutes
    $$
    DELETE FROM public.user_sessions
    WHERE expires_at <= NOW();
    $$
);

-- Verify cron job was created
DO $$
BEGIN
    RAISE NOTICE '✅ Automatic session cleanup cron job configured to run every 5 minutes';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-sessions';

-- Manual cleanup now
DELETE FROM public.user_sessions WHERE expires_at <= NOW();


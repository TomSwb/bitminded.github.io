-- ============================================================================
-- FIX: ACTIVE SESSION COUNT - Simple Approach
-- ============================================================================
-- Since JWT decoding in PostgreSQL is complex, we'll use a simpler approach:
-- Count non-expired sessions in user_sessions
-- The cron job will keep this clean, so the count will be accurate

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Count non-expired sessions in user_sessions table
    SELECT COUNT(*)::INTEGER INTO session_count
    FROM public.user_sessions
    WHERE user_id = user_uuid
    AND expires_at > NOW();
    
    RETURN COALESCE(session_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error counting active sessions for user %: %', user_uuid, SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Count non-expired sessions from user_sessions (cleaned by cron job every 5 min)';

GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- Manual cleanup of stale sessions now
DELETE FROM public.user_sessions 
WHERE expires_at <= NOW() 
OR user_id NOT IN (SELECT id FROM auth.users);

-- Verification
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count,
    (SELECT COUNT(*) FROM public.user_sessions WHERE user_id = tu.id AND expires_at > NOW()) as non_expired_sessions
FROM 
    target_user tu;


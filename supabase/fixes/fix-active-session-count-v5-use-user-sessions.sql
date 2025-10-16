-- ============================================================================
-- FIX: ACTIVE SESSION COUNT - USE user_sessions TABLE
-- ============================================================================
-- Properly separate concerns:
-- - user_login_activity = login history (every login attempt)
-- - user_sessions = active sessions (current sessions only)

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Simply count non-expired sessions in user_sessions table
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

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active (non-expired) sessions from user_sessions table';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test with a known user
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count,
    (SELECT COUNT(*) FROM public.user_sessions WHERE user_id = tu.id) as total_sessions_in_table,
    (SELECT COUNT(*) FROM public.user_sessions WHERE user_id = tu.id AND expires_at > NOW()) as non_expired_sessions
FROM 
    target_user tu;


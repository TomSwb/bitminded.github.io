-- ============================================================================
-- FIX: ACTIVE SESSION COUNT FUNCTION
-- ============================================================================
-- The get_user_active_session_count function had incorrect column references.
-- Supabase auth.sessions table uses 'not_after' for expiration, not 'expires_at'
-- and doesn't have a 'factored_at' column.

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Count sessions from auth.sessions (Supabase internal table)
    -- Sessions are considered active if they haven't expired
    BEGIN
        SELECT COUNT(*)::INTEGER INTO session_count
        FROM auth.sessions
        WHERE user_id = user_uuid
        AND (not_after IS NULL OR not_after > NOW()); -- Not expired
        
        RETURN COALESCE(session_count, 0);
    EXCEPTION
        WHEN undefined_table THEN
            -- If auth.sessions doesn't exist, return 0
            RETURN 0;
        WHEN OTHERS THEN
            -- For any other error, log and return 0
            RAISE WARNING 'Error counting active sessions for user %: %', user_uuid, SQLERRM;
            RETURN 0;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active (non-expired) sessions for a user from auth.sessions table';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function with a known user
-- Replace email with actual user email to test
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count,
    (SELECT COUNT(*) FROM auth.sessions WHERE user_id = tu.id) as total_sessions_for_user
FROM 
    target_user tu;

-- Show all active sessions with details
SELECT 
    s.user_id,
    u.email,
    s.created_at,
    s.not_after,
    s.refreshed_at,
    CASE 
        WHEN s.not_after IS NULL THEN 'No expiration'
        WHEN s.not_after > NOW() THEN 'Active'
        ELSE 'Expired'
    END as session_status
FROM 
    auth.sessions s
JOIN 
    auth.users u ON s.user_id = u.id
ORDER BY 
    s.created_at DESC
LIMIT 20;


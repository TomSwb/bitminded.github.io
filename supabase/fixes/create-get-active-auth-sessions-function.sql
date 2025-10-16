-- ============================================================================
-- CREATE FUNCTION TO GET ACTIVE AUTH SESSIONS
-- ============================================================================
-- This database function can access auth.sessions and return active sessions
-- for a given user. It runs with SECURITY DEFINER so it has proper permissions.

CREATE OR REPLACE FUNCTION public.get_active_auth_sessions(user_uuid UUID)
RETURNS TABLE (
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    refreshed_at TIMESTAMP WITHOUT TIME ZONE,
    not_after TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip INET
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.created_at,
        s.refreshed_at,
        s.not_after,
        s.user_agent,
        s.ip
    FROM auth.sessions s
    WHERE s.user_id = user_uuid
    AND (s.not_after IS NULL OR s.not_after > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_active_auth_sessions IS 'Get active sessions from auth.sessions for a specific user';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_auth_sessions TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    s.*
FROM 
    target_user tu,
    public.get_active_auth_sessions(tu.id) s;


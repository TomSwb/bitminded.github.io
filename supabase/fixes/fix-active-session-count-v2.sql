-- ============================================================================
-- FIX: ACTIVE SESSION COUNT TO MATCH USER'S ACCOUNT PAGE VIEW
-- ============================================================================
-- The admin panel should show the same active session count as what users see
-- in their account page. This means counting unique session_ids from 
-- user_login_activity where the session is still considered active (within 1 hour).

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Count unique active sessions from user_login_activity
    -- A session is considered active if it was accessed within the last hour
    -- This matches the logic in the active-sessions.js component
    SELECT COUNT(DISTINCT session_id)::INTEGER INTO session_count
    FROM public.user_login_activity
    WHERE user_id = user_uuid
    AND success = TRUE
    AND session_id IS NOT NULL
    AND revoked_at IS NULL  -- Not revoked
    AND login_time > NOW() - INTERVAL '1 hour';  -- Active within last hour
    
    RETURN COALESCE(session_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        -- For any error, log and return 0
        RAISE WARNING 'Error counting active sessions for user %: %', user_uuid, SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active sessions for a user from user_login_activity (matches user account page view)';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test with a known user (replace email)
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count_function,
    (
        SELECT COUNT(DISTINCT session_id)
        FROM public.user_login_activity
        WHERE user_id = tu.id
        AND success = TRUE
        AND session_id IS NOT NULL
        AND revoked_at IS NULL
        AND login_time > NOW() - INTERVAL '1 hour'
    ) as active_session_count_manual
FROM 
    target_user tu;

-- Show all sessions for the user
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    session_id,
    login_time,
    ip_address,
    user_agent,
    revoked_at,
    CASE 
        WHEN revoked_at IS NOT NULL THEN 'Revoked'
        WHEN login_time > NOW() - INTERVAL '1 hour' THEN 'Active'
        ELSE 'Expired'
    END as status
FROM 
    public.user_login_activity
WHERE 
    user_id = (SELECT id FROM target_user)
    AND success = TRUE
    AND session_id IS NOT NULL
ORDER BY 
    login_time DESC;


-- ============================================================================
-- FIX: ACTIVE SESSION COUNT - FINAL VERSION
-- ============================================================================
-- Count all non-revoked sessions (no time limit) to match the session
-- management component display. Supabase sessions can last for days/weeks
-- with automatic refresh, so we shouldn't filter by time.

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Count unique active (non-revoked) sessions from user_login_activity
    -- No time filter - sessions remain active until explicitly revoked
    SELECT COUNT(DISTINCT session_id)::INTEGER INTO session_count
    FROM public.user_login_activity
    WHERE user_id = user_uuid
    AND success = TRUE
    AND session_id IS NOT NULL
    AND revoked_at IS NULL;
    
    RETURN COALESCE(session_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        -- For any error, log and return 0
        RAISE WARNING 'Error counting active sessions for user %: %', user_uuid, SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active (non-revoked) sessions for a user from user_login_activity';

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
    ) as active_session_count_manual
FROM 
    target_user tu;

-- Show all non-revoked sessions for the user
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    session_id,
    login_time,
    ip_address,
    user_agent,
    revoked_at,
    'Active' as status
FROM 
    public.user_login_activity
WHERE 
    user_id = (SELECT id FROM target_user)
    AND success = TRUE
    AND session_id IS NOT NULL
    AND revoked_at IS NULL
ORDER BY 
    login_time DESC;


-- ============================================================================
-- DIAGNOSTIC: CHECK LOGIN ACTIVITY AND AUTH SESSIONS
-- ============================================================================
-- This helps understand what sessions exist and why multiple are showing

-- Replace with your actual email
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
-- Show all login activity records for the user
SELECT 
    la.session_id,
    la.login_time,
    la.ip_address,
    la.user_agent,
    la.revoked_at,
    CASE 
        WHEN la.revoked_at IS NOT NULL THEN 'Revoked'
        ELSE 'Not Revoked'
    END as status,
    -- Check if this session exists in auth.sessions
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.sessions 
            WHERE user_id = la.user_id 
            AND (not_after IS NULL OR not_after > NOW())
        ) THEN 'User has active auth session(s)'
        ELSE 'No active auth sessions'
    END as auth_session_status
FROM 
    public.user_login_activity la
WHERE 
    la.user_id = (SELECT id FROM target_user)
    AND la.success = TRUE
    AND la.session_id IS NOT NULL
ORDER BY 
    la.login_time DESC;

-- Count distinct session_ids
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    COUNT(DISTINCT session_id) as unique_non_revoked_sessions,
    COUNT(*) as total_login_records
FROM 
    public.user_login_activity
WHERE 
    user_id = (SELECT id FROM target_user)
    AND success = TRUE
    AND session_id IS NOT NULL
    AND revoked_at IS NULL;

-- Show current auth.sessions for the user
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    s.id as session_id,
    s.created_at,
    s.refreshed_at,
    s.not_after,
    s.user_agent,
    s.ip,
    CASE 
        WHEN s.not_after IS NULL THEN 'No expiration'
        WHEN s.not_after > NOW() THEN 'Active'
        ELSE 'Expired'
    END as status
FROM 
    auth.sessions s
WHERE 
    s.user_id = (SELECT id FROM target_user)
ORDER BY 
    s.created_at DESC;


-- ============================================================================
-- CLEANUP: Delete all sessions from user_sessions table
-- ============================================================================
-- Use this to start fresh when testing session management

-- Delete ALL sessions from user_sessions
DELETE FROM public.user_sessions;

-- Verify table is empty
SELECT COUNT(*) as remaining_sessions FROM public.user_sessions;

-- Also check auth.sessions to see what Supabase has
SELECT 
    COUNT(*) as auth_sessions_count,
    COUNT(*) FILTER (WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')) as my_auth_sessions
FROM auth.sessions;

-- Show auth.sessions for your user
SELECT 
    id,
    created_at,
    refreshed_at,
    not_after,
    CASE 
        WHEN not_after IS NULL THEN 'No expiration'
        WHEN not_after > NOW() THEN 'Active'
        ELSE 'Expired'
    END as status
FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')
ORDER BY created_at DESC;


-- Query to find all user profiles and their IDs
-- Run this in Supabase SQL Editor to see all users

SELECT 
    up.id,
    up.username,
    au.email,
    up.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- Alternative: Show only users created recently (last 7 days)
-- SELECT 
--     up.id,
--     up.username,
--     au.email,
--     up.created_at
-- FROM user_profiles up
-- JOIN auth.users au ON up.id = au.id
-- WHERE up.created_at > NOW() - INTERVAL '7 days'
-- ORDER BY up.created_at DESC;

-- Alternative: Show only unconfirmed users (for testing cleanup)
-- SELECT 
--     up.id,
--     up.username,
--     au.email,
--     up.created_at
-- FROM user_profiles up
-- JOIN auth.users au ON up.id = au.id
-- WHERE au.email_confirmed_at IS NULL
-- ORDER BY up.created_at DESC;
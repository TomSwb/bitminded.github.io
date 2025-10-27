-- Check what's in auth.sessions table
-- This will show why you're getting expired tokens

-- 1. See all your sessions
SELECT 
    id,
    user_id,
    created_at,
    updated_at,
    factor_id,
    aal,
    not_after as expires_at,
    (not_after > NOW()) as is_active,
    EXTRACT(EPOCH FROM (not_after - NOW())) as expires_in_seconds
FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Delete ALL expired sessions for your user
DELETE FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')
AND not_after < NOW();

-- 3. Show what's left
SELECT 
    id,
    user_id,
    created_at,
    not_after as expires_at,
    (not_after > NOW()) as is_active
FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')
ORDER BY created_at DESC;


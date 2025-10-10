-- ============================================================================
-- 2FA Debugging Queries
-- Run these in Supabase SQL Editor to check your 2FA setup
-- ============================================================================

-- 1. CHECK IF USER_2FA RECORD EXISTS FOR YOUR USER
-- Replace 'your-email@example.com' with your actual email
SELECT 
    u.email,
    twofa.id,
    twofa.secret_key,
    twofa.is_enabled,
    twofa.created_at,
    twofa.updated_at,
    twofa.last_verified_at,
    LENGTH(twofa.secret_key) as secret_length,
    array_length(twofa.backup_codes, 1) as backup_codes_count
FROM auth.users u
LEFT JOIN public.user_2fa twofa ON twofa.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- <-- CHANGE THIS

-- Expected result:
-- - Should show your email
-- - secret_key should be ~32 characters (base32 encoded)
-- - is_enabled should be true (if setup completed)
-- - backup_codes_count should be 10

-- ============================================================================
-- 2. CHECK ALL 2FA RECORDS (if you don't know your email)
-- ============================================================================
SELECT 
    u.email,
    twofa.is_enabled,
    twofa.created_at,
    LENGTH(twofa.secret_key) as secret_length
FROM auth.users u
LEFT JOIN public.user_2fa twofa ON twofa.user_id = u.id
ORDER BY twofa.created_at DESC NULLS LAST;

-- ============================================================================
-- 3. CHECK VERIFICATION ATTEMPTS
-- ============================================================================
SELECT 
    u.email,
    att.attempt_time,
    att.success,
    att.failure_reason,
    att.attempt_type
FROM public.user_2fa_attempts att
JOIN auth.users u ON u.id = att.user_id
ORDER BY att.attempt_time DESC
LIMIT 10;

-- This shows recent verification attempts
-- If you see attempts here, the logging is working

-- ============================================================================
-- 4. GET YOUR USER ID (to use in other queries)
-- ============================================================================
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'your-email@example.com';  -- <-- CHANGE THIS

-- ============================================================================
-- 5. CHECK SPECIFIC USER'S 2FA SETUP (using user ID)
-- ============================================================================
SELECT 
    *
FROM public.user_2fa
WHERE user_id = 'your-user-id-here';  -- <-- PASTE USER ID FROM QUERY 4

-- ============================================================================
-- 6. CHECK IF SECRET KEY IS BASE32 ENCODED
-- ============================================================================
-- Base32 should only contain: A-Z and 2-7
SELECT 
    u.email,
    twofa.secret_key,
    twofa.secret_key ~ '^[A-Z2-7]+$' as is_valid_base32
FROM auth.users u
JOIN public.user_2fa twofa ON twofa.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- <-- CHANGE THIS

-- If is_valid_base32 is false, the secret is not properly encoded

-- ============================================================================
-- 7. DELETE 2FA SETUP (to start fresh if needed)
-- ============================================================================
-- CAREFUL: This will delete your 2FA setup!
-- DELETE FROM public.user_2fa 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- ============================================================================
-- 8. CHECK RLS POLICIES (make sure you can access your own data)
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('user_2fa', 'user_2fa_attempts')
ORDER BY tablename, policyname;

-- Should show policies allowing users to access their own data


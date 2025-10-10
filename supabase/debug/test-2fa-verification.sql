-- ============================================================================
-- Test 2FA Code Verification
-- ============================================================================

-- 1. CHECK YOUR SECRET KEY
SELECT 
    email,
    secret_key,
    LENGTH(secret_key) as length,
    secret_key ~ '^[A-Z2-7]+$' as is_valid_base32
FROM auth.users u
JOIN public.user_2fa twofa ON twofa.user_id = u.id
WHERE email = 'thomasschwab@bitminded.ch';

-- Expected:
-- - length should be 32
-- - is_valid_base32 should be TRUE

-- ============================================================================
-- 2. CHECK IF YOU HAVE MULTIPLE 2FA RECORDS (should only be 1)
-- ============================================================================
SELECT COUNT(*) as record_count
FROM public.user_2fa
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch');

-- Should return: 1
-- If more than 1, you have duplicates (problem!)

-- ============================================================================
-- 3. VIEW YOUR EXACT 2FA SETUP
-- ============================================================================
SELECT 
    secret_key,
    is_enabled,
    created_at,
    updated_at
FROM public.user_2fa
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch');

-- ============================================================================
-- 4. DELETE AND START FRESH (if needed)
-- ============================================================================
-- Run this if you want to completely reset and try setup again

DELETE FROM public.user_2fa 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch');

-- After running this, the 2FA component should show INACTIVE
-- Then you can run through setup again


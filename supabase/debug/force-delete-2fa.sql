-- ============================================================================
-- Force Delete 2FA Record
-- ============================================================================

-- 1. CHECK WHAT EXISTS RIGHT NOW
SELECT 
    id,
    user_id,
    is_enabled,
    created_at,
    updated_at
FROM public.user_2fa
WHERE user_id = '58f93f76-d72b-438a-90ab-6156c0841c44';

-- ============================================================================
-- 2. TRY DELETE WITH EXPLICIT USER_ID
-- ============================================================================
DELETE FROM public.user_2fa 
WHERE user_id = '58f93f76-d72b-438a-90ab-6156c0841c44';

-- ============================================================================
-- 3. VERIFY IT WAS DELETED
-- ============================================================================
SELECT COUNT(*) as remaining_records
FROM public.user_2fa
WHERE user_id = '58f93f76-d72b-438a-90ab-6156c0841c44';

-- Should return: 0

-- ============================================================================
-- 4. IF STILL NOT DELETED, CHECK RLS POLICIES
-- ============================================================================
-- Run this to see if RLS is blocking the delete:
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_2fa';

-- ============================================================================
-- 5. NUCLEAR OPTION: Bypass RLS (if you have admin access)
-- ============================================================================
-- Only if the above doesn't work and you need to force delete

-- ALTER TABLE public.user_2fa DISABLE ROW LEVEL SECURITY;
-- DELETE FROM public.user_2fa WHERE user_id = '58f93f76-d72b-438a-90ab-6156c0841c44';
-- ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;


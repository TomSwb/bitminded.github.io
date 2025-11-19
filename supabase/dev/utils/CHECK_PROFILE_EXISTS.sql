-- Check if current user has a profile record
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

-- 1. Check current authenticated user
SELECT 
    'Current User Info' as check_type,
    auth.uid() as user_id,
    auth.email() as user_email;

-- 2. Check if user exists in auth.users
SELECT 
    'User in auth.users' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users WHERE id = auth.uid()
        ) THEN '✅ User exists in auth.users'
        ELSE '❌ User NOT found in auth.users'
    END as result,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
    (SELECT created_at FROM auth.users WHERE id = auth.uid()) as created_at;

-- 3. Check if profile exists in user_profiles
SELECT 
    'Profile in user_profiles' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
        ) THEN '✅ Profile EXISTS'
        ELSE '❌ Profile MISSING - This is the problem!'
    END as result;

-- 4. Get full profile data if it exists
SELECT 
    'Profile Data' as check_type,
    id,
    username,
    email,
    status,
    created_at,
    updated_at
FROM public.user_profiles
WHERE id = auth.uid();

-- 5. If profile is missing, show what would be created
DO $$
DECLARE
    current_user_id UUID;
    user_email TEXT;
    username_val TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No authenticated user found';
        RETURN;
    END IF;
    
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    -- Get or generate username
    SELECT COALESCE(
        (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = current_user_id),
        'user_' || substr(current_user_id::text, 1, 8)
    ) INTO username_val;
    
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = current_user_id) THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ PROFILE MISSING FOR USER:';
        RAISE NOTICE '   User ID: %', current_user_id;
        RAISE NOTICE '   Email: %', user_email;
        RAISE NOTICE '';
        RAISE NOTICE '📝 Profile would be created with:';
        RAISE NOTICE '   - id: %', current_user_id;
        RAISE NOTICE '   - username: %', username_val;
        RAISE NOTICE '   - email: %', user_email;
        RAISE NOTICE '   - status: active';
        RAISE NOTICE '';
        RAISE NOTICE '💡 Run FIX_USER_PROFILES_406_ERROR.sql to create it automatically';
    ELSE
        RAISE NOTICE '✅ Profile exists for user: %', current_user_id;
    END IF;
END $$;















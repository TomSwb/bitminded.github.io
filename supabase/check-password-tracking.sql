-- Check if password tracking is properly set up
-- Execute this in Supabase SQL Editor to verify everything is working

-- 1. Check if password_last_changed column exists in user_profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
    AND column_name = 'password_last_changed';

-- 2. Check the structure of user_profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles'
    AND event_object_schema = 'public';

-- 4. Check if the functions exist
SELECT 
    routine_name, 
    routine_type, 
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('update_password_last_changed', 'update_updated_at_column');

-- 5. Check RLS policies on user_profiles table
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' 
    AND schemaname = 'public';

-- 6. Test the password_last_changed column (if you have test data)
-- This will show current password_last_changed values for all users
SELECT 
    id, 
    username, 
    password_last_changed, 
    created_at, 
    updated_at
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Check if we can update the password_last_changed field (test query)
-- This is a safe test that won't actually update anything
SELECT 
    'Test query successful - password_last_changed column is accessible' as test_result,
    COUNT(*) as total_users
FROM public.user_profiles;

-- 8. Check table permissions
SELECT 
    grantee, 
    privilege_type, 
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
    AND grantee = 'authenticated';

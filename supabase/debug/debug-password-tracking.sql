-- Debug password tracking issues
-- Execute this in Supabase SQL Editor

-- 1. Check if user profiles exist for all auth users
SELECT 
    au.id as auth_user_id,
    au.email,
    up.id as profile_id,
    up.username,
    up.password_last_changed,
    up.created_at as profile_created,
    up.updated_at as profile_updated
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- 2. Check the exact structure of user_profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test inserting a password_last_changed value (safe test)
-- This will show what happens when we try to update
SELECT 
    'Testing update syntax' as test,
    NOW() as current_timestamp,
    NOW()::text as timestamp_as_text;

-- 4. Check if there are any constraints or issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.user_profiles'::regclass;

-- 5. Check RLS policies in detail
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

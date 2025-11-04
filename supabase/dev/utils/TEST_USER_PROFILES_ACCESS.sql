-- Test script to verify user_profiles table access
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

-- 1. Verify table exists
SELECT 
    'Table exists' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN '✅ YES' ELSE '❌ NO' END as result;

-- 2. Check RLS status
SELECT 
    'RLS enabled' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
        AND rowsecurity = true
    ) THEN '✅ YES' ELSE '❌ NO' END as result;

-- 3. List all RLS policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- 4. Check current user
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email;

-- 5. Try to query as current user (simulate what the API does)
SELECT 
    'Can query own profile' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid()
    ) THEN '✅ YES - Found profile' 
    WHEN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid()
    ) THEN '⚠️ User exists but no profile found'
    ELSE '❌ NO - User not found' 
    END as result;

-- 6. Check if user profile exists for current user
SELECT 
    id,
    username,
    email,
    status,
    created_at
FROM public.user_profiles
WHERE id = auth.uid()
LIMIT 1;

-- 7. Verify PostgREST can access the table
-- Check if table is in public schema and accessible
SELECT 
    'PostgREST access' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
        ) THEN '✅ Table exists in public schema'
        ELSE '❌ Table not found'
    END as result;

-- 8. Check all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;


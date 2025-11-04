-- Diagnostic script to check user_profiles table in dev database
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

-- 1. Check if table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- 2. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- 4. Check RLS policies
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
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- 5. Check if table is exposed in API (PostgREST)
SELECT 
    schemaname,
    tablename
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- 6. Try to query as current user (this should work if RLS is correct)
SELECT COUNT(*) as total_profiles FROM public.user_profiles;

-- 7. Check current auth user
SELECT auth.uid() as current_user_id, auth.email() as current_email;



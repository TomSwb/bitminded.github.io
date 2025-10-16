-- ============================================================================
-- DEBUG: Check ALL Records for Your Wife's Account
-- ============================================================================
-- This checks if she's missing user_profiles, user_roles, or user_preferences
-- ============================================================================

-- Check for user ID: 72ba2a01-2e52-4a37-b58d-079c97885205

-- 1. Check user_profiles
SELECT 
    'user_profiles' as table_name,
    CASE WHEN id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    username,
    avatar_url,
    created_at
FROM public.user_profiles
WHERE id = '72ba2a01-2e52-4a37-b58d-079c97885205';

-- 2. Check user_roles
SELECT 
    'user_roles' as table_name,
    CASE WHEN user_id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    role,
    created_at
FROM public.user_roles
WHERE user_id = '72ba2a01-2e52-4a37-b58d-079c97885205';

-- 3. Check user_preferences
SELECT 
    'user_preferences' as table_name,
    CASE WHEN user_id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    notification_preferences IS NOT NULL as has_notification_prefs,
    created_at
FROM public.user_preferences
WHERE user_id = '72ba2a01-2e52-4a37-b58d-079c97885205';

-- 4. Show auth.users record (should exist)
SELECT 
    'auth.users' as table_name,
    '✅ EXISTS' as status,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE id = '72ba2a01-2e52-4a37-b58d-079c97885205';


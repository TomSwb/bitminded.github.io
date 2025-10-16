-- ============================================================================
-- DEBUG: Find Users Missing user_preferences Records
-- ============================================================================
-- This checks if users exist in auth.users but NOT in user_preferences
-- ============================================================================

-- 1. Find users who exist in auth.users but NOT in user_preferences
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    u.email_confirmed_at,
    'MISSING user_preferences record' as issue
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id
WHERE up.user_id IS NULL
ORDER BY u.created_at DESC;

-- 2. Count total users vs users with preferences
SELECT 
    COUNT(DISTINCT u.id) as total_auth_users,
    COUNT(DISTINCT up.user_id) as users_with_preferences,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT up.user_id) as missing_preferences_count
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id;

-- 3. Show ALL users and their preferences status
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN up.user_id IS NULL THEN '❌ NO RECORD'
        WHEN up.notification_preferences IS NULL THEN '⚠️ NULL PREFS'
        ELSE '✅ HAS PREFS'
    END as status,
    up.notification_preferences
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id
ORDER BY u.created_at DESC;

-- 4. Check if the trigger is enabled
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    trigger_schema,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';


-- ============================================================================
-- DEBUG: Check Notification Preferences Status
-- ============================================================================
-- Run this to see which users have NULL notification_preferences
-- ============================================================================

-- 1. Check if the column exists
SELECT 
    column_name,
    data_type,
    column_default IS NOT NULL as has_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND table_schema = 'public'
AND column_name = 'notification_preferences';

-- 2. Count users with NULL vs non-NULL preferences
SELECT 
    COUNT(*) FILTER (WHERE notification_preferences IS NULL) as null_count,
    COUNT(*) FILTER (WHERE notification_preferences IS NOT NULL) as non_null_count,
    COUNT(*) as total_users
FROM public.user_preferences;

-- 3. Show users with NULL preferences (these are the broken accounts)
SELECT 
    up.user_id,
    u.email,
    up.notification_preferences,
    up.created_at,
    EXTRACT(EPOCH FROM (NOW() - up.created_at))/3600 as hours_since_creation
FROM public.user_preferences up
JOIN auth.users u ON u.id = up.user_id
WHERE up.notification_preferences IS NULL
ORDER BY up.created_at DESC;

-- 4. Sample of working preferences (to compare)
SELECT 
    up.user_id,
    u.email,
    up.notification_preferences,
    up.created_at
FROM public.user_preferences up
JOIN auth.users u ON u.id = up.user_id
WHERE up.notification_preferences IS NOT NULL
ORDER BY up.created_at DESC
LIMIT 3;


-- ============================================================================
-- FIX: Create Missing user_preferences Records
-- ============================================================================
-- This creates user_preferences records for users who don't have them
-- ============================================================================

-- Step 1: Create missing user_preferences records for all users
INSERT INTO public.user_preferences (
    user_id,
    email_notifications,
    language,
    theme,
    notification_preferences,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    true as email_notifications,
    'en' as language,
    'dark' as theme,
    '{
      "email": {
        "password_changed": true,
        "two_fa": true,
        "new_login": true,
        "username_changed": true,
        "product_updates": false,
        "marketing": false
      },
      "inapp": {
        "password_changed": true,
        "two_fa": true,
        "new_login": true,
        "username_changed": true,
        "product_updates": false,
        "marketing": false
      }
    }'::jsonb as notification_preferences,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id
WHERE up.user_id IS NULL;

-- Step 2: Verify all users now have preferences
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT up.user_id) as users_with_preferences,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT up.user_id) as still_missing
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id;

-- Step 3: Show the newly created records
SELECT 
    up.user_id,
    u.email,
    up.notification_preferences,
    up.created_at
FROM public.user_preferences up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.created_at DESC;


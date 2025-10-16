-- ============================================================================
-- FIX: Complete Setup for Kamilah's Account
-- ============================================================================
-- This manually runs what the handle_new_user() trigger should have done
-- User ID: 72ba2a01-2e52-4a37-b58d-079c97885205
-- Email: kamilahschwab@gmail.com
-- ============================================================================

-- Step 1: Create user_profiles record (if missing)
INSERT INTO public.user_profiles (id, username, email, created_at, updated_at)
VALUES (
    '72ba2a01-2e52-4a37-b58d-079c97885205',
    'kamilahschwab',
    'kamilahschwab@gmail.com',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create user_roles record (if missing)
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
VALUES (
    '72ba2a01-2e52-4a37-b58d-079c97885205',
    'user',
    NOW(),
    NOW()
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Create user_preferences record (if missing)
INSERT INTO public.user_preferences (
    user_id,
    email_notifications,
    language,
    theme,
    notification_preferences,
    created_at,
    updated_at
)
VALUES (
    '72ba2a01-2e52-4a37-b58d-079c97885205',
    true,
    'en',
    'dark',
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
    }'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    notification_preferences = EXCLUDED.notification_preferences,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all records for Kamilah
SELECT 'user_profiles' as table_name, * FROM public.user_profiles 
WHERE id = '72ba2a01-2e52-4a37-b58d-079c97885205';

SELECT 'user_roles' as table_name, * FROM public.user_roles 
WHERE user_id = '72ba2a01-2e52-4a37-b58d-079c97885205';

SELECT 'user_preferences' as table_name, * FROM public.user_preferences 
WHERE user_id = '72ba2a01-2e52-4a37-b58d-079c97885205';


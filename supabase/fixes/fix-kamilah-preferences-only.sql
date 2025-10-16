-- ============================================================================
-- FIX: Create user_preferences for Kamilah
-- ============================================================================
-- Only creates the missing user_preferences record
-- User ID: 72ba2a01-2e52-4a37-b58d-079c97885205
-- Email: kamilahschwab@gmail.com
-- ============================================================================

-- Create the missing user_preferences record
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

-- Show the newly created record
SELECT 
    user_id,
    email_notifications,
    notification_preferences,
    created_at
FROM public.user_preferences 
WHERE user_id = '72ba2a01-2e52-4a37-b58d-079c97885205';

-- Confirm all 3 users now have preferences
SELECT 
    COUNT(*) as total_users_with_preferences
FROM public.user_preferences;


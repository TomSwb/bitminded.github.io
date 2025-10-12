-- ============================================================================
-- ADD IN-APP NOTIFICATION PREFERENCES
-- ============================================================================
-- This migration adds in-app preferences to existing users

-- Update existing users to add in-app preferences
UPDATE public.user_preferences
SET notification_preferences = jsonb_set(
    notification_preferences,
    '{inapp}',
    jsonb_build_object(
        'password_changed', true,
        'two_fa', true,
        'new_login', true,
        'username_changed', true,
        'product_updates', false,
        'marketing', false
    )
)
WHERE notification_preferences IS NOT NULL 
AND notification_preferences->'inapp' IS NULL;

-- Verification: Check the updated structure
SELECT 
    user_id,
    notification_preferences->'inapp' as inapp_preferences
FROM public.user_preferences
WHERE notification_preferences IS NOT NULL
LIMIT 5;



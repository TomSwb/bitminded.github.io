-- ============================================================================
-- ADD IN-APP PREFERENCES TO EXISTING USERS
-- ============================================================================
-- This just adds the 'inapp' section to your existing notification_preferences

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
    notification_preferences
FROM public.user_preferences
WHERE user_id = auth.uid();

-- Expected result should have both 'email' and 'inapp':
-- {
--   "email": { ... },
--   "inapp": {
--     "password_changed": true,
--     "two_fa": true,
--     "new_login": true,
--     "username_changed": true,
--     "product_updates": false,
--     "marketing": false
--   }
-- }


-- ============================================================================
-- REMOVE EMAIL_CHANGED PREFERENCE
-- ============================================================================
-- This script removes the email_changed preference from all existing users
-- since Supabase already handles email change verification emails

-- Remove email_changed from all user preferences
UPDATE public.user_preferences
SET notification_preferences = jsonb_set(
    notification_preferences,
    '{email}',
    (notification_preferences->'email') - 'email_changed'
)
WHERE notification_preferences->'email' ? 'email_changed';

-- Verification: Check the updated structure
SELECT 
    user_id,
    notification_preferences->'email' as email_preferences
FROM public.user_preferences
WHERE notification_preferences IS NOT NULL
LIMIT 5;

-- Expected result: email_changed should not appear in the list
-- You should see:
-- {
--   "two_fa": true,
--   "marketing": false,
--   "new_login": true,
--   "product_updates": false,
--   "password_changed": true,
--   "username_changed": true
-- }


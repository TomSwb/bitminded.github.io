-- ============================================================================
-- FIX: Notification Preferences for New Users
-- ============================================================================
-- Issue: New users aren't getting notification_preferences populated
-- Solution: Ensure the column has proper DEFAULT and backfill any NULL values
-- ============================================================================

-- Step 1: Ensure the column exists with proper DEFAULT
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- Step 2: Set the DEFAULT for new inserts
ALTER TABLE public.user_preferences 
ALTER COLUMN notification_preferences SET DEFAULT '{
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
}'::jsonb;

-- Step 3: Backfill any existing users that have NULL notification_preferences
UPDATE public.user_preferences
SET notification_preferences = '{
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
}'::jsonb
WHERE notification_preferences IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show users with NULL notification_preferences (should be 0 after fix)
SELECT 
    user_id,
    notification_preferences IS NULL as is_null,
    created_at
FROM public.user_preferences
WHERE notification_preferences IS NULL;

-- Show all users with their notification preferences
SELECT 
    user_id,
    notification_preferences,
    created_at
FROM public.user_preferences
ORDER BY created_at DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this:
-- 1. All existing users will have notification_preferences set
-- 2. All new users will automatically get the DEFAULT value
-- 3. Your wife's account should now work properly
-- 
-- The handle_new_user() function doesn't need to be updated because
-- the DEFAULT on the column will automatically apply when inserting
-- only the user_id.


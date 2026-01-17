-- ============================================================================
-- DISABLE NEW LOGIN NOTIFICATIONS BY DEFAULT
-- ============================================================================
-- Purpose: Change default for new_login notifications to false (disabled)
-- Date: 2026-01-XX
-- ============================================================================

-- Update the DEFAULT value for notification_preferences column
-- This affects all NEW users created after this migration
ALTER TABLE public.user_preferences 
ALTER COLUMN notification_preferences SET DEFAULT '{
  "email": {
    "password_changed": true,
    "two_fa": true,
    "new_login": false,
    "username_changed": true,
    "product_updates": false,
    "marketing": false
  },
  "inapp": {
    "password_changed": true,
    "two_fa": true,
    "new_login": false,
    "username_changed": true,
    "product_updates": false,
    "marketing": false
  }
}'::jsonb;

-- Note: Existing users keep their current preferences
-- Users can still enable new_login notifications in their account settings if they want

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the new default
SELECT column_default
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name = 'notification_preferences';

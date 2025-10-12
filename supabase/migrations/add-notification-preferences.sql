-- ============================================================================
-- NOTIFICATIONS PREFERENCES MIGRATION
-- ============================================================================
-- This migration adds granular notification preferences to the user_preferences table
-- Part of Phase 1: Email Notifications implementation

-- Add notification_preferences JSONB column if it doesn't exist
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "password_changed": true,
    "two_fa": true,
    "new_login": true,
    "username_changed": true,
    "product_updates": false,
    "marketing": false
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.notification_preferences 
IS 'Granular notification preferences per channel and type. Contains email, push, and in-app settings.';

-- Update existing records to have the default preferences if they are NULL
UPDATE public.user_preferences
SET notification_preferences = '{
  "email": {
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

-- Check if the column was added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name = 'notification_preferences';

-- Show sample data
SELECT user_id, email_notifications, notification_preferences
FROM public.user_preferences
LIMIT 5;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This migration is designed to be idempotent - it can be run multiple times safely.
-- 
-- Structure of notification_preferences (Granular):
-- {
--   "email": {
--     "password_changed": boolean,   // Password change notifications
--     "two_fa": boolean,             // 2FA enabled/disabled
--     "new_login": boolean,          // New login alerts
--     "username_changed": boolean,   // Username updates
--     "product_updates": boolean,    // New apps, features (Phase 2)
--     "marketing": boolean           // Newsletters, offers (Phase 2)
--   },
--   "push": {                        // Phase 3
--     "password_changed": boolean,
--     "two_fa": boolean,
--     "new_login": boolean,
--     "product_updates": boolean,
--     "announcements": boolean
--   }
-- }
-- 
-- The email_notifications column remains for backward compatibility
-- and can be used as a master on/off switch.


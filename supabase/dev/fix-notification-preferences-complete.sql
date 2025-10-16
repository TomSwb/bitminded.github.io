-- ============================================================================
-- DEV ENVIRONMENT: Complete Notification Preferences Fix
-- ============================================================================
-- This fixes the notification_preferences issue for dev database
-- Run this in your DEV Supabase SQL Editor
-- ============================================================================

-- PART 1: Ensure column exists and has proper DEFAULT
-- ============================================================================

-- Step 1: Ensure the column exists
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- Step 2: Set the DEFAULT for all future inserts
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

-- PART 2: Backfill any existing users with NULL notification_preferences
-- ============================================================================

-- Step 3: Update existing users who have NULL
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

-- PART 3: Create missing user_preferences records
-- ============================================================================

-- Step 4: Create user_preferences for any users who don't have them at all
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
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check 1: Verify the DEFAULT is set
SELECT 
    column_name,
    data_type,
    column_default IS NOT NULL as has_default
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND table_schema = 'public'
AND column_name = 'notification_preferences';

-- Check 2: Count users with NULL vs non-NULL
SELECT 
    COUNT(*) FILTER (WHERE notification_preferences IS NULL) as null_count,
    COUNT(*) FILTER (WHERE notification_preferences IS NOT NULL) as non_null_count,
    COUNT(*) as total_users
FROM public.user_preferences;

-- Check 3: Verify all auth users have preferences
SELECT 
    COUNT(DISTINCT u.id) as total_auth_users,
    COUNT(DISTINCT up.user_id) as users_with_preferences,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT up.user_id) as missing_count
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id;

-- Check 4: Show all users and their notification preferences status
SELECT 
    u.email,
    CASE 
        WHEN up.user_id IS NULL THEN '❌ NO RECORD'
        WHEN up.notification_preferences IS NULL THEN '⚠️ NULL PREFS'
        ELSE '✅ HAS PREFS'
    END as status,
    up.created_at
FROM auth.users u
LEFT JOIN public.user_preferences up ON up.user_id = u.id
ORDER BY u.created_at DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Notification preferences fix completed!';
    RAISE NOTICE '1. DEFAULT value is set for future users';
    RAISE NOTICE '2. Existing users have been backfilled';
    RAISE NOTICE '3. Missing records have been created';
    RAISE NOTICE '4. Check the verification queries above to confirm';
END $$;


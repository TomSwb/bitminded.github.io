-- ============================================================================
-- UPDATE TO GRANULAR NOTIFICATION PREFERENCES
-- ============================================================================
-- This migration updates existing user preferences to the new granular structure
-- Run this ONLY if you already have users with the old structure

-- Update existing records that have the old grouped structure
UPDATE public.user_preferences
SET notification_preferences = jsonb_set(
    notification_preferences,
    '{email}',
    jsonb_build_object(
        'password_changed', COALESCE((notification_preferences->'email'->>'security_alerts')::boolean, true),
        'two_fa', COALESCE((notification_preferences->'email'->>'security_alerts')::boolean, true),
        'new_login', COALESCE((notification_preferences->'email'->>'security_alerts')::boolean, true),
        'username_changed', COALESCE((notification_preferences->'email'->>'account_updates')::boolean, true),
        'product_updates', false,
        'marketing', false
    )
)
WHERE notification_preferences->'email' ? 'security_alerts'
   OR notification_preferences->'email' ? 'account_updates';

-- Verification: Check the updated structure
SELECT 
    user_id,
    notification_preferences->'email' as email_preferences
FROM public.user_preferences
WHERE notification_preferences IS NOT NULL
LIMIT 5;


-- ============================================================================
-- ADD DATA COLUMN TO NOTIFICATIONS
-- ============================================================================
-- This adds a JSONB column to store additional notification context

ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.user_notifications.data 
IS 'Additional context data for the notification (device, browser, old/new values, etc.)';

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
AND column_name = 'data';


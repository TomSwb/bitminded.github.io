-- ============================================================================
-- COMPLETE IN-APP NOTIFICATIONS SETUP
-- ============================================================================
-- Run this SQL to set up the complete in-app notification system
-- This is a consolidated script combining all necessary steps

-- ============================================================================
-- STEP 1: Create user_notifications table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('security', 'account', 'product', 'announcement')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    icon TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
    ON public.user_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_read 
    ON public.user_notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_user_notifications_created 
    ON public.user_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_type 
    ON public.user_notifications(type);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" 
ON public.user_notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" 
ON public.user_notifications FOR DELETE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true);

-- ============================================================================
-- STEP 2: Create helper functions
-- ============================================================================

-- Helper function: Get unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_notifications 
        WHERE user_id = user_uuid 
        AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Mark all as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.user_notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = user_uuid AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Cleanup old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_notifications
    WHERE (
        expires_at IS NOT NULL AND expires_at < NOW()
    ) OR (
        created_at < (NOW() - INTERVAL '1 day' * days_to_keep)
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;

-- Add comments
COMMENT ON TABLE public.user_notifications IS 'In-app notifications for user activity and updates';
COMMENT ON COLUMN public.user_notifications.type IS 'Notification category: security, account, product, announcement';
COMMENT ON COLUMN public.user_notifications.read IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN public.user_notifications.expires_at IS 'Optional expiration date for auto-cleanup';

-- ============================================================================
-- STEP 3: Add in-app preferences to existing users
-- ============================================================================

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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_notifications'
) as table_exists;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
    'get_unread_notification_count', 
    'mark_all_notifications_read', 
    'cleanup_old_notifications'
);

-- Check user has in-app preferences
SELECT 
    user_id,
    notification_preferences->'inapp' as inapp_preferences
FROM public.user_preferences
WHERE user_id = auth.uid();

-- Expected inapp_preferences result:
-- {
--   "two_fa": true,
--   "new_login": true,
--   "password_changed": true,
--   "username_changed": true,
--   "product_updates": false,
--   "marketing": false
-- }

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ In-app notification system setup complete!';
    RAISE NOTICE '📊 user_notifications table created';
    RAISE NOTICE '🔧 Helper functions created';
    RAISE NOTICE '⚙️ In-app preferences added to users';
    RAISE NOTICE '🚀 Ready to deploy Edge Function: create-notification';
END $$;


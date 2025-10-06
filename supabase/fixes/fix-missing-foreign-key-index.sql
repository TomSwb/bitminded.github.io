-- Fix Performance Suggestions: Missing Foreign Key Index
-- Execute this in Supabase SQL Editor

-- Add missing index for user_subscriptions foreign key
-- This will improve performance when querying subscriptions by user_id
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- Note: The "unused index" suggestions are expected at this stage
-- These indexes will be used once we start implementing the authentication system:
-- - idx_user_roles_user_id (for role lookups)
-- - idx_user_roles_role (for admin checks)
-- - idx_user_sessions_user_id (for session management)
-- - idx_user_sessions_expires_at (for session cleanup)
-- - idx_login_activity_user_id (for login history)
-- - idx_login_activity_login_time (for activity queries)
-- - idx_entitlements_user_id (for access checks)
-- - idx_entitlements_app_id (for app-specific access)

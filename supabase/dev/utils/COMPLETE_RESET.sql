-- Complete Database Reset for Dev Environment
-- Run this in Supabase SQL Editor to wipe everything clean

-- 1. Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_profile_updated ON public.user_profiles;
DROP TRIGGER IF EXISTS on_user_roles_updated ON public.user_roles;
DROP TRIGGER IF EXISTS on_user_2fa_updated ON public.user_2fa;
DROP TRIGGER IF EXISTS on_user_preferences_updated ON public.user_preferences;
DROP TRIGGER IF EXISTS on_user_subscriptions_updated ON public.user_subscriptions;

-- 2. Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_app_access(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_statistics(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_completely(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- 3. Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.admin_notes CASCADE;
DROP TABLE IF EXISTS public.admin_activity CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.login_activity CASCADE;
DROP TABLE IF EXISTS public.user_2fa CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.account_deletions CASCADE;
DROP TABLE IF EXISTS public.password_tracking CASCADE;

-- 4. Drop any remaining policies (just in case)
-- RLS policies are dropped with CASCADE above, but we can be explicit

-- 5. Drop any custom types if they exist
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.user_status CASCADE;

-- 6. Verify everything is clean
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Should return empty result set

SELECT 
    routine_schema, 
    routine_name, 
    routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Should return empty result set

-- Now you can run your production SQL migrations from the beginning!

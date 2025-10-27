-- Emergency cleanup script for session issues
-- Run this on dev environment only!

-- 1. Clean up all custom user sessions
DELETE FROM public.user_sessions;

-- 2. Revoke ALL Supabase auth sessions (nuclear option)
-- This will log everyone out and clear the auth session table
DELETE FROM auth.sessions;


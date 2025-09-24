-- Fix Performance Warnings: RLS Policy Optimization
-- Execute this in Supabase SQL Editor

-- Fix 1: Drop duplicate policies on user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage own roles" ON public.user_roles;

-- Create optimized single policy for user_roles
CREATE POLICY "Users can manage own roles" ON public.user_roles
    FOR ALL USING ((select auth.uid()) = user_id);

-- Fix 2: Optimize user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Fix 3: Optimize user_2fa policies
DROP POLICY IF EXISTS "Users can manage own 2FA" ON public.user_2fa;

CREATE POLICY "Users can manage own 2FA" ON public.user_2fa
    FOR ALL USING ((select auth.uid()) = user_id);

-- Fix 4: Optimize user_sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix 5: Optimize user_preferences policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING ((select auth.uid()) = user_id);

-- Fix 6: Optimize login_activity policies
DROP POLICY IF EXISTS "Users can view own login activity" ON public.login_activity;

CREATE POLICY "Users can view own login activity" ON public.login_activity
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix 7: Optimize entitlements policies
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;

CREATE POLICY "Users can view own entitlements" ON public.entitlements
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix 8: Optimize user_subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT USING ((select auth.uid()) = user_id);

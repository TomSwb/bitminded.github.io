-- Fix RLS policies to allow admins to manage user profiles
-- This allows admins to view and update any user's profile

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create new policies that allow both users and admins
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Add comment for documentation
COMMENT ON POLICY "Users can view own profile" ON public.user_profiles IS 'Allows users to view their own profile and admins to view any profile';
COMMENT ON POLICY "Users can update own profile" ON public.user_profiles IS 'Allows users to update their own profile and admins to update any profile';
COMMENT ON POLICY "Users can insert own profile" ON public.user_profiles IS 'Allows users to insert their own profile and admins to insert any profile';

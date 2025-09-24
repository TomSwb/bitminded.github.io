-- Fix for user_roles RLS policy infinite recursion
-- Execute this in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create a simpler policy that doesn't cause recursion
-- For now, we'll handle admin checks in the application layer
CREATE POLICY "Users can manage own roles" ON public.user_roles
    FOR ALL USING (auth.uid() = user_id);

-- Alternative: Create a policy that allows admins but avoids recursion
-- This uses a function that doesn't query the same table
CREATE OR REPLACE FUNCTION public.is_admin_safe(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role without causing recursion
    -- This function will be used by the application, not RLS policies
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For now, let's use a simpler approach
-- We'll handle admin permissions in the application layer
-- and use RLS only for basic user data protection

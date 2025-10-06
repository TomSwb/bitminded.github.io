-- Add password tracking to user_profiles table
-- Execute this in Supabase SQL Editor

-- Add password_last_changed column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN password_last_changed TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.password_last_changed IS 'Timestamp when user last changed their password';

-- Update the updated_at trigger to also update password_last_changed when password changes
-- Note: This will be handled in the application code when password is actually changed

-- Create a function to update password_last_changed
CREATE OR REPLACE FUNCTION public.update_password_last_changed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is a password change operation
    -- We'll call this function explicitly from the application
    NEW.password_last_changed = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to user_profiles table
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

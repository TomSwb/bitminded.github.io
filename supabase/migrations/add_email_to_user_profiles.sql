-- Add email column to user_profiles table
-- This makes it easier to query user data without joining auth.users

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Update existing profiles with email from auth.users
-- This is a one-time migration
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
AND up.email IS NULL;

-- Update the handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


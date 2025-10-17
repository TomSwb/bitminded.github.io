-- Add personal information fields to user_profiles table
-- date_of_birth, nationality, gender

-- Add columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_say'));

-- Add helpful comments
COMMENT ON COLUMN public.user_profiles.date_of_birth IS 'User date of birth for age calculation';
COMMENT ON COLUMN public.user_profiles.country IS 'User country of residence (2-letter ISO code or full name)';
COMMENT ON COLUMN public.user_profiles.gender IS 'User gender: male, female, or prefer_not_say';

-- Create index for potential analytics queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON public.user_profiles(gender);


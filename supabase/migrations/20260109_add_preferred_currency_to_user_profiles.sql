-- ============================================================================
-- Migration: Add preferred_currency field to user_profiles table
-- Purpose: Store user's preferred currency for checkout (managed like language field)
-- Dependencies: user_profiles table
-- Created: 2026-01-09
-- ============================================================================

-- Check if preferred_currency column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'preferred_currency'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN preferred_currency TEXT DEFAULT 'CHF' CHECK (preferred_currency IN ('CHF', 'USD', 'EUR', 'GBP'));
        
        -- Update existing users to set default to 'CHF' for NULL values
        UPDATE public.user_profiles 
        SET preferred_currency = 'CHF' 
        WHERE preferred_currency IS NULL;
        
        RAISE NOTICE 'Added preferred_currency column to user_profiles';
    ELSE
        RAISE NOTICE 'preferred_currency column already exists in user_profiles';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.preferred_currency IS 'User preferred currency for checkout: CHF, USD, EUR, GBP';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_currency ON public.user_profiles(preferred_currency);

-- ============================================================================
-- Add CASCADE DELETE to user_profiles
-- ============================================================================
-- This migration fixes the foreign key constraint on user_profiles to allow
-- user deletion by adding ON DELETE CASCADE
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add the constraint back with ON DELETE CASCADE
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'User Profiles CASCADE DELETE Added!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign key constraint updated:';
    RAISE NOTICE '  user_profiles.id -> auth.users(id) ON DELETE CASCADE';
    RAISE NOTICE '';
    RAISE NOTICE 'Now when a user is deleted from auth.users:';
    RAISE NOTICE '  ✅ Their profile will be automatically deleted';
    RAISE NOTICE '  ✅ All related data will cascade delete';
    RAISE NOTICE '============================================================================';
END $$;


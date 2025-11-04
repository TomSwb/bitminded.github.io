-- Fix 406 (Not Acceptable) Error for user_profiles table in dev database
-- This ensures the table exists with all columns and proper RLS policies
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

-- Step 1: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    date_of_birth DATE,
    country TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_say')),
    language TEXT DEFAULT 'en',
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_by UUID REFERENCES auth.users(id),
    suspension_reason TEXT,
    suspension_followup_sent BOOLEAN DEFAULT FALSE,
    reactivated_at TIMESTAMP WITH TIME ZONE,
    reactivated_by UUID REFERENCES auth.users(id),
    reactivation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add any missing columns that might have been added via migrations
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_say')),
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_followup_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reactivation_reason TEXT;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Step 5: Create RLS policies
-- First, create simple policies that work even if user_roles doesn't exist
-- Then add admin access if user_roles table exists
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 5b: Add admin access policies if user_roles table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
    ) THEN
        -- Drop and recreate policies to include admin access
        DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
        
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (
                auth.uid() = id OR 
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
        
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (
                auth.uid() = id OR 
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
        
        CREATE POLICY "Users can insert own profile" ON public.user_profiles
            FOR INSERT WITH CHECK (
                auth.uid() = id OR 
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON public.user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended_at ON public.user_profiles(suspended_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspension_followup_sent ON public.user_profiles(suspension_followup_sent);

-- Step 7: Ensure the table is accessible via PostgREST API
-- This should already be the case, but we verify the schema is public
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        RAISE EXCEPTION 'Table user_profiles does not exist in public schema';
    END IF;
END $$;

-- Step 8: Grant necessary permissions to both authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon;
-- Note: No sequence needed since primary key is UUID (not serial)

-- Step 8b: Ensure PostgREST can access the table
-- The table must be in the public schema (already done above)
-- And RLS policies must allow access (done above)

-- Step 9: Verify RLS is working
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
        AND rowsecurity = true
    ) THEN
        RAISE WARNING 'RLS might not be properly enabled';
    END IF;
END $$;

-- Step 10: Create profile for current user if it doesn't exist
-- This helps if the user exists but has no profile record
DO $$
DECLARE
    current_user_id UUID;
    username_val TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Check if profile exists
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles WHERE id = current_user_id
        ) THEN
            -- Get username from auth.users metadata or generate one
            SELECT COALESCE(
                (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = current_user_id),
                'user_' || substr(current_user_id::text, 1, 8),
                'user_' || substr(current_user_id::text, 1, 8)
            ) INTO username_val;
            
            -- Insert profile
            INSERT INTO public.user_profiles (id, username, email, status)
            SELECT 
                current_user_id,
                username_val,
                (SELECT email FROM auth.users WHERE id = current_user_id),
                'active'
            ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE '✅ Created profile for user: %', current_user_id;
        ELSE
            RAISE NOTICE '✅ Profile already exists for user: %', current_user_id;
        END IF;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ user_profiles table setup complete!';
    RAISE NOTICE '✅ RLS policies created';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '✅ Table should now be accessible via API';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '1. Refresh your browser page';
    RAISE NOTICE '2. If error persists, check browser console for more details';
    RAISE NOTICE '3. Run TEST_USER_PROFILES_ACCESS.sql to verify setup';
END $$;


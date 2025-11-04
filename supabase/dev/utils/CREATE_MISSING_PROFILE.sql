-- Create missing profile for a user
-- Use this if FIX_USER_PROFILES_406_ERROR.sql didn't create your profile
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

-- Option 1: Create profile for current authenticated user (if running as user)
DO $$
DECLARE
    current_user_id UUID;
    user_email TEXT;
    username_val TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Check if profile exists
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles WHERE id = current_user_id
        ) THEN
            -- Get user email
            SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
            
            -- Get or generate username
            SELECT COALESCE(
                (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = current_user_id),
                'user_' || substr(current_user_id::text, 1, 8)
            ) INTO username_val;
            
            -- Insert profile
            INSERT INTO public.user_profiles (id, username, email, status)
            VALUES (current_user_id, username_val, user_email, 'active')
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                status = 'active';
            
            RAISE NOTICE '✅ Created profile for user: % (username: %)', current_user_id, username_val;
        ELSE
            RAISE NOTICE '✅ Profile already exists for user: %', current_user_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️ No authenticated user found in SQL Editor';
        RAISE NOTICE '💡 Use Option 2 below to create profile for a specific user ID';
    END IF;
END $$;

-- Option 2: Create profile for a specific user ID
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can find your user ID in the browser console:
-- window.supabase.auth.getUser().then(u => console.log(u.data.user.id))

/*
DO $$
DECLARE
    target_user_id UUID := '228c5b0c-9dad-4875-bc50-1d6a1d2bbcf7'; -- Replace with your user ID
    user_email TEXT;
    username_val TEXT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'User % does not exist in auth.users', target_user_id;
    END IF;
    
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
    
    -- Get or generate username
    SELECT COALESCE(
        (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = target_user_id),
        'user_' || substr(target_user_id::text, 1, 8)
    ) INTO username_val;
    
    -- Insert or update profile
    INSERT INTO public.user_profiles (id, username, email, status)
    VALUES (target_user_id, username_val, user_email, 'active')
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, user_profiles.email),
        status = 'active';
    
    RAISE NOTICE '✅ Created/Updated profile for user: %', target_user_id;
    RAISE NOTICE '   Username: %', username_val;
    RAISE NOTICE '   Email: %', user_email;
END $$;
*/

-- Option 3: Create profiles for ALL users in auth.users who don't have profiles
-- This is useful if you have multiple users missing profiles
/*
INSERT INTO public.user_profiles (id, username, email, status)
SELECT 
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'username',
        'user_' || substr(au.id::text, 1, 8)
    ) as username,
    au.email,
    'active' as status
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

SELECT 
    COUNT(*) as profiles_created,
    '✅ Profiles created for all missing users' as message;
*/


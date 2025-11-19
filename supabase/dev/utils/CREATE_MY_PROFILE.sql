-- Create missing profile for user: 228c5b0c-9dad-4875-bc50-1d6a1d2bbcf7
-- Run this in Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)

DO $$
DECLARE
    target_user_id UUID := '228c5b0c-9dad-4875-bc50-1d6a1d2bbcf7';
    user_email TEXT;
    username_val TEXT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'User % does not exist in auth.users. Please check your user ID.', target_user_id;
    END IF;
    
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User % exists but has no email', target_user_id;
    END IF;
    
    -- Get or generate username
    SELECT COALESCE(
        (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = target_user_id),
        'user_' || substr(target_user_id::text, 1, 8)
    ) INTO username_val;
    
    -- Insert or update profile
    INSERT INTO public.user_profiles (id, username, email, status, created_at)
    VALUES (target_user_id, username_val, user_email, 'active', NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, user_profiles.email),
        status = 'active',
        updated_at = NOW();
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! Profile created/updated for user:';
    RAISE NOTICE '   User ID: %', target_user_id;
    RAISE NOTICE '   Username: %', username_val;
    RAISE NOTICE '   Email: %', user_email;
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next step: Refresh your browser page';
END $$;

-- Verify the profile was created
SELECT 
    id,
    username,
    email,
    status,
    created_at
FROM public.user_profiles
WHERE id = '228c5b0c-9dad-4875-bc50-1d6a1d2bbcf7';

















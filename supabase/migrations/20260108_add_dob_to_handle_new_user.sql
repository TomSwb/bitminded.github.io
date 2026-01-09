-- Update handle_new_user trigger to include date_of_birth from signup metadata
-- This allows DOB collected during signup to be saved to user_profiles.date_of_birth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, email, date_of_birth)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email,
        CASE 
            WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
            AND NEW.raw_user_meta_data->>'date_of_birth' != ''
            THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE
            ELSE NULL
        END
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

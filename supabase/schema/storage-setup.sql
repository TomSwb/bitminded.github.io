-- BitMinded Storage Configuration
-- Execute this in Supabase SQL Editor to set up avatar storage

-- 1. Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public bucket so we can access avatar URLs directly
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- 2. Create storage policies for the avatars bucket

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Anyone can view avatars (since it's a public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- 3. Create a function to automatically update user profile when avatar is uploaded
CREATE OR REPLACE FUNCTION public.handle_avatar_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's avatar_url in their profile
    UPDATE public.user_profiles 
    SET 
        avatar_url = NEW.name,
        updated_at = NOW()
    WHERE id::text = (storage.foldername(NEW.name))[1];
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically update profile when avatar is uploaded
CREATE TRIGGER on_avatar_uploaded
    AFTER INSERT ON storage.objects
    FOR EACH ROW 
    WHEN (NEW.bucket_id = 'avatars')
    EXECUTE FUNCTION public.handle_avatar_upload();

-- 5. Create function to clean up old avatar when new one is uploaded
CREATE OR REPLACE FUNCTION public.handle_avatar_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update and the file path changed, delete the old file
    IF OLD.name != NEW.name THEN
        -- Delete the old avatar file
        DELETE FROM storage.objects 
        WHERE bucket_id = 'avatars' 
        AND name = OLD.name;
    END IF;
    
    -- Update the user's avatar_url in their profile
    UPDATE public.user_profiles 
    SET 
        avatar_url = NEW.name,
        updated_at = NOW()
    WHERE id::text = (storage.foldername(NEW.name))[1];
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to handle avatar updates
CREATE TRIGGER on_avatar_updated
    AFTER UPDATE ON storage.objects
    FOR EACH ROW 
    WHEN (NEW.bucket_id = 'avatars')
    EXECUTE FUNCTION public.handle_avatar_update();

-- 7. Create function to clean up avatar when user deletes it
CREATE OR REPLACE FUNCTION public.handle_avatar_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Clear the avatar_url from user profile
    UPDATE public.user_profiles 
    SET 
        avatar_url = NULL,
        updated_at = NOW()
    WHERE id::text = (storage.foldername(OLD.name))[1];
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to handle avatar deletion
CREATE TRIGGER on_avatar_deleted
    AFTER DELETE ON storage.objects
    FOR EACH ROW 
    WHEN (OLD.bucket_id = 'avatars')
    EXECUTE FUNCTION public.handle_avatar_delete();

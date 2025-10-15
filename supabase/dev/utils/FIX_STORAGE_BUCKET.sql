-- Fix: Remove existing avatars bucket and recreate with policies

-- 1. Drop existing triggers first
DROP TRIGGER IF EXISTS on_avatar_uploaded ON storage.objects;
DROP TRIGGER IF EXISTS on_avatar_updated ON storage.objects;
DROP TRIGGER IF EXISTS on_avatar_deleted ON storage.objects;

-- 2. Drop existing functions
DROP FUNCTION IF EXISTS public.handle_avatar_upload() CASCADE;
DROP FUNCTION IF EXISTS public.handle_avatar_update() CASCADE;
DROP FUNCTION IF EXISTS public.handle_avatar_delete() CASCADE;

-- 3. Delete all objects in the bucket first
DELETE FROM storage.objects WHERE bucket_id = 'avatars';

-- 4. Delete the bucket
DELETE FROM storage.buckets WHERE id = 'avatars';

-- Now run your storage configuration SQL again and it should work!

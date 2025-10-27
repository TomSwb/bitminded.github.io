-- Migration: Create Products Storage Bucket
-- Purpose: Set up Supabase Storage for product media (icons, screenshots)
-- Created: 2025-01-28

-- 1. Create the products storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'products',
    'products',
    true, -- Public bucket so we can access media URLs directly
    5242880, -- 5MB file size limit (enough for images)
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/vnd.microsoft.icon', 'image/x-icon', 'image/ico']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies for the products bucket

-- Admins can upload product media
CREATE POLICY "Admins can upload product media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'products' 
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update product media
CREATE POLICY "Admins can update product media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'products' 
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can delete product media
CREATE POLICY "Admins can delete product media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'products' 
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Anyone can view product media (since it's a public bucket)
CREATE POLICY "Anyone can view product media" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');


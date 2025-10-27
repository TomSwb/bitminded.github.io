-- Update products bucket to allow .ico files
-- Run this in Supabase SQL Editor to fix the mime type restriction

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/vnd.microsoft.icon', 
    'image/x-icon', 
    'image/ico'
]
WHERE id = 'products';


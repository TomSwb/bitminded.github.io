-- Add admin role for current user
-- Run this in Supabase SQL Editor after replacing YOUR_USER_ID with your actual user ID

-- First, let's see what users exist
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Then add admin role for your user (replace 'YOUR_USER_ID' with your actual user ID)
-- You can get your user ID from the query above
INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was added
SELECT ur.user_id, ur.role, up.username, up.email 
FROM public.user_roles ur
JOIN public.user_profiles up ON ur.user_id = up.id
WHERE ur.role = 'admin';

-- Migration: Fix Category Creation RLS Policy
-- Purpose: Allow authenticated users to create categories in admin panel
-- Dependencies: product_categories table
-- Created: 2025-01-15

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage categories" ON product_categories;

-- Create a new policy that allows authenticated users to manage categories
-- This is for admin panel access - in production you'd want proper role checking
CREATE POLICY "Authenticated users can manage categories" ON product_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Add comment explaining the temporary solution
COMMENT ON POLICY "Authenticated users can manage categories" ON product_categories 
IS 'Temporary policy for admin panel access - replace with proper role-based access in production';

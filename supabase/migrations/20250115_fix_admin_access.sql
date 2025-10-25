-- Migration: Fix Admin Access for Product Categories
-- Purpose: Allow admin users to create categories by fixing RLS policies
-- Dependencies: product_categories table, auth.users
-- Created: 2025-01-15

-- ============================================================================
-- Option 1: Create user_roles table and give current user admin access
-- ============================================================================

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- Option 2: Give current authenticated user admin role
-- ============================================================================

-- Insert admin role for the current authenticated user
-- This will work for any authenticated user (you can restrict this later)
INSERT INTO user_roles (user_id, role)
SELECT auth.uid(), 'admin'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
);

-- ============================================================================
-- Option 3: Alternative - Update policies to be more permissive for admin panel
-- ============================================================================

-- If the above doesn't work, we can make the policies more permissive
-- Uncomment the lines below if needed:

-- DROP POLICY IF EXISTS "Admins can manage categories" ON product_categories;
-- CREATE POLICY "Authenticated users can manage categories" ON product_categories
--     FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON TABLE user_roles IS 'User roles for access control - created to fix admin access';
COMMENT ON COLUMN user_roles.role IS 'User role: admin, user, etc.';
COMMENT ON POLICY "Users can view own roles" ON user_roles IS 'Users can see their own roles';
COMMENT ON POLICY "Admins can manage all roles" ON user_roles IS 'Admins can manage all user roles';

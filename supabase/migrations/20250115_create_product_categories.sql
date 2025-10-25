-- Migration: Create Product Categories Table
-- Purpose: Categories for organizing products (Productivity, Developer Tools, etc.)
-- Dependencies: None
-- Created: 2025-01-15

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon name/class for UI
    color VARCHAR(7), -- Hex color for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON product_categories(sort_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active categories
CREATE POLICY "Everyone can view active categories" ON product_categories
    FOR SELECT USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage categories" ON product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert default categories
INSERT INTO product_categories (name, slug, description, icon, color, sort_order) VALUES
('Productivity Tools', 'productivity', 'Tools to boost productivity and efficiency', 'productivity', '#3B82F6', 1),
('Developer Tools', 'developer', 'Tools for developers and technical users', 'code', '#10B981', 2),
('Business Tools', 'business', 'Tools for business and professional use', 'briefcase', '#F59E0B', 3),
('Utilities', 'utilities', 'General utility and helper tools', 'tool', '#8B5CF6', 4),
('Creative Tools', 'creative', 'Tools for creative professionals', 'palette', '#EC4899', 5),
('Education', 'education', 'Educational and learning tools', 'book', '#06B6D4', 6)
ON CONFLICT (slug) DO NOTHING;

-- Add comment
COMMENT ON TABLE product_categories IS 'Product categories for organizing the product catalog';
COMMENT ON COLUMN product_categories.slug IS 'URL-friendly identifier for categories';
COMMENT ON COLUMN product_categories.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN product_categories.color IS 'Hex color code for UI theming';

-- Migration: Add external_url Field to Products Table
-- Purpose: Support external product URLs (e.g., itch.io games)
-- Dependencies: products table
-- Created: 2026-01-21

-- Add external_url column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);

-- Add index for performance (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_products_external_url 
ON products(external_url) 
WHERE external_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN products.external_url IS 'External URL for products hosted elsewhere (e.g., itch.io games)';

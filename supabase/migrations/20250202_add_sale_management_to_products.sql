-- Migration: Add Sale Management Columns to Products Table
-- Purpose: Add sale management functionality to products (mirroring services table)
-- Dependencies: products table
-- Created: 2025-02-02

-- Add sale management columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sale_pricing JSONB,
ADD COLUMN IF NOT EXISTS sale_description TEXT,
ADD COLUMN IF NOT EXISTS sale_discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sale_emoji_left VARCHAR(10) DEFAULT '✨',
ADD COLUMN IF NOT EXISTS sale_emoji_right VARCHAR(10) DEFAULT '✨';

-- Add constraint to ensure percentage is between 0 and 100
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS check_sale_discount_percentage;

ALTER TABLE products 
ADD CONSTRAINT check_sale_discount_percentage 
CHECK (sale_discount_percentage IS NULL OR (sale_discount_percentage >= 0 AND sale_discount_percentage <= 100));

-- Create index for sale filtering
CREATE INDEX IF NOT EXISTS idx_products_is_on_sale ON products(is_on_sale);

-- Add comments
COMMENT ON COLUMN products.is_on_sale IS 'Whether this product is currently on sale';
COMMENT ON COLUMN products.sale_start_date IS 'Start date/time for the sale';
COMMENT ON COLUMN products.sale_end_date IS 'End date/time for the sale';
COMMENT ON COLUMN products.sale_pricing IS 'Sale prices in same format as regular pricing (JSONB)';
COMMENT ON COLUMN products.sale_description IS 'Description of the sale/offer';
COMMENT ON COLUMN products.sale_discount_percentage IS 'Discount percentage for sale (0-100). Sale prices are calculated automatically from regular prices.';
COMMENT ON COLUMN products.sale_emoji_left IS 'Emoji to display on the left side of sale description';
COMMENT ON COLUMN products.sale_emoji_right IS 'Emoji to display on the right side of sale description';


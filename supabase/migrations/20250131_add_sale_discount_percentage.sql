-- Migration: Add Sale Discount Percentage to Services Table
-- Purpose: Add percentage-based sale pricing system
-- Dependencies: services table
-- Created: 2025-01-31

-- Add sale_discount_percentage column
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS sale_discount_percentage DECIMAL(5,2);

-- Add constraint to ensure percentage is between 0 and 100
ALTER TABLE services 
ADD CONSTRAINT check_sale_discount_percentage 
CHECK (sale_discount_percentage IS NULL OR (sale_discount_percentage >= 0 AND sale_discount_percentage <= 100));

-- Add comment
COMMENT ON COLUMN services.sale_discount_percentage IS 'Discount percentage for sale (0-100). Sale prices are calculated automatically from regular prices.';


-- Migration: Update products table currency default to CHF
-- Purpose: Change default currency from USD to CHF (Swiss-based business)
-- Dependencies: products table
-- Created: 2025-01-31

-- Change default currency from USD to CHF
ALTER TABLE products 
ALTER COLUMN price_currency SET DEFAULT 'CHF';

-- Update existing products that use USD to CHF
-- Note: Review this change carefully - all products should use CHF as primary currency
UPDATE products 
SET price_currency = 'CHF' 
WHERE price_currency = 'USD';

-- Add comment
COMMENT ON COLUMN products.price_currency IS 'Product pricing currency. Default: CHF (Swiss Francs)';

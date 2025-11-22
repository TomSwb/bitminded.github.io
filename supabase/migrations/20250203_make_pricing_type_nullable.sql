-- Migration: Make pricing_type nullable in products table
-- Purpose: Allow products to be created without pricing_type (set in Step 5, not Step 1)
-- Dependencies: products table
-- Created: 2025-02-03

-- Drop the existing check constraint
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS check_pricing_type;

-- Make pricing_type nullable
ALTER TABLE products 
ALTER COLUMN pricing_type DROP NOT NULL;

-- Re-add the check constraint to allow NULL or valid values
ALTER TABLE products 
ADD CONSTRAINT check_pricing_type 
CHECK (pricing_type IS NULL OR pricing_type IN ('one_time', 'subscription', 'freemium'));

-- Update price_currency constraint to allow NULL (for full step independence)
-- Even though it has a DEFAULT, allowing NULL ensures steps are truly independent
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS check_price_currency;

ALTER TABLE products 
ADD CONSTRAINT check_price_currency 
CHECK (price_currency IS NULL OR price_currency IN ('USD', 'EUR', 'CHF', 'GBP'));

-- Add comments
COMMENT ON COLUMN products.pricing_type IS 'Pricing model: one_time, subscription, freemium. Set in Step 5, nullable until then.';
COMMENT ON COLUMN products.price_currency IS 'Currency for pricing. Set in Step 5, nullable until then (defaults to USD).';


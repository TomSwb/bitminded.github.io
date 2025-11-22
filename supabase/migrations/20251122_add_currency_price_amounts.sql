-- Migration: Add Currency-Specific Price Amounts to Products Table
-- Purpose: Store price amounts for each currency (CHF, USD, EUR, GBP) separately
-- Dependencies: products table
-- Created: 2025-11-22

-- Add currency-specific price amount columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_amount_chf DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_amount_usd DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_amount_eur DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_amount_gbp DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN products.price_amount_chf IS 'Price amount in CHF (Swiss Franc)';
COMMENT ON COLUMN products.price_amount_usd IS 'Price amount in USD (US Dollar)';
COMMENT ON COLUMN products.price_amount_eur IS 'Price amount in EUR (Euro)';
COMMENT ON COLUMN products.price_amount_gbp IS 'Price amount in GBP (British Pound)';

-- Note: The existing price_amount and price_currency columns are kept for backward compatibility
-- They represent the primary currency price (typically CHF)


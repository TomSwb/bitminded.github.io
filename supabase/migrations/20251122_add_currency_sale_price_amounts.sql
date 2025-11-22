-- Migration: Add Currency-Specific Sale Price Amounts to Products Table
-- Purpose: Store explicit sale price amounts for CHF, USD, EUR, GBP in the products table
-- Dependencies: products table
-- Created: 2025-11-22

ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price_amount_chf DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price_amount_usd DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price_amount_eur DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price_amount_gbp DECIMAL(10,2);

COMMENT ON COLUMN products.sale_price_amount_chf IS 'Explicit sale price amount for CHF (Swiss Franc)';
COMMENT ON COLUMN products.sale_price_amount_usd IS 'Explicit sale price amount for USD (US Dollar)';
COMMENT ON COLUMN products.sale_price_amount_eur IS 'Explicit sale price amount for EUR (Euro)';
COMMENT ON COLUMN products.sale_price_amount_gbp IS 'Explicit sale price amount for GBP (British Pound)';


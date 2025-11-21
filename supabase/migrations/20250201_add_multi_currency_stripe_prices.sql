-- Migration: Add Multi-Currency Stripe Prices to Products Table
-- Purpose: Support multiple currencies (CHF, USD, EUR, GBP) for Stripe pricing
-- Dependencies: products table
-- Created: 2025-02-01

-- Add JSONB column to store multi-currency Stripe price IDs
-- Structure: {"CHF": {"price_id": "price_xxx", "amount": 50}, "USD": {"price_id": "price_yyy", "amount": 55}, ...}
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_prices JSONB DEFAULT '{}';

-- Add individual currency price ID columns for easier querying (optional, can use JSONB instead)
-- Keeping these for backward compatibility and easier queries
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_price_chf_id VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_price_usd_id VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_price_eur_id VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_price_gbp_id VARCHAR(255);

-- Create index on JSONB column for efficient queries
CREATE INDEX IF NOT EXISTS idx_products_stripe_prices ON products USING GIN (stripe_prices);

-- Create indexes on individual currency columns
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_chf_id ON products(stripe_price_chf_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_usd_id ON products(stripe_price_usd_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_eur_id ON products(stripe_price_eur_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_gbp_id ON products(stripe_price_gbp_id);

-- Add comments
COMMENT ON COLUMN products.stripe_prices IS 'Multi-currency Stripe price IDs stored as JSONB: {"CHF": {"price_id": "price_xxx", "amount": 50}, ...}';
COMMENT ON COLUMN products.stripe_price_chf_id IS 'Stripe price ID for CHF (Swiss Franc) - kept for backward compatibility';
COMMENT ON COLUMN products.stripe_price_usd_id IS 'Stripe price ID for USD (US Dollar)';
COMMENT ON COLUMN products.stripe_price_eur_id IS 'Stripe price ID for EUR (Euro)';
COMMENT ON COLUMN products.stripe_price_gbp_id IS 'Stripe price ID for GBP (British Pound)';

-- Note: stripe_price_id column (existing) is kept for backward compatibility
-- New products should use stripe_prices JSONB or individual currency columns


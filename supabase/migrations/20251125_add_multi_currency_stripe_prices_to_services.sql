-- Migration: Add Multi-Currency Stripe Prices to Services Table
-- Purpose: Store Stripe price IDs for all currencies (CHF, USD, EUR, GBP) in JSONB format
-- Dependencies: services table
-- Created: 2025-11-25

-- Add stripe_prices JSONB column for multi-currency price IDs
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_prices JSONB DEFAULT '{}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_services_stripe_prices ON services USING GIN (stripe_prices);

-- Add comment
COMMENT ON COLUMN services.stripe_prices IS 'Multi-currency Stripe price IDs stored as JSONB. Structure: {"CHF": {"monthly": "price_xxx", "yearly": "price_yyy", "regular": "price_zzz", "reduced": "price_aaa"}, "USD": {...}, "EUR": {...}, "GBP": {...}}. For subscription services: monthly/yearly. For one-time services: regular/reduced.';


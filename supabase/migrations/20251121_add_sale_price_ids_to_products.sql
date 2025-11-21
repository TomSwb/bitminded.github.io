-- Migration: Add Sale Price IDs to Products Table
-- Purpose: Store Stripe price IDs for sale prices (when product is on sale)
-- Dependencies: products table
-- Created: 2025-11-21

-- Add sale price ID columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stripe_price_sale_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_monthly_sale_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_yearly_sale_id VARCHAR(255);

-- Add comments
COMMENT ON COLUMN products.stripe_price_sale_id IS 'Stripe Price ID for one-time sale price (when product is on sale)';
COMMENT ON COLUMN products.stripe_price_monthly_sale_id IS 'Stripe Price ID for monthly recurring sale price (when product is on sale)';
COMMENT ON COLUMN products.stripe_price_yearly_sale_id IS 'Stripe Price ID for yearly recurring sale price (when product is on sale)';


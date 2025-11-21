-- Migration: Add Sale Price IDs to Services Table
-- Purpose: Store Stripe price IDs for sale prices (when service is on sale)
-- Dependencies: services table
-- Created: 2025-11-21

-- Add sale price ID columns
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_price_sale_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_monthly_sale_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_yearly_sale_id VARCHAR(255);

-- Add comments
COMMENT ON COLUMN services.stripe_price_sale_id IS 'Stripe Price ID for one-time sale price (when service is on sale)';
COMMENT ON COLUMN services.stripe_price_monthly_sale_id IS 'Stripe Price ID for monthly recurring sale price (when service is on sale)';
COMMENT ON COLUMN services.stripe_price_yearly_sale_id IS 'Stripe Price ID for yearly recurring sale price (when service is on sale)';


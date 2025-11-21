-- Migration: Add Monthly and Yearly Stripe Price IDs to Services
-- Purpose: Support multiple subscription prices (monthly and yearly) for a single service product
-- Dependencies: services table
-- Created: 2025-11-21

-- Add monthly and yearly Stripe price ID columns
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_price_monthly_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_yearly_id VARCHAR(255);

-- Add comments
COMMENT ON COLUMN services.stripe_price_monthly_id IS 'Stripe price ID for monthly subscription billing';
COMMENT ON COLUMN services.stripe_price_yearly_id IS 'Stripe price ID for yearly subscription billing';


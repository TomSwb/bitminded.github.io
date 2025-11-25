-- Migration: Add payment_method column to services table
-- Purpose: Support dual payment methods (Stripe vs PostFinance bank transfers)
-- Dependencies: services table
-- Created: 2025-01-31

-- Add payment_method column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe';

-- Add constraint to ensure valid payment method values
ALTER TABLE services 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('stripe', 'bank_transfer'));

-- Add index for performance when filtering by payment method
CREATE INDEX IF NOT EXISTS idx_services_payment_method ON services(payment_method);

-- Add comment
COMMENT ON COLUMN services.payment_method IS 'Payment method for this service: stripe (instant card payment) or bank_transfer (PostFinance QR-bill)';

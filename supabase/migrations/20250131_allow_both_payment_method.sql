-- Migration: Allow 'both' as payment_method value in services table
-- Purpose: Support services that can be offered both in-person (bank transfer) and remote (Stripe)
-- Dependencies: services table with payment_method column
-- Created: 2025-01-31

-- Drop existing constraint
ALTER TABLE services 
DROP CONSTRAINT IF EXISTS check_payment_method;

-- Add new constraint that allows 'both' as a value
ALTER TABLE services 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('stripe', 'bank_transfer', 'both'));

-- Update comment to reflect new option
COMMENT ON COLUMN services.payment_method IS 'Payment method for this service: stripe (instant card payment), bank_transfer (PostFinance QR-bill), or both (service can be offered in-person with bank transfer or remote with Stripe)';


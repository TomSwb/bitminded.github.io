-- Migration: Update existing services with payment_method values
-- Purpose: Assign payment methods to existing services based on finalized strategy
-- Dependencies: services table with payment_method column
-- Created: 2025-01-31

-- Update existing services based on finalized payment strategy:
-- - catalog-access: Stripe (instant subscriptions)
-- - tech-support with travel: Bank Transfer (variable pricing, in-person)
-- - tech-support without travel: Stripe (fixed pricing, remote)
-- - commissioning: Bank Transfer (variable/range pricing, custom quotes)
UPDATE services 
SET payment_method = CASE
    WHEN service_category = 'catalog-access' THEN 'stripe'
    WHEN service_category = 'tech-support' AND additional_costs LIKE '%travel%' THEN 'bank_transfer'
    WHEN service_category = 'tech-support' THEN 'stripe'
    WHEN service_category = 'commissioning' THEN 'bank_transfer'
    ELSE 'stripe'
END
WHERE payment_method IS NULL OR payment_method = 'stripe'; -- Only update if not already set or if default

-- Verify all services have payment_method set
-- This will throw an error if any service still has NULL payment_method
ALTER TABLE services 
ALTER COLUMN payment_method SET NOT NULL;

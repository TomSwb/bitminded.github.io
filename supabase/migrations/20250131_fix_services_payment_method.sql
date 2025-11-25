-- Migration: Fix services payment_method values
-- Purpose: Force update all services with correct payment_method based on category and additional_costs
-- Dependencies: services table with payment_method column
-- Created: 2025-01-31

-- Update ALL services based on finalized payment strategy (overriding any existing values):
-- - catalog-access: Stripe (instant subscriptions)
-- - tech-support with travel: Bank Transfer (variable pricing, in-person)
-- - tech-support without travel: Stripe (fixed pricing, remote)
-- - commissioning: Bank Transfer (variable/range pricing, custom quotes)
UPDATE services 
SET payment_method = CASE
    WHEN service_category = 'catalog-access' THEN 'stripe'
    WHEN service_category = 'tech-support' AND (additional_costs LIKE '%travel%' OR additional_costs LIKE '%device cost%') THEN 'bank_transfer'
    WHEN service_category = 'tech-support' THEN 'stripe'
    WHEN service_category = 'commissioning' THEN 'bank_transfer'
    ELSE 'stripe'
END;

-- Verify update worked - show distribution
-- This is just for verification, won't fail if values are already correct
SELECT 
    service_category,
    payment_method,
    COUNT(*) as count
FROM services
GROUP BY service_category, payment_method
ORDER BY service_category, payment_method;

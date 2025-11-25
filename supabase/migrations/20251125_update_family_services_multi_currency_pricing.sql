-- Migration: Update Family Plan Services with Multi-Currency Pricing
-- Purpose: Add USD, EUR, GBP pricing to family plan services (same prices, no conversion)
-- Dependencies: services table, family plan services must exist
-- Created: 2025-11-25

-- Update All-Tools Membership (Family) with multi-currency pricing
UPDATE services SET 
    pricing = '{
        "CHF": {"amount": 3.50, "monthly": 3.50, "yearly": 38.50, "family_monthly": 3.50, "family_yearly": 38.50},
        "USD": {"amount": 3.50, "monthly": 3.50, "yearly": 38.50, "family_monthly": 3.50, "family_yearly": 38.50},
        "EUR": {"amount": 3.50, "monthly": 3.50, "yearly": 38.50, "family_monthly": 3.50, "family_yearly": 38.50},
        "GBP": {"amount": 3.50, "monthly": 3.50, "yearly": 38.50, "family_monthly": 3.50, "family_yearly": 38.50}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'all-tools-membership-family';

-- Update Supporter Tier (Family) with multi-currency pricing
UPDATE services SET 
    pricing = '{
        "CHF": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "USD": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "EUR": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "GBP": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'supporter-tier-family';

-- Verification query (uncomment to run after migration)
-- SELECT 
--     slug,
--     name,
--     pricing->'CHF'->>'monthly' AS chf_monthly,
--     pricing->'USD'->>'monthly' AS usd_monthly,
--     pricing->'EUR'->>'monthly' AS eur_monthly,
--     pricing->'GBP'->>'monthly' AS gbp_monthly,
--     pricing->'CHF'->>'yearly' AS chf_yearly,
--     pricing->'USD'->>'yearly' AS usd_yearly,
--     pricing->'EUR'->>'yearly' AS eur_yearly,
--     pricing->'GBP'->>'yearly' AS gbp_yearly
-- FROM services
-- WHERE slug IN ('all-tools-membership-family', 'supporter-tier-family')
-- ORDER BY slug;


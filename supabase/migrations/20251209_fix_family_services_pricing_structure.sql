-- Migration: Fix Family Services Pricing Structure
-- Purpose: Update family services pricing to include family_monthly and family_yearly keys
-- Dependencies: services table, family plan services must exist
-- Created: 2025-12-09
-- Issue: Production family services missing family_monthly/family_yearly keys in pricing structure

-- Update All-Tools Membership (Family) with correct pricing structure
-- This replaces the entire pricing object to ensure all required keys are present
UPDATE services SET 
    pricing = '{
        "CHF": {"amount": 3.5, "monthly": 3.5, "yearly": 38.5, "family_monthly": 3.5, "family_yearly": 38.5},
        "USD": {"amount": 3.5, "monthly": 3.5, "yearly": 38.5, "family_monthly": 3.5, "family_yearly": 38.5},
        "EUR": {"amount": 3.5, "monthly": 3.5, "yearly": 38.5, "family_monthly": 3.5, "family_yearly": 38.5},
        "GBP": {"amount": 3.5, "monthly": 3.5, "yearly": 38.5, "family_monthly": 3.5, "family_yearly": 38.5}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'all-tools-membership-family'
  AND (
    pricing->'CHF'->>'family_monthly' IS NULL 
    OR pricing->'CHF'->>'family_yearly' IS NULL
    OR pricing->'USD'->>'family_monthly' IS NULL
    OR pricing->'USD'->>'family_yearly' IS NULL
  );

-- Update Supporter Tier (Family) with correct pricing structure
UPDATE services SET 
    pricing = '{
        "CHF": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "USD": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "EUR": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55},
        "GBP": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'supporter-tier-family'
  AND (
    pricing->'CHF'->>'family_monthly' IS NULL 
    OR pricing->'CHF'->>'family_yearly' IS NULL
    OR pricing->'USD'->>'family_monthly' IS NULL
    OR pricing->'USD'->>'family_yearly' IS NULL
  );

-- Verification query (run after migration to confirm)
-- SELECT 
--     slug,
--     name,
--     pricing->'CHF' AS chf_pricing,
--     pricing->'USD' AS usd_pricing,
--     pricing->'EUR' AS eur_pricing,
--     pricing->'GBP' AS gbp_pricing
-- FROM services
-- WHERE slug IN ('all-tools-membership-family', 'supporter-tier-family')
-- ORDER BY slug;

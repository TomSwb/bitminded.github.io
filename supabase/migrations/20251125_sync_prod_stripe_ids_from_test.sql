-- Migration: Sync Production Database with Stripe IDs from Test Environment
-- Purpose: Update production services table with correct Stripe product and price IDs from test Stripe account
-- Created: 2025-11-25
-- IMPORTANT: This updates production database with test Stripe IDs. Verify service slugs match before running.

-- ============================================================================
-- CATALOG ACCESS SERVICES (Subscription)
-- ============================================================================

-- All-Tools Membership
UPDATE services SET 
    stripe_product_id = 'prod_TSv9HVaMG6INfU',
    stripe_price_id = 'price_1SVzJ5PBAwkcNEBl0EnQG73P', -- CHF Monthly (default)
    stripe_price_monthly_id = 'price_1SVzJ5PBAwkcNEBl0EnQG73P', -- CHF Monthly
    stripe_price_yearly_id = 'price_1SVzJ5PBAwkcNEBlZlfbEqMc', -- CHF Yearly
    stripe_prices = '{
        "CHF": {"monthly": "price_1SVzJ5PBAwkcNEBl0EnQG73P", "yearly": "price_1SVzJ5PBAwkcNEBlZlfbEqMc"},
        "USD": {"monthly": "price_1SVzJ7PBAwkcNEBlJBhXvaGf", "yearly": "price_1SVzJ7PBAwkcNEBl0UHDMOCY"},
        "EUR": {"monthly": "price_1SVzJ6PBAwkcNEBlAdb48E2V", "yearly": "price_1SVzJ6PBAwkcNEBlNNSczdAk"},
        "GBP": {"monthly": "price_1SVzJ6PBAwkcNEBlCIfOx2Tt", "yearly": "price_1SVzJ7PBAwkcNEBl4jiAgTHK"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'all-tools-membership';

-- Supporter Tier
UPDATE services SET 
    stripe_product_id = 'prod_TSv94tvIgfIpAH',
    stripe_price_id = 'price_1SVzJWPBAwkcNEBlYlkMtQbw', -- CHF Monthly (default)
    stripe_price_monthly_id = 'price_1SVzJWPBAwkcNEBlYlkMtQbw', -- CHF Monthly
    stripe_price_yearly_id = 'price_1SVzJWPBAwkcNEBlxwiM4FmY', -- CHF Yearly
    stripe_prices = '{
        "CHF": {"monthly": "price_1SVzJWPBAwkcNEBlYlkMtQbw", "yearly": "price_1SVzJWPBAwkcNEBlxwiM4FmY"},
        "USD": {"monthly": "price_1SVzJYPBAwkcNEBlTp6IswxS", "yearly": "price_1SVzJYPBAwkcNEBltSE7ak5N"},
        "EUR": {"monthly": "price_1SVzJWPBAwkcNEBlV6C51v2H", "yearly": "price_1SVzJXPBAwkcNEBlejszg6Z6"},
        "GBP": {"monthly": "price_1SVzJXPBAwkcNEBlQnRk8Owg", "yearly": "price_1SVzJXPBAwkcNEBlNEn6xgJW"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'supporter-tier';

-- All-Tools Membership (Family)
UPDATE services SET 
    stripe_product_id = 'prod_TUTG8XZ4EbXhY4',
    stripe_price_id = 'price_1SXUKQPBAwkcNEBl08KaDt2o', -- CHF Monthly (default)
    stripe_price_monthly_id = 'price_1SXUKQPBAwkcNEBl08KaDt2o', -- CHF Monthly
    stripe_price_yearly_id = 'price_1SXUKQPBAwkcNEBl9Pf7z5cF', -- CHF Yearly
    stripe_prices = '{
        "CHF": {"monthly": "price_1SXUKQPBAwkcNEBl08KaDt2o", "yearly": "price_1SXUKQPBAwkcNEBl9Pf7z5cF"},
        "USD": {"monthly": "price_1SXUKSPBAwkcNEBlpP3E72Cy", "yearly": "price_1SXUKSPBAwkcNEBltG4RwGyF"},
        "EUR": {"monthly": "price_1SXUKRPBAwkcNEBlgCSWMenm", "yearly": "price_1SXUKRPBAwkcNEBlUCbFyb4k"},
        "GBP": {"monthly": "price_1SXUKRPBAwkcNEBlcyZ5akqu", "yearly": "price_1SXUKSPBAwkcNEBloIwNqz08"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'all-tools-membership-family';

-- Supporter Tier (Family)
UPDATE services SET 
    stripe_product_id = 'prod_TUTHtMLJGyofEk',
    stripe_price_id = 'price_1SXULJPBAwkcNEBlOrfdc9QK', -- CHF Monthly (default)
    stripe_price_monthly_id = 'price_1SXULJPBAwkcNEBlOrfdc9QK', -- CHF Monthly
    stripe_price_yearly_id = 'price_1SXULJPBAwkcNEBltxIIqcca', -- CHF Yearly
    stripe_prices = '{
        "CHF": {"monthly": "price_1SXULJPBAwkcNEBlOrfdc9QK", "yearly": "price_1SXULJPBAwkcNEBltxIIqcca"},
        "USD": {"monthly": "price_1SXULLPBAwkcNEBl9RzftXen", "yearly": "price_1SXULLPBAwkcNEBl7x7t0zTT"},
        "EUR": {"monthly": "price_1SXULJPBAwkcNEBlAMLBkQd5", "yearly": "price_1SXULKPBAwkcNEBlsls3uKm2"},
        "GBP": {"monthly": "price_1SXULKPBAwkcNEBlnRNjus37", "yearly": "price_1SXULKPBAwkcNEBlhnVtxW77"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'supporter-tier-family';

-- ============================================================================
-- TECH SUPPORT SERVICES (One-time with Reduced Fare)
-- ============================================================================

-- Confidence Session
UPDATE services SET 
    stripe_product_id = 'prod_TTJvEPBEa1zD0T',
    stripe_price_id = 'price_1SXUMkPBAwkcNEBledj52YVw', -- CHF Regular (latest)
    stripe_price_reduced_id = NULL, -- No reduced fare price in test
    stripe_prices = '{
        "CHF": {"regular": "price_1SXUMkPBAwkcNEBledj52YVw"},
        "USD": {"regular": "price_1SXUMlPBAwkcNEBl2HKnyOKD"},
        "EUR": {"regular": "price_1SXUMlPBAwkcNEBl1aQvdDbE"},
        "GBP": {"regular": "price_1SXUMlPBAwkcNEBlGvxnL8pz"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'confidence-session';

-- Device Procurement
UPDATE services SET 
    stripe_product_id = 'prod_TStfjIEnMfHO67',
    stripe_price_id = 'price_1SVxrxPBAwkcNEBlxsRpm5YN', -- CHF Regular
    stripe_price_reduced_id = 'price_1SVxrxPBAwkcNEBl45mgXnmk', -- CHF Reduced Fare
    stripe_prices = '{
        "CHF": {"regular": "price_1SVxrxPBAwkcNEBlxsRpm5YN", "reduced": "price_1SVxrxPBAwkcNEBl45mgXnmk"},
        "USD": {"regular": "price_1SVxrzPBAwkcNEBlujf7m45n", "reduced": "price_1SVxrzPBAwkcNEBlnN78jAt1"},
        "EUR": {"regular": "price_1SVxrxPBAwkcNEBlnwMBPalX", "reduced": "price_1SVxryPBAwkcNEBlC25FJsSA"},
        "GBP": {"regular": "price_1SVxryPBAwkcNEBlUxBnJMR4", "reduced": "price_1SVxryPBAwkcNEBl1teGtHbq"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'device-procurement';

-- Friendly Tech Drop-In
UPDATE services SET 
    stripe_product_id = 'prod_TSteMAMGfE75gj',
    stripe_price_id = 'price_1SVxrTPBAwkcNEBlN9NzXeO2', -- CHF Regular
    stripe_price_reduced_id = 'price_1SVxrTPBAwkcNEBlMTdMS8U6', -- CHF Reduced Fare
    stripe_prices = '{
        "CHF": {"regular": "price_1SVxrTPBAwkcNEBlN9NzXeO2", "reduced": "price_1SVxrTPBAwkcNEBlMTdMS8U6"},
        "USD": {"regular": "price_1SVxrVPBAwkcNEBloIy1f5ta", "reduced": "price_1SVxrVPBAwkcNEBl5Qs6CjKR"},
        "EUR": {"regular": "price_1SVxrUPBAwkcNEBlNqvAphUO", "reduced": "price_1SVxrUPBAwkcNEBl1EDyYfcR"},
        "GBP": {"regular": "price_1SVxrUPBAwkcNEBl8tX53510", "reduced": "price_1SVxrUPBAwkcNEBlQnQrbmxl"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'friendly-tech-drop-in';

-- Home Visit Essentials
UPDATE services SET 
    stripe_product_id = 'prod_TStf3oxSmTOSQC',
    stripe_price_id = 'price_1SVxrhPBAwkcNEBl1tN1YVGr', -- CHF Regular
    stripe_price_reduced_id = 'price_1SVxrhPBAwkcNEBloWZ1f8QG', -- CHF Reduced Fare
    stripe_prices = '{
        "CHF": {"regular": "price_1SVxrhPBAwkcNEBl1tN1YVGr", "reduced": "price_1SVxrhPBAwkcNEBloWZ1f8QG"},
        "USD": {"regular": "price_1SVxrjPBAwkcNEBl6RkR2EHW", "reduced": "price_1SVxrjPBAwkcNEBlz1jVUhLG"},
        "EUR": {"regular": "price_1SVxriPBAwkcNEBlIkHJ3vBM", "reduced": "price_1SVxriPBAwkcNEBlYt6uNY7k"},
        "GBP": {"regular": "price_1SVxriPBAwkcNEBlVB9hx1jM", "reduced": "price_1SVxrjPBAwkcNEBlJJ2wObGR"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'home-visit-essentials';

-- Parent & Home Tech Session
UPDATE services SET 
    stripe_product_id = 'prod_TSteVNkXBrfTHn',
    stripe_price_id = NULL, -- No price found in test
    stripe_price_reduced_id = NULL,
    stripe_prices = '{}'::jsonb, -- No prices in test
    updated_at = NOW()
WHERE slug = 'parent-home-tech-session';

-- Quick Tech Help
UPDATE services SET 
    stripe_product_id = 'prod_TStezGOdgTeRvd',
    stripe_price_id = NULL, -- No price found in test
    stripe_price_reduced_id = NULL,
    stripe_prices = '{}'::jsonb, -- No prices in test
    updated_at = NOW()
WHERE slug = 'quick-tech-help';

-- ============================================================================
-- COMMISSIONING SERVICES
-- ============================================================================

-- Guided Learning Bundle
UPDATE services SET 
    stripe_product_id = 'prod_TSwze2dRCdtAls',
    stripe_price_id = NULL, -- No price found in test
    stripe_price_reduced_id = NULL,
    stripe_prices = '{}'::jsonb, -- No prices in test
    updated_at = NOW()
WHERE slug = 'guided-learning-bundle';

-- Personal Project Intake
UPDATE services SET 
    stripe_product_id = 'prod_TSwwqJYYN1iZa1',
    stripe_price_id = 'price_1SW12FPBAwkcNEBlH2GhC82H', -- CHF Regular
    stripe_price_reduced_id = 'price_1SW12FPBAwkcNEBlBoBBGhAf', -- CHF Reduced Fare
    stripe_prices = '{
        "CHF": {"regular": "price_1SW12FPBAwkcNEBlH2GhC82H", "reduced": "price_1SW12FPBAwkcNEBlBoBBGhAf"},
        "USD": {"regular": "price_1SW12HPBAwkcNEBlkkCHgs9k", "reduced": "price_1SW12HPBAwkcNEBlLq6kJweN"},
        "EUR": {"regular": "price_1SW12FPBAwkcNEBlbHbFfFBz", "reduced": "price_1SW12GPBAwkcNEBlkItqPmP1"},
        "GBP": {"regular": "price_1SW12GPBAwkcNEBls9ADmxEp", "reduced": "price_1SW12GPBAwkcNEBllThW4ziV"}
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'personal-project-intake';

-- ============================================================================
-- VERIFICATION QUERY (Run after executing the updates above)
-- ============================================================================
-- SELECT 
--     name,
--     slug,
--     stripe_product_id IS NOT NULL AS has_product_id,
--     stripe_price_id IS NOT NULL AS has_price_id,
--     stripe_price_reduced_id IS NOT NULL AS has_reduced_price_id,
--     stripe_price_monthly_id IS NOT NULL AS has_monthly_price_id,
--     stripe_price_yearly_id IS NOT NULL AS has_yearly_price_id,
--     stripe_prices IS NOT NULL AND stripe_prices != '{}'::jsonb AS has_multi_currency_prices,
--     jsonb_object_keys(stripe_prices) AS currencies
-- FROM services
-- WHERE slug IN (
--     'all-tools-membership',
--     'supporter-tier',
--     'all-tools-membership-family',
--     'supporter-tier-family',
--     'confidence-session',
--     'device-procurement',
--     'friendly-tech-drop-in',
--     'home-visit-essentials',
--     'parent-home-tech-session',
--     'quick-tech-help',
--     'guided-learning-bundle',
--     'personal-project-intake'
-- )
-- ORDER BY service_category, name;


-- Migration: Update Production Database with Stripe IDs from Dev
-- Purpose: Sync Stripe product and price IDs from dev to prod
-- Generated: 2025-11-21
-- IMPORTANT: Review and verify service slugs match before running on PROD

-- All-Tools Membership
UPDATE services SET 
    stripe_product_id = 'prod_TSv9HVaMG6INfU', 
    stripe_price_id = 'price_1SVzJ5PBAwkcNEBl0EnQG73P', 
    stripe_price_monthly_id = 'price_1SVzJ5PBAwkcNEBl0EnQG73P', 
    stripe_price_yearly_id = 'price_1SVzJ5PBAwkcNEBlZlfbEqMc', 
    updated_at = NOW() 
WHERE slug = 'all-tools-membership';

-- Confidence Session
UPDATE services SET 
    stripe_product_id = 'prod_TStTaS2SwbfwkI', 
    stripe_price_id = 'price_1SVxgFPBAwkcNEBlirRAyf97', 
    stripe_price_reduced_id = 'price_1SVxgFPBAwkcNEBlM5rfzeSM', 
    updated_at = NOW() 
WHERE slug = 'confidence-session';

-- Device Procurement
UPDATE services SET 
    stripe_product_id = 'prod_TStfjIEnMfHO67', 
    stripe_price_id = 'price_1SVxrxPBAwkcNEBlxsRpm5YN', 
    stripe_price_reduced_id = 'price_1SVxrxPBAwkcNEBl45mgXnmk', 
    updated_at = NOW() 
WHERE slug = 'device-procurement';

-- Friendly Tech Drop-In
UPDATE services SET 
    stripe_product_id = 'prod_TSteMAMGfE75gj', 
    stripe_price_id = 'price_1SVxrTPBAwkcNEBlN9NzXeO2', 
    stripe_price_reduced_id = 'price_1SVxrTPBAwkcNEBlMTdMS8U6', 
    updated_at = NOW() 
WHERE slug = 'friendly-tech-drop-in';

-- Guided Learning Bundle
UPDATE services SET 
    stripe_product_id = 'prod_TStSByXuUnGjXh', 
    stripe_price_id = 'price_1SVxfWPBAwkcNEBlsQtlu0kQ', 
    stripe_price_reduced_id = 'price_1SVxfXPBAwkcNEBlkgFJU8Ej', 
    updated_at = NOW() 
WHERE slug = 'guided-learning-bundle';

-- Home Visit Essentials
UPDATE services SET 
    stripe_product_id = 'prod_TStf3oxSmTOSQC', 
    stripe_price_id = 'price_1SVxrhPBAwkcNEBl1tN1YVGr', 
    stripe_price_reduced_id = 'price_1SVxrhPBAwkcNEBloWZ1f8QG', 
    updated_at = NOW() 
WHERE slug = 'home-visit-essentials';

-- Parent & Home Tech Session
UPDATE services SET 
    stripe_product_id = 'prod_TSteVNkXBrfTHn', 
    stripe_price_id = 'price_1SVxqsPBAwkcNEBlK3PY67ev', 
    stripe_price_reduced_id = 'price_1SVxqsPBAwkcNEBleBiVYFXK', 
    updated_at = NOW() 
WHERE slug = 'parent-home-tech-session';

-- Quick Tech Help
UPDATE services SET 
    stripe_product_id = 'prod_TStezGOdgTeRvd', 
    stripe_price_id = 'price_1SVxr2PBAwkcNEBlo5vUh9xr', 
    stripe_price_reduced_id = 'price_1SVxr2PBAwkcNEBlEVdBN33y', 
    updated_at = NOW() 
WHERE slug = 'quick-tech-help';

-- Supporter Tier
UPDATE services SET 
    stripe_product_id = 'prod_TSv94tvIgfIpAH', 
    stripe_price_id = 'price_1SVzJWPBAwkcNEBlYlkMtQbw', 
    stripe_price_monthly_id = 'price_1SVzJWPBAwkcNEBlYlkMtQbw', 
    stripe_price_yearly_id = 'price_1SVzJWPBAwkcNEBlxwiM4FmY', 
    updated_at = NOW() 
WHERE slug = 'supporter-tier';

-- ============================================================================
-- VERIFICATION: Run this after executing the updates above
-- ============================================================================
-- SELECT 
--     name,
--     slug,
--     stripe_product_id IS NOT NULL AS has_product_id,
--     stripe_price_id IS NOT NULL AS has_price_id,
--     stripe_price_reduced_id IS NOT NULL AS has_reduced_price_id,
--     stripe_price_monthly_id IS NOT NULL AS has_monthly_price_id,
--     stripe_price_yearly_id IS NOT NULL AS has_yearly_price_id
-- FROM services
-- WHERE stripe_product_id IS NOT NULL
-- ORDER BY name;


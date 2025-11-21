-- Migration: Update Production Database with Pricing Data from Dev
-- Purpose: Sync pricing JSONB data from dev to prod
-- Generated: 2025-11-21
-- IMPORTANT: Review and verify service slugs match before running on PROD

-- All-Tools Membership
UPDATE services SET 
    pricing = '{"CHF": {"yearly": 55, "monthly": 5, "family_yearly": 38.5, "family_monthly": 3.5}, "EUR": {"yearly": 55, "monthly": 5, "family_yearly": 38.5, "family_monthly": 3.5}, "GBP": {"yearly": 55, "monthly": 5, "family_yearly": 38.5, "family_monthly": 3.5}, "USD": {"yearly": 55, "monthly": 5, "family_yearly": 38.5, "family_monthly": 3.5}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'all-tools-membership';

-- Commission a Feature
UPDATE services SET 
    pricing = '{"CHF": {"max": 150, "min": 20}, "EUR": {"max": 150, "min": 20}, "GBP": {"max": 150, "min": 20}, "USD": {"max": 150, "min": 20}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'commission-a-feature';

-- Complex App
UPDATE services SET 
    pricing = '{"CHF": {"max": 1950, "min": 1350}, "EUR": {"max": 1950, "min": 1350}, "GBP": {"max": 1950, "min": 1350}, "USD": {"max": 1950, "min": 1350}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'complex-app';

-- Confidence Session
UPDATE services SET 
    pricing = '{"CHF": {"amount": 50, "reduced_amount": 35}, "EUR": {"amount": 50, "reduced_amount": 35}, "GBP": {"amount": 50, "reduced_amount": 35}, "USD": {"amount": 50, "reduced_amount": 35}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'confidence-session';

-- Device Procurement
UPDATE services SET 
    pricing = '{"CHF": {"amount": 30, "reduced_amount": 20}, "EUR": {"amount": 30, "reduced_amount": 20}, "GBP": {"amount": 30, "reduced_amount": 20}, "USD": {"amount": 30, "reduced_amount": 20}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'device-procurement';

-- Friendly Tech Drop-In
UPDATE services SET 
    pricing = '{"CHF": {"amount": 35, "reduced_amount": 30}, "EUR": {"amount": 35, "reduced_amount": 30}, "GBP": {"amount": 35, "reduced_amount": 30}, "USD": {"amount": 35, "reduced_amount": 30}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'friendly-tech-drop-in';

-- Guided Learning Bundle
UPDATE services SET 
    pricing = '{"CHF": {"amount": 135, "reduced_amount": 95}, "EUR": {"amount": 135, "reduced_amount": 95}, "GBP": {"amount": 135, "reduced_amount": 95}, "USD": {"amount": 135, "reduced_amount": 95}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'guided-learning-bundle';

-- Home Visit Essentials
UPDATE services SET 
    pricing = '{"CHF": {"amount": 90, "reduced_amount": 65}, "EUR": {"amount": 90, "reduced_amount": 65}, "GBP": {"amount": 90, "reduced_amount": 65}, "USD": {"amount": 90, "reduced_amount": 65}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'home-visit-essentials';

-- Parent & Home Tech Session
UPDATE services SET 
    pricing = '{"CHF": {"amount": 75, "reduced_amount": 50}, "EUR": {"amount": 75, "reduced_amount": 50}, "GBP": {"amount": 75, "reduced_amount": 50}, "USD": {"amount": 75, "reduced_amount": 50}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'parent-home-tech-session';

-- Personal Project Intake
UPDATE services SET 
    pricing = '{"CHF": {"amount": 30, "reduced_amount": 25}, "EUR": {"amount": 30, "reduced_amount": 25}, "GBP": {"amount": 30, "reduced_amount": 25}, "USD": {"amount": 30, "reduced_amount": 25}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'personal-project-intake';

-- Quick Tech Help
UPDATE services SET 
    pricing = '{"CHF": {"amount": 30, "reduced_amount": 25}, "EUR": {"amount": 30, "reduced_amount": 25}, "GBP": {"amount": 30, "reduced_amount": 25}, "USD": {"amount": 30, "reduced_amount": 25}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'quick-tech-help';

-- Simple App
UPDATE services SET 
    pricing = '{"CHF": {"max": 750, "min": 350}, "EUR": {"max": 750, "min": 350}, "GBP": {"max": 750, "min": 350}, "USD": {"max": 750, "min": 350}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'simple-app';

-- Single Tool License
UPDATE services SET 
    pricing = '{"CHF": {"max": 25, "min": 2}, "EUR": {"max": 25, "min": 2}, "GBP": {"max": 25, "min": 2}, "USD": {"max": 25, "min": 2}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'single-tool-license';

-- Standard App
UPDATE services SET 
    pricing = '{"CHF": {"max": 1250, "min": 850}, "EUR": {"max": 1250, "min": 850}, "GBP": {"max": 1250, "min": 850}, "USD": {"max": 1250, "min": 850}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'standard-app';

-- Supporter Tier
UPDATE services SET 
    pricing = '{"CHF": {"yearly": 88, "monthly": 8, "family_yearly": 77, "family_monthly": 7}, "EUR": {"yearly": 88, "monthly": 8, "family_yearly": 77, "family_monthly": 7}, "GBP": {"yearly": 88, "monthly": 8, "family_yearly": 77, "family_monthly": 7}, "USD": {"yearly": 88, "monthly": 8, "family_yearly": 77, "family_monthly": 7}}'::jsonb, 
    updated_at = NOW() 
WHERE slug = 'supporter-tier';

-- ============================================================================
-- VERIFICATION: Run this after executing the updates above
-- ============================================================================
-- SELECT 
--     name,
--     slug,
--     pricing IS NOT NULL AND pricing != '{}'::jsonb AS has_pricing,
--     jsonb_object_keys(pricing) AS currencies,
--     has_reduced_fare
-- FROM services
-- WHERE pricing IS NOT NULL AND pricing != '{}'::jsonb
-- ORDER BY name;


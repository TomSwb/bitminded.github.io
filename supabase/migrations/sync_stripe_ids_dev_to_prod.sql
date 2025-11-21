-- Migration: Sync Stripe IDs from Dev to Prod
-- Purpose: Export Stripe product and price IDs from dev database and create UPDATE statements for prod
-- Usage: 
--   1. Run the SELECT query on DEV database to get the Stripe IDs
--   2. Copy the results and use them to update PROD database
--   3. Or use the UPDATE statements generated below (after verifying service names match)
-- Created: 2025-11-21

-- ============================================================================
-- STEP 1: EXPORT FROM DEV DATABASE
-- ============================================================================
-- Run this query on your DEV database to get all services with Stripe IDs
-- Copy the results for use in STEP 2

SELECT 
    name,
    slug,
    stripe_product_id,
    stripe_price_id,
    stripe_price_reduced_id,
    stripe_price_monthly_id,
    stripe_price_yearly_id,
    stripe_price_sale_id,
    stripe_price_monthly_sale_id,
    stripe_price_yearly_sale_id
FROM services
WHERE stripe_product_id IS NOT NULL
ORDER BY name;

-- ============================================================================
-- STEP 2: UPDATE PROD DATABASE
-- ============================================================================
-- Use the results from STEP 1 to create UPDATE statements
-- Replace the values below with actual data from your dev database
-- IMPORTANT: Verify service names/slugs match between dev and prod before running

-- Example UPDATE statements (replace with your actual data):
-- UPDATE services 
-- SET 
--     stripe_product_id = 'prod_XXXXX',
--     stripe_price_id = 'price_XXXXX',
--     stripe_price_reduced_id = 'price_XXXXX',
--     stripe_price_monthly_id = 'price_XXXXX',
--     stripe_price_yearly_id = 'price_XXXXX',
--     stripe_price_sale_id = 'price_XXXXX',
--     stripe_price_monthly_sale_id = 'price_XXXXX',
--     stripe_price_yearly_sale_id = 'price_XXXXX'
-- WHERE slug = 'service-slug-here';

-- ============================================================================
-- STEP 3: GENERATE UPDATE STATEMENTS AUTOMATICALLY (RECOMMENDED)
-- ============================================================================
-- Run this query on DEV to generate UPDATE statements ready for PROD
-- Copy the output and run on PROD database
-- This generates clean UPDATE statements with proper NULL handling
-- Note: Trailing comma before updated_at is handled automatically

SELECT 
    'UPDATE services SET ' ||
    TRIM(BOTH ', ' FROM (
        COALESCE(CASE WHEN stripe_product_id IS NOT NULL THEN 'stripe_product_id = ''' || stripe_product_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_id IS NOT NULL THEN 'stripe_price_id = ''' || stripe_price_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_reduced_id IS NOT NULL THEN 'stripe_price_reduced_id = ''' || stripe_price_reduced_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_monthly_id IS NOT NULL THEN 'stripe_price_monthly_id = ''' || stripe_price_monthly_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_yearly_id IS NOT NULL THEN 'stripe_price_yearly_id = ''' || stripe_price_yearly_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_sale_id IS NOT NULL THEN 'stripe_price_sale_id = ''' || stripe_price_sale_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_monthly_sale_id IS NOT NULL THEN 'stripe_price_monthly_sale_id = ''' || stripe_price_monthly_sale_id || ''', ' ELSE '' END, '') ||
        COALESCE(CASE WHEN stripe_price_yearly_sale_id IS NOT NULL THEN 'stripe_price_yearly_sale_id = ''' || stripe_price_yearly_sale_id || ''', ' ELSE '' END, '')
    )) ||
    ', updated_at = NOW() ' ||
    'WHERE slug = ''' || slug || ''';' AS update_statement
FROM services
WHERE stripe_product_id IS NOT NULL
ORDER BY name;

-- Alternative: Generate UPDATE by name (if slugs differ between dev/prod)
-- SELECT 
--     'UPDATE services SET ' ||
--     COALESCE('stripe_product_id = ''' || stripe_product_id || ''', ', '') ||
--     COALESCE('stripe_price_id = ''' || stripe_price_id || ''', ', '') ||
--     COALESCE('stripe_price_reduced_id = ''' || stripe_price_reduced_id || ''', ', '') ||
--     COALESCE('stripe_price_monthly_id = ''' || stripe_price_monthly_id || ''', ', '') ||
--     COALESCE('stripe_price_yearly_id = ''' || stripe_price_yearly_id || ''', ', '') ||
--     COALESCE('stripe_price_sale_id = ''' || stripe_price_sale_id || ''', ', '') ||
--     COALESCE('stripe_price_monthly_sale_id = ''' || stripe_price_monthly_sale_id || ''', ', '') ||
--     COALESCE('stripe_price_yearly_sale_id = ''' || stripe_price_yearly_sale_id || ''', ', '') ||
--     'updated_at = NOW() ' ||
--     'WHERE name = ''' || REPLACE(name, '''', '''''') || ''';' AS update_statement
-- FROM services
-- WHERE stripe_product_id IS NOT NULL
-- ORDER BY name;

-- ============================================================================
-- STEP 4: VERIFICATION QUERY (Run on PROD after updates)
-- ============================================================================
-- Verify that all Stripe IDs were synced correctly

SELECT 
    name,
    slug,
    stripe_product_id IS NOT NULL AS has_product_id,
    stripe_price_id IS NOT NULL AS has_price_id,
    stripe_price_reduced_id IS NOT NULL AS has_reduced_price_id,
    stripe_price_monthly_id IS NOT NULL AS has_monthly_price_id,
    stripe_price_yearly_id IS NOT NULL AS has_yearly_price_id,
    stripe_price_sale_id IS NOT NULL AS has_sale_price_id,
    stripe_price_monthly_sale_id IS NOT NULL AS has_monthly_sale_price_id,
    stripe_price_yearly_sale_id IS NOT NULL AS has_yearly_sale_price_id
FROM services
WHERE stripe_product_id IS NOT NULL
ORDER BY name;


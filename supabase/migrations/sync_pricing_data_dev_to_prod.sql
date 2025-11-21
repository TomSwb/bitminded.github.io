-- Migration: Sync Pricing Data from Dev to Prod
-- Purpose: Export pricing JSONB data from dev database and create UPDATE statements for prod
-- Usage: 
--   1. Run the SELECT query on DEV database to get the pricing data
--   2. Copy the results and use them to update PROD database
-- Created: 2025-11-21

-- ============================================================================
-- STEP 1: EXPORT FROM DEV DATABASE
-- ============================================================================
-- Run this query on your DEV database to get all services with pricing data
-- Copy the results for use in STEP 2

SELECT 
    name,
    slug,
    pricing,
    has_reduced_fare
FROM services
WHERE pricing IS NOT NULL AND pricing != '{}'::jsonb
ORDER BY name;

-- ============================================================================
-- STEP 2: GENERATE UPDATE STATEMENTS AUTOMATICALLY (RECOMMENDED)
-- ============================================================================
-- Run this query on DEV to generate UPDATE statements ready for PROD
-- Copy the output and run on PROD database
-- Note: This will properly escape JSON strings for SQL

SELECT 
    'UPDATE services SET pricing = ''' || 
    REPLACE(pricing::text, '''', '''''') || 
    '''::jsonb, updated_at = NOW() WHERE slug = ''' || slug || ''';' AS update_statement
FROM services
WHERE pricing IS NOT NULL AND pricing != '{}'::jsonb
ORDER BY name;

-- ============================================================================
-- STEP 3: VERIFICATION QUERY (Run on PROD after updates)
-- ============================================================================
-- Verify that all pricing data was synced correctly

SELECT 
    name,
    slug,
    pricing IS NOT NULL AND pricing != '{}'::jsonb AS has_pricing,
    jsonb_object_keys(pricing) AS currencies,
    has_reduced_fare
FROM services
WHERE pricing IS NOT NULL AND pricing != '{}'::jsonb
ORDER BY name;


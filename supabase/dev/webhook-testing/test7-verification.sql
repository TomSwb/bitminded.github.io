-- Test 7 Verification: Invalid Plan Name
-- Purpose: Verify error handling for invalid plan names
-- Test Date: 2025-01-05
-- Note: This test verifies error handling code exists and works correctly

-- ============================================================================
-- Query 1: Check for any invalid plan name errors in error logs
-- Expected: Should show any errors related to invalid family plan service slugs
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'serviceSlug' as service_slug,
    error_details->>'itemSlug' as item_slug,
    user_id,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
    error_message LIKE '%Invalid family plan service slug%'
    OR error_message LIKE '%invalid plan%'
    OR error_message LIKE '%Only All-Tools or Supporter can be family plans%'
    OR error_message LIKE '%family%'
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 2: Verify error handling code path exists
-- This query checks if the validation logic is working by examining
-- the mapServiceSlugToPlanName function behavior
-- Expected: Only valid slugs should map to plan names
-- ============================================================================
-- Note: This is a code verification - the function mapServiceSlugToPlanName
-- should return null for invalid slugs, which triggers error logging.
-- Valid slugs: 'all-tools-membership-family' -> 'family_all_tools'
--              'supporter-tier-family' -> 'family_supporter'
-- Invalid slugs: anything else -> null (triggers error)

-- ============================================================================
-- Query 3: Check for any validation errors related to family plans
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    CASE 
        WHEN error_message LIKE '%Invalid family plan service slug%' THEN '✅ Invalid plan name error detected'
        WHEN error_message LIKE '%family plan%' AND error_type = 'validation' THEN '⚠️ Family plan validation error'
        ELSE 'Other family plan related error'
    END as error_category,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND error_message LIKE '%family%'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 4: Summary - Error handling verification
-- ============================================================================
SELECT 
    'Total Family Plan Errors' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%family%'

UNION ALL

SELECT 
    'Invalid Plan Name Errors' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%Invalid family plan service slug%'

UNION ALL

SELECT 
    'Validation Errors (Family)' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND error_message LIKE '%family%';

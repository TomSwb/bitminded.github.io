-- Test 8 Verification: Missing Service in Database
-- Purpose: Verify error handling when Stripe product doesn't exist in database
-- Test Date: 2025-01-05
-- Note: This test verifies error handling code exists and works correctly

-- ============================================================================
-- Query 1: Check for any "Product or service not found" errors in error logs
-- Expected: Should show any errors related to missing products/services
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'stripeProductId' as stripe_product_id,
    error_details->>'stripePriceId' as stripe_price_id,
    error_details->>'sessionId' as session_id,
    error_details->>'message' as error_message_detail,
    user_id,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
    error_message LIKE '%Product or service not found%'
    OR error_message LIKE '%Product/service not found%'
    OR (error_message LIKE '%not found%' AND error_message LIKE '%product%' AND error_message NOT LIKE '%User not found%')
    OR (error_message LIKE '%not found%' AND error_message LIKE '%service%' AND error_message NOT LIKE '%User not found%')
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 2: Check for validation errors related to missing products/services
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    CASE 
        WHEN error_message LIKE '%Product or service not found%' THEN '✅ Missing product/service error detected'
        WHEN error_message LIKE '%not found in database%' THEN '⚠️ Product/service not found error'
        ELSE 'Other validation error'
    END as error_category,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND (
    error_message LIKE '%Product or service not found%'
    OR error_message LIKE '%Product/service not found%'
    OR (error_message LIKE '%not found%' AND error_message LIKE '%product%' AND error_message NOT LIKE '%User not found%')
    OR (error_message LIKE '%not found%' AND error_message LIKE '%service%' AND error_message NOT LIKE '%User not found%')
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 3: Summary - Error handling verification
-- ============================================================================
SELECT 
    'Total Missing Product/Service Errors' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
    error_message LIKE '%Product or service not found%'
    OR error_message LIKE '%Product/service not found%'
    OR (error_message LIKE '%not found%' AND error_message LIKE '%product%' AND error_message NOT LIKE '%User not found%')
    OR (error_message LIKE '%not found%' AND error_message LIKE '%service%' AND error_message NOT LIKE '%User not found%')
)

UNION ALL

SELECT 
    'Validation Errors (Missing Product/Service)' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND (
    error_message LIKE '%Product or service not found%'
    OR error_message LIKE '%Product/service not found%'
    OR (error_message LIKE '%not found%' AND error_message LIKE '%product%' AND error_message NOT LIKE '%User not found%')
    OR (error_message LIKE '%not found%' AND error_message LIKE '%service%' AND error_message NOT LIKE '%User not found%')
);

-- ============================================================================
-- Query 4: Verify webhook response behavior
-- Note: This is verified through code review - when product/service not found,
-- the handler logs error and uses 'continue' (checkout) or 'return' (invoice),
-- ensuring webhook still returns 200 OK and doesn't crash
-- ============================================================================
-- Code verification:
-- 1. handleCheckoutSessionCompleted (lines 1594-1610):
--    - Logs warning to console
--    - Logs error to error_logs table
--    - Uses 'continue' to skip item (doesn't crash)
--    - Webhook returns 200 OK
-- 2. handleInvoicePaid (lines 2500-2504):
--    - Logs warning to console
--    - Returns early (doesn't crash)
--    - Webhook returns 200 OK

-- Test 9 Verification: User Not Found
-- Purpose: Verify error handling when user doesn't exist in database
-- Test Date: 2025-01-05
-- Note: This test verifies error handling code exists and works correctly

-- ============================================================================
-- Query 1: Check for "User not found" errors in error logs
-- Expected: Should show errors related to users not found in database
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'email' as email,
    error_details->>'sessionId' as session_id,
    error_details->>'customerId' as customer_id,
    user_id,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
    error_message LIKE '%User not found%'
    OR error_message LIKE '%user not found%'
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 2: Check for validation errors related to missing users
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'email' as email,
    CASE 
        WHEN error_message LIKE '%User not found for checkout session%' THEN '✅ User not found (checkout)'
        WHEN error_message LIKE '%User not found for subscription%' THEN '⚠️ User not found (subscription)'
        WHEN error_message LIKE '%User not found for invoice%' THEN '⚠️ User not found (invoice)'
        ELSE 'Other user not found error'
    END as error_category,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND error_message LIKE '%User not found%'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Query 3: Summary - Error handling verification
-- ============================================================================
SELECT 
    'Total User Not Found Errors' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%User not found%'

UNION ALL

SELECT 
    'Validation Errors (User Not Found)' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_type = 'validation'
AND error_message LIKE '%User not found%'

UNION ALL

SELECT 
    'Checkout Session Errors (User Not Found)' as metric,
    COUNT(*)::text as value
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%User not found for checkout session%';

-- ============================================================================
-- Query 4: Verify webhook response behavior
-- Note: This is verified through code review - when user not found,
-- the handler logs error and returns early, ensuring webhook still returns 200 OK
-- ============================================================================
-- Code verification:
-- 1. handleCheckoutSessionCompleted (lines 1055-1067):
--    - Logs warning to console
--    - Logs error to error_logs table with type 'validation'
--    - Returns early (doesn't crash)
--    - Webhook returns 200 OK
-- 2. handleSubscriptionCreated (lines 1814-1817):
--    - Logs warning to console
--    - Returns early (doesn't crash)
--    - Webhook returns 200 OK
-- 3. handleInvoicePaid (lines 2391-2394):
--    - Logs warning to console
--    - Returns early (doesn't crash)
--    - Webhook returns 200 OK

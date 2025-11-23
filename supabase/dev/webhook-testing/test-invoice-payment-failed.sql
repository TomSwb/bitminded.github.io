-- ============================================================================
-- Test 3.1: Verify Invoice Payment Failure Handling
-- ============================================================================
-- After invoice.payment_failed event, check if payment_status and grace period
-- are correctly set in the purchase record

SELECT 
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    subscription_interval,
    grace_period_ends_at,
    updated_at,
    CASE 
        WHEN payment_status = 'failed' AND grace_period_ends_at IS NOT NULL THEN '✅ Payment failed, grace period set'
        WHEN payment_status = 'failed' AND grace_period_ends_at IS NULL THEN '⚠️ Payment failed but no grace period'
        WHEN payment_status = 'succeeded' THEN '✅ Payment succeeded (unexpected for this test)'
        ELSE '⚠️ Unexpected payment_status: ' || COALESCE(payment_status, 'NULL')
    END as failure_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX'
ORDER BY updated_at DESC
LIMIT 1;


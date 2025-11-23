-- ============================================================================
-- Test 2.6: Verify Subscription Cancellation
-- ============================================================================
-- After cancelling subscription in Stripe Dashboard, run this query to verify
-- that the webhook updated the purchase record correctly.

SELECT 
    id,
    stripe_subscription_id,
    status,
    subscription_interval,
    amount_paid,
    currency,
    cancelled_at,
    current_period_start,
    current_period_end,
    updated_at,
    CASE 
        WHEN status = 'cancelled' AND cancelled_at IS NOT NULL THEN '✅ Cancelled correctly'
        WHEN status = 'expired' AND cancelled_at IS NOT NULL THEN '✅ Expired correctly (subscription ended)'
        WHEN status = 'active' THEN '⚠️ Still active - may be cancelled at period end'
        ELSE '❌ Unexpected status: ' || status
    END as cancellation_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i'
ORDER BY updated_at DESC
LIMIT 1;


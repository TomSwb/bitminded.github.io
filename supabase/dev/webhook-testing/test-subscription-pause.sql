-- ============================================================================
-- Test 2.4: Verify Subscription Pause
-- ============================================================================
-- After pausing subscription in Stripe Dashboard, run this query to verify
-- that the webhook updated the purchase record correctly.

SELECT 
    id,
    stripe_subscription_id,
    status,
    subscription_interval,
    amount_paid,
    currency,
    current_period_start,
    current_period_end,
    updated_at,
    CASE 
        WHEN status = 'suspended' THEN '✅ Paused correctly'
        WHEN status = 'active' THEN '⚠️ Still active - check webhook logs'
        ELSE '❌ Unexpected status: ' || status
    END as pause_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i'
ORDER BY updated_at DESC
LIMIT 1;


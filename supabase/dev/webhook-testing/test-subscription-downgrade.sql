-- ============================================================================
-- Test 2.3 Extended: Verify Subscription Downgrade (Yearly → Monthly)
-- ============================================================================
-- After downgrading subscription from yearly to monthly, run this query
-- to verify that the webhook updated the purchase record correctly.

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
        WHEN subscription_interval = 'monthly' THEN '✅ Downgraded to monthly correctly'
        WHEN subscription_interval = 'yearly' THEN '⚠️ Still yearly - check webhook logs'
        WHEN subscription_interval IS NULL THEN '❌ Interval not set'
        ELSE '⚠️ Unexpected interval: ' || subscription_interval
    END as downgrade_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX'
ORDER BY updated_at DESC
LIMIT 1;


-- ============================================================================
-- Test 2.6 Extended: Verify Cancel at Period End
-- ============================================================================
-- After setting cancel_at_period_end=true, subscription should stay active
-- until period ends, then become cancelled

SELECT 
    id,
    stripe_subscription_id,
    status,
    subscription_interval,
    cancelled_at,
    current_period_start,
    current_period_end,
    updated_at,
    CASE 
        WHEN status = 'active' AND cancelled_at IS NULL THEN '✅ Still active (will cancel at period end)'
        WHEN status = 'cancelled' AND cancelled_at IS NOT NULL THEN '✅ Cancelled correctly'
        WHEN status = 'expired' AND cancelled_at IS NOT NULL THEN '✅ Expired correctly'
        ELSE '⚠️ Unexpected state: ' || status
    END as cancel_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX'
ORDER BY updated_at DESC
LIMIT 1;


-- Quick Check: New Subscription Purchase
-- Run this to see if subscription_interval is set correctly

SELECT 
    pp.id,
    pp.stripe_subscription_id,
    pp.subscription_interval,
    CASE 
        WHEN pp.subscription_interval IS NULL THEN '❌ NULL - Not set!'
        WHEN pp.subscription_interval = 'monthly' THEN '✅ monthly - Fixed!'
        WHEN pp.subscription_interval = 'yearly' THEN '✅ yearly - Correct!'
        ELSE '⚠️ ' || pp.subscription_interval
    END as interval_status,
    pp.current_period_start,
    pp.current_period_end,
    pp.status,
    pp.purchased_at,
    p.name as product_name
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
JOIN user_profiles up ON pp.user_id = up.id
WHERE pp.stripe_subscription_id = 'sub_1SWhZhPBAwkcNEBlk5NnNj3H'
   OR (up.email = 'dev@bitminded.ch' AND pp.purchased_at > NOW() - INTERVAL '1 hour')
ORDER BY pp.purchased_at DESC
LIMIT 1;


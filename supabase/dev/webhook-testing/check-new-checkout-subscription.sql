-- Check New Checkout Subscription Purchase
-- Run this to verify the subscription_interval fix worked

-- 1. Get the most recent purchase (should be from the new checkout)
SELECT 
    pp.id,
    pp.stripe_subscription_id,
    pp.subscription_interval,
    CASE 
        WHEN pp.subscription_interval IS NULL THEN '❌ NULL - Fix failed!'
        WHEN pp.subscription_interval = 'monthly' THEN '✅ monthly - Fix worked!'
        WHEN pp.subscription_interval = 'yearly' THEN '✅ yearly - Correct!'
        ELSE '⚠️ ' || pp.subscription_interval
    END as interval_status,
    pp.current_period_start,
    pp.current_period_end,
    pp.status,
    pp.purchase_type,
    pp.amount_paid,
    pp.currency,
    pp.purchased_at,
    p.name as product_name,
    p.stripe_product_id
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
JOIN user_profiles up ON pp.user_id = up.id
WHERE up.email = 'dev@bitminded.ch'
  AND pp.purchased_at > NOW() - INTERVAL '10 minutes'
ORDER BY pp.purchased_at DESC
LIMIT 1;

-- 2. Check all recent purchases for comparison
SELECT 
    pp.id,
    pp.stripe_subscription_id,
    pp.subscription_interval,
    CASE 
        WHEN pp.subscription_interval IS NULL THEN '❌ NULL'
        WHEN pp.subscription_interval = 'monthly' THEN '✅ monthly'
        WHEN pp.subscription_interval = 'yearly' THEN '✅ yearly'
        ELSE '⚠️ ' || pp.subscription_interval
    END as interval_status,
    pp.purchased_at,
    p.name as product_name
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
JOIN user_profiles up ON pp.user_id = up.id
WHERE up.email = 'dev@bitminded.ch'
ORDER BY pp.purchased_at DESC
LIMIT 5;


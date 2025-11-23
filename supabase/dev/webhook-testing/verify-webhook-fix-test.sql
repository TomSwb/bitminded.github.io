-- Verify the webhook fix worked
-- Run this AFTER triggering invoice.paid event

SELECT 
    pp.id,
    pp.stripe_subscription_id,
    pp.subscription_interval,
    CASE 
        WHEN pp.subscription_interval IS NULL THEN '❌ NULL - Fix did not work!'
        WHEN pp.subscription_interval = 'monthly' THEN '✅ monthly - Fix worked!'
        WHEN pp.subscription_interval = 'yearly' THEN '✅ yearly - Correct!'
        ELSE '⚠️ ' || pp.subscription_interval
    END as interval_status,
    pp.status,
    pp.updated_at,
    p.name as product_name
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
WHERE pp.stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i';


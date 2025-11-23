-- Test Subscription Interval Fix
-- Run this to check if subscription_interval was set correctly
-- Test User: dev@bitminded.ch
-- Subscription: sub_1SWhNpPBAwkcNEBl9IEJNNP8

-- 1. Check the current purchase record for subscription_interval
SELECT 
    id,
    subscription_interval,
    current_period_start,
    current_period_end,
    purchase_type,
    status,
    updated_at,
    purchased_at
FROM product_purchases
WHERE stripe_subscription_id = 'sub_1SWhNpPBAwkcNEBl9IEJNNP8';

-- 2. Check all purchases for dev@bitminded.ch
SELECT 
    pp.id,
    pp.subscription_interval,
    pp.current_period_start,
    pp.current_period_end,
    pp.purchase_type,
    pp.status,
    pp.stripe_subscription_id,
    p.name as product_name,
    p.subscription_interval as product_interval,
    pp.updated_at
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
JOIN user_profiles up ON pp.user_id = up.id
WHERE up.email = 'dev@bitminded.ch'
ORDER BY pp.purchased_at DESC
LIMIT 5;

-- 3. Check if subscription_interval should be 'monthly' for the product
SELECT 
    id,
    name,
    stripe_product_id,
    stripe_price_id,
    subscription_interval
FROM products
WHERE stripe_product_id = 'prod_TTclpgYfwltxca';  -- Monthly subscription test product


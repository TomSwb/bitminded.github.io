-- Verify Webhook Test Results
-- Run this in Supabase SQL Editor after creating subscription for dev@bitminded.ch
-- Test User: dev@bitminded.ch (d7c62fc8-7f13-403b-b87f-d59f76709ab4)

-- 1. Check if purchase was created for dev@bitminded.ch (RECENT purchases only)
SELECT 
    pp.id,
    pp.purchase_type,
    pp.amount_paid,
    pp.currency,
    pp.status,
    pp.stripe_subscription_id,
    pp.stripe_customer_id,
    pp.purchased_at,
    p.name as product_name,
    up.email as user_email,
    up.username
FROM product_purchases pp
LEFT JOIN products p ON pp.product_id = p.id
LEFT JOIN user_profiles up ON pp.user_id = up.id
WHERE pp.stripe_customer_id = 'cus_TTLy3ineN51ZEh'
   OR pp.user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
ORDER BY pp.purchased_at DESC
LIMIT 10;

-- 1b. Check for purchases created in the last hour (for the subscription you just created)
SELECT 
    pp.id,
    pp.purchase_type,
    pp.amount_paid,
    pp.currency,
    pp.status,
    pp.stripe_subscription_id,
    pp.stripe_customer_id,
    pp.purchased_at,
    p.name as product_name,
    p.stripe_product_id,
    up.email as user_email
FROM product_purchases pp
LEFT JOIN products p ON pp.product_id = p.id
LEFT JOIN user_profiles up ON pp.user_id = up.id
WHERE pp.purchased_at > NOW() - INTERVAL '1 hour'
ORDER BY pp.purchased_at DESC
LIMIT 10;

-- 2. Check recent purchases (all users)
SELECT 
    pp.id,
    pp.purchase_type,
    pp.amount_paid,
    pp.status,
    pp.stripe_subscription_id,
    up.email as user_email,
    p.name as product_name,
    pp.purchased_at
FROM product_purchases pp
LEFT JOIN user_profiles up ON pp.user_id = up.id
LEFT JOIN products p ON pp.product_id = p.id
ORDER BY pp.purchased_at DESC
LIMIT 10;

-- 3. Check for errors related to this test
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    user_id,
    request_data,
    error_details,
    created_at
FROM error_logs
WHERE (request_data::text LIKE '%cus_TTLy3ineN51ZEh%' 
   OR request_data::text LIKE '%dev@bitminded%'
   OR error_details::text LIKE '%cus_TTLy3ineN51ZEh%'
   OR user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4')
ORDER BY created_at DESC
LIMIT 10;


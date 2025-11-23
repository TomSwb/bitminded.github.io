-- ============================================================================
-- Insert Test Products for Webhook Testing
-- Status: DRAFT (won't show on catalog page)
-- Created: 2025-11-23
-- ============================================================================
-- All 3 test products are ready with Stripe product and price IDs
-- Run this SQL in Supabase SQL Editor to insert them into your database
-- All products marked as 'draft' so they won't show on catalog page

INSERT INTO products (
    name, slug, description, pricing_type, 
    price_amount, price_currency, 
    stripe_product_id, stripe_price_id, 
    stripe_price_monthly_id, stripe_price_yearly_id, 
    subscription_interval, status, is_available_for_purchase
) VALUES
-- Product 1: One-time payment
(
    '[TEST] Webhook Test - One Time', 
    'test-webhook-one-time-' || substr(md5(random()::text), 1, 8), 
    'Test product for webhook testing - one-time payment', 
    'one_time', 
    29.99, 'CHF', 
    'prod_TTcl8wqZuj8Nrp',
    'price_1SWfVqPBAwkcNEBlriF0Odnw',
    NULL, NULL, NULL, 
    'draft', 
    true
),
-- Product 2: Monthly subscription
(
    '[TEST] Webhook Test - Subscription Monthly', 
    'test-webhook-sub-monthly-' || substr(md5(random()::text), 1, 8), 
    'Test product for webhook testing - monthly subscription', 
    'subscription', 
    9.99, 'CHF', 
    'prod_TTclpgYfwltxca',
    'price_1SWfZZPBAwkcNEBlTgFIyktt',
    'price_1SWfZZPBAwkcNEBlTgFIyktt',  -- Monthly price (same as stripe_price_id)
    NULL, 'monthly', 
    'draft', 
    true
),
-- Product 3: Yearly subscription
(
    '[TEST] Webhook Test - Subscription Yearly', 
    'test-webhook-sub-yearly-' || substr(md5(random()::text), 1, 8), 
    'Test product for webhook testing - yearly subscription', 
    'subscription', 
    99.99, 'CHF', 
    'prod_TTclBX3ESPRVuq',
    'price_1SWfZcPBAwkcNEBlVS3c5yOQ',
    NULL, 
    'price_1SWfZcPBAwkcNEBlVS3c5yOQ',  -- Yearly price (same as stripe_price_id)
    'yearly', 
    'draft', 
    true
)
ON CONFLICT (slug) DO NOTHING;

-- Verify products were created
SELECT 
    id, 
    name, 
    stripe_product_id, 
    stripe_price_id, 
    status,
    pricing_type,
    created_at
FROM products 
WHERE name LIKE '[TEST]%' 
ORDER BY created_at DESC;


-- Check existing purchase that's causing duplicate key error
-- Subscription: sub_1SWhtYPBAwkcNEBlnn4W4M9i (new one from checkout)
-- Old subscription: sub_1SWhNpPBAwkcNEBl9IEJNNP8

-- Check for existing purchase for this user and product
SELECT 
    pp.id,
    pp.stripe_subscription_id,
    pp.subscription_interval,
    pp.status,
    pp.purchased_at,
    pp.updated_at,
    p.name as product_name,
    p.stripe_product_id,
    up.email as user_email
FROM product_purchases pp
JOIN products p ON pp.product_id = p.id
JOIN user_profiles up ON pp.user_id = up.id
WHERE up.email = 'dev@bitminded.ch'
  AND p.stripe_product_id = 'prod_TTclpgYfwltxca'  -- Monthly subscription test product
  AND pp.status = 'active'
ORDER BY pp.purchased_at DESC;


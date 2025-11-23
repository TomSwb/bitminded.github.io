-- Verify invoice.payment_failed event processing
-- This query checks for purchases with failed payment status and grace period

-- Check for purchases with payment_status = 'failed'
SELECT 
    id,
    user_id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    grace_period_ends_at,
    updated_at,
    CASE 
        WHEN grace_period_ends_at IS NOT NULL AND grace_period_ends_at > NOW() THEN 'In Grace Period'
        WHEN grace_period_ends_at IS NOT NULL AND grace_period_ends_at <= NOW() THEN 'Grace Period Expired'
        ELSE 'No Grace Period'
    END as grace_period_status
FROM product_purchases
WHERE payment_status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;

-- Check the most recent purchase update
SELECT 
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    grace_period_ends_at,
    updated_at
FROM product_purchases
WHERE stripe_subscription_id = 'sub_1SWkfYPBAwkcNEBlUoLx9mjB'
ORDER BY updated_at DESC
LIMIT 1;


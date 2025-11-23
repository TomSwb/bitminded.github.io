-- ============================================================================
-- Check if Purchase Record Exists for Subscription
-- ============================================================================
-- Use this to verify if a purchase record was created for a subscription

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
        WHEN id IS NOT NULL THEN '✅ Purchase record exists'
        ELSE '❌ No purchase record found'
    END as record_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX';


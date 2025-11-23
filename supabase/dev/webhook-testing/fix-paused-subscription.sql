-- ============================================================================
-- Fix Paused Subscription Status (Manual Update)
-- ============================================================================
-- This manually updates the purchase status to 'suspended' for a paused subscription
-- After running this, the webhook will handle future pause/resume events correctly

UPDATE product_purchases 
SET 
    status = 'suspended',
    updated_at = NOW()
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i';

-- Verify the update
SELECT 
    id,
    stripe_subscription_id,
    status,
    subscription_interval,
    updated_at,
    CASE 
        WHEN status = 'suspended' THEN '✅ Correctly set to suspended'
        ELSE '⚠️ Status: ' || status
    END as status_check
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i';


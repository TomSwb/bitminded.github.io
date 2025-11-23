-- Test the webhook fix by resetting subscription_interval to NULL
-- Then trigger invoice.paid event to see if webhook sets it correctly

-- Step 1: Reset subscription_interval to NULL for testing
UPDATE product_purchases
SET subscription_interval = NULL
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i';

-- Step 2: Verify it's NULL
SELECT 
    id,
    stripe_subscription_id,
    subscription_interval,
    updated_at
FROM product_purchases
WHERE stripe_subscription_id = 'sub_1SWhtYPBAwkcNEBlnn4W4M9i';


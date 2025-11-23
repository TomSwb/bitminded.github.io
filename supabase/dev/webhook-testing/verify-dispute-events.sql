-- Verify dispute event processing
-- Check error_logs for dispute events

-- Check for dispute.created events
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    request_data->>'event' as event_type,
    request_data->'dispute'->>'id' as dispute_id,
    request_data->'dispute'->>'charge' as charge_id,
    created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND error_type = 'stripe_api'
  AND (
    request_data->>'event' LIKE '%dispute%'
    OR error_message LIKE '%dispute%'
  )
ORDER BY created_at DESC
LIMIT 10;

-- Check if any purchases were affected (if dispute handlers suspend access)
SELECT 
    id,
    user_id,
    stripe_payment_intent_id,
    stripe_subscription_id,
    status,
    payment_status,
    updated_at
FROM product_purchases
WHERE status = 'suspended'
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 5;


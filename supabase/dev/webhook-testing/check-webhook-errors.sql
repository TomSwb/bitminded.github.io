-- Check Webhook Errors for Recent Checkout Sessions

-- 1. Check error logs for checkout.session.completed errors (last hour)
SELECT 
    id,
    error_type,
    error_message,
    user_id,
    created_at,
    error_details->>'sessionId' as session_id,
    error_details->>'stripeProductId' as stripe_product_id,
    error_details->>'message' as detailed_error,
    error_details,
    request_data->>'event' as event_type,
    request_data->'session'->>'id' as checkout_session_id
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND (
    error_type IS NOT NULL OR
    error_message ILIKE '%checkout%' OR
    error_message ILIKE '%line items%' OR
    error_message ILIKE '%No such checkout%' OR
    request_data->>'event' = 'checkout.session.completed'
  )
ORDER BY created_at DESC;

-- 2. All error logs from last hour
SELECT 
    id,
    error_type,
    error_message,
    created_at,
    error_details,
    request_data->>'event' as event_type
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;


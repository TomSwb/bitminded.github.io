-- Verify Service Purchase After Payment
-- Run this after completing a payment for a service (e.g., Confidence Session)

-- 1. Check for recent service purchases (last hour)
SELECT 
    sp.id,
    sp.user_id,
    up.email,
    up.username,
    s.name as service_name,
    s.slug as service_slug,
    sp.purchase_type,
    sp.amount_paid,
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.stripe_subscription_id,
    sp.stripe_invoice_id,
    sp.user_type,
    sp.purchased_at,
    sp.expires_at,
    sp.cancelled_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.purchased_at > NOW() - INTERVAL '1 hour'
ORDER BY sp.purchased_at DESC;

-- 2. Check webhook error logs for service-related errors (last hour)
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    user_id,
    created_at,
    error_details->>'sessionId' as session_id,
    error_details->>'stripeProductId' as stripe_product_id,
    error_details->>'serviceId' as service_id,
    request_data->>'event' as event_type
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND (
    error_details::text ILIKE '%service%' 
    OR request_data->>'event' IN ('checkout.session.completed', 'invoice.paid', 'payment_intent.succeeded')
  )
ORDER BY created_at DESC;

-- 3. Find the specific purchase for Confidence Session (if exists)
SELECT 
    sp.*,
    s.name as service_name,
    s.stripe_product_id,
    s.stripe_price_id,
    up.email,
    up.username
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE s.name ILIKE '%confidence%'
   OR s.slug = 'confidence-session'
   OR s.stripe_product_id = 'prod_TTJvEPBEa1zD0T'
ORDER BY sp.purchased_at DESC
LIMIT 10;

-- 4. Check if webhook processed the checkout session (if you have the session ID)
-- Replace 'cs_test_xxxxx' with your actual checkout session ID
/*
SELECT 
    request_data->>'event' as event_type,
    request_data->'session'->>'id' as session_id,
    request_data->'session'->>'payment_status' as payment_status,
    request_data->'session'->>'mode' as mode,
    created_at,
    error_type,
    error_message
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND request_data->'session'->>'id' = 'cs_test_xxxxx'
ORDER BY created_at DESC;
*/

-- 5. Summary: Count of service purchases by status (last 24 hours)
SELECT 
    status,
    payment_status,
    purchase_type,
    COUNT(*) as count,
    SUM(amount_paid) as total_amount,
    STRING_AGG(DISTINCT currency, ', ') as currencies
FROM service_purchases
WHERE purchased_at > NOW() - INTERVAL '24 hours'
GROUP BY status, payment_status, purchase_type
ORDER BY count DESC;

-- 6. Check all service purchases for your test user (dev@bitminded.ch)
SELECT 
    sp.id,
    sp.service_id,
    s.name as service_name,
    sp.purchase_type,
    sp.amount_paid,
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.stripe_subscription_id,
    sp.purchased_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
JOIN user_profiles up ON sp.user_id = up.id
WHERE up.email = 'dev@bitminded.ch'
ORDER BY sp.purchased_at DESC;


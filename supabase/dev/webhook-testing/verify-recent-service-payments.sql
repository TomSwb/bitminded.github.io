-- Verify Recent Service Payments (Last Hour)
-- Run this after completing payment link purchases

-- 1. All recent service purchases (last hour) - MAIN QUERY
SELECT 
    sp.id as purchase_id,
    sp.user_id,
    up.email,
    up.username,
    s.name as service_name,
    s.slug as service_slug,
    sp.purchase_type,
    sp.amount_paid / 100.0 as amount_paid_decimal,
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.stripe_subscription_id,
    sp.stripe_invoice_id,
    sp.stripe_customer_id,
    sp.user_type,
    sp.purchased_at,
    sp.expires_at,
    sp.created_at,
    sp.updated_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.purchased_at > NOW() - INTERVAL '1 hour'
ORDER BY sp.purchased_at DESC;

-- 2. Detailed view with Stripe payment intent details
SELECT 
    sp.id,
    s.name as service,
    up.email,
    sp.amount_paid / 100.0 as amount,
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.purchased_at,
    CASE 
        WHEN sp.stripe_payment_intent_id IS NOT NULL THEN 'Payment Intent (one-time)'
        WHEN sp.stripe_subscription_id IS NOT NULL THEN 'Subscription'
        ELSE 'Unknown'
    END as payment_method
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.purchased_at > NOW() - INTERVAL '1 hour'
ORDER BY sp.purchased_at DESC;

-- 3. Count purchases by payment status and method
SELECT 
    payment_status,
    purchase_type,
    COUNT(*) as count,
    SUM(amount_paid) / 100.0 as total_amount,
    STRING_AGG(DISTINCT currency, ', ') as currencies
FROM service_purchases
WHERE purchased_at > NOW() - INTERVAL '1 hour'
GROUP BY payment_status, purchase_type
ORDER BY count DESC;

-- 4. Check webhook processing logs (for these payments)
SELECT 
    id,
    error_type,
    error_message,
    created_at,
    request_data->>'event' as event_type,
    request_data->'session'->>'id' as checkout_session_id,
    request_data->'payment_intent'->>'id' as payment_intent_id,
    error_details
FROM error_logs
WHERE function_name = 'stripe-webhook'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND (
    error_type IS NOT NULL OR
    request_data->>'event' IN (
        'checkout.session.completed',
        'payment_intent.succeeded',
        'invoice.paid',
        'charge.succeeded'
    )
  )
ORDER BY created_at DESC;

-- 5. All service purchases for Confidence Session
SELECT 
    sp.id,
    sp.user_id,
    up.email,
    s.name as service_name,
    sp.purchase_type,
    sp.amount_paid / 100.0 as amount_paid_decimal,
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.stripe_subscription_id,
    sp.purchased_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE s.stripe_product_id = 'prod_TTJvEPBEa1zD0T'
   OR s.slug = 'confidence-session'
   OR s.name ILIKE '%confidence%'
ORDER BY sp.purchased_at DESC
LIMIT 20;


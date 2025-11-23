-- Verify Payment Link Purchase (Latest)
-- Run this after completing a payment link purchase

-- 1. Check the most recent service purchase (MAIN QUERY)
SELECT 
    sp.id as purchase_id,
    sp.user_id,
    up.email,
    up.username,
    s.name as service_name,
    s.slug as service_slug,
    s.stripe_product_id,
    s.stripe_price_id,
    sp.purchase_type,
    sp.amount_paid, -- Already in base currency (CHF), not cents
    sp.currency,
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.stripe_subscription_id,
    sp.stripe_invoice_id,
    sp.stripe_customer_id,
    sp.user_type,
    sp.purchased_at,
    sp.created_at,
    sp.updated_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.purchased_at > NOW() - INTERVAL '30 minutes'
ORDER BY sp.purchased_at DESC
LIMIT 10;

-- 2. Check specific purchase ID from logs (if you saw one in logs)
-- Replace '404b4f26-cf54-4ba7-b85b-11d7cdf9dde9' with actual ID from logs
/*
SELECT 
    sp.*,
    s.name as service_name,
    s.stripe_product_id,
    s.stripe_price_id,
    up.email
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.id = '404b4f26-cf54-4ba7-b85b-11d7cdf9dde9';
*/

-- 3. All Confidence Session purchases
SELECT 
    sp.id,
    s.name as service_name,
    up.email,
    sp.amount_paid, -- Already in base currency (CHF), not cents
    sp.status,
    sp.payment_status,
    sp.stripe_payment_intent_id,
    sp.purchased_at
FROM service_purchases sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN user_profiles up ON sp.user_id = up.id
WHERE s.name = 'Confidence Session'
   OR s.slug = 'confidence-session'
ORDER BY sp.purchased_at DESC
LIMIT 10;

-- 4. Summary: Count of recent purchases
SELECT 
    COUNT(*) as total_purchases,
    SUM(amount_paid) as total_amount, -- Already in base currency
    STRING_AGG(DISTINCT currency, ', ') as currencies,
    STRING_AGG(DISTINCT status, ', ') as statuses
FROM service_purchases
WHERE purchased_at > NOW() - INTERVAL '30 minutes';


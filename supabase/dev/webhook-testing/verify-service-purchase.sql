-- Verify service purchase was created in service_purchases table
-- After completing a checkout for a service, run this to verify

-- Check recent service purchases
SELECT 
    id,
    user_id,
    service_id,
    stripe_payment_intent_id,
    stripe_subscription_id,
    stripe_invoice_id,
    purchase_type,
    amount_paid,
    currency,
    status,
    payment_status,
    purchased_at,
    updated_at
FROM service_purchases
ORDER BY purchased_at DESC
LIMIT 5;

-- Check if service was found by Stripe product ID
SELECT 
    s.id as service_id,
    s.name,
    s.slug,
    s.stripe_product_id,
    s.stripe_price_id,
    sp.id as purchase_id,
    sp.user_id,
    sp.status,
    sp.payment_status
FROM services s
LEFT JOIN service_purchases sp ON s.id = sp.service_id
WHERE s.stripe_product_id = 'prod_TTJvEPBEa1zD0T'
ORDER BY sp.purchased_at DESC
LIMIT 1;


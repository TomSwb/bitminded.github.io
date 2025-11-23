-- Check if any service purchases exist
SELECT 
    COUNT(*) as total_service_purchases,
    COUNT(DISTINCT service_id) as unique_services,
    COUNT(DISTINCT user_id) as unique_users
FROM service_purchases;

-- Show recent service purchases if any
SELECT 
    sp.id,
    sp.user_id,
    s.name as service_name,
    s.service_category,
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
ORDER BY sp.purchased_at DESC
LIMIT 10;


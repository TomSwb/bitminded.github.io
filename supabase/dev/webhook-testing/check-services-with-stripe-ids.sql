-- Check which services have Stripe IDs configured
SELECT 
    id,
    name,
    slug,
    service_category,
    stripe_product_id,
    stripe_price_id,
    status
FROM services
WHERE stripe_product_id IS NOT NULL
  AND status = 'available'
ORDER BY service_category, name;


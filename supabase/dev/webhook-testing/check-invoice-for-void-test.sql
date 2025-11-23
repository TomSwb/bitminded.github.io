-- ============================================================================
-- Check if invoice can be found via subscription_id
-- ============================================================================
-- The handler tries to find purchase by:
-- 1. invoice.subscription (subscription_id)
-- 2. invoice.id (invoice_id)

-- Check what subscription the voided invoice belongs to
-- (This would need to be checked in Stripe Dashboard or via Stripe API)

-- For now, let's check if any of our existing subscriptions match
-- The handler should find purchases by subscription_id even if invoice_id doesn't match yet

SELECT 
    'Existing Purchase Records' as check_type,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    updated_at
FROM product_purchases
WHERE stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Note: When you void an invoice, check Stripe Dashboard to see which subscription it belongs to
-- The handler will find the purchase by subscription_id and update the stripe_invoice_id


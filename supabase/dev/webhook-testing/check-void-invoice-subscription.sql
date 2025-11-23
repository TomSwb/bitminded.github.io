-- ============================================================================
-- Debug: Check why voided invoice didn't update purchase
-- ============================================================================
-- The handler searches by:
-- 1. subscription_id (from invoice.subscription)
-- 2. invoice_id (from invoice.id)

-- Check if we can find which subscription the voided invoice belongs to
-- Invoice ID: in_1SWkXYPBAwkcNEBlUoiyk6ga

-- Option 1: Check all recent purchases to see if any match
SELECT 
    'All Recent Purchases' as check_type,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    updated_at
FROM product_purchases
WHERE stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- The handler will try to find purchase by subscription_id first
-- If invoice.subscription matches any of the stripe_subscription_id above,
-- it should have updated that purchase record

-- Note: To verify, we need to check Stripe Dashboard to see which subscription
-- the voided invoice (in_1SWkXYPBAwkcNEBlUoiyk6ga) belongs to


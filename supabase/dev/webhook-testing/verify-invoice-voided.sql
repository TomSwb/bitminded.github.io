-- ============================================================================
-- Verify Invoice Voided Test
-- ============================================================================
-- Check if the voided invoice updated the purchase record correctly
-- Latest test invoice ID: in_1SWkXYPBAwkcNEBlUoiyk6ga (open invoice)

-- Check if any purchase has this invoice ID
SELECT 
    'Invoice Voided Verification' as test,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    current_period_start,
    current_period_end,
    updated_at,
    CASE 
        WHEN stripe_invoice_id = 'in_1SWkXYPBAwkcNEBlUoiyk6ga' THEN '✅ Found the voided invoice! Handler updated correctly'
        WHEN stripe_invoice_id IS NOT NULL AND updated_at > NOW() - INTERVAL '2 minutes' THEN '⚠️ Recent update but different invoice ID'
        ELSE 'ℹ️ Check if invoice ID matches'
    END as verification_status
FROM product_purchases
WHERE stripe_invoice_id = 'in_1SWkXYPBAwkcNEBlUoiyk6ga'
   OR (stripe_invoice_id IS NOT NULL AND updated_at > NOW() - INTERVAL '2 minutes')
ORDER BY updated_at DESC
LIMIT 5;

-- Check BEFORE void (to see current state)
-- Run this first to see what invoice the purchase currently has:
SELECT 
    'Current Invoice State (Before Void)' as check_type,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    updated_at
FROM product_purchases
WHERE stripe_invoice_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 3;


-- ============================================================================
-- Verify Invoice Marked Uncollectible Test
-- ============================================================================
-- Invoice ID: in_1SWjSxPBAwkcNEBlsozQwhxV
-- Expected: payment_status = 'failed', status = 'suspended'

-- Check if purchase was updated
SELECT 
    'Invoice Marked Uncollectible Verification' as test,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    updated_at,
    NOW() - updated_at as time_since_update,
    CASE 
        WHEN stripe_invoice_id = 'in_1SWjSxPBAwkcNEBlsozQwhxV' AND payment_status = 'failed' AND status = 'suspended' THEN '✅ Perfect! Correctly marked as uncollectible'
        WHEN stripe_invoice_id = 'in_1SWjSxPBAwkcNEBlsozQwhxV' AND payment_status = 'failed' THEN '⚠️ Payment failed but status is ' || status || ' (should be suspended)'
        WHEN stripe_invoice_id = 'in_1SWjSxPBAwkcNEBlsozQwhxV' THEN '⚠️ Invoice ID found but payment_status is ' || payment_status || ' (should be failed)'
        WHEN payment_status = 'failed' AND status = 'suspended' AND updated_at > NOW() - INTERVAL '5 minutes' THEN '✅ Found uncollectible (different invoice)'
        WHEN updated_at > NOW() - INTERVAL '5 minutes' THEN '⚠️ Recently updated - check if this is the right invoice'
        ELSE '❌ Invoice ID not found or not updated'
    END as verification_status
FROM product_purchases
WHERE stripe_invoice_id = 'in_1SWjSxPBAwkcNEBlsozQwhxV'
   OR (payment_status = 'failed' AND status = 'suspended' AND updated_at > NOW() - INTERVAL '5 minutes')
ORDER BY updated_at DESC
LIMIT 5;


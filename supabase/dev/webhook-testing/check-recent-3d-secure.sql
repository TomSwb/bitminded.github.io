-- ============================================================================
-- Check for recent 3D Secure subscription creation
-- ============================================================================
-- Check the most recent purchases to see if the 3D Secure subscription was created

SELECT 
    'Recent Purchases (Last Hour)' as check_type,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    purchased_at,
    updated_at,
    CASE 
        WHEN payment_status = 'pending' THEN '✅ Found pending payment!'
        WHEN status = 'pending' THEN '✅ Found pending status!'
        WHEN payment_status = 'succeeded' AND updated_at > NOW() - INTERVAL '1 hour' THEN '⚠️ Succeeded quickly - 3D Secure may have completed before pending was set'
        ELSE 'ℹ️ ' || payment_status
    END as verification_status
FROM product_purchases
WHERE updated_at > NOW() - INTERVAL '1 hour'
   OR purchased_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 5;

-- Check webhook logs for payment_action_required event
-- (This would need to be checked in Supabase Dashboard → Edge Functions → Logs)


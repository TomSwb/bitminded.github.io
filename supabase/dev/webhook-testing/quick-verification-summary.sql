-- ============================================================================
-- QUICK VERIFICATION SUMMARY
-- Run this first to see what needs attention
-- ============================================================================

-- 1. Overall Status Check
SELECT 
    'OVERALL STATUS' as section,
    COUNT(*) as total_purchases,
    COUNT(DISTINCT stripe_subscription_id) as subscriptions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
    COUNT(CASE WHEN status IN ('cancelled', 'expired') THEN 1 END) as cancelled,
    COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as payment_failed,
    COUNT(CASE WHEN payment_status = 'refunded' THEN 1 END) as refunded,
    COUNT(CASE WHEN subscription_interval IS NULL AND purchase_type = 'subscription' THEN 1 END) as missing_intervals,
    COUNT(CASE WHEN cancelled_at IS NOT NULL THEN 1 END) as has_cancelled_at
FROM product_purchases;

-- 2. Recent Activity (Last 24 hours)
SELECT 
    'RECENT ACTIVITY (24h)' as section,
    COUNT(*) as recent_updates,
    COUNT(DISTINCT stripe_subscription_id) as subscriptions_updated,
    MIN(updated_at) as oldest_update,
    MAX(updated_at) as newest_update,
    COUNT(DISTINCT status) as different_statuses,
    COUNT(DISTINCT payment_status) as different_payment_statuses
FROM product_purchases
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- 3. Potential Issues to Investigate
SELECT 
    'POTENTIAL ISSUES' as section,
    'Missing subscription_interval' as issue_type,
    COUNT(*) as count
FROM product_purchases
WHERE purchase_type = 'subscription' 
  AND subscription_interval IS NULL
  AND stripe_subscription_id IS NOT NULL

UNION ALL

SELECT 
    'POTENTIAL ISSUES',
    'Failed payments without grace_period',
    COUNT(*)
FROM product_purchases
WHERE payment_status = 'failed' 
  AND grace_period_ends_at IS NULL

UNION ALL

SELECT 
    'POTENTIAL ISSUES',
    'Suspended without recent update',
    COUNT(*)
FROM product_purchases
WHERE status = 'suspended'
  AND updated_at < NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'POTENTIAL ISSUES',
    'Cancelled without cancelled_at timestamp',
    COUNT(*)
FROM product_purchases
WHERE status IN ('cancelled', 'expired')
  AND cancelled_at IS NULL;

-- 4. Sample Records by Status (to verify specific tests)
-- Suspended Subscriptions
SELECT 
    'SAMPLE: Suspended' as section,
    id::text as record_id,
    stripe_subscription_id,
    status,
    payment_status,
    updated_at::text as updated_at
FROM product_purchases
WHERE status = 'suspended'
ORDER BY updated_at DESC
LIMIT 3;

-- Cancelled Subscriptions (including the one missing cancelled_at)
SELECT 
    'SAMPLE: Cancelled' as section,
    id::text as record_id,
    stripe_subscription_id,
    status,
    payment_status,
    cancelled_at::text as cancelled_at,
    updated_at::text as updated_at,
    CASE 
        WHEN cancelled_at IS NULL THEN '⚠️ Missing cancelled_at timestamp'
        ELSE '✅ Has cancelled_at'
    END as verification_status
FROM product_purchases
WHERE status IN ('cancelled', 'expired')
ORDER BY updated_at DESC
LIMIT 5;

-- Refunded Purchases
SELECT 
    'SAMPLE: Refunded' as section,
    id::text as record_id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    refunded_at::text as refunded_at,
    updated_at::text as updated_at
FROM product_purchases
WHERE payment_status = 'refunded'
ORDER BY updated_at DESC
LIMIT 3;


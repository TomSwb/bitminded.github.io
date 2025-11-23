-- ============================================================================
-- Comprehensive Database Verification for "TESTED" Events
-- ============================================================================
-- Use this to verify that events marked as "TESTED & WORKING" actually updated the DB
-- Run this after testing each event type to confirm database changes

-- ============================================================================
-- 1. CHECKOUT & SUBSCRIPTION CREATION
-- ============================================================================
-- Verify: checkout.session.completed, customer.subscription.created, invoice.paid
-- Expected: Purchase records exist with correct data

SELECT 
    '1. Purchase Records' as test_name,
    COUNT(*) as total_purchases,
    COUNT(DISTINCT stripe_subscription_id) as unique_subscriptions,
    COUNT(DISTINCT stripe_invoice_id) as unique_invoices,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN subscription_interval IS NOT NULL THEN 1 END) as has_interval_count,
    COUNT(CASE WHEN subscription_interval IS NULL AND purchase_type = 'subscription' THEN 1 END) as missing_interval_count
FROM product_purchases
WHERE stripe_subscription_id IS NOT NULL
   OR stripe_invoice_id IS NOT NULL;

-- ============================================================================
-- 2. SUBSCRIPTION UPDATE (Test 2.3)
-- ============================================================================
-- Verify: customer.subscription.updated with plan changes
-- Expected: subscription_interval updated correctly, current_period dates updated

SELECT 
    '2. Subscription Updates' as test_name,
    id,
    stripe_subscription_id,
    subscription_interval,
    current_period_start,
    current_period_end,
    amount_paid,
    updated_at,
    CASE 
        WHEN subscription_interval IS NULL THEN '❌ Missing interval'
        WHEN current_period_start IS NULL THEN '❌ Missing period_start'
        WHEN current_period_end IS NULL THEN '❌ Missing period_end'
        ELSE '✅ Looks good'
    END as verification_status
FROM product_purchases
WHERE purchase_type = 'subscription'
  AND stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- ============================================================================
-- 3. SUBSCRIPTION PAUSE (Test 2.4)
-- ============================================================================
-- Verify: customer.subscription.updated with pause_collection
-- Expected: status = 'suspended' when paused

SELECT 
    '3. Paused Subscriptions' as test_name,
    id,
    stripe_subscription_id,
    status,
    payment_status,
    updated_at,
    CASE 
        WHEN status = 'suspended' THEN '✅ Correctly paused'
        WHEN status = 'active' THEN '⚠️ Still active (might not be paused)'
        ELSE '❓ Unexpected status: ' || status
    END as verification_status
FROM product_purchases
WHERE stripe_subscription_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- ============================================================================
-- 4. SUBSCRIPTION RESUME (Test 2.5)
-- ============================================================================
-- Verify: customer.subscription.updated after resume
-- Expected: status changed from 'suspended' to 'active'

SELECT 
    '4. Resumed Subscriptions' as test_name,
    id,
    stripe_subscription_id,
    status,
    payment_status,
    updated_at,
    CASE 
        WHEN status = 'active' AND updated_at > NOW() - INTERVAL '24 hours' THEN '✅ Recently resumed'
        WHEN status = 'suspended' THEN '⚠️ Still suspended'
        ELSE '❓ Status: ' || status
    END as verification_status
FROM product_purchases
WHERE stripe_subscription_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- ============================================================================
-- 5. SUBSCRIPTION CANCELLATION (Test 2.6)
-- ============================================================================
-- Verify: customer.subscription.deleted, customer.subscription.updated
-- Expected: status = 'cancelled' or 'expired', cancelled_at is set

SELECT 
    '5. Cancelled Subscriptions' as test_name,
    id,
    stripe_subscription_id,
    status,
    cancelled_at,
    current_period_end,
    updated_at,
    CASE 
        WHEN status IN ('cancelled', 'expired') AND cancelled_at IS NOT NULL THEN '✅ Correctly cancelled'
        WHEN status IN ('cancelled', 'expired') AND cancelled_at IS NULL THEN '⚠️ Cancelled but no cancelled_at timestamp'
        WHEN cancelled_at IS NOT NULL AND status = 'active' THEN '⚠️ Has cancelled_at but status is active'
        ELSE '❓ Status: ' || status
    END as verification_status
FROM product_purchases
WHERE cancelled_at IS NOT NULL
   OR status IN ('cancelled', 'expired')
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 6. INVOICE PAYMENT FAILURE (Test 3.1)
-- ============================================================================
-- Verify: invoice.payment_failed
-- Expected: payment_status = 'failed', grace_period_ends_at set, status might be 'suspended'

SELECT 
    '6. Payment Failures' as test_name,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    grace_period_ends_at,
    updated_at,
    CASE 
        WHEN payment_status = 'failed' AND grace_period_ends_at IS NOT NULL THEN '✅ Correctly handled failure'
        WHEN payment_status = 'failed' AND grace_period_ends_at IS NULL THEN '⚠️ Failed but no grace period'
        ELSE '❓ Payment status: ' || payment_status
    END as verification_status
FROM product_purchases
WHERE payment_status = 'failed'
   OR grace_period_ends_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 7. INVOICE PAYMENT ACTION REQUIRED (Test 3.2)
-- ============================================================================
-- Verify: invoice.payment_action_required
-- Expected: payment_status = 'pending', status = 'pending'

SELECT 
    '7. Payment Action Required' as test_name,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    updated_at,
    CASE 
        WHEN payment_status = 'pending' AND status = 'pending' THEN '✅ Correctly set to pending'
        WHEN payment_status = 'pending' THEN '⚠️ Payment pending but status is ' || status
        WHEN status = 'pending' THEN '⚠️ Status pending but payment_status is ' || payment_status
        ELSE '❓ No pending state found'
    END as verification_status
FROM product_purchases
WHERE payment_status = 'pending'
   OR status = 'pending'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 8. INVOICE VOIDED (Test 3.5)
-- ============================================================================
-- Verify: invoice.voided
-- Expected: stripe_invoice_id updated, period dates might change

SELECT 
    '8. Voided Invoices' as test_name,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    current_period_start,
    current_period_end,
    updated_at
FROM product_purchases
WHERE stripe_invoice_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 9. INVOICE MARKED UNCOLLECTIBLE (Test 3.6)
-- ============================================================================
-- Verify: invoice.marked_uncollectible
-- Expected: payment_status = 'failed', status = 'suspended'

SELECT 
    '9. Uncollectible Invoices' as test_name,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    updated_at,
    CASE 
        WHEN payment_status = 'failed' AND status = 'suspended' THEN '✅ Correctly marked uncollectible'
        WHEN payment_status = 'failed' THEN '⚠️ Failed but status is ' || status
        ELSE '❓ Payment status: ' || payment_status
    END as verification_status
FROM product_purchases
WHERE payment_status = 'failed'
  AND status = 'suspended'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 10. REFUNDS (Test 4.1) - Already verified but included for completeness
-- ============================================================================
SELECT 
    '10. Refunds' as test_name,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    refunded_at,
    updated_at,
    CASE 
        WHEN payment_status = 'refunded' AND refunded_at IS NOT NULL THEN '✅ Correctly refunded'
        WHEN payment_status = 'refunded' THEN '⚠️ Refunded but no timestamp'
        ELSE '❓ Payment status: ' || payment_status
    END as verification_status
FROM product_purchases
WHERE payment_status = 'refunded'
   OR refunded_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- SUMMARY: Check for any recent updates that might indicate missing verification
-- ============================================================================
SELECT 
    'SUMMARY: Recent Updates' as summary,
    COUNT(*) as total_recent_updates,
    COUNT(DISTINCT stripe_subscription_id) as unique_subscriptions_updated,
    MIN(updated_at) as oldest_recent_update,
    MAX(updated_at) as newest_recent_update
FROM product_purchases
WHERE updated_at > NOW() - INTERVAL '7 days';


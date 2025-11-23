-- ============================================================================
-- VERIFY SPECIFIC TESTS - Based on your current database state
-- ============================================================================
-- You have: 1 suspended, 2 cancelled, 1 refunded
-- Let's verify each one was handled correctly

-- ============================================================================
-- 1. VERIFY SUSPENDED SUBSCRIPTION (Test 2.4: Pause)
-- ============================================================================
SELECT 
    '1. SUSPENDED SUBSCRIPTION (Pause Test)' as test,
    id,
    stripe_subscription_id,
    status,
    payment_status,
    subscription_interval,
    current_period_start,
    current_period_end,
    updated_at,
    CASE 
        WHEN status = 'suspended' THEN '✅ Correctly suspended'
        ELSE '❌ Wrong status: ' || status
    END as verification
FROM product_purchases
WHERE status = 'suspended';

-- ============================================================================
-- 2. VERIFY CANCELLED SUBSCRIPTIONS (Test 2.6: Cancellation)
-- ============================================================================
SELECT 
    '2. CANCELLED SUBSCRIPTIONS (Cancellation Test)' as test,
    id,
    stripe_subscription_id,
    status,
    payment_status,
    cancelled_at,
    current_period_end,
    updated_at,
    CASE 
        WHEN status IN ('cancelled', 'expired') AND cancelled_at IS NOT NULL THEN '✅ Correctly cancelled with timestamp'
        WHEN status IN ('cancelled', 'expired') AND cancelled_at IS NULL THEN '⚠️ Cancelled but missing cancelled_at timestamp'
        ELSE '❌ Wrong status: ' || status
    END as verification
FROM product_purchases
WHERE status IN ('cancelled', 'expired')
ORDER BY updated_at DESC;

-- ============================================================================
-- 3. VERIFY REFUNDED PURCHASE (Test 4.1: Refund) - Already verified but double-check
-- ============================================================================
SELECT 
    '3. REFUNDED PURCHASE (Refund Test)' as test,
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    status,
    payment_status,
    refunded_at,
    amount_paid,
    updated_at,
    CASE 
        WHEN payment_status = 'refunded' AND refunded_at IS NOT NULL AND status = 'cancelled' THEN '✅ Full refund processed correctly'
        WHEN payment_status = 'refunded' AND refunded_at IS NOT NULL THEN '✅ Refund processed (partial?)'
        WHEN payment_status = 'refunded' THEN '⚠️ Refunded but missing timestamp'
        ELSE '❌ Not refunded'
    END as verification
FROM product_purchases
WHERE payment_status = 'refunded';

-- ============================================================================
-- 4. CHECK FOR MISSING TESTS
-- ============================================================================
-- What we DON'T see in the database (tests that might not have actually updated DB):

-- 4a. Subscription Update (Test 2.3) - Check if any subscriptions have different intervals
SELECT 
    '4a. SUBSCRIPTION INTERVALS (Update Test)' as test,
    stripe_subscription_id,
    subscription_interval,
    amount_paid,
    updated_at,
    'Check if interval changed over time (would need to compare with Stripe)' as note
FROM product_purchases
WHERE purchase_type = 'subscription'
  AND stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC;

-- 4b. Payment Failure (Test 3.1) - Should have payment_status = 'failed'
SELECT 
    '4b. PAYMENT FAILURES (Payment Failed Test)' as test,
    COUNT(*) as count,
    'No failed payments found - test might not have updated DB' as note
FROM product_purchases
WHERE payment_status = 'failed';

-- 4c. Payment Action Required (Test 3.2) - Should have payment_status = 'pending'
SELECT 
    '4c. PAYMENT ACTION REQUIRED (3D Secure Test)' as test,
    COUNT(*) as count,
    'No pending payments found - test might not have updated DB' as note
FROM product_purchases
WHERE payment_status = 'pending';

-- 4d. Invoice Voided (Test 3.5) - Hard to verify without comparing invoice IDs
SELECT 
    '4d. INVOICE VOIDED (Voided Test)' as test,
    COUNT(DISTINCT stripe_invoice_id) as unique_invoices,
    'Check Stripe Dashboard to see if any invoices were voided' as note
FROM product_purchases
WHERE stripe_invoice_id IS NOT NULL;

-- 4e. Invoice Marked Uncollectible (Test 3.6) - Should have payment_status = 'failed' AND status = 'suspended'
SELECT 
    '4e. UNCOLLECTIBLE INVOICES (Uncollectible Test)' as test,
    COUNT(*) as count,
    'No uncollectible invoices found - test might not have updated DB' as note
FROM product_purchases
WHERE payment_status = 'failed' AND status = 'suspended';


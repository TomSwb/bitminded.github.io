-- Test 5 Retest Verification: Subscription Cancellation (After Timing Fix)
-- Purpose: Verify that cancellation timing fix works correctly - cancelled_at should equal period end
-- Test Date: 2025-01-05
-- Subscription ID: sub_1Sm70RPBAwkcNEBl2zwNM9cf
-- Cancellation: Immediate cancellation (not at period end)
-- Expected: cancelled_at should equal current_period_end (not cancellation time)

-- ============================================================================
-- Query 1: Check subscription marked as cancelled
-- Expected: Status should be 'canceled', current_period_end should be set to actual period end
-- ============================================================================
SELECT 
    fs.id as family_subscription_id,
    fs.status, 
    fs.current_period_end,
    fs.stripe_subscription_id,
    fs.updated_at,
    CASE 
        WHEN fs.status = 'canceled' THEN '✅ Subscription marked as cancelled'
        ELSE '❌ Subscription status is not cancelled'
    END as cancellation_status,
    CASE 
        WHEN fs.current_period_end IS NOT NULL THEN '✅ Period end date set'
        ELSE '⚠️ Period end date missing'
    END as period_end_status
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf';

-- ============================================================================
-- Query 2: Check service purchases - VERIFY TIMING FIX
-- Expected: cancelled_at should equal current_period_end (the actual period end date)
-- This is the key test - cancelled_at should NOT be the cancellation time
-- ============================================================================
SELECT 
    sp.id,
    sp.status,
    sp.cancelled_at,
    sp.current_period_end,
    sp.user_id,
    up.email,
    sp.stripe_subscription_id,
    CASE 
        WHEN sp.status = 'cancelled' THEN '✅ Purchase marked as cancelled'
        WHEN sp.status = 'expired' THEN '✅ Purchase marked as expired'
        ELSE '⚠️ Purchase status: ' || sp.status
    END as purchase_status,
    CASE 
        WHEN sp.cancelled_at IS NOT NULL THEN '✅ Cancellation date set'
        ELSE '⚠️ Cancellation date missing'
    END as cancellation_date_status,
    CASE 
        WHEN sp.cancelled_at = sp.current_period_end THEN '✅ FIX VERIFIED: cancelled_at equals period end (correct!)'
        WHEN sp.cancelled_at IS NOT NULL AND sp.current_period_end IS NOT NULL THEN 
            '❌ ISSUE: cancelled_at (' || sp.cancelled_at || ') does not equal period end (' || sp.current_period_end || ')'
        ELSE '⚠️ Missing dates for comparison'
    END as timing_verification
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf';

-- ============================================================================
-- Query 3: Verify access revocation timing (should be at period end, not immediately)
-- Expected: cancelled_at should equal current_period_end
-- ============================================================================
SELECT 
    sp.id,
    sp.user_id,
    up.email,
    sp.status,
    sp.cancelled_at,
    sp.current_period_end,
    sp.expires_at,
    CASE 
        WHEN sp.cancelled_at IS NOT NULL AND sp.current_period_end IS NOT NULL THEN
            CASE 
                WHEN sp.cancelled_at = sp.current_period_end THEN '✅ FIX VERIFIED: Access revoked at period end (correct!)'
                WHEN sp.cancelled_at < sp.current_period_end THEN '❌ ISSUE: Access revoked before period end'
                ELSE '⚠️ Access revoked after period end'
            END
        ELSE '⚠️ Missing cancellation or period end date'
    END as revocation_timing,
    CASE 
        WHEN sp.current_period_end > NOW() THEN '✅ Access still valid until period end'
        ELSE '⚠️ Period end has passed'
    END as access_status
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf';

-- ============================================================================
-- Query 4: Check family members still have access until period end
-- Expected: Family members should still be active until period end
-- ============================================================================
SELECT 
    fm.id,
    fm.user_id,
    up.email,
    fm.role,
    fm.status as member_status,
    fm.joined_at,
    fs.status as subscription_status,
    fs.current_period_end as subscription_period_end,
    CASE 
        WHEN fm.status = 'active' AND fs.status = 'canceled' THEN 
            'ℹ️ Member still active (access will be revoked at period end: ' || fs.current_period_end || ')'
        WHEN fm.status != 'active' THEN '⚠️ Member status: ' || fm.status
        ELSE '✅ Member active'
    END as access_status
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id
JOIN family_subscriptions fs ON fs.family_group_id = fm.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf';

-- ============================================================================
-- Query 5: Check for any errors related to subscription.deleted event
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'subscriptionId' as subscription_id,
    created_at
FROM error_logs
WHERE (
    error_details->>'subscriptionId' = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf'
    OR (function_name = 'stripe-webhook' 
        AND error_message LIKE '%subscription.deleted%'
        AND created_at >= '2026-01-05 06:00:00'::timestamp)
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 6: Summary - Verify cancellation state and timing fix
-- ============================================================================
SELECT 
    'Family Subscription' as component,
    fs.status as status,
    fs.current_period_end::text as period_end,
    fs.updated_at::text as last_updated
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf'

UNION ALL

SELECT 
    'Service Purchases' as component,
    STRING_AGG(DISTINCT sp.status, ', ') as status,
    MAX(sp.current_period_end)::text as period_end,
    MAX(sp.updated_at)::text as last_updated
FROM service_purchases sp
WHERE sp.stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf'

UNION ALL

SELECT 
    'Timing Fix Verification' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM service_purchases 
            WHERE stripe_subscription_id = 'sub_1Sm70RPBAwkcNEBl2zwNM9cf'
            AND cancelled_at = current_period_end
        ) THEN '✅ FIX VERIFIED: cancelled_at = period_end'
        ELSE '❌ ISSUE: cancelled_at ≠ period_end'
    END as status,
    NULL as period_end,
    NULL as last_updated;

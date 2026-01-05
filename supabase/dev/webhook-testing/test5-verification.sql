-- Test 5 Verification: Subscription Cancellation
-- Purpose: Verify that cancellation marks subscription as cancelled and schedules revocation at period end
-- Test Date: 2025-01-05
-- Subscription ID: sub_1Sm6XEPBAwkcNEBltz3AWHXo
-- Cancellation: Immediate cancellation (not at period end)

-- ============================================================================
-- Query 1: Check subscription marked as cancelled
-- Expected: Status should be 'canceled', current_period_end should be set
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
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 2: Check service purchases marked as cancelled
-- Expected: Service purchases should be marked as 'cancelled' with cancelled_at = period end
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
    END as cancellation_date_status
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 3: Verify access revocation timing (should be at period end, not immediately)
-- Expected: cancelled_at should equal current_period_end (access revoked at period end)
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
                WHEN sp.cancelled_at = sp.current_period_end THEN '✅ Access revoked at period end (correct)'
                WHEN sp.cancelled_at < sp.current_period_end THEN '⚠️ Access revoked before period end'
                ELSE '⚠️ Access revoked after period end'
            END
        ELSE '⚠️ Missing cancellation or period end date'
    END as revocation_timing
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

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
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

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
    error_details->>'subscriptionId' = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'
    OR (function_name = 'stripe-webhook' 
        AND error_message LIKE '%subscription.deleted%'
        AND created_at >= '2026-01-05 05:55:00'::timestamp)
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 6: Summary - Verify cancellation state
-- ============================================================================
SELECT 
    'Family Subscription' as component,
    fs.status as status,
    fs.current_period_end as period_end,
    fs.updated_at as last_updated
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'

UNION ALL

SELECT 
    'Service Purchases' as component,
    STRING_AGG(DISTINCT sp.status, ', ') as status,
    MAX(sp.current_period_end)::timestamp::text as period_end,
    MAX(sp.updated_at)::timestamp::text as last_updated
FROM service_purchases sp
WHERE sp.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'

UNION ALL

SELECT 
    'Family Members' as component,
    STRING_AGG(DISTINCT fm.status, ', ') as status,
    NULL as period_end,
    NULL as last_updated
FROM family_members fm
JOIN family_subscriptions fs ON fs.family_group_id = fm.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

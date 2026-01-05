-- Test 6 Verification: Invoice Payment (Renewal)
-- Purpose: Verify that invoice payment renews access for all active family members
-- Test Date: 2025-01-05
-- Subscription ID: sub_1Sm7CSPBAwkcNEBl98jLbmJ1
-- Invoice ID: in_1Sm7CRPBAwkcNEBlUmFnuU12
-- Checkout Session ID: cs_test_a1I7CLBpOPsGoxqokA547jCm8KggAE54SWKHtq5hm5qRseeYprJjfuFauM

-- ============================================================================
-- Query 1: Check billing period updated
-- Expected: Family subscription should have updated current_period_start and current_period_end
-- ============================================================================
SELECT 
    fs.id as family_subscription_id,
    fs.current_period_start, 
    fs.current_period_end, 
    fs.status,
    fs.stripe_subscription_id,
    fs.updated_at,
    CASE 
        WHEN fs.current_period_start IS NOT NULL AND fs.current_period_end IS NOT NULL THEN '✅ Period dates set'
        ELSE '⚠️ Period dates missing'
    END as period_status,
    CASE 
        WHEN fs.status = 'active' THEN '✅ Subscription is active'
        ELSE '⚠️ Subscription status: ' || fs.status
    END as status_check
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1';

-- ============================================================================
-- Query 2: Check access renewed for all active members
-- Expected: Service purchases should be active with updated purchased_at (current period start)
-- ============================================================================
SELECT 
    sp.id,
    sp.user_id,
    up.email,
    sp.status,
    sp.purchased_at,
    sp.current_period_start,
    sp.current_period_end,
    sp.stripe_subscription_id,
    s.name as service_name,
    s.slug as service_slug,
    CASE 
        WHEN sp.status = 'active' THEN '✅ Purchase is active'
        ELSE '⚠️ Purchase status: ' || sp.status
    END as purchase_status,
    CASE 
        WHEN sp.purchased_at >= '2026-01-05 06:20:00'::timestamp THEN '✅ Purchase date updated (renewed)'
        ELSE '⚠️ Purchase date: ' || sp.purchased_at::text
    END as renewal_status
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
JOIN services s ON s.id = sp.service_id
WHERE sp.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
ORDER BY sp.purchased_at DESC;

-- ============================================================================
-- Query 3: Verify all active family members have access
-- Expected: All active family members should have active service purchases
-- ============================================================================
SELECT 
    fm.id as member_id,
    fm.user_id,
    up.email,
    fm.role,
    fm.status as member_status,
    sp.id as purchase_id,
    sp.status as purchase_status,
    sp.purchased_at,
    CASE 
        WHEN sp.id IS NOT NULL AND sp.status = 'active' THEN '✅ Member has active access'
        WHEN sp.id IS NOT NULL THEN '⚠️ Member has purchase but status: ' || sp.status
        ELSE '❌ Member has no service purchase'
    END as access_status
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id
JOIN family_subscriptions fs ON fs.family_group_id = fm.family_group_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id 
    AND sp.stripe_subscription_id = fs.stripe_subscription_id
    AND sp.service_id = (SELECT id FROM services WHERE slug = 'all-tools-membership-family')
WHERE fs.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
AND fm.status = 'active'
ORDER BY fm.role, up.email;

-- ============================================================================
-- Query 4: Check if billing periods match between subscription and purchases
-- Expected: Service purchase periods should match family subscription periods
-- ============================================================================
SELECT 
    fs.stripe_subscription_id,
    fs.current_period_start as subscription_period_start,
    fs.current_period_end as subscription_period_end,
    sp.current_period_start as purchase_period_start,
    sp.current_period_end as purchase_period_end,
    up.email,
    CASE 
        WHEN fs.current_period_start = sp.current_period_start 
            AND fs.current_period_end = sp.current_period_end THEN '✅ Periods match'
        ELSE '⚠️ Periods do not match'
    END as period_match_status
FROM family_subscriptions fs
JOIN service_purchases sp ON sp.stripe_subscription_id = fs.stripe_subscription_id
JOIN user_profiles up ON up.id = sp.user_id
WHERE fs.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
ORDER BY up.email;

-- ============================================================================
-- Query 5: Check for any errors related to invoice.paid event
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'subscriptionId' as subscription_id,
    error_details->>'invoiceId' as invoice_id,
    created_at
FROM error_logs
WHERE (
    error_details->>'subscriptionId' = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
    OR error_details->>'invoiceId' = 'in_1Sm7CRPBAwkcNEBlUmFnuU12'
    OR (function_name = 'stripe-webhook' 
        AND error_message LIKE '%invoice.paid%'
        AND created_at >= '2026-01-05 06:20:00'::timestamp)
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 6: Summary - Verify renewal state
-- ============================================================================
SELECT 
    'Family Subscription' as component,
    fs.status as status,
    fs.current_period_start::text as period_start,
    fs.current_period_end::text as period_end,
    fs.updated_at::text as last_updated
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'

UNION ALL

SELECT 
    'Service Purchases (Active)' as component,
    STRING_AGG(DISTINCT sp.status, ', ') as status,
    MIN(sp.current_period_start)::text as period_start,
    MAX(sp.current_period_end)::text as period_end,
    MAX(sp.updated_at)::text as last_updated
FROM service_purchases sp
WHERE sp.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
AND sp.status = 'active'

UNION ALL

SELECT 
    'Active Family Members' as component,
    COUNT(*)::text as status,
    NULL as period_start,
    NULL as period_end,
    NULL as last_updated
FROM family_members fm
JOIN family_subscriptions fs ON fs.family_group_id = fm.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm7CSPBAwkcNEBl98jLbmJ1'
AND fm.status = 'active';

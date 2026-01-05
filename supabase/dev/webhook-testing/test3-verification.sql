-- Test 3 Verification: Subscription Creation Event
-- Purpose: Verify that customer.subscription.created properly links to family subscription
-- Test Date: 2025-01-05
-- Subscription ID: sub_1Sm6XEPBAwkcNEBltz3AWHXo (from Test 2)
-- Customer ID: cus_TjZgTErcq6zTmV

-- ============================================================================
-- Query 1: Verify family subscription is properly linked to subscription
-- Expected: Should show family subscription with correct details
-- ============================================================================
SELECT 
    fs.id as family_subscription_id,
    fs.family_group_id,
    fs.plan_name,
    fs.status,
    fs.stripe_subscription_id,
    fs.stripe_customer_id,
    fs.current_period_start,
    fs.current_period_end,
    fs.created_at,
    fs.updated_at,
    fg.family_name,
    fg.subscription_id as family_group_subscription_id,
    CASE 
        WHEN fg.subscription_id = fs.id THEN '✅ Family group linked to subscription'
        ELSE '❌ Family group NOT linked to subscription'
    END as linking_status
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 2: Verify family group subscription_id is set correctly
-- Expected: family_groups.subscription_id should equal family_subscriptions.id
-- ============================================================================
SELECT 
    fg.id as family_group_id,
    fg.family_name,
    fg.subscription_id as family_group_subscription_id,
    fs.id as family_subscription_id,
    fs.stripe_subscription_id,
    CASE 
        WHEN fg.subscription_id = fs.id THEN '✅ Correctly linked'
        ELSE '❌ Not linked correctly'
    END as verification_status
FROM family_groups fg
JOIN family_subscriptions fs ON fs.family_group_id = fg.id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 3: Check subscription details match Stripe subscription
-- Expected: Status, periods, customer ID should all be set
-- ============================================================================
SELECT 
    fs.stripe_subscription_id,
    fs.stripe_customer_id,
    fs.status,
    fs.current_period_start,
    fs.current_period_end,
    fs.plan_name,
    CASE 
        WHEN fs.status = 'active' THEN '✅ Status is active'
        ELSE '⚠️ Status is not active'
    END as status_check,
    CASE 
        WHEN fs.current_period_start IS NOT NULL AND fs.current_period_end IS NOT NULL THEN '✅ Period dates set'
        ELSE '⚠️ Period dates missing'
    END as period_check,
    CASE 
        WHEN fs.stripe_customer_id IS NOT NULL THEN '✅ Customer ID set'
        ELSE '⚠️ Customer ID missing'
    END as customer_check
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 4: Check for any errors related to subscription.created event
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'subscriptionId' as subscription_id,
    user_id,
    created_at
FROM error_logs
WHERE (
    error_details->>'subscriptionId' = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'
    OR (function_name = 'stripe-webhook' 
        AND error_message LIKE '%subscription.created%'
        AND created_at >= '2026-01-05 05:30:00'::timestamp)
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 5: Summary - Verify all components are linked correctly
-- ============================================================================
SELECT 
    'Family Group' as component,
    fg.id::text as id,
    fg.family_name as name,
    fg.subscription_id::text as linked_subscription_id
FROM family_groups fg
WHERE fg.id IN (
    SELECT family_group_id FROM family_subscriptions 
    WHERE stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'
)

UNION ALL

SELECT 
    'Family Subscription' as component,
    fs.id::text as id,
    fs.plan_name as name,
    fs.stripe_subscription_id as linked_subscription_id
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

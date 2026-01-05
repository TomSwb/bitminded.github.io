-- Test 4 Verification: Subscription Update (Quantity/Member Count Change)
-- Purpose: Verify that subscription quantity changes are detected and logged
-- Test Date: 2025-01-05
-- Subscription ID: sub_1Sm6XEPBAwkcNEBltz3AWHXo
-- Quantity Change: 2 → 3 members

-- ============================================================================
-- Query 1: Check subscription status and periods were updated
-- Expected: Status should be active, periods should be set
-- ============================================================================
SELECT 
    fs.id as family_subscription_id,
    fs.status, 
    fs.current_period_start, 
    fs.current_period_end,
    fs.stripe_subscription_id,
    fs.updated_at,
    CASE 
        WHEN fs.updated_at >= '2026-01-05 05:45:00'::timestamp THEN '✅ Recently updated (after quantity change)'
        ELSE '⚠️ Not updated recently'
    END as update_status
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 2: Check active member count vs subscription quantity
-- Expected: Subscription quantity is 3, but active members is 1 (admin only)
-- Note: Quantity changes are logged but member management is done via UI
-- ============================================================================
SELECT 
    (SELECT COUNT(*) FROM family_members 
     WHERE family_group_id = fs.family_group_id AND status = 'active') as active_members,
    fs.stripe_subscription_id,
    fs.family_group_id,
    fg.family_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM family_members 
              WHERE family_group_id = fs.family_group_id AND status = 'active') < 3 THEN 
            'ℹ️ Subscription allows 3 members, but only ' || 
            (SELECT COUNT(*)::text FROM family_members 
             WHERE family_group_id = fs.family_group_id AND status = 'active') || 
            ' active member(s). More can be added via family management UI.'
        ELSE '✅ Member count matches subscription quantity'
    END as quantity_status
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 3: Verify subscription was updated (check updated_at timestamp)
-- Expected: updated_at should be recent (after quantity change)
-- ============================================================================
SELECT 
    fs.id,
    fs.stripe_subscription_id,
    fs.status,
    fs.updated_at,
    NOW() as current_time,
    EXTRACT(EPOCH FROM (NOW() - fs.updated_at)) as seconds_since_update,
    CASE 
        WHEN fs.updated_at >= NOW() - INTERVAL '5 minutes' THEN '✅ Updated within last 5 minutes'
        WHEN fs.updated_at >= NOW() - INTERVAL '10 minutes' THEN '⚠️ Updated 5-10 minutes ago'
        ELSE '❌ Not updated recently'
    END as update_recency
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 4: Check for any errors related to subscription.updated event
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
        AND error_message LIKE '%subscription.updated%'
        AND created_at >= '2026-01-05 05:45:00'::timestamp)
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 5: Get current subscription details from database
-- ============================================================================
SELECT 
    fs.id,
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
    (SELECT COUNT(*) FROM family_members 
     WHERE family_group_id = fs.family_group_id AND status = 'active') as active_member_count
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

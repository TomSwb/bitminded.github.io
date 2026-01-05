-- Test 2 Verification: Existing Family Member Purchases Family Plan
-- Purpose: Verify that when user already has a family group, purchase links to existing group instead of creating new one
-- Test Date: 2025-01-05
-- Checkout Session ID: cs_test_a1amc7PKQumyHFZCCunZuYlpSrdY5eE1T0pJ8iL7JH9cXq9ZDpQ7ApTGxA
-- Subscription ID: sub_1Sm6XEPBAwkcNEBltz3AWHXo
-- Customer ID: cus_TjZgTErcq6zTmV
-- Invoice ID: in_1Sm6XCPBAwkcNEBlQRgakkQU

-- ============================================================================
-- Query 1: Verify there is still only ONE family group for this user
-- Expected: Should return 1 (same group from Test 1, no new group created)
-- ============================================================================
SELECT 
    COUNT(*) as family_count,
    STRING_AGG(id::text, ', ') as family_group_ids,
    STRING_AGG(family_name, ', ') as family_names
FROM family_groups
WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch');

-- ============================================================================
-- Query 2: Verify the new subscription is linked to the EXISTING family group
-- Expected: Should show the same family_group_id as Test 1 (6821b67e-8b9b-4227-81c1-b588a1e658d3)
-- ============================================================================
SELECT 
    fs.id as subscription_id,
    fs.family_group_id,
    fs.plan_name,
    fs.status,
    fs.stripe_subscription_id,
    fg.family_name,
    fg.admin_user_id,
    up.email as admin_email,
    CASE 
        WHEN fs.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3' THEN '✅ Linked to existing group from Test 1'
        ELSE '❌ Linked to different group (NEW group created - FAIL)'
    END as verification_status
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
JOIN user_profiles up ON up.id = fg.admin_user_id
WHERE fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo';

-- ============================================================================
-- Query 3: List ALL family groups for this user (should be only 1)
-- ============================================================================
SELECT 
    fg.id,
    fg.family_name,
    fg.admin_user_id,
    fg.subscription_id,
    up.email as admin_email,
    fg.created_at
FROM family_groups fg
JOIN user_profiles up ON up.id = fg.admin_user_id
WHERE up.email = 'dev@bitminded.ch'
ORDER BY fg.created_at;

-- ============================================================================
-- Query 4: List ALL family subscriptions for this user's family group
-- Expected: Should show 2 subscriptions (one from Test 1, one from Test 2) both linked to same group
-- ============================================================================
SELECT 
    fs.id,
    fs.family_group_id,
    fs.plan_name,
    fs.status,
    fs.stripe_subscription_id,
    fs.current_period_start,
    fs.current_period_end,
    fs.created_at,
    fg.family_name,
    CASE 
        WHEN fs.stripe_subscription_id = 'sub_1Sm6LoPBAwkcNEBl2tzb9QEX' THEN 'Test 1 subscription'
        WHEN fs.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo' THEN 'Test 2 subscription'
        ELSE 'Other subscription'
    END as test_identifier
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fg.admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
ORDER BY fs.created_at;

-- ============================================================================
-- Query 5: Verify all existing members still have access (service purchases)
-- Expected: Should show service purchases for all active family members
-- ============================================================================
SELECT 
    sp.id,
    sp.user_id,
    up.email,
    s.slug as service_slug,
    s.name as service_name,
    sp.status,
    sp.stripe_subscription_id,
    sp.purchased_at,
    fm.role as family_member_role,
    fm.status as family_member_status,
    CASE 
        WHEN sp.stripe_subscription_id = 'sub_1Sm6LoPBAwkcNEBl2tzb9QEX' THEN 'Test 1 purchase'
        WHEN sp.stripe_subscription_id = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo' THEN 'Test 2 purchase'
        ELSE 'Other purchase'
    END as test_identifier
FROM service_purchases sp
JOIN user_profiles up ON up.id = sp.user_id
JOIN services s ON s.id = sp.service_id
LEFT JOIN family_members fm ON fm.user_id = sp.user_id 
    AND fm.family_group_id = (SELECT id FROM family_groups WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch'))
WHERE sp.user_id IN (
    SELECT user_id 
    FROM family_members 
    WHERE family_group_id = (SELECT id FROM family_groups WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch'))
)
AND s.slug = 'all-tools-membership-family'
ORDER BY sp.purchased_at DESC;

-- ============================================================================
-- Query 6: Check for any errors related to this test
-- ============================================================================
SELECT 
    id,
    function_name,
    error_type,
    error_message,
    error_details,
    error_details->>'sessionId' as session_id,
    error_details->>'subscriptionId' as subscription_id,
    error_details->>'familyGroupId' as family_group_id,
    error_details->>'serviceSlug' as service_slug,
    user_id,
    created_at
FROM error_logs
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
AND (
    error_details->>'sessionId' = 'cs_test_a1amc7PKQumyHFZCCunZuYlpSrdY5eE1T0pJ8iL7JH9cXq9ZDpQ7ApTGxA'
    OR error_details->>'subscriptionId' = 'sub_1Sm6XEPBAwkcNEBltz3AWHXo'
    OR created_at >= '2026-01-05 05:30:00'::timestamp
)
ORDER BY created_at DESC;

-- ============================================================================
-- Query 7: Summary - Count of family plan components
-- Expected: 1 group, 2 subscriptions (Test 1 + Test 2), 1+ members, 1+ purchases
-- ============================================================================
SELECT 
    'Family Groups' as component,
    COUNT(*) as count
FROM family_groups
WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')

UNION ALL

SELECT 
    'Family Subscriptions' as component,
    COUNT(*) as count
FROM family_subscriptions
WHERE family_group_id IN (
    SELECT id FROM family_groups 
    WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
)

UNION ALL

SELECT 
    'Family Members' as component,
    COUNT(*) as count
FROM family_members
WHERE family_group_id IN (
    SELECT id FROM family_groups 
    WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
)

UNION ALL

SELECT 
    'Service Purchases (Family)' as component,
    COUNT(*) as count
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
WHERE sp.user_id IN (
    SELECT user_id FROM family_members 
    WHERE family_group_id IN (
        SELECT id FROM family_groups 
        WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
    )
)
AND s.slug = 'all-tools-membership-family';

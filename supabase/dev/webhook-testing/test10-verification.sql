-- Test 10 Verification: Multiple Family Members Access
-- Purpose: Verify all family members get access when subscription is active
-- Test Date: 2025-01-05
-- Note: This test verifies that grantFamilyAccess correctly grants access to all active members

-- ============================================================================
-- Query 1: Check current family group and members
-- Expected: Should show the family group from Test 1 and all active members
-- ============================================================================
SELECT 
    fg.id as family_group_id,
    fg.family_name,
    fg.admin_user_id,
    up.email as admin_email,
    COUNT(DISTINCT fm.id) as total_members,
    COUNT(DISTINCT CASE WHEN fm.status = 'active' THEN fm.id END) as active_members,
    fs.id as subscription_id,
    fs.status as subscription_status,
    fs.plan_name
FROM family_groups fg
LEFT JOIN user_profiles up ON up.id = fg.admin_user_id
LEFT JOIN family_members fm ON fm.family_group_id = fg.id
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
WHERE fg.id = '6821b67e-8b9b-4227-81c1-b588a1e658d3' -- Test 1 family group ID
GROUP BY fg.id, fg.family_name, fg.admin_user_id, up.email, fs.id, fs.status, fs.plan_name;

-- ============================================================================
-- Query 2: Check all active family members and their service purchases
-- Expected: All active members should have service purchase records for the family plan service
-- ============================================================================
SELECT 
    fm.id as member_id,
    fm.user_id,
    up.email,
    fm.role,
    fm.status as member_status,
    fm.joined_at,
    s.id as service_id,
    s.name as service_name,
    s.slug as service_slug,
    sp.id as purchase_id,
    sp.status as purchase_status,
    sp.purchased_at,
    sp.current_period_start,
    sp.current_period_end,
    sp.stripe_subscription_id,
    CASE 
        WHEN sp.id IS NOT NULL AND sp.status = 'active' THEN '✅ Has active access'
        WHEN sp.id IS NOT NULL AND sp.status != 'active' THEN '⚠️ Has purchase but not active'
        ELSE '❌ No purchase record'
    END as access_status
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id
LEFT JOIN services s ON s.id = sp.service_id AND s.slug IN ('all-tools-membership-family', 'supporter-tier-family')
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3' -- Test 1 family group ID
AND fm.status = 'active'
ORDER BY fm.role DESC, up.email;

-- ============================================================================
-- Query 3: Verify grantFamilyAccess behavior - check if all active members have purchases
-- Expected: All active members should have service purchases when subscription is active
-- ============================================================================
SELECT 
    'Total Active Members' as metric,
    COUNT(*)::text as value
FROM family_members fm
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
AND fm.status = 'active'

UNION ALL

SELECT 
    'Members with Active Purchases' as metric,
    COUNT(DISTINCT sp.user_id)::text as value
FROM family_members fm
JOIN service_purchases sp ON sp.user_id = fm.user_id
JOIN services s ON s.id = sp.service_id AND s.slug IN ('all-tools-membership-family', 'supporter-tier-family')
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
AND fm.status = 'active'
AND sp.status = 'active'

UNION ALL

SELECT 
    'Family Subscription Status' as metric,
    fs.status::text as value
FROM family_subscriptions fs
WHERE fs.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
LIMIT 1;

-- ============================================================================
-- Query 4: Check grantFamilyAccess function behavior (code verification)
-- Note: This is verified through code review - grantFamilyAccess:
-- 1. Gets all active family members using get_active_family_members RPC
-- 2. Creates/updates service_purchases for each member
-- 3. Splits amount_total by number of members (per-member pricing)
-- 4. Called when family plan is purchased (handleFamilyPlanPurchase)
-- 5. Called when invoice is paid (handleInvoicePaid - renewal)
-- ============================================================================
-- Code verification:
-- 1. grantFamilyAccess (lines 726-813):
--    - Gets all active members via RPC: get_active_family_members
--    - Calculates per-member amount: amountTotal / members.length
--    - Creates or updates service_purchases for each member
--    - Sets status = 'active', payment_status = 'succeeded'
--    - Links to subscription if subscriptionId provided
-- 2. Called from:
--    - handleFamilyPlanPurchase (line 1020) - when new family plan purchased
--    - handleInvoicePaid (lines 2305-2356) - when invoice paid (renewal)
-- 3. Behavior:
--    - If member already has active purchase, updates it
--    - If member doesn't have purchase, creates new one
--    - All active members get access, regardless of when they joined

-- ============================================================================
-- Query 5: Verify per-member pricing calculation
-- Expected: Each member's purchase should have amount_paid = total_amount / member_count
-- ============================================================================
WITH member_counts AS (
    SELECT 
        fm.family_group_id,
        COUNT(*) as total_active_members
    FROM family_members fm
    WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
    AND fm.status = 'active'
    GROUP BY fm.family_group_id
),
family_totals AS (
    SELECT 
        sp.stripe_subscription_id,
        SUM(sp.amount_paid) as total_family_amount,
        COUNT(*) as members_with_purchases
    FROM service_purchases sp
    JOIN family_members fm ON fm.user_id = sp.user_id
    WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
    AND fm.status = 'active'
    AND sp.status = 'active'
    AND EXISTS (
        SELECT 1 FROM services s 
        WHERE s.id = sp.service_id 
        AND s.slug IN ('all-tools-membership-family', 'supporter-tier-family')
    )
    GROUP BY sp.stripe_subscription_id
)
SELECT 
    fm.user_id,
    up.email,
    sp.amount_paid as member_amount,
    fs.plan_name,
    mc.total_active_members,
    ft.total_family_amount,
    ft.members_with_purchases,
    CASE 
        WHEN mc.total_active_members > 0 
        THEN ft.total_family_amount / mc.total_active_members
        ELSE NULL
    END as calculated_per_member_amount,
    CASE 
        WHEN mc.total_active_members > 0 
        AND ABS(sp.amount_paid - (ft.total_family_amount / mc.total_active_members)) < 0.01
        THEN '✅ Per-member pricing correct'
        WHEN mc.total_active_members > ft.members_with_purchases
        THEN '⚠️ Not all members have purchases yet (new member added)'
        ELSE '⚠️ Per-member pricing mismatch'
    END as pricing_verification
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id
JOIN service_purchases sp ON sp.user_id = fm.user_id
JOIN services s ON s.id = sp.service_id AND s.slug IN ('all-tools-membership-family', 'supporter-tier-family')
JOIN family_subscriptions fs ON fs.stripe_subscription_id = sp.stripe_subscription_id
JOIN member_counts mc ON mc.family_group_id = fm.family_group_id
LEFT JOIN family_totals ft ON ft.stripe_subscription_id = sp.stripe_subscription_id
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
AND fm.status = 'active'
AND sp.status = 'active'
ORDER BY up.email;

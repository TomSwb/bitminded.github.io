-- ============================================================================
-- Test 1 Re-test Verification Queries - New Family Plan Purchase (FIXED)
-- ============================================================================
-- ⚠️ IMPORTANT: This test was processed in PRODUCTION database
-- Database: PROD (dynxqnrkmjcvgzsugxtm) - Run queries in PROD SQL Editor
-- Test User: dev@bitminded.ch
-- Subscription ID (Latest): sub_1Sm653PBAwkcNEBlHYEpWObe
-- Subscription ID (Previous): sub_1Sm5tMPBAwkcNEBllMPfm4rr
-- Customer ID (Latest): cus_TjZDUl9EPVK3nf
-- Invoice ID (Latest): in_1Sm651PBAwkcNEBlMijKobZy
-- Checkout Session (Latest): cs_test_a13hgTrA5ZJ3oOQhQv6fThKMLNGJghwmAc5lgliqjzFzBt5thMVhEMb6L2
-- Checkout Session (Previous): cs_test_a1R80g6RyGlObN76EUp7ZwuebUJTfzFlZv0RjOnUPSoRVIPpc4Ku5XMFq2
-- 
-- This is a re-test after fixing the bug where family plan wasn't detected
-- when checkout session retrieval failed.
-- ============================================================================

-- Query 1: Check family group was created
SELECT 
  fg.id, 
  fg.family_name, 
  fg.admin_user_id, 
  fg.subscription_id,
  u.email as admin_email,
  fg.created_at
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE fg.admin_user_id = (
  SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch'
)
ORDER BY fg.created_at DESC;

-- Query 2: Check family subscription was created
SELECT 
  fs.id, 
  fs.plan_name, 
  fs.status, 
  fs.stripe_subscription_id,
  fs.stripe_customer_id,
  fs.current_period_start, 
  fs.current_period_end,
  fs.created_at
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE u.email = 'dev@bitminded.ch'
ORDER BY fs.created_at DESC;

-- Query 3: Check admin was added as family member
SELECT 
  fm.id, 
  fm.role, 
  fm.status, 
  fm.user_id, 
  u.email,
  fm.joined_at,
  fm.created_at
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
WHERE fm.family_group_id = (
  SELECT id FROM family_groups 
  WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY fm.created_at DESC;

-- Query 4: Check service_purchases were created for admin (should be linked to family plan)
SELECT 
  sp.id, 
  sp.user_id, 
  sp.service_id, 
  sp.purchase_type, 
  sp.amount_paid, 
  sp.currency,
  sp.status, 
  sp.stripe_subscription_id,
  sp.stripe_customer_id,
  sp.purchased_at,
  s.name as service_name,
  s.slug as service_slug
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
JOIN user_profiles u ON u.id = sp.user_id
WHERE u.email = 'dev@bitminded.ch'
AND sp.stripe_subscription_id = 'sub_1Sm5tMPBAwkcNEBllMPfm4rr'
ORDER BY sp.purchased_at DESC;

-- Query 5: Verify subscription linking
SELECT 
  fs.id as subscription_id,
  fs.stripe_subscription_id,
  fs.plan_name,
  fs.status,
  fg.id as family_group_id,
  fg.subscription_id as family_group_subscription_id,
  CASE 
    WHEN fg.subscription_id = fs.id THEN '✅ Linked'
    ELSE '❌ Not Linked'
  END as link_status
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id IN ('sub_1Sm653PBAwkcNEBlHYEpWObe', 'sub_1Sm5tMPBAwkcNEBllMPfm4rr');

-- Query 6: Check for any errors related to this test (with full error details)
SELECT 
  id,
  error_type,
  error_message,
  error_details,
  error_details->>'family_group_id' as family_group_id,
  error_details->>'stripe_subscription_id' as stripe_subscription_id,
  error_details->>'serviceId' as service_id,
  error_details->>'serviceSlug' as service_slug,
  error_details->>'subscriptionId' as subscription_id,
  error_details->>'error' as nested_error,
  error_details->>'stack' as error_stack,
  user_id,
  created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
  error_message LIKE '%family%'
  OR error_details::text LIKE '%family%'
  OR error_details::text LIKE '%dev@bitminded%'
  OR error_details::text LIKE '%sub_1Sm653PBAwkcNEBlHYEpWObe%'
  OR error_details::text LIKE '%sub_1Sm5tMPBAwkcNEBllMPfm4rr%'
  OR error_details::text LIKE '%cs_test_a13hgTrA5ZJ3oOQhQv6fThKMLNGJghwmAc5lgliqjzFzBt5thMVhEMb6L2%'
  OR error_details::text LIKE '%cs_test_a1R80g6RyGlObN76EUp7ZwuebUJTfzFlZv0RjOnUPSoRVIPpc4Ku5XMFq2%'
)
ORDER BY created_at DESC
LIMIT 10;

-- Query 7: Summary - Check all family plan components
SELECT 
  'Family Groups' as component,
  COUNT(*) as count
FROM family_groups
WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
UNION ALL
SELECT 
  'Family Subscriptions' as component,
  COUNT(*) as count
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fg.admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
UNION ALL
SELECT 
  'Family Members' as component,
  COUNT(*) as count
FROM family_members fm
JOIN family_groups fg ON fg.id = fm.family_group_id
WHERE fg.admin_user_id = (SELECT id FROM user_profiles WHERE email = 'dev@bitminded.ch')
UNION ALL
SELECT 
  'Service Purchases (Family)' as component,
  COUNT(*) as count
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
JOIN user_profiles u ON u.id = sp.user_id
WHERE u.email = 'dev@bitminded.ch'
AND s.slug LIKE '%family%'
AND sp.stripe_subscription_id IN ('sub_1Sm653PBAwkcNEBlHYEpWObe', 'sub_1Sm5tMPBAwkcNEBllMPfm4rr');

-- Query 8: Manually add missing family member (run this if Query 3 returns empty)
-- This will add the admin as a family member with age 30 to the existing family group
INSERT INTO family_members (
  family_group_id,
  user_id,
  role,
  relationship,
  status,
  age,
  is_verified,
  joined_at
)
SELECT 
  '47912352-dde9-4438-b572-136547ef339b', -- Family group ID
  'd7c62fc8-7f13-403b-b87f-d59f76709ab4', -- User ID for dev@bitminded.ch
  'admin',
  'admin',
  'active',
  30, -- Age set to 30
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM family_members 
  WHERE family_group_id = '47912352-dde9-4438-b572-136547ef339b'
  AND user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
)
ON CONFLICT (family_group_id, user_id) 
DO UPDATE SET 
  age = 30,
  status = 'active',
  updated_at = NOW();

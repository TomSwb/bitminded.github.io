-- ============================================================================
-- Test 1 Verification Queries - New Family Plan Purchase
-- ============================================================================
-- ⚠️ IMPORTANT: This test was processed in PRODUCTION database, not DEV!
-- Database: PROD (dynxqnrkmjcvgzsugxtm) - Run queries in PROD SQL Editor
-- Test User: dev@bitminded.ch
-- Subscription ID: sub_1Sm5hjPBAwkcNEBlVHLMX12Q
-- Customer ID: cus_TjYpun02hu5I4V
-- Checkout Session: cs_test_a1q2xnKjV13zJOouzmK6rgQ8T5rey02T29JwHx6Yk47UilXXf3GnD3e86F
-- 
-- NOTE: Webhook was sent to PROD instead of DEV due to Stripe CLI forwarding
-- configuration. Check PROD database for results.
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
);

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
WHERE u.email = 'dev@bitminded.ch';

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
);

-- Query 4: Check service_purchases were created for admin
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
AND s.slug LIKE '%family%'
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
WHERE fs.stripe_subscription_id = 'sub_1Sm5hjPBAwkcNEBlVHLMX12Q';

-- Query 6: Check for any errors related to this test
SELECT 
  id,
  error_type,
  error_message,
  error_details->>'family_group_id' as family_group_id,
  error_details->>'stripe_subscription_id' as stripe_subscription_id,
  user_id,
  created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
  error_message LIKE '%family%'
  OR error_details::text LIKE '%family%'
  OR error_details::text LIKE '%dev@bitminded%'
  OR error_details::text LIKE '%sub_1Sm5hjPBAwkcNEBlVHLMX12Q%'
)
ORDER BY created_at DESC
LIMIT 10;

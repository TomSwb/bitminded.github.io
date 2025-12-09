-- ============================================================================
-- Family Plan Webhook Handler Verification Queries
-- ============================================================================
-- Purpose: Comprehensive database verification queries for family plan webhook testing
-- Usage: Run these queries after triggering webhook events to verify correct processing
-- Location: supabase/dev/webhook-testing/verify-family-plan-webhook.sql
-- ============================================================================

-- 1. Check all family groups and their subscriptions
-- Shows complete overview of all family groups, their admins, subscriptions, and member counts
SELECT 
  fg.id as family_id,
  fg.family_name,
  u.email as admin_email,
  fs.plan_name,
  fs.status as subscription_status,
  fs.stripe_subscription_id,
  fs.current_period_start,
  fs.current_period_end,
  (SELECT COUNT(*) FROM family_members WHERE family_group_id = fg.id AND status = 'active') as active_member_count,
  fg.created_at as family_created_at,
  fs.created_at as subscription_created_at
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
ORDER BY fg.created_at DESC;

-- 2. Check all family members and their access
-- Shows all family members across all groups with their purchase status
SELECT 
  fm.family_group_id,
  fg.family_name,
  u.email,
  fm.role,
  fm.status as member_status,
  fm.joined_at,
  sp.status as purchase_status,
  sp.purchased_at,
  sp.cancelled_at,
  s.name as service_name,
  s.slug as service_slug
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
JOIN family_groups fg ON fg.id = fm.family_group_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id
LEFT JOIN services s ON s.id = sp.service_id AND s.slug LIKE '%family%'
ORDER BY fm.created_at DESC;

-- 3. Check recent family plan service purchases
-- Shows all service purchases for family plan services
SELECT 
  sp.id,
  u.email,
  s.name as service_name,
  s.slug,
  sp.purchase_type,
  sp.amount_paid,
  sp.currency,
  sp.status,
  sp.stripe_subscription_id,
  sp.stripe_customer_id,
  sp.purchased_at,
  sp.cancelled_at,
  sp.subscription_interval
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
JOIN services s ON s.id = sp.service_id
WHERE s.slug LIKE '%family%'
ORDER BY sp.purchased_at DESC
LIMIT 20;

-- 4. Check for errors related to family plans
-- Shows any errors that occurred during family plan webhook processing
SELECT 
  id,
  error_type,
  error_message,
  error_details->>'family_group_id' as family_group_id,
  error_details->>'service_slug' as service_slug,
  error_details->>'plan_name' as plan_name,
  user_id,
  created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
  error_message LIKE '%family%'
  OR error_details::text LIKE '%family%'
  OR error_details::text LIKE '%family_group%'
)
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verify plan name validation
-- Should only return rows if there are invalid plan names (this should be empty if validation works)
SELECT DISTINCT plan_name
FROM family_subscriptions
WHERE plan_name NOT IN ('family_all_tools', 'family_supporter');

-- 6. Check family subscription status summary
-- Quick overview of all family subscriptions by status
SELECT 
  fs.status,
  fs.plan_name,
  COUNT(*) as count,
  COUNT(DISTINCT fs.family_group_id) as unique_families,
  MIN(fs.created_at) as oldest_subscription,
  MAX(fs.created_at) as newest_subscription
FROM family_subscriptions fs
GROUP BY fs.status, fs.plan_name
ORDER BY fs.status, fs.plan_name;

-- 7. Verify family group subscription linking
-- Checks if family groups are properly linked to subscriptions
SELECT 
  fg.id as family_id,
  fg.family_name,
  fg.subscription_id as family_group_subscription_id,
  fs.id as subscription_record_id,
  CASE 
    WHEN fg.subscription_id = fs.id THEN '✅ Linked'
    WHEN fg.subscription_id IS NULL AND fs.id IS NOT NULL THEN '⚠️ Missing link'
    WHEN fg.subscription_id IS NOT NULL AND fs.id IS NULL THEN '❌ Broken link'
    ELSE '❌ No subscription'
  END as link_status
FROM family_groups fg
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
ORDER BY fg.created_at DESC;

-- 8. Check member access consistency
-- Verifies that all active family members have corresponding service purchases
SELECT 
  fm.family_group_id,
  fg.family_name,
  u.email,
  fm.status as member_status,
  COUNT(sp.id) as purchase_records,
  MAX(sp.status) as latest_purchase_status,
  MAX(sp.purchased_at) as last_access_granted
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
JOIN family_groups fg ON fg.id = fm.family_group_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id
LEFT JOIN services s ON s.id = sp.service_id AND s.slug LIKE '%family%'
WHERE fm.status = 'active'
GROUP BY fm.family_group_id, fg.family_name, u.email, fm.status
HAVING COUNT(sp.id) = 0  -- Members without purchases
ORDER BY fg.created_at DESC;

-- 9. Check subscription periods alignment
-- Verifies that family subscription periods match Stripe subscription periods
SELECT 
  fs.id,
  fs.stripe_subscription_id,
  fs.current_period_start,
  fs.current_period_end,
  fs.status,
  sp.purchased_at,
  sp.cancelled_at,
  CASE 
    WHEN fs.current_period_end < NOW() AND fs.status = 'active' THEN '⚠️ Period expired but still active'
    WHEN fs.current_period_start > fs.current_period_end THEN '❌ Invalid period'
    ELSE '✅ Valid period'
  END as period_status
FROM family_subscriptions fs
LEFT JOIN service_purchases sp ON sp.stripe_subscription_id = fs.stripe_subscription_id
WHERE fs.stripe_subscription_id IS NOT NULL
ORDER BY fs.created_at DESC
LIMIT 10;

-- 10. Verify subscription quantity vs member count
-- Compares Stripe subscription quantity with active member count
-- Note: This requires checking Stripe API for actual quantity, but we can check our records
SELECT 
  fs.id,
  fs.family_group_id,
  fs.plan_name,
  fs.stripe_subscription_id,
  (SELECT COUNT(*) FROM family_members 
   WHERE family_group_id = fs.family_group_id AND status = 'active') as active_member_count,
  -- Note: Subscription quantity would need to be fetched from Stripe API
  fs.status
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id IS NOT NULL
ORDER BY fs.created_at DESC;

-- ============================================================================
-- Specific Test Verification Queries
-- ============================================================================

-- Verify Test 1: New Family Plan Purchase
-- Replace 'test@example.com' with your test user email
SELECT 
  'Family Group' as check_type,
  fg.id, fg.family_name, fg.admin_user_id,
  (SELECT email FROM user_profiles WHERE id = fg.admin_user_id) as admin_email
FROM family_groups fg
WHERE fg.admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com')
UNION ALL
SELECT 
  'Family Subscription' as check_type,
  fs.id::text, fs.plan_name, NULL, fs.stripe_subscription_id
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fg.admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com')
UNION ALL
SELECT 
  'Service Purchase' as check_type,
  sp.id::text, s.name, NULL, sp.status
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
JOIN user_profiles u ON u.id = sp.user_id
WHERE u.email = 'test@example.com'
AND s.slug LIKE '%family%';

-- Verify specific subscription
-- Replace 'sub_XXXXX' with actual subscription ID
SELECT 
  fs.*,
  fg.family_name,
  (SELECT email FROM user_profiles WHERE id = fg.admin_user_id) as admin_email,
  (SELECT COUNT(*) FROM family_members WHERE family_group_id = fg.id AND status = 'active') as member_count
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX';


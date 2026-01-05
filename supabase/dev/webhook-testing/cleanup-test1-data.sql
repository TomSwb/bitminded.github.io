-- ============================================================================
-- Cleanup Test 1 Data - Remove all test family plan data
-- ============================================================================
-- Purpose: Clean up all test data from Test 1 so we can start fresh
-- Database: PROD (dynxqnrkmjcvgzsugxtm) - Run in PROD SQL Editor
-- Test User: dev@bitminded.ch
-- ============================================================================
-- WARNING: This will delete all family plan test data for dev@bitminded.ch
-- Make sure you're running this in the correct database!
-- ============================================================================

BEGIN;

-- Step 1: Delete service purchases for test subscriptions
DELETE FROM service_purchases
WHERE stripe_subscription_id IN (
  'sub_1Sm653PBAwkcNEBlHYEpWObe',  -- Latest test
  'sub_1Sm5tMPBAwkcNEBllMPfm4rr',  -- Previous test
  'sub_1Sm5hjPBAwkcNEBlVHLMX12Q'   -- First test
)
OR (user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4' 
    AND service_id IN (
      SELECT id FROM services WHERE slug LIKE '%family%'
    )
);

-- Step 2: Delete family subscriptions for test subscriptions
DELETE FROM family_subscriptions
WHERE stripe_subscription_id IN (
  'sub_1Sm653PBAwkcNEBlHYEpWObe',  -- Latest test
  'sub_1Sm5tMPBAwkcNEBllMPfm4rr',  -- Previous test
  'sub_1Sm5hjPBAwkcNEBlVHLMX12Q'   -- First test
);

-- Step 3: Delete family members for the test user's family group
DELETE FROM family_members
WHERE family_group_id IN (
  SELECT id FROM family_groups 
  WHERE admin_user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
);

-- Step 4: Delete family groups for the test user
DELETE FROM family_groups
WHERE admin_user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4';

-- Step 5: (Optional) Clean up error logs from these tests
-- Uncomment if you want to clean error logs too
/*
DELETE FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
  error_details::text LIKE '%sub_1Sm653PBAwkcNEBlHYEpWObe%'
  OR error_details::text LIKE '%sub_1Sm5tMPBAwkcNEBllMPfm4rr%'
  OR error_details::text LIKE '%sub_1Sm5hjPBAwkcNEBlVHLMX12Q%'
  OR error_details::text LIKE '%cs_test_a13hgTrA5ZJ3oOQhQv6fThKMLNGJghwmAc5lgliqjzFzBt5thMVhEMb6L2%'
  OR error_details::text LIKE '%cs_test_a1R80g6RyGlObN76EUp7ZwuebUJTfzFlZv0RjOnUPSoRVIPpc4Ku5XMFq2%'
  OR error_details::text LIKE '%cs_test_a1q2xnKjV13zJOouzmK6rgQ8T5rey02T29JwHx6Yk47UilXXf3GnD3e86F%'
);
*/

-- Verification: Check that everything was deleted
SELECT 
  'Family Groups' as component,
  COUNT(*) as remaining_count
FROM family_groups
WHERE admin_user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
UNION ALL
SELECT 
  'Family Subscriptions' as component,
  COUNT(*) as remaining_count
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fg.admin_user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
UNION ALL
SELECT 
  'Family Members' as component,
  COUNT(*) as remaining_count
FROM family_members fm
JOIN family_groups fg ON fg.id = fm.family_group_id
WHERE fg.admin_user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
UNION ALL
SELECT 
  'Service Purchases (Family)' as component,
  COUNT(*) as remaining_count
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
WHERE sp.user_id = 'd7c62fc8-7f13-403b-b87f-d59f76709ab4'
AND s.slug LIKE '%family%'
AND sp.stripe_subscription_id IN (
  'sub_1Sm653PBAwkcNEBlHYEpWObe',
  'sub_1Sm5tMPBAwkcNEBllMPfm4rr',
  'sub_1Sm5hjPBAwkcNEBlVHLMX12Q'
);

-- If all counts are 0, the cleanup was successful
-- If not, check for foreign key constraints or other issues

COMMIT;

-- ============================================================================
-- After running this cleanup:
-- 1. All test family plan data will be removed
-- 2. You can create a new checkout session and test the complete flow
-- 3. The webhook should now work correctly with all fixes deployed
-- ============================================================================

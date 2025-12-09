# Family Plan Webhook Handler - Test Execution Checklist

**Status**: Ready for Testing  
**Deployment Date**: 2025-12-09  
**Environment**: DEV (eygpejbljuqpxwwoawkn)  
**Implementation**: Item 15.9.3 - Family Plan Webhook Handler

---

## Phase 1: Pre-Deployment Verification ✅

### 1.1 Database Schema Verification

Run in Supabase SQL Editor (DEV):
```sql
-- Check family plan tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('family_groups', 'family_members', 'family_subscriptions');

-- Verify services table has family plan services
SELECT id, name, slug, stripe_product_id, stripe_price_id 
FROM services 
WHERE slug IN ('all-tools-membership-family', 'supporter-tier-family');
```

**Expected Results:**
- ✅ All 3 tables exist
- ✅ Both family plan services exist with Stripe product/price IDs configured

**Status**: ✅ **VERIFIED** (2025-12-09)
- ✅ All 3 tables exist (family_groups, family_members, family_subscriptions)
- ✅ Both family plan services exist with Stripe product/price IDs configured
  - `all-tools-membership-family`: prod_TUTG8XZ4EbXhY4 / price_1SXUKQPBAwkcNEBl08KaDt2o
  - `supporter-tier-family`: prod_TUTHtMLJGyofEk / price_1SXULJPBAwkcNEBlOrfdc9QK
- ✅ Test user created: `dev@bitminded.ch`

---

## Phase 2: Deployment to DEV ✅

### 2.1 Function Deployment

```bash
cd /home/tomswb/bitminded.github.io
supabase functions deploy stripe-webhook --project-ref eygpejbljuqpxwwoawkn --no-verify-jwt
```

**Status**: ✅ **COMPLETED** (2025-12-09)

### 2.2 Verify Deployment

- [ ] Check Supabase Dashboard → Edge Functions → stripe-webhook
- [ ] Confirm latest deployment timestamp
- [ ] Verify environment variables are set correctly

**Dashboard Link**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions/stripe-webhook

**Status**: ☐ Verified

---

## Phase 3: Test Setup

### 3.1 Setup Stripe CLI Webhook Forwarding

**Terminal 1 - Webhook Forwarding:**
```bash
# Ensure Stripe CLI is in test mode
stripe config --set test_mode true

# Start webhook forwarding
stripe listen --forward-to https://eygpejbljuqpxwwoawkn.supabase.co/functions/v1/stripe-webhook
```

**Note**: Keep this terminal running during all tests. It will show webhook events being forwarded.

**Status**: ✅ **COMPLETED** (2025-12-09)
- Stripe CLI verified installed and configured
- Webhook forwarding setup instructions provided

### 3.2 Monitor Function Logs

**Terminal 2 - Monitor Logs (Browser):**
Open in browser: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions/stripe-webhook/logs

Keep this tab open to monitor function execution in real-time.

**Status**: ✅ **COMPLETED** (2025-12-09)
- Function logs monitoring URL configured

---

## Phase 4: Test Execution

Execute each test scenario systematically. Verify results before proceeding to next test.

### Test 1: New Family Plan Purchase (Creates Family Group)

**Purpose**: Verify that a new family plan purchase creates a family group and grants access.

**Steps:**
1. Create a test user in database (if needed)
   - Email: `test-family@example.com` (or use existing test user)
   - Ensure user exists in `user_profiles` table

2. Create a Stripe checkout session for family plan service:
   - Service: `all-tools-membership-family` or `supporter-tier-family`
   - Add metadata: `is_family_plan: 'true'`
   - OR ensure product name contains "Family"

3. Complete checkout with test card: `4242 4242 4242 4242`

4. Verify webhook processed:
   - Check Terminal 1 (Stripe CLI) for event receipt
   - Check Terminal 2 (Function logs) for processing

**Database Verification Queries:**
```sql
-- Replace 'test@example.com' with your test user email
-- 1. Check family group was created
SELECT fg.id, fg.family_name, fg.admin_user_id, fg.subscription_id,
       u.email as admin_email
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE fg.admin_user_id = (
  SELECT id FROM user_profiles WHERE email = 'test@example.com'
);

-- 2. Check family subscription was created
SELECT fs.id, fs.plan_name, fs.status, fs.stripe_subscription_id,
       fs.current_period_start, fs.current_period_end
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE u.email = 'test@example.com';

-- 3. Check admin was added as family member
SELECT fm.id, fm.role, fm.status, fm.user_id, u.email
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
WHERE fm.family_group_id = (
  SELECT id FROM family_groups 
  WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com')
);

-- 4. Check service_purchases were created for admin
SELECT sp.id, sp.user_id, sp.service_id, sp.purchase_type, 
       sp.amount_paid, sp.status, sp.stripe_subscription_id,
       s.name as service_name
FROM service_purchases sp
JOIN services s ON s.id = sp.service_id
JOIN user_profiles u ON u.id = sp.user_id
WHERE u.email = 'test@example.com'
AND s.slug LIKE '%family%'
ORDER BY sp.purchased_at DESC;
```

**Expected Results:**
- ✅ Family group created with user as admin
- ✅ Family subscription created with correct `plan_name` (`family_all_tools` or `family_supporter`)
- ✅ Admin added as active family member with role 'admin'
- ✅ Service purchase record created for admin
- ✅ Family group linked to subscription

**Actual Results:**
- ☐ Family group: __________
- ☐ Family subscription: __________
- ☐ Family member: __________
- ☐ Service purchase: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 2: Existing Family Member Purchases Family Plan

**Purpose**: Verify that if user already has a family group, purchase links to existing group instead of creating new one.

**Steps:**
1. Use test user from Test 1 (already has family group)
2. Create another checkout for same user (or different user in same family)
3. Complete checkout
4. Verify webhook processed

**Database Verification Queries:**
```sql
-- Should still be only ONE family group for this user
SELECT COUNT(*) as family_count
FROM family_groups
WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com');

-- Should link to existing family group
SELECT fs.family_group_id, fg.family_name
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID
```

**Expected Results:**
- ✅ No new family group created (reuses existing)
- ✅ Subscription linked to existing family group
- ✅ Access granted to all existing members

**Actual Results:**
- ☐ Family group count: __________
- ☐ Subscription linked: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 3: Subscription Creation Event

**Purpose**: Verify that `customer.subscription.created` properly links to family subscription.

**Steps:**
1. Manually trigger event:
```bash
stripe trigger customer.subscription.created
```
OR create subscription in Stripe Dashboard

2. Verify webhook processed

**Database Verification Queries:**
```sql
-- Check family subscription was linked
SELECT fs.*, fg.family_name
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID
```

**Expected Results:**
- ✅ Family subscription record updated with subscription details
- ✅ Family group `subscription_id` updated

**Actual Results:**
- ☐ Subscription linked: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 4: Subscription Update (Quantity/Member Count Change)

**Purpose**: Verify that subscription quantity changes are detected and logged.

**Steps:**
1. Update subscription quantity in Stripe Dashboard
   - Go to Subscriptions → Select subscription → Update quantity
2. Stripe will send `customer.subscription.updated` event
3. Verify webhook processed

**Database Verification Queries:**
```sql
-- Check subscription status and periods
SELECT fs.status, fs.current_period_start, fs.current_period_end,
       fs.stripe_subscription_id
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID

-- Check active member count vs subscription quantity
SELECT 
  (SELECT COUNT(*) FROM family_members 
   WHERE family_group_id = fs.family_group_id AND status = 'active') as active_members,
  fs.stripe_subscription_id
FROM family_subscriptions fs
WHERE fs.id = 'XXX'; -- Replace with actual subscription ID
```

**Expected Results:**
- ✅ Family subscription status and periods updated
- ✅ Quantity change logged (member count will be updated via family management UI later)

**Actual Results:**
- ☐ Subscription updated: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 5: Subscription Cancellation

**Purpose**: Verify that cancellation marks subscription as cancelled and schedules revocation at period end.

**Steps:**
1. Cancel subscription in Stripe Dashboard
2. Stripe sends `customer.subscription.deleted` event
3. Verify webhook processed

**Database Verification Queries:**
```sql
-- Check subscription marked as cancelled
SELECT fs.status, fs.current_period_end
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID

-- Check service_purchases marked as cancelled (at period end)
SELECT sp.status, sp.cancelled_at, sp.user_id, u.email
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID
```

**Expected Results:**
- ✅ Family subscription status = `canceled`
- ✅ Service purchases marked as `cancelled` with `cancelled_at` = period end
- ✅ Access revoked at period end (not immediately)

**Actual Results:**
- ☐ Subscription cancelled: __________
- ☐ Service purchases updated: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 6: Invoice Payment (Renewal)

**Purpose**: Verify that invoice payment renews access for all active family members.

**Steps:**
1. Create a subscription that will generate an invoice
2. Pay invoice (or wait for auto-pay)
3. Stripe sends `invoice.paid` event
4. Verify webhook processed

**Database Verification Queries:**
```sql
-- Check billing period updated
SELECT fs.current_period_start, fs.current_period_end, fs.status
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX'; -- Replace with actual subscription ID

-- Check access renewed for all members
SELECT sp.id, sp.user_id, sp.status, sp.purchased_at, u.email
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
JOIN family_subscriptions fs ON fs.stripe_subscription_id = sp.stripe_subscription_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX' -- Replace with actual subscription ID
ORDER BY sp.purchased_at DESC;
```

**Expected Results:**
- ✅ Family subscription billing periods updated
- ✅ Service purchases renewed for all active members
- ✅ `purchased_at` updated to current period start

**Actual Results:**
- ☐ Billing periods updated: __________
- ☐ Service purchases renewed: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 7: Invalid Plan Name

**Purpose**: Verify error handling for invalid plan names.

**Steps:**
1. Try to create family subscription with invalid plan (not `family_all_tools` or `family_supporter`)
2. Verify error is logged

**Verification:**
```sql
SELECT * FROM error_logs 
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%family%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results:**
- ✅ Error is logged to `error_logs` table
- ✅ Error message indicates invalid plan name

**Actual Results:**
- ☐ Error logged: __________
- ☐ Error message: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 8: Missing Service in Database

**Purpose**: Verify error handling when Stripe product doesn't exist in database.

**Steps:**
1. Try checkout with Stripe product that doesn't exist in database
2. Verify error is logged and handled gracefully

**Expected Results:**
- ✅ Error is logged
- ✅ Webhook responds successfully (doesn't crash)
- ✅ User-friendly error message in logs

**Actual Results:**
- ☐ Error handled gracefully: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 9: User Not Found

**Purpose**: Verify error handling when user doesn't exist in database.

**Steps:**
1. Create checkout with email that doesn't exist in database
2. Verify error is logged

**Expected Results:**
- ✅ Error is logged to `error_logs` table
- ✅ Error message indicates user not found

**Actual Results:**
- ☐ Error logged: __________
- ☐ Error message: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

### Test 10: Multiple Family Members Access

**Purpose**: Verify all family members get access when subscription is active.

**Steps:**
1. Add additional members to family group (manually via database or future UI)
2. Verify all members get access when subscription is active

**Database Verification:**
```sql
-- Check all active members have service purchases
SELECT 
  fm.user_id,
  u.email,
  COUNT(sp.id) as purchase_count,
  MAX(sp.status) as purchase_status
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id
JOIN services s ON s.id = sp.service_id AND s.slug LIKE '%family%'
WHERE fm.family_group_id = 'XXX' -- Replace with actual family group ID
AND fm.status = 'active'
GROUP BY fm.user_id, u.email;
```

**Expected Results:**
- ✅ All active family members have service purchase records
- ✅ All members have access to family plan services

**Actual Results:**
- ☐ All members have access: __________
- ☐ Errors: __________

**Status**: ☐ Pass ☐ Fail

**Notes**: __________

---

## Phase 5: Comprehensive Database Verification

### 5.1 Run All Verification Queries

Execute all queries from: `supabase/dev/webhook-testing/verify-family-plan-webhook.sql`

**Quick Summary Queries:**
```sql
-- 1. Check all family groups and their subscriptions
SELECT 
  fg.id as family_id,
  fg.family_name,
  u.email as admin_email,
  fs.plan_name,
  fs.status as subscription_status,
  fs.stripe_subscription_id,
  fs.current_period_start,
  fs.current_period_end,
  (SELECT COUNT(*) FROM family_members WHERE family_group_id = fg.id AND status = 'active') as active_member_count
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
ORDER BY fg.created_at DESC;

-- 2. Check for errors related to family plans
SELECT 
  id,
  error_type,
  error_message,
  error_details->>'family_group_id' as family_group_id,
  created_at
FROM error_logs
WHERE function_name = 'stripe-webhook'
AND (
  error_message LIKE '%family%'
  OR error_details::text LIKE '%family%'
)
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verify plan name validation
SELECT DISTINCT plan_name
FROM family_subscriptions
WHERE plan_name NOT IN ('family_all_tools', 'family_supporter');
-- This query should return 0 rows if validation is working
```

**Status**: ☐ All Queries Executed
**Results**: __________

---

## Phase 6: Test Summary

### Overall Test Results

| Test # | Description | Status | Notes |
|--------|-------------|--------|-------|
| 1 | New Family Plan Purchase | ☐ Pass ☐ Fail | |
| 2 | Existing Family Member Purchase | ☐ Pass ☐ Fail | |
| 3 | Subscription Creation Event | ☐ Pass ☐ Fail | |
| 4 | Subscription Update | ☐ Pass ☐ Fail | |
| 5 | Subscription Cancellation | ☐ Pass ☐ Fail | |
| 6 | Invoice Payment (Renewal) | ☐ Pass ☐ Fail | |
| 7 | Invalid Plan Name | ☐ Pass ☐ Fail | |
| 8 | Missing Service | ☐ Pass ☐ Fail | |
| 9 | User Not Found | ☐ Pass ☐ Fail | |
| 10 | Multiple Members Access | ☐ Pass ☐ Fail | |

**Overall Status**: ☐ All Tests Pass ☐ Some Tests Failed

### Issues Found

| Issue # | Description | Severity | Status | Notes |
|---------|-------------|----------|--------|-------|
| | | | | |

### Next Steps

- [ ] All DEV tests pass
- [ ] Issues documented and prioritized
- [ ] Ready for production deployment (Phase 7)

---

## Phase 7: Production Deployment

**⚠️ DO NOT PROCEED UNTIL ALL DEV TESTS PASS**

### 7.1 Deploy to Production

```bash
supabase functions deploy stripe-webhook --project-ref dynxqnrkmjcvgzsugxtm --no-verify-jwt
```

### 7.2 Verify Production Deployment

- [ ] Check Supabase Dashboard → Edge Functions → stripe-webhook (PROD)
- [ ] Verify environment variables are set correctly
- [ ] Test with a single low-risk webhook event if needed

**Dashboard Link**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook

### 7.3 Update Deployment Tracking

- [ ] Update `supabase/prod/deployed-functions.md` with deployment date
- [ ] Document any production-specific configuration

**Status**: ☐ Production Deployment Complete

---

## Reference Links

- **Testing Plan**: `supabase/functions/stripe-webhook/FAMILY-PLAN-TESTING.md`
- **Verification Queries**: `supabase/dev/webhook-testing/verify-family-plan-webhook.sql`
- **Implementation**: `supabase/functions/stripe-webhook/index.ts`
- **Database Schema**: `supabase/migrations/20251125_create_family_plans_schema.sql`

---

**Last Updated**: 2025-12-09  
**Test Executor**: __________  
**Test Date**: __________


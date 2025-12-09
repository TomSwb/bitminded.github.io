# Family Plan Webhook Handler Testing Plan

## Overview

This document provides a comprehensive testing plan for the Family Plan Webhook Handler implementation (Item 15.9.3). The handler detects and processes family plan purchases, manages family subscriptions, and grants/revokes access for family members.

**Related Documentation:**
- Implementation: `supabase/functions/stripe-webhook/index.ts`
- Database Schema: `supabase/migrations/20251125_create_family_plans_schema.sql`
- Family Plans Analysis: `docs/payment-financial/FAMILY-PLAN-SERVICES-SETUP.md`
- Priority List: `docs/planning/PRIORITY-LIST-TO-DO.md` (lines 68-115)

---

## Phase 1: Pre-Deployment Checklist

Before deploying, verify these prerequisites:

- [ ] **Family plan database schema is deployed** (migration `20251125_create_family_plans_schema.sql`)
- [ ] **Family plan services exist in database:**
  - `all-tools-membership-family`
  - `supporter-tier-family`
- [ ] **Services have Stripe product/price IDs configured** (for test mode)
- [ ] **Test user account exists** in database

**Verification Query:**
```sql
SELECT id, name, slug, stripe_product_id, stripe_price_id 
FROM services 
WHERE slug IN ('all-tools-membership-family', 'supporter-tier-family');
```

---

## Phase 2: Deployment

### Step 1: Deploy to DEV First

```bash
# Navigate to project root
cd /home/tomswb/bitminded.github.io

# Deploy to dev environment
supabase functions deploy stripe-webhook --project-ref eygpejbljuqpxwwoawkn --no-verify-jwt
```

**Verify deployment:**
- Check Supabase Dashboard → Edge Functions → stripe-webhook
- Should show latest deployment timestamp

### Step 2: Test in DEV

Complete all test scenarios in DEV before deploying to production.

### Step 3: Deploy to PRODUCTION

```bash
# Deploy to production (only after DEV testing passes)
supabase functions deploy stripe-webhook --project-ref dynxqnrkmjcvgzsugxtm --no-verify-jwt
```

---

## Phase 3: Test Setup

### Setup Stripe CLI Forwarding (Recommended)

**Terminal 1 - Webhook Forwarding:**
```bash
# For DEV testing
stripe listen --forward-to https://eygpejbljuqpxwwoawkn.supabase.co/functions/v1/stripe-webhook

# For PROD testing (use with caution)
stripe listen --forward-to https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook
```

**Terminal 2 - Monitor Logs:**
```bash
# Watch Supabase function logs in real-time
# Visit: https://supabase.com/dashboard/project/[PROJECT_REF]/functions/stripe-webhook/logs
```

**Ensure Stripe CLI is in test mode:**
```bash
stripe config --set test_mode true
```

---

## Phase 4: Test Scenarios

### Test 1: New Family Plan Purchase (Creates Family Group)

**Purpose:** Verify that a new family plan purchase creates a family group and grants access.

**Steps:**
1. Create a test user in database (if needed)
2. Create a Stripe checkout session for family plan service:
   - Service: `all-tools-membership-family` or `supporter-tier-family`
   - Add metadata: `is_family_plan: 'true'`
   - OR ensure product name contains "Family"
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Verify webhook processed: Check function logs

**Verify in Database:**
```sql
-- Check family group was created
SELECT fg.id, fg.family_name, fg.admin_user_id, fg.subscription_id,
       u.email as admin_email
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE fg.admin_user_id = (
  SELECT id FROM user_profiles WHERE email = 'test@example.com'
);

-- Check family subscription was created
SELECT fs.id, fs.plan_name, fs.status, fs.stripe_subscription_id,
       fs.current_period_start, fs.current_period_end
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
JOIN user_profiles u ON u.id = fg.admin_user_id
WHERE u.email = 'test@example.com';

-- Check admin was added as family member
SELECT fm.id, fm.role, fm.status, fm.user_id, u.email
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
WHERE fm.family_group_id = (
  SELECT id FROM family_groups 
  WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com')
);

-- Check service_purchases were created for admin
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

---

### Test 2: Existing Family Member Purchases Family Plan

**Purpose:** Verify that if user already has a family group, purchase links to existing group instead of creating new one.

**Steps:**
1. Use test user from Test 1 (already has family group)
2. Create another checkout for same user (or different user in same family)
3. Complete checkout
4. Verify webhook processed

**Verify in Database:**
```sql
-- Should still be only ONE family group for this user
SELECT COUNT(*) as family_count
FROM family_groups
WHERE admin_user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com');

-- Should link to existing family group
SELECT fs.family_group_id, fg.family_name
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX';
```

**Expected Results:**
- ✅ No new family group created (reuses existing)
- ✅ Subscription linked to existing family group
- ✅ Access granted to all existing members

---

### Test 3: Subscription Creation Event

**Purpose:** Verify that `customer.subscription.created` properly links to family subscription.

**Steps:**
1. Manually trigger or wait for Stripe to send:
```bash
stripe trigger customer.subscription.created
```
OR create subscription in Stripe Dashboard

**Verify in Database:**
```sql
-- Check family subscription was linked
SELECT fs.*, fg.family_name
FROM family_subscriptions fs
JOIN family_groups fg ON fg.id = fs.family_group_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX';
```

**Expected Results:**
- ✅ Family subscription record updated with subscription details
- ✅ Family group `subscription_id` updated

---

### Test 4: Subscription Update (Quantity/Member Count Change)

**Purpose:** Verify that subscription quantity changes are detected and logged.

**Steps:**
1. Update subscription quantity in Stripe Dashboard
   - Go to Subscriptions → Select subscription → Update quantity
2. Stripe will send `customer.subscription.updated` event
3. Verify webhook processed

**Verify in Database:**
```sql
-- Check subscription status and periods
SELECT fs.status, fs.current_period_start, fs.current_period_end,
       fs.stripe_subscription_id
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX';

-- Check active member count vs subscription quantity
SELECT 
  (SELECT COUNT(*) FROM family_members 
   WHERE family_group_id = fs.family_group_id AND status = 'active') as active_members,
  fs.stripe_subscription_id
FROM family_subscriptions fs
WHERE fs.id = 'XXX';
```

**Expected Results:**
- ✅ Family subscription status and periods updated
- ✅ Quantity change logged (member count will be updated via family management UI later)

---

### Test 5: Subscription Cancellation

**Purpose:** Verify that cancellation marks subscription as cancelled and schedules revocation at period end.

**Steps:**
1. Cancel subscription in Stripe Dashboard
2. Stripe sends `customer.subscription.deleted` event
3. Verify webhook processed

**Verify in Database:**
```sql
-- Check subscription marked as cancelled
SELECT fs.status, fs.current_period_end
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX';

-- Check service_purchases marked as cancelled (at period end)
SELECT sp.status, sp.cancelled_at, sp.user_id, u.email
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_XXXXX';
```

**Expected Results:**
- ✅ Family subscription status = `canceled`
- ✅ Service purchases marked as `cancelled` with `cancelled_at` = period end
- ✅ Access revoked at period end (not immediately)

---

### Test 6: Invoice Payment (Renewal)

**Purpose:** Verify that invoice payment renews access for all active family members.

**Steps:**
1. Create a subscription that will generate an invoice
2. Pay invoice (or wait for auto-pay)
3. Stripe sends `invoice.paid` event
4. Verify webhook processed

**Verify in Database:**
```sql
-- Check billing period updated
SELECT fs.current_period_start, fs.current_period_end, fs.status
FROM family_subscriptions fs
WHERE fs.stripe_subscription_id = 'sub_XXXXX';

-- Check access renewed for all members
SELECT sp.id, sp.user_id, sp.status, sp.purchased_at, u.email
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
JOIN family_subscriptions fs ON fs.stripe_subscription_id = sp.stripe_subscription_id
WHERE fs.stripe_subscription_id = 'sub_XXXXX'
ORDER BY sp.purchased_at DESC;
```

**Expected Results:**
- ✅ Family subscription billing periods updated
- ✅ Service purchases renewed for all active members
- ✅ `purchased_at` updated to current period start

---

## Phase 5: Edge Cases & Error Scenarios

### Test 7: Invalid Plan Name

**Steps:**
1. Try to create family subscription with invalid plan (not `family_all_tools` or `family_supporter`)
2. Verify error is logged

**Verify Error Logging:**
```sql
SELECT * FROM error_logs 
WHERE function_name = 'stripe-webhook'
AND error_message LIKE '%family%'
ORDER BY created_at DESC
LIMIT 5;
```

---

### Test 8: Missing Service in Database

**Steps:**
1. Try checkout with Stripe product that doesn't exist in database
2. Verify error is logged and handled gracefully

---

### Test 9: User Not Found

**Steps:**
1. Create checkout with email that doesn't exist in database
2. Verify error is logged

---

### Test 10: Multiple Family Members Access

**Steps:**
1. Add additional members to family group (manually via database or future UI)
2. Verify all members get access when subscription is active

**Verify:**
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
WHERE fm.family_group_id = 'XXX'
AND fm.status = 'active'
GROUP BY fm.user_id, u.email;
```

---

## Phase 6: Database Verification Queries

See `supabase/dev/webhook-testing/verify-family-plan-webhook.sql` for comprehensive verification queries.

**Quick Verification:**
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

-- 2. Check all family members and their access
SELECT 
  fm.family_group_id,
  fg.family_name,
  u.email,
  fm.role,
  fm.status as member_status,
  sp.status as purchase_status,
  sp.purchased_at,
  s.name as service_name
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
JOIN family_groups fg ON fg.id = fm.family_group_id
LEFT JOIN service_purchases sp ON sp.user_id = fm.user_id
LEFT JOIN services s ON s.id = sp.service_id AND s.slug LIKE '%family%'
ORDER BY fm.created_at DESC;

-- 3. Check recent family plan service purchases
SELECT 
  sp.id,
  u.email,
  s.name as service_name,
  s.slug,
  sp.purchase_type,
  sp.amount_paid,
  sp.status,
  sp.stripe_subscription_id,
  sp.purchased_at,
  sp.cancelled_at
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
JOIN services s ON s.id = sp.service_id
WHERE s.slug LIKE '%family%'
ORDER BY sp.purchased_at DESC
LIMIT 20;

-- 4. Check for errors related to family plans
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

-- 5. Verify plan name validation (should only be family_all_tools or family_supporter)
SELECT DISTINCT plan_name
FROM family_subscriptions
WHERE plan_name NOT IN ('family_all_tools', 'family_supporter');
-- This query should return 0 rows if validation is working
```

---

## Phase 7: Manual Testing Scenarios

For scenarios that Stripe CLI can't fully simulate:

1. **Real Checkout Flow:**
   - Create actual checkout session via your frontend
   - Complete payment with test card
   - Verify webhook processes correctly

2. **Subscription Lifecycle:**
   - Create subscription in Stripe Dashboard
   - Wait for invoice generation
   - Pay invoice manually
   - Verify renewal processing

3. **Member Management:**
   - Manually add members to family group via database
   - Verify they get access on next renewal

---

## Phase 8: Troubleshooting

### Common Issues

**Issue: Family group not created**
- Check function logs for errors
- Verify user exists in database
- Check error_logs table

**Issue: Service purchase not created**
- Verify service exists in database
- Check Stripe product/price IDs match
- Verify family members are active

**Issue: Wrong plan name**
- Check service slug mapping
- Verify `mapServiceSlugToPlanName()` function
- Check database constraint error logs

**Issue: Access not granted**
- Verify `grantFamilyAccess()` was called
- Check family members are active
- Verify service_purchases records exist

---

## Phase 9: Performance & Monitoring

After deployment, monitor:

1. **Function Logs:**
   - Check for errors
   - Monitor processing times
   - Watch for rate limiting

2. **Database:**
   - Monitor family_subscriptions table growth
   - Check for orphaned records
   - Verify RLS policies work correctly

3. **Stripe Dashboard:**
   - Monitor webhook delivery success rate
   - Check for failed deliveries
   - Review event timelines

---

## Quick Reference

### Deployment Commands

```bash
# DEV
supabase functions deploy stripe-webhook --project-ref eygpejbljuqpxwwoawkn --no-verify-jwt

# PROD
supabase functions deploy stripe-webhook --project-ref dynxqnrkmjcvgzsugxtm --no-verify-jwt
```

### Stripe CLI Commands

```bash
# Forward webhooks
stripe listen --forward-to https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook

# Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
```

### Dashboard Links

- **DEV Functions:** https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions/stripe-webhook
- **PROD Functions:** https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook
- **Stripe Test Mode:** https://dashboard.stripe.com/test

---

## Testing Checklist

- [ ] Phase 1: Pre-deployment checklist completed
- [ ] Phase 2: Deployed to DEV
- [ ] Test 1: New family plan purchase
- [ ] Test 2: Existing family member purchase
- [ ] Test 3: Subscription creation event
- [ ] Test 4: Subscription update
- [ ] Test 5: Subscription cancellation
- [ ] Test 6: Invoice payment (renewal)
- [ ] Test 7: Invalid plan name (error handling)
- [ ] Test 8: Missing service (error handling)
- [ ] Test 9: User not found (error handling)
- [ ] Test 10: Multiple members access
- [ ] Phase 9: Performance monitoring setup
- [ ] Deployed to PRODUCTION (after DEV testing passes)

---

**Last Updated:** 2025-01-XX  
**Status:** Ready for Testing  
**Related Implementation:** Item 15.9.3 - Family Plan Webhook Handler Updates


# Stripe Webhook Handler - Comprehensive Testing Guide

This guide covers testing all 29 webhook events handled by the Stripe webhook handler.

## Overview

The webhook handler processes the following event categories:
- **Core Purchase/Subscription Events** (9 events)
- **Invoice Events** (5 events)
- **Payment Success/Failure Events** (4 events)
- **Refund Events** (3 events)
- **Dispute Events** (5 events)
- **Trial & Subscription Update Events** (3 events)

**Total: 29 events**

---

## Testing Tools & Setup

### ✅ Verified and Ready

All tools have been verified and are ready for testing:

- **Stripe CLI**: v1.32.0 - Installed and authenticated
- **Supabase CLI**: v2.58.5 - Installed and linked to project
- **Webhook Handler**: Deployed and active (version 23)
- **Secrets**: All configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY)
- **Project**: Linked to `dynxqnrkmjcvgzsugxtm` (BitMinded production)

### Stripe CLI Commands

**Check Status:**
```bash
stripe --version                    # Check CLI version
stripe config --list                # View authentication status
```

**Forward Events to Webhook (Recommended for Testing):**
```bash
# Terminal 1: Start forwarding (keeps running)
stripe listen --forward-to https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook

# Terminal 2: Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger customer.subscription.paused
stripe trigger customer.subscription.resumed
stripe trigger invoice.payment_failed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
stripe trigger customer.subscription.trial_will_end
```

**Note:** When using `stripe listen`, it provides a webhook signing secret (starts with `whsec_`). You can either:
- Use the CLI secret temporarily for testing
- Or keep using your Dashboard webhook secret (already configured)

**Direct Event Trigger (Sends to Stripe's servers, then to your webhook):**
```bash
# These trigger events that Stripe then delivers to your configured webhook
stripe trigger checkout.session.completed
stripe trigger invoice.paid
# ... etc
```

### Supabase CLI Commands

**Project Management:**
```bash
cd /home/tomswb/bitminded.github.io
supabase projects list              # List all projects
supabase link --project-ref dynxqnrkmjcvgzsugxtm  # Link to project
supabase status                     # Check project status
```

**Function Management:**
```bash
supabase functions list             # List all deployed functions
supabase functions deploy stripe-webhook --project-ref dynxqnrkmjcvgzsugxtm  # Deploy function
supabase functions deploy stripe-webhook --project-ref dynxqnrkmjcvgzsugxtm --no-verify-jwt  # Deploy without JWT verification
```

**Secrets Management:**
```bash
supabase secrets list               # List all secrets
supabase secrets set KEY=value      # Set a secret
```

**Note:** Logs are best viewed via the Supabase Dashboard (see links below).

### Dashboard Links

**Supabase Dashboard:**
- **Project**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm
- **Edge Functions**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions
- **Webhook Function**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook
- **Function Logs**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook/logs
- **SQL Editor**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/editor

**Stripe Dashboard:**
- **Test Mode**: https://dashboard.stripe.com/test
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Event Deliveries**: https://dashboard.stripe.com/test/webhooks (click on webhook endpoint)
- **Events**: https://dashboard.stripe.com/test/events
- **Customers**: https://dashboard.stripe.com/test/customers
- **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
- **Invoices**: https://dashboard.stripe.com/test/invoices
- **Payments**: https://dashboard.stripe.com/test/payments

### Recommended Testing Workflow

**Option 1: Stripe CLI Forwarding (Fastest Iteration)**
```bash
# Terminal 1: Start forwarding
stripe listen --forward-to https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook

# Terminal 2: Trigger events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
# ... etc

# Browser: View logs in real-time
# Supabase Dashboard → Edge Functions → stripe-webhook → Logs
```

**Option 2: Stripe Dashboard (Production-like)**
1. Create checkout session or subscription in Stripe Dashboard
2. Complete payment with test card
3. Events automatically delivered to webhook
4. View logs in Supabase Dashboard
5. Verify database updates

**Option 3: Combined (Comprehensive)**
- Use Stripe CLI for quick event testing
- Use Stripe Dashboard for end-to-end flow testing
- Monitor both Stripe Dashboard event deliveries and Supabase logs

### Database Verification Queries

**Check Purchase Records:**
```sql
-- View all purchases
SELECT * FROM product_purchases ORDER BY purchased_at DESC LIMIT 10;

-- Check specific subscription
SELECT * FROM product_purchases WHERE stripe_subscription_id = 'sub_XXXXX';

-- Check recent errors
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;

-- Verify user exists
SELECT id, email FROM user_profiles WHERE email = 'test@example.com';

-- Verify product exists
SELECT id, name, stripe_product_id, stripe_price_id FROM products WHERE stripe_product_id = 'prod_XXXXX';
```

### Quick Reference

**Webhook Endpoint:**
```
https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook
```

**Project Reference:**
```
dynxqnrkmjcvgzsugxtm (BitMinded production)
```

**Test Mode:**
- All testing should be done in **Stripe Test Mode**
- Use test cards: `4242 4242 4242 4242` (Visa, always succeeds)
- Test card documentation: https://stripe.com/docs/testing

---

## Phase 1: One-Time Payment Flow ✅

### Test 1.1: Checkout Session Completed
- [x] `checkout.session.completed` - ✅ Tested and working
- [x] `charge.succeeded` - ✅ Tested and working

**Status:** ✅ Complete - Purchase records created correctly for one-time payments

---

## Phase 2: Subscription Creation and Lifecycle

### Test 2.1: Create Subscription Product ✅
1. In Stripe Dashboard → Products → Create product
2. Set type: **Subscription**
3. Set price: CHF 10.00/month (or yearly)
4. Create product
5. Add product to database:
   ```sql
   INSERT INTO products (
       name, slug, description, pricing_type,
       price_amount, price_currency,
       stripe_product_id, stripe_price_id, status
   ) VALUES (
       'Test Subscription', 'test-subscription-' || gen_random_uuid()::text,
       'Test subscription product', 'subscription',
       10.00, 'CHF',
       'prod_XXXXX', 'price_XXXXX', 'active'
   );
   ```

**Status:** ✅ Complete

### Test 2.2: Create Subscription via Checkout ✅
1. Create checkout session for subscription:
   ```bash
   stripe checkout sessions create \
     --line-items[0][price]=price_XXXXX \
     --line-items[0][quantity]=1 \
     --mode=subscription \
     --success-url=https://stripe.com/success \
     --cancel-url=https://stripe.com/cancel
   ```
2. Complete checkout with test card: `4242 4242 4242 4242`
3. Expected events:
   - [x] `checkout.session.completed` - ✅ Working
   - [x] `customer.subscription.created` - ✅ Working
   - [x] `invoice.created` - ✅ Working
   - [x] `invoice.finalized` - ✅ Working
   - [x] `invoice.paid` - ✅ Working (creates purchase with trial info)
   - [x] `charge.succeeded` - ✅ Working

**Status:** ✅ Complete - Subscription purchase records created correctly with:
- Trial period detection (is_trial, trial_start, trial_end)
- Subscription interval (monthly/yearly)
- Correct period dates
- Product and price matching

### Test 2.3: Subscription Update
**Goal:** Test subscription plan changes, quantity updates, and proration

**Steps:**
1. In Stripe Dashboard → Customers → Find your test customer → Subscriptions
2. Click on the subscription → Click "Update subscription"
3. Change plan (upgrade/downgrade) or change quantity
4. Confirm the update

**Expected Events:**
- [ ] `customer.subscription.updated`
- [ ] `invoice.created` (proration invoice if applicable)
- [ ] `invoice.finalized`
- [ ] `invoice.paid` (if auto-pay enabled)

**What to Verify:**
- Check `product_purchases` table - subscription should be updated
- Verify `current_period_start` and `current_period_end` are correct
- Check `subscription_interval` matches new plan
- Verify `amount_paid` reflects new pricing

**Status:** ⏳ Ready to test

### Test 2.4: Subscription Pause
**Goal:** Test subscription pausing functionality

**Steps:**
1. In Stripe Dashboard → Subscriptions → Find active subscription
2. Click "..." menu → Select "Pause subscription"
3. Choose pause behavior (immediately or at period end)
4. Confirm pause

**Expected Events:**
- [ ] `customer.subscription.paused`

**What to Verify:**
- Check `product_purchases` table - `status` should be `'suspended'`
- Verify subscription is paused in Stripe Dashboard

**Status:** ⏳ Ready to test

### Test 2.5: Subscription Resume
**Goal:** Test resuming a paused subscription

**Steps:**
1. In Stripe Dashboard → Subscriptions → Find paused subscription
2. Click "Resume subscription"
3. Confirm resume

**Expected Events:**
- [ ] `customer.subscription.resumed`

**What to Verify:**
- Check `product_purchases` table - `status` should be `'active'`
- Verify subscription is active in Stripe Dashboard

**Status:** ⏳ Ready to test

### Test 2.6: Subscription Cancellation
**Goal:** Test subscription cancellation (immediate and at period end)

**Steps:**
1. In Stripe Dashboard → Subscriptions → Find active subscription
2. Click "Cancel subscription"
3. Choose cancellation type:
   - **Option A:** Cancel immediately
   - **Option B:** Cancel at period end
4. Confirm cancellation

**Expected Events:**
- [ ] `customer.subscription.updated` (status changes to `canceled` or `cancel_at_period_end: true`)
- [ ] `customer.subscription.deleted` (when period ends, if canceled at period end)

**What to Verify:**
- Check `product_purchases` table:
  - If immediate: `status` = `'cancelled'`, `cancelled_at` is set
  - If at period end: `status` = `'active'` until period ends, then `'cancelled'`
- Verify `cancelled_at` timestamp is correct

**Status:** ⏳ Ready to test

---

## Phase 3: Invoice Events

### Test 3.1: Invoice Payment Failure
**Goal:** Test handling of failed subscription payments

**Steps:**
1. Create a subscription with a card that will fail
2. Use test card: `4000 0000 0000 0002` (card declined)
3. Wait for invoice to be created and payment attempt
4. Or manually retry payment: Invoices → Find failed invoice → Retry payment

**Expected Events:**
- [ ] `invoice.created`
- [ ] `invoice.finalized`
- [ ] `invoice.payment_failed`
- [ ] `charge.failed`

**What to Verify:**
- Check `product_purchases` table - `payment_status` should be `'failed'`
- Verify error is logged in `error_logs` table

**Status:** ⏳ Ready to test

### Test 3.2: Invoice Payment Action Required (3D Secure)
**Goal:** Test 3D Secure authentication flow

**Steps:**
1. Use test card requiring authentication: `4000 0025 0000 3155`
2. Complete checkout
3. Authenticate the payment

**Expected Events:**
- [ ] `invoice.payment_action_required`

**What to Verify:**
- Check that event is logged
- Verify payment eventually succeeds after authentication

**Status:** ⏳ Ready to test

### Test 3.3: Invoice Upcoming (Before Renewal)
**Goal:** Test invoice upcoming notification

**Steps:**
1. Create a subscription
2. Wait for renewal (or use Stripe CLI to trigger)
3. Stripe sends this event 1 hour before renewal

**Expected Events:**
- [ ] `invoice.upcoming` (sent 1 hour before renewal)

**What to Verify:**
- Check that event is logged
- Verify you can prepare for upcoming payment

**Status:** ⏳ Ready to test

### Test 3.4: Invoice Lifecycle
**Goal:** Test invoice creation and finalization

**Steps:**
1. Create subscription → triggers invoice creation
2. Invoice is automatically finalized

**Expected Events:**
- [ ] `invoice.created`
- [ ] `invoice.updated` (when finalized)
- [ ] `invoice.finalized`

**What to Verify:**
- Check that all invoice lifecycle events are logged
- Verify invoice data is correct

**Status:** ⏳ Ready to test

### Test 3.5: Invoice Voided
**Goal:** Test voiding a draft invoice

**Steps:**
1. In Stripe Dashboard → Invoices → Find draft invoice
2. Click "Void invoice"
3. Confirm void

**Expected Events:**
- [ ] `invoice.voided`

**What to Verify:**
- Check that event is logged
- Verify invoice is voided in Stripe

**Status:** ⏳ Ready to test

### Test 3.6: Invoice Marked Uncollectible
**Goal:** Test marking invoice as uncollectible after multiple failures

**Steps:**
1. After multiple payment failures, Stripe marks invoice as uncollectible
2. Or manually: Invoices → Find failed invoice → "Mark as uncollectible"

**Expected Events:**
- [ ] `invoice.marked_uncollectible`

**What to Verify:**
- Check that event is logged
- Verify invoice status is updated

**Status:** ⏳ Ready to test

---

## Phase 4: Refund Events

### Test 4.1: Full Refund
**Goal:** Test full refund processing

**Steps:**
1. In Stripe Dashboard → Payments → Find successful payment
2. Click "Refund" → Select "Full refund"
3. Confirm refund

**Expected Events:**
- [ ] `charge.refunded`
- [ ] `refund.created`

**What to Verify:**
- Check `product_purchases` table - `payment_status` should be `'refunded'`
- Verify `refunded_at` timestamp is set
- Check refund amount matches original payment

**Status:** ⏳ Ready to test

### Test 4.2: Partial Refund
**Goal:** Test partial refund processing

**Steps:**
1. In Stripe Dashboard → Payments → Find successful payment
2. Click "Refund" → Select "Partial refund"
3. Enter refund amount (e.g., 50% of original)
4. Confirm refund

**Expected Events:**
- [ ] `charge.refunded`
- [ ] `refund.created`

**What to Verify:**
- Check `product_purchases` table - `payment_status` should be `'refunded'` (if full) or remain `'succeeded'` (if partial)
- Verify `refunded_at` timestamp is set
- Check refund amount is correct

**Status:** ⏳ Ready to test

### Test 4.3: Refund Update
**Goal:** Test refund status updates

**Steps:**
1. Create a refund
2. Stripe processes the refund (status changes)

**Expected Events:**
- [ ] `refund.updated` (when status changes)

**What to Verify:**
- Check that event is logged
- Verify refund status is updated

**Status:** ⏳ Ready to test

### Test 4.4: Refund Failure
**Goal:** Test refund failure handling

**Steps:**
1. Create a refund that fails (rare, but can happen with certain payment methods)
2. Or use Stripe CLI: `stripe trigger refund.failed`

**Expected Events:**
- [ ] `refund.failed`

**What to Verify:**
- Check that event is logged
- Verify error is logged in `error_logs` table

**Status:** ⏳ Ready to test

---

## Phase 5: Dispute Events (Chargebacks)

### Test 5.1: Dispute Created
**Goal:** Test dispute/chargeback creation

**Steps:**
1. In Stripe Dashboard → Payments → Find charge
2. Click "Create dispute" (test mode)
3. Or use Stripe CLI: `stripe disputes create --charge ch_XXXXX`

**Expected Events:**
- [ ] `charge.dispute.created`

**What to Verify:**
- Check that event is logged
- Verify dispute is created in Stripe

**Status:** ⏳ Ready to test

### Test 5.2: Dispute Updated
**Goal:** Test dispute updates (evidence submission)

**Steps:**
1. After dispute created, add evidence or update dispute
2. In Stripe Dashboard → Disputes → Find dispute → Add evidence

**Expected Events:**
- [ ] `charge.dispute.updated`

**What to Verify:**
- Check that event is logged
- Verify dispute is updated

**Status:** ⏳ Ready to test

### Test 5.3: Dispute Closed (Won)
**Goal:** Test winning a dispute

**Steps:**
1. In Stripe Dashboard → Disputes → Find dispute
2. Submit evidence and win dispute
3. Or use Stripe CLI: `stripe disputes update dp_XXXXX --submit`

**Expected Events:**
- [ ] `charge.dispute.closed`

**What to Verify:**
- Check that event is logged
- Verify dispute status is `won`

**Status:** ⏳ Ready to test

### Test 5.4: Dispute Funds Withdrawn
**Goal:** Test funds withdrawal when dispute is lost

**Steps:**
1. Create dispute and lose it
2. Funds are automatically withdrawn

**Expected Events:**
- [ ] `charge.dispute.funds_withdrawn`

**What to Verify:**
- Check that event is logged
- Verify funds are withdrawn

**Status:** ⏳ Ready to test

### Test 5.5: Dispute Funds Reinstated
**Goal:** Test funds reinstatement when dispute is won

**Steps:**
1. Create dispute and win it
2. Funds are automatically reinstated

**Expected Events:**
- [ ] `charge.dispute.funds_reinstated`

**What to Verify:**
- Check that event is logged
- Verify funds are reinstated

**Status:** ⏳ Ready to test

---

## Phase 6: Trial and Subscription Updates

### Test 6.1: Trial Will End
**Goal:** Test trial ending notification

**Steps:**
1. Create subscription with trial period (e.g., 7 days)
2. Wait 3 days before trial ends (or use Stripe CLI to trigger)
3. Stripe sends this event 3 days before trial ends

**Expected Events:**
- [ ] `customer.subscription.trial_will_end`

**What to Verify:**
- Check that event is logged
- Verify you can notify customer about trial ending

**Status:** ⏳ Ready to test

### Test 6.2: Subscription Pending Update Applied
**Goal:** Test pending subscription update application

**Steps:**
1. Update subscription with pending changes (e.g., plan change)
2. When invoice is paid, update is applied

**Expected Events:**
- [ ] `customer.subscription.pending_update_applied`

**What to Verify:**
- Check that event is logged
- Verify subscription is updated with new plan

**Status:** ⏳ Ready to test

### Test 6.3: Subscription Pending Update Expired
**Goal:** Test pending update expiration

**Steps:**
1. Create pending subscription update
2. Let invoice payment fail or expire
3. Pending update expires

**Expected Events:**
- [ ] `customer.subscription.pending_update_expired`

**What to Verify:**
- Check that event is logged
- Verify subscription remains on original plan

**Status:** ⏳ Ready to test

---

---

## Testing Checklist Summary

### Core Events (9)
- [x] `checkout.session.completed` ✅ - Tested and working
- [x] `charge.succeeded` ✅ - Tested and working
- [x] `customer.subscription.created` ✅ - Tested and working
- [ ] `customer.subscription.updated` - ⏳ Ready to test (Phase 2.3)
- [ ] `customer.subscription.deleted` - ⏳ Ready to test (Phase 2.6)
- [ ] `customer.subscription.paused` - ⏳ Ready to test (Phase 2.4)
- [ ] `customer.subscription.resumed` - ⏳ Ready to test (Phase 2.5)
- [x] `invoice.paid` ✅ - Tested and working (with trial detection)
- [ ] `invoice.payment_failed` - ⏳ Ready to test (Phase 3.1)

### Invoice Events (5)
- [ ] `invoice.created`
- [ ] `invoice.updated`
- [ ] `invoice.finalized`
- [ ] `invoice.voided`
- [ ] `invoice.marked_uncollectible`

### Payment Events (4)
- [ ] `charge.failed`
- [ ] `invoice.payment_action_required`
- [ ] `invoice.upcoming`

### Refund Events (3)
- [ ] `refund.created`
- [ ] `refund.failed`
- [ ] `refund.updated`

### Dispute Events (5)
- [ ] `charge.dispute.created`
- [ ] `charge.dispute.updated`
- [ ] `charge.dispute.closed`
- [ ] `charge.dispute.funds_withdrawn`
- [ ] `charge.dispute.funds_reinstated`

### Trial/Update Events (3)
- [ ] `customer.subscription.trial_will_end`
- [ ] `customer.subscription.pending_update_applied`
- [ ] `customer.subscription.pending_update_expired`

---

## Monitoring and Verification

### Check Webhook Logs
- Supabase Dashboard → Edge Functions → stripe-webhook → Logs
- Look for event processing messages
- Check for any error messages

### Check Database
- `product_purchases` table - verify purchase records are created/updated
- `error_logs` table - check for any errors during processing

### Check Stripe Dashboard
- Webhooks → Event deliveries - verify all events are received
- Check event payloads and responses

---

## Troubleshooting

### Event Not Received
1. Check webhook endpoint URL is correct
2. Verify webhook secret is correct
3. Check Stripe Dashboard → Webhooks → Event deliveries for errors

### Event Received But Not Processed
1. Check Supabase Edge Function logs
2. Verify event type is in the switch statement
3. Check `error_logs` table for details

### Database Not Updated
1. Check Supabase logs for database errors
2. Verify user exists in `user_profiles` table
3. Verify product exists in `products` table
4. Check RLS policies allow updates

---

## Notes

- All tests should be done in **Stripe Test Mode**
- Use test cards from [Stripe Testing Documentation](https://stripe.com/docs/testing)
- Monitor both Stripe Dashboard and Supabase logs during testing
- Keep track of which events have been tested and verified


# Stripe Test vs Live Mode - Current State & Required Changes

**Date**: January 2025  
**Status**: ⚠️ **ACTION REQUIRED** - Code needs updates to properly handle test/live mode

---

## 🔍 Current State Analysis

### Environment Variables Setup

**DEV Environment** (eygpejbljuqpxwwoawkn):
- ✅ `STRIPE_SECRET_KEY_TEST` - Set
- ✅ `STRIPE_WEBHOOK_SECRET_TEST` - Set
- ✅ `STRIPE_PUBLISHABLE_KEY_TEST` - Set
- ✅ `STRIPE_SECRET_KEY` = TEST key (backward compatibility)
- ✅ `STRIPE_WEBHOOK_SECRET` = TEST webhook secret (backward compatibility)
- ❌ No live keys (correct - DEV should only use test)

**PROD Environment** (dynxqnrkmjcvgzsugxtm):
- ✅ `STRIPE_SECRET_KEY_TEST` - Set
- ✅ `STRIPE_WEBHOOK_SECRET_TEST` - Set
- ✅ `STRIPE_PUBLISHABLE_KEY_TEST` - Set
- ✅ `STRIPE_SECRET_KEY_LIVE` - Set
- ✅ `STRIPE_WEBHOOK_SECRET_LIVE` - Set
- ✅ `STRIPE_PUBLISHABLE_KEY_LIVE` - Set
- ⚠️ `STRIPE_SECRET_KEY` = **LIVE key** (set by update-secrets.sh line 80-84)
- ⚠️ `STRIPE_WEBHOOK_SECRET` = **TEST webhook secret** (from TEST key)

### Code Current Behavior

**All Stripe Edge Functions**:
- Use `STRIPE_SECRET_KEY` directly
- **PROD**: Currently uses LIVE key (from backward compatibility setting)
- **DEV**: Uses TEST key (correct)

**Webhook Handler** (`stripe-webhook/index.ts`):
- Uses `STRIPE_WEBHOOK_SECRET` directly (line 1633)
- **PROD**: Currently uses TEST webhook secret
- **Problem**: Doesn't check `event.livemode` to determine which secret to use
- **Risk**: Live events will fail signature verification if they use TEST secret

---

## ⚠️ Critical Issues

### Issue 1: Webhook Handler Doesn't Check Event Mode
**Location**: `supabase/functions/stripe-webhook/index.ts:1633`

**Current Code**:
```typescript
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
```

**Problem**:
- Stripe events have a `livemode` field (`true` for live, `false` for test)
- Currently only checks one webhook secret
- In PROD: Uses TEST secret, so LIVE events will fail verification
- Need to check `event.livemode` and use appropriate secret

**Required Fix**:
```typescript
// After receiving event, check livemode
const isLiveMode = event.livemode
const webhookSecret = isLiveMode 
  ? Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE')
  : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST')
```

### Issue 2: All Stripe Functions Use Single Secret Key
**Location**: All Stripe Edge Functions

**Current Code** (example from `create-stripe-product/index.ts:364`):
```typescript
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
```

**Problem**:
- In PROD: `STRIPE_SECRET_KEY` is set to LIVE key
- If we want to test in PROD, we can't use test keys
- No way to control test vs live mode in production

**Options**:
1. **Option A**: Always use TEST in DEV, LIVE in PROD (current behavior, but needs webhook fix)
2. **Option B**: Add environment detection + mode flag
3. **Option C**: Check Stripe key prefix (`sk_test_` vs `sk_live_`) to determine mode

### Issue 3: No Control Over Test/Live Mode in Production
**Problem**:
- Once we switch PROD to use LIVE keys, we can't easily test
- Need a way to control when to use test vs live in production
- Should be able to test in production environment with test keys

---

## ✅ Recommended Solution

### Phase 1: Fix Webhook Handler (CRITICAL - Do First)

**Update `stripe-webhook/index.ts`**:
1. Check `event.livemode` after receiving event
2. Use appropriate webhook secret based on mode
3. Use appropriate Stripe secret key based on mode

**Implementation**:
```typescript
// After verifying signature, check event mode
const isLiveMode = event.livemode

// Get appropriate secrets based on mode
const stripeSecretKey = isLiveMode
  ? Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY')
  : Deno.env.get('STRIPE_SECRET_KEY_TEST') || Deno.env.get('STRIPE_SECRET_KEY')

// For webhook verification, we need to check BEFORE we verify
// So we need to try both secrets if one fails
```

**Note**: Webhook signature verification happens BEFORE we can check `event.livemode`, so we need a different approach:
- Try TEST secret first, if fails, try LIVE secret
- Or: Check webhook endpoint URL to determine mode (test webhooks go to test endpoint, live to live endpoint)

### Phase 2: Update All Stripe Functions

**Add helper function** to determine which Stripe key to use:

```typescript
function getStripeSecretKey(): string {
  // Check if we have mode-specific keys
  const testKey = Deno.env.get('STRIPE_SECRET_KEY_TEST')
  const liveKey = Deno.env.get('STRIPE_SECRET_KEY_LIVE')
  
  // Determine environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const isProd = supabaseUrl.includes('dynxqnrkmjcvgzsugxtm')
  
  // For now: DEV = test, PROD = live
  // TODO: Add STRIPE_MODE environment variable for PROD control
  if (isProd && liveKey) {
    return liveKey
  }
  
  return testKey || Deno.env.get('STRIPE_SECRET_KEY') || ''
}
```

### Phase 3: Add Production Mode Control

**Add environment variable**: `STRIPE_MODE` (optional)
- If set to `test`: Use test keys even in PROD
- If set to `live`: Use live keys in PROD
- If not set: Auto-detect (DEV = test, PROD = live)

---

## 📋 Implementation Checklist

### Immediate (Before Going Live)
- [ ] **Fix webhook handler** to check `event.livemode` and use correct webhook secret
- [ ] **Test webhook** with both test and live events
- [ ] **Verify** all Stripe functions use correct keys in PROD

### Before Production Launch
- [ ] Add `STRIPE_MODE` environment variable for PROD control
- [ ] Update all Stripe functions to use helper function
- [ ] Test switching between test/live mode in PROD
- [ ] Document the process for switching modes

### Ongoing
- [ ] Monitor webhook deliveries for signature verification failures
- [ ] Keep test and live keys separate and secure
- [ ] Document which mode is active in production

---

## 🎯 Decision Needed

**Question**: When should PROD switch from TEST to LIVE mode?

**Options**:
1. **Immediately**: Switch PROD to LIVE now (requires webhook fix first)
2. **After Testing**: Keep PROD on TEST until all webhook events are tested
3. **Gradual**: Use TEST for new features, LIVE for stable features

**Recommendation**: **Option 2** - Keep PROD on TEST until:
- Webhook handler is fixed
- All 29 webhook events are tested
- Ready for real payments

Then switch to LIVE mode when ready to accept real payments.

---

## 📝 Files That Need Updates

1. **`supabase/functions/stripe-webhook/index.ts`**
   - Add livemode detection
   - Use appropriate webhook secret
   - Use appropriate Stripe secret key

2. **All Stripe Edge Functions** (6 functions):
   - `create-stripe-product/index.ts`
   - `create-stripe-subscription-product/index.ts`
   - `create-stripe-service-product/index.ts`
   - `update-stripe-product/index.ts`
   - `update-stripe-service-product/index.ts`
   - `delete-stripe-product/index.ts`
   - Add helper function or update to use mode-specific keys

3. **`supabase/scripts/update-secrets.sh`**
   - Consider not overwriting `STRIPE_SECRET_KEY` in PROD
   - Or add logic to set based on mode flag

---

## 🔒 Security Notes

- **Never commit** Stripe keys to git (already handled via .gitignore)
- **Rotate keys** if accidentally exposed
- **Use test keys** for all development and testing
- **Only use live keys** when ready for production payments
- **Monitor** Stripe Dashboard for unexpected activity

---

## 📚 References

- [Stripe Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [Stripe Test vs Live Mode](https://stripe.com/docs/keys)
- [Stripe Event Object](https://stripe.com/docs/api/events/object)


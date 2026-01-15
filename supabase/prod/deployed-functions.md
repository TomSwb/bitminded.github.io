# Edge Functions Deployed to Production

**Project**: dynxqnrkmjcvgzsugxtm

## Status: ✅ All Deployed

Last updated: 2026-01-15

## Deployed Functions

- ✅ verify-captcha
- ✅ verify-2fa-code
- ✅ send-support-request
- ✅ create-notification
- ✅ send-notification-email
- ✅ log-login
- ✅ revoke-session
- ✅ schedule-account-deletion
- ✅ process-account-deletions
- ✅ cancel-account-deletion
- ✅ send-deletion-email
- ✅ delete-user
- ✅ create-github-repository
- ✅ family-management
- ✅ maintenance-settings
- ✅ stripe-webhook
- ✅ validate-license
- ❌ **create-cloudflare-worker** - NOT YET DEPLOYED (required for Worker creation)

## Environment Variables Set

All functions have required environment variables configured:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY` (verify-captcha)
- `RESEND_API_KEY` (email functions)
- `FROM_EMAIL` (email functions)
- `GITHUB_TOKEN` (create-github-repository)
- `OPENAI_API_KEY` (create-github-repository - optional, falls back to templates if not set)

## Deploy Command

```bash
# ⚠️ Test in dev first!
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

## Deployment Log

### 2025-01-XX - Added Family Creation Feature
- ✅ Deployed `family-management` with new `POST /create-family` endpoint
- Enables users to manually create family groups before purchasing subscriptions
- Includes age validation (18+), duplicate family prevention, and full error handling

### 2025-11-29 - Deployed Product Wizard Function
- ✅ Deployed `create-github-repository` to production
- Updated license generation to use BitMinded as copyright holder
- Configured environment variables (GITHUB_TOKEN, OPENAI_API_KEY)

### 2025-01-15 - Initial Deployment
- Deployed all 12 Edge Functions
- Configured all environment variables
- Set up cron jobs

### 2026-01-10 - Fixed Maintenance Settings Edge Function
- ✅ Fixed `maintenance-settings` to use upsert instead of update (fixes 500 error when row doesn't exist)
- ✅ Clear token fields (bypass_cookie_secret, last_generated_token, last_generated_token_expires_at) when maintenance mode is disabled for clean state
- ✅ Preserve existing token fields when maintenance mode is enabled (if not generating new token)
- ✅ Include id in payload for upsert to work correctly

### 2026-01-15 - Item 17: Purchase Confirmation & Entitlements
- ✅ Updated `stripe-webhook` with entitlement sync from purchases (syncEntitlementFromPurchase function)
- ✅ Updated `stripe-webhook` with purchase confirmation email sending (sendPurchaseConfirmationEmail function)
- ✅ Deployed `validate-license` with family subscription checks (service_purchases and has_family_subscription_access)
- ✅ Updated `send-notification-email` with purchase confirmation email templates (one-time and subscription)
- All functions deployed with correct JWT settings (stripe-webhook and send-notification-email use --no-verify-jwt)

## Next Function to Deploy

None - all current functions deployed


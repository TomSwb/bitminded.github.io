# Edge Functions Deployed to Dev

**Project**: eygpejbljuqpxwwoawkn

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
supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn
```

## Deployment Log

### 2025-01-XX - Added Family Creation Feature
- ✅ Deployed `family-management` with new `POST /create-family` endpoint
- Enables users to manually create family groups before purchasing subscriptions
- Includes age validation (18+), duplicate family prevention, and full error handling

### 2025-11-29 - Fixed License Generation
- ✅ Updated `create-github-repository` to use BitMinded as copyright holder in LICENSE generation
- Fixed license template to use BitMinded instead of product name for proper legal attribution

### 2025-01-29 - Added Repository Setup Best Practices
- ✅ Deployed `create-github-repository` with enhanced file generation
- Now generates: README.md (enhanced), CHANGELOG.md, .editorconfig, .cursorrules, .cursorignore, CONTRIBUTING.md, LICENSE
- Uses hybrid template+AI approach for .cursorrules generation

### 2026-01-10 - Fixed Maintenance Settings Edge Function
- ✅ Fixed `maintenance-settings` to use upsert instead of update (fixes 500 error when row doesn't exist)
- ✅ Clear token fields (bypass_cookie_secret, last_generated_token, last_generated_token_expires_at) when maintenance mode is disabled for clean state
- ✅ Preserve existing token fields when maintenance mode is enabled (if not generating new token)
- ✅ Include id in payload for upsert to work correctly

### 2026-01-15 - Item 17: Purchase Confirmation & Entitlements
- ✅ Updated `stripe-webhook` with entitlement sync from purchases (syncEntitlementFromPurchase function)
- ✅ Updated `stripe-webhook` with purchase confirmation email sending (sendPurchaseConfirmationEmail function)
- ✅ Updated `validate-license` with family subscription checks (service_purchases and has_family_subscription_access)
- ✅ Updated `send-notification-email` with purchase confirmation email templates (one-time and subscription)
- All functions deployed with correct JWT settings (stripe-webhook and send-notification-email use --no-verify-jwt)

## Next Function to Deploy

None - all current functions deployed


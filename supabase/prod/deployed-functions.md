# Edge Functions Deployed to Production

**Project**: dynxqnrkmjcvgzsugxtm

## Status: ✅ All Deployed

Last updated: 2025-01-15

## Deployed Functions

- ✅ verify-captcha
- ✅ verify-2fa-code
- ✅ send-contact-email
- ✅ create-notification
- ✅ send-notification-email
- ✅ log-login
- ✅ revoke-session
- ✅ schedule-account-deletion
- ✅ process-account-deletions
- ✅ cancel-account-deletion
- ✅ send-deletion-email
- ✅ delete-user

## Environment Variables Set

All functions have required environment variables configured:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY` (verify-captcha)
- `RESEND_API_KEY` (email functions)
- `FROM_EMAIL` (email functions)

## Deploy Command

```bash
# ⚠️ Test in dev first!
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

## Deployment Log

### 2025-01-15 - Initial Deployment
- Deployed all 12 Edge Functions
- Configured all environment variables
- Set up cron jobs

## Next Function to Deploy

None - all current functions deployed


# Edge Functions Deployed to Dev

**Project**: eygpejbljuqpxwwoawkn

## Status: ✅ All Deployed

Last updated: 2025-01-29

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

### 2025-01-29 - Added Repository Setup Best Practices
- ✅ Deployed `create-github-repository` with enhanced file generation
- Now generates: README.md (enhanced), CHANGELOG.md, .editorconfig, .cursorrules, .cursorignore, CONTRIBUTING.md, LICENSE
- Uses hybrid template+AI approach for .cursorrules generation

## Next Function to Deploy

None - all current functions deployed


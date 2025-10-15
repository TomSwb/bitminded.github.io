# Edge Functions

Supabase Edge Functions deployed to both dev and production.

## Deployed Functions

### Authentication & Security
- `verify-captcha` - Cloudflare Turnstile verification
- `verify-2fa-code` - Two-factor authentication verification
- `log-login` - Track user login activity
- `revoke-session` - Revoke user sessions

### Notifications & Email
- `create-notification` - Create in-app notifications
- `send-notification-email` - Send notification emails
- `send-contact-email` - Handle contact form submissions
- `send-deletion-email` - Send account deletion emails

### Account Management
- `schedule-account-deletion` - Schedule user account deletion
- `process-account-deletions` - Process scheduled deletions (cron)
- `cancel-account-deletion` - Cancel deletion requests
- `delete-user` - Permanently delete user accounts

## Deployment

### Deploy to Dev
```bash
supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn
```

### Deploy to Production
```bash
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

## Environment Variables

All functions require:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Additional variables:
- `TURNSTILE_SECRET_KEY` (verify-captcha)
- `RESEND_API_KEY` (email functions)
- `FROM_EMAIL` (email functions)

See `/dev/ENVIRONMENT_VARIABLES.md` for details.

## Testing

1. Deploy to dev first
2. Test on localhost
3. Check function logs in dashboard
4. Deploy to production when ready

## Tracking

Track deployments in:
- `/dev/deployed-functions.md`
- `/prod/deployed-functions.md`


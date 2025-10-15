# Environment Variables for Dev Edge Functions

After deploying Edge Functions to dev, you need to set up environment variables for each function.

Go to: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions

## Required Environment Variables

### All Functions (Shared)
Set these for ALL Edge Functions:

```
SUPABASE_URL=https://eygpejbljuqpxwwoawkn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key
```

### verify-captcha
```
TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret_key
```
**Note:** You can use the same Turnstile key as production, or create a separate dev key.

### send-contact-email
### send-notification-email  
### send-deletion-email
```
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@bitminded.ch
```
**Note:** You can use the same Resend key as production, or create a separate dev key.

### verify-2fa-code
### log-login
### revoke-session
### create-notification
### schedule-account-deletion
### process-account-deletions
### cancel-account-deletion
### delete-user
```
SUPABASE_URL=https://eygpejbljuqpxwwoawkn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key
```

## How to Set Environment Variables

1. Go to **Edge Functions** in your dev Supabase dashboard
2. Click on each function
3. Go to **Settings** tab
4. Add the required environment variables
5. **Save** and **Redeploy** the function

## Dev vs Production Keys

### Option 1: Separate Keys (Recommended)
- Create separate Cloudflare Turnstile site for dev
- Use separate Resend API key for dev
- Keeps dev and prod completely isolated

### Option 2: Shared Keys (Easier)
- Use the same Turnstile and Resend keys for both
- Simpler setup, but dev activity shows in prod logs

## Get Your Keys

### Dev Supabase Service Role Key
- Dashboard: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/settings/api
- Copy the "service_role" key (secret)

### Cloudflare Turnstile (if using separate dev key)
- Go to: https://dash.cloudflare.com/
- Create new Turnstile site for dev
- Copy the secret key

### Resend API Key (if using separate dev key)
- Go to: https://resend.com/api-keys
- Create new API key for dev
- Copy the key

## Verification

After setting all variables and deploying:

1. Test each function manually in the Supabase dashboard
2. Check function logs for any errors
3. Test the application locally (should connect to dev)
4. Verify emails are being sent
5. Verify captcha works
6. Test 2FA functionality

## Quick Setup Commands

After deploying all functions, set shared variables:

```bash
# Set for all functions (you'll need to do this in the dashboard UI)
SUPABASE_URL=https://eygpejbljuqpxwwoawkn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_dev_service_role_key>
```

Then add function-specific variables as needed.


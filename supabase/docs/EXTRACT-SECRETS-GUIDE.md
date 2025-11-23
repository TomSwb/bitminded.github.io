# Extracting Secrets from Supabase Dashboard

Since Supabase CLI only shows secret digests (hashes) for security reasons, you need to manually retrieve the actual secret values from the Supabase Dashboard.

## Quick Links

### Dev Project Secrets
- **Dashboard**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions
- **Secrets Page**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions (click on any function → Settings → Secrets)

### Prod Project Secrets  
- **Dashboard**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions
- **Secrets Page**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions (click on any function → Settings → Secrets)

## How to Extract Secrets

### Method 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → Click on any function (e.g., `stripe-webhook`)
3. Go to **Settings** tab
4. Scroll to **Secrets** section
5. You'll see all secrets listed (but values are hidden for security)
6. To view a secret value:
   - Click the eye icon next to the secret name
   - Or click "Reveal value" button
   - Copy the value

### Method 2: Via Supabase CLI (List Only)

The CLI can list secrets but not show values:

```bash
# List DEV secrets
supabase secrets list --project-ref eygpejbljuqpxwwoawkn

# List PROD secrets
supabase secrets list --project-ref dynxqnrkmjcvgzsugxtm
```

This shows secret names and digests, but not actual values.

## Secrets to Extract

### For DEV (.env-dev)
- ✅ `SUPABASE_URL` - Already set
- ✅ `SUPABASE_ANON_KEY` - Already set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Already extracted
- ⏳ `STRIPE_SECRET_KEY` - Get from Supabase Dashboard (test mode key)
- ⏳ `STRIPE_WEBHOOK_SECRET` - Get from Supabase Dashboard (test webhook)
- ⏳ `TURNSTILE_SECRET` - Get from Supabase Dashboard
- ⏳ `RESEND_API_KEY` - Get from Supabase Dashboard
- ⏳ `GITHUB_TOKEN` - Get from Supabase Dashboard
- ⏳ `GITHUB_USERNAME` - Get from Supabase Dashboard (or set manually)
- ⏳ `OPENAI_API_KEY` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_ACCOUNT_ID` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_API_TOKEN` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_ZONE_ID` - Get from Supabase Dashboard

### For PROD (.env-prod)
- ✅ `SUPABASE_URL` - Already set
- ✅ `SUPABASE_ANON_KEY` - Already set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Already extracted
- ⏳ `STRIPE_SECRET_KEY` - **YOU WILL PROVIDE** (live mode key)
- ⏳ `STRIPE_WEBHOOK_SECRET` - **TO BE CREATED** (live webhook)
- ⏳ `TURNSTILE_SECRET` - Get from Supabase Dashboard
- ⏳ `RESEND_API_KEY` - Get from Supabase Dashboard
- ⏳ `GITHUB_TOKEN` - Get from Supabase Dashboard
- ⏳ `GITHUB_USERNAME` - Get from Supabase Dashboard (or set manually)
- ⏳ `OPENAI_API_KEY` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_ACCOUNT_ID` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_API_TOKEN` - Get from Supabase Dashboard
- ⏳ `CLOUDFLARE_ZONE_ID` - Get from Supabase Dashboard

## Alternative: Use Supabase Management API

If you have a Supabase access token, you can use the Management API to retrieve secrets programmatically. However, this requires:
1. Generating an access token from Supabase Dashboard
2. Using the Management API endpoint: `GET /v1/projects/{project_ref}/secrets`

## Next Steps

1. Extract remaining secrets from Supabase Dashboard
2. Update `.env-dev` and `.env-prod` files
3. Add live Stripe secret (you'll provide)
4. Create production webhook in Stripe
5. Add production webhook secret


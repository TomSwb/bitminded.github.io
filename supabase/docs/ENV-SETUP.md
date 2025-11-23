# Environment Variables Setup

This folder contains environment variable templates for both dev and production Supabase projects.

## Files

- `.env-dev` - Development environment variables (project: `eygpejbljuqpxwwoawkn`)
- `.env-prod` - Production environment variables (project: `dynxqnrkmjcvgzsugxtm`)

## ⚠️ Security Note

These files are **gitignored** and will **NOT** be committed to the repository. They contain sensitive secrets.

## How to Use

### 1. Fill in the Values

Open each file and replace the placeholder values with your actual secrets:

```bash
# Edit dev environment
nano supabase/.env-dev

# Edit prod environment  
nano supabase/.env-prod
```

### 2. Get Your Secrets

#### Supabase Keys
- **Dev**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/settings/api
- **Prod**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/settings/api

#### Stripe Keys
- **Test Mode**: https://dashboard.stripe.com/test/apikeys
- **Live Mode**: https://dashboard.stripe.com/apikeys
- **Webhook Secret**: https://dashboard.stripe.com/webhooks → Select webhook → Signing secret

#### Other Services
- **Resend**: https://resend.com/api-keys
- **Cloudflare Turnstile**: https://dash.cloudflare.com/ → Turnstile
- **GitHub**: https://github.com/settings/tokens
- **OpenAI**: https://platform.openai.com/api-keys

### 3. Using with Supabase CLI

The Supabase CLI automatically uses environment variables when deploying functions. You can also load them manually:

```bash
# Load dev environment
export $(cat supabase/.env-dev | xargs)

# Load prod environment
export $(cat supabase/.env-prod | xargs)
```

### 4. Deploying Functions

When deploying, the CLI will use the linked project's environment variables from the Supabase dashboard. These `.env` files are for local reference and development.

```bash
# Deploy to dev
supabase link --project-ref eygpejbljuqpxwwoawkn
supabase functions deploy <function-name>

# Deploy to prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm
supabase functions deploy <function-name>
```

## Keeping Secrets in Sync

After updating environment variables in the Supabase dashboard, update these local files for reference:

1. Go to Supabase Dashboard → Edge Functions → [Function Name] → Settings
2. Copy the environment variables
3. Update the corresponding `.env-dev` or `.env-prod` file

## Required Variables by Function

### All Functions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe Functions
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (stripe-webhook only)

### Email Functions
- `RESEND_API_KEY`
- `FROM_EMAIL`

### Captcha Functions
- `TURNSTILE_SECRET`

### AI Functions
- `OPENAI_API_KEY`

### GitHub Functions
- `GITHUB_TOKEN`
- `GITHUB_USERNAME`

### Cloudflare Functions
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`


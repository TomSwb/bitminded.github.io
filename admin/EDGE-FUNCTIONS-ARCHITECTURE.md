# Edge Functions & Automation Architecture

**Last Updated**: January 2025  
**Status**: Architecture Defined - Ready for Implementation

---

## 📋 Overview

This document defines how we use **Supabase Edge Functions** (server-side Deno runtime) and **Supabase Cron Jobs** (scheduled tasks) to handle secure operations, webhooks, and automation for the BitMinded admin panel.

---

## 🔑 Available Secrets (Already Configured)

### ✅ Current Secrets in Supabase
```
TURNSTILE_SECRET              # Captcha verification (existing)
SUPABASE_URL                  # Database endpoint
SUPABASE_ANON_KEY            # Client-side operations
SUPABASE_SERVICE_ROLE_KEY    # Admin operations (bypasses RLS) ⭐
SUPABASE_DB_URL              # Direct database access
RESEND_API_KEY               # Email sending ⭐ (already working in 3+ functions)
```

### ✅ Existing Edge Functions (Already Implemented)
```
/functions/send-notification-email    # Uses Resend API
/functions/send-contact-email         # Uses Resend API
/functions/send-deletion-email        # Uses Resend API
/functions/verify-2fa-code            # 2FA verification
/functions/verify-captcha             # Turnstile verification
/functions/log-login                  # Login tracking
/functions/revoke-session             # Session management
/functions/schedule-account-deletion  # Account deletion
/functions/cancel-account-deletion    # Cancel deletion
/functions/process-account-deletions  # Process deletions
/functions/create-notification        # In-app notifications
```

**Pattern for Resend Emails** (reuse this):
```typescript
const resendApiKey = Deno.env.get('RESEND_API_KEY')

const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'BitMinded <admin@bitminded.ch>',
    to: userEmail,
    subject: subject,
    html: htmlContent
  })
})
```

### 🆕 Secrets to Add (During Implementation)
```bash
# Stripe secrets (Phase 2)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Production keys when ready
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 🔧 Edge Functions Architecture

### Why Edge Functions?

**Security Benefits**:
- Secrets never exposed to client
- Service role key safely used server-side
- Webhook signature verification
- Admin permission checks

**Operational Benefits**:
- Auto-scaling (no server management)
- Global edge deployment (fast worldwide)
- Pay per execution (cost-effective)
- Integrated with Supabase ecosystem

### How Edge Functions Work

```typescript
// Edge Function runs on Deno runtime
// Deployed to: https://[project-ref].supabase.co/functions/v1/[function-name]

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Access secrets via Deno.env
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

serve(async (req) => {
  // Function logic here
  return new Response('OK')
})
```

---

## 📁 Edge Functions Structure

### Phase 1: Core Admin Functions

#### 1. `/functions/admin-grant-access`
**Purpose**: Securely grant user access to products

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { userId, productId, accessType, expiration, reason } = await req.json()
  
  // 1. Verify admin making request
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // 2. Check admin role
  const { data: adminRole } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()
  
  if (!adminRole) {
    return new Response('Forbidden - Admin role required', { status: 403 })
  }
  
  // 3. Grant access
  const { data, error } = await supabaseAdmin
    .from('entitlements')
    .insert({
      user_id: userId,
      app_id: productId,
      grant_type: accessType,
      expires_at: expiration,
      granted_by: user.id,
      grant_reason: reason,
      active: true
    })
    .select()
    .single()
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  
  // 4. Log admin action
  await supabaseAdmin.from('admin_activity').insert({
    admin_user_id: user.id,
    action_type: 'grant_access',
    details: { userId, productId, accessType, reason }
  })
  
  // 5. Send notification email (call email function)
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: userId, // Will get email from user_id
      subject: `Access Granted: ${productId}`,
      template: 'access_granted',
      variables: { productId, accessType }
    })
  })
  
  return new Response(JSON.stringify({ success: true, data }))
})
```

#### 2. `/functions/admin-revoke-access`
**Purpose**: Securely revoke user access

```typescript
serve(async (req) => {
  const { entitlementId, reason } = await req.json()
  
  // Verify admin (same as above)
  // ...
  
  // Revoke access
  await supabaseAdmin
    .from('entitlements')
    .update({ active: false })
    .eq('id', entitlementId)
  
  // Log action
  await supabaseAdmin.from('admin_activity').insert({
    admin_user_id: user.id,
    action_type: 'revoke_access',
    details: { entitlementId, reason }
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### 3. `/functions/send-email-resend`
**Purpose**: Send emails via Resend (reuses existing pattern)

```typescript
serve(async (req) => {
  const { to, subject, html, from, template, variables } = await req.json()
  
  let emailHtml = html
  let emailSubject = subject
  
  // If template specified, load it
  if (template) {
    const { data: templateData } = await supabaseAdmin
      .from('email_templates')
      .select('body_template, subject_template')
      .eq('id', template)
      .single()
    
    emailHtml = templateData.body_template
    emailSubject = emailSubject || templateData.subject_template
    
    // Replace variables
    for (const [key, value] of Object.entries(variables || {})) {
      emailHtml = emailHtml.replace(new RegExp(`{{${key}}}`, 'g'), value)
      emailSubject = emailSubject.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
  }
  
  // Send email via Resend API (same pattern as existing functions)
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500 })
  }
  
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from || 'BitMinded <admin@bitminded.ch>',
      to: Array.isArray(to) ? to : [to],
      subject: emailSubject,
      html: emailHtml
    })
  })
  
  const emailResult = await emailResponse.json()
  
  if (!emailResponse.ok) {
    return new Response(JSON.stringify({ error: emailResult }), { status: 400 })
  }
  
  // Track email
  await supabaseAdmin.from('email_history').insert({
    subject: emailSubject,
    recipient_count: Array.isArray(to) ? to.length : 1,
    sent_at: new Date().toISOString()
  })
  
  return new Response(JSON.stringify({ success: true, emailId: emailResult.id }))
})
```

---

### Phase 2: Stripe Integration Functions

#### 4. `/functions/stripe-webhook`
**Purpose**: Handle all Stripe webhook events

```typescript
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()
  
  // Verify webhook signature
  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
  
  // Handle events
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object)
      break
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
      
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object)
      break
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
      
    case 'charge.refunded':
      await handleRefund(event.data.object)
      break
  }
  
  return new Response('OK')
})

async function handleSubscriptionCreated(subscription) {
  // Get user from Stripe customer ID
  const { data: userData } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .single()
  
  // Grant access
  await supabaseAdmin.from('entitlements').insert({
    user_id: userData.user_id,
    app_id: subscription.metadata.product_id,
    subscription_id: subscription.id,
    active: true,
    expires_at: new Date(subscription.current_period_end * 1000)
  })
  
  // Send welcome email
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-resend`, {
    method: 'POST',
    body: JSON.stringify({
      to: userData.user_id,
      template: 'subscription_created',
      variables: { productName: subscription.metadata.product_name }
    })
  })
}

async function handleSubscriptionDeleted(subscription) {
  // Revoke access
  await supabaseAdmin
    .from('entitlements')
    .update({ active: false })
    .eq('subscription_id', subscription.id)
  
  // Send cancellation email
  // ...
}
```

#### 5. `/functions/create-stripe-product`
**Purpose**: Admin creates product in Stripe

```typescript
serve(async (req) => {
  const { productData } = await req.json()
  
  // Verify admin
  // ...
  
  // Create in Stripe
  const product = await stripe.products.create({
    name: productData.name,
    description: productData.description,
    metadata: {
      product_id: productData.id,
      subdomain: productData.subdomain
    }
  })
  
  // Create prices
  const prices = {}
  
  if (productData.price_monthly) {
    prices.monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: productData.price_monthly * 100,
      currency: 'chf',
      recurring: { interval: 'month' }
    })
  }
  
  if (productData.price_yearly) {
    prices.yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: productData.price_yearly * 100,
      currency: 'chf',
      recurring: { interval: 'year' }
    })
  }
  
  // Update database
  await supabaseAdmin
    .from('products')
    .update({
      stripe_product_id: product.id,
      stripe_price_monthly_id: prices.monthly?.id,
      stripe_price_yearly_id: prices.yearly?.id
    })
    .eq('id', productData.id)
  
  return new Response(JSON.stringify({ success: true, product, prices }))
})
```

#### 6. `/functions/sync-stripe`
**Purpose**: Sync Stripe products with database

```typescript
serve(async (req) => {
  // Get all Stripe products
  const { data: stripeProducts } = await stripe.products.list({ limit: 100 })
  
  // Get all local products
  const { data: localProducts } = await supabaseAdmin
    .from('products')
    .select('*')
  
  const updates = []
  
  // Compare and sync
  for (const stripeProduct of stripeProducts) {
    const local = localProducts.find(p => p.stripe_product_id === stripeProduct.id)
    
    if (!local) {
      // New product in Stripe, create locally
      updates.push({
        id: stripeProduct.metadata.product_id,
        name: stripeProduct.name,
        stripe_product_id: stripeProduct.id,
        // ... more fields
      })
    } else {
      // Update existing
      // ...
    }
  }
  
  if (updates.length > 0) {
    await supabaseAdmin.from('products').upsert(updates)
  }
  
  return new Response(JSON.stringify({ synced: updates.length }))
})
```

---

### Phase 3: Analytics & Automation Functions

#### 7. `/functions/check-expired-subscriptions`
**Purpose**: Check and handle expired subscriptions (daily cron)

```typescript
serve(async (req) => {
  // Find expired subscriptions
  const { data: expired } = await supabaseAdmin
    .from('entitlements')
    .select('*, user_profiles(*)')
    .eq('active', true)
    .lt('expires_at', new Date().toISOString())
  
  for (const entitlement of expired) {
    // Deactivate
    await supabaseAdmin
      .from('entitlements')
      .update({ active: false })
      .eq('id', entitlement.id)
    
    // Send expiration email
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-resend`, {
      method: 'POST',
      body: JSON.stringify({
        to: entitlement.user_profiles.email,
        template: 'subscription_expired',
        variables: { productId: entitlement.app_id }
      })
    })
  }
  
  return new Response(JSON.stringify({ expired: expired.length }))
})
```

#### 8. `/functions/send-trial-reminders`
**Purpose**: Send trial ending reminders (daily cron)

```typescript
serve(async (req) => {
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  
  // Find trials ending in 3 days
  const { data: endingSoon } = await supabaseAdmin
    .from('entitlements')
    .select('*, user_profiles(*)')
    .eq('grant_type', 'trial')
    .eq('active', true)
    .gte('expires_at', new Date().toISOString())
    .lte('expires_at', threeDaysFromNow.toISOString())
  
  for (const trial of endingSoon) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-resend`, {
      method: 'POST',
      body: JSON.stringify({
        to: trial.user_profiles.email,
        template: 'trial_ending',
        variables: {
          productId: trial.app_id,
          daysRemaining: Math.ceil((new Date(trial.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
        }
      })
    })
  }
  
  return new Response(JSON.stringify({ reminders_sent: endingSoon.length }))
})
```

#### 9. `/functions/generate-analytics`
**Purpose**: Generate daily analytics snapshots (daily cron)

```typescript
serve(async (req) => {
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate metrics
  const { count: totalUsers } = await supabaseAdmin
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
  
  const { count: activeSubscriptions } = await supabaseAdmin
    .from('entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  
  const { data: revenue } = await supabaseAdmin
    .from('payments')
    .select('amount.sum()')
    .gte('created_at', today)
  
  // Store snapshot
  await supabaseAdmin.from('analytics_snapshots').insert({
    date: today,
    total_users: totalUsers,
    active_subscriptions: activeSubscriptions,
    daily_revenue: revenue[0]?.sum || 0
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

---

## ⏰ Cron Jobs Configuration

### Setting Up Cron Jobs in Supabase

Cron jobs are SQL functions that run on schedule using `pg_cron` extension.

#### 1. **Check Expired Subscriptions** (Daily at 2 AM)
```sql
SELECT cron.schedule(
  'check-expired-subscriptions',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/check-expired-subscriptions',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
```

#### 2. **Send Trial Reminders** (Daily at 10 AM)
```sql
SELECT cron.schedule(
  'trial-ending-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/send-trial-reminders',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
```

#### 3. **Sync Stripe** (Every hour)
```sql
SELECT cron.schedule(
  'sync-stripe-subscriptions',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/sync-stripe',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
```

#### 4. **Generate Analytics** (Daily at 1 AM)
```sql
SELECT cron.schedule(
  'generate-daily-analytics',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/generate-analytics',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
```

### Managing Cron Jobs

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Unschedule a job
SELECT cron.unschedule('check-expired-subscriptions');

-- View cron job history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expired-subscriptions')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🔄 Complete User Flow Examples

### Example 1: User Subscribes via Stripe

```
1. User clicks "Subscribe" in Store
   ↓
2. Frontend creates Stripe Checkout
   const { data } = await stripe.checkout.sessions.create({
     customer_email: user.email,
     metadata: { user_id: user.id, product_id: 'converter' },
     ...
   })
   ↓
3. User completes payment
   ↓
4. Stripe webhook → /functions/v1/stripe-webhook
   ↓
5. Edge Function grants access (SERVICE_ROLE_KEY)
   await supabaseAdmin.from('entitlements').insert(...)
   ↓
6. Edge Function sends email → /functions/v1/send-email-resend
   await resend.emails.send({ to: user.email, ... })
   ↓
7. User receives "Welcome" email ✅
   ↓
8. User can access tool ✅
```

### Example 2: Admin Grants Manual Access

```
1. Admin opens user detail in admin panel
   ↓
2. Admin clicks "Grant Access"
   ↓
3. Admin fills form (product, type, expiration, reason)
   ↓
4. Frontend calls /functions/v1/admin-grant-access
   ↓
5. Edge Function verifies admin role
   ↓
6. Edge Function creates entitlement (SERVICE_ROLE_KEY)
   ↓
7. Edge Function logs action (admin_activity)
   ↓
8. Edge Function sends email (Resend)
   ↓
9. User receives "Access Granted" email ✅
   ↓
10. User can access tool ✅
```

### Example 3: Subscription Expires

```
1. Daily cron runs (2 AM)
   ↓
2. Cron calls /functions/v1/check-expired-subscriptions
   ↓
3. Edge Function finds expired subscriptions
   ↓
4. Edge Function deactivates entitlements
   ↓
5. Edge Function sends "Expired" emails
   ↓
6. User receives email notification ✅
   ↓
7. User loses access to tool ✅
```

---

## 📋 Implementation Checklist

### Phase 1: Core Functions
- [ ] Create `/functions/admin-grant-access`
- [ ] Create `/functions/admin-revoke-access`
- [ ] Create `/functions/send-email-resend`
- [ ] Test admin operations
- [ ] Test email sending

### Phase 2: Stripe Integration
- [ ] Add Stripe secrets to Supabase
- [ ] Create `/functions/stripe-webhook`
- [ ] Create `/functions/create-stripe-product`
- [ ] Create `/functions/sync-stripe`
- [ ] Set up Stripe webhook URL
- [ ] Test with Stripe test mode

### Phase 3: Automation
- [ ] Create `/functions/check-expired-subscriptions`
- [ ] Create `/functions/send-trial-reminders`
- [ ] Create `/functions/generate-analytics`
- [ ] Set up cron jobs in Supabase
- [ ] Test cron execution
- [ ] Monitor cron job logs

### Phase 4: Resend Integration
- [ ] Verify bitminded.ch domain in Resend
- [ ] Set up Resend webhook endpoint
- [ ] Create email templates
- [ ] Test email delivery
- [ ] Monitor email analytics

---

## 🔒 Security Best Practices

### Secret Management
- ✅ Never expose SERVICE_ROLE_KEY to client
- ✅ Use environment variables for all secrets
- ✅ Rotate secrets periodically
- ✅ Different keys for test/production

### Admin Verification
```typescript
// Always verify admin role in functions
async function verifyAdmin(authHeader: string) {
  const token = authHeader?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  if (!user) throw new Error('Unauthorized')
  
  const { data: role } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()
  
  if (!role) throw new Error('Forbidden - Admin required')
  
  return user
}
```

### Webhook Verification
```typescript
// Always verify webhook signatures
try {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  )
} catch (err) {
  return new Response('Invalid signature', { status: 400 })
}
```

---

## 📊 Monitoring & Debugging

### Function Logs
```bash
# View function logs
supabase functions logs admin-grant-access

# Stream logs in real-time
supabase functions logs admin-grant-access --tail
```

### Cron Job Monitoring
```sql
-- Check cron execution history
SELECT 
  jobname,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;
```

### Error Tracking
- Log all errors to `admin_activity` table
- Set up Sentry or similar for error monitoring
- Create alerts for failed cron jobs
- Monitor Stripe webhook delivery

---

## 🚀 Deployment

### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy admin-grant-access

# Deploy with different environment
supabase functions deploy --project-ref production-ref
```

### Set Secrets
```bash
# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Verify secrets
supabase secrets list
```

### Configure Webhooks
1. **Stripe**: Add webhook URL in Stripe dashboard
   - URL: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
   - Events: All subscription and payment events

2. **Resend**: Add webhook URL in Resend dashboard
   - URL: `https://[project-ref].supabase.co/functions/v1/resend-webhook`
   - Events: email.delivered, email.opened, email.clicked, etc.

---

**All server-side architecture is now documented. Edge Functions and Cron jobs will handle all secure operations, webhooks, and automation.** ✅


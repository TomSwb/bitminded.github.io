# Cloudflare Pages Automation Setup Guide

This guide explains how to set up full automation for creating Cloudflare Pages projects from GitHub repos.

## Prerequisites

1. **Cloudflare Account** with Workers & Pages enabled
2. **Cloudflare API Token** with Pages edit permissions
3. **GitHub Account** with repos to deploy

## Step 1: Set Up GitHub OAuth in Cloudflare (One-Time)

This is required for automatic GitHub repo linking.

### Instructions:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Overview**
3. Click **GitHub** or go to **Git** integration settings
4. Click **Connect GitHub** or **Authorize Cloudflare**
5. Authorize Cloudflare to access your GitHub repositories
6. Select the repositories you want to allow, or authorize all repos

**Note:** You only need to do this once. After setup, all your repos will be available for automation.

## Step 2: Get Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Edit Cloudflare Workers** template or create custom token with:
   - **Permissions:**
     - `Account.Cloudflare Pages:Edit`
     - `Account.Cloudflare Workers:Edit`
     - `Zone.DNS:Edit` (for custom domains)
4. Copy the token
5. Add it to Supabase Edge Function secrets:
   - Go to Supabase Dashboard → Edge Functions → Settings → Secrets
   - Add: `CLOUDFLARE_API_TOKEN`

## Step 3: Get Cloudflare Account ID

1. In Cloudflare Dashboard, select your account
2. The **Account ID** is shown in the right sidebar
3. Add to Supabase secrets as: `CLOUDFLARE_ACCOUNT_ID`

## Step 4: How It Works

When you create a Worker in the product wizard:

1. **If GitHub repo URL is provided:**
   - System checks for existing Cloudflare Pages project
   - If found, uses the deployment URL
   - If not found, creates new Pages project
   - Attempts to link GitHub repo automatically
   - Returns the Pages URL

2. **If Cloudflare Pages URL is provided directly:**
   - Uses that URL immediately (no creation needed)

3. **Fallback to GitHub Pages:**
   - Only if neither above available
   - ⚠️ **Warning:** GitHub Pages is public and defeats subscription protection

## Step 5: Testing

1. Go to Admin Panel → Products → Create/Edit Product
2. Fill in **Step 3: GitHub Setup** with your GitHub repo URL
3. In **Step 6: Cloudflare Setup**, click **Create Worker**
4. The system will:
   - Check for existing Cloudflare Pages project
   - Create one if needed
   - Link to your GitHub repo (if OAuth is set up)
   - Deploy automatically
   - Return the Pages URL

## Troubleshooting

### "No GitHub connection found"

**Solution:** Set up GitHub OAuth in Cloudflare dashboard (Step 1)

### "Failed to create Pages project"

**Possible causes:**
- Invalid Cloudflare API token or permissions
- Project name already exists (will use existing)
- GitHub OAuth not set up

### "Project created but repo not linked"

**Solution:** 
- Manually link in Cloudflare dashboard: Workers & Pages → [Your Project] → Settings → Git
- Or ensure GitHub OAuth is properly configured

## Manual Fallback

If automation fails, you can:

1. Manually create Cloudflare Pages project in dashboard
2. Get the Pages URL (e.g., `https://measure-mate.pages.dev`)
3. Add it to product data as `cloudflare_pages_url`
4. Recreate the Worker - it will use the provided URL

## Security Note

✅ **Cloudflare Pages** = Private hosting (protected)
❌ **GitHub Pages** = Public hosting (defeats subscription protection)

Always prefer Cloudflare Pages for subscription-based products!


---
# Bitminded – Setup Guide

> This guide explains how to set up and maintain the Bitminded ecosystem:
>
> - **Main site** (`bitminded.ch`) as a PWA dashboard/launcher  
> - **Multiple sub-apps** on subdomains (e.g. `converter.bitminded.ch`, `notes.bitminded.ch`), each installable as a PWA  
> - **Authentication & subscriptions** managed with Supabase + Stripe  
> - **Access control** enforced with Cloudflare Workers

---

## 1. Initial Setup

### 1.1 GitHub Pages

1. Host your frontend code (main site + each sub-app) in GitHub repos.
2. Enable GitHub Pages for each repo → gives you a build URL like `username.github.io/project`.

### 1.2 Cloudflare

1. Point your domain `bitminded.ch` to GitHub Pages (via CNAME in Cloudflare).
2. For each app:
   - Create subdomains in Cloudflare (e.g. `converter.bitminded.ch`).
   - Route them to Cloudflare Workers (not directly to GitHub).

### 1.3 Supabase (Auth + Database)

1. Create a Supabase project.
2. Enable Email/Password auth (or OAuth if desired).
3. Create a `users` table (linked to Supabase auth).
4. Create an `entitlements` table:
   - `user_id` (uuid) → references `auth.users`
   - `app_id` (text) → e.g. "converter"
   - `active` (boolean)
   - `updated_at` (timestamp)

### 1.4 Stripe (Payments)

1. Create products in Stripe → one per app, or bundles.
2. Create a webhook that updates Supabase entitlements when payments succeed or fail.

**Example:**

- User subscribes to “Converter App” → webhook marks `entitlements.active = true`.
- User cancels → webhook flips `active = false`.

### 1.5 Cloudflare Workers (Access Control)

1. Deploy a Worker in front of each sub-app.
2. Worker checks Supabase JWT token + entitlements.
3. If user not entitled → redirect to `bitminded.ch/login`.
4. If entitled → proxy request through to the GitHub Pages sub-app.

---

## 2. Main Site Setup (`bitminded.ch`)

### 2.1 Role

Acts as dashboard/launcher PWA. Handles:

- User login/logout
- Subscription management (Stripe Checkout)
- List of apps + which are unlocked
- Links to each sub-app

### 2.2 Example Manifest.json

```json
{
  "name": "Bitminded",
  "short_name": "Bitminded",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2.3 Service Worker (minimal)

- Cache static shell (CSS, logo, `offline.html`)
- Always fetch entitlements and subscriptions from Supabase (no caching)
- Provide `/offline.html` with message: _“You’re offline. Reconnect to use apps.”_

---

## 3. Sub-App Setup (`converter.bitminded.ch`, etc.)

### 3.1 Role

- Each app is a standalone PWA
- Can be installed separately (like “Unit Converter”) or accessed via main site

### 3.2 Example Manifest.json

```json
{
  "name": "Unit Converter",
  "short_name": "Converter",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8f8f8",
  "theme_color": "#0066ff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3.3 Service Worker (per app)

- Cache static files (HTML, JS, CSS, icons)
- Allow app to load offline if previously visited
- Provide `/offline.html` with message: _“You’re offline. This app requires a valid subscription.”_

---

## 4. User Flow

1. User visits `bitminded.ch` → logs in
2. Sees dashboard with apps (some locked, some unlocked)
3. Clicks an app → Cloudflare Worker checks entitlement
4. If yes → forwards to app
5. If no → redirect back to dashboard with “Subscribe” option

**Install options:**

- Main Bitminded PWA (hub) → access all apps
- Individual PWAs (apps) for shortcuts

---

## 5. Maintenance Notes

**Add a new app:**

1. Make new GitHub repo → enable Pages
2. Add manifest + service worker
3. Create subdomain in Cloudflare → route through Worker
4. Add new product in Stripe → connect webhook to Supabase entitlements
5. Add new app entry in dashboard UI

**Debugging tips:**

> Test Supabase tokens with [jwt.io](https://jwt.io)  
> Use `wrangler dev` to test Workers locally  
> Check Stripe webhook logs for entitlement issues

---

✅ **With this setup:**

- Users can install Bitminded hub or any individual app as a PWA
- Subscriptions are enforced consistently
- Everything is serverless: GitHub Pages (frontend), Supabase (auth/db), Stripe (billing), Cloudflare (edge security)

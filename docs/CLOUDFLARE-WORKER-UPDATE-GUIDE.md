# Cloudflare Worker Update Guide

This guide explains how to update your Cloudflare Workers for measure-mate and rythmo to support the new auth page system.

## What Needs to Change

Your Cloudflare Workers need two updates:

1. **Allow `/auth` routes without authentication** - Users need to access the auth page even when their token is expired
2. **Redirect to `/auth` instead of `bitminded.ch/auth`** - Redirect users to the app's own auth page

## Step-by-Step Instructions

### Option 1: Update via Cloudflare Dashboard (Easiest)

1. **Log into Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your account

2. **Find Your Workers**
   - Navigate to **Workers & Pages** in the sidebar
   - Find these workers:
     - `measure-mate-worker` (or similar name for measure-mate)
     - `rythmo-worker` (or similar name for rythmo)

3. **For Each Worker:**
   - Click on the worker name
   - Click **Edit code** or **Quick edit**
   - You'll see the worker code

4. **Update the Code:**

   Find this section (around line 260-330):
   ```javascript
   async function handleRequest(request) {
     const url = new URL(request.url)

     // Bypass trivial assets...
     if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
       return new Response(null, { status: 204 })
     }
   ```

   **Add this NEW section right after the favicon/robots check (before static assets):**
   ```javascript
   // Allow auth pages to bypass authentication check
   // This allows users to login when their token expires
   if (url.pathname.startsWith('/auth')) {
     const GITHUB_PAGES_URL = 'YOUR_GITHUB_PAGES_URL_HERE' // Keep your existing URL
     if (GITHUB_PAGES_URL) {
       const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
       return fetch(targetUrl, {
         headers: request.headers,
         method: request.method,
         body: request.body
       })
     }
   }
   ```

   **Find the redirect section (around line 308-312):**
   ```javascript
   if (!token) {
     return new Response(null, {
       status: 302,
       headers: { 'Location': LOGIN_URL + '?redirect=' + encodeURIComponent(url.href) }
     })
   }
   ```

   **Replace it with:**
   ```javascript
   if (!token) {
     // Redirect to app's own auth page instead of main site
     const authUrl = '/auth?redirect=' + encodeURIComponent(url.pathname + url.search)
     return new Response(null, {
       status: 302,
       headers: { 'Location': authUrl }
     })
   }
   ```

   **Remove the LOGIN_URL constant** (if it exists, around line 232):
   ```javascript
   // DELETE THIS LINE:
   const LOGIN_URL = 'https://bitminded.ch/auth'
   ```

5. **Save and Deploy**
   - Click **Save and deploy** or **Deploy**
   - Changes take effect immediately

### Option 2: Update via Wrangler CLI (If you have local files)

If you have the Worker code locally:

1. **Find your Worker files** (usually named something like `measure-mate-worker.js` or in a `workers/` folder)

2. **Make the same changes** as described in Option 1

3. **Deploy:**
   ```bash
   wrangler deploy
   ```

## Complete Worker Code Example

Here's what the updated `handleRequest` function should look like:

```javascript
async function handleRequest(request) {
  const url = new URL(request.url)

  // Bypass trivial assets
  if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
    return new Response(null, { status: 204 })
  }

  // Allow auth pages to bypass authentication check
  // This allows users to login when their token expires
  const GITHUB_PAGES_URL = 'YOUR_GITHUB_PAGES_URL_HERE'
  if (url.pathname.startsWith('/auth')) {
    if (GITHUB_PAGES_URL) {
      const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
      return fetch(targetUrl, {
        headers: request.headers,
        method: request.method,
        body: request.body
      })
    }
  }

  // Proxy static assets directly to GitHub Pages without authentication
  if (GITHUB_PAGES_URL && (
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    // ... rest of static asset checks
  )) {
    const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
    return fetch(targetUrl, {
      headers: request.headers,
      method: request.method,
      body: request.body
    })
  }

  const token = getToken(request)

  if (!token) {
    // Redirect to app's own auth page instead of main site
    const authUrl = '/auth?redirect=' + encodeURIComponent(url.pathname + url.search)
    return new Response(null, {
      status: 302,
      headers: { 'Location': authUrl }
    })
  }

  // ... rest of your existing validation logic
}
```

## Verification

After updating:

1. **Test expired token redirect:**
   - Visit `measure-mate.bitminded.ch` (or `rythmo.bitminded.ch`) with an expired token
   - Should redirect to `/auth` (not `bitminded.ch/auth`)

2. **Test auth page access:**
   - Visit `measure-mate.bitminded.ch/auth` directly
   - Should load the login page (no redirect loop)

3. **Test login flow:**
   - Login on the auth page
   - Should redirect back to app root

## Troubleshooting

**If `/auth` still redirects:**
- Make sure the `/auth` bypass is placed BEFORE the token check
- Check that `url.pathname.startsWith('/auth')` is correct

**If login doesn't work:**
- Verify the auth page files are deployed to GitHub Pages
- Check browser console for errors
- Ensure Supabase config in `auth/config.js` is correct

**If token checker doesn't work:**
- Verify the token checker script is in `index.html`
- Check browser console for errors
- The token checker runs before Worker intercepts, so it should work even if Worker isn't updated yet

## Notes

- The token checker in `index.html` will handle redirects even if the Worker isn't updated yet
- However, updating the Worker ensures consistency and handles edge cases
- The `/auth` bypass must come BEFORE the token check
- Make sure to keep your existing `GITHUB_PAGES_URL` constant


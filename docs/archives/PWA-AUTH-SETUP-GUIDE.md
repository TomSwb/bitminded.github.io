# PWA Auth Setup Guide

This guide explains how to add the auth page system to existing apps (measure-mate and rythmo) to fix the PWA token expiration issue.

## Problem

When PWAs are installed, they run in a separate browser context. After the JWT token expires (~1 hour), users can't access the app because:
1. Token expires in localStorage
2. Cloudflare Worker redirects to `bitminded.ch/auth`
3. PWAs can't navigate to external URLs, making the app unusable

## Solution

Each app now has its own `/auth` page that:
- Uses the same design as the main BitMinded site
- Connects to BitMinded Supabase backend
- Only shows login (no signup - users sign up on bitminded.ch)
- Redirects back to the app after successful login

## Steps to Add to Existing Apps

### Step 1: Create Auth Folder Structure

In your app's GitHub repo, create the following folder structure:

```
your-app/
├── auth/
│   ├── index.html
│   ├── auth.css
│   ├── auth.js
│   └── config.js
```

### Step 2: Copy Auth Files

Copy the auth files from a newly created app, or use the templates below. The files are already generated automatically for new apps created through the product wizard.

### Step 3: Update Cloudflare Worker

The Cloudflare Worker needs to:
1. Allow `/auth` routes without authentication
2. Redirect to `/auth` instead of `bitminded.ch/auth` when no token

**If you have access to update the Worker:**
- Add `/auth` route bypass (already done in new Workers)
- Change redirect from `LOGIN_URL` to `/auth`

**If you can't update the Worker:**
- The token checker in `index.html` will handle redirects before the Worker intercepts

### Step 4: Add Token Checker to index.html

Add this script to your app's `index.html` (before closing `</head>` tag):

```html
<script>
(function() {
  'use strict';
  // Only run on protected subdomain, not GitHub Pages
  const hostname = window.location.hostname;
  if (!hostname.includes('bitminded.ch')) return;
  
  // Skip token check for auth pages
  if (window.location.pathname.startsWith('/auth')) return;
  
  try {
    // Check localStorage for Supabase session
    // Try to find any Supabase session key
    let sessionKey = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('sb-') && key.includes('-auth-token')) {
        sessionKey = key;
        break;
      }
    }
    
    if (!sessionKey) return;
    
    const sessionData = localStorage.getItem(sessionKey);
    if (!sessionData) return;
    
    const session = JSON.parse(sessionData);
    if (!session || !session.expires_at) return;
    
    // Check if token is expired (expires_at is in seconds)
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // If expired or expires in less than 5 minutes, redirect to auth
    if (now >= expiresAt || (expiresAt - now) < 5 * 60 * 1000) {
      console.log('Token expired or expiring soon, redirecting to auth...');
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    }
  } catch (e) {
    // Silently fail - Cloudflare Worker will handle auth check
    console.debug('Token check error:', e);
  }
})();
</script>
```

### Step 5: Customize Colors (Optional)

To customize the auth page colors to match your app, add CSS variable overrides to your app's main CSS file:

```css
:root {
  --auth-color-primary: rgb(207, 222, 103); /* Your primary color */
  --auth-color-secondary: rgb(210, 134, 189); /* Your secondary color */
  --auth-color-background: rgb(39, 43, 46); /* Your background color */
  /* ... other variables as needed */
}
```

## Files Reference

### auth/index.html
- Login-only form
- Links to bitminded.ch for signup and password reset
- Loads Supabase from CDN
- Includes config.js and auth.js

### auth/config.js
- App-specific configuration
- Supabase URL and anon key
- App name and subdomain

### auth/auth.css
- Base styles matching BitMinded design
- CSS variables for easy customization
- Responsive design

### auth/auth.js
- Login form handling
- Supabase authentication
- Token sync to cookies for Cloudflare Worker
- Redirect logic after login
- Note: Apps skip 2FA - only main website requires 2FA verification

## Testing

1. **Test Login Flow:**
   - Visit `app-subdomain.bitminded.ch/auth`
   - Should show login form
   - Login with valid credentials
   - Should redirect back to app root

2. **Test Token Expiration:**
   - Log in to app
   - Wait for token to expire (or manually expire in localStorage)
   - Visit app root
   - Should redirect to `/auth`

3. **Test PWA:**
   - Install app as PWA
   - Wait for token to expire
   - Open PWA
   - Should redirect to `/auth` and allow login

## Notes

- Signup is only available on `bitminded.ch` (not in app auth pages)
- Password reset links to `bitminded.ch/auth?action=forgot-password`
- **Apps skip 2FA** - 2FA is only required for main website access (bitminded.ch), not for individual apps
- All authentication uses BitMinded Supabase backend
- Tokens are synced to cookies for Cloudflare Worker access


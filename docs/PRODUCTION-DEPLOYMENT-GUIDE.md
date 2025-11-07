# Production Deployment Guide
**Last Updated**: October 2025  
**Status**: Pre-Production Checklist

---

## 🎯 Overview

This guide walks you through safely deploying to production while maintaining a dev environment for continued development.

**Current Status:**
- ✅ Dev branch: Fully functional with admin panel
- ✅ Main branch: Stable base (needs updates)
- ✅ Domain: `bitminded.ch` configured
- ⚠️ Supabase: Single environment (needs production setup)

---

## 📋 Pre-Deployment Strategy

### Phase 1: Supabase Environment Setup ⭐ **START HERE**
### Phase 2: Code Preparation
### Phase 3: Testing & Verification
### Phase 4: Deployment
### Phase 5: Post-Deployment Monitoring

---

## Phase 1: Supabase Environment Setup

### Option A: Two Separate Supabase Projects (RECOMMENDED) ✅

**Why This Approach:**
- ✅ Complete isolation between dev and production
- ✅ No risk of dev breaking production
- ✅ Separate billing and usage tracking
- ✅ Different databases, different users

**Setup:**

1. **Create Production Supabase Project**
   - Go to Supabase Dashboard → New Project
   - Name: `bitminded-production`
   - Region: Same as dev (for consistency)
   - Database Password: **SAVE THIS SECURELY**

2. **Create Dev Supabase Project** (or keep current as dev)
   - Name: `bitminded-dev`
   - Use for all development and testing

3. **Configure Secrets:**

   **Production Project:**
   ```bash
   # Edge Functions Secrets (production)
   RESEND_API_KEY=re_xxx... (production key)
   STRIPE_SECRET_KEY=sk_live_xxx... (LIVE mode)
   STRIPE_WEBHOOK_SECRET=whsec_xxx... (production webhook)
   TURNSTILE_SECRET_KEY=0x4xxx... (production key)
   ```

   **Dev Project:**
   ```bash
   # Edge Functions Secrets (development)
   RESEND_API_KEY=re_xxx... (test key or same)
   STRIPE_SECRET_KEY=sk_test_xxx... (TEST mode)
   STRIPE_WEBHOOK_SECRET=whsec_xxx... (dev webhook)
   TURNSTILE_SECRET_KEY=0x4xxx... (test key or same)
   ```

4. **Database Setup:**

   **Production:**
   - Run all migrations in order
   - Create admin user
   - Verify RLS policies
   - Test authentication

   **Dev:**
   - Keep current setup
   - Continue development freely

---

### Option B: Single Supabase Project with Branching (NOT RECOMMENDED)

**Why Not Recommended:**
- ❌ Single point of failure
- ❌ Dev changes can affect production
- ❌ Harder to roll back
- ❌ Shared rate limits

**If you choose this anyway:**
- Use database schemas to separate environments
- Use different service role keys
- Implement strict access control

---

## Phase 2: Code Preparation

### Step 1: Environment-Aware Configuration

**Current Issue:** Hardcoded Supabase URL in `js/supabase-config.js`

**Solution:** Create environment detection

Create: `js/environment-config.js`
```javascript
// Environment detection and configuration
const ENV_CONFIG = {
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.port !== '',
    
    isProduction: window.location.hostname === 'bitminded.ch',
    
    isStaging: window.location.hostname === 'dev.bitminded.ch' ||
               window.location.hostname.includes('github.io')
};

// Supabase configuration based on environment
const SUPABASE_CONFIG = ENV_CONFIG.isProduction 
    ? {
        // Production Supabase
        url: 'https://YOUR_PROD_PROJECT.supabase.co',
        anonKey: 'YOUR_PROD_ANON_KEY'
      }
    : {
        // Development/Staging Supabase
        url: 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      };

// Initialize Supabase client
const { createClient } = supabase;
window.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
window.ENV = ENV_CONFIG;
```

### Step 2: Update All Hardcoded URLs

**Files to Update:**

1. **`components/captcha/captcha.js` (line 434)**
   - Change: `const supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co';`
   - To: `const supabaseUrl = window.supabase.supabaseUrl;`

2. **`auth/components/signup-form/signup-form.js` (line 770)**
   - Change: `return '127.0.0.1'; // Fallback for localhost`
   - To: `return 'unknown'; // Fallback when IP detection fails`

### Step 3: Console Logging Strategy

**Options:**

**A. Keep All Logs (Easiest)**
- Console logs are harmless in production
- Only visible in browser DevTools
- Helps with support and debugging
- **Recommendation: Keep them for now**

**B. Remove All Logs (Most Secure)**
- Creates a build process
- More complex deployment
- **Not recommended for static GitHub Pages**

**C. Debug Flag System (Middle Ground)**
```javascript
const DEBUG = window.ENV?.isDevelopment || false;
if (DEBUG) console.log('...');
```

---

## Phase 3: Database Migration Strategy

### For Two Separate Projects (Recommended):

**Production Database Setup:**

1. **Run Migrations in Order:**
   ```sql
   -- 1. Core schema
   /supabase/schema/database-schema.sql
   
   -- 2. Login tracking
   /supabase/schema/login-activity-tracking.sql
   
   -- 3. Admin tables
   /supabase/schema/admin-tables.sql
   
   -- 4. Storage setup
   /supabase/schema/storage-setup.sql
   
   -- 5. Consent tracking
   /supabase/schema/consent-tracking-system.sql
   
   -- 6. Migrations
   /supabase/migrations/add_email_to_user_profiles.sql
   /supabase/migrations/fix_user_detail_data_tracking.sql
   /supabase/migrations/fix_admin_activity_schema.sql
   /supabase/migrations/add_cascade_delete_to_user_profiles.sql
   ```

2. **Create Admin User:**
   ```sql
   -- Use the SQL from /supabase/debug/add-admin-role.sql
   -- Replace with YOUR production admin user ID
   ```

3. **Deploy Edge Functions:**
   ```bash
   # Login to production project
   supabase link --project-ref YOUR_PROD_PROJECT_REF
   
   # Deploy all functions
   supabase functions deploy log-login
   supabase functions deploy verify-2fa-code
   supabase functions deploy verify-captcha
  supabase functions deploy send-support-request
   supabase functions deploy send-notification-email
   supabase functions deploy schedule-account-deletion
   supabase functions deploy cancel-account-deletion
   supabase functions deploy process-account-deletions
   supabase functions deploy send-deletion-email
   supabase functions deploy revoke-session
   supabase functions deploy create-notification
   supabase functions deploy delete-user
   ```

4. **Configure Secrets:**
   ```bash
   # Production secrets
   supabase secrets set RESEND_API_KEY=re_xxx...
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx...
   supabase secrets set TURNSTILE_SECRET_KEY=0x4xxx...
   ```

---

## Phase 4: GitHub Branch Strategy

### Current Setup:
```
main (production - live at bitminded.ch)
  └── dev (development - your current work)
```

### Recommended Workflow:

**1. Before Deployment:**
```bash
# Make sure dev is clean and working
git checkout dev
git status

# Update main with dev changes
git checkout main
git merge dev

# Review changes
git log --oneline -10

# Push to main (triggers GitHub Pages deployment)
git push origin main

# Go back to dev for continued development
git checkout dev
```

**2. After Deployment:**
```bash
# Continue development on dev branch
git checkout dev

# Make changes, commit, push to dev
git add .
git commit -m "feat: new feature"
git push origin dev

# When ready for production again, merge to main
```

---

## Phase 5: Critical Pre-Deployment Checklist

### ⚠️ MUST DO BEFORE PUSHING TO MAIN

- [ ] **1. Create Production Supabase Project**
- [ ] **2. Update `js/supabase-config.js` or create `js/environment-config.js`**
- [ ] **3. Run ALL database migrations in production**
- [ ] **4. Deploy ALL Edge Functions to production**
- [ ] **5. Configure ALL secrets in production Supabase**
- [ ] **6. Create production admin user**
- [ ] **7. Test authentication flow in production**
- [ ] **8. Update Stripe webhook URL** (point to production Edge Function)
- [ ] **9. Test Stripe integration** (use test mode first)
- [ ] **10. Verify all RLS policies are working**

### 🔍 Optional But Recommended

- [ ] Remove test data from SQL files
- [ ] Update Google Analytics ID (if using)
- [ ] Test all forms (contact, signup, login, 2FA)
- [ ] Test admin panel access control
- [ ] Test user deletion flow
- [ ] Verify email delivery (Resend)
- [ ] Test mobile responsiveness
- [ ] Check all navigation links
- [ ] Verify CNAME is still `bitminded.ch`

---

## Phase 6: Deployment Steps

### Step-by-Step Deployment:

**1. Final Dev Branch Cleanup:**
```bash
git checkout dev
git add .
git commit -m "chore: pre-production cleanup"
git push origin dev
```

**2. Create Production Release:**
```bash
# Switch to main
git checkout main

# Merge dev (this brings all your admin panel work)
git merge dev

# Review what's being deployed
git log --oneline main..origin/main
git diff origin/main

# Push to main (triggers deployment)
git push origin main
```

**3. GitHub Pages Deployment:**
- GitHub will automatically deploy `main` branch to `bitminded.ch`
- Wait 1-2 minutes for deployment
- Check: `https://bitminded.ch`

**4. Verify Production:**
- Visit `https://bitminded.ch`
- Test login
- Test signup
- Test admin panel access
- Check all features work

**5. Monitor for Issues:**
- Check browser console for errors
- Check Supabase logs for auth issues
- Test on mobile devices
- Verify emails are sending

---

## Phase 7: Post-Deployment

### If Everything Works:
```bash
# Continue development on dev
git checkout dev

# Dev and main are now in sync
# Make new changes on dev branch
```

### If Issues Found:
```bash
# Quick rollback
git checkout main
git revert HEAD
git push origin main

# Or rollback to previous commit
git reset --hard HEAD~1
git push origin main --force
```

---

## 🚨 Critical Security Considerations

### What's Safe to Expose:
- ✅ Supabase URL (public)
- ✅ Supabase Anon Key (public, protected by RLS)
- ✅ Turnstile Site Key (public)
- ✅ Stripe Publishable Key (public)

### What Must Stay Secret:
- 🔒 Supabase Service Role Key (NEVER in frontend)
- 🔒 Stripe Secret Key (only in Edge Functions)
- 🔒 Resend API Key (only in Edge Functions)
- 🔒 Turnstile Secret Key (only in Edge Functions)

### Current Status:
- ✅ All secrets are in Edge Functions (server-side)
- ✅ No service role keys in frontend
- ✅ RLS policies protect database
- ⚠️ Supabase URL/Anon Key in source (this is OK, but some prefer env vars)

---

## 🔧 Recommended: Environment-Based Config

### Implementation:

**1. Create `js/env-config.js`:**
```javascript
// Environment detection
const hostname = window.location.hostname;
const isProduction = hostname === 'bitminded.ch';
const isDev = hostname === 'localhost' || hostname === '127.0.0.1';

// Export configuration
window.ENV = {
    isProduction,
    isDev,
    apiUrl: isProduction 
        ? 'https://YOUR_PROD_PROJECT.supabase.co' 
        : 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
    anonKey: isProduction
        ? 'YOUR_PROD_ANON_KEY'
        : 'YOUR_DEV_ANON_KEY'
};
```

**2. Update `js/supabase-config.js`:**
```javascript
// Use environment config
const SUPABASE_CONFIG = {
    url: window.ENV?.apiUrl || 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
    anonKey: window.ENV?.anonKey || 'YOUR_ANON_KEY'
};

window.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
```

**3. Load env-config.js first in all HTML files:**
```html
<script src="/js/env-config.js"></script>
<script src="/js/supabase-config.js"></script>
```

---

## 🎬 Quick Start: Production Deployment Now

### If You Want to Deploy Immediately (Simplest Approach):

**Requirements:**
- Use SAME Supabase project for both dev and production
- Accept that dev and production share database
- Be careful with testing

**Steps:**

1. **Verify Current State:**
   ```bash
   git checkout dev
   git status  # Should be clean
   ```

2. **Test Everything on Dev:**
   - Login/Signup working
   - Admin panel accessible
   - User management working
   - User detail working
   - Delete user working

3. **Merge to Main:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

4. **Wait for GitHub Pages:**
   - Takes 1-2 minutes
   - Check `https://bitminded.ch`

5. **Verify Production:**
   - Login with admin account
   - Test admin panel
   - Everything should work!

---

## 🛡️ Recommended: Two Supabase Projects (Proper Setup)

### Step-by-Step for Production + Dev Separation:

**1. Create Production Supabase Project:**
   - Dashboard → New Project
   - Name: `bitminded-production`
   - Save credentials

**2. Set Up Production Database:**
   ```sql
   -- Run these in order in production Supabase SQL Editor:
   
   -- A. Core tables
   -- Copy contents of /supabase/schema/database-schema.sql
   
   -- B. Login tracking
   -- Copy contents of /supabase/schema/login-activity-tracking.sql
   
   -- C. Admin tables  
   -- Copy contents of /supabase/schema/admin-tables.sql
   
   -- D. Storage
   -- Copy contents of /supabase/schema/storage-setup.sql
   
   -- E. Migrations
   -- Copy each file from /supabase/migrations/ in order
   ```

**3. Deploy Production Edge Functions:**
   ```bash
   # Link to production
   supabase link --project-ref YOUR_PROD_REF
   
   # Deploy all functions
   cd supabase/functions
   for func in */; do
       supabase functions deploy "${func%/}"
   done
   ```

**4. Configure Production Secrets:**
   ```bash
   # Set production API keys
   supabase secrets set RESEND_API_KEY=your_production_key
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   # ... etc for all secrets
   ```

**5. Create Production Admin User:**
   - Sign up on production site
   - Run SQL to add admin role
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('your-production-user-id', 'admin');
   ```

**6. Update Frontend Config:**

   Create `js/env-config.js`:
   ```javascript
   const isProduction = window.location.hostname === 'bitminded.ch';
   
   window.SUPABASE_CONFIG = isProduction ? {
       url: 'https://PROD_PROJECT.supabase.co',
       anonKey: 'PROD_ANON_KEY'
   } : {
       url: 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
       anonKey: 'DEV_ANON_KEY'
   };
   ```

**7. Deploy to Main:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

---

## 📊 Quick Decision Matrix

| Scenario | Recommendation | Reason |
|----------|---------------|---------|
| **First deployment, want simplest** | Single Supabase project | Fastest to deploy |
| **Planning long-term development** | Two Supabase projects | Best practice, safest |
| **Limited budget** | Single project with care | Free tier on both might exceed limits |
| **Team collaboration** | Two projects | Clear separation |
| **Just testing production** | Single project | Can upgrade later |

---

## 🎯 MY RECOMMENDATION FOR YOU

Based on your situation, I recommend:

### **Approach: Single Supabase Project Initially**

**Why:**
1. You're the only developer (simpler)
2. Faster to deploy (no new project setup)
3. Can always create separate production later
4. Current Supabase has all your data and config

**Safety Measures:**
1. ✅ Work only on `dev` branch for development
2. ✅ Test thoroughly before merging to `main`
3. ✅ Use Stripe **TEST mode** until ready for real payments
4. ✅ Backup database before major changes
5. ✅ Monitor Supabase usage carefully

**When to Create Separate Production:**
- When you have real paying customers
- When you need to test breaking changes
- When usage exceeds free tier
- When you want absolute safety

---

## 🚀 Action Plan: Deploy to Production Today

### STEP-BY-STEP (Safest, Simplest):

**1. Pre-Flight Check (5 minutes):**
```bash
# On dev branch
git status
# Should show: "nothing to commit, working tree clean"

# Test locally one more time
# Visit http://localhost:5501 (or your local server)
# Test: Login, Admin Panel, User Management, User Detail
```

**2. Deploy (2 minutes):**
```bash
# Merge dev to main
git checkout main
git merge dev --no-ff -m "Release: Admin panel v1.0 - User management and detail pages"

# Push to production
git push origin main

# Return to dev for continued work
git checkout dev
```

**3. Verify Production (5 minutes):**
```bash
# Wait 1-2 minutes for GitHub Pages deployment
# Visit https://bitminded.ch

# Test:
# - Homepage loads
# - Login works
# - Admin panel accessible (for admin users)
# - User management loads
# - User detail works
```

**4. Monitor (Ongoing):**
```bash
# Check Supabase Dashboard:
# - Auth logs
# - Database usage
# - Edge Function invocations
# - Any errors
```

---

## 🆘 Rollback Plan

### If Something Breaks:

**Quick Rollback:**
```bash
git checkout main
git reset --hard HEAD~1  # Go back one commit
git push origin main --force  # Force push to production
```

**Safer Rollback (Creates new commit):**
```bash
git checkout main
git revert HEAD  # Create revert commit
git push origin main  # Push revert
```

---

## 📝 Post-Deployment Tasks

### After Successful Deployment:

- [ ] Update documentation with production URLs
- [ ] Set up monitoring (Supabase Dashboard)
- [ ] Configure Stripe webhooks to production URL
- [ ] Test email delivery (Resend)
- [ ] Add Google Analytics (optional)
- [ ] Set up backup schedule
- [ ] Document rollback procedure
- [ ] Create incident response plan

---

## 🎓 Next Steps After Production

1. **Continue Development:**
   - Stay on `dev` branch
   - Test new features thoroughly
   - Merge to `main` when stable

2. **Consider Separate Production Later:**
   - When you have real users
   - When budget allows
   - When risk tolerance changes

3. **Implement Advanced Features:**
   - Monitoring and alerts
   - Error tracking (Sentry)
   - Analytics
   - Performance monitoring

---

## 📞 Need Help?

### Common Issues:

**Q: Site doesn't update after pushing?**
A: Clear browser cache, wait 2-3 minutes, check GitHub Actions

**Q: Database not connecting?**
A: Check Supabase config, verify anon key, check network tab

**Q: Admin panel not accessible?**
A: Verify admin role in database, check RLS policies

**Q: Features work on dev but not production?**
A: Check console errors, verify Supabase config, check Edge Functions deployed

---

## ✅ You're Ready When:

- [ ] All tests pass on dev branch
- [ ] Database migrations documented and ready
- [ ] Edge Functions deployed (or ready to deploy)
- [ ] Secrets configured (or ready to configure)
- [ ] Rollback plan understood
- [ ] Monitoring plan in place

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Status**: Ready for review


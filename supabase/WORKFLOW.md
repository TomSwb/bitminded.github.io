# Development to Production Workflow

This guide explains how to safely develop and deploy changes to your application.

## Overview

```
Local Development (localhost)  →  Test in Dev DB  →  Deploy to Production
        ↓                              ↓                      ↓
   Uses Dev Supabase          Test thoroughly        Live on bitminded.ch
```

## The Setup

### Two Separate Databases
1. **Dev**: `eygpejbljuqpxwwoawkn` - for testing
2. **Prod**: `dynxqnrkmjcvgzsugxtm` - for real users

### Automatic Environment Detection
- **localhost** → Dev database
- **bitminded.ch** → Production database

No manual switching needed!

---

## Workflow: Making Changes

### 1. Develop Locally (Dev Database)

```bash
# Start your local server (port 5501, etc.)
# App automatically connects to DEV database
```

**Test your changes:**
- Create test users
- Break things without worry
- Experiment freely

### 2. Database Changes (Dev First!)

**When you need to add/change tables:**

1. **Write the SQL migration**
   ```sql
   -- Example: Add a new column
   ALTER TABLE user_profiles 
   ADD COLUMN last_seen TIMESTAMP;
   ```

2. **Run in DEV SQL Editor**
   - Go to: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/sql
   - Paste and run your SQL
   - Test thoroughly on localhost

3. **Document it**
   ```bash
   # Add to: supabase/dev/pending-migrations.md
   # Include: SQL, date, description
   ```

### 3. Edge Function Changes (Dev First!)

**When updating Edge Functions:**

1. **Test locally** with dev database

2. **Deploy to dev**
   ```bash
   supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn
   ```

3. **Test on localhost** - function uses dev database

4. **Document**
   ```bash
   # Update: supabase/dev/deployed-functions.md
   ```

### 4. Deploy to Production

**After thorough testing in dev:**

#### A. Frontend Changes (Code)
```bash
git add .
git commit -m "Description of changes"
git push origin main
```
- Deploys automatically to bitminded.ch
- Uses production database

#### B. Database Migration
1. Go to **PROD** SQL Editor
2. Copy the same SQL from dev
3. Run it carefully
4. Test on bitminded.ch
5. Update `supabase/prod/applied-migrations.md`
6. Remove from `supabase/dev/pending-migrations.md`

#### C. Edge Function
```bash
# Deploy to production
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```
- Update `supabase/prod/deployed-functions.md`

---

## Tracking Changes

### Use These Files

**Dev (Pending)**
- `supabase/dev/pending-migrations.md` - SQL not yet in prod
- `supabase/dev/deployed-functions.md` - Functions in dev

**Prod (Applied)**
- `supabase/prod/applied-migrations.md` - SQL in production
- `supabase/prod/deployed-functions.md` - Functions in prod

### The Flow

```
1. Test in dev
   ↓
2. Add to dev/pending-migrations.md
   ↓
3. When ready for prod
   ↓
4. Apply to production
   ↓
5. Move to prod/applied-migrations.md
   ↓
6. Remove from dev/pending-migrations.md
   ↓
7. Done! Both environments in sync
```

---

## Safety Rules

### ✅ DO
- Test everything in dev first
- Document all changes
- Have rollback SQL ready
- Check both environments stay in sync
- Use the tracking files

### ❌ DON'T
- Test directly in production
- Skip dev testing
- Forget to document migrations
- Push without testing
- Lose track of what's deployed where

---

## Quick Reference

### Check Current Environment
Open browser console:
```javascript
console.log(window.ENV_CONFIG);
// Shows: {isDevelopment: true, ...} or {isProduction: true, ...}
```

### Deploy Commands

**Dev:**
```bash
supabase functions deploy <name> --project-ref eygpejbljuqpxwwoawkn
```

**Prod:**
```bash
supabase functions deploy <name> --project-ref dynxqnrkmjcvgzsugxtm
```

### Dashboards

**Dev**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn  
**Prod**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm

---

## Example: Adding a New Feature

```
1. Code the feature locally
2. Test on localhost (uses dev DB)
3. Need new database column?
   a. Write SQL migration
   b. Run in dev SQL Editor
   c. Add to dev/pending-migrations.md
   d. Test thoroughly
4. Need new Edge Function?
   a. Deploy to dev
   b. Test on localhost
   c. Update dev/deployed-functions.md
5. Everything works?
   a. git push (deploys code to production)
   b. Run SQL in prod SQL Editor
   c. Deploy function to prod
   d. Update prod tracking files
   e. Clear from dev/pending files
6. Test on bitminded.ch
7. Done!
```

---

## When Things Go Wrong

### Rollback Options

**Frontend (code)**:
```bash
git revert <commit-hash>
git push origin main
```

**Database**:
Run the rollback SQL you prepared

**Edge Function**:
Deploy previous version or fix and redeploy

---

## Summary

- **Dev** = Safe playground (localhost)
- **Prod** = Real users (bitminded.ch)
- **Always test in dev first**
- **Track everything**
- **Keep environments in sync**

Your workflow is now safe, organized, and tracked! 🎉


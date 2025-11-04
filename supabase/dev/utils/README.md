# Dev Database Utilities

Utility scripts for managing the development database.

## Fixing 406 Error on user_profiles

If you're getting a `406 (Not Acceptable)` error when trying to access `user_profiles` in the dev environment:

```
GET https://eygpejbljuqpxwwoawkn.supabase.co/rest/v1/user_profiles?... 406 (Not Acceptable)
```

### Diagnosis

1. First, run the diagnostic script to check the current state:
   ```sql
   -- Run: DIAGNOSE_USER_PROFILES.sql
   -- In: Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)
   ```

### Solution

2. Run the fix script:
   ```sql
   -- Run: FIX_USER_PROFILES_406_ERROR.sql
   -- In: Supabase SQL Editor for dev project (eygpejbljuqpxwwoawkn)
   ```

This script will:
- ✅ Create the `user_profiles` table if it doesn't exist
- ✅ Add all required columns
- ✅ Enable Row Level Security (RLS)
- ✅ Set up proper RLS policies (users see own, admins see all)
- ✅ Create necessary indexes
- ✅ Grant proper permissions

### Common Causes

The 406 error typically happens when:
- **Profile record is missing** (most common after reset)
- The table doesn't exist in the dev database
- RLS policies are missing or incorrect
- The table isn't properly exposed via PostgREST API
- Schema/permissions are misconfigured

### Check if Profile is Missing

**Option 1: SQL Editor** (Recommended)
```sql
-- Run: CHECK_PROFILE_EXISTS.sql
-- Shows detailed info about your profile status
```

**Option 2: Browser Console**
```javascript
// Paste in browser console (F12)
(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    const { data: profile, error } = await window.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    
    if (profile) {
        console.log('✅ Profile exists:', profile);
    } else {
        console.log('❌ Profile missing - run FIX_USER_PROFILES_406_ERROR.sql');
    }
})();
```

**Quick SQL Check:**
```sql
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid())
        THEN '✅ Profile EXISTS'
        ELSE '❌ Profile MISSING'
    END as status;
```

### Verification

After running the fix script, verify:
1. The table exists: Check in Supabase Dashboard → Database → Tables
2. RLS is enabled: Should show "Row Level Security: Enabled"
3. Policies exist: Check the Policies tab for the table
4. Test query: Try querying the table via the API or SQL Editor

## Files

- `CHECK_PROFILE_EXISTS.sql` - Check if your user has a profile record
- `DIAGNOSE_USER_PROFILES.sql` - Diagnostic script to check table state
- `TEST_USER_PROFILES_ACCESS.sql` - Test API access and RLS policies
- `FIX_USER_PROFILES_406_ERROR.sql` - Fix script for 406 errors (creates profile if missing)
- `COMPLETE_RESET.sql` - Complete database reset (drops all tables)
- `DROP_TRIGGER.sql` - Utility to drop triggers
- `FIX_STORAGE_BUCKET.sql` - Storage bucket fixes
- `CHECK_PROFILE_BROWSER.md` - Browser console snippets for checking profile

## Usage

All scripts should be run in the **Supabase SQL Editor** for the **dev project**:
- Dev project: `eygpejbljuqpxwwoawkn`
- Dashboard: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn

**⚠️ Important**: These scripts are for the **dev database only**. Never run them on production!


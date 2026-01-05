# Applied Migrations - Production Database

These SQL migrations have been successfully applied to **PRODUCTION**.

## Database Status: ✅ 17 tables, all functions, triggers, and RLS policies in place

Last updated: 2025-01-05

---

## Applied Migrations

### Initial Schema Setup
**Date**: 2025-01-15  
**Source**: 45 SQL migrations from production history  
**Description**: Complete database schema including:
- User authentication and profiles
- 2FA system
- Notifications system
- Login activity tracking
- Admin functionality
- Account deletion system
- Session management
- RLS policies
- Storage buckets

**Tables Created** (17 total):
1. user_profiles
2. user_roles
3. user_2fa
4. user_sessions
5. user_preferences
6. user_subscriptions
7. entitlements
8. login_activity
9. password_tracking
10. contact_messages
11. account_deletions
12. admin_activity
13. admin_notes
14. notifications
15. notification_preferences
16. user_notifications
17. (plus auth system tables)

**Status**: ✅ Applied and tested

---

### Migration: Fix Family Member Age Validation Trigger
**Date**: 2025-01-05  
**File**: `migrations/20251205_fix_family_member_age_validation.sql`  
**Description**: Fixes the `validate_family_member_constraints()` trigger function to correctly validate the age of the NEW record being inserted during an `INSERT` operation, rather than only relying on existing records. This ensures the first family member (admin) can be added without age validation errors.

**Issue**: When inserting the first family member (admin), the validation function only checked existing records in the table, but the NEW record hadn't been inserted yet, causing validation to fail with "Family must have at least one adult member (age >= 18). The admin must be an adult."

**Solution**: Modified the trigger function to explicitly check the NEW record's `age` and `user_id` (admin) when `existing_member_count` is 0 (i.e., during the first member insert), allowing the admin to be added if their age is valid.

**SQL**:
```sql
-- Updates validate_family_member_constraints() function
-- See: supabase/migrations/20251205_fix_family_member_age_validation.sql
```

**Rollback**: Revert to previous version of `validate_family_member_constraints()` function from `20251125_create_family_plans_schema.sql`

**Status**: ✅ Applied successfully to both DEV and PROD (2025-01-05)

---

## Cron Jobs

### account-deletion-processing
**Enabled**: ✅ Yes  
**Schedule**: Daily at midnight UTC  
**Function**: process-account-deletions

### deletion-reminder-emails  
**Enabled**: ✅ Yes  
**Schedule**: Daily at 9 AM UTC  
**Function**: send-deletion-reminders

---

## How to Add New Migrations

1. Test in dev first (see `dev/pending-migrations.md`)
2. Apply to production
3. Add entry here with:
   - Date applied
   - SQL file or inline SQL
   - Description of changes
   - Rollback plan (if applicable)
4. Remove from `dev/pending-migrations.md`

---

## Example Entry Format

```
### Migration: Add last_login_ip column
**Date**: 2025-01-16
**File**: migrations/add_login_ip.sql
**Description**: Tracks user IP on login

**SQL**:
```sql
ALTER TABLE public.user_profiles 
ADD COLUMN last_login_ip INET;
```

**Rollback**:
```sql
ALTER TABLE public.user_profiles 
DROP COLUMN last_login_ip;
```

**Status**: ✅ Applied successfully
```


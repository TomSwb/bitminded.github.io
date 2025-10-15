# Applied Migrations - Production Database

These SQL migrations have been successfully applied to **PRODUCTION**.

## Database Status: ✅ 17 tables, all functions, triggers, and RLS policies in place

Last updated: 2025-01-15

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


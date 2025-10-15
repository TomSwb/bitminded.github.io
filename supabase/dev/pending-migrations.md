# Pending Migrations - Not Yet in Production

These SQL migrations have been run in **DEV** but NOT yet in **PROD**.

## Current Status: ✅ Dev and Prod are in sync

Last synced: 2025-01-15

---

## How to Use This File

### When you run a new migration in dev:
1. Add it to the "Pending" section below
2. Include the SQL or reference to the file
3. Note the date and what it does

### When you apply to production:
1. Run the migration in prod
2. Move it from "Pending" to `prod/applied-migrations.md`
3. Update the "Last synced" date above

---

## Pending Migrations

### None currently

All migrations have been applied to both dev and production.

---

## Example Entry Format

```
### Migration: Add new column to users
**Date added to dev**: 2025-01-15
**File**: migrations/add_user_column.sql
**Description**: Adds `last_login_ip` column to user_profiles table

**SQL**:
```sql
ALTER TABLE public.user_profiles 
ADD COLUMN last_login_ip INET;
```

**Status**: ⏳ Pending production deployment
```

---

## Tips

- Always test in dev first
- Document breaking changes
- Include rollback SQL if possible
- Test thoroughly before prod deployment


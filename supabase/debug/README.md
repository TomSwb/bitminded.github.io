# Debug Queries

Quick SQL queries for debugging and testing.

## ⚠️ Use in DEV Only

These queries are for **development/debugging** purposes.  
**Do NOT run in production** unless you know what you're doing!

## What's Here

- `add-admin-role.sql` - Give a user admin role
- `check-2fa-setup.sql` - Verify 2FA configuration
- `check-password-tracking.sql` - Check password history
- `debug-password-tracking.sql` - Debug password issues
- `force-delete-2fa.sql` - Remove 2FA for testing
- `test-2fa-verification.sql` - Test 2FA verification

## Usage

1. Copy the SQL from the file you need
2. Go to **DEV** SQL Editor: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/sql
3. Paste and modify for your needs (e.g., replace user IDs)
4. Run and debug

## Common Use Cases

### Make yourself admin in dev:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id', 'admin');
```

### Check if 2FA is working:
See `check-2fa-setup.sql`

### Reset 2FA for testing:
See `force-delete-2fa.sql`


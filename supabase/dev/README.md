# Dev Environment - Quick Reference

**Project**: eygpejbljuqpxwwoawkn  
**URL**: https://eygpejbljuqpxwwoawkn.supabase.co  
**Dashboard**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn

## Status: ✅ Fully Configured

## What's Here

- `SETUP_COMPLETE.md` - Full setup documentation
- `SETUP_CRON_JOBS.sql` - Cron jobs configuration
- `ENVIRONMENT_VARIABLES.md` - Edge Function env vars guide
- `deployed-functions.md` - Track deployed Edge Functions
- `pending-migrations.md` - SQL migrations not yet in prod

## Quick Actions

### Deploy Edge Function to Dev
```bash
supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn
```

### Run SQL Migration in Dev
1. Go to: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/sql
2. Run your SQL
3. Add to `pending-migrations.md`

### Make Yourself Admin in Dev
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id', 'admin');
```

## Environment Detection

When running on **localhost**, the app automatically connects to this dev database.

See `/js/env-config.js` for configuration.


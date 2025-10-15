# Shared Resources

Files and resources used by **both** dev and production environments.

## What's Here

This folder contains:
- Database migration files (in `/migrations/`)
- Edge Functions code (in `/functions/`)
- Schema reference files (in `/schema/`)

These are **shared** because:
- Edge Functions deploy to both environments
- Migrations apply to both databases
- Schema files are reference documentation

## Using Shared Resources

### Edge Functions (`/functions/`)
Deploy to both environments:
```bash
# Dev
supabase functions deploy <name> --project-ref eygpejbljuqpxwwoawkn

# Prod
supabase functions deploy <name> --project-ref dynxqnrkmjcvgzsugxtm
```

### Migrations (`/migrations/`)
Run in both databases:
1. Test in **dev** SQL Editor first
2. Then run in **prod** SQL Editor
3. Track in `dev/pending-migrations.md` → `prod/applied-migrations.md`

### Schema Files (`/schema/`)
Reference documentation for database structure.
These are NOT meant to be run directly - they're for reference only.

## Folder Structure

```
shared/
  (this folder itself - placeholder for future shared configs)

../functions/
  Edge Functions (deployed to both)

../migrations/
  SQL migrations (applied to both)

../schema/
  Reference documentation only
```


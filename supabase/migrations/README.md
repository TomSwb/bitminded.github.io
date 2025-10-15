# Database Migrations

SQL migration files that have been applied to the databases.

## ⚠️ Important

These migrations have been applied to **PRODUCTION**.  
If you're setting up a new environment, run these in order.

## What's Here

Database migration files in chronological order:
- Account deletion system
- Notification system
- User profile enhancements
- Security improvements
- And more...

## For New Migrations

1. **Test in dev first!**
2. Run in dev SQL Editor
3. Add to `dev/pending-migrations.md`
4. When ready, run in prod
5. Add to `prod/applied-migrations.md`
6. Create new file here for the migration

## Naming Convention

Use date prefixes:
- `YYYYMMDD_description.sql` for major features
- `description.sql` for smaller changes

## Do NOT Re-run

These have already been applied to production.  
Only run on fresh databases or if specifically needed.


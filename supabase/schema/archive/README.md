# Archived Schema Files

Schema files for features not currently in use.

## What's Here

- `consent-tracking-system.sql` - Consent/terms tracking system (not currently implemented)

## Why Archived?

These schema files are for features that:
- Haven't been implemented yet
- Were planned but not used
- May be used in the future

## If You Need Them

If you decide to implement these features:
1. Review the schema file
2. Test in dev first
3. Create a migration in `/migrations/`
4. Apply to both dev and prod

## Active Schema Files

Current database structure is documented in:
- `/schema/` parent folder - Active features
- `/migrations/` - Applied migrations
- `/prod/applied-migrations.md` - What's in production


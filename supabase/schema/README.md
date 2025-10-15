# Database Schema Reference

Reference documentation for database schema and structure.

## ⚠️ Reference Only - Do NOT Run Directly

These files are **documentation** showing the database structure.  
They are NOT meant to be executed as-is.

## What's Here

- `admin-tables.sql` - Admin panel tables structure
- `consent-tracking-system.sql` - Consent/terms tracking
- `database-schema.sql` - Core database schema
- `login-activity-tracking.sql` - Login tracking structure
- `storage-setup.sql` - Storage bucket configuration

## Purpose

Use these files to:
1. **Understand** the database structure
2. **Reference** when writing queries
3. **Document** the schema design
4. **Plan** new features

## Actual Migrations

The real, applied migrations are in `/migrations/` folder.

These schema files are kept for documentation and reference purposes only.

## If You Need to Reset a Database

Don't use these files directly. Instead:
1. Use the production SQL history
2. Or use the migration files in `/migrations/`
3. Or import from an existing database backup


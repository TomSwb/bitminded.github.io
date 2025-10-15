# One-Time Fixes

Historical fixes and patches that were applied to production.

## ⚠️ Already Applied - Reference Only

These files are **historical records** of fixes that were already applied.  
**Do NOT re-run** these unless you're resetting a database.

## What's Here

- `cleanup-test-users.sql` - Removed test users from production
- `fix-all-search-path-warnings.sql` - Fixed PostgreSQL security warnings
- `fix-function-search-path-security.sql` - Security fix for functions
- `fix-leaked-password-protection.md` - Password security fix documentation
- `email-templates.md` - Email template improvements

## Purpose

These files are kept for:
1. **Historical record** - What was fixed and when
2. **Reference** - If similar issues occur
3. **Documentation** - Understanding past decisions

## Don't Delete

Keep this folder for documentation purposes, but don't run these queries again unless you're:
- Setting up a fresh database
- Rolling back to a specific state
- Debugging a similar issue

## If You Need Similar Fixes

Use these as templates but create new files with current dates.


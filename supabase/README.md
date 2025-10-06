# Supabase SQL Files Organization

This directory contains all SQL files organized by purpose for easier navigation and maintenance.

## Directory Structure

### 📁 `schema/`
Core database schema and setup files:
- `database-schema.sql` - Main database schema
- `storage-setup.sql` - Storage bucket configuration
- `consent-tracking-system.sql` - GDPR consent tracking

### 📁 `migrations/`
Database migrations and feature additions:
- `add-password-tracking.sql` - Password change tracking feature

### 📁 `fixes/`
Bug fixes and maintenance scripts:
- `fix-function-search-path-security.sql` - Function security fixes
- `fix-missing-foreign-key-index.sql` - Performance index fixes
- `fix-rls-performance-warnings.sql` - RLS optimization
- `fix-security-definer-view.sql` - Security definer fixes
- `fix-security-warnings.sql` - General security fixes
- `fix-user-roles-rls-recursion.sql` - RLS recursion fixes
- `cleanup-test-users.sql` - Test data cleanup
- `cleanup-test-users-updated.sql` - Updated cleanup script
- `email-template-fix.html` - Email template fixes
- `email-templates.md` - Email template documentation

### 📁 `debug/`
Debugging and troubleshooting scripts:
- `check-password-tracking.sql` - Verify password tracking setup
- `debug-password-tracking.sql` - Debug password tracking issues

### 📁 `tools/`
Utility and analysis scripts:
- `find-all-users.sql` - User analysis queries
- `supabase-test.html` - Testing utilities

### 📁 `functions/`
Edge functions and serverless code:
- `verify-captcha/` - CAPTCHA verification function

## Usage Guidelines

1. **Schema changes**: Add new schema files to `schema/`
2. **New features**: Add migration scripts to `migrations/`
3. **Bug fixes**: Add fix scripts to `fixes/`
4. **Debugging**: Use scripts in `debug/` for troubleshooting
5. **Analysis**: Use scripts in `tools/` for data analysis

## File Naming Convention

- **Schema**: `[feature]-schema.sql`
- **Migrations**: `add-[feature].sql` or `update-[feature].sql`
- **Fixes**: `fix-[issue].sql`
- **Debug**: `check-[feature].sql` or `debug-[issue].sql`
- **Tools**: `[purpose]-[feature].sql`

## Execution Order

1. Run `schema/` files first for initial setup
2. Apply `migrations/` in chronological order
3. Apply `fixes/` as needed
4. Use `debug/` and `tools/` for maintenance
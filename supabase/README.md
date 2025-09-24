# Supabase Configuration Files

This folder contains all Supabase-related configuration files for the BitMinded authentication system.

## Files

### Database Schema
- **`database-schema.sql`** - Complete database schema with all tables, RLS policies, functions, and triggers
- **`fix-rls-policy.sql`** - Fix for the user_roles RLS policy infinite recursion issue

### Testing
- **`supabase-test.html`** - Test page to verify Supabase connection and database schema

### Email Templates
- **`email-templates.md`** - Custom email templates for authentication emails (signup, login, password reset, etc.)

## Usage

### Setting Up the Database
1. Copy the contents of `database-schema.sql`
2. Paste into Supabase SQL Editor
3. Execute the schema
4. Run `fix-rls-policy.sql` if needed

### Testing the Connection
1. Open `supabase-test.html` in your browser
2. Click the test buttons to verify everything is working

### Configuring Email Templates
1. Go to Supabase Dashboard → Authentication → Settings
2. Copy templates from `email-templates.md`
3. Paste into the corresponding email template fields

## Related Documentation

See the main documentation in the `../docs/` folder for:
- Complete implementation strategy
- Step-by-step implementation guide
- Subdomain protection strategy
- Account management features

---

*This folder contains the technical implementation files for Supabase integration.*

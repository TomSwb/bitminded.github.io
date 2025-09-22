# Archived Auth System

This directory contains the previous authentication system implementation that was archived on September 22, 2024.

## Archived Components

### Directories
- `login/` - Login and signup pages with styling and translations
- `account/` - User account management pages
- `2fa-setup/` - Two-factor authentication setup pages
- `admin/` - Admin panel and management interface
- `sql-database/` - Database schemas, RLS policies, and SQL setup

### Files
- `auht-payment.md` - Authentication payment documentation

## What Was Removed from Main Site

### From `index.html`
- Auth buttons in header (Login/Sign Up buttons)

### From `js/script.js`
- Complete authentication system
- Supabase client setup
- Session management
- Admin role checking
- Auth button rendering and management
- Auth-related translation functions

### From Language Files
- `js/lang-index/locales-index.json` - Removed auth translations
- `js/lang-index/lang-index.js` - Removed auth translation logic
- `contact/lang-contact/locales-contact.json` - Removed auth translations
- `contact/lang-contact/lang-contact.js` - Removed auth translation logic

## Database Schema (Archived)

The archived system used Supabase with the following key tables:
- `admins` - Admin user management
- `users` - User profiles and metadata
- RLS (Row Level Security) policies for data protection

## Purpose of Archive

This archive serves as a reference for:
1. Comparing old vs new implementation approaches
2. Understanding previous design decisions
3. Recovering specific functionality if needed
4. Learning from previous code structure

## Notes

- All Supabase credentials and API keys were removed from active code
- The system was fully functional but has been completely removed from the main site
- All auth-related UI elements and functionality have been cleaned up

# BitMinded Database Setup Guide

This guide provides step-by-step instructions to set up your Supabase/Postgres database for BitMinded, including authentication, entitlements, Stripe integration, admin access, payment history, and user preferences.

---

## 1. Create Supabase Project

- Go to [supabase.com](https://supabase.com) and create a new project.
- Note your project URL and anon/public key for frontend use.

## 2. Enable Authentication

- In Supabase dashboard, go to **Auth**.
- Enable **Email/Password** (and OAuth if needed).
- Configure email templates/settings as desired.

## 3. Create Database Tables

- Open the SQL editor in Supabase.
- Copy and run the contents of `schema.sql` to create all required tables:
  - `entitlements`
  - `stripe_customers`
  - `admins`
  - `stripe_payments`
  - (optional) add columns to `auth.users` for `username` and `avatar_url`
  - `preferences`

## 4. Set Up Row Level Security (RLS)

- Copy and run the contents of `rls-policies.sql` in the SQL editor.
- Replace `YOUR_ADMIN_EMAIL_HERE` in the admins policy with your actual admin email.

## 5. (Optional) Test Your Setup

- Use Supabase Auth to sign up a test user.
- Insert a row in `entitlements` and `preferences` for that user.
- Query with RLS enabled to confirm only the user can see their own data.

## 6. Stripe Integration

- In Stripe, create products and plans for your apps.
- Set up a webhook to update `entitlements` and `stripe_payments` in Supabase when payments succeed/fail.
- Store Stripe customer IDs in `stripe_customers`.

## 7. Connect Frontend

- Use your Supabase project URL and anon key in your frontend code.
- Use Supabase JS client for authentication and database queries.

## 8. Maintenance

- Use Supabase dashboard to manage users, entitlements, payments, and preferences.
- Use SQL editor for advanced queries and troubleshooting.

---

**Tip:** Always keep your API keys secure and restrict access to sensitive tables with RLS.

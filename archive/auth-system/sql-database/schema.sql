-- BitMinded Database Schema (Supabase/Postgres)

-- 1. Entitlements Table
CREATE TABLE public.entitlements (
  user_id uuid REFERENCES auth.users(id),
  app_id text NOT NULL,
  active boolean DEFAULT false,
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, app_id)
);

-- 2. Stripe Customers Table
CREATE TABLE public.stripe_customers (
  user_id uuid REFERENCES auth.users(id),
  stripe_customer_id text NOT NULL,
  PRIMARY KEY (user_id)
);

-- 3. Admins Table (for admin page access)
CREATE TABLE public.admins (
  user_id uuid REFERENCES auth.users(id),
  is_superadmin boolean DEFAULT false,
  PRIMARY KEY (user_id)
);

-- 4. Stripe Payment History Table
CREATE TABLE public.stripe_payments (
  payment_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  app_id text,
  amount numeric,
  currency text,
  status text,
  created_at timestamp DEFAULT now()
);

-- 5. User Metadata Extension (optional, if you want more fields)
-- Supabase Auth stores metadata in user_metadata JSON, but you can add columns if needed.
-- Example: Add 'username' and 'avatar_url' to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 6. Preferences Table
CREATE TABLE public.preferences (
  user_id uuid REFERENCES auth.users(id),
  email_notifications boolean DEFAULT true,
  language text DEFAULT 'en',
  theme text DEFAULT 'dark',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- 7. Performance Indexes
CREATE INDEX idx_entitlements_user_app ON public.entitlements(user_id, app_id);
CREATE INDEX idx_payments_user ON public.stripe_payments(user_id);

-- 8. Two-Factor Authentication Tables
CREATE TABLE public.two_factor_settings (
  user_id uuid REFERENCES auth.users(id),
  secret_key text NOT NULL,
  backup_codes text[] DEFAULT '{}',
  enabled boolean DEFAULT false,
  backup_codes_generated boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id)
);

CREATE TABLE public.two_factor_backup_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  code text NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- 9. Data Validation Constraints
ALTER TABLE public.entitlements ADD CONSTRAINT check_app_id_not_empty CHECK (app_id != '');
ALTER TABLE public.preferences ADD CONSTRAINT check_language_valid CHECK (language IN ('en', 'fr'));
ALTER TABLE public.preferences ADD CONSTRAINT check_theme_valid CHECK (theme IN ('dark', 'light'));

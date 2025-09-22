-- BitMinded Row Level Security Policies

-- Enable RLS on entitlements
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own entitlements"
  ON public.entitlements
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "User can update own entitlements"
  ON public.entitlements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on stripe_customers
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own stripe customer"
  ON public.stripe_customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Enable RLS on stripe_payments
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own payments"
  ON public.stripe_payments
  FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin can manage admins"
  ON public.admins
  FOR ALL
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'thomasschwab@bitminded.ch'));

-- Preferences table: Only user can view/update own preferences
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view/update own preferences"
  ON public.preferences
  FOR ALL
  USING (auth.uid() = user_id);

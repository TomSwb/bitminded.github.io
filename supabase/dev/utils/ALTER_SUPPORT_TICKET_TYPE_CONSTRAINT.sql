-- Update support_tickets.type constraint to include new request categories
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_type_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_type_check
    CHECK (type IN ('tech-help', 'bug', 'account', 'billing', 'general', 'commission'));


-- =============================================================================
-- SUPPORT TICKETS TABLE
-- =============================================================================
-- Provides persistent storage for support centre submissions so the admin panel
-- can list, triage, and report on inbound requests.

-- 1. Create support_tickets table ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('general', 'bug', 'billing', 'commission')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    message TEXT NOT NULL,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Indexes --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
    ON public.support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
    ON public.support_tickets(user_id);

-- 3. Row Level Security ---------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Clear existing policies (if re-running)
DROP POLICY IF EXISTS "Service role can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Service role can manage support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;

-- Allow edge functions / admin service clients to insert records
CREATE POLICY "Service role can insert support tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Allow service role full access (read/update/delete) for admin tooling
CREATE POLICY "Service role can manage support tickets"
    ON public.support_tickets FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated admins (via user_roles table) to select/update tickets
CREATE POLICY "Admins can view support tickets"
    ON public.support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can update support tickets"
    ON public.support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- 4. updated_at trigger ---------------------------------------------------------
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Comments -------------------------------------------------------------------
COMMENT ON TABLE public.support_tickets IS 'Support desk tickets created from the public Support form.';
COMMENT ON COLUMN public.support_tickets.ticket_code IS 'Human friendly ticket identifier (e.g. SUP-1A2B).';
COMMENT ON COLUMN public.support_tickets.type IS 'Request category chosen by the requester.';
COMMENT ON COLUMN public.support_tickets.status IS 'Workflow status: new, in_progress, resolved, closed.';
COMMENT ON COLUMN public.support_tickets.metadata IS 'JSON blob for additional structured data (attachments, environment, etc.).';

-- 5. Verification ---------------------------------------------------------------
-- SELECT to confirm table exists
SELECT
    to_regclass('public.support_tickets') IS NOT NULL AS support_tickets_table_created,
    (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE 'Service role can % support tickets') AS support_ticket_policies;



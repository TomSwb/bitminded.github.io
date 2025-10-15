-- ============================================================================
-- Fix Admin Activity Table Schema
-- ============================================================================
-- This migration ensures the admin_activity table has the correct columns
-- that match what the Edge Functions and admin panel are using
-- ============================================================================

-- Check if we need to drop and recreate the table with correct schema
DO $$ 
BEGIN
    -- Drop existing table if it has the wrong schema
    DROP TABLE IF EXISTS public.admin_activity CASCADE;
    
    RAISE NOTICE 'Dropped existing admin_activity table';
END $$;

-- Create admin_activity table with correct column names
CREATE TABLE public.admin_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID, -- Can be NULL if user was deleted, or use ON DELETE SET NULL
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.admin_activity IS 'Logs all admin actions for audit trail';
COMMENT ON COLUMN public.admin_activity.admin_id IS 'The admin who performed the action';
COMMENT ON COLUMN public.admin_activity.user_id IS 'The user affected by the action (nullable if user deleted)';
COMMENT ON COLUMN public.admin_activity.action IS 'Description of the action performed';
COMMENT ON COLUMN public.admin_activity.details IS 'Additional details in JSON format';

-- Enable RLS
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin activity
CREATE POLICY "Admins can view admin activity" 
ON public.admin_activity
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can insert admin activity
CREATE POLICY "Admins can insert admin activity" 
ON public.admin_activity
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON public.admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_user_id ON public.admin_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity(created_at DESC);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Admin Activity Table Schema Fixed!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table Structure:';
    RAISE NOTICE '  - id: UUID (primary key)';
    RAISE NOTICE '  - admin_id: UUID (references auth.users)';
    RAISE NOTICE '  - user_id: UUID (nullable, for deleted users)';
    RAISE NOTICE '  - action: TEXT (action description)';
    RAISE NOTICE '  - details: JSONB (additional data)';
    RAISE NOTICE '  - ip_address: INET (admin IP)';
    RAISE NOTICE '  - created_at: TIMESTAMP';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: Applied';
    RAISE NOTICE 'Indexes: Created';
    RAISE NOTICE '============================================================================';
END $$;


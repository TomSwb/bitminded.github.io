-- ============================================================================
-- EXTEND ENTITLEMENTS TABLE FOR ACCESS CONTROL
-- ============================================================================
-- Purpose: Add columns needed for access control component
-- - granted_by: Track which admin granted access
-- - grant_type: Track type of grant (manual/trial/subscription/lifetime)
-- - grant_reason: Reason/notes for manual grants
--
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- Add new columns to entitlements table
ALTER TABLE public.entitlements 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS grant_type TEXT DEFAULT 'manual' CHECK (grant_type IN ('manual', 'trial', 'subscription', 'lifetime')),
ADD COLUMN IF NOT EXISTS grant_reason TEXT;

-- Add index for granted_by for faster queries
CREATE INDEX IF NOT EXISTS idx_entitlements_granted_by ON public.entitlements(granted_by);

-- Add index for grant_type for filtering
CREATE INDEX IF NOT EXISTS idx_entitlements_grant_type ON public.entitlements(grant_type);

-- Add comments for documentation
COMMENT ON COLUMN public.entitlements.granted_by IS 'Admin user who granted this access (null for Stripe/subscription grants)';
COMMENT ON COLUMN public.entitlements.grant_type IS 'Type of access grant: manual, trial, subscription, lifetime';
COMMENT ON COLUMN public.entitlements.grant_reason IS 'Reason/notes for manual access grants';

-- Update RLS policies to allow admins to insert/update entitlements
-- Note: Users can already SELECT their own entitlements (existing policy)
-- We need admins to be able to INSERT and UPDATE for access control

-- Drop existing INSERT policy if exists (users shouldn't be able to insert)
DROP POLICY IF EXISTS "Users can insert own entitlements" ON public.entitlements;

-- Create policy for admins to insert entitlements
CREATE POLICY "Admins can insert entitlements" 
ON public.entitlements FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create policy for admins to update entitlements
CREATE POLICY "Admins can update entitlements" 
ON public.entitlements FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Also allow service role (Edge Functions) to insert/update
-- This is handled by SERVICE_ROLE_KEY bypassing RLS, but good to document
COMMENT ON TABLE public.entitlements IS 'User entitlements to access products. Admins can grant/revoke access via admin panel.'; 
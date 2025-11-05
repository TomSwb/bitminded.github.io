-- ============================================================================
-- ADD ADMIN SELECT POLICY FOR ENTITLEMENTS
-- ============================================================================
-- Purpose: Allow admins to view all entitlements in the admin panel
-- This is required for the Access Control component to display grants
-- ============================================================================

-- Add RLS policy for admins to SELECT all entitlements
CREATE POLICY "Admins can view all entitlements" 
ON public.entitlements FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Add comment
COMMENT ON POLICY "Admins can view all entitlements" ON public.entitlements IS 
'Allows admins to view all entitlements in the admin panel for access control management';


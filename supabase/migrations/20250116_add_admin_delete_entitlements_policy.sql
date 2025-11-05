-- ============================================================================
-- ADD ADMIN DELETE POLICY FOR ENTITLEMENTS
-- ============================================================================
-- Purpose: Allow admins to delete entitlements from the admin panel
-- This is required for the Access Control component to permanently delete grants
-- ============================================================================

-- Add RLS policy for admins to DELETE entitlements
CREATE POLICY "Admins can delete entitlements" 
ON public.entitlements FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Add comment
COMMENT ON POLICY "Admins can delete entitlements" ON public.entitlements IS 
'Allows admins to permanently delete entitlements in the admin panel for access control management';


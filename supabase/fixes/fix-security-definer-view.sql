-- Fix Security Definer View Warning
-- Execute this in Supabase SQL Editor
-- 
-- This fixes the security warning for the current_user_consents view
-- which is incorrectly defined with SECURITY DEFINER property

-- First, let's check the current view definition
-- Run this query to see the current view definition:
-- SELECT pg_get_viewdef('public.current_user_consents'::regclass, true);

-- Drop the existing view that has SECURITY DEFINER
DROP VIEW IF EXISTS public.current_user_consents CASCADE;

-- Recreate the view explicitly with SECURITY INVOKER
-- This ensures it uses the permissions of the querying user, not the view creator
CREATE VIEW public.current_user_consents 
WITH (security_invoker = true) AS
SELECT 
    uc.consent_type,
    uc.version,
    uc.accepted_at,
    cv.description,
    cv.effective_date
FROM public.user_consents uc
JOIN public.consent_versions cv ON uc.consent_type = cv.consent_type AND uc.version = cv.version
WHERE uc.user_id = auth.uid();

-- Grant access to the view for authenticated users
GRANT SELECT ON public.current_user_consents TO authenticated;

-- Verify the view was created correctly
-- Run this to confirm: SELECT * FROM pg_views WHERE viewname = 'current_user_consents';

-- Note: The view now explicitly uses SECURITY INVOKER
-- This means it will use the permissions of the user querying the view,
-- which is the correct and secure approach for this use case.

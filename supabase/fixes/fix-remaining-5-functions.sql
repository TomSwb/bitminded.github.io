-- Fix remaining 5 function search path warnings
-- Execute this in Supabase SQL Editor

-- Fix: get_failed_attempt_count
ALTER FUNCTION public.get_failed_attempt_count(p_email text)
SET search_path = public;

-- Fix: increment_failed_attempt
ALTER FUNCTION public.increment_failed_attempt(p_email text, p_ip_address inet)
SET search_path = public;

-- Fix: reset_failed_attempts
ALTER FUNCTION public.reset_failed_attempts(p_email text)
SET search_path = public;

-- Fix: cleanup_old_failed_attempts
ALTER FUNCTION public.cleanup_old_failed_attempts()
SET search_path = public;

-- Fix: is_account_locked
ALTER FUNCTION public.is_account_locked(p_email text)
SET search_path = public;

-- Verify the fixes - check that all functions now have search_path set
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_function_identity_arguments(p.oid) = '' THEN '()'
        ELSE '(' || pg_get_function_identity_arguments(p.oid) || ')'
    END as arguments,
    CASE 
        WHEN p.proconfig IS NOT NULL THEN 
            array_to_string(p.proconfig, ', ')
        ELSE 'NOT SET'
    END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_failed_attempt_count',
    'increment_failed_attempt',
    'reset_failed_attempts',
    'cleanup_old_failed_attempts',
    'is_account_locked'
)
ORDER BY function_name;


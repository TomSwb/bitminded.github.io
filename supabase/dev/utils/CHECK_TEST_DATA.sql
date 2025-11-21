-- ============================================================================
-- Check for Test Data in Database
-- Purpose: Identify test data, localhost IPs, and test users that should be removed
-- Created: 2025-02-01
-- ============================================================================

-- ============================================================================
-- 1. Check for localhost IP addresses (127.0.0.1) in user_consents
-- ============================================================================
SELECT 
    'user_consents' as table_name,
    COUNT(*) as localhost_count,
    COUNT(DISTINCT user_id) as affected_users
FROM public.user_consents
WHERE ip_address = '127.0.0.1'::inet
   OR ip_address::text LIKE '127.%'
   OR ip_address::text LIKE 'localhost';

-- Show details
SELECT 
    id,
    user_id,
    consent_type,
    version,
    ip_address,
    accepted_at
FROM public.user_consents
WHERE ip_address = '127.0.0.1'::inet
   OR ip_address::text LIKE '127.%'
   OR ip_address::text LIKE 'localhost'
ORDER BY accepted_at DESC
LIMIT 50;

-- ============================================================================
-- 2. Check for localhost IPs in consent_audit_log
-- ============================================================================
SELECT 
    'consent_audit_log' as table_name,
    COUNT(*) as localhost_count,
    COUNT(DISTINCT user_id) as affected_users
FROM public.consent_audit_log
WHERE ip_address = '127.0.0.1'::inet
   OR ip_address::text LIKE '127.%'
   OR ip_address::text LIKE 'localhost';

-- Show details
SELECT 
    id,
    user_id,
    action,
    consent_type,
    version,
    ip_address,
    created_at
FROM public.consent_audit_log
WHERE ip_address = '127.0.0.1'::inet
   OR ip_address::text LIKE '127.%'
   OR ip_address::text LIKE 'localhost'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 3. Check for localhost IPs in login_activity / user_login_activity
-- ============================================================================
SELECT 
    'login_activity' as table_name,
    COUNT(*) as localhost_count,
    COUNT(DISTINCT user_id) as affected_users
FROM public.login_activity
WHERE ip_address = '127.0.0.1'
   OR ip_address LIKE '127.%'
   OR ip_address LIKE 'localhost';

-- Check user_login_activity if it exists
SELECT 
    'user_login_activity' as table_name,
    COUNT(*) as localhost_count,
    COUNT(DISTINCT user_id) as affected_users
FROM public.user_login_activity
WHERE ip_address = '127.0.0.1'
   OR ip_address LIKE '127.%'
   OR ip_address LIKE 'localhost';

-- ============================================================================
-- 4. Check for test users (users with test emails or test usernames)
-- ============================================================================
SELECT 
    'auth.users' as table_name,
    COUNT(*) as test_user_count
FROM auth.users
WHERE email LIKE '%test%'
   OR email LIKE '%example%'
   OR email LIKE '%@localhost%'
   OR email LIKE '%@test%'
   OR raw_user_meta_data->>'username' LIKE '%test%'
   OR raw_user_meta_data->>'username' LIKE '%demo%';

-- Show test user details
SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email LIKE '%test%'
   OR email LIKE '%example%'
   OR email LIKE '%@localhost%'
   OR email LIKE '%@test%'
   OR raw_user_meta_data->>'username' LIKE '%test%'
   OR raw_user_meta_data->>'username' LIKE '%demo%'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 5. Check for test data in user_profiles
-- ============================================================================
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as test_profile_count
FROM public.user_profiles
WHERE username LIKE '%test%'
   OR username LIKE '%demo%'
   OR username LIKE 'user_%'  -- Generic user_ prefix might indicate test users
   OR email LIKE '%test%'
   OR email LIKE '%example%';

-- ============================================================================
-- 6. Check for test data in user_sessions (localhost IPs)
-- ============================================================================
SELECT 
    'user_sessions' as table_name,
    COUNT(*) as localhost_count,
    COUNT(DISTINCT user_id) as affected_users
FROM public.user_sessions
WHERE ip_address = '127.0.0.1'
   OR ip_address LIKE '127.%'
   OR ip_address LIKE 'localhost';

-- ============================================================================
-- 7. Check for test user agents (containing "test" or "Test")
-- ============================================================================
SELECT 
    'user_consents' as table_name,
    COUNT(*) as test_user_agent_count
FROM public.user_consents
WHERE user_agent ILIKE '%test%'
   OR user_agent ILIKE '%Test User Agent%';

-- ============================================================================
-- 8. Check for zero UUIDs (00000000-0000-0000-0000-000000000000)
-- ============================================================================
SELECT 
    'user_consents' as table_name,
    COUNT(*) as zero_uuid_count
FROM public.user_consents
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- ============================================================================
-- 9. Summary: Count all localhost IPs across all relevant tables
-- ============================================================================
SELECT 
    'SUMMARY' as report_type,
    (SELECT COUNT(*) FROM public.user_consents WHERE ip_address::text LIKE '127.%' OR ip_address::text LIKE 'localhost') as user_consents_localhost,
    (SELECT COUNT(*) FROM public.consent_audit_log WHERE ip_address::text LIKE '127.%' OR ip_address::text LIKE 'localhost') as audit_log_localhost,
    (SELECT COUNT(*) FROM public.login_activity WHERE ip_address LIKE '127.%' OR ip_address LIKE 'localhost') as login_activity_localhost,
    (SELECT COUNT(*) FROM public.user_sessions WHERE ip_address LIKE '127.%' OR ip_address LIKE 'localhost') as user_sessions_localhost,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%@localhost%') as test_users;

-- ============================================================================
-- 10. Check for development/test environment indicators
-- ============================================================================
-- Check if there are any obvious development patterns
SELECT 
    'Development Indicators' as check_type,
    COUNT(*) as count,
    'Emails with localhost domain' as description
FROM auth.users
WHERE email LIKE '%@localhost%'
   OR email LIKE '%@127.0.0.1%'
   OR email LIKE '%@dev%'
   OR email LIKE '%@test%';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Review results carefully before deleting anything
-- 2. Some localhost IPs might be legitimate (e.g., from development team)
-- 3. Consider creating a backup before cleanup
-- 4. Test users should be removed if not needed
-- 5. Zero UUIDs should definitely be removed (test data)
-- ============================================================================


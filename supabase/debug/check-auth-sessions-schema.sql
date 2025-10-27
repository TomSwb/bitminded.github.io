-- ============================================================================
-- DIAGNOSTIC: CHECK AUTH.SESSIONS TABLE SCHEMA AND DATA
-- ============================================================================
-- This script helps understand the structure of Supabase's auth.sessions table
-- and diagnose why active session counts might not be working.

-- 1. Check the schema of auth.sessions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'auth' 
    AND table_name = 'sessions'
ORDER BY 
    ordinal_position;

-- 2. Check current sessions in auth.sessions for all users
SELECT 
    id,
    user_id,
    created_at,
    updated_at,
    factor_id,
    aal,
    not_after,
    refreshed_at,
    user_agent,
    ip,
    tag
FROM 
    auth.sessions
ORDER BY 
    created_at DESC
LIMIT 10;

-- 3. Count active sessions per user (using the function's logic)
SELECT 
    user_id,
    COUNT(*) as session_count,
    MAX(created_at) as most_recent_session,
    MAX(refreshed_at) as last_refreshed
FROM 
    auth.sessions
WHERE 
    not_after IS NULL OR not_after > NOW()
GROUP BY 
    user_id;

-- 4. Check if there are any sessions at all
SELECT 
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as users_with_sessions
FROM 
    auth.sessions;

-- 5. Check what the get_user_active_session_count function returns for a specific user
-- Replace 'USER_EMAIL_HERE' with actual email to test
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'kamilahschwab@gmail.com' LIMIT 1
)
SELECT 
    public.get_user_active_session_count(target_user.id) as active_session_count
FROM 
    target_user;


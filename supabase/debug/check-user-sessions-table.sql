-- Check what's in user_sessions table
SELECT 
    id,
    user_id,
    session_token,
    expires_at,
    created_at,
    last_accessed,
    browser,
    os,
    ip_address,
    CASE 
        WHEN expires_at > NOW() THEN 'Active'
        ELSE 'Expired'
    END as status
FROM public.user_sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch')
ORDER BY created_at DESC;

-- Count total vs active
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_sessions,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_sessions
FROM public.user_sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch');


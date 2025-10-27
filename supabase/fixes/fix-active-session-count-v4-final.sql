-- ============================================================================
-- FIX: ACTIVE SESSION COUNT - MATCH get-user-sessions LOGIC
-- ============================================================================
-- This function now matches the Edge Function logic by checking BOTH:
-- 1. Sessions exist in user_login_activity (not revoked)
-- 2. The decoded session_id from JWT matches auth.sessions

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
    auth_session_ids UUID[];
    login_record RECORD;
    decoded_payload JSONB;
    actual_session_id UUID;
    matched_count INTEGER := 0;
BEGIN
    -- Get active auth session IDs
    SELECT ARRAY_AGG(session_id) INTO auth_session_ids
    FROM public.get_active_auth_sessions(user_uuid);
    
    IF auth_session_ids IS NULL OR array_length(auth_session_ids, 1) = 0 THEN
        RETURN 0;
    END IF;
    
    -- Decode JWTs and match with auth sessions
    FOR login_record IN 
        SELECT DISTINCT ON (session_id) session_id
        FROM public.user_login_activity
        WHERE user_id = user_uuid
        AND success = TRUE
        AND session_id IS NOT NULL
        AND revoked_at IS NULL
        ORDER BY session_id, login_time DESC
    LOOP
        BEGIN
            -- Decode JWT payload (extract middle part and decode base64)
            decoded_payload := convert_from(
                decode(
                    split_part(login_record.session_id, '.', 2), 
                    'base64'
                ), 
                'UTF8'
            )::jsonb;
            
            -- Extract session_id from JWT payload
            actual_session_id := (decoded_payload->>'session_id')::UUID;
            
            -- Check if this session_id exists in auth sessions
            IF actual_session_id = ANY(auth_session_ids) THEN
                matched_count := matched_count + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Skip this session if JWT decode fails
                CONTINUE;
        END;
    END LOOP;
    
    RETURN matched_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error counting active sessions for user %: %', user_uuid, SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Get count of active sessions by matching user_login_activity with auth.sessions (decodes JWTs)';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test with a known user
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count
FROM 
    target_user tu;


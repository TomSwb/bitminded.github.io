-- ============================================================================
-- FIX: ACTIVE SESSION COUNT - MATCH Edge Function Logic Exactly
-- ============================================================================
-- This function replicates the get-user-sessions Edge Function logic:
-- Count sessions that exist in BOTH user_sessions AND auth.sessions

CREATE OR REPLACE FUNCTION public.get_user_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    auth_session_ids UUID[];
    session_record RECORD;
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
    
    -- Loop through user_sessions and decode JWTs to match with auth.sessions
    FOR session_record IN 
        SELECT session_token, expires_at
        FROM public.user_sessions
        WHERE user_id = user_uuid
        AND expires_at > NOW()
    LOOP
        BEGIN
            -- Decode JWT payload (extract middle part and decode base64)
            decoded_payload := convert_from(
                decode(
                    split_part(session_record.session_token, '.', 2), 
                    'base64'
                ), 
                'UTF8'
            )::jsonb;
            
            -- Extract session_id from JWT payload
            actual_session_id := (decoded_payload->>'session_id')::UUID;
            
            -- Check if this session_id exists in auth.sessions
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

COMMENT ON FUNCTION public.get_user_active_session_count IS 'Count sessions that exist in BOTH user_sessions AND auth.sessions (matches Edge Function)';

GRANT EXECUTE ON FUNCTION public.get_user_active_session_count TO authenticated;

-- ============================================================================
-- CLEANUP: Remove stale sessions from user_sessions
-- ============================================================================
-- Delete sessions that are expired or don't exist in auth.sessions anymore

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions
    DELETE FROM public.user_sessions
    WHERE expires_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % expired sessions from user_sessions', deleted_count;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
)
SELECT 
    tu.email,
    public.get_user_active_session_count(tu.id) as active_session_count,
    (SELECT COUNT(*) FROM public.user_sessions WHERE user_id = tu.id) as total_in_user_sessions,
    (SELECT COUNT(*) FROM public.user_sessions WHERE user_id = tu.id AND expires_at > NOW()) as non_expired,
    (SELECT COUNT(*) FROM public.get_active_auth_sessions(tu.id)) as in_auth_sessions
FROM 
    target_user tu;

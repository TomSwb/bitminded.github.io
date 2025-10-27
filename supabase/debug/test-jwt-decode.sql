-- Test JWT decoding in PostgreSQL
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'thomasschwab@bitminded.ch' LIMIT 1
),
session_data AS (
    SELECT session_token
    FROM public.user_sessions
    WHERE user_id = (SELECT id FROM target_user)
    LIMIT 1
)
SELECT 
    session_token,
    split_part(session_token, '.', 2) as base64_payload,
    convert_from(
        decode(
            split_part(session_token, '.', 2), 
            'base64'
        ), 
        'UTF8'
    )::jsonb as decoded_payload,
    (convert_from(
        decode(
            split_part(session_token, '.', 2), 
            'base64'
        ), 
        'UTF8'
    )::jsonb)->>'session_id' as extracted_session_id
FROM session_data;


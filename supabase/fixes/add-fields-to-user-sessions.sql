-- ============================================================================
-- ADD MISSING FIELDS TO user_sessions TABLE
-- ============================================================================
-- Add user_agent, ip_address, location, device info to user_sessions
-- so we don't need to join with user_login_activity

ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS os TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Verification
SELECT 
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'user_sessions'
ORDER BY 
    ordinal_position;


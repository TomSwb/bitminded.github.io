-- Add revoked_at column to user_login_activity
-- This allows us to mark sessions as revoked without deleting them

ALTER TABLE public.user_login_activity
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying revoked sessions
CREATE INDEX IF NOT EXISTS idx_login_activity_revoked_at
ON public.user_login_activity(revoked_at)
WHERE revoked_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.user_login_activity.revoked_at IS 'Timestamp when this session was revoked (but JWT token remains valid until expiration)';


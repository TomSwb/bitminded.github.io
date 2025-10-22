-- ============================================================================
-- Create Email Change Verifications Table
-- ============================================================================
-- This table stores email change verification tokens for admin-initiated changes
-- ============================================================================

-- Create email_change_verifications table
CREATE TABLE IF NOT EXISTS public.email_change_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    new_email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.email_change_verifications IS 'Stores email change verification tokens for admin-initiated changes';
COMMENT ON COLUMN public.email_change_verifications.user_id IS 'The user whose email is being changed';
COMMENT ON COLUMN public.email_change_verifications.new_email IS 'The new email address';
COMMENT ON COLUMN public.email_change_verifications.token IS 'Unique verification token';
COMMENT ON COLUMN public.email_change_verifications.admin_id IS 'The admin who initiated the change';
COMMENT ON COLUMN public.email_change_verifications.expires_at IS 'When the token expires';
COMMENT ON COLUMN public.email_change_verifications.used_at IS 'When the token was used (NULL if unused)';

-- Enable RLS
ALTER TABLE public.email_change_verifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view email change verifications
CREATE POLICY "Admins can view email change verifications" 
ON public.email_change_verifications
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can insert email change verifications
CREATE POLICY "Admins can insert email change verifications" 
ON public.email_change_verifications
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can update email change verifications
CREATE POLICY "Admins can update email change verifications" 
ON public.email_change_verifications
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_change_verifications_user_id ON public.email_change_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_verifications_token ON public.email_change_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_change_verifications_expires_at ON public.email_change_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_change_verifications_admin_id ON public.email_change_verifications(admin_id);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_email_change_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.email_change_verifications 
    WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Email Change Verifications Table Created!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table Structure:';
    RAISE NOTICE '  - id: UUID (primary key)';
    RAISE NOTICE '  - user_id: UUID (references auth.users)';
    RAISE NOTICE '  - new_email: TEXT (new email address)';
    RAISE NOTICE '  - token: TEXT (unique verification token)';
    RAISE NOTICE '  - admin_id: UUID (admin who initiated change)';
    RAISE NOTICE '  - expires_at: TIMESTAMP (expiration time)';
    RAISE NOTICE '  - used_at: TIMESTAMP (when used, NULL if unused)';
    RAISE NOTICE '  - created_at: TIMESTAMP (creation time)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: Applied';
    RAISE NOTICE 'Indexes: Created';
    RAISE NOTICE 'Cleanup Function: Created';
    RAISE NOTICE '============================================================================';
END $$;

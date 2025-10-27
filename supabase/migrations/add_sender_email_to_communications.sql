-- ============================================================================
-- ADD SENDER EMAIL FIELD TO USER COMMUNICATIONS
-- ============================================================================
-- This migration adds sender_email field to track which email address was used
-- to send communications (for emails only)
-- ============================================================================

-- Add sender_email column to user_communications table
ALTER TABLE public.user_communications 
ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_communications.sender_email IS 'Email address used to send the communication (for emails only)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_communications_sender_email ON public.user_communications(sender_email);

-- Add constraint to ensure sender_email is valid for emails
ALTER TABLE public.user_communications 
ADD CONSTRAINT check_sender_email_format 
CHECK (
    sender_email IS NULL OR 
    sender_email ~ '^[a-zA-Z0-9._%+-]+@bitminded\.ch$'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added sender_email field to user_communications table';
    RAISE NOTICE '📧 Valid sender emails: legal@bitminded.ch, contact@bitminded.ch, support@bitminded.ch, noreply@bitminded.ch, dev@bitminded.ch';
    RAISE NOTICE '🔒 Added format validation constraint';
END $$;

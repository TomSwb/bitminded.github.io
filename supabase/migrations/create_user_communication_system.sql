-- ============================================================================
-- USER COMMUNICATION SYSTEM - PHASE 1: DATABASE SETUP
-- ============================================================================
-- This migration creates the user communication system with notifications and emails
-- 
-- Features:
-- - Track all communications sent to users (notifications + emails)
-- - Admin signature management
-- - User language preferences
-- - Delivery status tracking
-- - Complete audit trail
--
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- 1. Create user_communications table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('notification', 'email')),
    subject TEXT,
    body TEXT NOT NULL,
    signature_used TEXT,
    language_used TEXT DEFAULT 'en',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.user_communications IS 'Tracks all communications sent to users (notifications and emails)';
COMMENT ON COLUMN public.user_communications.type IS 'Type of communication: notification or email';
COMMENT ON COLUMN public.user_communications.subject IS 'Email subject (optional for notifications)';
COMMENT ON COLUMN public.user_communications.body IS 'Message content';
COMMENT ON COLUMN public.user_communications.signature_used IS 'Signature that was used for this communication';
COMMENT ON COLUMN public.user_communications.language_used IS 'Language the message was sent in';
COMMENT ON COLUMN public.user_communications.sent_at IS 'When the message was sent';
COMMENT ON COLUMN public.user_communications.delivered_at IS 'When the message was delivered (for emails)';
COMMENT ON COLUMN public.user_communications.status IS 'Delivery status: sent, delivered, or failed';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_communications_user_id ON public.user_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_communications_admin_id ON public.user_communications(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_communications_type ON public.user_communications(type);
CREATE INDEX IF NOT EXISTS idx_user_communications_sent_at ON public.user_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_communications_status ON public.user_communications(status);

-- 2. Create communication_signatures table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.communication_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.communication_signatures IS 'Stores admin signature preferences for communications';
COMMENT ON COLUMN public.communication_signatures.name IS 'Display name for the signature (e.g., "Dev Team", "Support Team")';
COMMENT ON COLUMN public.communication_signatures.content IS 'The actual signature text';
COMMENT ON COLUMN public.communication_signatures.is_default IS 'Whether this is the default signature for this admin';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_signatures_admin_id ON public.communication_signatures(admin_id);
CREATE INDEX IF NOT EXISTS idx_communication_signatures_is_default ON public.communication_signatures(admin_id, is_default);

-- 3. Add language field to user_profiles table
-- ============================================================================
-- Check if language column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'language'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de'));
        
        RAISE NOTICE 'Added language column to user_profiles';
    ELSE
        RAISE NOTICE 'Language column already exists in user_profiles';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.language IS 'User preferred language for communications: en, es, fr, de';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON public.user_profiles(language);

-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.user_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_signatures ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- ============================================================================

-- user_communications policies
CREATE POLICY "Admins can view all communications" ON public.user_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert communications" ON public.user_communications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update communication status" ON public.user_communications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- communication_signatures policies
CREATE POLICY "Admins can manage their own signatures" ON public.communication_signatures
    FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

-- 6. Create triggers for updated_at
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_communications_updated_at ON public.user_communications;
CREATE TRIGGER update_user_communications_updated_at
    BEFORE UPDATE ON public.user_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_communication_signatures_updated_at ON public.communication_signatures;
CREATE TRIGGER update_communication_signatures_updated_at
    BEFORE UPDATE ON public.communication_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert default signatures for existing admins
-- ============================================================================
INSERT INTO public.communication_signatures (admin_id, name, content, is_default)
SELECT 
    ur.user_id,
    'Dev Team',
    'Your BitMinded Dev Team',
    TRUE
FROM user_roles ur
WHERE ur.role = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM communication_signatures cs 
    WHERE cs.admin_id = ur.user_id
);

-- 8. Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.user_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_signatures TO authenticated;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- 9. Success message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ User Communication System database setup completed successfully!';
    RAISE NOTICE '📋 Created tables: user_communications, communication_signatures';
    RAISE NOTICE '🌐 Added language field to user_profiles';
    RAISE NOTICE '🔒 RLS policies created for admin access';
    RAISE NOTICE '📝 Default signatures created for existing admins';
    RAISE NOTICE '🚀 Ready for edge functions implementation!';
END $$;

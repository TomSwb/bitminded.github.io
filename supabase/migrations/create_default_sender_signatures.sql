-- Create default signatures for each potential sender email
-- This migration creates default signatures for all potential sender emails

-- First, add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_admin_signature_name'
    ) THEN
        ALTER TABLE public.communication_signatures 
        ADD CONSTRAINT unique_admin_signature_name 
        UNIQUE (admin_id, name);
    END IF;
END $$;

-- Function to create default signatures for a sender email
CREATE OR REPLACE FUNCTION create_default_sender_signatures()
RETURNS void AS $$
DECLARE
    admin_record RECORD;
    sender_emails TEXT[] := ARRAY[
        'legal@bitminded.ch',
        'contact@bitminded.ch', 
        'support@bitminded.ch',
        'noreply@bitminded.ch',
        'dev@bitminded.ch'
    ];
    sender_email TEXT;
    signature_name TEXT;
    signature_content TEXT;
BEGIN
    -- Get all admin users
    FOR admin_record IN 
        SELECT id FROM auth.users 
        WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    LOOP
        -- Create signatures for each sender email
        FOREACH sender_email IN ARRAY sender_emails
        LOOP
            -- Determine signature name and content based on sender email
            CASE sender_email
                WHEN 'legal@bitminded.ch' THEN
                    signature_name := 'Legal Team';
                    signature_content := 'Your BitMinded Legal Team';
                WHEN 'contact@bitminded.ch' THEN
                    signature_name := 'Contact Team';
                    signature_content := 'Your BitMinded Contact Team';
                WHEN 'support@bitminded.ch' THEN
                    signature_name := 'Support Team';
                    signature_content := 'Your BitMinded Support Team';
                WHEN 'noreply@bitminded.ch' THEN
                    signature_name := 'System Team';
                    signature_content := 'Your BitMinded System Team';
                WHEN 'dev@bitminded.ch' THEN
                    signature_name := 'Development Team';
                    signature_content := 'Your BitMinded Development Team';
            END CASE;

            -- Insert signature if it doesn't exist
            INSERT INTO public.communication_signatures (admin_id, name, content, is_default)
            VALUES (admin_record.id, signature_name, signature_content, false)
            ON CONFLICT (admin_id, name) DO NOTHING;
        END LOOP;

        -- Set the first signature as default if no default exists
        UPDATE public.communication_signatures 
        SET is_default = true 
        WHERE admin_id = admin_record.id 
        AND is_default = false 
        AND id = (
            SELECT id FROM public.communication_signatures 
            WHERE admin_id = admin_record.id 
            ORDER BY created_at ASC 
            LIMIT 1
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.communication_signatures 
            WHERE admin_id = admin_record.id AND is_default = true
        );
    END LOOP;

    RAISE NOTICE '✅ Default sender signatures created for all admins';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT create_default_sender_signatures();

-- Drop the function as it's no longer needed
DROP FUNCTION create_default_sender_signatures();

-- Add comment
COMMENT ON TABLE public.communication_signatures IS 'Stores admin signature preferences for communications. Now includes default signatures for each sender email type.';

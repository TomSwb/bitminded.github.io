-- Update existing signatures to simplified format
-- This migration updates all existing signatures to remove verbose details

-- First, let's see what signatures exist
SELECT 'Current signatures:' as info;
SELECT name, content FROM public.communication_signatures ORDER BY admin_id, name;

-- Function to update existing signatures
CREATE OR REPLACE FUNCTION update_signatures_to_simplified()
RETURNS void AS $$
DECLARE
    signature_record RECORD;
BEGIN
    -- Update all existing signatures to simplified format
    FOR signature_record IN 
        SELECT id, name FROM public.communication_signatures
    LOOP
        -- Update signature content based on name
        CASE signature_record.name
            WHEN 'Legal Team' THEN
                UPDATE public.communication_signatures 
                SET content = 'Your BitMinded Legal Team'
                WHERE id = signature_record.id;
            WHEN 'Contact Team' THEN
                UPDATE public.communication_signatures 
                SET content = 'Your BitMinded Contact Team'
                WHERE id = signature_record.id;
            WHEN 'Support Team' THEN
                UPDATE public.communication_signatures 
                SET content = 'Your BitMinded Support Team'
                WHERE id = signature_record.id;
            WHEN 'System Team' THEN
                UPDATE public.communication_signatures 
                SET content = 'Your BitMinded System Team'
                WHERE id = signature_record.id;
            WHEN 'Development Team' THEN
                UPDATE public.communication_signatures 
                SET content = 'Your BitMinded Development Team'
                WHERE id = signature_record.id;
            ELSE
                -- For any other signature names, just log them
                RAISE NOTICE 'Unknown signature name: %', signature_record.name;
        END CASE;
    END LOOP;

    RAISE NOTICE '✅ All signatures updated to simplified format';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT update_signatures_to_simplified();

-- Drop the function as it's no longer needed
DROP FUNCTION update_signatures_to_simplified();

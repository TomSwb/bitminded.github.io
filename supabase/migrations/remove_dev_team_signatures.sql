-- Remove Dev Team signatures (keep only Development Team)
-- This migration removes redundant "Dev Team" signatures

-- Delete all "Dev Team" signatures
DELETE FROM public.communication_signatures 
WHERE name = 'Dev Team';

-- If any admin had "Dev Team" as their default signature, 
-- set "Development Team" as default instead
UPDATE public.communication_signatures 
SET is_default = TRUE
WHERE name = 'Development Team' 
AND admin_id IN (
    SELECT admin_id 
    FROM public.communication_signatures 
    WHERE name = 'Dev Team' 
    AND is_default = TRUE
);

-- Ensure each admin still has exactly one default signature
DO $$
DECLARE
    admin_record RECORD;
BEGIN
    -- For each admin, ensure they have exactly one default signature
    FOR admin_record IN
        SELECT admin_id FROM public.communication_signatures
        GROUP BY admin_id
        HAVING COUNT(*) > 0
    LOOP
        -- If no default signature exists, set the first available one as default
        IF NOT EXISTS (
            SELECT 1 FROM public.communication_signatures 
            WHERE admin_id = admin_record.admin_id 
            AND is_default = TRUE
        ) THEN
            UPDATE public.communication_signatures
            SET is_default = TRUE
            WHERE id = (
                SELECT id FROM public.communication_signatures 
                WHERE admin_id = admin_record.admin_id 
                ORDER BY created_at 
                LIMIT 1
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Dev Team signatures removed, Development Team signatures preserved';
END $$;

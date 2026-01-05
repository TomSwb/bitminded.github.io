-- ============================================================================
-- Fix Family Member Age Validation Trigger
-- ============================================================================
-- Purpose: Fix the trigger to check the NEW record being inserted, not just existing records
-- Issue: When inserting the first family member (admin), the validation function
--        only checks existing records in the table, but the NEW record hasn't been
--        inserted yet, causing validation to fail.
-- Solution: Modify the trigger function to check the NEW record's age before
--           calling the validation function.
-- Created: 2025-01-05
-- ============================================================================

-- Update the trigger function to check NEW record when inserting first member
-- The issue: validate_family_has_adult only checks existing records, but when
-- inserting the first member (admin), the NEW record isn't in the table yet.
CREATE OR REPLACE FUNCTION public.validate_family_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
    family_uuid UUID;
    is_adult_valid BOOLEAN;
    is_region_valid BOOLEAN;
    is_admin_member BOOLEAN;
    admin_user_id_from_group UUID;
    existing_member_count INTEGER;
BEGIN
    -- Only validate when status changes to 'active'
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        family_uuid := NEW.family_group_id;
        
        -- Get the admin user ID for this family group
        SELECT admin_user_id INTO admin_user_id_from_group
        FROM public.family_groups
        WHERE id = family_uuid;
        
        -- Check if the NEW record being inserted is the admin
        is_admin_member := (NEW.user_id = admin_user_id_from_group);
        
        -- Count existing active members (excluding the one being inserted/updated)
        -- For INSERT: count all existing members
        -- For UPDATE: count all members except the one being updated
        SELECT COUNT(*) INTO existing_member_count
        FROM public.family_members
        WHERE family_group_id = family_uuid
        AND status = 'active'
        AND (OLD IS NULL OR id != NEW.id);  -- OLD is NULL for INSERT, not NULL for UPDATE
        
        -- If this is the first member (admin) being inserted, check NEW record directly
        IF existing_member_count = 0 AND is_admin_member THEN
            -- This is the first member (admin) being inserted
            -- Check if admin has valid age
            IF NEW.age IS NULL THEN
                RAISE EXCEPTION 'Family admin must have age set. Age is required for the first family member.';
            END IF;
            
            IF NEW.age < 18 THEN
                RAISE EXCEPTION 'Family must have at least one adult member (age >= 18). The admin must be an adult.';
            END IF;
            
            -- Admin is valid, allow the insert
            -- Skip region validation for first member
            RETURN NEW;
        END IF;
        
        -- For subsequent members or updates, use the normal validation
        -- But also consider the NEW record being inserted/updated
        SELECT public.validate_family_has_adult(family_uuid) INTO is_adult_valid;
        
        -- If validation fails, check if the NEW record makes it valid
        IF NOT is_adult_valid THEN
            -- Check if NEW record is an adult
            IF NEW.age IS NOT NULL AND NEW.age >= 18 THEN
                -- Check if there are other existing adult members OR this is the admin
                IF is_admin_member OR EXISTS (
                    SELECT 1 FROM public.family_members
                    WHERE family_group_id = family_uuid
                    AND status = 'active'
                    AND age IS NOT NULL
                    AND age >= 18
                    AND (OLD IS NULL OR id != NEW.id)  -- OLD is NULL for INSERT, not NULL for UPDATE
                ) THEN
                    is_adult_valid := TRUE;
                END IF;
            END IF;
        END IF;
        
        IF NOT is_adult_valid THEN
            RAISE EXCEPTION 'Family must have at least one adult member (age >= 18). The admin must be an adult.';
        END IF;
        
        -- Validate region consistency (warning only, not blocking)
        SELECT public.validate_family_region_consistency(family_uuid) INTO is_region_valid;
        IF NOT is_region_valid THEN
            RAISE WARNING 'Family members are from different regions. This may indicate abuse.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger is already created, so we don't need to recreate it
-- The function update above will automatically be used by the existing trigger

COMMENT ON FUNCTION public.validate_family_member_constraints() IS 
'Validates family member constraints before activation. Now checks the NEW record being inserted, not just existing records, to handle the case where the first member (admin) is being added.';

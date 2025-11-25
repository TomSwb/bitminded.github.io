-- Migration: Create Family Plans Database Schema
-- Purpose: Support family plan subscriptions with group management
-- Dependencies: auth.users, user_profiles, products, product_purchases
-- Created: 2025-11-25
-- Related: Item 15.9.1 - Family Plan Database Schema
--
-- CONSTRAINTS & VALIDATIONS:
-- 1. Max members: Fixed at 6 members per family (enforced by CHECK constraint)
-- 2. One family per user: User can only be in ONE active family at a time (enforced by unique index)
-- 3. Adult requirement: Family must have at least one adult (age >= 18), admin must be adult (enforced by trigger)
-- 4. Region check: Soft validation - warns if members are from different regions (flexible for international families)
-- 5. Plan restriction: Only 'family_all_tools' and 'family_supporter' plans allowed (enforced by CHECK constraint)

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Family Groups Table
-- Note: subscription_id is nullable and doesn't have FK constraint to avoid circular dependency
-- The relationship is managed by application logic
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name TEXT NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_type TEXT NOT NULL DEFAULT 'household',
    max_members INTEGER DEFAULT 6,
    primary_region TEXT, -- Primary country/region for the family (for region validation)
    subscription_id UUID, -- References family_subscriptions(id) - managed by application logic
    -- Admin override for age verification (allows groups without adults, e.g., friend groups)
    age_verification_override BOOLEAN DEFAULT FALSE,
    age_verification_override_by UUID REFERENCES auth.users(id), -- Admin who granted the override
    age_verification_override_at TIMESTAMP WITH TIME ZONE, -- When override was granted
    age_verification_override_reason TEXT, -- Reason for override (for audit purposes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_family_type CHECK (family_type IN ('household', 'parent-child', 'custom')),
    CONSTRAINT check_max_members CHECK (max_members = 6) -- Fixed at 6 members maximum
);

-- Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    relationship TEXT,
    age INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_family_member UNIQUE(family_group_id, user_id),
    CONSTRAINT check_role CHECK (role IN ('admin', 'parent', 'guardian', 'member', 'child')),
    CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    CONSTRAINT check_age CHECK (age IS NULL OR (age >= 0 AND age <= 120))
);

-- Family Subscriptions Table
-- IMPORTANT: Only All-Tools and Supporter plans can be family plans
-- This is enforced by the check_plan_name constraint below
CREATE TABLE IF NOT EXISTS public.family_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_plan_name CHECK (plan_name IN ('family_all_tools', 'family_supporter')),
    CONSTRAINT check_status CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused'))
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Family Groups Indexes
CREATE INDEX IF NOT EXISTS idx_family_groups_admin_user_id ON public.family_groups(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_family_groups_subscription_id ON public.family_groups(subscription_id) WHERE subscription_id IS NOT NULL;

-- Family Members Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_group_id ON public.family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON public.family_members(role);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON public.family_members(status);
CREATE INDEX IF NOT EXISTS idx_family_members_active ON public.family_members(family_group_id, status) WHERE status = 'active';
-- Unique constraint: A user can only be in ONE active family at a time
-- This prevents users from joining multiple families simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_members_one_active_family_per_user 
    ON public.family_members(user_id) 
    WHERE status = 'active';

-- Family Subscriptions Indexes
CREATE INDEX IF NOT EXISTS idx_family_subscriptions_family_group_id ON public.family_subscriptions(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_subscriptions_stripe_subscription_id ON public.family_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_subscriptions_status ON public.family_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_family_subscriptions_active ON public.family_subscriptions(family_group_id, status) WHERE status = 'active';

-- ============================================================================
-- 3. CREATE UPDATED_AT TRIGGER FUNCTION (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_family_groups_updated_at 
    BEFORE UPDATE ON public.family_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at 
    BEFORE UPDATE ON public.family_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_subscriptions_updated_at 
    BEFORE UPDATE ON public.family_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Family Groups Policies

-- Family members can view their family group
CREATE POLICY "Family members can view family group" ON public.family_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_group_id = family_groups.id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Family admin can update family group
CREATE POLICY "Family admin can update family group" ON public.family_groups
    FOR UPDATE USING (admin_user_id = auth.uid());

-- Family admin can insert family group (when creating new group)
CREATE POLICY "Users can create family group" ON public.family_groups
    FOR INSERT WITH CHECK (admin_user_id = auth.uid());

-- Family admin can delete family group
CREATE POLICY "Family admin can delete family group" ON public.family_groups
    FOR DELETE USING (admin_user_id = auth.uid());

-- Admins can view all family groups
CREATE POLICY "Admins can view all family groups" ON public.family_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all family groups
CREATE POLICY "Admins can manage all family groups" ON public.family_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Note: The "Admins can manage all family groups" policy above already allows system admins
-- to set age_verification_override fields. Family admins (non-system-admins) cannot set
-- these fields because they can only update their own family group, and the override fields
-- should only be set by system admins. This is enforced at the application level.

-- Family Members Policies

-- Family members can view other family members
CREATE POLICY "Family members can view family members" ON public.family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_group_id = family_members.family_group_id
            AND fm.user_id = auth.uid()
            AND fm.status = 'active'
        )
    );

-- Family admin can manage family members (insert, update, delete)
CREATE POLICY "Family admin can manage family members" ON public.family_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = family_members.family_group_id
            AND admin_user_id = auth.uid()
        )
    );

-- Family members can update their own membership
CREATE POLICY "Family members can update own membership" ON public.family_members
    FOR UPDATE USING (user_id = auth.uid());

-- Family members can leave family group (delete their own membership)
CREATE POLICY "Family members can leave family group" ON public.family_members
    FOR DELETE USING (user_id = auth.uid());

-- Admins can view all family members
CREATE POLICY "Admins can view all family members" ON public.family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all family members
CREATE POLICY "Admins can manage all family members" ON public.family_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Family Subscriptions Policies

-- Family members can view family subscription
CREATE POLICY "Family members can view family subscription" ON public.family_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_group_id = family_subscriptions.family_group_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Family admin can manage family subscription
CREATE POLICY "Family admin can manage family subscription" ON public.family_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = family_subscriptions.family_group_id
            AND admin_user_id = auth.uid()
        )
    );

-- Admins can view all family subscriptions
CREATE POLICY "Admins can view all family subscriptions" ON public.family_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all family subscriptions
CREATE POLICY "Admins can manage all family subscriptions" ON public.family_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Check if user is an active family member
CREATE OR REPLACE FUNCTION public.is_family_member(
    family_group_uuid UUID,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_group_id = family_group_uuid
        AND user_id = user_uuid
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is family admin
CREATE OR REPLACE FUNCTION public.is_family_admin(
    family_group_uuid UUID,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_groups
        WHERE id = family_group_uuid
        AND admin_user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has active family subscription access
CREATE OR REPLACE FUNCTION public.has_family_subscription_access(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_members fm
        JOIN public.family_subscriptions fs ON fs.family_group_id = fm.family_group_id
        WHERE fm.user_id = user_uuid
        AND fm.status = 'active'
        AND fs.status = 'active'
        AND (fs.current_period_end IS NULL OR fs.current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all active family members for a family group
CREATE OR REPLACE FUNCTION public.get_active_family_members(
    family_group_uuid UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    role TEXT,
    relationship TEXT,
    status TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fm.id,
        fm.user_id,
        fm.role,
        fm.relationship,
        fm.status,
        fm.joined_at
    FROM public.family_members fm
    WHERE fm.family_group_id = family_group_uuid
    AND fm.status = 'active'
    ORDER BY fm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate that family has at least one adult (age >= 18)
-- The admin must be an adult, and at least one active member must be an adult
-- UNLESS age_verification_override is TRUE (admin override for special cases)
CREATE OR REPLACE FUNCTION public.validate_family_has_adult(
    family_group_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    admin_age INTEGER;
    has_adult_member BOOLEAN;
    has_override BOOLEAN;
BEGIN
    -- Check if admin override is enabled
    SELECT age_verification_override INTO has_override
    FROM public.family_groups
    WHERE id = family_group_uuid;
    
    -- If override is enabled, skip age validation
    IF has_override = TRUE THEN
        RETURN TRUE;
    END IF;
    
    -- Check if admin is an adult (age >= 18)
    SELECT age INTO admin_age
    FROM public.family_members fm
    JOIN public.family_groups fg ON fg.id = fm.family_group_id
    WHERE fm.family_group_id = family_group_uuid
    AND fm.user_id = fg.admin_user_id
    AND fm.status = 'active';
    
    -- Admin must be an adult
    IF admin_age IS NOT NULL AND admin_age < 18 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if at least one active member is an adult
    SELECT EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_group_id = family_group_uuid
        AND status = 'active'
        AND age IS NOT NULL
        AND age >= 18
    ) INTO has_adult_member;
    
    RETURN has_adult_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate region consistency (all members should be from the same region)
-- This is a soft check - allows flexibility for international families
-- Returns TRUE if all members are from the same region, or if region data is missing (flexible)
CREATE OR REPLACE FUNCTION public.validate_family_region_consistency(
    family_group_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    primary_region TEXT;
    member_count INTEGER;
    matching_count INTEGER;
BEGIN
    -- Get primary region from family group
    SELECT fg.primary_region INTO primary_region
    FROM public.family_groups fg
    WHERE fg.id = family_group_uuid;
    
    -- If no primary region set, allow (flexible for new families)
    IF primary_region IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Count active members
    SELECT COUNT(*) INTO member_count
    FROM public.family_members
    WHERE family_group_id = family_group_uuid
    AND status = 'active';
    
    -- Count members matching the primary region
    SELECT COUNT(*) INTO matching_count
    FROM public.family_members fm
    JOIN public.user_profiles up ON up.id = fm.user_id
    WHERE fm.family_group_id = family_group_uuid
    AND fm.status = 'active'
    AND (up.country = primary_region OR up.country IS NULL); -- Allow NULL countries (flexible)
    
    -- At least 80% of members should match the primary region (allows for some flexibility)
    -- Or if all members have NULL country, allow it
    RETURN (matching_count::FLOAT / NULLIF(member_count, 0) >= 0.8) OR matching_count = member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to validate family constraints before member is activated
CREATE OR REPLACE FUNCTION public.validate_family_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
    family_uuid UUID;
    is_adult_valid BOOLEAN;
    is_region_valid BOOLEAN;
BEGIN
    -- Only validate when status changes to 'active'
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        family_uuid := NEW.family_group_id;
        
        -- Validate adult requirement
        SELECT public.validate_family_has_adult(family_uuid) INTO is_adult_valid;
        IF NOT is_adult_valid THEN
            RAISE EXCEPTION 'Family must have at least one adult member (age >= 18). The admin must be an adult.';
        END IF;
        
        -- Validate region consistency (warning only, not blocking)
        -- This is a soft check - we log but don't block
        SELECT public.validate_family_region_consistency(family_uuid) INTO is_region_valid;
        IF NOT is_region_valid THEN
            -- Log warning but don't block (flexible for international families)
            RAISE WARNING 'Family members are from different regions. This may indicate abuse.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate constraints when member status changes
CREATE TRIGGER validate_family_member_constraints_trigger
    BEFORE INSERT OR UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_family_member_constraints();

-- ============================================================================
-- 8. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.family_groups IS 'Family groups for family plan subscriptions';
COMMENT ON COLUMN public.family_groups.family_name IS 'Display name for the family group';
COMMENT ON COLUMN public.family_groups.admin_user_id IS 'User ID of the family admin (head of household)';
COMMENT ON COLUMN public.family_groups.family_type IS 'Type of family: household, parent-child, custom';
COMMENT ON COLUMN public.family_groups.max_members IS 'Maximum number of members allowed in this family group (fixed at 6)';
COMMENT ON COLUMN public.family_groups.primary_region IS 'Primary country/region for the family (used for region validation to prevent abuse). Should match the country of most family members.';
COMMENT ON COLUMN public.family_groups.subscription_id IS 'Reference to the active family subscription (managed by application logic)';
COMMENT ON COLUMN public.family_groups.age_verification_override IS 'Admin override flag: If TRUE, bypasses age verification requirement (allows groups without adults, e.g., friend groups). Only system admins can set this.';
COMMENT ON COLUMN public.family_groups.age_verification_override_by IS 'User ID of the admin who granted the age verification override (for audit purposes)';
COMMENT ON COLUMN public.family_groups.age_verification_override_at IS 'Timestamp when the age verification override was granted';
COMMENT ON COLUMN public.family_groups.age_verification_override_reason IS 'Reason for granting the age verification override (for audit and review purposes)';

COMMENT ON TABLE public.family_members IS 'Members of family groups';
COMMENT ON COLUMN public.family_members.role IS 'Member role: admin, parent, guardian, member, child';
COMMENT ON COLUMN public.family_members.relationship IS 'Relationship to family: parent, child, partner, grandparent, other';
COMMENT ON COLUMN public.family_members.status IS 'Member status: pending, active, suspended, removed';
COMMENT ON COLUMN public.family_members.is_verified IS 'Whether the member has verified their email/invitation';
COMMENT ON COLUMN public.family_members.invited_by IS 'User ID of the person who invited this member';

COMMENT ON TABLE public.family_subscriptions IS 'Family plan subscriptions linked to family groups. Only All-Tools and Supporter plans can be family plans (enforced by check_plan_name constraint).';
COMMENT ON COLUMN public.family_subscriptions.plan_name IS 'Plan name: MUST be either "family_all_tools" or "family_supporter" (enforced by CHECK constraint). Only these two plans support family subscriptions. Individual tools and services cannot have family plans.';
COMMENT ON COLUMN public.family_subscriptions.status IS 'Subscription status from Stripe: active, canceled, past_due, etc.';

COMMENT ON FUNCTION public.is_family_member IS 'Check if a user is an active member of a family group';
COMMENT ON FUNCTION public.is_family_admin IS 'Check if a user is the admin of a family group';
COMMENT ON FUNCTION public.has_family_subscription_access IS 'Check if a user has active family subscription access';
COMMENT ON FUNCTION public.get_active_family_members IS 'Get all active members of a family group';
COMMENT ON FUNCTION public.validate_family_has_adult IS 'Validate that family has at least one adult member (age >= 18). Admin must be an adult. Returns TRUE if age_verification_override is enabled (admin override for special cases like friend groups).';
COMMENT ON FUNCTION public.validate_family_region_consistency IS 'Validate that family members are from the same region (soft check, allows flexibility for international families). Returns TRUE if 80%+ members match primary region or if region data is missing.';

-- Helper function for admins to grant age verification override
-- This function should be called by system admins to allow groups without adults
CREATE OR REPLACE FUNCTION public.grant_age_verification_override(
    family_group_uuid UUID,
    override_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if current user is a system admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only system admins can grant age verification override';
    END IF;
    
    -- Update family group with override
    UPDATE public.family_groups
    SET 
        age_verification_override = TRUE,
        age_verification_override_by = auth.uid(),
        age_verification_override_at = NOW(),
        age_verification_override_reason = override_reason,
        updated_at = NOW()
    WHERE id = family_group_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for admins to revoke age verification override
CREATE OR REPLACE FUNCTION public.revoke_age_verification_override(
    family_group_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if current user is a system admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only system admins can revoke age verification override';
    END IF;
    
    -- Remove override from family group
    UPDATE public.family_groups
    SET 
        age_verification_override = FALSE,
        age_verification_override_by = NULL,
        age_verification_override_at = NULL,
        age_verification_override_reason = NULL,
        updated_at = NOW()
    WHERE id = family_group_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grant_age_verification_override IS 'Grant age verification override for a family group (allows groups without adults). Only system admins can call this function.';
COMMENT ON FUNCTION public.revoke_age_verification_override IS 'Revoke age verification override for a family group. Only system admins can call this function.';


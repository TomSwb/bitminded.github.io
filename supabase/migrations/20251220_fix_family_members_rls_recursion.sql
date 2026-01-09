-- Migration: Fix infinite recursion in family_members RLS policy
-- Purpose: Replace recursive policy check with SECURITY DEFINER function
-- Created: 2025-12-20
-- Related: Family Management UI component initialization

-- Drop the problematic policy
DROP POLICY IF EXISTS "Family members can view family members" ON public.family_members;

-- Recreate the policy using the is_family_member function (SECURITY DEFINER, bypasses RLS)
CREATE POLICY "Family members can view family members" ON public.family_members
    FOR SELECT USING (
        -- User can view their own record
        user_id = auth.uid()
        OR
        -- User can view other members if they're in the same family group
        public.is_family_member(family_group_id, auth.uid())
    );


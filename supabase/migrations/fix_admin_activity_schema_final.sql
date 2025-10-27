-- Fix admin_activity table schema to match code expectations
-- This migration updates the table to use the correct column names:
-- admin_user_id -> admin_id
-- action_type -> action

-- Drop the existing table and recreate with correct schema
DROP TABLE IF EXISTS public.admin_activity CASCADE;

-- Create the table with the correct schema
CREATE TABLE public.admin_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view admin activity" 
ON public.admin_activity FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert admin activity" 
ON public.admin_activity FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX idx_admin_activity_admin_id ON public.admin_activity(admin_id);
CREATE INDEX idx_admin_activity_user_id ON public.admin_activity(user_id);
CREATE INDEX idx_admin_activity_action ON public.admin_activity(action);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity(created_at);

-- Add comment for documentation
COMMENT ON TABLE public.admin_activity IS 'Logs all admin actions for audit trail';
COMMENT ON COLUMN public.admin_activity.admin_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN public.admin_activity.user_id IS 'ID of the user affected by the action (if applicable)';
COMMENT ON COLUMN public.admin_activity.action IS 'Description of the action performed';
COMMENT ON COLUMN public.admin_activity.details IS 'Additional details about the action in JSON format';

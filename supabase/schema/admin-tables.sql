-- Admin Panel Database Tables
-- Created: January 2025
-- Purpose: Support admin panel functionality

-- =====================================================
-- Admin Activity Logging Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin activity
CREATE POLICY "Admins can view admin activity" ON public.admin_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert admin activity
CREATE POLICY "Admins can log actions" ON public.admin_activity
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_user_id ON public.admin_activity(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action_type ON public.admin_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity(created_at DESC);

-- =====================================================
-- Admin Notes Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notes
CREATE POLICY "Admins can manage notes" ON public.admin_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON public.admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON public.admin_notes(admin_id);


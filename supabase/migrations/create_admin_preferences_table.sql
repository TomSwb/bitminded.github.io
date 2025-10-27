-- Create admin preferences table for storing filter settings
CREATE TABLE IF NOT EXISTS public.admin_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE public.admin_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can only access their own preferences
CREATE POLICY "Admins can manage own preferences" ON public.admin_preferences
    FOR ALL USING (
        auth.uid() = admin_id AND 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_preferences_admin_id ON public.admin_preferences(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_preferences_updated_at ON public.admin_preferences(updated_at);

-- Add comment
COMMENT ON TABLE public.admin_preferences IS 'Stores admin user preferences including activity table filters';
COMMENT ON COLUMN public.admin_preferences.preferences IS 'JSONB object containing filter settings and other admin preferences';

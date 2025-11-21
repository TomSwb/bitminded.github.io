-- Migration: Create Error Logs Table
-- Purpose: Store Stripe API errors and edge function errors for debugging and monitoring
-- Dependencies: auth.users table
-- Created: 2025-02-01

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name VARCHAR(255) NOT NULL,
    error_type VARCHAR(100) NOT NULL, -- 'stripe_api', 'validation', 'network', 'auth', 'database', 'other'
    error_message TEXT NOT NULL,
    error_details JSONB, -- Full error object, stack trace, etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_data JSONB, -- Request body, parameters, etc.
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_function_name ON error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all error logs
CREATE POLICY "Admins can view all error logs" ON error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Service role can insert error logs (for edge functions)
CREATE POLICY "Service role can insert error logs" ON error_logs
    FOR INSERT WITH CHECK (true);

-- Add comments
COMMENT ON TABLE error_logs IS 'Stores errors from edge functions, particularly Stripe API errors, for debugging and monitoring';
COMMENT ON COLUMN error_logs.function_name IS 'Name of the edge function that generated the error';
COMMENT ON COLUMN error_logs.error_type IS 'Category of error: stripe_api, validation, network, auth, database, other';
COMMENT ON COLUMN error_logs.error_message IS 'Human-readable error message';
COMMENT ON COLUMN error_logs.error_details IS 'Full error object, stack trace, and additional context in JSON format';
COMMENT ON COLUMN error_logs.request_data IS 'Request body, parameters, and other request context in JSON format';
COMMENT ON COLUMN error_logs.user_id IS 'User ID associated with the error (if applicable)';


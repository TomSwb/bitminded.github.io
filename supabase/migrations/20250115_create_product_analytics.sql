-- Migration: Create Product Analytics Table
-- Purpose: Track product usage analytics and events
-- Dependencies: products table, user_profiles table
-- Created: 2025-01-15

-- Create product analytics table
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- NULL for anonymous
    event_type VARCHAR(100) NOT NULL, -- view, purchase, usage, feature_used, error, etc.
    event_data JSONB, -- Additional event data
    session_id VARCHAR(255),
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    
    -- Geographic Information
    country VARCHAR(2), -- ISO country code
    city VARCHAR(100),
    region VARCHAR(100),
    
    -- Device Information
    device_type VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON product_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_event_type ON product_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON product_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_product_analytics_session_id ON product_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_country ON product_analytics(country);

-- Enable RLS
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics" ON product_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view their own analytics (if user_id is set)
CREATE POLICY "Users can view own analytics" ON product_analytics
    FOR SELECT USING (user_id = auth.uid());

-- Add constraints
ALTER TABLE product_analytics ADD CONSTRAINT check_event_type 
    CHECK (event_type IN (
        'view', 'purchase', 'usage', 'feature_used', 'error', 
        'trial_started', 'trial_ended', 'subscription_cancelled',
        'subscription_renewed', 'support_request', 'feedback'
    ));

ALTER TABLE product_analytics ADD CONSTRAINT check_device_type 
    CHECK (device_type IS NULL OR device_type IN ('desktop', 'mobile', 'tablet'));

-- Add comments
COMMENT ON TABLE product_analytics IS 'Tracks product usage analytics and user events';
COMMENT ON COLUMN product_analytics.event_type IS 'Type of event: view, purchase, usage, feature_used, error, etc.';
COMMENT ON COLUMN product_analytics.event_data IS 'Additional event data stored as JSON';
COMMENT ON COLUMN product_analytics.session_id IS 'Session identifier for grouping related events';
COMMENT ON COLUMN product_analytics.user_id IS 'User ID if authenticated, NULL for anonymous events';
COMMENT ON COLUMN product_analytics.country IS 'ISO 2-letter country code';
COMMENT ON COLUMN product_analytics.device_type IS 'Device type: desktop, mobile, tablet';

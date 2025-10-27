-- Migration: Create Product Maintenance Table
-- Purpose: Track product maintenance windows and updates
-- Dependencies: products table, user_profiles table
-- Created: 2025-01-15

-- Create product maintenance table
CREATE TABLE IF NOT EXISTS product_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL, -- scheduled, emergency, update, migration
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    
    -- Impact
    impact_level VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    affected_features TEXT[], -- Array of affected features
    is_active BOOLEAN DEFAULT true,
    
    -- Notifications
    notify_users BOOLEAN DEFAULT true,
    notify_admins BOOLEAN DEFAULT true,
    notification_sent BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    
    -- Admin Management
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_maintenance_product_id ON product_maintenance(product_id);
CREATE INDEX IF NOT EXISTS idx_product_maintenance_start_time ON product_maintenance(start_time);
CREATE INDEX IF NOT EXISTS idx_product_maintenance_status ON product_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_product_maintenance_is_active ON product_maintenance(is_active);
CREATE INDEX IF NOT EXISTS idx_product_maintenance_created_by ON product_maintenance(created_by);

-- Add updated_at trigger
CREATE TRIGGER update_product_maintenance_updated_at 
    BEFORE UPDATE ON product_maintenance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all maintenance records
CREATE POLICY "Admins can manage all maintenance" ON product_maintenance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view active maintenance for products they own
CREATE POLICY "Users can view active maintenance for owned products" ON product_maintenance
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM product_purchases 
            WHERE user_id = auth.uid() 
            AND product_id = product_maintenance.product_id 
            AND status = 'active'
        )
    );

-- Add constraints
ALTER TABLE product_maintenance ADD CONSTRAINT check_maintenance_type 
    CHECK (maintenance_type IN ('scheduled', 'emergency', 'update', 'migration'));

ALTER TABLE product_maintenance ADD CONSTRAINT check_impact_level 
    CHECK (impact_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE product_maintenance ADD CONSTRAINT check_status 
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE product_maintenance ADD CONSTRAINT check_estimated_duration 
    CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0);

-- Add comments
COMMENT ON TABLE product_maintenance IS 'Tracks product maintenance windows and updates';
COMMENT ON COLUMN product_maintenance.maintenance_type IS 'Type of maintenance: scheduled, emergency, update, migration';
COMMENT ON COLUMN product_maintenance.impact_level IS 'Impact level: low, medium, high, critical';
COMMENT ON COLUMN product_maintenance.affected_features IS 'Array of features affected by this maintenance';
COMMENT ON COLUMN product_maintenance.is_active IS 'Whether this maintenance window is currently active';
COMMENT ON COLUMN product_maintenance.notify_users IS 'Whether to notify users about this maintenance';
COMMENT ON COLUMN product_maintenance.notify_admins IS 'Whether to notify admins about this maintenance';
COMMENT ON COLUMN product_maintenance.notification_sent IS 'Whether notifications have been sent';
COMMENT ON COLUMN product_maintenance.status IS 'Maintenance status: scheduled, in_progress, completed, cancelled';
COMMENT ON COLUMN product_maintenance.estimated_duration_minutes IS 'Estimated duration in minutes';
COMMENT ON COLUMN product_maintenance.completed_at IS 'When the maintenance was completed';

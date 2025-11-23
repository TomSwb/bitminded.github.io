-- Sync Migrations from Production to Dev
-- This file contains SQL migrations that have been applied to production
-- and need to be applied to dev to keep databases in sync
-- Date: 2025-01-23

-- ============================================
-- Migration 1: Create service_purchases table
-- Date: 2025-01-23
-- Source: 20250123_120000_create_service_purchases.sql
-- ============================================

-- Migration: Create Service Purchases Table
-- Purpose: Track all service purchases and subscriptions
-- Dependencies: services table, user_profiles table
-- Created: 2025-01-23

-- Create service purchases table
CREATE TABLE IF NOT EXISTS service_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    purchase_type VARCHAR(50) NOT NULL, -- one_time, subscription, trial
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Stripe Integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    
    -- User Type and Pricing
    user_type VARCHAR(50) NOT NULL, -- individual, enterprise
    discount_code VARCHAR(100),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    original_price DECIMAL(10,2),
    
    -- Subscription Details
    subscription_interval VARCHAR(50), -- monthly, yearly
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Status and Lifecycle
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired, suspended, pending, failed
    payment_status VARCHAR(50) DEFAULT 'succeeded', -- succeeded, pending, failed, refunded
    
    -- Trial Information
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT false,
    
    -- Grace Period
    grace_period_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For subscriptions
    cancelled_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Admin Notes
    admin_notes TEXT,
    cancelled_reason TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_purchases_user_id ON service_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_service_id ON service_purchases(service_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_status ON service_purchases(status);
CREATE INDEX IF NOT EXISTS idx_service_purchases_purchase_type ON service_purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_service_purchases_stripe_subscription_id ON service_purchases(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_stripe_payment_intent_id ON service_purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_stripe_invoice_id ON service_purchases(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_expires_at ON service_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_purchases_purchased_at ON service_purchases(purchased_at);

-- Add updated_at trigger
CREATE TRIGGER update_service_purchases_updated_at 
    BEFORE UPDATE ON service_purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE service_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own service purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_purchases' 
        AND policyname = 'Users can view own service purchases'
    ) THEN
        CREATE POLICY "Users can view own service purchases" ON service_purchases
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- Admins can view all service purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_purchases' 
        AND policyname = 'Admins can view all service purchases'
    ) THEN
        CREATE POLICY "Admins can view all service purchases" ON service_purchases
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Admins can manage all service purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_purchases' 
        AND policyname = 'Admins can manage all service purchases'
    ) THEN
        CREATE POLICY "Admins can manage all service purchases" ON service_purchases
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Add constraints (using IF NOT EXISTS pattern)
DO $$ 
BEGIN
    -- Check purchase type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_purchase_type'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_purchase_type 
            CHECK (purchase_type IN ('one_time', 'subscription', 'trial'));
    END IF;

    -- Check user type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_user_type'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_user_type 
            CHECK (user_type IN ('individual', 'enterprise'));
    END IF;

    -- Check status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_status'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_status 
            CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'pending', 'failed'));
    END IF;

    -- Check payment status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_payment_status'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_payment_status 
            CHECK (payment_status IN ('succeeded', 'pending', 'failed', 'refunded'));
    END IF;

    -- Check subscription interval constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_subscription_interval'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_subscription_interval 
            CHECK (subscription_interval IS NULL OR subscription_interval IN ('monthly', 'yearly'));
    END IF;

    -- Check currency constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_service_currency'
    ) THEN
        ALTER TABLE service_purchases ADD CONSTRAINT check_service_currency 
            CHECK (currency IN ('USD', 'EUR', 'CHF', 'GBP'));
    END IF;
END $$;

-- Add unique constraint for active subscriptions per user per service
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_service_subscription 
    ON service_purchases(user_id, service_id) 
    WHERE status = 'active' AND purchase_type = 'subscription';

-- Add comments
COMMENT ON TABLE service_purchases IS 'Tracks all service purchases and subscriptions for users';
COMMENT ON COLUMN service_purchases.purchase_type IS 'Type of purchase: one_time, subscription, trial';
COMMENT ON COLUMN service_purchases.user_type IS 'User type for pricing: individual, enterprise';
COMMENT ON COLUMN service_purchases.status IS 'Purchase status: active, cancelled, expired, suspended, pending, failed';
COMMENT ON COLUMN service_purchases.payment_status IS 'Payment processing status: succeeded, pending, failed, refunded';
COMMENT ON COLUMN service_purchases.is_trial IS 'Whether this is a trial purchase';
COMMENT ON COLUMN service_purchases.grace_period_ends_at IS 'End of grace period for expired subscriptions';
COMMENT ON COLUMN service_purchases.admin_notes IS 'Internal admin notes about this purchase';
COMMENT ON COLUMN service_purchases.cancelled_reason IS 'Reason for cancellation if applicable';

-- ============================================
-- Migration 2: Add currency price amounts to products
-- Date: 2025-11-22
-- Source: 20251122_add_currency_price_amounts.sql
-- ============================================

-- Note: Check if these columns already exist before running
-- Run these individually in dev SQL editor if needed

-- ============================================
-- Migration 3: Make pricing_type nullable
-- Date: 2025-02-03
-- Source: 20250203_make_pricing_type_nullable.sql
-- ============================================

-- Note: Check if already applied before running


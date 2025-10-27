-- Migration: Create Product Purchases Table
-- Purpose: Track all product purchases and subscriptions
-- Dependencies: products table, user_profiles table
-- Created: 2025-01-15

-- Create product purchases table
CREATE TABLE IF NOT EXISTS product_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_product_purchases_user_id ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_product_id ON product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_status ON product_purchases(status);
CREATE INDEX IF NOT EXISTS idx_product_purchases_purchase_type ON product_purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_product_purchases_stripe_subscription_id ON product_purchases(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_stripe_payment_intent_id ON product_purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_expires_at ON product_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_product_purchases_purchased_at ON product_purchases(purchased_at);

-- Add updated_at trigger
CREATE TRIGGER update_product_purchases_updated_at 
    BEFORE UPDATE ON product_purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON product_purchases
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases" ON product_purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all purchases
CREATE POLICY "Admins can manage all purchases" ON product_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add constraints
ALTER TABLE product_purchases ADD CONSTRAINT check_purchase_type 
    CHECK (purchase_type IN ('one_time', 'subscription', 'trial'));

ALTER TABLE product_purchases ADD CONSTRAINT check_user_type 
    CHECK (user_type IN ('individual', 'enterprise'));

ALTER TABLE product_purchases ADD CONSTRAINT check_status 
    CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'pending', 'failed'));

ALTER TABLE product_purchases ADD CONSTRAINT check_payment_status 
    CHECK (payment_status IN ('succeeded', 'pending', 'failed', 'refunded'));

ALTER TABLE product_purchases ADD CONSTRAINT check_subscription_interval 
    CHECK (subscription_interval IS NULL OR subscription_interval IN ('monthly', 'yearly'));

ALTER TABLE product_purchases ADD CONSTRAINT check_currency 
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'GBP'));

-- Add unique constraint for active subscriptions per user per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription 
    ON product_purchases(user_id, product_id) 
    WHERE status = 'active' AND purchase_type = 'subscription';

-- Add comments
COMMENT ON TABLE product_purchases IS 'Tracks all product purchases and subscriptions for users';
COMMENT ON COLUMN product_purchases.purchase_type IS 'Type of purchase: one_time, subscription, trial';
COMMENT ON COLUMN product_purchases.user_type IS 'User type for pricing: individual, enterprise';
COMMENT ON COLUMN product_purchases.status IS 'Purchase status: active, cancelled, expired, suspended, pending, failed';
COMMENT ON COLUMN product_purchases.payment_status IS 'Payment processing status: succeeded, pending, failed, refunded';
COMMENT ON COLUMN product_purchases.is_trial IS 'Whether this is a trial purchase';
COMMENT ON COLUMN product_purchases.grace_period_ends_at IS 'End of grace period for expired subscriptions';
COMMENT ON COLUMN product_purchases.admin_notes IS 'Internal admin notes about this purchase';
COMMENT ON COLUMN product_purchases.cancelled_reason IS 'Reason for cancellation if applicable';

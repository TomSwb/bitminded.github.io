-- Migration: Create Discount Codes Table
-- Purpose: Discount codes and promotional offers
-- Dependencies: user_profiles table
-- Created: 2025-01-15

-- Create discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(500),
    discount_type VARCHAR(50) NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    
    -- Usage Limits
    usage_limit INTEGER, -- NULL = unlimited
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_user INTEGER DEFAULT 1,
    
    -- Validity Period
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Applicability
    minimum_amount DECIMAL(10,2), -- Minimum purchase amount
    maximum_discount DECIMAL(10,2), -- Maximum discount amount
    applicable_products UUID[], -- Array of product IDs (empty = all products)
    applicable_bundles UUID[], -- Array of bundle IDs (empty = all bundles)
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Admin Management
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_from ON discount_codes(valid_from);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_until ON discount_codes(valid_until);
CREATE INDEX IF NOT EXISTS idx_discount_codes_created_by ON discount_codes(created_by);

-- Add updated_at trigger
CREATE TRIGGER update_discount_codes_updated_at 
    BEFORE UPDATE ON discount_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all discount codes
CREATE POLICY "Admins can manage all discount codes" ON discount_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view active discount codes
CREATE POLICY "Users can view active discount codes" ON discount_codes
    FOR SELECT USING (
        is_active = true AND 
        valid_from <= NOW() AND 
        (valid_until IS NULL OR valid_until >= NOW())
    );

-- Add constraints
ALTER TABLE discount_codes ADD CONSTRAINT check_discount_type 
    CHECK (discount_type IN ('percentage', 'fixed_amount'));

ALTER TABLE discount_codes ADD CONSTRAINT check_discount_value 
    CHECK (discount_value > 0);

ALTER TABLE discount_codes ADD CONSTRAINT check_usage_limit 
    CHECK (usage_limit IS NULL OR usage_limit > 0);

ALTER TABLE discount_codes ADD CONSTRAINT check_usage_limit_per_user 
    CHECK (usage_limit_per_user > 0);

ALTER TABLE discount_codes ADD CONSTRAINT check_minimum_amount 
    CHECK (minimum_amount IS NULL OR minimum_amount >= 0);

ALTER TABLE discount_codes ADD CONSTRAINT check_maximum_discount 
    CHECK (maximum_discount IS NULL OR maximum_discount >= 0);

-- Add comments
COMMENT ON TABLE discount_codes IS 'Discount codes and promotional offers for products and bundles';
COMMENT ON COLUMN discount_codes.code IS 'The discount code users enter (e.g., SAVE20, WELCOME10)';
COMMENT ON COLUMN discount_codes.discount_type IS 'Type of discount: percentage or fixed_amount';
COMMENT ON COLUMN discount_codes.discount_value IS 'Discount amount (percentage or fixed amount)';
COMMENT ON COLUMN discount_codes.usage_limit IS 'Maximum total uses (NULL = unlimited)';
COMMENT ON COLUMN discount_codes.usage_count IS 'Current number of uses';
COMMENT ON COLUMN discount_codes.usage_limit_per_user IS 'Maximum uses per user';
COMMENT ON COLUMN discount_codes.applicable_products IS 'Array of product IDs this code applies to (empty = all products)';
COMMENT ON COLUMN discount_codes.applicable_bundles IS 'Array of bundle IDs this code applies to (empty = all bundles)';
COMMENT ON COLUMN discount_codes.minimum_amount IS 'Minimum purchase amount required to use this code';
COMMENT ON COLUMN discount_codes.maximum_discount IS 'Maximum discount amount (for percentage codes)';

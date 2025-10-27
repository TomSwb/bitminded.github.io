-- Migration: Create Product Bundles Table
-- Purpose: Product bundles and packages for combined offerings
-- Dependencies: products table
-- Created: 2025-01-15

-- Create product bundles table
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    product_ids UUID[] NOT NULL, -- Array of product IDs in this bundle
    
    -- Pricing
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    price_lifetime DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2), -- Discount compared to individual prices
    
    -- Stripe Integration
    stripe_product_id VARCHAR(255),
    stripe_price_monthly_id VARCHAR(255),
    stripe_price_yearly_id VARCHAR(255),
    stripe_price_lifetime_id VARCHAR(255),
    
    -- Media
    icon_url VARCHAR(500),
    banner_url VARCHAR(500),
    
    -- Availability
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, suspended, archived
    is_featured BOOLEAN DEFAULT false,
    is_available_for_purchase BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_bundles_slug ON product_bundles(slug);
CREATE INDEX IF NOT EXISTS idx_product_bundles_status ON product_bundles(status);
CREATE INDEX IF NOT EXISTS idx_product_bundles_is_featured ON product_bundles(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_bundles_stripe_product_id ON product_bundles(stripe_product_id);

-- Add updated_at trigger
CREATE TRIGGER update_product_bundles_updated_at 
    BEFORE UPDATE ON product_bundles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all bundles
CREATE POLICY "Admins can manage all bundles" ON product_bundles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view active bundles
CREATE POLICY "Users can view active bundles" ON product_bundles
    FOR SELECT USING (status = 'active');

-- Add constraints
ALTER TABLE product_bundles ADD CONSTRAINT check_status 
    CHECK (status IN ('draft', 'active', 'suspended', 'archived'));

ALTER TABLE product_bundles ADD CONSTRAINT check_price_currency 
    CHECK (price_currency IN ('USD', 'EUR', 'CHF', 'GBP'));

ALTER TABLE product_bundles ADD CONSTRAINT check_discount_percentage 
    CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));

-- Add comments
COMMENT ON TABLE product_bundles IS 'Product bundles combining multiple products at a discount';
COMMENT ON COLUMN product_bundles.product_ids IS 'Array of product IDs included in this bundle';
COMMENT ON COLUMN product_bundles.discount_percentage IS 'Percentage discount compared to buying products individually';
COMMENT ON COLUMN product_bundles.status IS 'Bundle status: draft, active, suspended, archived';
COMMENT ON COLUMN product_bundles.is_featured IS 'Whether to show this bundle prominently';
COMMENT ON COLUMN product_bundles.is_available_for_purchase IS 'Whether this bundle can be purchased';

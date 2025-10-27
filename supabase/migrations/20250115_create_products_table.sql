-- Migration: Create Products Table
-- Purpose: Main products catalog table for all BitMinded products
-- Dependencies: product_categories table
-- Created: 2025-01-15

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category_id UUID REFERENCES product_categories(id),
    tags TEXT[], -- Array of tags for filtering
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, suspended, archived, coming-soon, beta
    pricing_type VARCHAR(50) NOT NULL, -- one_time, subscription, freemium
    price_amount DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'USD',
    subscription_interval VARCHAR(50), -- monthly, yearly (if subscription)
    
    -- GitHub Integration
    github_repo_url VARCHAR(500),
    github_repo_name VARCHAR(255),
    github_branch VARCHAR(100) DEFAULT 'main',
    
    -- Cloudflare Integration
    cloudflare_domain VARCHAR(255),
    cloudflare_worker_url VARCHAR(500),
    
    -- Stripe Integration
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    stripe_price_monthly_id VARCHAR(255),
    stripe_price_yearly_id VARCHAR(255),
    stripe_price_lifetime_id VARCHAR(255),
    
    -- Commission Information
    is_commissioned BOOLEAN DEFAULT false,
    commissioned_by UUID REFERENCES user_profiles(id),
    commissioned_client_name VARCHAR(255),
    commissioned_client_email VARCHAR(255),
    
    -- Pricing Tiers
    individual_price DECIMAL(10,2), -- Free for individuals
    enterprise_price DECIMAL(10,2), -- Reduced price for enterprises
    trial_days INTEGER DEFAULT 0,
    trial_requires_payment BOOLEAN DEFAULT false,
    
    -- Media
    icon_url VARCHAR(500),
    screenshots TEXT[], -- Array of screenshot URLs
    demo_video_url VARCHAR(500),
    
    -- Metadata
    features TEXT[], -- Array of feature descriptions
    target_audience TEXT,
    tech_stack TEXT[], -- Array of technologies used
    documentation_url VARCHAR(500),
    support_email VARCHAR(255),
    
    -- Availability
    is_featured BOOLEAN DEFAULT false,
    is_available_for_purchase BOOLEAN DEFAULT true,
    requires_admin_approval BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_pricing_type ON products(pricing_type);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_commissioned ON products(is_commissioned);
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);

-- Add updated_at trigger
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all products
CREATE POLICY "Admins can manage all products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view active products
CREATE POLICY "Users can view active products" ON products
    FOR SELECT USING (status = 'active');

-- Users can view coming-soon products (but not purchase)
CREATE POLICY "Users can view coming-soon products" ON products
    FOR SELECT USING (status = 'coming-soon');

-- Add constraints
ALTER TABLE products ADD CONSTRAINT check_status 
    CHECK (status IN ('draft', 'active', 'suspended', 'archived', 'coming-soon', 'beta'));

ALTER TABLE products ADD CONSTRAINT check_pricing_type 
    CHECK (pricing_type IN ('one_time', 'subscription', 'freemium'));

ALTER TABLE products ADD CONSTRAINT check_subscription_interval 
    CHECK (subscription_interval IS NULL OR subscription_interval IN ('monthly', 'yearly'));

ALTER TABLE products ADD CONSTRAINT check_price_currency 
    CHECK (price_currency IN ('USD', 'EUR', 'CHF', 'GBP'));

-- Add comments
COMMENT ON TABLE products IS 'Main products catalog for BitMinded tools and applications';
COMMENT ON COLUMN products.slug IS 'URL-friendly identifier used in subdomains and URLs';
COMMENT ON COLUMN products.status IS 'Product lifecycle status: draft, active, suspended, archived, coming-soon, beta';
COMMENT ON COLUMN products.pricing_type IS 'Pricing model: one_time, subscription, freemium';
COMMENT ON COLUMN products.is_commissioned IS 'Whether this product was commissioned by a client';
COMMENT ON COLUMN products.individual_price IS 'Price for individual users (often free)';
COMMENT ON COLUMN products.enterprise_price IS 'Price for enterprise users (often discounted)';
COMMENT ON COLUMN products.trial_days IS 'Number of days for free trial (0 = no trial)';
COMMENT ON COLUMN products.trial_requires_payment IS 'Whether trial requires payment method';
COMMENT ON COLUMN products.is_featured IS 'Whether to show on homepage and featured sections';
COMMENT ON COLUMN products.requires_admin_approval IS 'Whether purchases require manual admin approval';

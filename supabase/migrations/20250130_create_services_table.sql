-- Migration: Create Services Table
-- Purpose: Manage all BitMinded services (commissioning, tech support, catalog access)
-- Dependencies: user_profiles table
-- Created: 2025-01-30

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    service_category VARCHAR(50) NOT NULL, -- 'commissioning', 'tech-support', 'catalog-access'
    
    -- Status Management
    status VARCHAR(50) DEFAULT 'available', -- available, unavailable, overbooked, on-sale, coming-soon, archived
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Pricing (Multi-Currency Support)
    -- Base pricing stored as JSONB for flexibility
    pricing JSONB NOT NULL DEFAULT '{}', -- Structure: {"CHF": {"amount": 50, "reduced_amount": 35}, "USD": {"amount": 55, "reduced_amount": 38}, ...}
    
    -- Pricing Details
    pricing_type VARCHAR(50) NOT NULL, -- 'fixed', 'hourly', 'range', 'variable'
    base_price_currency VARCHAR(3) DEFAULT 'CHF', -- Primary currency
    has_reduced_fare BOOLEAN DEFAULT false,
    reduced_fare_eligibility TEXT, -- Description of who qualifies (seniors, students, unemployed)
    
    -- Additional Pricing Fields
    price_range_min DECIMAL(10,2), -- For range pricing (e.g., CHF 20-150)
    price_range_max DECIMAL(10,2),
    hourly_rate DECIMAL(10,2), -- For hourly services
    duration VARCHAR(100), -- e.g., "1 hour", "3 sessions", "1-2 weeks"
    additional_costs TEXT, -- e.g., "+ travel", "+ device cost"
    
    -- Sales & Special Offers
    is_on_sale BOOLEAN DEFAULT false,
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    sale_pricing JSONB, -- Same structure as pricing, but for sale prices
    sale_description TEXT, -- Description of the sale/offer
    
    -- Stripe Integration (Ready but not connected)
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    stripe_price_reduced_id VARCHAR(255), -- For reduced fare pricing
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    tags TEXT[], -- Array of tags for filtering
    notes TEXT, -- Admin notes
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(service_category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_is_on_sale ON services(is_on_sale);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

-- Add updated_at trigger
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all services
CREATE POLICY "Admins can manage all services" ON services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view active services
CREATE POLICY "Users can view active services" ON services
    FOR SELECT USING (is_active = true AND status != 'archived');

-- Add constraints
ALTER TABLE services ADD CONSTRAINT check_service_category 
    CHECK (service_category IN ('commissioning', 'tech-support', 'catalog-access'));

ALTER TABLE services ADD CONSTRAINT check_status 
    CHECK (status IN ('available', 'unavailable', 'overbooked', 'on-sale', 'coming-soon', 'archived'));

ALTER TABLE services ADD CONSTRAINT check_pricing_type 
    CHECK (pricing_type IN ('fixed', 'hourly', 'range', 'variable'));

ALTER TABLE services ADD CONSTRAINT check_base_price_currency 
    CHECK (base_price_currency IN ('USD', 'EUR', 'CHF', 'GBP'));

-- Add comments
COMMENT ON TABLE services IS 'All BitMinded services: commissioning, tech support, catalog access';
COMMENT ON COLUMN services.pricing IS 'Multi-currency pricing stored as JSONB: {"CHF": {"amount": 50, "reduced_amount": 35}, ...}';
COMMENT ON COLUMN services.sale_pricing IS 'Sale prices in same format as pricing';
COMMENT ON COLUMN services.status IS 'Service availability status';
COMMENT ON COLUMN services.service_category IS 'Service category: commissioning, tech-support, catalog-access';
COMMENT ON COLUMN services.pricing_type IS 'Pricing model: fixed, hourly, range, variable';
COMMENT ON COLUMN services.has_reduced_fare IS 'Whether this service offers reduced fare pricing';
COMMENT ON COLUMN services.is_on_sale IS 'Whether this service is currently on sale';


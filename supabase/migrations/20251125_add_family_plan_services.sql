-- Migration: Add Family Plan Service Entries
-- Purpose: Create separate service entries for family plans (hidden from catalog, linked to parent services)
-- Dependencies: services table, family_groups table (for reference)
-- Created: 2025-11-25

-- Add fields to support family plan services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS display_in_catalog BOOLEAN DEFAULT true;

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS parent_service_slug VARCHAR(255);

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_family_variant BOOLEAN DEFAULT false;

-- Add index for parent_service_slug lookups
CREATE INDEX IF NOT EXISTS idx_services_parent_service_slug ON services(parent_service_slug);

-- Add index for display_in_catalog filtering
CREATE INDEX IF NOT EXISTS idx_services_display_in_catalog ON services(display_in_catalog);

-- Add comment
COMMENT ON COLUMN services.display_in_catalog IS 'Whether this service should be displayed in the catalog access page. Set to false for family variants that are accessed via toggle.';
COMMENT ON COLUMN services.parent_service_slug IS 'For family variant services, this links to the parent individual service slug (e.g., "all-tools-membership" -> "all-tools-membership-family")';
COMMENT ON COLUMN services.is_family_variant IS 'Whether this service is a family plan variant of another service. Family variants are hidden from catalog but accessible via toggle.';

-- Insert Family All-Tools Membership service
INSERT INTO services (
    name,
    slug,
    description,
    short_description,
    service_category,
    status,
    pricing_type,
    base_price_currency,
    pricing,
    price_range_min,
    price_range_max,
    duration,
    display_order,
    display_in_catalog,
    parent_service_slug,
    is_family_variant,
    is_active,
    is_featured
) VALUES (
    'All-Tools Membership (Family)',
    'all-tools-membership-family',
    'Unlock every catalog app and private release notes for your family. Price per member. Price may increase over time as the catalog grows. New pricing will always be communicated prior to implementation.',
    'Unlock every catalog app and private release notes for your family.',
    'catalog-access',
    'available',
    'subscription',
    'CHF',
    '{"CHF": {"amount": 3.50, "monthly": 3.50, "yearly": 38.50, "family_monthly": 3.50, "family_yearly": 38.50}}'::jsonb,
    3.50,
    3.50,
    '/member/month',
    2,
    false, -- Hidden from catalog (accessed via toggle)
    'all-tools-membership', -- Parent service
    true, -- Is family variant
    true,
    false
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.description,
    pricing = EXCLUDED.pricing,
    display_in_catalog = EXCLUDED.display_in_catalog,
    parent_service_slug = EXCLUDED.parent_service_slug,
    is_family_variant = EXCLUDED.is_family_variant,
    updated_at = NOW();

-- Insert Family Supporter Tier service
INSERT INTO services (
    name,
    slug,
    description,
    short_description,
    service_category,
    status,
    pricing_type,
    base_price_currency,
    pricing,
    price_range_min,
    price_range_max,
    duration,
    display_order,
    display_in_catalog,
    parent_service_slug,
    is_family_variant,
    is_active,
    is_featured
) VALUES (
    'Supporter Tier (Family)',
    'supporter-tier-family',
    'All-Tools perks plus the ability to propose your own features for your family. Price per member. Price may increase over time as the catalog grows. New pricing will always be communicated prior to implementation.',
    'All-Tools perks plus the ability to propose your own features for your family.',
    'catalog-access',
    'available',
    'subscription',
    'CHF',
    '{"CHF": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 5, "family_yearly": 55}}'::jsonb,
    5,
    5,
    '/member/month',
    3,
    false, -- Hidden from catalog (accessed via toggle)
    'supporter-tier', -- Parent service
    true, -- Is family variant
    true,
    false
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.description,
    pricing = EXCLUDED.pricing,
    display_in_catalog = EXCLUDED.display_in_catalog,
    parent_service_slug = EXCLUDED.parent_service_slug,
    is_family_variant = EXCLUDED.is_family_variant,
    updated_at = NOW();

-- Note: Stripe product IDs and price IDs will be added later via the service management modal
-- These services are ready for Stripe product creation through the admin panel


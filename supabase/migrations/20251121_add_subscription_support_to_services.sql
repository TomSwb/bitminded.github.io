-- Migration: Add Subscription Support to Services
-- Purpose: Enable subscription/recurring payment support for services
-- Dependencies: services table
-- Created: 2025-11-21

-- Add subscription_interval column (similar to products table)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS subscription_interval VARCHAR(50) CHECK (subscription_interval IN ('monthly', 'yearly'));

-- Update pricing_type constraint to include 'subscription'
ALTER TABLE services 
DROP CONSTRAINT IF EXISTS check_pricing_type;

ALTER TABLE services 
ADD CONSTRAINT check_pricing_type 
CHECK (pricing_type IN ('fixed', 'hourly', 'range', 'variable', 'subscription'));

-- Add comment
COMMENT ON COLUMN services.subscription_interval IS 'Billing interval for subscription services: monthly or yearly';


-- Migration: Add Trial Period Support to Services
-- Purpose: Enable trial period configuration for subscription services
-- Dependencies: services table
-- Created: 2025-11-21

-- Add trial period columns (similar to products table)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_requires_payment BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN services.trial_days IS 'Number of days for free trial (0 = no trial). Only applies to subscription services.';
COMMENT ON COLUMN services.trial_requires_payment IS 'Whether trial requires payment method upfront. Only applies to subscription services.';


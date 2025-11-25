-- Migration: Add service format and payment method to service_purchases table
-- Purpose: Track booking format (in-person vs remote) and payment method at booking level
-- Dependencies: service_purchases table, invoices table
-- Created: 2025-01-31

-- Add service_format and payment_method columns to service_purchases table
ALTER TABLE service_purchases 
ADD COLUMN IF NOT EXISTS service_format VARCHAR(50), -- 'in_person', 'remote', NULL (if format not specified)
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50); -- 'stripe', 'bank_transfer', NULL

-- Add constraints
ALTER TABLE service_purchases 
ADD CONSTRAINT check_service_format 
CHECK (service_format IS NULL OR service_format IN ('in_person', 'remote'));

ALTER TABLE service_purchases 
ADD CONSTRAINT check_service_payment_method 
CHECK (payment_method IS NULL OR payment_method IN ('stripe', 'bank_transfer'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_purchases_service_format ON service_purchases(service_format);
CREATE INDEX IF NOT EXISTS idx_service_purchases_payment_method ON service_purchases(payment_method);

-- Add service_purchase_id to invoices table to link invoices to bookings
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_purchase_id UUID REFERENCES service_purchases(id) ON DELETE SET NULL;

-- Add index for invoice lookup by service purchase
CREATE INDEX IF NOT EXISTS idx_invoices_service_purchase_id ON invoices(service_purchase_id);

-- Add comments
COMMENT ON COLUMN service_purchases.service_format IS 'Service delivery format: in_person (requires travel, uses bank transfer) or remote (uses Stripe). NULL if format not specified.';
COMMENT ON COLUMN service_purchases.payment_method IS 'Payment method for this booking: stripe (remote services) or bank_transfer (in-person services). Determined by service_format if specified.';
COMMENT ON COLUMN invoices.service_purchase_id IS 'Link to service_purchases table for bank transfer bookings. NULL for standalone invoices.';

-- Migration note:
-- The payment_method at service level (services.payment_method) is now a default/suggestion.
-- The actual payment method is determined at booking time:
--   - If service_format = 'in_person' → payment_method = 'bank_transfer'
--   - If service_format = 'remote' → payment_method = 'stripe'
--   - If service_format is NULL → use service.payment_method as fallback

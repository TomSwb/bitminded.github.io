-- Migration: Create invoices table for PostFinance bank transfer workflow
-- Purpose: Track invoices for bank transfer payments (commissioning, in-person tech support)
-- Dependencies: services table, auth.users table
-- Created: 2025-01-31

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CHF',
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, pending_payment, paid, overdue, cancelled, partially_paid
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer', -- stripe, bank_transfer
    due_date DATE,
    qr_bill_data JSONB, -- QR-bill generation data (QR code, IBAN, reference, etc.)
    customer_name TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_iban TEXT, -- For refunds
    reference_field TEXT, -- Invoice number in reference field for payment matching
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_id ON invoices(service_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_field ON invoices(reference_field);

-- Add updated_at trigger
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE invoices ADD CONSTRAINT check_invoice_status 
    CHECK (status IN ('draft', 'sent', 'pending_payment', 'paid', 'overdue', 'cancelled', 'partially_paid'));

ALTER TABLE invoices ADD CONSTRAINT check_invoice_payment_method 
    CHECK (payment_method IN ('stripe', 'bank_transfer'));

ALTER TABLE invoices ADD CONSTRAINT check_invoice_currency 
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'GBP'));

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all invoices
CREATE POLICY "Admins can manage all invoices" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE invoices IS 'Invoices for bank transfer payments (PostFinance QR-bills) and Stripe payments';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice identifier used in QR-bill reference field';
COMMENT ON COLUMN invoices.qr_bill_data IS 'QR-bill generation data: IBAN, SCOR, QR code data';
COMMENT ON COLUMN invoices.reference_field IS 'Invoice number in reference field for payment matching';
COMMENT ON COLUMN invoices.customer_iban IS 'Customer IBAN for refund processing';
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft, sent, pending_payment, paid, overdue, cancelled, partially_paid';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method: stripe or bank_transfer';

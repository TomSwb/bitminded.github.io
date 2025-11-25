# Revenue Reports Component Specification

## Overview
Financial reporting and analytics for tracking revenue, payments, and business metrics.

## Responsibilities
- Display revenue metrics and KPIs
- Generate financial reports
- Track payment history (Stripe + PostFinance bank transfers)
- Monitor failed payments
- Calculate customer lifetime value
- Export financial data
- Tax and compliance reporting
- **Financial declaration tracking** (ORP/AVS thresholds)
- **Manual payment entry** for PostFinance bank transfers
- **Invoice reconciliation** (pending invoices, unmatched payments)
- **Refund processing** (Stripe + manual bank transfer refunds)

## UI Components

### Header Section
- Title: "Revenue & Reports"
- Date range selector (predefined + custom)
- Currency toggle (CHF/USD/EUR) - **Primary: CHF, Secondary: EUR**
- **Export Report** button (CSV, PDF, JSON, camt.053 format)
- **Download Tax Report** button
- **Declaration Status Indicator**: Show annual revenue total with ORP/AVS threshold warnings

### Key Metrics Dashboard

**Metric Cards**:
1. **Total Revenue**
   - All-time revenue
   - Growth % vs previous period
   - By payment method (Stripe vs PostFinance)

2. **MRR** (Monthly Recurring Revenue)
   - Current MRR
   - Trend indicator
   - Projected next month

3. **ARR** (Annual Recurring Revenue)
   - Current ARR
   - Growth rate

4. **Annual Revenue (Declaration Tracking)** ⚠️ **NEW**
   - Running total for current year
   - **Warning at CHF 1,500/year** (approaching AVS threshold)
   - **Alert at CHF 2,300/year** (must declare to AVS)
   - Visual indicator (green/yellow/red)
   - Notes field for ORP conversations

5. **ARPU** (Average Revenue Per User)
   - Per month
   - Per year

6. **Customer Lifetime Value (LTV)**
   - Average LTV
   - By product

7. **Churn Revenue**
   - Lost MRR this month
   - Churn rate

8. **Pending Bank Transfers** ⚠️ **NEW**
   - Count of unpaid invoices
   - Total amount pending
   - Days overdue summary

### Revenue Charts

**Charts to Include**:
1. **Revenue Over Time** (line chart)
   - Daily/Weekly/Monthly view
   - Filter by product
   - Compare periods

2. **Revenue by Product** (bar chart)
   - Breakdown by each product
   - Monthly/Yearly comparison

3. **Revenue Sources** (pie chart)
   - Subscriptions
   - One-time payments
   - Manual grants (revenue $0)

4. **Payment Method Distribution** (donut chart)
   - Credit cards by brand
   - Bank transfers (PostFinance)
   - Other payment methods

5. **Revenue by Payment Method** (bar chart) ⚠️ **NEW**
   - Stripe payments
   - PostFinance bank transfers
   - Comparison over time

### Transactions Table

**Columns**:
1. **Date/Time**
2. **User** (username + email)
3. **Product/Service** (or Invoice number for bank transfers)
4. **Amount**
5. **Currency** (CHF, EUR)
6. **Payment Method** (Stripe Card, PostFinance Bank Transfer)
7. **Status** (Paid, Failed, Refunded, Pending, Partially Refunded)
8. **Invoice/Reference** (link to Stripe or invoice number for bank transfers)
9. **Actions** (Refund, Details, Manual Entry for bank transfers)

**Filters**:
- Date range
- Status (all/paid/failed/refunded/pending/partially_refunded)
- Product/Service
- Invoice number (for bank transfers)
- Amount range
- Payment method (Stripe, PostFinance Bank Transfer, All)
- Currency (CHF, EUR, All)

### Failed Payments Section

**Failed Payments Table**:
- User
- Amount
- Product
- Failure reason
- Retry count
- Last retry date
- **Actions**: Retry now, Contact user, Cancel

### Refunds Section

**Refund History**:
- Date
- User
- Original amount
- Refund amount (full or partial)
- Reason
- Processed by (admin)
- Status (processing, completed, failed)
- **Payment Method** (Stripe refund or Bank Transfer refund)
- **Transaction Reference** (Stripe refund ID or PostFinance transaction reference for bank transfers)
- **Link to Original Payment**

**Refund Actions**:
- **Stripe Refunds**: Process via Stripe API (automated)
- **Bank Transfer Refunds**: Manual process workflow
  1. Admin initiates refund in admin panel
  2. System records refund and sends confirmation email
  3. Admin initiates bank transfer via PostFinance e-banking
  4. Admin records PostFinance transaction reference
  5. System tracks refund status (processing → completed)

### Manual Payment Entry Section ⚠️ **NEW**

**Purpose**: Enter PostFinance bank transfer payments manually

**UI Components**:
- **Pending Invoices Table**: All invoices awaiting bank transfer payment
  - Invoice number
  - Customer name/email
  - Amount
  - Due date
  - Days overdue (if applicable)
  - Status: pending, overdue, partially paid
  - Actions: Manual Entry, View Invoice

- **Unmatched Payments**: Payments received but not yet matched to invoices
  - Amount received
  - Date received
  - Reference field (from bank statement)
  - Match manually or mark as unmatched

- **Manual Payment Entry Form**:
  - Invoice lookup/search (by invoice number or customer)
  - Amount input (validate against invoice amount)
  - Payment date picker
  - Reference field input (from PostFinance transaction)
  - Currency selection (CHF or EUR)
  - Verification checkboxes (amount matches, reference matches)
  - Admin notes field
  - Submit button

**Workflow**:
1. Admin checks PostFinance account for incoming transfers
2. Admin identifies payment via reference field (invoice number)
3. Admin enters payment in manual entry form
4. System automatically:
   - Matches invoice number to pending invoice
   - Marks invoice as "paid"
   - Records payment in `payments` table
   - Updates revenue metrics
   - Sends payment confirmation email to customer

### Reconciliation Dashboard ⚠️ **NEW**

**Purpose**: Reconcile PostFinance bank transfers with invoices

**UI Components**:
- **Pending Invoices Summary**: Total amount, count, days overdue
- **Recent Payments**: List of recently entered bank transfers
- **Unmatched Payments Alert**: Highlight payments that couldn't be matched
- **Export Transactions**: Export for PostFinance reconciliation (CSV, camt.053 format)

### Financial Reports

**Report Types**:
1. **Revenue Summary**
   - Total revenue
   - By period (daily/weekly/monthly)
   - By product
   - Export to PDF/CSV

2. **Tax Report**
   - Revenue by jurisdiction
   - Tax breakdown
   - VAT/Sales tax details
   - Export for accounting

3. **Customer Report**
   - LTV analysis
   - Cohort analysis
   - Retention rates
   - Churn analysis

4. **Product Performance**
   - Revenue by product
   - Conversion rates
   - Price point analysis

### Export Options

**Export Formats**:
- CSV (for Excel)
- PDF (formatted report)
- JSON (raw data)
- **camt.053** (ISO 20022 standard for accounting software like BEXIO) ⚠️ **NEW**
- QuickBooks format
- Accounting software integration

**Export Types**:
- **Revenue Summary**: All transactions, metrics, customer data
- **Tax Report**: Revenue by jurisdiction, tax breakdown, VAT details
- **Declaration Export**: For ORP/AVS declarations (annual revenue summary) ⚠️ **NEW**
- **PostFinance Reconciliation**: Transaction export for bank reconciliation ⚠️ **NEW**
- **Refund History**: All refunds with details

**Data Included**:
- All transactions (Stripe + PostFinance bank transfers)
- Revenue metrics
- Customer data
- Tax information
- Refund details
- Invoice information (for bank transfer payments)
- Payment method breakdown

## Functionality

### Calculate Revenue Metrics
```javascript
async calculateMetrics(dateRange) {
    // Total Revenue
    const totalRevenue = await this.getTotalRevenue(dateRange);
    
    // MRR (Monthly Recurring Revenue)
    const mrr = await this.calculateMRR();
    
    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;
    
    // ARPU (Average Revenue Per User)
    const activeUsers = await this.getActiveUserCount();
    const arpu = totalRevenue / activeUsers;
    
    // Customer LTV
    const avgLifetime = await this.getAvgCustomerLifetime();
    const ltv = arpu * avgLifetime;
    
    // Churn Revenue
    const churnRevenue = await this.getChurnRevenue(dateRange);
    
    return { totalRevenue, mrr, arr, arpu, ltv, churnRevenue };
}
```

### Process Refund
```javascript
async processRefund(paymentId, amount, reason) {
    // 1. Verify admin permission
    // 2. Confirm refund amount <= original payment
    // 3. Check payment method:
    //    - If Stripe: Process refund via Stripe API (automated)
    //    - If Bank Transfer: Record refund, admin must initiate manual transfer
    // 4. Update local database
    // 5. Update entitlements if needed
    // 6. Log refund action
    // 7. Send refund email to user
    // 8. Update revenue metrics
    // 9. For bank transfers: Mark as "processing" until admin confirms completion
}
```

### Generate Report
```javascript
async generateReport(reportType, dateRange, format) {
    // 1. Query relevant data
    // 2. Calculate metrics
    // 3. Format data based on report type
    
    if (format === 'pdf') {
        // Generate PDF report
        return await this.generatePDFReport(data);
    }
    
    if (format === 'csv') {
        // Generate CSV export
        return this.generateCSV(data);
    }
    
    if (format === 'tax') {
        // Generate tax report
        return await this.generateTaxReport(data);
    }
}
```

### Retry Failed Payment
```javascript
async retryFailedPayment(paymentIntentId) {
    // 1. Get payment intent from Stripe
    // 2. Attempt to charge payment method again
    // 3. If successful:
    //    - Update payment status
    //    - Activate subscription
    //    - Notify user
    // 4. If failed:
    //    - Increment retry count
    //    - Log failure reason
    //    - Optionally notify admin
}
```

## Database Queries

### Financial Declaration Tracking
```sql
-- Annual Revenue Total (for AVS threshold monitoring)
SELECT COALESCE(SUM(amount), 0) as annual_revenue
FROM payments
WHERE 
    status = 'paid'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

-- Monthly Revenue (for ORP monthly checks)
SELECT 
    EXTRACT(YEAR FROM created_at) as year,
    EXTRACT(MONTH FROM created_at) as month,
    COALESCE(SUM(amount), 0) as monthly_revenue
FROM payments
WHERE status = 'paid'
GROUP BY year, month
ORDER BY year DESC, month DESC;
```

### Revenue Metrics
```sql
-- Total Revenue
SELECT COALESCE(SUM(amount), 0) as total_revenue
FROM payments
WHERE 
    created_at >= $startDate 
    AND created_at <= $endDate
    AND status = 'paid';

-- MRR (Monthly Recurring Revenue)
SELECT COALESCE(SUM(e.price_monthly), 0) as mrr
FROM entitlements e
WHERE e.active = true
    AND e.subscription_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM user_subscriptions us
        WHERE us.stripe_subscription_id = e.subscription_id
        AND us.status = 'active'
    );

-- Revenue by Product
SELECT 
    app_id,
    COALESCE(SUM(amount), 0) as revenue,
    COUNT(*) as transaction_count
FROM payments
WHERE created_at >= $startDate AND created_at <= $endDate
GROUP BY app_id
ORDER BY revenue DESC;

-- Revenue by Payment Method
SELECT 
    payment_method_type,
    COALESCE(SUM(amount), 0) as revenue,
    COUNT(*) as transaction_count
FROM payments
WHERE 
    created_at >= $startDate 
    AND created_at <= $endDate
    AND status = 'paid'
GROUP BY payment_method_type
ORDER BY revenue DESC;

-- Pending Bank Transfer Payments (Unpaid Invoices)
SELECT 
    i.id,
    i.invoice_number,
    i.amount,
    i.currency,
    i.due_date,
    i.customer_name,
    i.customer_email,
    CURRENT_DATE - i.due_date as days_overdue
FROM invoices i
WHERE i.status = 'pending_payment'
    AND i.payment_method = 'bank_transfer'
ORDER BY i.due_date ASC;
```

### Failed Payments
```sql
SELECT 
    p.id,
    p.amount,
    p.app_id,
    p.stripe_payment_intent_id,
    p.failure_reason,
    p.retry_count,
    p.last_retry_at,
    up.username,
    au.email
FROM payments p
JOIN user_profiles up ON p.user_id = up.id
JOIN auth.users au ON p.user_id = au.id
WHERE p.status = 'failed'
    AND p.retry_count < 3
ORDER BY p.created_at DESC;
```

### Payments Table Schema
```sql
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    app_id TEXT REFERENCES products(id),
    invoice_id UUID REFERENCES invoices(id), -- For bank transfer payments
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'CHF', -- CHF or EUR
    status TEXT NOT NULL, -- paid, failed, refunded, pending, partially_refunded
    payment_method_type TEXT, -- stripe_card, stripe_other, postfinance_bank_transfer
    payment_method_last4 TEXT, -- Last 4 digits of card or bank account
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    refunded_amount DECIMAL DEFAULT 0,
    refund_reason TEXT,
    refund_status TEXT, -- pending, processing, completed, failed (for bank transfers)
    refund_transaction_reference TEXT, -- PostFinance transaction reference for bank transfer refunds
    refund_initiated_at TIMESTAMP,
    refund_completed_at TIMESTAMP,
    postfinance_reference TEXT, -- Reference field from PostFinance transaction
    manual_entry_notes TEXT, -- Admin notes for manually entered payments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table (for bank transfer payments)
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    service_id UUID REFERENCES services(id),
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'CHF',
    status TEXT NOT NULL, -- draft, sent, pending_payment, paid, overdue, cancelled
    payment_method TEXT NOT NULL, -- stripe, bank_transfer
    due_date DATE,
    qr_bill_data JSONB, -- QR-bill generation data
    customer_name TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_iban TEXT, -- For refunds
    reference_field TEXT, -- Invoice number in reference field
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_app_id ON payments(app_id);
```

## Stripe Integration

### Payment Events
```javascript
// Webhook handlers for payments
const paymentWebhooks = {
    'charge.succeeded': async (charge) => {
        // Record successful payment
        await recordPayment(charge, 'paid');
    },
    
    'charge.failed': async (charge) => {
        // Record failed payment
        await recordPayment(charge, 'failed');
    },
    
    'charge.refunded': async (charge) => {
        // Update payment as refunded
        await updatePaymentStatus(charge.id, 'refunded', charge.amount_refunded);
    }
};
```

## API Methods

```javascript
class RevenueReports {
    async init()
    async loadRevenueData(dateRange)
    async calculateMetrics(dateRange)
    async loadTransactions(filters)
    async loadFailedPayments()
    async loadRefunds()
    async processRefund(paymentId, amount, reason)
    async retryFailedPayment(paymentIntentId)
    async generateReport(reportType, dateRange, format)
    async exportData(format, filters)
    async calculateLTV()
    async getRevenueByProduct(dateRange)
    async getTaxReport(dateRange)
    updateDateRange(startDate, endDate)
    refreshMetrics()
    
    // NEW: PostFinance Bank Transfer Support
    async loadPendingInvoices(filters)
    async loadUnmatchedPayments()
    async enterManualPayment(invoiceId, paymentData) // invoiceId, amount, date, reference, currency, notes
    async matchPaymentToInvoice(paymentId, invoiceId)
    async recordBankTransferRefund(paymentId, refundData) // amount, reason, postfinanceReference
    async updateRefundStatus(refundId, status, transactionReference)
    
    // NEW: Financial Declaration Tracking
    async getAnnualRevenueTotal(year)
    async getMonthlyRevenue(year, month)
    async checkDeclarationThresholds() // Returns warnings for ORP/AVS thresholds
    async exportDeclarationData(format) // For ORP/AVS declarations
    async saveORPNotes(month, notes) // Track ORP conversations
}
```

## Translations Keys
- `revenue_reports`: "Revenue & Reports"
- `total_revenue`: "Total Revenue"
- `mrr`: "Monthly Recurring Revenue"
- `arr`: "Annual Recurring Revenue"
- `arpu`: "Average Revenue Per User"
- `ltv`: "Customer Lifetime Value"
- `churn_revenue`: "Churn Revenue"
- `revenue_over_time`: "Revenue Over Time"
- `revenue_by_product`: "Revenue by Product"
- `transactions`: "Transactions"
- `failed_payments`: "Failed Payments"
- `refunds`: "Refunds"
- `export_report`: "Export Report"
- `download_tax_report`: "Download Tax Report"
- `process_refund`: "Process Refund"
- `retry_payment`: "Retry Payment"
- `payment_method`: "Payment Method"
- `failure_reason`: "Failure Reason"
- `refund_amount`: "Refund Amount"
- `refund_reason`: "Refund Reason"

## Styling Requirements
- Charts with clear legends
- Color-coded metrics (green = good, red = attention)
- Responsive tables
- Export button prominent
- Print-friendly report layouts
- Currency formatting

## Dependencies
- Stripe SDK
- Chart library (Chart.js or D3.js)
- PDF generation library (jsPDF)
- CSV export library
- Supabase client
- Translation system
- Admin layout component

## Security Considerations
- Encrypt sensitive financial data
- Restrict access to financial reports
- Log all refund operations
- Require admin confirmation for refunds
- Secure Stripe API calls
- Mask full payment details

## Performance Considerations
- Cache revenue metrics (refresh every 5 minutes)
- Paginate transaction lists
- Optimize date range queries
- Index payment tables properly
- Lazy load charts

## Testing Checklist
- [ ] Revenue metrics calculate correctly
- [ ] Charts display properly
- [ ] Transactions table loads
- [ ] Failed payments show correctly
- [ ] Refund process works
- [ ] Retry payment works
- [ ] Export reports work (all formats)
- [ ] Tax report generates correctly
- [ ] Date range filters work
- [ ] Currency conversion works (if applicable)
- [ ] Mobile responsive
- [ ] Print layouts work

## Implementation Priority
**Phase 2** - Essential for financial management

## Future Enhancements
- Real-time revenue dashboard
- Predictive revenue analytics
- Automated dunning management
- Multi-currency support (CHF/EUR already supported)
- Tax automation (Stripe Tax)
- Integration with accounting software (QuickBooks, Xero, BEXIO)
- Revenue forecasting
- Cohort revenue analysis
- Subscription health score
- **PostFinance API Integration** (Phase 2 - Automated payment checking)
- **Automated QR-bill generation** (Phase 2 - Via PostFinance API)
- **Automated payment matching** (Phase 2 - Via API/webhooks)


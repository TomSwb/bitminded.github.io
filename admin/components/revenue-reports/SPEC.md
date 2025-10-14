# Revenue Reports Component Specification

## Overview
Financial reporting and analytics for tracking revenue, payments, and business metrics.

## Responsibilities
- Display revenue metrics and KPIs
- Generate financial reports
- Track payment history
- Monitor failed payments
- Calculate customer lifetime value
- Export financial data
- Tax and compliance reporting

## UI Components

### Header Section
- Title: "Revenue & Reports"
- Date range selector (predefined + custom)
- Currency toggle (CHF/USD/EUR)
- **Export Report** button
- **Download Tax Report** button

### Key Metrics Dashboard

**Metric Cards**:
1. **Total Revenue**
   - All-time revenue
   - Growth % vs previous period

2. **MRR** (Monthly Recurring Revenue)
   - Current MRR
   - Trend indicator
   - Projected next month

3. **ARR** (Annual Recurring Revenue)
   - Current ARR
   - Growth rate

4. **ARPU** (Average Revenue Per User)
   - Per month
   - Per year

5. **Customer Lifetime Value (LTV)**
   - Average LTV
   - By product

6. **Churn Revenue**
   - Lost MRR this month
   - Churn rate

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
   - Other payment methods

### Transactions Table

**Columns**:
1. **Date/Time**
2. **User** (username + email)
3. **Product**
4. **Amount**
5. **Payment Method**
6. **Status** (Paid, Failed, Refunded)
7. **Invoice** (link to Stripe)
8. **Actions** (Refund, Details)

**Filters**:
- Date range
- Status (all/paid/failed/refunded)
- Product
- Amount range
- Payment method

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
- Refund amount
- Reason
- Processed by (admin)
- Status

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
- QuickBooks format
- Accounting software integration

**Data Included**:
- All transactions
- Revenue metrics
- Customer data
- Tax information
- Refund details

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
    // 3. Process refund via Stripe
    // 4. Update local database
    // 5. Update entitlements if needed
    // 6. Log refund action
    // 7. Send refund email to user
    // 8. Update revenue metrics
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
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'chf',
    status TEXT NOT NULL, -- paid, failed, refunded, pending
    payment_method_type TEXT, -- card, bank, etc.
    payment_method_last4 TEXT,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    refunded_amount DECIMAL DEFAULT 0,
    refund_reason TEXT,
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
- Multi-currency support
- Tax automation (Stripe Tax)
- Integration with accounting software (QuickBooks, Xero)
- Revenue forecasting
- Cohort revenue analysis
- Subscription health score


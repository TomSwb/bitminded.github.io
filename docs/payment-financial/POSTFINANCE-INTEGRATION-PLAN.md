# PostFinance Integration Plan

> **Status**: Phase 1 - Manual Workflow (Current) | Phase 2 - Automated (Future)  
> **Last Updated**: January 2025  
> **Context**: One-person business transitioning from private to business account

---

## 📋 Overview

This document outlines the PostFinance integration strategy for handling bank transfer payments, QR-bill generation, and revenue tracking. The system will initially use manual workflows and transition to automated API integration once a PostFinance business account is available.

### Payment Method Logic (Booking-Level Decision)

**Important**: Payment method is determined at **booking/purchase time**, not at service definition time.

- **Service-level `payment_method`**: Default/suggestion for UI display
- **Booking-level `payment_method`**: Final decision based on service format selected (stored in `service_purchases` table)

**Payment Method Determination Logic**:
```javascript
// When creating a booking/service purchase:
if (service_format === 'in_person') {
  payment_method = 'bank_transfer';  // Always bank transfer for in-person
} else if (service_format === 'remote') {
  payment_method = 'stripe';  // Always Stripe for remote
} else {
  // Format not specified - fallback to service default
  payment_method = service.payment_method || 'stripe';
}
```

**Database Structure**:
- **`services.payment_method`**: Default/suggestion (e.g., "Bank Transfer" badge shown on service card)
- **`service_purchases.service_format`**: 'in_person' | 'remote' | NULL
- **`service_purchases.payment_method`**: 'bank_transfer' | 'stripe' (determined at booking time)
- **`invoices.service_purchase_id`**: Links invoice to booking (for bank transfer bookings)

**Example Scenarios**:
1. **Tech Support Service** (can be both in-person and remote):
   - Customer selects "In-person" → `service_format = 'in_person'`, `payment_method = 'bank_transfer'` → QR-bill invoice
   - Customer selects "Remote" → `service_format = 'remote'`, `payment_method = 'stripe'` → Stripe checkout

2. **Commissioning Service** (always in-person):
   - Service has `payment_method = 'bank_transfer'` (default)
   - Booking automatically gets `service_format = 'in_person'`, `payment_method = 'bank_transfer'`

3. **Catalog Access** (always remote/digital):
   - Service has `payment_method = 'stripe'` (default)
   - Booking automatically gets `payment_method = 'stripe'`

**Implementation Notes**:
- Service booking form should allow format selection if service supports both
- UI should show payment method badge based on service format selection
- Invoice generation (for bank transfers) links to `service_purchases` via `service_purchase_id`

### Current Account Status (Pre-Revenue Phase)
- **Account Type**: Private PostFinance account
- **QR-Bill Generation**: Manual via PostFinance e-banking dashboard
- **Payment Tracking**: Manual review and entry
- **API Access**: Not needed yet (can open business account for CHF 5/month when revenue starts)
- **All Payments**: Go to personal accounts initially
  - Stripe payments → Personal Stripe account → Personal bank account
  - PostFinance payments → Personal PostFinance account
- **Business Account**: Available for CHF 5/month without commerce registration, but deferred until revenue starts

### Future Account Status (When Revenue Starts)
- **Account Type**: PostFinance business account (CHF 5/month, available without commerce registration)
- **Account Name**: Personal name initially (can transfer to company name later when registered)
- **QR-Bill Generation**: Manual (Phase 1) → Automated via API (Phase 2, after account opened)
- **Payment Tracking**: Manual (Phase 1) → Automated via API/webhooks (Phase 2)
- **API Access**: Available immediately with business account (can integrate later)

---

## 🎯 Integration Goals

1. **Unified Revenue Tracking**: All payments (Stripe + Bank Transfers) in admin panel Revenue Reports component
2. **Manual Workflow First**: Build manual entry system that works immediately
3. **Automated Workflow Later**: Plan for API integration when business account available
4. **Seamless Transition**: Manual system designed to transition smoothly to automated

---

## 🔄 Phase 1: Manual Workflow (Current Implementation)

### Workflow Overview

#### 1. Invoice Generation (For Commissioning/In-Person Services)

**Process**:
1. Admin creates invoice in admin panel
2. System generates invoice PDF with:
   - Invoice number (unique identifier)
   - QR-code placeholder (to be replaced with PostFinance QR-bill)
   - Customer details
   - Service/product details
   - Amount and payment terms
   - Reference field with invoice number

**Invoice Number Format**:
- Format: `INV-YYYYMMDD-XXX` (e.g., `INV-20250115-001`)
- Must be unique and sequential
- Used in PostFinance reference field for payment matching

#### 2. QR-Bill Generation (Manual)

**Process**:
1. Admin logs into PostFinance e-banking dashboard
2. Navigate to QR-bill generation section
3. Enter invoice details:
   - Amount
   - Invoice number (in reference field)
   - Customer IBAN (if available)
   - Payment message/description
4. Generate and download QR-code
5. Admin uploads QR-code to invoice in admin panel
6. System updates invoice PDF with PostFinance QR-code
7. Invoice sent to customer via email

**Notes**:
- QR-bill generation is manual for now
- QR-code replaces placeholder in invoice PDF
- Document time required per invoice (to plan automation ROI)

#### 3. Payment Tracking & Entry (Manual)

**Process**:
1. Admin checks PostFinance account daily/weekly for incoming transfers
2. Admin identifies payments via:
   - Reference field (contains invoice number)
   - Amount matching
   - Customer name (if visible)
3. Admin enters payment in admin panel:
   - Opens "Manual Payment Entry" form in Revenue Reports
   - Enters invoice number or selects from pending invoices
   - Confirms amount received
   - Enters payment date
   - Enters reference field from bank statement
   - Optionally adds admin notes
4. System automatically:
   - Matches invoice number to pending invoice
   - Marks invoice as "paid"
   - Records payment in `payments` table
   - Updates revenue metrics in Revenue Reports
   - Sends payment confirmation email to customer

#### 4. Reconciliation Dashboard

**UI Components**:
- **Pending Invoices Table**: All invoices awaiting bank transfer payment
  - Invoice number
  - Customer name/email
  - Amount
  - Due date
  - Days overdue (if applicable)
  - Status: pending, overdue, partially paid

- **Unmatched Payments**: Payments received but not yet matched to invoices
  - Amount received
  - Date received
  - Reference field
  - Match manually or mark as unmatched

- **Payment Entry Form**: Manual entry interface
  - Invoice lookup/search
  - Amount input
  - Payment date picker
  - Reference field input
  - Verification checkboxes
  - Admin notes field

#### 5. Refund Processing Workflow

**Manual Bank Transfer Refund Process**:

**Step 1: Admin Initiates Refund in Admin Panel**
- Navigate to Revenue Reports → Transactions
- Find payment to refund (filter by invoice number or customer)
- Click "Refund" action
- Enter refund amount (full or partial)
- Enter refund reason (required)
- Confirm refund action

**Step 2: System Records Refund**
- Creates refund record linked to original payment
- Updates payment status to "refunded" (or "partially_refunded")
- Updates revenue metrics (negative adjustment)
- Sends refund confirmation email to customer

**Step 3: Admin Initiates Bank Transfer Refund**
- Log into PostFinance e-banking
- Navigate to "Payments" → "New Payment" or "International Transfer"
- Enter customer IBAN (from original invoice)
- Enter refund amount
- Enter reference: "REFUND [Invoice Number]" + original reference
- Select currency (CHF or EUR, match original payment if possible)
- Review and confirm transfer
- Record PostFinance transaction reference number in admin panel

**Step 4: System Updates**
- Mark refund as "processing" (1-3 business days)
- Track refund status (pending → completed)
- Update financial metrics
- Link refund to original payment in reports

**UI Components Needed**:
- **Refund Button**: In transaction row actions
- **Refund Form Modal**: Amount, reason, confirmation
- **Refund Status**: Show refund status in transaction list
- **Refund History**: Separate section showing all refunds
- **Refund Tracking**: Link to original payment, show PostFinance transaction reference

**Database Schema Addition**:
```sql
-- Add to payments table or create refunds table
ALTER TABLE payments ADD COLUMN refund_status TEXT DEFAULT NULL; -- pending, processing, completed, failed
ALTER TABLE payments ADD COLUMN refund_transaction_reference TEXT; -- PostFinance transaction reference
ALTER TABLE payments ADD COLUMN refund_initiated_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN refund_completed_at TIMESTAMP;
```

**Notes**:
- Processing time: 1-3 business days for bank transfers
- Fees: Standard bank transfer fees apply (varies by country/currency)
- International refunds: May take longer and incur additional fees
- Partial refunds: Supported, track remaining balance on invoice

---

## 🔮 Phase 2: Automated Workflow (Future - Business Account Required)

### PostFinance Business Account Requirements (To Research)

**Research Needed**:
- [ ] Revenue/transaction threshold for business account eligibility
- [ ] Required business registration status:
  - AHV registration status?
  - Business license requirements?
  - VAT registration status?
  - Sole proprietorship vs company structure?
- [ ] API access availability and documentation
- [ ] Costs/fees for business account vs private account
- [ ] QR-bill API capabilities:
  - Can we generate QR-bills programmatically?
  - What data is required?
  - Rate limits?
- [ ] Payment notification options:
  - Webhooks available?
  - Push notifications?
  - API polling required?
- [ ] Transaction export API:
  - Export format (CSV, XML, JSON)?
  - Available fields?
  - Historical data access?

### Automated Workflow Design

#### 1. Automated Invoice Generation with QR-Bill

**Process**:
1. Admin creates invoice in admin panel (or triggered automatically)
2. System calls PostFinance API to generate QR-bill:
   ```javascript
   // Edge Function: generate-postfinance-qrbill
   const qrBill = await postfinanceAPI.generateQRBill({
     amount: invoice.amount,
     currency: 'CHF',
     reference: invoice.number,
     creditor: {
       name: 'BitMinded',
       iban: process.env.POSTFINANCE_IBAN
     },
     debtor: {
       name: invoice.customer_name,
       iban: invoice.customer_iban // Optional
     }
   });
   ```
3. QR-code automatically embedded in invoice PDF
4. Invoice automatically sent via email
5. Invoice status: "sent" → "pending_payment"

#### 2. Automated Payment Tracking

**Option A: Webhooks (If Available)**
- PostFinance sends webhook on payment received
- Edge Function processes webhook
- Payment automatically matched to invoice
- Revenue updated in real-time

**Option B: Cron Job Polling (If No Webhooks)**
- Cron job runs daily (configurable frequency)
- Checks PostFinance API for new transactions
- Matches payments to invoices via reference field
- Records payments automatically
- Sends notification if unmatched payments found

**Implementation**:
```javascript
// Edge Function: check-postfinance-payments
// Called by Supabase cron job daily

async function checkPostFinancePayments() {
  const transactions = await postfinanceAPI.getTransactions({
    dateFrom: yesterday,
    dateTo: today
  });
  
  for (const transaction of transactions) {
    // Extract invoice number from reference field
    const invoiceNumber = parseReferenceField(transaction.reference);
    
    if (invoiceNumber) {
      const invoice = await findInvoiceByNumber(invoiceNumber);
      
      if (invoice && invoice.status === 'pending_payment') {
        await recordPayment({
          invoice_id: invoice.id,
          amount: transaction.amount,
          payment_method: 'bank_transfer',
          postfinance_reference: transaction.reference,
          received_at: transaction.date,
          verified_at: new Date(),
          verified_by: 'system' // Automated
        });
        
        await markInvoiceAsPaid(invoice.id);
        await updateRevenueMetrics();
      }
    } else {
      // Unmatched payment - notify admin
      await createUnmatchedPaymentAlert(transaction);
    }
  }
}
```

#### 3. Automated Reconciliation

- Payments automatically matched to invoices
- Unmatched payments flagged for admin review
- Revenue metrics updated automatically
- All in unified Revenue Reports dashboard

---

## 🗄️ Database Schema Requirements

### Payments Table Extension

The existing `payments` table (from Revenue Reports spec) needs extension for bank transfers:

```sql
-- Extend payments table for bank transfers
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postfinance_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_transfer_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bank_transfer_verified_by UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS payment_method_details JSONB DEFAULT '{}';

-- Index for payment matching
CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_postfinance_reference ON payments(postfinance_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
```

### Invoices Table (New)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL, -- Format: INV-YYYYMMDD-XXX
    user_id UUID REFERENCES user_profiles(id),
    service_id UUID REFERENCES services(id),
    product_id UUID REFERENCES products(id),
    
    -- Invoice details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CHF',
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Customer details
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_iban VARCHAR(34), -- Optional
    
    -- Invoice status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, pending_payment, paid, overdue, cancelled
    payment_method VARCHAR(50), -- 'stripe', 'bank_transfer', 'postfinance_qr'
    
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE,
    sent_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    -- QR-bill
    qr_bill_generated BOOLEAN DEFAULT false,
    qr_bill_url VARCHAR(500), -- URL to QR-code image
    qr_bill_reference VARCHAR(100), -- PostFinance reference
    
    -- PostFinance API (Phase 2)
    postfinance_qr_bill_id VARCHAR(255), -- If generated via API
    
    -- Admin notes
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
```

### Unmatched Payments Table (New)

For tracking payments that can't be automatically matched:

```sql
CREATE TABLE unmatched_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CHF',
    received_date DATE NOT NULL,
    postfinance_reference VARCHAR(100),
    sender_name VARCHAR(255),
    sender_iban VARCHAR(34),
    status VARCHAR(50) DEFAULT 'unmatched', -- unmatched, matched, ignored
    
    -- Manual matching
    matched_invoice_id UUID REFERENCES invoices(id),
    matched_by UUID REFERENCES user_profiles(id),
    matched_at TIMESTAMP,
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🖥️ Admin Panel UI Components

### Revenue Reports Component Extensions

#### 1. Manual Payment Entry Form

**Location**: Revenue Reports → "Manual Payments" tab

**Form Fields**:
- Invoice Number (autocomplete/lookup)
- Amount Received (auto-filled from invoice if found)
- Payment Date (date picker, default: today)
- Reference Field (from bank statement)
- Currency (default: CHF)
- Payment Method (dropdown: Bank Transfer, PostFinance QR)
- Verification Status (checkbox: "Verified against bank statement")
- Admin Notes (textarea)

**Actions**:
- "Save Payment" (creates payment record)
- "Save & Send Confirmation" (also sends email to customer)
- "Cancel"

#### 2. Pending Invoices Table

**Columns**:
- Invoice Number
- Customer Name
- Customer Email
- Service/Product
- Amount
- Due Date
- Days Overdue
- Status Badge
- Actions: View Invoice, Send Reminder, Mark as Paid

**Filters**:
- Status: All, Pending, Overdue
- Date Range
- Customer
- Amount Range

#### 3. Unmatched Payments Table

**Columns**:
- Date Received
- Amount
- Reference Field
- Sender Name
- Status
- Actions: Match to Invoice, Ignore, View Details

**Matching Interface**:
- Search invoices by number, customer, or amount
- Select invoice to match
- Confirm match
- System validates amount matches (with tolerance)

---

## 💰 Financial Declaration & Compliance Strategy

### Current Setup (Pre-Business Account)
- **Stripe Payments**: Go to personal Stripe account → personal bank account
- **PostFinance Payments**: Go to personal PostFinance account
- **All Revenue**: Tracked in admin panel, but received personally
- **Business Account**: Deferred until revenue justifies it (not before revenue starts)
- **Risk Management**: Opening business account while on chômage could trigger scrutiny

### Declaration Thresholds

#### ORP (Unemployment) - Monthly Check
- **Action**: Check with ORP month-by-month before declaring any revenue
- **Strategy**: Small amounts (e.g., 2 subs = CHF 10/month) = "pocket money" (likely not declared)
- **Threshold**: Unclear - check with ORP monthly before declaring
- **Documentation**: Track monthly revenue and ORP conversations in admin panel notes

#### AVS (Social Security) Declaration
- **Action**: Must declare if revenue is "significant"
- **Estimated Threshold**: CHF 2,300/year (Swiss self-employment threshold)
- **Calculation Examples**:
  - CHF 5/month subscription: Need ~38 subscribers/year to hit threshold
  - CHF 8/month subscription: Need ~24 subscribers/year to hit threshold
  - Mixed revenue: Track running total in admin panel
- **Strategy**: Monitor annual revenue total; declare when approaching threshold

#### Commerce Office Registration
- **Requirement**: Only needed when business activity is "significant" or ongoing
- **Timing**: Can wait until revenue is consistent and substantial
- **PostFinance Business Account**: Available for CHF 5/month **without** commerce registration
- **Note**: Account initially in personal name; can transfer to company name later

### Revenue Tracking for Declarations

**Admin Panel Features Needed** (Revenue Reports Component):
- **Monthly Revenue Total**: Display current month's revenue
- **Running Annual Total**: Track cumulative revenue for current year (to monitor AVS threshold ~CHF 2,300/year)
- **Threshold Warnings**: Visual indicator when approaching declaration thresholds
  - Warning at CHF 1,500/year (approaching AVS threshold)
  - Alert at CHF 2,300/year (must declare to AVS)
- **ORP Notes Field**: Track monthly ORP conversations and decisions
- **Declaration Export**: Export revenue data for ORP/AVS declarations
- **Revenue Breakdown**: By payment method (Stripe vs PostFinance)
- **Monthly Comparison**: Compare revenue month-over-month

**Revenue Threshold Examples**:
- **Safe Zone** (< CHF 2,300/year):
  - 2 subscriptions @ CHF 5/month = CHF 120/year ✓
  - 10 subscriptions @ CHF 5/month = CHF 600/year ✓
  - 20 subscriptions @ CHF 5/month = CHF 1,200/year ✓
- **Approaching Threshold** (CHF 1,500-2,300/year):
  - 30 subscriptions @ CHF 5/month = CHF 1,800/year ⚠️
- **Declaration Required** (> CHF 2,300/year):
  - 38+ subscriptions @ CHF 5/month = CHF 2,280+/year ⚠️ Declare to AVS
  - Mixed revenue: 20 subs (CHF 1,200) + 1 commission (CHF 350) = CHF 1,550/year (still safe)
  - 50 subscriptions @ CHF 5/month = CHF 3,000/year → Declare to AVS

### Business Account Opening Strategy

**Timing Recommendation**:
1. **Phase 0 (Months 1-3)**: Build website, no business account (protects chômage status)
2. **Phase 1 (First Revenue)**: Open business account when first invoice/customer ready
   - CHF 5/month cost
   - Account in personal name initially
   - Start with manual workflow
3. **Phase 2 (Month 4-5)**: Build API automation (enhancement, not critical)
   - After manual system proven
   - After revenue flow established
   - Optional optimization

**Decision Criteria**:
- Open business account when: First revenue approaching OR steady revenue stream starts
- Do NOT open before: No revenue yet (protects chômage status)
- Risk: Opening too early could trigger ORP questions about business activity

---

## 🔍 Open Questions & Research Items

### Critical Questions

1. **International Payment Support** ✅ **RESOLVED**
   - ✅ **Answer**: YES - International customers CAN pay PostFinance QR-bills
   - **Methods**:
     - **Automatic**: If QR-bill includes IBAN + SCOR (Structured Creditor Reference), foreign banks can process automatically
     - **Manual**: If only IBAN, customer may need to manually initiate international payment in their banking
   - **Impact**: Commissioning services can use PostFinance QR-bills for international customers
   - **Recommendation**: Include IBAN + SCOR in all QR-bills for best international compatibility
   - **Status**: Resolved - Use PostFinance QR-bills for commissioning services

2. **Business Account Eligibility** ✅ **RESOLVED**
   - ✅ Available for CHF 5/month without commerce registration
   - ✅ Account initially in personal name (can transfer to company name later)
   - ✅ API access available immediately with business account
   - ⚠️ **Timing**: Open when revenue starts (not before, to protect chômage status)
   - **Status**: Understood - deferred until revenue begins

### High Priority Questions

3. **Transaction Export Format** ✅ **RESOLVED**
   - ✅ **Formats Available**:
     - **camt.053**: ISO 20022 standard format (for accounting software like BEXIO)
     - **CSV**: Simple format for Excel/Google Sheets (max 100 transactions per export)
   - **Location**: PostFinance e-banking → "Documents" → "Extraits de compte"
   - **Note**: For >100 transactions, export multiple files by date range
   - **Fields**: To be documented when testing export (includes date, amount, reference, sender info)
   - **Status**: Format known - field details to be documented when testing

4. **Payment Frequency** ✅ **DECIDED**
   - ✅ Phase 1 (Manual): Weekly manual check and entry
   - ✅ Phase 2 (Automated): Daily cron job when API integration built
   - **Rationale**: Weekly manageable for manual workflow; daily optimal for automation
   - **Status**: Decided

### Medium Priority Questions

5. **QR-Bill Reference Field Format**
   - ❓ Character limitations?
   - ❓ Special characters allowed?
   - ❓ Standard format?
   - **Action**: Test with invoice numbers
   - **Status**: To be tested

6. **Currency Support** ✅ **RESOLVED**
   - ✅ **Supported Currencies**: CHF and EUR for QR-bills
   - **International Payments**: 
     - CHF: Primary currency for all QR-bills
     - EUR: Available for international customers (with currency conversion by banks)
   - **Currency Code**: Must be printed on QR-bill (CHF or EUR)
   - **Recommendation**: Use CHF primarily, offer EUR as secondary option for international customers
   - **Status**: Resolved

7. **Refund Workflow** ✅ **RESOLVED**
   - ✅ **Process**: Manual bank transfer refund via PostFinance e-banking
   - **Steps**:
     1. Admin initiates refund in admin panel
     2. Record refund amount and reason in system
     3. Initiate bank transfer to customer IBAN (from original invoice)
     4. Reference: "REFUND [Invoice Number]" + original reference
     5. Processing: 1-3 business days, standard bank transfer fees apply
     6. Update payment status to "refunded"
     7. Send refund confirmation email to customer
   - **Documentation**: See "Refund Processing" section below
   - **Status**: Process documented

8. **API Documentation** ⏳ **FUTURE RESEARCH**
   - ❓ Where is PostFinance API documentation?
   - ❓ What endpoints are available?
   - ❓ QR-bill generation programmatically?
   - ❓ Payment notifications (webhooks vs polling)?
   - **Action**: Research when business account opened
   - **Status**: Future research (Phase 2)

---

## 📅 Implementation Timeline

### Phase 1: Manual Workflow (Current - Immediate)

**Week 1: Database & Basic UI**
- [ ] Create `invoices` table schema
- [ ] Create `unmatched_payments` table schema
- [ ] Extend `payments` table for bank transfers
- [ ] Create invoice number generation function

**Week 2: Invoice Generation**
- [ ] Invoice PDF generation component
- [ ] QR-code placeholder in invoice
- [ ] Invoice email template
- [ ] Invoice listing in admin panel

**Week 3: Manual Payment Entry**
- [ ] Manual payment entry form
- [ ] Pending invoices table
- [ ] Payment matching logic
- [ ] Revenue metrics update

**Week 4: Testing & Documentation**
- [ ] Test manual workflow end-to-end
- [ ] Document QR-bill generation process
- [ ] Document payment entry workflow
- [ ] User guide for admin panel

### Phase 2: Automated Workflow (Future - After Business Account Opened)

**Timing**: After business account opened and revenue established (Month 4-5, Week 9+ in admin panel timeline)

**Research Phase** (Can be done in parallel with Phase 1):
- [x] PostFinance business account requirements (CHF 5/month, no commerce registration needed)
- [ ] Obtain PostFinance API documentation for QR-bill generation
- [ ] Test API access and capabilities
- [ ] Document webhook/polling options for payment notifications

**Development Phase** (After revenue starts):
- [ ] PostFinance API integration (Edge Function)
- [ ] Automated QR-bill generation
- [ ] Automated payment checking (cron job - daily)
- [ ] Automated payment matching
- [ ] Migration from manual to automated workflow
- **Note**: This is an enhancement, not critical for launch

---

## 🔗 Related Documentation

### Planning & Implementation
- [Priority List - Active Items](../planning/PRIORITY-LIST-TO-DO.md) - See Phase 2 (#15.8) and Phase 6 (#35, #36, #37) for PostFinance-related tasks
- [Priority List - Completed Items](../planning/PRIORITY-LIST-COMPLETED-ITEMS.md#156-postfinance-account-management-learning--researched--planned) - Section 15.6 (PostFinance Account Management Learning)

### Related Payment & Financial Docs
- [Point-of-Sale Readiness Plan](./POINT-OF-SALE-READINESS.md) - Invoice/contract workflows, QR-bill generation, POS system planning
- [Family Plans Analysis](./FAMILY-PLANS-ANALYSIS.md) - Family plan payment integration (may use PostFinance for in-person family services)

### Technical Documentation
- [Revenue Reports Component Spec](../../admin/components/revenue-reports/SPEC.md)
- [Admin Panel Master Plan](../../admin/ADMIN-PANEL-MASTER-PLAN.md)
- [Payment Strategy](../../services/PRICING-STRATEGY.md)

---

## 📝 Notes

- **Personal Account Phase**: All payments (Stripe + PostFinance) initially go to personal accounts
- **Business Account Timing**: Open when revenue starts (not before, to protect chômage status)
- **Manual Workflow**: Acceptable interim solution, works with personal account
- **System Design**: Smooth transition from manual to automated when ready
- **Revenue Tracking**: All revenue tracked in unified admin panel regardless of payment method
- **Declaration Strategy**: Track monthly/annual totals to monitor ORP/AVS thresholds
- **International Payments**: Research critical for commissioning services strategy
- **API Integration**: Future enhancement (Month 4-5), not blocker for launch
- **Risk Management**: Defer business account until revenue justifies it

---

**Last Updated**: January 2025  
**Next Review**: When first revenue approaches (to decide business account opening timing)

---

## 📅 Strategic Timeline & Chômage Considerations

### Phase 0: Pre-Revenue (Months 1-3 - Building Website)
**Status**: Safe for chômage status
- Build website with manual payment tracking system
- All payments will go to personal accounts initially
- Track revenue in admin panel (even with zero revenue initially)
- **No business account opened yet** (protects chômage status)
- **No declarations needed** (no revenue yet)

### Phase 1: Early Revenue (First Revenue - CHF 2,300/year)
**Status**: Monitor carefully with ORP
- Stripe payments → Personal Stripe account → Personal bank account
- PostFinance payments → Personal PostFinance account (manual QR-bills)
- Check with ORP monthly (small amounts = "pocket money", likely not declared)
- Track running total for AVS threshold monitoring
- Open PostFinance business account when first invoice/customer ready (CHF 5/month)
- **Risk**: Opening business account could trigger ORP questions - time carefully

### Phase 2: Approaching AVS Threshold (CHF 1,500-2,300/year)
**Status**: Prepare for AVS declaration
- Continue tracking in admin panel
- Monitor annual revenue total approaching CHF 2,300
- Prepare for AVS declaration when threshold reached
- Business account already open (if revenue justifies it)
- Continue checking with ORP monthly

### Phase 3: Post-AVS Declaration (CHF 2,300+/year)
**Status**: Business activity declared
- Declare to AVS (self-employment)
- PostFinance business account active
- Consider commerce office registration if revenue is substantial/ongoing
- API automation can be built (enhancement, Month 4-5)


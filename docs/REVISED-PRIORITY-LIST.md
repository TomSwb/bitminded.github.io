# 🎯 Revised Priority List - Based on Actual Implementation Status

**Last Updated**: November 21, 2025 (Revised with codebase verification)  
**Based on**: Actual codebase investigation (not just READMEs)

---

## 📊 **Implementation Status Summary**

### ✅ **What's Actually Done**
- ✅ Core authentication & account management (100%)
- ✅ About/Team page (100% - complete with bios)
- ✅ Services page structure (95% - booking pending)
- ✅ Catalog page (100%)
- ✅ Notification center (100%)
- ✅ Account: Support Tickets component (100% - users can view/manage their tickets)
- ✅ Admin: User Management, Access Control, Support Desk, Service Management, Product Management (100%)
- ✅ Product Wizard Steps 1-7 (structure exists - Steps 1-3 functional, Steps 4-7 need verification)
- ✅ Partial Stripe integration (product creation edge functions exist)

### ❌ **What's Actually Missing**
- ❌ Account subscription management (directory doesn't exist)
- ❌ User subscription cancellation & management
- ❌ Payment method management (user account)
- ❌ Tech support booking flow (only README)
- ❌ Stripe webhook handler
- ❌ Stripe Checkout integration (no purchase flow)
- ❌ Commissioning workflow (form, database, edge functions, admin manager)
- ❌ Catalog access purchase flow (buttons show "Coming Soon")
- ❌ Receipt system (Stripe purchases)
- ❌ Invoice system (bank transfers, payment plans)
- ❌ Contract creation and signing system
- ❌ Refund processing system
- ❌ Subscription renewal reminders
- ❌ User onboarding flow
- ❌ Email template management UI
- ❌ Admin Dashboard, Analytics, Communication Center, Subscription Management, Revenue Reports (specs only)
- ❌ Story page and review system UI

### ✅ **Partially Implemented / Needs Enhancement**
- ⚠️ FAQ system (exists but may need expansion)
- ⚠️ GDPR data deletion (account deletion exists, workflow incomplete)
- ✅ Multi-currency support (database implemented, verify UI)

### ✅ **Recently Completed**
- ✅ Production readiness fixes (hardcoded keys confirmed safe, localhost fallback fixed via Edge Function)
- ✅ SEO files (robots.txt, sitemap.xml created)
- ✅ Production security cleanup (console logs, security TODOs)

---

## 🚨 **Phase 0: Production Readiness (CRITICAL - Do First)** ✅ **COMPLETE**

### ~~1. Externalize Supabase Keys ⚠️ **CRITICAL**~~ ✅ **FIXED - CONFIRMED NOT AN ISSUE**
~~**Status**: Hardcoded in `js/supabase-config.js` and `components/captcha/captcha.js`~~  
~~**Priority**: Must fix before production~~  
**Files**:
- `js/supabase-config.js` (lines 9-12) - ~~Has hardcoded URL and anon key~~ ✅ **Hardcoded anon key is expected and safe (public by design)**
- `components/captcha/captcha.js` (line 434) - ~~Duplicate hardcoded URL~~ ✅ **FIXED - Now uses centralized config**

**Action**: ~~Move to environment variables or secure config system~~ ✅ **NOT NEEDED**
- **Anon keys are meant to be public** (by Supabase design)
- **Security is enforced by RLS policies** (verified secure)
- **Service role keys are properly secured** (Edge Functions only)
- **For static sites on GitHub Pages, env vars aren't available anyway**

### ~~2. Fix Localhost Fallback ⚠️ **CRITICAL**~~ ✅ **FIXED**
~~**Status**: `127.0.0.1` fallback in signup form~~  
~~**Priority**: Must fix before production~~  
**File**: `auth/components/signup-form/signup-form.js` ✅ **FIXED**

**Action**: ~~Implement proper error handling for IP detection~~ ✅ **COMPLETED**
- **Created Edge Function** `record-signup-consent` - Captures IP server-side from request headers
- **Removed client-side IP detection** - No more unreliable `api.ipify.org` calls
- **Removed `127.0.0.1` fallback** - Edge Function returns `null` if IP can't be determined (database accepts NULL)
- **More reliable** - IP captured from `x-forwarded-for`, `cf-connecting-ip`, or `x-real-ip` headers
- **Consistent with login flow** - Uses same pattern as `log-login` Edge Function
- **Added rate limiting** - 20 consents/min, 200/hour per user

### ~~3. Production Security Cleanup 🟡 **MEDIUM**~~ ✅ **FIXED**
~~**Status**: Test data in SQL, console logs, security TODOs~~  
~~**Priority**: Should fix before launch~~  
**Files**:
- `supabase/dev/utils/CHECK_TEST_DATA.sql` - ✅ **Created audit script, no test data found in database**
- Various JS files - ~~Console logging throughout~~ ✅ **FIXED - All 1,760 console statements replaced with environment-aware logger across 205 files**
- `account/components/security-management/security-management.js` - ~~6 TODO comments~~ ✅ **FIXED - All 3 TODOs implemented (loadLoginActivityStatus, updateLoginActivityStatus, showError)**

**Action**: ~~Remove test data, implement debug flag, complete/document TODOs~~ ✅ **COMPLETED**
- **Test data audit** - Created comprehensive SQL script, verified no test data exists in dev or prod
- **Console logging cleanup** - Implemented centralized logger utility (`js/logger.js`), all debug logs disabled in production
- **Security TODOs** - All login activity status and error display functionality implemented

### ~~4. SEO Fundamentals 🟡 **MEDIUM**~~ ✅ **FIXED**
~~**Status**: Homepage has meta tags, but missing files~~  
~~**Priority**: Important for discoverability~~  
**Missing**:
- ~~`robots.txt` (referenced in docs but doesn't exist)~~ ✅ **CREATED**
- ~~`sitemap.xml` (referenced in docs but doesn't exist)~~ ✅ **CREATED**

**Action**: ~~Create both files in root directory~~ ✅ **COMPLETED**
- **robots.txt** - Created with proper rules to block private areas (/auth/, /account/, /admin/, /maintenance/) and static assets
- **sitemap.xml** - Created with all 20 public pages including homepage, about, services, catalog, FAQ, support, and legal pages
- Both files properly reference bitminded.ch domain

---

## 📝 **Phase 1: Content & Independent Work (Can Do Anytime)** ✅ **COMPLETE**

### 5. About/Team Page ✅ **DONE**
**Status**: Complete with full bios and translations  
**Action**: None needed - already complete!

### 6. Services Page Polish ✅ **MOSTLY DONE**
**Status**: Structure complete, booking buttons show "Coming Soon"  
**Action**: Minor copy tweaks if needed, but functional

### 7. Catalog Touch-ups ✅ **DONE**
**Status**: Functional with filtering  
**Action**: Only minor tweaks if needed

---

## 🔧 **Phase 2: Tech Support Booking (Independent)**

### 8. Tech Support Booking Database Schema
**Status**: Only README exists (`services/tech-support/README.md`)  
**Priority**: Foundation for booking flow  
**Action**: Create Supabase tables: `tech_support_availability`, `tech_support_bookings`, `tech_support_booking_actions`

### 9. Tech Support Booking Email Templates
**Status**: Not started  
**Priority**: Can be done before backend  
**Action**: Create Proton-friendly email bodies, ICS templates, localization keys

### 10. Tech Support Booking Edge Functions
**Status**: Not started  
**Priority**: Depends on #8  
**Action**: Create `create-tech-support-booking`, `update-tech-support-booking`, `send-tech-support-email`

### 11. Tech Support Booking Public UI
**Status**: Buttons exist but disabled ("Coming Soon")  
**Priority**: Depends on #8, #9, #10  
**Action**: Create `services/components/tech-support-booking/` component, replace disabled buttons

### 12. Admin Tech Support Manager
**Status**: Not started  
**Priority**: Depends on #8, #10  
**Action**: Create `admin/components/tech-support-manager/` for CRUD on availability slots

### 12.5. Service Delivery Helper/Workflow System ⚠️ **NEW**
**Status**: **MISSING** - Critical for service quality assurance  
**Priority**: HIGH - Ensures complete and excellent service delivery  
**Action**: Create comprehensive service delivery helper system:
- **Service Delivery Checklists**: Per-service-type checklists (commissioning, tech support)
- **Service Templates**: Standardized templates for each service type
- **Quality Assurance Workflow**: Step-by-step verification process
- **Service Milestone Tracking**: Track progress through service delivery phases
- **Service Completion Verification**: Checklist to ensure nothing is missed
- **Post-Service Follow-up Automation**: Automated follow-up reminders
- **Customer Satisfaction Tracking**: Feedback collection system
- **Service Handoff Documentation**: Templates for service handoff
- **Admin UI**: `admin/components/service-delivery-helper/` component
- **Database Schema**: Tables for service delivery tracking, checklists, milestones
- **Integration**: Link to commissioning and tech support workflows

**Questions to Answer Before Implementation**:
- What are the specific phases/milestones for commissioning projects?
- What are the specific phases/milestones for tech support sessions?
- What quality checkpoints are needed for each service type?
- What templates/checklists already exist that should be digitized?
- How should service completion be verified and documented?
- What follow-up actions are needed after service completion?

---

## 💳 **Phase 3: Stripe Integration Foundation**

### 13. Stripe Account Setup and Configuration
**Status**: Edge functions exist (`create-stripe-product`, `delete-stripe-product`)  
**Priority**: Foundation for payments  
**Action**: Verify Stripe secrets in Supabase, test existing functions

### 14. Stripe Webhook Handler ⚠️ **CRITICAL**
**Status**: **MISSING** - No webhook handler exists  
**Priority**: Critical for subscription automation  
**Action**: Create `/functions/stripe-webhook` edge function to handle:
- `checkout.session.completed`
- `customer.subscription.created/updated/deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

### 15. Stripe Products/Prices Setup
**Status**: Product creation function exists  
**Priority**: Foundation for checkout  
**Action**: Verify product creation works, set up pricing tiers, link to database

### 15.5. Product Wizard Steps 4-7 Verification & Completion
**Status**: Steps 4-7 exist (structure present) but need verification  
**Priority**: Complete all wizard steps  
**Action**: 
- **Step 4 (Stripe)**: Verify handles all pricing types correctly (freemium, subscription, one-time), test with Stripe account, ensure integration with checkout flow
- **Step 5 (Cloudflare)**: Verify Cloudflare setup functionality, test subdomain configuration
- **Step 6 (Content & Media)**: Verify media upload and content management
- **Step 7 (Review & Summary)**: Verify review step and publish functionality
- Complete any missing validation or error handling across all steps

---

## 🛒 **Phase 4: Purchase & Checkout Flow (Before Account Subscriptions)**

### 16. Stripe Checkout Integration ⚠️ **MISSING**
**Status**: **MISSING** - No checkout flow exists  
**Priority**: Critical - needed for catalog access purchases  
**Action**: 
- Create edge function to create Stripe Checkout sessions
- Build checkout flow component
- Create success/cancel redirect pages
- Wire up to catalog access "Buy Now" buttons
- Handle different pricing types (one-time, subscription, freemium)

### 16.5. Purchase Confirmation & Entitlements ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Critical - needed after checkout  
**Action**:
- Create purchase confirmation emails (via Resend)
- Auto-grant entitlements on successful payment (via webhook)
- Update account subscription management to show purchases
- Handle subscription vs one-time purchase flows

### 16.6. Receipt System (Stripe Purchases) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Critical - needed for all Stripe purchases  
**Action**:
- Auto-generate receipts after Stripe payment (via webhook)
- Create receipt PDF template (simple, branded)
- Store receipts in Supabase storage
- Link receipts to `product_purchases` table
- Email receipts via Resend
- Display receipts in user account

**Questions to Answer Before Implementation**:
- What information should receipts include? (date, amount, product, payment method, transaction ID)
- Receipt design/branding requirements?
- Should receipts be downloadable PDFs or just viewable in account?
- Do we need multi-language receipts?

**Potential Issues**:
- PDF generation library choice (jsPDF, PDFKit, Puppeteer?)
- Storage costs for receipt PDFs (Supabase storage)
- Receipt template versioning if design changes

---

## 👤 **Phase 5: Account Subscriptions UI**

### 17. Account Subscription Management Component ⚠️ **MISSING**
**Status**: **Directory doesn't exist** (`account/components/subscription-management/`)  
**Priority**: User-facing subscription management  
**Action**: Create component to view owned products, renewal status, payment method placeholders

### 17.2. User Subscription Cancellation & Management ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - users need to manage their subscriptions  
**Action**:
- Cancel subscription (immediate or at period end)
- Upgrade/downgrade subscription plans
- View cancellation confirmation
- Reactivate cancelled subscriptions (if within grace period)
- Track cancellation reasons

**Questions to Answer Before Implementation**:
- Should cancellation be immediate or at period end by default?
- Grace period for reactivation? (7 days, 30 days?)
- Should we collect cancellation reasons?
- Prorated refunds for mid-cycle cancellations?

### 17.3. Payment Method Management (User Account) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - users need to manage payment methods  
**Action**:
- Add payment method (Stripe integration)
- Update payment method
- Set default payment method
- Remove payment method
- View payment method details (masked)
- Handle expired payment methods

**Questions to Answer Before Implementation**:
- Should users be able to remove their only payment method?
- How to handle expired cards? (automatic notification, manual update?)
- Should we support multiple payment methods per user?

### 17.4. Subscription Renewal Reminders ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - reduce failed renewals  
**Action**:
- Email reminders before renewal (7 days, 3 days, 1 day)
- Payment method expiration warnings
- Renewal failure notifications
- Grace period reminders
- Renewal success confirmations

**Questions to Answer Before Implementation**:
- How many reminder emails? (1, 2, 3?)
- Reminder schedule? (7 days, 3 days, 1 day before renewal?)
- Should reminders include payment method update link?

### 17.1. User Account: Receipts View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - user needs access to receipts  
**Action**:
- Create `account/components/receipts/` component
- List all receipts (Stripe purchases)
- Download receipt PDFs
- Filter by date, product, amount
- Show receipt details (date, amount, product, payment method, transaction ID)

---

## 📝 **Phase 5.5: Commissioning Workflow**

### 17.5. Commission Request Database Schema ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation for commissioning workflow  
**Action**: Create Supabase tables: `commission_requests`, `commission_proposals`, `commission_agreements`

### 17.6. Commission Request Form ⚠️ **MISSING**
**Status**: **MISSING** - Buttons show "Coming Soon"  
**Priority**: Public-facing commissioning  
**Action**: 
- Create `services/components/commission-request-form/` component
- Replace "Coming Soon" buttons on commissioning page
- Handle different commission types (simple app, standard app, complex app, feature commission, intake)

### 17.7. Commission Request Edge Functions ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.5  
**Action**: 
- Create `create-commission-request` edge function
- Create `update-commission-status` edge function
- Create `send-commission-email` edge function (via Resend)
- Handle commission request notifications

### 17.8. Admin Commission Manager ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.5, #17.7  
**Action**: 
- Create `admin/components/commission-manager/` component
- View/manage commission requests
- Commission request status workflow (new, in_progress, quoted, accepted, completed, cancelled)
- Commission proposal creation

### 17.9. Commission-to-Product Conversion ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on commissioning workflow  
**Action**: 
- Workflow to convert completed commissions into catalog products
- Link commissioned products to original commission request
- Track commissioner information in product record

---

## 📄 **Phase 5.6: Contract Creation & Signing System**

### 17.10. Contract System Research & Planning ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - must decide approach before implementation  
**Action**:
- Research e-signature options (email click-to-accept vs typed signature vs third-party service)
- Review Swiss legal requirements for e-signatures
- Decide on contract template format (Markdown, HTML, PDF)
- Choose PDF generation library
- Plan contract storage strategy (Supabase storage)

**Questions to Answer Before Implementation**:
- What e-signature method is legally sufficient in Switzerland? (email click-to-accept is valid)
- Do we need third-party e-signature service (DocuSign, Adobe Sign) or is simple email acceptance enough?
- What contract types are needed? (commissioning, service, license agreements)
- What information must be captured for signatures? (IP address, timestamp, email, device info?)
- How to handle contract template versioning?
- What's the retention period for signed contracts? (10 years per Swiss law)

**Potential Issues**:
- Legal validity of simple email acceptance vs formal e-signature
- Contract template versioning (what if template changes after contract sent?)
- Storage costs for contract PDFs (10-year retention)
- Multi-language contracts (if needed)
- Contract amendment workflow (if contracts need changes)

### 17.11. Contract Database Schema ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation for contracts  
**Action**: 
- Create `contracts` table (id, user_id, type, status, template_version, storage_path, created_at, signed_at, etc.)
- Create `contract_templates` table (id, name, type, content, version, is_active, created_at, etc.)
- Create `contract_signatures` table (id, contract_id, signer_email, signed_at, ip_address, user_agent, signature_method, etc.)
- Link contracts to commissions/invoices

### 17.12. Contract Template System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.11  
**Action**:
- Create contract template storage (Supabase storage or table)
- Support Markdown/HTML templates with variables (client name, service, rate, date, etc.)
- Template types: commissioning, service, license
- Admin UI to manage templates
- Version control for templates
- Template preview functionality

**Questions to Answer Before Implementation**:
- Template format preference? (Markdown → PDF, HTML → PDF, or direct PDF templates?)
- How to handle template variables? (simple string replacement, templating engine like Handlebars?)
- Should templates be stored in database or Supabase storage?
- How to handle template updates without breaking existing contracts?

### 17.13. Contract Generation & E-Signature ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.12  
**Action**:
- Generate contracts from templates (fill variables)
- Email contract to customer (via Resend)
- Click-to-accept signature flow (email link with unique token)
- Store signed contracts in Supabase storage
- Log signature events (IP, timestamp, email, user agent)
- Mark contracts as signed in database
- Send signed contract confirmation emails

**Questions to Answer Before Implementation**:
- Signature method: email click-to-accept, typed name, or both?
- How long should signature links be valid? (7 days, 30 days?)
- Should we require account login to sign, or allow email-only signing?
- What happens if contract is not signed? (reminder emails, expiration?)

### 17.14. User Account: Contracts View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - user needs access to contracts  
**Action**:
- Create `account/components/contracts/` component
- List all contracts (pending, signed, expired)
- View contract PDFs
- Sign pending contracts (if not signed via email)
- Download signed contracts
- Filter by type, status, date
- Show contract status and signature details

---

## 💰 **Phase 5.7: Invoice System (Bank Transfer & Payment Plans)**

### 17.15. PostFinance Account Management Learning ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - must understand capabilities before building invoice system  
**Action**:
- Learn PostFinance e-banking interface
- Understand QR-bill generation process
- Learn how to track incoming bank transfers
- Understand payment reference field usage
- Learn how to export transaction data
- Document manual payment matching workflow
- Research if PostFinance offers any API access (unlikely for private accounts)

**Questions to Answer**:
- How to generate QR-bills from PostFinance e-banking?
- Can we generate QR-bills programmatically or only manually?
- How to track which payments correspond to which invoices? (invoice number in reference field)
- What information is available in PostFinance transaction exports?
- How often should we check for new payments? (daily, weekly?)

**Potential Issues**:
- No API access for private accounts (manual matching required)
- QR-bill generation may be manual only
- Payment matching will require manual work
- Need to establish clear workflow for payment reconciliation

### 17.16. Payment Strategy Decision ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - must decide what uses Stripe vs bank transfer  
**Action**:
- Document decision matrix: Stripe vs Bank Transfer
- Define thresholds (e.g., < CHF 200 = Stripe, > CHF 500 = Bank Transfer)
- Document payment plan requirements
- Decide on currency handling (CHF only, or EUR/USD too?)
- Document refund policies for each payment method

**Decision Matrix**:
- **Stripe**: Catalog items (CHF 25-60), Subscriptions (CHF 18/month, CHF 180/year), Tech support (CHF 45-90), Any purchase < CHF 200
- **Bank Transfer**: Commissioning (CHF 600-6,000+), Build sprints (CHF 1,200-1,500), Payment plans, Enterprise contracts, Any purchase > CHF 500

**Questions to Answer**:
- What's the exact threshold for Stripe vs bank transfer? (CHF 200? CHF 500?)
- Should payment plans always use bank transfer?
- Do we accept EUR/USD or CHF only?
- How to handle refunds for bank transfers? (manual process)
- What about international customers? (Stripe only, or bank transfer too?)

### 17.17. Invoice Database Schema ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation for invoicing  
**Action**:
- Create `invoices` table (id, user_id, invoice_number, amount, currency, status, due_date, paid_at, payment_reference, storage_path, created_at, etc.)
- Create `invoice_items` table (id, invoice_id, description, quantity, unit_price, total_price, etc.)
- Create `payment_plans` table (id, invoice_id, installment_number, amount, due_date, paid_at, status, etc.)
- Sequential invoice numbering system (Swiss compliance requirement)
- Link invoices to contracts/commissions

**Questions to Answer Before Implementation**:
- Invoice numbering format? (INV-2025-001, or simpler?)
- How to ensure sequential numbering in distributed system? (database sequence, or manual tracking?)
- What invoice statuses are needed? (draft, sent, paid, overdue, cancelled, refunded?)
- Should invoices support partial payments?
- How to handle invoice amendments/corrections?

**Potential Issues**:
- Sequential numbering must be guaranteed (no gaps, no duplicates)
- Need to handle concurrent invoice creation
- Invoice number format must be Swiss-compliant
- Need to track invoice versions if amended

### 17.18. Invoice Generation (QR-Bill) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.17  
**Action**:
- Generate Swiss QR-bill format invoices
- Include IBAN, invoice number, amount, currency, reference number
- Create invoice PDF template (Swiss compliant)
- Store invoices in Supabase storage
- Email invoices to customers (via Resend)
- Link invoices to contracts/commissions
- Include payment instructions (IBAN, reference, QR code)

**Questions to Answer Before Implementation**:
- QR-bill generation library? (Swiss QR-bill standard - need to find JavaScript/TypeScript library)
- What information must be on invoice? (Swiss legal requirements)
- Invoice template design/branding?
- Should invoices include VAT? (depends on revenue threshold)
- How to generate QR code for QR-bill? (library should handle this)

**Potential Issues**:
- QR-bill standard is complex (Swiss QR-bill specification)
- Need to find/implement QR-bill library
- IBAN must be correct format
- Reference number must match invoice number
- QR code generation and validation

### 17.19. Payment Plan System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.17  
**Action**:
- Create payment plan from invoice (split into installments)
- Track installment payments
- Generate installment invoices (each installment is a separate invoice)
- Send payment reminders (overdue tracking)
- Mark installments as paid
- Handle partial payments

**Questions to Answer Before Implementation**:
- How many installments allowed? (2, 3, 4, more?)
- Installment frequency? (monthly, quarterly, custom?)
- What happens if one installment is late? (late fees, cancel plan, extend due date?)
- Can customers pay installments early?
- Should payment plans be automatic or require approval?

**Potential Issues**:
- Complex state management (tracking multiple installments)
- Overdue tracking and reminder system
- Late fee calculation (if applicable)
- What happens if customer defaults on payment plan?
- Integration with invoice system

### 17.20. Payment Matching (Bank Transfers) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.18  
**Action**:
- Admin UI to match bank transfers to invoices
- Search invoices by invoice number (from payment reference field)
- Mark invoices as paid manually
- Update payment_plans when installments paid
- Send payment confirmation emails
- Track payment date and amount
- Handle partial payments

**Questions to Answer Before Implementation**:
- How often should we check PostFinance for new payments? (daily, weekly?)
- What if payment amount doesn't match invoice exactly? (partial payment, overpayment?)
- What if payment reference doesn't include invoice number? (manual matching process)
- Should we send automatic payment confirmation emails?
- How to handle payments that don't match any invoice? (unmatched payments list)

**Potential Issues**:
- Manual process (no API automation)
- Payment reference may not always include invoice number
- Need clear workflow for payment reconciliation
- Time-consuming for many invoices
- Risk of missing payments if not checked regularly

### 17.21. Overdue Invoice Tracking & Reminders ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #17.18  
**Action**:
- Cron job to check overdue invoices (daily)
- Send reminder emails (7 days, 14 days, 30 days overdue)
- Mark invoices as overdue in database
- Admin dashboard for overdue invoices
- Automatic late fee calculation (optional)
- Escalation workflow (multiple reminders, then collection)

**Questions to Answer Before Implementation**:
- When is invoice considered overdue? (after due_date passes)
- How many reminder emails? (1, 2, 3, more?)
- Reminder schedule? (7 days, 14 days, 30 days after due date?)
- Should we charge late fees? (if yes, how much, when?)
- What happens after final reminder? (send to collection, cancel service, extend deadline?)

**Potential Issues**:
- Need reliable cron job system (Supabase Cron Jobs)
- Email deliverability for reminder emails
- Customer relationship management (don't want to be too aggressive)
- Late fee calculation and invoicing
- Legal requirements for debt collection (Swiss law)

### 17.22. User Account: Invoices View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - user needs access to invoices  
**Action**:
- Create `account/components/invoices/` component
- List all invoices (pending, paid, overdue)
- View invoice PDFs (with QR-bill)
- Download invoices
- View payment plan status (if applicable)
- Filter by status, date, amount
- Show payment instructions (IBAN, reference, QR code)
- Display payment status and due dates

### 17.23. User Account: Unified Financial Documents View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - consolidate all financial docs  
**Action**:
- Create unified view showing: Receipts, Invoices, Contracts
- Tabbed interface or filterable list
- Search across all document types
- Download all documents
- Show document status (paid, pending, signed, etc.)
- Filter by date range, type, status

### 17.24. Refund Processing System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for customer service  
**Action**:
- User refund request flow (from account or support)
- Refund request form (reason, amount, details)
- Admin refund approval workflow
- Refund processing (Stripe API integration)
- Bank transfer refund workflow (manual)
- Refund tracking and history
- Refund confirmation emails
- Refund reason tracking and analytics

**Questions to Answer Before Implementation**:
- Who can request refunds? (any user, or only within X days?)
- Refund policy? (full refund, prorated, no refunds?)
- Automatic approval for certain conditions? (e.g., within 14 days)
- Partial refunds allowed?
- Refund processing time? (immediate, 3-5 business days?)

**Potential Issues**:
- Stripe refund API integration
- Bank transfer refunds require manual processing
- Refund reason tracking for analytics
- Refund impact on revenue reports

### 17.25. GDPR Data Deletion Workflow ⚠️ **MISSING**
**Status**: **MISSING** - Account deletion exists but GDPR workflow incomplete  
**Priority**: Medium - legal compliance  
**Action**:
- Right to be forgotten implementation
- Data retention policy enforcement
- Automated data purging (after retention period)
- Data deletion confirmation workflow
- Partial data deletion (specific data types)
- Data deletion audit trail

**Questions to Answer Before Implementation**:
- Data retention period? (10 years for invoices per Swiss law, but other data?)
- What data can be deleted vs must be retained? (financial records vs profile data)
- Should deletion be immediate or scheduled?
- How to handle data in backups? (mark for deletion, purge on restore?)

**Note**: Account deletion component exists (`account/components/account-actions/delete-account/`) but GDPR workflow needs completion.

---

## 🛠️ **Phase 6: Admin Operational Tooling**

### 18. Admin Communication Center
**Status**: Only SPEC.md exists  
**Priority**: Independent - can use existing Resend integration  
**Action**: Build messaging/announcement/email interface per spec

### 19. Admin Bulk Operations
**Status**: Component exists (`bulk-operations.js` exists)  
**Priority**: Verify implementation completeness  
**Action**: Test existing component, complete any missing features

### 20. Admin Subscription Management UI
**Status**: Only SPEC.md exists  
**Priority**: Depends on Stripe integration  
**Action**: Build UI to interact with Stripe data (grant/revoke, status checks)

### 20.5. Admin: User Financial Documents View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - admin needs to see user's financial history  
**Action**:
- Add to `admin/components/user-detail/`
- Show all receipts, invoices, contracts for user
- View/download any document
- Manually mark invoices as paid (payment matching)
- Resend documents via email
- Create new invoices/contracts from user detail page
- Filter by type, status, date range
- Show payment history and outstanding balances

### 20.6. Financial Document Email Notifications ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - users need to be notified  
**Action**:
- Email when receipt generated (Stripe purchase)
- Email when invoice created (commissioning, payment plan)
- Email when contract sent for signature
- Email when contract signed (confirmation)
- Email when invoice paid (bank transfer matched)
- Email payment reminders (overdue invoices)
- All emails via Resend with PDF attachments
- Email template design (branded, professional)

**Questions to Answer Before Implementation**:
- Email template design/branding?
- Should emails include PDF attachments or just links?
- How to handle email delivery failures?
- Should users be able to unsubscribe from financial emails? (probably not, but need to decide)
- Multi-language email support?

### 20.7. Email Template Management UI ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - needed for email customization  
**Action**:
- Admin UI to manage email templates
- Template editor (rich text, variables)
- Template preview functionality
- Template versioning
- A/B testing for emails (optional)
- Template categories (receipts, invoices, contracts, notifications)

**Questions to Answer Before Implementation**:
- Template editor type? (rich text editor, HTML editor, markdown?)
- Template variable system? ({{user_name}}, {{invoice_number}}, etc.)
- Should templates be stored in database or files?
- Template versioning strategy? (keep all versions, or just latest?)

### 20.8. User Onboarding Flow ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - improve user experience  
**Action**:
- New user welcome flow
- Product discovery/tour
- First purchase guidance
- Feature introduction (tooltips, guided tours)
- Onboarding checklist
- Skip/complete tracking

**Questions to Answer Before Implementation**:
- Onboarding style? (modal, sidebar, inline tooltips?)
- Should onboarding be skippable?
- Track onboarding completion?
- Customize onboarding based on user type? (individual vs enterprise)

### 20.9. FAQ System Enhancement ⚠️ **EXISTS - May Need Expansion**
**Status**: **EXISTS** - FAQ system implemented with multiple sections  
**Priority**: Low - enhance existing system  
**Action**:
- Review existing FAQ sections (general, tech-support, commissioning, catalog-access, account-billing)
- Add missing FAQ entries based on user questions
- Improve FAQ search functionality
- Add FAQ analytics (most viewed, search terms)
- Link FAQs from relevant pages (contextual help)

**Current FAQ Sections**:
- ✅ General FAQs (`faq/general/`)
- ✅ Tech Support FAQs (`faq/tech-support/`)
- ✅ Commissioning FAQs (`faq/commissioning/`)
- ✅ Catalog Access FAQs (`faq/catalog-access/`)
- ✅ Account & Billing FAQs (`faq/account-billing/`)

**Questions to Answer**:
- Are all common questions covered?
- Should we add FAQ search?
- Should FAQs be linked from account pages?

### 20.10. Multi-Currency Support ✅ **IMPLEMENTED**
**Status**: **✅ IMPLEMENTED** - Database schema supports multi-currency  
**Priority**: N/A - Already implemented  
**Action**: None needed - verify UI displays currencies correctly

**Implementation Details**:
- ✅ `products` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with constraint for USD, EUR, CHF, GBP
- ✅ `product_purchases` table: `currency VARCHAR(3) NOT NULL` with same constraint
- ✅ `product_bundles` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with same constraint
- ✅ `services` table: `base_price_currency VARCHAR(3) DEFAULT 'CHF'` with same constraint

**Note**: Verify that UI components properly display and handle currency selection/display.

---

## 💰 **Phase 7: Revenue & Financial Reporting**

### 21. Admin Revenue Reports Module
**Status**: Only SPEC.md exists  
**Priority**: Depends on Stripe data flowing  
**Action**: Build revenue reports with gross revenue, refunds, lifecycle events, CSV exports

---

## 📖 **Phase 8: Story Page & Review System**

### 22. Story Page Implementation
**Status**: Database schema exists (`product_reviews` table)  
**Priority**: Independent - can be done anytime  
**Action**: Build story page UI and review system with moderation interface

---

## 🔔 **Phase 9: Notification Center Enhancements**

### 23. Notification Center Polish
**Status**: Full implementation exists  
**Priority**: Enhancement  
**Action**: Add new notification options, explore push notifications, set defaults

---

## 📊 **Phase 10: Dashboard & Analytics (LAST)**

### 24. Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build dashboard with KPIs, recent activity, quick actions

### 25. Analytics Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build analytics with real-time charts, user metrics, conversion funnels

---

## 🔒 **Phase 11: Future Platform Guardrails (Post-Launch)**

### 26. Cloudflare Worker Subdomain Protection
**Status**: Strategy documented  
**Priority**: Post-Stripe phase  
**Action**: Implement webhook plumbing and subscription-based access control

---

## 📋 **Summary by Priority**

### 🔴 **CRITICAL (Do First)**
1. ~~Externalize Supabase keys~~ ✅ **FIXED - Confirmed not an issue**
2. ~~Fix localhost fallback~~ ✅ **FIXED - Edge Function implemented**
3. Stripe webhook handler (#14) - **REMAINING CRITICAL ITEM**
4. Stripe Checkout Integration (#16) - **CRITICAL - Needed for purchases**
5. Purchase Confirmation & Entitlements (#16.5) - **CRITICAL - Needed after checkout**
6. Receipt System (#16.6) - **CRITICAL - Needed for all Stripe purchases**

### 🟡 **HIGH PRIORITY (Before Launch)**
6. ~~Production security cleanup~~ ✅ **FIXED - All TODOs implemented, console logs cleaned up**
7. ~~SEO files (robots.txt, sitemap.xml)~~ ✅ **FIXED - Both files created**
8. Service Delivery Helper/Workflow System (#12.5) - **HIGH PRIORITY - Ensures quality service delivery**
9. Account subscription management (#17) - **REMAINING HIGH PRIORITY ITEM**
10. User Subscription Cancellation & Management (#17.2) - **HIGH PRIORITY - Users need to manage subscriptions**
11. Payment Method Management (#17.3) - **HIGH PRIORITY - Users need to manage payment methods**
12. Product Wizard Steps 4-7 Verification (#15.5) - **HIGH PRIORITY - Complete all wizard steps**
13. User Account Receipts View (#17.1) - **HIGH PRIORITY - User needs access to receipts**
14. PostFinance Account Management Learning (#17.15) - **HIGH PRIORITY - Foundation for invoice system**
15. Payment Strategy Decision (#17.16) - **HIGH PRIORITY - Must decide Stripe vs bank transfer**
16. Invoice System (#17.17-17.23) - **HIGH PRIORITY - Needed for commissioning and large purchases**
17. Contract System (#17.10-17.14) - **HIGH PRIORITY - Needed for commissioning agreements**
18. Refund Processing System (#17.24) - **HIGH PRIORITY - Needed for customer service**
19. Admin Financial Documents View (#20.5) - **HIGH PRIORITY - Admin needs to manage finances**
20. Financial Document Email Notifications (#20.6) - **HIGH PRIORITY - Users must be notified**

### 🟢 **MEDIUM PRIORITY (Can Do in Parallel)**
8-12. Tech support booking flow
13. Stripe products/prices setup
16.6. Receipt system (Stripe purchases)
17.1. User account receipts view
17.4. Subscription renewal reminders
17.5-17.9. Commissioning workflow (database, form, edge functions, admin manager, conversion)
17.10-17.14. Contract system (research, schema, templates, generation, user view)
17.15. PostFinance account management learning
17.16. Payment strategy decision
17.17-17.23. Invoice system (schema, QR-bill generation, payment plans, matching, overdue tracking, user views)
17.25. GDPR data deletion workflow
18-19. Admin communication & bulk ops
20.5. Admin financial documents view
20.6. Financial document email notifications
20.7. Email template management UI
20.8. User onboarding flow
20.9. FAQ system enhancement (exists, may need expansion)
22. Story page and reviews
23. Notification center enhancements

### 🔵 **LOW PRIORITY (After Core Features)**
20. Admin subscription management
21. Revenue reports

### ⚪ **LAST (Needs All Data)**
24-25. Dashboard and analytics

---

## 🎯 **Recommended Implementation Order**

### Week 1: Production Readiness ✅ **COMPLETE**
- [x] ~~Externalize Supabase keys~~ ✅ **FIXED - Confirmed not an issue**
- [x] ~~Fix localhost fallback~~ ✅ **FIXED - Edge Function implemented**
- [x] ~~Production security cleanup~~ ✅ **FIXED - All TODOs implemented, console logs cleaned up**
- [x] ~~Create robots.txt and sitemap.xml~~ ✅ **FIXED - Both files created**

### Week 2: Stripe Foundation
- [ ] Verify Stripe setup
- [ ] Create Stripe webhook handler
- [ ] Test product creation flow
- [ ] Verify Product Wizard Steps 4-7 (#15.5) - Stripe, Cloudflare, Content/Media, Review/Summary

### Week 3: Purchase & Checkout Flow
- [ ] Stripe Checkout Integration (#16)
- [ ] Purchase Confirmation & Entitlements (#16.5)
- [ ] Wire up to catalog access buttons

### Week 4: Account Subscriptions
- [ ] Create account subscription management component (#17)
- [ ] User subscription cancellation & management (#17.2)
- [ ] Payment method management (#17.3)
- [ ] Wire up to existing data structures

### Week 5-6: Tech Support Booking
- [ ] Database schema
- [ ] Edge functions
- [ ] Public UI
- [ ] Admin manager

### Week 6.5: Service Delivery Helper System
- [ ] Service delivery database schema (checklists, milestones, tracking)
- [ ] Service delivery helper admin component
- [ ] Checklists and templates for commissioning
- [ ] Checklists and templates for tech support
- [ ] Quality assurance workflow
- [ ] Service milestone tracking
- [ ] Service completion verification
- [ ] Post-service follow-up automation

### Week 7-8: Commissioning Workflow
- [ ] Commission request database schema (#17.5)
- [ ] Commission request form (#17.6)
- [ ] Commission request edge functions (#17.7)
- [ ] Admin commission manager (#17.8)
- [ ] Commission-to-product conversion (#17.9)

### Week 9: PostFinance & Payment Strategy
- [ ] Learn PostFinance e-banking and QR-bill generation (#17.15)
- [ ] Document payment strategy decision matrix (#17.16)
- [ ] Research QR-bill libraries and invoice requirements
- [ ] Answer all questions for contract/invoice systems

### Week 10-11: Receipt System
- [ ] Receipt system implementation (#16.6)
- [ ] User account receipts view (#17.1)
- [ ] Receipt PDF generation and email notifications

### Week 12-13: Contract System
- [ ] Contract system research and planning (#17.10)
- [ ] Contract database schema (#17.11)
- [ ] Contract template system (#17.12)
- [ ] Contract generation and e-signature (#17.13)
- [ ] User account contracts view (#17.14)

### Week 14-16: Invoice System
- [ ] Invoice database schema (#17.17)
- [ ] Invoice generation with QR-bill (#17.18)
- [ ] Payment plan system (#17.19)
- [ ] Payment matching UI (#17.20)
- [ ] Overdue tracking and reminders (#17.21)
- [ ] User account invoices view (#17.22)
- [ ] Unified financial documents view (#17.23)

### Week 17: Financial System Integration
- [ ] Admin financial documents view (#20.5)
- [ ] Financial document email notifications (#20.6)
- [ ] Refund processing system (#17.24)
- [ ] Integration testing (receipts, invoices, contracts, refunds)

### Week 18: User Experience Enhancements
- [ ] Subscription renewal reminders (#17.4)
- [ ] User onboarding flow (#20.8)
- [ ] Email template management UI (#20.7)
- [ ] FAQ system review and enhancement (#20.9)
- [ ] GDPR data deletion workflow (#17.25)

### Week 19-20: Admin Tooling
- [ ] Communication center
- [ ] Verify bulk operations
- [ ] Admin subscription management

### Week 21: Revenue & Story
- [ ] Revenue reports
- [ ] Story page and reviews

### Week 22+: Dashboard & Analytics (LAST)
- [ ] Dashboard
- [ ] Analytics dashboard

---

**Note**: This order minimizes rework and ensures dependencies are met. Dashboard/analytics come last as requested, after all data sources are in place.


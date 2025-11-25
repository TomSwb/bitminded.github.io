# 🎯 Priority List - To Do

**Last Updated**: November 21, 2025 (Reorganized for logical workflow grouping)  
**Based on**: Actual codebase investigation (not just READMEs)

> **Note**: This document contains only active/incomplete items. For completed items, see [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) (same folder).

**Organization Philosophy**: Related workflows are grouped together (e.g., Tech Support + Commissioning in Phase 5, Contracts + Invoices in Phase 6) to ensure logical implementation order and minimize context switching.

---

## 📊 **Implementation Status Summary**

### ❌ **What's Actually Missing**
- ❌ Account subscription management (directory doesn't exist)
- ❌ User subscription cancellation & management
- ❌ Payment method management (user account)
- ❌ Tech support booking flow (only README)
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
- ❌ Cloudflare Worker Subdomain Protection (now in Phase 3, #16.6 - CRITICAL for protecting paid tools)
- ❌ Notification Center Enhancements (now in Phase 7, #52)
- ❌ Stories & Review System (now planned in Phase 7, #54)
- ❌ Marketing & Social Media Integration (now planned in Phase 7, #55)
- ❌ Marketing Analytics Planning & Setup (now planned in Phase 7, #56 - must be ready before Phase 8)

### ⚠️ **Partially Implemented / Needs Enhancement**
- ⚠️ FAQ system (exists but may need expansion)
- ⚠️ GDPR data deletion (account deletion exists, workflow incomplete)
- ⚠️ Multi-currency support (database implemented, verify UI)

---



## 💳 **Phase 2: Stripe & Payment Foundation**

> **Note**: Items 13, 14, 14.1, 15, 15.5, 15.5.1, 15.5.2, 15.6, 15.7, and 15.8 are completed. See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) for details.

### 15.9. Family Plan Payment Setup & Stripe Integration ⚠️ **MISSING**
**Status**: **MISSING** - Family plan pricing UI complete, but payment flow and webhook handling not implemented  
**Priority**: High - Family plans are a key differentiator and revenue driver  
**Reference**: See `../payment-financial/FAMILY-PLANS-ANALYSIS.md` for complete implementation details (section "Webhook Handler Implementation Requirements")

**Prerequisites** (MUST COMPLETE FIRST):
- ✅ Family plan pricing UI implemented (per-member pricing: CHF 3.50/member for All-Tools, CHF 5/member for Supporter)
- ⚠️ Database schema: `family_groups`, `family_members`, `family_subscriptions` tables (see `../payment-financial/FAMILY-PLANS-ANALYSIS.md`)
- ✅ Stripe webhook handler exists (#14) but needs family plan support

**Action**:
- **Database Setup**:
  - Create `family_groups` table (id, family_name, admin_user_id, family_type, max_members, subscription_id)
  - Create `family_members` table (id, family_group_id, user_id, role, relationship, status, etc.)
  - Create `family_subscriptions` table (id, family_group_id, stripe_customer_id, stripe_subscription_id, plan_name, status, etc.)
  - Implement RLS policies for all family tables
  - Create helper functions: `is_family_member()`, `is_family_admin()`, `has_family_subscription_access()`

- **Stripe Checkout Integration** (depends on #16):
  - Add family plan support to Stripe Checkout session creation
  - Include family plan metadata in checkout sessions: `{ is_family_plan: 'true', family_group_id: '...' }`
  - Handle per-member pricing calculation (CHF 3.50/member for All-Tools, CHF 5/member for Supporter)
  - Support yearly family plans (CHF 38.50/member/year for All-Tools, CHF 55/member/year for Supporter)
  - Allow family member count selection in checkout flow

- **Webhook Handler Updates** (update existing #14):
  - Add family plan detection logic in `checkout.session.completed` handler
  - Implement `handleFamilyPlanPurchase()` function:
    - Detect family plan purchase (check metadata or product name)
    - Create or link to existing family group
    - Create `family_subscriptions` record
    - Grant access to all active family members
    - Create individual `product_purchases` records for each member (for tracking)
  - Update `customer.subscription.created/updated/deleted` handlers for family subscriptions
  - Update `invoice.paid` handler to renew access for all family members
  - Handle member count changes (subscription quantity updates)

- **Family Management UI**:
  - Family group creation/management interface
  - Family member invitation system (email/username invitations)
  - Family member role management (admin, parent, member, child)
  - Family subscription management (view status, cancel, update)

**Implementation Details** (from FAMILY-PLANS-ANALYSIS.md):
- Family plan detection: Check `session.metadata.is_family_plan === 'true'` or product name contains "Family"
- Family group creation: `findOrCreateFamilyGroup()` - checks if user is already admin/member, creates new group if needed
- Access granting: `grantFamilyAccess()` - creates `product_purchases` for each active member, creates/updates `family_subscriptions`
- Member changes: Handle additions/removals mid-subscription (grant/revoke access accordingly)

**Questions to Answer Before Implementation**:
- Should family groups be created before checkout or during checkout?
- How to handle family member invitations before payment? (pre-create group with pending members?)
- Should family plan checkout allow adding members during purchase, or require pre-setup?
- How to handle subscription quantity changes (member count changes)?
- Prorated billing for member additions/removals?

**Related Items**:
- Depends on: #16 (Stripe Checkout Integration), #14 (Stripe Webhook Handler - needs updates)
- Blocks: Family plan purchases, family subscription management
- See also: `../payment-financial/FAMILY-PLANS-ANALYSIS.md` for complete technical specifications

---

## 🛒 **Phase 3: Purchase & Checkout Flow**

### 16. Payment Integration (Stripe + Bank Transfer) ⚠️ **MISSING**
**Status**: **MISSING** - No checkout flow exists  
**Priority**: Critical - needed for catalog access purchases and service bookings  
**Action**: 
- **Payment Method Selection/Display**: Payment method selection and display will be handled in the checkout flow, not on service cards (payment method badges removed from user-facing pages)
- **Stripe Checkout Flow** (for services with `payment_method = 'stripe'` or `payment_method = 'both'`):
  - Create edge function to create Stripe Checkout sessions
  - Build checkout flow component
  - Create success/cancel redirect pages
  - Wire up to catalog access "Buy Now" buttons and Stripe service buttons
  - Handle different pricing types (one-time, subscription, freemium)
  - Display payment method options in checkout (if service supports both)
- **Bank Transfer / Invoice Flow** (for services with `payment_method = 'bank_transfer'` or `payment_method = 'both'`):
  - Build service booking/invoice request form component
  - Generate QR-bill invoices for PostFinance bank transfers
  - Create invoice generation edge function
  - Email invoice with QR-bill to customer
  - Handle booking confirmation and payment tracking
  - Wire up "Request Quote" / "Book Service" buttons for commissioning and in-person tech support
- **Dual Payment System**:
  - Different CTAs based on service `payment_method` field
  - Stripe services: "Subscribe Now" / "Buy Now" buttons
  - Bank transfer services: "Request Quote" / "Book Service" buttons
  - Services with `payment_method = 'both'`: Show payment method selector in checkout flow
  - Payment method selection and display handled in checkout, not on service cards (badges removed from user-facing pages)

### 16.5. Purchase Confirmation & Entitlements ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Critical - needed after checkout  
**Action**:
- Create purchase confirmation emails (via Resend)
- Auto-grant entitlements on successful payment (via webhook)
- Update account subscription management to show purchases
- Handle subscription vs one-time purchase flows

### 16.6. Cloudflare Worker Subdomain Protection ⚠️ **CRITICAL**
**Status**: Strategy documented (`admin/components/product-management/docs/SUBDOMAIN-PROTECTION-STRATEGY.md`)  
**Priority**: **CRITICAL** - Must protect paid tools immediately after entitlements are granted  
**Action**: Implement subscription-based access control for subdomain tools using Cloudflare Workers

#### 16.6.1. Cloudflare Worker Setup & Configuration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - needed for subdomain protection  
**Action**:
- Set up Cloudflare Worker for subdomain routing
- Configure worker routes for all tool subdomains (`*.bitminded.ch`)
- Set up environment variables (Supabase URL, service key, etc.)
- Configure worker to intercept all requests to tool subdomains
- Test worker deployment and routing

**Questions to Answer Before Implementation**:
- Which Cloudflare plan is needed? (Workers free tier vs paid?)
- How to handle worker deployment? (Wrangler CLI, GitHub Actions?)
- Should worker cache entitlement checks? (performance vs real-time accuracy)

#### 16.6.2. Authentication Token Handling ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for user identification  
**Action**:
- Implement token extraction from cookies (Supabase auth cookies)
- Implement token extraction from Authorization header
- Handle cross-domain cookie sharing (`.bitminded.ch` domain)
- Verify Supabase JWT tokens in worker
- Handle token expiration and refresh
- Redirect to login if no valid token found

**Questions to Answer Before Implementation**:
- Should we use cookies or Authorization headers? (or both?)
- How to handle token refresh in worker? (redirect to main site?)
- Cookie domain configuration? (`.bitminded.ch` for cross-subdomain sharing)

#### 16.6.3. Entitlement Checking Logic ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - core access control  
**Action**:
- Create Supabase RPC function `has_app_access(user_uuid, app_name)` if not exists
- Implement entitlement check in Cloudflare Worker:
  - Extract app ID from subdomain (e.g., `converter` from `converter.bitminded.ch`)
  - Query Supabase to check if user has active entitlement
  - Check subscription status (active, expired, cancelled)
  - Check expiration dates
  - Handle admin-granted access
  - Handle bundle subscriptions (access to multiple tools)
- Cache entitlement checks (optional, for performance)
- Handle errors gracefully (network issues, Supabase downtime)

**Questions to Answer Before Implementation**:
- Should we cache entitlement checks? (how long? 5 min, 1 hour?)
- How to handle Supabase downtime? (deny access, or allow with warning?)
- Should we check entitlements on every request or cache per session?

#### 16.6.4. Access Control Flow Implementation ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - user experience  
**Action**:
- Implement redirect logic for unauthenticated users:
  - Redirect to `bitminded.ch/auth?redirect={subdomain}`
  - Preserve original URL for post-login redirect
- Implement redirect logic for authenticated users without subscription:
  - Redirect to `bitminded.ch/subscribe?tool={app_id}`
  - Show friendly message about subscription required
- Allow access for users with valid entitlements:
  - Proxy request to actual tool (GitHub Pages or hosting)
  - Pass through all headers and request data
  - Handle CORS if needed
- Handle edge cases:
  - Expired subscriptions (grace period?)
  - Admin-granted access
  - Trial access (if implemented)

**Questions to Answer Before Implementation**:
- Should expired subscriptions have a grace period? (7 days, 30 days?)
- How to handle trial access? (separate check, or same entitlement system?)
- Should we show different messages for different subscription states?

#### 16.6.5. Cross-Domain Session Management ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - seamless user experience  
**Action**:
- Configure Supabase auth cookies for cross-domain sharing:
  - Set cookie domain to `.bitminded.ch`
  - Ensure cookies are accessible from all subdomains
  - Configure secure, SameSite settings
- Implement session synchronization:
  - Ensure login on main site works on subdomains
  - Ensure logout on main site works on subdomains
  - Handle session refresh across domains
- Test cross-domain authentication flow:
  - Login on `bitminded.ch` → access `converter.bitminded.ch`
  - Logout on `bitminded.ch` → verify logout on subdomains

**Questions to Answer Before Implementation**:
- Cookie SameSite policy? (`Lax`, `None`, `Strict`?)
- How to handle session refresh across domains?
- Should we use localStorage or cookies for cross-domain auth?

#### 16.6.6. Worker Error Handling & Logging ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - reliability  
**Action**:
- Implement comprehensive error handling:
  - Network errors (Supabase unreachable)
  - Authentication errors (invalid token)
  - Entitlement check errors
  - Worker runtime errors
- Set up logging and monitoring:
  - Log all access attempts (success/failure)
  - Log entitlement check results
  - Log errors for debugging
  - Set up alerts for high error rates
- Implement fallback behavior:
  - What to do if Supabase is down? (deny access, or allow with warning?)
  - What to do if worker fails? (fallback to main site?)

**Questions to Answer Before Implementation**:
- Which logging service? (Cloudflare Workers Logs, external service?)
- How detailed should logs be? (privacy considerations)
- Should we log user IDs or anonymize?

**Potential Issues**:
- Cloudflare Worker cold starts (latency on first request)
- Supabase API rate limits (if checking on every request)
- Cookie security (CSRF protection, secure flags)
- CORS issues if tools make API calls
- Performance impact of entitlement checks on every request
- Cost of Cloudflare Workers (if high traffic)

### 16.7. Receipt System (Stripe Purchases) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Critical - needed for all Stripe purchases  
**Action**:
- Auto-generate receipts after Stripe payment (via webhook)
- Create receipt PDF template (simple, branded)
- Store receipts in Supabase storage
- Link receipts to `product_purchases` table
- Email receipts via Resend
- Display receipts in user account

**Note**: Cloudflare Worker Subdomain Protection (#16.6) must be implemented immediately after entitlements are granted to protect paid tools.

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

## 👤 **Phase 4: Account Subscription Management**

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

## 🔧 **Phase 5: Service Workflows (Tech Support + Commissioning)**

### 18. Tech Support Booking Database Schema
**Status**: Only README exists (`services/tech-support/README.md`)  
**Priority**: Foundation for booking flow  
**Action**: Create Supabase tables: `tech_support_availability`, `tech_support_bookings`, `tech_support_booking_actions`

### 19. Tech Support Booking Email Templates
**Status**: Not started  
**Priority**: Can be done before backend  
**Action**: Create Proton-friendly email bodies, ICS templates, localization keys

### 20. Tech Support Booking Edge Functions
**Status**: Not started  
**Priority**: Depends on #18  
**Action**: Create `create-tech-support-booking`, `update-tech-support-booking`, `send-tech-support-email`

### 21. Tech Support Booking Public UI
**Status**: Buttons exist but disabled ("Coming Soon")  
**Priority**: Depends on #18, #19, #20  
**Action**: Create `services/components/tech-support-booking/` component, replace disabled buttons

### 22. Admin Tech Support Manager
**Status**: Not started  
**Priority**: Depends on #18, #20  
**Action**: Create `admin/components/tech-support-manager/` for CRUD on availability slots

### 23. Commission Request Database Schema ⚠️ **MISSING**

**Status**: **MISSING**  
**Priority**: Foundation for commissioning workflow  
**Action**: Create Supabase tables: `commission_requests`, `commission_proposals`, `commission_agreements`

### 24. Commission Request Form ⚠️ **MISSING**
**Status**: **MISSING** - Buttons show "Coming Soon"  
**Priority**: Public-facing commissioning  
**Action**: 
- Create `services/components/commission-request-form/` component
- Replace "Coming Soon" buttons on commissioning page
- Handle different commission types (simple app, standard app, complex app, feature commission, intake)

### 25. Commission Request Edge Functions ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #23  
**Action**: 
- Create `create-commission-request` edge function
- Create `update-commission-status` edge function
- Create `send-commission-email` edge function (via Resend)
- Handle commission request notifications

### 26. Admin Commission Manager ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #23, #25  
**Action**: 
- Create `admin/components/commission-manager/` component
- View/manage commission requests
- Commission request status workflow (new, in_progress, quoted, accepted, completed, cancelled)
- Commission proposal creation

### 27. Commission-to-Product Conversion ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on commissioning workflow  
**Action**: 
- Workflow to convert completed commissions into catalog products
- Link commissioned products to original commission request
- Track commissioner information in product record

### 28. Service Delivery Helper/Workflow System ⚠️ **NEW**
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

## 📄 **Phase 6: Financial Documents (Contracts + Invoices)**

### 29. Contract System Research & Planning ⚠️ **MISSING**
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

### 30. Contract Database Schema ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation for contracts  
**Action**: 
- Create `contracts` table (id, user_id, type, status, template_version, storage_path, created_at, signed_at, etc.)
- Create `contract_templates` table (id, name, type, content, version, is_active, created_at, etc.)
- Create `contract_signatures` table (id, contract_id, signer_email, signed_at, ip_address, user_agent, signature_method, etc.)
- Link contracts to commissions/invoices

### 31. Contract Template System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #30  
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

### 32. Contract Generation & E-Signature ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #31  
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

### 33. User Account: Contracts View ⚠️ **MISSING**
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

### 34. Invoice Database Schema ⚠️ **MISSING**
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

### 35. Invoice Generation (QR-Bill) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #34  
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

### 36. Payment Plan System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #34  
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

### 37. Payment Matching (Bank Transfers) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #35  
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

### 38. Overdue Invoice Tracking & Reminders ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Depends on #35  
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

### 39. User Account: Invoices View ⚠️ **MISSING**
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

### 40. User Account: Unified Financial Documents View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - consolidate all financial docs  
**Action**:
- Create unified view showing: Receipts, Invoices, Contracts
- Tabbed interface or filterable list
- Search across all document types
- Download all documents
- Show document status (paid, pending, signed, etc.)
- Filter by date range, type, status

### 41. Admin: User Financial Documents View ⚠️ **MISSING**
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

### 42. Financial Document Email Notifications ⚠️ **MISSING**
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

### 43. Refund Processing System ⚠️ **MISSING**
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

---

## 🛠️ **Phase 7: User Experience & Admin Tooling**

### 44. User Onboarding Flow ⚠️ **MISSING**
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

### 45. Email Template Management UI ⚠️ **MISSING**
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

### 46. FAQ System Enhancement ⚠️ **EXISTS - May Need Expansion**
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

### 47. GDPR Data Deletion Workflow ⚠️ **MISSING**
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

### 48. Admin Communication Center
**Status**: Only SPEC.md exists  
**Priority**: Independent - can use existing Resend integration  
**Action**: Build messaging/announcement/email interface per spec

### 49. Admin Bulk Operations
**Status**: Component exists (`bulk-operations.js` exists)  
**Priority**: Verify implementation completeness  
**Action**: Test existing component, complete any missing features

### 50. Admin Subscription Management UI
**Status**: Only SPEC.md exists  
**Priority**: Depends on Stripe integration  
**Action**: Build UI to interact with Stripe data (grant/revoke, status checks)

### 51. Multi-Currency UI Verification ⚠️ **NEEDS VERIFICATION**
**Status**: Database schema implemented - verify UI displays currencies correctly  
**Priority**: Medium  
**Action**: Verify that UI components properly display and handle currency selection/display

**Implementation Details**:
- ✅ `products` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with constraint for USD, EUR, CHF, GBP
- ✅ `product_purchases` table: `currency VARCHAR(3) NOT NULL` with same constraint
- ✅ `product_bundles` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with same constraint
- ✅ `services` table: `base_price_currency VARCHAR(3) DEFAULT 'CHF'` with same constraint

### 53. Content Optimization & Translation Refinement ⚠️ **HIGH PRIORITY - Based on User Feedback**
**Status**: **MISSING** - Critical feedback received from multiple sources  
**Priority**: **HIGH** - Impacts user understanding and engagement  
**Action**: Improve content clarity, conciseness, translations, and messaging based on user feedback

**Feedback Sources Integrated**:
- Christina-1.md: French translation improvements, capitalization guidelines
- Jean-Paul-1.md: French wording improvements, terminology refinement
- Jean-Paul-2.md: Content redundancy reduction
- Steve-1.md: Content conciseness, attention-grabbing messaging

#### 53.1. French Translation & Copy Improvements ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - affects French-speaking users  
**Action**:
- **Replace problematic terms**:
  - "intentionnels" → "dédiés", "déterminés", "bien ciblés", "précisément orientés"
  - "sans jugement" → "avec bienveillance" (better connotation in French)
  - "simple" → "clair" (avoids "simplet" connotation)
  - "honnête" (pricing) → "juste" or "équitable" (more appropriate)
  - "intention" → "dans un but clair", "dans un but précis"
- **Capitalization guidelines**:
  - Remove excessive capitalization
  - Keep caps only for essential terms/actions
  - Examples: "Nous Construisons" → "Nous construisons", "Un Langage Clair" → "Un langage clair"
- **Specific improvements** (from feedback):
  - "support technique patient" → "accompagnés patiemment et dans un langage clair d'un support technique"
  - "notes annotées" → "rapports annotés"
  - "stockage en nuage" → "cloud" (commonly used in French)
  - "Nous pouvons aider avec" → "Possibilités d'aide" or "Nous aidons pour"
- **Complete missing translations**:
  - Ensure all terms like "Craftsmanship" and "Safety" are translated
- **Review all French content** across:
  - Homepage (`index.html`)
  - About pages (`about/`)
  - Services pages (`services/`)
  - Vision/Mission page (`about/vision-mission/`)

#### 53.2. Content Conciseness & Messaging ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - improves user engagement and clarity  
**Action**:
- **Reduce verbosity** (Steve's feedback):
  - Make content more impactful and easier to scan
  - Remove redundant explanations
  - Keep key messages clear and concise
- **Improve attention-grabbing messaging**:
  - Make homepage more compelling to keep visitors
  - Add clear value propositions early on pages
  - Ensure messaging is more action-oriented
- **Add concise advantages/solutions list**:
  - Create clear, scannable list of benefits on homepage/services pages
  - Make it easy for visitors to quickly understand value proposition
  - Differentiate from competitors with specific advantages
- **Reduce redundancy across pages**:
  - Identify repeated content across different pages
  - Consolidate where appropriate
  - Ensure consistent messaging without unnecessary repetition
  - Improve content flow and navigation

#### 53.3. Color & Contrast Improvements ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - affects readability and accessibility  
**Action**:
- **Fix catalog page readability** (Jean-Paul-2 feedback):
  - Address yellow-green and gray color contrast issue in cartouches
  - Increase luminance difference for better readability
  - Ensure text is clearly visible against backgrounds
- **Fix about page navigation bar**:
  - Improve yellow-green highlight readability
  - Ensure active state is clearly visible
  - Match contrast quality of other highlighted elements (e.g., "Vision et Mission → Explorer" button)
- **Color palette considerations**:
  - Review "old rose" color usage (Jean-Paul-1 suggestion)
  - Consider alternative: turquoise #86d2bf (suggested as complementary color)
  - Evaluate overall color harmony and accessibility
  - Ensure WCAG contrast ratio compliance

**Questions to Answer Before Implementation**:
- Should color changes be applied site-wide or page-specific?
- What's the minimum contrast ratio target? (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
- Should we maintain current brand colors or introduce new ones?

### 52. Notification Center Enhancements ⚠️ **EXISTS - Needs Enhancement**
**Status**: Full implementation exists (`account/components/notifications-preferences/`)  
**Priority**: Medium - improve user engagement and communication  
**Action**: Enhance existing notification system with additional features and polish

#### 52.1. Additional Notification Types ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - expand notification capabilities  
**Action**:
- Add notification types:
  - Product updates and new features
  - Service reminders (upcoming sessions, follow-ups)
  - Marketing/announcements (new products, special offers)
  - Community updates (if community features exist)
  - Review requests (after purchase/service)
  - Contract/invoice notifications (new documents, payment reminders)
- Create notification templates for each type
- Add notification preferences UI for each type
- Store preferences in database

**Questions to Answer Before Implementation**:
- Which notification types are priority?
- Should users be able to opt-out of all marketing notifications?
- Should some notifications be mandatory? (e.g., payment reminders, contract updates)

#### 52.2. Push Notifications (Optional) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Low - nice to have  
**Action**:
- Research browser push notification APIs (Web Push API)
- Implement push notification subscription flow
- Set up push notification service (Firebase Cloud Messaging, or custom)
- Create admin UI to send push notifications
- Handle push notification permissions and opt-in/opt-out
- Test push notifications across browsers

**Questions to Answer Before Implementation**:
- Is push notification worth the complexity?
- Which browsers support Web Push API?
- Should push notifications be opt-in only?
- How to handle mobile devices? (PWA support needed)

#### 52.3. Notification Defaults & Onboarding ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - improve user experience  
**Action**:
- Set sensible notification defaults for new users
- Create notification preferences onboarding flow
- Explain each notification type during onboarding
- Allow users to customize preferences immediately
- Save preferences and apply to all future notifications
- Show notification preferences in account settings

**Questions to Answer Before Implementation**:
- What are sensible defaults? (all on, all off, selective?)
- Should we show notification preferences during signup or after?
- Should we allow users to reset to defaults?

#### 52.4. Notification Center UI Improvements ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Low - polish existing UI  
**Action**:
- Improve notification center UI/UX:
  - Better grouping (by type, by date)
  - Mark all as read functionality
  - Filter notifications (unread, by type, by date)
  - Search notifications
  - Notification badges/counts
  - Real-time updates (if not already implemented)
- Add notification actions:
  - Quick actions from notifications (e.g., "View Invoice", "Book Session")
  - Dismiss/archive notifications
  - Snooze notifications
- Improve mobile responsiveness

**Questions to Answer Before Implementation**:
- Should notifications be grouped by type or chronologically?
- How many notifications to show? (pagination, infinite scroll?)
- Should we archive old notifications or delete them?

#### 52.5. Email Notification Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - ensure users receive important notifications  
**Action**:
- Link in-app notifications to email notifications:
  - If user enables email for notification type, send email
  - If user disables email, only show in-app
  - Respect user preferences for each notification type
- Create email notification templates:
  - Match in-app notification content
  - Include action buttons/links
  - Unsubscribe options
- Test email delivery and formatting

**Questions to Answer Before Implementation**:
- Should email notifications be separate from in-app preferences?
- Should some notifications always send email? (e.g., payment reminders)
- How to handle email delivery failures?

**Potential Issues**:
- Push notification browser support (not all browsers support it)
- Push notification permissions (users may deny)
- Email deliverability (spam filters, bounce handling)
- Notification spam (too many notifications = users disable all)
- Performance (real-time updates may impact performance)

### 54. Stories & Review System ⚠️ **HIGH PRIORITY - Enhanced Based on User Feedback**
**Status**: Database schema exists (`product_reviews` table)  
**Priority**: **HIGH** - Critical feedback: missing practical examples and success stories  
**Action**: Complete review system with public stories page, user account integration, admin moderation, and home page display

**Feedback Source Integrated**: Andrew-1.md
**Key Requirements from Feedback**:
- Standalone "Stories" page in main navigation (upper right corner with other pages)
- Practical examples, not just theoretical descriptions
- Rich story format: "What was the need → How requirements were gathered → What the app does → How it helped"
- Video support for stories (not just written content)
- Initial example stories: Rytmo app (wife's workout need), Andrew's project

#### 54.1. Main Navigation Menu Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - needs to be accessible  
**Action**:
- Add "Stories" link to main navigation menu (`components/navigation-menu/`)
- Add translation keys for "Stories" in all languages
- Ensure proper active state highlighting
- Mobile menu integration

#### 54.2. Stories Page (`/stories/`) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - main public-facing page  
**Action**:
- Create `/stories/index.html` page
- **Navigation placement**: Standalone page accessible from main navigation (upper right corner), not sub-page under About
- **Rich story format support** (from Andrew's feedback):
  - Story template structure: "What was the need → How requirements were gathered → What the app does → How it helped"
  - Support for detailed narrative stories, not just short reviews
  - Video support: Allow video uploads/embeds for stories
  - Rich text formatting for story content
  - Multiple media types: text, images, video
- Display approved reviews/stories with rich formatting
- Filtering options (by product, rating, date, featured)
- Sorting options (newest, highest rated, most helpful)
- Pagination or infinite scroll
- Featured stories section at top
- Story/review cards with: user avatar, name, rating, product, date, comment/story, video (if available)
- "Verified Purchase" badges
- Link to product pages from reviews
- Responsive design (mobile, tablet, desktop)
- SEO optimization (meta tags, structured data for reviews)

**Questions to Answer Before Implementation**:
- How many reviews/stories per page? (10, 20, 50?)
- Should we show story excerpts or full text?
- Should users be able to mark stories/reviews as "helpful"?
- Should we allow replies to reviews?
- Display format? (cards, list, grid?)
- Video hosting: self-hosted or YouTube/Vimeo embeds?

#### 54.3. Example Stories Creation (Admin) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for initial content  
**Action**:
- Admin UI to create example/review stories
- Allow admin to create reviews on behalf of users (or as "BitMinded Team")
- Mark example stories appropriately (maybe `is_featured = true` and special flag)
- **Create initial set of example stories** (from Andrew's feedback):
  - **Rytmo app story**: Wife's workout need → how requirements were gathered → what the app does → how it helped with workouts
  - **Andrew's project story**: Work done for Andrew → requirements gathering → solution → impact
  - Both should follow story format: "What was the need → How requirements were gathered → What the app does → How it helped"
- Support rich text formatting in review comments/stories
- Upload images/media for stories
- **Video upload/embed support**: Allow videos to be added to stories
- Story template form that guides through the story format structure

**Questions to Answer Before Implementation**:
- Should example stories be clearly marked as "Example" or "Featured"?
- Should admin-created stories require a user_id or can they be anonymous?
- Should we allow admin to create reviews for products that don't exist yet?
- How to structure video content in database? (URL, embed code, or file storage?)

#### 54.4. Review Submission from Multiple Places ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - users need easy ways to review  
**Action**:
- **From Product Pages**: Add "Write a Review" button on catalog product detail pages
- **From User Account**: "My Reviews" section with "Add Review" for owned products
- **From Email Prompts**: Post-purchase email with review request link
- **From Admin**: Manual review entry for example stories
- Review form component (reusable):
  - Product selector (if not from product page)
  - Star rating (1-5)
  - Review text (rich text editor)
  - Optional: Upload images
  - Submit button
- Validation: Only allow reviews for products user owns (verified purchase)
- Success confirmation and redirect

**Questions to Answer Before Implementation**:
- Should we allow reviews without purchase? (probably not, but need to decide)
- Should we allow editing reviews after submission?
- Should we allow deleting reviews?
- Time limit for review submission after purchase? (e.g., within 1 year)

#### 54.5. User Account: My Reviews Section ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - users need to manage their reviews  
**Action**:
- Add new section to account layout (`account/components/reviews/`)
- Add "Reviews" nav item to account sidebar
- Display all user's reviews (pending, approved, rejected)
- Show review status badges
- Allow editing pending reviews
- Allow deleting own reviews (with confirmation)
- Show which reviews are featured
- Link to product pages
- Link to public review on stories page
- Filter by status (all, pending, approved, rejected)
- Sort by date, product, rating

**Questions to Answer Before Implementation**:
- Should users be notified when their review is approved/rejected?
- Should users be able to edit approved reviews? (probably not, but maybe within X days)
- Should we show review analytics to users? (views, helpful votes, etc.)

#### 54.6. Admin: Review Moderation Interface ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for content quality  
**Action**:
- Add review management to admin panel
- List all reviews with filters (status, product, user, date)
- Review detail view with:
  - Full review content
  - User information
  - Product information
  - Review status
  - Admin notes field
- Moderation actions:
  - Approve review
  - Reject review (with reason)
  - Feature/unfeature review
  - Hide review (soft delete)
  - Edit review (admin override)
  - Delete review (hard delete)
- Bulk moderation actions
- Review analytics (pending count, approval rate, etc.)

**Questions to Answer Before Implementation**:
- Should rejected reviews be visible to users? (probably not)
- Should we send email notifications when reviews are approved/rejected?
- Should we require admin notes for rejections?
- Auto-approve reviews from verified purchases? (probably not, manual review is better)

#### 54.7. Admin: User Details - Reviews Display ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - admin needs to see user's review history  
**Action**:
- Add "Reviews" tab/section to admin user detail view
- Display all reviews by that user
- Show review status, product, rating, date
- Quick moderation actions from user detail page
- Link to full review moderation interface
- Review statistics (total reviews, average rating, etc.)

#### 54.8. Home Page: Reviews/Stories Section ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - social proof on homepage  
**Action**:
- Add reviews/stories section to home page (`index.html`)
- Display 3-6 featured reviews
- Carousel or grid layout
- Show: user name, rating, product, excerpt, "Read More" link
- Link to full stories page
- Responsive design
- Auto-rotate featured reviews (optional)

**Questions to Answer Before Implementation**:
- How many reviews to show on home page? (3, 6, 9?)
- Should reviews auto-rotate or be static?
- Should we show reviews from all products or specific featured products?
- Update frequency? (daily, weekly, manual?)

#### 54.9. Review Analytics & Reporting ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Low - nice to have  
**Action**:
- Review statistics dashboard (admin):
  - Total reviews count
  - Average rating (overall and per product)
  - Reviews by status (pending, approved, rejected)
  - Reviews over time (chart)
  - Top rated products
  - Review submission rate
  - Approval rate
- Product-specific review analytics:
  - Average rating per product
  - Review count per product
  - Rating distribution (1-5 stars breakdown)
- Export review data (CSV)

#### 54.10. Review Notifications ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - keep users informed  
**Action**:
- Email notification when review is approved
- Email notification when review is rejected (with reason)
- In-app notification for review status changes
- Email prompt to review after purchase (X days after purchase)
- Admin notification when new review is submitted (pending moderation)

**Questions to Answer Before Implementation**:
- How many days after purchase to send review request email? (7, 14, 30?)
- Should review request emails be sent multiple times? (reminder after X days if no review?)
- Should users be able to opt-out of review request emails?

**Potential Issues**:
- Review spam prevention (rate limiting, captcha?)
- Review quality control (minimum length, profanity filter?)
- Review authenticity (prevent fake reviews)
- Database performance with many reviews (pagination, indexing)
- Image uploads for reviews (storage costs, moderation)

### 55. Marketing & Social Media Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - important for growth but low-maintenance approach  
**Action**: Integrate marketing tools into website for easy, automated social media presence without daily manual posting

#### 55.1. Social Media Profile Setup & Website Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - needs to be accessible  
**Action**:
- Set up business profiles on key platforms (LinkedIn, Facebook, Instagram, Trustpilot)
- Add social media links to website footer
- Add social sharing buttons to blog posts, product pages, success stories
- Create social media meta tags (Open Graph, Twitter Cards) for better link previews
- Add "Follow Us" section to homepage or footer
- QR code generator for business cards/flyers linking to website

**Questions to Answer Before Implementation**:
- Which platforms are priority? (LinkedIn, Facebook, Instagram, Trustpilot minimum)
- Should social links open in new tab?
- Where should social links appear? (footer, header, dedicated page?)

#### 55.2. Automated Content Publishing System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - enables low-maintenance social media presence  
**Action**:
- Research and choose social media scheduling tool (Buffer, Hootsuite, Later, or Zapier)
- Create content templates for common post types:
  - Product launches
  - Client success stories
  - Tech tips
  - Behind-the-scenes
  - Service announcements
- Build admin UI to create/schedule posts from website:
  - Post content editor
  - Platform selection (LinkedIn, Facebook, Instagram)
  - Scheduling calendar
  - Preview for each platform
  - Auto-generate posts from website events (new product, new review, etc.)
- Integration with existing content:
  - Auto-post when new product is published
  - Auto-post when new review is approved
  - Auto-post blog posts (if blog exists)
  - Auto-post service announcements

**Questions to Answer Before Implementation**:
- Which scheduling tool? (Buffer, Hootsuite, Later, Zapier, or custom?)
- Should posts be auto-generated or require approval?
- How far in advance should posts be scheduled? (1 week, 1 month?)
- Should we support different content for different platforms?

#### 55.3. Trustpilot Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - social proof is critical  
**Action**:
- Set up Trustpilot business account
- Add Trustpilot widget to website homepage
- Add Trustpilot review request to post-purchase/post-session emails
- Display Trustpilot rating in website header/footer
- Create admin UI to request reviews manually
- Auto-request reviews after successful transactions/sessions (via email)

**Questions to Answer Before Implementation**:
- When to request reviews? (immediately after, 3 days after, 7 days after?)
- Should review requests be automated or manual?
- How many review requests per customer? (one-time, or multiple?)

#### 55.4. QR Code System for Offline Marketing ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - connects offline to online  
**Action**:
- Create QR code generator component (admin UI)
- Generate QR codes for:
  - Business cards → website homepage
  - Flyers → specific service pages (tech support, commissioning)
  - Car magnet → website + special offer page
  - Merch → website + discount code
- Track QR code usage (UTM parameters, unique landing pages)
- Create landing pages for QR code traffic:
  - `/welcome` - generic welcome page
  - `/flyer-tech-support` - tech support focused
  - `/flyer-commissioning` - commissioning focused
  - `/card` - business card landing page
- Analytics tracking for QR code sources

**Questions to Answer Before Implementation**:
- Should QR codes be static or dynamic (trackable)?
- Should QR codes expire or be permanent?
- What information should landing pages show? (special offer, service info, contact form?)

#### 55.5. Social Media Content Automation ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - reduces manual work  
**Action**:
- Auto-generate social posts from website content:
  - New product published → "New app available: [product name]"
  - New review approved → "Thank you [customer] for the review! ⭐⭐⭐⭐⭐"
  - Blog post published → "New blog post: [title] - [link]"
  - Service completed → "Helped [customer type] with [service type] today!"
- Create post templates with variables:
  - `{{product_name}}`, `{{customer_name}}`, `{{service_type}}`, etc.
- Admin UI to review/approve auto-generated posts before publishing
- Batch scheduling: create multiple posts at once, schedule for week/month

**Questions to Answer Before Implementation**:
- Should auto-generated posts require approval or publish automatically?
- How often should auto-posts be created? (daily, weekly, on events?)
- Should we support different post styles/formats per platform?

#### 55.6. Email-to-Social Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Low - nice to have  
**Action**:
- Allow posting to social media via email (using services like Buffer email-to-post)
- Create email templates for social posts
- Send scheduled posts via email for approval/publishing

**Questions to Answer Before Implementation**:
- Is email-to-post needed, or is admin UI sufficient?
- Should this be a priority or can it wait?

**Potential Issues**:
- Social media API rate limits
- Content moderation (auto-generated posts may need review)
- Platform-specific formatting requirements
- Cost of social media scheduling tools
- GDPR compliance for social media data

### 56. Marketing Analytics Planning & Setup ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - must be ready before Phase 8 Analytics Dashboard  
**Action**: Plan and implement marketing analytics tracking to feed into Phase 8 Analytics Dashboard

#### 56.1. Marketing Attribution & Source Tracking ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - foundation for marketing analytics  
**Action**:
- Implement UTM parameter tracking system:
  - Track `utm_source` (facebook, linkedin, flyer, business_card, etc.)
  - Track `utm_medium` (social, email, print, referral, etc.)
  - Track `utm_campaign` (product_launch, tech_support_promo, etc.)
  - Track `utm_content` (specific ad/post identifier)
  - Track `utm_term` (keyword if applicable)
- Store UTM parameters in user session/cookies
- Link UTM parameters to user signups and purchases
- Create database schema for marketing attribution:
  - `marketing_sources` table (source, medium, campaign, first_visit, conversions)
  - Link to `user_profiles` table (first_source, last_source)
  - Link to `product_purchases` table (source_at_purchase)

**Questions to Answer Before Implementation**:
- How long should UTM parameters be stored? (session, 30 days, permanent?)
- Should we track multiple sources per user (first touch, last touch, multi-touch)?
- Should we track offline sources (QR codes, business cards) differently?

#### 56.2. Marketing Event Tracking ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for analytics  
**Action**:
- Track marketing-related events:
  - Social media clicks (from website)
  - QR code scans
  - Landing page visits (from marketing sources)
  - Email opens/clicks (if email marketing)
  - Ad impressions/clicks (if running ads)
  - Referral signups
- Store events in `product_analytics` table or new `marketing_events` table
- Event types to track:
  - `social_click` (platform, post_id, destination)
  - `qr_scan` (qr_code_id, destination)
  - `landing_page_visit` (source, medium, campaign)
  - `email_open`, `email_click` (campaign_id, link)
  - `ad_impression`, `ad_click` (ad_id, platform)

**Questions to Answer Before Implementation**:
- Should we use existing `product_analytics` table or create separate `marketing_events` table?
- How detailed should event tracking be? (every click, or just conversions?)
- Should we track anonymous events or only authenticated user events?

#### 56.3. Conversion Funnel Tracking ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for marketing ROI  
**Action**:
- Track marketing conversion funnel:
  1. Marketing source visit (UTM tracked)
  2. Landing page view
  3. Service page view
  4. Contact form submission / Consultation request
  5. Email signup
  6. Account creation
  7. Purchase / Booking
- Link each step to original marketing source
- Calculate conversion rates per source/medium/campaign
- Store funnel data for Phase 8 Analytics Dashboard

**Questions to Answer Before Implementation**:
- Should we track full funnel or just key conversion points?
- How to handle multi-session conversions? (cookie tracking, user accounts)
- Should we track time-to-conversion?

#### 56.4. Social Media Analytics Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - nice to have  
**Action**:
- Research social media API access (LinkedIn, Facebook, Instagram)
- Plan integration with social media analytics:
  - Follower growth
  - Post engagement (likes, comments, shares)
  - Reach/impressions
  - Click-through rates
  - Best performing content
- Store social media metrics in database (for Phase 8 dashboard)
- Consider using third-party tools (Buffer Analytics, Hootsuite Analytics) if APIs are complex

**Questions to Answer Before Implementation**:
- Which platforms have accessible APIs? (LinkedIn, Facebook, Instagram)
- Should we use third-party analytics tools or build custom?
- How often should we sync social media data? (daily, weekly?)

#### 56.5. Marketing ROI Calculation ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - needed for decision making  
**Action**:
- Plan ROI calculation system:
  - Cost per acquisition (CPA) by source
  - Revenue per source
  - Return on ad spend (ROAS) if running ads
  - Lifetime value (LTV) by source
- Link marketing costs to sources:
  - Ad spend (Facebook, LinkedIn, etc.)
  - Tool costs (scheduling tools, design tools)
  - Time investment (estimate)
- Calculate metrics:
  - `revenue / cost = ROI`
  - `(revenue - cost) / cost = ROAS`
  - `total_revenue / conversions = LTV`

**Questions to Answer Before Implementation**:
- How to track marketing costs? (manual entry, API integration?)
- Should we include time costs or just monetary costs?
- What's the minimum data needed for meaningful ROI calculations?

**Potential Issues**:
- Attribution complexity (first touch vs last touch vs multi-touch)
- Privacy regulations (GDPR, cookie consent)
- Data accuracy (bot traffic, invalid clicks)
- API rate limits for social media platforms
- Cost of analytics tools vs building custom

---

## 📊 **Phase 8: Analytics & Dashboard (LAST)**

### 57. Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build dashboard with KPIs, recent activity, quick actions

### 58. Analytics Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build analytics with real-time charts, user metrics, conversion funnels (includes marketing analytics from #56)

### 59. Admin Revenue Reports Module ✅ **SPEC UPDATED**
**Status**: SPEC.md updated with PostFinance integration requirements  
**Priority**: HIGH - Essential for financial management and compliance  
**Dependencies**: Stripe data flowing + PostFinance manual payment workflow  
**Documentation**: See [Revenue Reports SPEC](../../admin/components/revenue-reports/SPEC.md)

**Updated Requirements** (Based on Sections 15.6 & 15.7 Research):
- ✅ **Dual Payment Method Support**: Stripe payments + PostFinance bank transfers
- ✅ **Manual Payment Entry**: Form for entering PostFinance bank transfer payments
- ✅ **Invoice Reconciliation**: Pending invoices, unmatched payments dashboard
- ✅ **Financial Declaration Tracking**: 
  - Annual revenue total (monitor AVS threshold ~CHF 2,300/year)
  - Monthly revenue totals (for ORP monthly checks)
  - Threshold warnings (warning at CHF 1,500, alert at CHF 2,300)
  - ORP notes field (track monthly conversations)
- ✅ **Refund Processing**: 
  - Stripe refunds (automated via API)
  - Bank transfer refunds (manual workflow)
- ✅ **Multi-Currency Support**: CHF (primary), EUR (secondary)
- ✅ **Export Formats**: CSV, PDF, JSON, camt.053 (ISO 20022 for accounting software)
- ✅ **Transaction Export**: Support PostFinance transaction export formats

**Action**: Build revenue reports component with all above features


---

## 📋 **Summary by Priority**

### 🔴 **CRITICAL (Do First)**
1. Stripe Checkout Integration (#16) - **CRITICAL - Needed for purchases**
5. Purchase Confirmation & Entitlements (#16.5) - **CRITICAL - Needed after checkout**
6. Cloudflare Worker Subdomain Protection (#16.6) - **CRITICAL - Must protect paid tools immediately**
7. Receipt System (#16.7) - **CRITICAL - Needed for all Stripe purchases**

### 🟡 **HIGH PRIORITY (Before Launch)**
1. Family Plan Payment Setup & Stripe Integration (#15.9) - **HIGH PRIORITY - Family plans are key differentiator, pricing UI complete**
3. Account subscription management (#17) - **HIGH PRIORITY - User-facing subscription management**
4. User Subscription Cancellation & Management (#17.2) - **HIGH PRIORITY - Users need to manage subscriptions**
5. Payment Method Management (#17.3) - **HIGH PRIORITY - Users need to manage payment methods**
6. User Account Receipts View (#17.1) - **HIGH PRIORITY - User needs access to receipts**
7. Service Workflows (#18-28) - **HIGH PRIORITY - Tech Support + Commissioning + Service Delivery Helper**
8. Contract System (#29-33) - **HIGH PRIORITY - Needed for commissioning agreements**
9. Invoice System (#34-42) - **HIGH PRIORITY - Needed for commissioning and large purchases**
10. Refund Processing System (#43) - **HIGH PRIORITY - Needed for customer service**

### 🟢 **MEDIUM PRIORITY (Can Do in Parallel)**
1. Subscription renewal reminders (#17.4)
2. User onboarding flow (#44)
3. Email template management UI (#45)
4. FAQ system enhancement (#46)
5. GDPR data deletion workflow (#47)
6. Admin Communication Center (#48)
7. Admin Bulk Operations verification (#49)
8. Admin Subscription Management UI (#50)
9. Multi-currency UI verification (#51)
10. Content Optimization & Translation Refinement (#53) - French copy improvements, content conciseness, redundancy reduction, color/contrast fixes
11. Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements, email integration
12. Stories & Review System (#54) - Main nav, stories page with rich format & video support, user account integration, admin moderation, home page display, example stories
13. Marketing & Social Media Integration (#55) - Social profiles, automated posting, Trustpilot, QR codes, content automation
14. Marketing Analytics Planning & Setup (#56) - Attribution tracking, event tracking, conversion funnels, ROI calculation (must be ready before Phase 8)


### ⚪ **LAST (Needs All Data)**
1. Dashboard (#57)
2. Analytics Dashboard (#58) - Includes marketing analytics from #56
3. Revenue Reports (#59)

---

## 🎯 **Recommended Implementation Order**

> **Note**: Week 1 (Production Readiness) and Week 2 (Stripe & Payment Foundation - completed items) are complete. See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) for details.

### Week 2 (Remaining): Stripe & Payment Foundation
- [ ] Family Plan Payment Setup & Stripe Integration (#15.9) - Database schema, webhook handler updates, checkout integration

### Week 3: Purchase & Checkout Flow
- [ ] Stripe Checkout Integration (#16) - Must support family plans (per #15.9)
- [ ] Purchase Confirmation & Entitlements (#16.5)
- [ ] Cloudflare Worker Subdomain Protection (#16.6) - **CRITICAL - Must protect paid tools immediately**
- [ ] Receipt System implementation (#16.7)
- [ ] Wire up to catalog access buttons

### Week 4: Account Subscription Management
- [ ] Create account subscription management component (#17)
- [ ] User subscription cancellation & management (#17.2)
- [ ] Payment method management (#17.3)
- [ ] User Account: Receipts View (#17.1)
- [ ] Subscription renewal reminders (#17.4)
- [ ] Wire up to existing data structures

### Week 5-7: Service Workflows (Tech Support + Commissioning)
- [ ] Tech Support Booking Database Schema (#18)
- [ ] Tech Support Booking Email Templates (#19)
- [ ] Tech Support Booking Edge Functions (#20)
- [ ] Tech Support Booking Public UI (#21)
- [ ] Admin Tech Support Manager (#22)
- [ ] Commission Request Database Schema (#23)
- [ ] Commission Request Form (#24)
- [ ] Commission Request Edge Functions (#25)
- [ ] Admin Commission Manager (#26)
- [ ] Commission-to-Product Conversion (#27)
- [ ] Service Delivery Helper/Workflow System (#28)

### Week 8-10: Financial Documents - Contracts
- [ ] Contract system research and planning (#29)
- [ ] Contract database schema (#30)
- [ ] Contract template system (#31)
- [ ] Contract generation and e-signature (#32)
- [ ] User Account: Contracts View (#33)

### Week 11-14: Financial Documents - Invoices
- [ ] Invoice database schema (#34)
- [ ] Invoice generation with QR-bill (#35)
- [ ] Payment plan system (#36)
- [ ] Payment matching UI (#37)
- [ ] Overdue tracking and reminders (#38)
- [ ] User Account: Invoices View (#39)
- [ ] Unified Financial Documents View (#40)
- [ ] Admin: User Financial Documents View (#41)
- [ ] Financial Document Email Notifications (#42)
- [ ] Refund Processing System (#43)

### Week 15-16: User Experience & Admin Tooling
- [ ] User onboarding flow (#44)
- [ ] Email template management UI (#45)
- [ ] FAQ system review and enhancement (#46)
- [ ] GDPR data deletion workflow (#47)
- [ ] Admin Communication Center (#48)
- [ ] Verify bulk operations (#49)
- [ ] Admin Subscription Management UI (#50)
- [ ] Content Optimization & Translation Refinement (#53) - French copy improvements, content conciseness, color/contrast fixes (HIGH PRIORITY - based on user feedback)
- [ ] Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements
- [ ] Stories & Review System (#54) - Main nav, stories page with rich format & video support, user account integration, admin moderation, home page display, example stories (HIGH PRIORITY - based on user feedback)

### Week 17-18: Marketing Integration & Analytics Setup
- [ ] Marketing & Social Media Integration (#55) - Social profiles, automated posting, Trustpilot, QR codes
- [ ] Marketing Analytics Planning & Setup (#56) - Attribution tracking, event tracking, conversion funnels, ROI calculation
- [ ] **CRITICAL**: Marketing analytics must be ready before Phase 8 Analytics Dashboard

### Week 19+: Analytics & Dashboard (LAST)
- [ ] Dashboard (#57)
- [ ] Analytics Dashboard (#58) - Includes marketing analytics from #56
- [ ] Admin Revenue Reports (#59)

---

**Note**: This order minimizes rework and ensures dependencies are met. Dashboard/analytics come last as requested, after all data sources are in place.

> **Note**: Phase 0 (Production Readiness) and Phase 1 (Content & Independent Work) are complete. See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) for details.

---
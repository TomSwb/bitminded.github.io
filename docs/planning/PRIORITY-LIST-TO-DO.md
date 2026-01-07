# 🎯 Priority List - To Do

**Last Updated**: January 2026 (Updated Family Management UI status, added Family Creation functionality requirement)  
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
- ❌ Community Page & Features (now planned in Phase 7, #55 - major feature for engagement and revenue)
- ❌ Marketing Analytics Planning & Setup (now planned in Phase 7, #57 - must be ready before Phase 8)

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
- ✅ Database schema: `family_groups`, `family_members`, `family_subscriptions` tables - **COMPLETED** (see `../payment-financial/FAMILY-PLANS-ANALYSIS.md`)
- ✅ Stripe webhook handler exists (#14) but needs family plan support

**Implementation Order** (must be completed in sequence):
1. ✅ Database Setup (15.9.1) - Foundation (Phase 2) - **COMPLETED** (see [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md))
2. ✅ Webhook Handler Updates (15.9.3) - Depends on 15.9.1 (Phase 2) - **COMPLETED** (see [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md))
3. Stripe Checkout Integration (15.9.2) - Depends on #16 (Phase 3, after #16)
4. Family Management API (15.9.3.1) - Depends on 15.9.1, 15.9.3 (Phase 4, Account Management) - **NEW REQUIREMENT**
5. Family Management UI (15.9.4) - Depends on 15.9.1, 15.9.2, 15.9.3, 15.9.3.1 (Phase 4, Account Management)

---


#### 15.9.4. Family Management UI (Account Page Component) ⚠️ **PARTIALLY COMPLETE**
**Status**: **PARTIALLY COMPLETE** - Basic component structure and empty state implemented, member management working  
**Priority**: High - Depends on 15.9.1, 15.9.2, 15.9.3, 15.9.3.1  
**Completed**:
- ✅ Component files created: `account/components/family-management/`
  - ✅ `family-management.html` - Main container with family overview and member list
  - ✅ `family-management.css` - Styling matching account page design system
  - ✅ `family-management.js` - Component logic and API calls
  - ✅ `locales/family-management-locales.json` - Translations (en, fr, de, es)
- ✅ Component integrated into account page layout
- ✅ Empty state displays correctly (fixed visibility issues)
- ✅ Family overview section (displays family name, admin, member count, subscription status)
- ✅ Family members list (displays members with roles, relationships, join dates)
- ✅ Member management (add member, remove member, update role - admin only)
- ✅ Leave family functionality (non-admin members)
- ✅ ComponentLoader integration with proper initialization

**Still Missing**:
  - **Family Creation** - ⚠️ **MISSING** (see 15.9.4.1):
      - Create family group before purchasing subscription
      - Set family name and type
      - Link to subscription purchase flow
  - **Family Name Editing** (admin only) - ⚠️ **MISSING**:
      - Edit family name in overview section
      - Update family type
  - **Family Member Invitations** (admin only) - ⚠️ **MISSING**:
      - Invite by email (for new users)
      - Invite by username (for existing users)
      - Select role when inviting (parent, member, child, guardian)
      - Select relationship (optional)
      - Send invitation email
      - View pending invitations
      - Resend/cancel invitations
  - **Transfer Admin Role** - ⚠️ **MISSING**:
      - Transfer admin role to another member (with confirmation)
  - **Family Subscription Management** - ⚠️ **PARTIALLY MISSING**:
      - ✅ View subscription status and details (implemented)
      - ✅ View billing period (implemented)
      - ✅ View plan name and pricing (implemented)
      - ⚠️ Link to subscription cancellation/update (if admin) - depends on 17.2
      - ✅ Show member count and per-member pricing (implemented)
  - **Profile Integration** - ⚠️ **MISSING**:
  - Update `account/components/profile-management/profile-management.html`:
    - Add family membership badge (if user is family member)
    - Add link to family profile
    - Show family name and role
  - Update profile display to show family membership

**UI/UX Considerations**:
- Show family section only if user is a family member or admin
- Display appropriate permissions based on user role (admin vs member)
- Handle pending invitations prominently
- Show subscription status clearly
- Make member management intuitive and safe (confirmations for destructive actions)

**Depends on**: 15.9.1 (Database Schema), 15.9.2 (Stripe Checkout), 15.9.3 (Webhook Handler), 15.9.3.1 (Family Management API)

**Related Items**:
- See also: `../payment-financial/FAMILY-PLANS-ANALYSIS.md` lines 760-787 for UI component specifications
- **Note**: This item has been moved to Phase 4 (Account Subscription Management) - see item 15.9.4 below

### 15.10. Signup Form: Require Date of Birth ⚠️ **MISSING**
**Status**: **MISSING** - DOB field not present in signup form  
**Priority**: High - Required for age verification on certain purchases  
**Action**:
- Add Date of Birth (DOB) field to signup form (`auth/components/signup-form/`)
- Use same input type and validation as account management profile section:
  - Input type: `<input type="date">`
  - Field ID: `signup-dob` (following existing naming pattern)
  - Required field validation
  - Max date validation (e.g., `max="9999-12-31"`)
- Update signup form HTML (`signup-form.html`):
  - Add DOB field after email field (before password field)
  - Include label with translation key
  - Add error display div for DOB validation
- Update signup form JavaScript (`signup-form.js`):
  - Add DOB to form elements cache
  - Include DOB in form validation
  - Include DOB in signup submission (add to user metadata or profile creation)
  - Add DOB validation (age requirements if needed)
- Update signup form translations (`locales/signup-locales.json`):
  - Add DOB label translation key for all languages (en, fr, de, es)
  - Add DOB error messages if needed
- Update signup form CSS (`signup-form.css`):
  - Ensure DOB field styling matches existing form fields
- Database integration:
  - Ensure DOB is saved to `user_profiles.date_of_birth` during signup
  - May need to update profile creation trigger/edge function to handle DOB from signup

**Reference Implementation**:
- See `account/components/profile-management/personal-info/personal-info.html` lines 12-23 for DOB field structure
- See `account/components/profile-management/personal-info/personal-info.js` for DOB handling logic

**Why This Is Needed**:
- Age verification required for certain product purchases
- Better to collect at signup rather than requiring users to complete profile later
- Ensures all users have DOB before making purchases that require age verification

**Depends on**: None - Can be implemented independently, but should be completed before Phase 3 (Purchase & Checkout Flow) to ensure DOB is available for purchase validation

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

### 15.9.2. Family Plan Stripe Checkout Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Depends on #16 (Stripe Checkout Integration)  
**Action**:
- Add family plan support to Stripe Checkout session creation (in checkout edge function from #16):
  - **CRITICAL**: Only allow family plan option for All-Tools and Supporter products (validate product_id/slug before showing family plan toggle)
  - Include family plan metadata in checkout sessions: `{ is_family_plan: 'true', family_group_id: '...', plan_name: 'family_all_tools' | 'family_supporter' }`
  - Handle per-member pricing calculation:
    - All-Tools: CHF 3.50/member/month or CHF 38.50/member/year
    - Supporter: CHF 5/member/month or CHF 55/member/year
  - Allow family member count selection in checkout flow (2-8 members recommended)
  - Calculate total price based on member count: `price = member_count × per_member_price`
  - Support both monthly and yearly family plans
  - Handle family group creation before checkout (if family doesn't exist yet)
  - Link checkout session to existing family group (if family already exists)
  - **Validation**: Ensure plan_name in metadata matches 'family_all_tools' or 'family_supporter' based on selected product
- Update checkout UI component:
  - Add family plan toggle/selector
  - Show member count selector (2-8 members)
  - Display per-member pricing breakdown
  - Show total price calculation
  - Allow adding/removing members before checkout
- Integration points:
  - Catalog access page: Family plan option in pricing toggle
  - Checkout flow: Family member count selection
  - Success page: Family group creation confirmation

**Questions to Answer Before Implementation**:
- Should family groups be created before checkout or during checkout?
- How to handle family member invitations before payment? (pre-create group with pending members?)
- Should family plan checkout allow adding members during purchase, or require pre-setup?

**Depends on**: #16 (Stripe Checkout Integration), 15.9.1 (Database Schema)

---

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
  - **Check family subscription access**: Use `has_family_subscription_access()` function to check if user has access via family plan (see 15.9.1)
  - Handle both individual and family subscriptions
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
- **Family Plan Support**:
  - Family admin can cancel family subscription (affects all members)
  - Handle member count changes (upgrade/downgrade member count)
  - Show impact of cancellation on all family members
  - Handle family subscription reactivation

**Questions to Answer Before Implementation**:
- Should cancellation be immediate or at period end by default?
- Grace period for reactivation? (7 days, 30 days?)
- Should we collect cancellation reasons?
- Prorated refunds for mid-cycle cancellations?
- How to handle family subscription cancellations? (immediate vs end of period for all members?)

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
- **Family Plan Support**:
  - Family admin manages payment method for family subscription
  - Show which payment method is used for family subscription
  - Handle payment method updates for family subscriptions
  - Notify all family members when payment method changes (optional)

**Questions to Answer Before Implementation**:
- Should users be able to remove their only payment method?
- How to handle expired cards? (automatic notification, manual update?)
- Should we support multiple payment methods per user?
- Should family members see which payment method is used for family subscription?

### 17.4. Subscription Renewal Reminders ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - reduce failed renewals  
**Action**:
- Email reminders before renewal (7 days, 3 days, 1 day)
- Payment method expiration warnings
- Renewal failure notifications
- Grace period reminders
- Renewal success confirmations
- **Family Plan Support**:
  - Send renewal reminders to family admin (primary contact)
  - Optionally notify all family members about upcoming renewal
  - Handle family subscription renewal failures (notify admin and members)
  - Show renewal status in family management UI

**Questions to Answer Before Implementation**:
- How many reminder emails? (1, 2, 3?)
- Reminder schedule? (7 days, 3 days, 1 day before renewal?)
- Should reminders include payment method update link?
- Should all family members receive renewal reminders or just admin?

### 17.1. User Account: Receipts View ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - user needs access to receipts  
**Action**:
- Create `account/components/receipts/` component
- List all receipts (Stripe purchases)

### 17.5. Upgrade Path: One-Time Purchase to Subscription ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Users need ability to upgrade from single product purchase to full subscription  
**Action**:
- **New Edge Function**: `convert-purchase-to-subscription`
  - Accept parameters: `one_time_purchase_id`, `target_subscription_plan` (e.g., 'all-tools-membership'), `subscription_interval` ('monthly' or 'yearly')
  - Verify user owns the one-time purchase
  - Calculate credit/refund for one-time purchase (business logic decision needed)
  - Create new Stripe subscription via Stripe API
  - Update database:
    - Mark one-time purchase as `status = 'converted'` in `product_purchases` table
    - Add `converted_to_subscription_id` field to link to new subscription
    - Create new `product_purchases` record with `purchase_type = 'subscription'`
    - Link to new Stripe subscription ID
  - Handle refunds/credits (if applicable - business decision needed)
  - Return new subscription details
  - Include authentication, rate limiting, error logging (following existing pattern)
- **Webhook Handler Updates** (minor):
  - Update existing webhook handler to detect conversion scenarios
  - When `checkout.session.completed` or `customer.subscription.created` fires for converted subscription:
    - Check if metadata indicates conversion or check database for linked one-time purchase
    - Update one-time purchase status if not already updated
    - Handle any edge cases specific to conversions
- **Database Schema Updates**:
  - Add `converted_to_subscription_id` field to `product_purchases` table (UUID, references `product_purchases.id` where `purchase_type = 'subscription'`)
  - Add `converted_from_purchase_id` field to `product_purchases` table (UUID, references `product_purchases.id` where `purchase_type = 'one_time'`)
  - Add index on `converted_to_subscription_id` and `converted_from_purchase_id` for efficient lookups
  - Consider adding `conversion_credit_amount` and `conversion_credit_currency` fields to track credit applied
- **UI/UX Implementation**:
  - Detect when user has one-time purchase and show upgrade option in account subscription management
  - Display upgrade CTA: "Upgrade to All-Tools Membership" with pricing difference
  - Show credit/refund calculation (if applicable)
  - Confirmation dialog explaining what happens to one-time purchase
  - Success message after conversion
  - Update subscription management UI to show converted status
- **Business Logic Decisions Needed**:
  - Should one-time purchase be fully refunded, partially credited, or no credit?
  - If credited, how to calculate credit amount? (full purchase price, prorated, percentage?)
  - Should conversion be immediate or require new payment?
  - Can users convert back? (subscription to one-time - probably not, but document decision)
  - What happens to access during conversion? (immediate access to subscription, or wait for payment confirmation?)

**Questions to Answer Before Implementation**:
- Credit/refund policy: Full refund, partial credit, or no credit for one-time purchase?
- Credit calculation: How to determine credit amount? (full price, prorated, percentage of subscription cost?)
- Payment flow: Does user pay full subscription price, or subscription price minus credit?
- Access during conversion: Immediate access to subscription, or wait for payment confirmation?
- Conversion restrictions: Can users convert multiple one-time purchases? Can they convert if they already have a subscription?
- Edge cases: What if one-time purchase was on sale? What if subscription price changed?

**Dependencies**:
- Requires #16 (Stripe Checkout Integration) for subscription creation
- Requires 17.2 (User Subscription Cancellation & Management) for subscription management UI
- Requires database schema updates (can be done in parallel)

**Integration Points**:
- Account Subscription Management UI (17) - Show upgrade option
- Receipts View (17.1) - Show conversion history
- Webhook Handler (#14) - Handle conversion subscription events

---

### 15.9.4. Family Management UI (Account Page Component) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Depends on 15.9.1, 15.9.2, 15.9.3  
**Action**:
- Create new account page section: `account/components/family-management/`
  - Component files:
    - `family-management.html` - Main container with family overview and member list
    - `family-management.css` - Styling matching account page design system
    - `family-management.js` - Component logic and API calls
    - `locales/family-management-locales.json` - Translations (en, fr, de, es)
  - Features:
    - **Family Group Overview**:
      - Display family name (editable by admin)
      - Show family admin name/avatar
      - Display current member count / max members
      - Show family subscription status (active, cancelled, expired)
      - Link to family subscription management
    - **Family Members List**:
      - Display all family members with avatars, names, roles
      - Show member status (active, pending, suspended)
      - Show relationship (parent, child, partner, etc.)
      - Show join date
      - Role badges (admin, parent, member, child)
    - **Family Member Invitations** (admin only):
      - Invite by email (for new users)
      - Invite by username (for existing users)
      - Select role when inviting (parent, member, child, guardian)
      - Select relationship (optional)
      - Send invitation email
      - View pending invitations
      - Resend/cancel invitations
    - **Family Member Management** (admin only):
      - Change member roles (with restrictions)
      - Remove members (with confirmation)
      - Transfer admin role (with confirmation)
      - View member activity (if permissions allow)
    - **Leave Family** (non-admin members):
      - Leave family group button
      - Confirmation dialog
      - Handle subscription impact (if member has individual subscription)
    - **Family Subscription Management**:
      - View subscription status and details
      - View billing period (current_period_start, current_period_end)
      - View plan name and pricing
      - Link to subscription cancellation/update (if admin)
      - Show member count and per-member pricing
- Add "Family" section to account page layout:
  - Update `account/components/account-layout/account-layout.html`:
    - Add "Family" nav item in sidebar (icon: 👨‍👩‍👧‍👦)
    - Add family section in content area
  - Update `account/components/account-layout/account-layout.js`:
    - Add 'family' to section loading logic
  - Update `account/account-page-loader.js`:
    - Add 'family' → 'family-management' component mapping
- Profile Integration:
  - Update `account/components/profile-management/profile-management.html`:
    - Add family membership badge (if user is family member)
    - Add link to family profile
    - Show family name and role
  - Update profile display to show family membership
- Edge Functions (if needed):
  - `invite-family-member` - Send invitation email and create pending member record
  - `accept-family-invitation` - Accept invitation and join family group
  - `remove-family-member` - Remove member from family (admin only)
  - `update-family-member-role` - Change member role (admin only)
  - `leave-family-group` - Leave family group (non-admin)
  - `update-family-group` - Update family name/settings (admin only)

**UI/UX Considerations**:
- Show family section only if user is a family member or admin
- Display appropriate permissions based on user role (admin vs member)
- Handle pending invitations prominently
- Show subscription status clearly
- Make member management intuitive and safe (confirmations for destructive actions)

**Depends on**: 15.9.1 (Database Schema) ✅, 15.9.2 (Stripe Checkout), 15.9.3 (Webhook Handler) ✅, 15.9.3.1 (Family Management API) ✅

**Related Items**:
- See also: `../payment-financial/FAMILY-PLANS-ANALYSIS.md` lines 760-787 for UI component specifications
- Integrates with: 17.2 (Subscription Cancellation), 17.3 (Payment Methods), 17.4 (Renewal Reminders)
- Admin interface: See 15.9.5 (Admin Family Management UI) in Phase 7

---

#### 15.9.4.1. Family Creation Functionality ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Enables users to create family groups before purchasing subscription  
**Phase**: Phase 4 - Account Management  
**Action**:
- **Add `POST /create-family` endpoint to Family Management API**:
  - Request body: `{ family_name: string, family_type?: 'household' | 'parent-child' | 'custom' }`
  - Validate user doesn't already have a family (as admin or member)
  - Create `family_groups` record with user as admin
  - Add user as admin member in `family_members` (with age validation)
  - Return `family_group_id` for UI to use
  - Reuse logic from `findOrCreateFamilyGroup()` in stripe-webhook
- **Update Family Management UI**:
  - Add "Create Family" button to empty state
  - Add modal/form for creating family (family name, type selection)
  - After creation, show success message and reload to display family UI
  - Optionally show "Purchase Subscription" CTA after family creation
- **Integration with Stripe Webhook**:
  - Verify webhook's `findOrCreateFamilyGroup()` correctly handles existing families
  - Ensure subscription links to existing family when purchasing after creation
  - Test flow: Create family → Purchase subscription → Verify webhook links correctly
- **Edge Cases**:
  - Prevent creating multiple families (user already has family)
  - Age validation (admin must be 18+)
  - Handle family creation errors gracefully

**Implementation Details**:
- **API Endpoint**: `POST /functions/v1/family-management/create-family`
- **Authentication**: JWT Bearer token required
- **Authorization**: User must not already be in a family group
- **Validation**: 
  - Family name required (min 1 char, max 100 chars)
  - Family type must be valid enum value
  - User age must be 18+ (from user_profiles.date_of_birth)
- **Response**: `{ success: true, family_group_id: string, family_name: string }`

**Files to Modify**:
- `supabase/functions/family-management/index.ts` - Add `handleCreateFamily()` function and route
- `account/components/family-management/family-management.js` - Add create family UI and API call
- `account/components/family-management/family-management.html` - Add create family modal

**Testing Requirements**:
- Test creating family as new user (no existing family)
- Test creating family when user already has family (should fail with 400)
- Test age validation (user under 18 should fail)
- Test family name validation (empty, too long, special characters)
- Test integration: Create family → Purchase subscription → Verify webhook links correctly
- Test empty state shows "Create Family" button
- Test modal form validation
- Test success flow: Create → Reload → Show family UI

**Depends on**: 15.9.1 (Database Schema) ✅, 15.9.3.1 (Family Management API) ✅  
**Required for**: Full family management workflow (create → invite → purchase)

---

#### 15.9.5. Admin Family Management UI ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Depends on 15.9.1 (Database Schema), should be completed after 15.9.4  
**Phase**: Phase 7 - Admin Tooling  
**Action**:
- Create new admin component: `admin/components/family-management/`
  - `family-management.html` - Main container with family groups list and detail view
  - `family-management.css` - Styling matching admin panel design system
  - `family-management.js` - Component logic and API calls
  - `locales/family-management-locales.json` - Translations (en, fr, de, es)
- **Family Groups List View**:
  - Display all family groups with search and filters:
    - Search by family name, admin name, admin email
    - Filter by: family type, subscription status, member count, region, age override status
    - Sort by: created date, member count, subscription status
  - Table columns:
    - Family name
    - Admin (name, email, avatar)
    - Member count (active/total)
    - Subscription status (active, canceled, etc.)
    - Plan name (family_all_tools, family_supporter)
    - Age override status (badge if enabled)
    - Region (primary_region)
    - Created date
    - Actions (view details, manage)
- **Family Detail View** (click on family to view):
  - **Overview Tab**:
    - Family name (editable by admin)
    - Family type (household, parent-child, custom)
    - Admin information (name, email, avatar, link to user detail)
    - Member count (active/pending/total)
    - Max members (6, fixed)
    - Primary region
    - Age verification override status:
      - Show if override is enabled
      - Display who granted it, when, and reason
      - Buttons to grant/revoke override (admin only)
    - Created date, last updated
  - **Members Tab**:
    - List all family members (active, pending, suspended, removed):
      - User info (name, email, avatar, link to user detail)
      - Role (admin, parent, guardian, member, child)
      - Relationship
      - Age (if provided)
      - Status (active, pending, suspended, removed)
      - Verification status (is_verified)
      - Joined date
      - Invited by (if applicable)
    - Actions (admin only):
      - Remove member
      - Change role
      - Suspend/activate member
      - View member's user detail page
  - **Subscription Tab**:
    - Family subscription details:
      - Plan name (family_all_tools, family_supporter)
      - Status (active, canceled, past_due, etc.)
      - Stripe subscription ID (link to Stripe dashboard)
      - Stripe customer ID
      - Current period (start/end dates)
      - Created date
    - Actions (admin only):
      - View in Stripe
      - Cancel subscription
      - Extend subscription
      - View billing history
  - **Activity Tab**:
    - Audit trail of family actions:
      - Member additions/removals
      - Role changes
      - Subscription changes
      - Override grants/revocations
      - Who performed action, when, and why
- **Age Verification Override Management**:
  - Grant override modal:
    - Family group selection (if not already in detail view)
    - Reason field (required, for audit purposes)
    - Confirmation with warning about bypassing age requirement
    - Call `grant_age_verification_override()` function
  - Revoke override:
    - Confirmation dialog
    - Call `revoke_age_verification_override()` function
  - Display override status prominently in family detail view
- **Integration with User Detail**:
  - Add "Family" section to `admin/components/user-detail/`:
    - Show if user is a family member or admin
    - Display family name, role, status
    - Link to family detail view
    - Quick actions: view family, remove from family (if admin)
- **Integration with Subscription Management**:
  - Show family subscriptions in subscription management list
  - Filter by subscription type (individual vs family)
  - Link to family detail view from subscription row
- **Admin Actions**:
  - Create family group (for support cases)
  - Delete family group (with confirmation and member handling)
  - Transfer family admin (change admin_user_id)
  - Suspend family (suspend all members)
  - View family activity/audit log
- **Edge Functions** (if needed):
  - `admin-grant-family-age-override` - Grant age verification override
  - `admin-revoke-family-age-override` - Revoke age verification override
  - `admin-manage-family-members` - Add/remove/update family members
  - `admin-transfer-family-admin` - Transfer family admin role

**Dependencies**: 
- 15.9.1 (Database Schema) - ✅ COMPLETED
- 15.9.4 (User-facing Family Management UI) - Should be completed first for consistency
- Admin panel infrastructure (already exists)

**Reference**: 
- Database functions: `grant_age_verification_override()`, `revoke_age_verification_override()`
- Helper functions: `is_family_member()`, `is_family_admin()`, `get_active_family_members()`
- See `../payment-financial/FAMILY-PLANS-ANALYSIS.md` for family plan structure
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
- **Note**: Should integrate with family subscriptions (see 15.9.5 for family subscription management)

### 50.1. Admin Family Management UI ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - Depends on 15.9.1 (Database Schema), should be completed after 15.9.4  
**Action**: See item 15.9.5 for complete details
- **Quick Summary**: Admin interface to view/manage all family groups, grant age verification overrides, manage family members, and handle family subscriptions
- **Key Features**: Family groups list, family detail view (members, subscription, activity), age override management, integration with User Detail and Subscription Management

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

### 55. Community Page & Features ⚠️ **MISSING**
**Status**: **MISSING** - Planning complete, ready for implementation  
**Priority**: **HIGH** - Major feature for user engagement, retention, and revenue (1000+ subscribers strategy)  
**Reference**: See `../../community/README.md` for complete planning documentation (690 lines)

**Vision**: Build a thriving community that sustains BitMinded through volume, engagement, and shared values. The community page is the foundation of BitMinded's sustainability model with a volume strategy targeting 1000+ subscribers at CHF 5-8/month.

**Prerequisites** (MUST COMPLETE FIRST):
- ✅ Review system (#54) - Community includes reviews as a core feature
- ✅ User authentication and profiles (Supabase Auth)
- ✅ Subscription system (Stripe integration for Supporter Tier)
- ✅ Account page structure (for member profile integration)

**Implementation Order** (14-week phased approach):
1. Phase 1: Foundation (Weeks 1-2) - Community structure and navigation
2. Phase 2: Reviews System (Weeks 3-4) - Tool and service reviews (builds on #54)
3. Phase 3: Discussion Forums (Weeks 5-6) - Community discussions and knowledge sharing
4. Phase 4: Member Profiles (Weeks 7-8) - User profiles and activity tracking
5. Phase 5: Supporter Tier Integration (Weeks 9-10) - Exclusive benefits and features
6. Phase 6: Community Guidelines & Moderation (Weeks 11-12) - Guidelines and moderation system
7. Phase 7: Polish & Launch (Weeks 13-14) - Final polish and launch preparation

---

#### 55.1. Community Page Foundation ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - needs to be accessible  
**Phase**: Phase 1 (Weeks 1-2)  
**Action**:
- Create `/community/` directory structure
- Set up community page HTML/CSS/JS (`community/index.html`, `community.css`, `community.js`)
- Create community page loader (`community/community-page-loader.js`)
- Add "Community" link to main navigation menu (`components/navigation-menu/`)
- Create basic community hub layout with:
  - Community stats display (members, active users, reviews, discussions)
  - Featured content section (popular reviews, active discussions, new members)
  - Quick links to reviews, discussions, member profiles
  - Community guidelines and values section
  - Recent activity feed
- Set up translation system (`community/lang-community/` with locales)
- Add community link to footer (optional)
- Responsive design (mobile, tablet, desktop)
- SEO optimization (meta tags, structured data)

**Questions to Answer Before Implementation**:
- Should community page be accessible to non-logged-in users? (probably yes, but some features require login)
- What community stats to display? (member count, active users, total reviews, recent discussions)
- How to handle community page when no content exists yet? (placeholder content, example data?)

---

#### 55.2. Community Reviews System Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - builds on #54 review system  
**Phase**: Phase 2 (Weeks 3-4)  
**Depends on**: #54 (Stories & Review System)  
**Action**:
- Integrate review system from #54 into community page
- Create community reviews section:
  - Display tool reviews (from `product_reviews` table)
  - Display service reviews (commissioning, guidance services)
  - Review filtering (by rating, date, helpfulness, product/service)
  - Review sorting (newest, highest rated, most helpful)
  - Review pagination or infinite scroll
- Add review submission from community page
- Link reviews to member profiles
- Display review statistics (total reviews, average ratings, review distribution)
- Add "Helpful" voting system for reviews
- Review moderation integration (admin approval workflow)
- Review reporting/flagging system

**Integration Points**:
- Use existing `product_reviews` table from #54
- Extend review system to support service reviews (commissioning, guidance)
- Link reviews to community member profiles
- Display reviews in community hub and dedicated reviews section

**Questions to Answer Before Implementation**:
- Should service reviews use same table as product reviews or separate table?
- How to handle review moderation workflow? (admin approval, auto-approve verified purchases?)
- Should reviews be editable by users after submission?
- Review spam prevention strategy? (rate limiting, captcha, moderation queue)

---

#### 55.3. Discussion Forums System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - core community engagement feature  
**Phase**: Phase 3 (Weeks 5-6)  
**Action**:
- Create database schema for discussions:
  - `community_discussions` table (threads)
  - `community_discussion_comments` table (replies/comments)
  - Discussion categories, tags, upvotes/downvotes
- Create discussion forum UI:
  - Discussion categories (Tool Discussions, Feature Requests, Tips & Tricks, Digital Wellbeing, General Discussion, Support & Help)
  - Thread-based discussions with replies
  - Comment threading and nested replies
  - Upvote/downvote system
  - Mark as solved/helpful functionality
  - Search and filtering (by category, tag, date, popularity)
  - Tag system for discussions
  - Discussion pagination
- Discussion creation form:
  - Category selection
  - Title and content (rich text editor)
  - Tag selection/creation
  - Mark as question/feature request/discussion
- Discussion moderation:
  - Admin approval for new discussions (optional)
  - Edit/delete discussions (author and admin)
  - Report/flag inappropriate content
  - Spam detection and filtering
- Discussion display:
  - Discussion list with previews
  - Full discussion view with all comments
  - Comment sorting (newest, oldest, most upvoted)
  - Comment pagination
  - User avatars and names
  - Discussion metadata (views, replies, upvotes, solved status)

**Database Schema Requirements**:
- `community_discussions` table: id, user_id, category, title, content, tags, status, views, upvotes, downvotes, is_solved, solved_by, created_at, updated_at
- `community_discussion_comments` table: id, discussion_id, user_id, parent_comment_id, content, upvotes, downvotes, is_solution, created_at, updated_at
- `community_discussion_tags` table: id, name, slug, description
- `community_discussion_votes` table: id, discussion_id/comment_id, user_id, vote_type (upvote/downvote), created_at

**Questions to Answer Before Implementation**:
- Should discussions require admin approval? (probably not for logged-in users, but need moderation)
- How to handle discussion spam? (rate limiting, moderation queue, automated detection)
- Should users be able to edit/delete their own discussions? (yes, within time limit?)
- Discussion notification system? (notify on replies, mentions, etc.)
- Should discussions be searchable? (full-text search, tag search, category filter)

---

#### 55.4. Member Profiles & Activity Tracking ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - important for community engagement  
**Phase**: Phase 4 (Weeks 7-8)  
**Action**:
- Create member profile pages (`/community/members/[user_id]/`):
  - User profile information (avatar, name, bio, member since date)
  - Activity history (reviews written, discussions created, comments made)
  - Badges and achievements system
  - Tool subscriptions display
  - Review history (all reviews by user)
  - Discussion contributions (discussions created, comments made)
  - Community stats (helpful votes received, contributions count)
- Activity tracking system:
  - Track user activity (reviews, discussions, comments, votes)
  - Activity feed on profile page
  - Recent activity on community hub
- Badges and achievements:
  - Badge system (First Review, Helpful Reviewer, Active Member, Supporter, etc.)
  - Achievement tracking and display
  - Badge icons and descriptions
- Member search and discovery:
  - Member directory/list
  - Search members by name, activity, badges
  - Filter by activity level, member since date
  - Sort by activity, contributions, member since
- Link member profiles to:
  - Account page (link to community profile)
  - Reviews (show reviewer profile)
  - Discussions (show author profile)
  - Comments (show commenter profile)

**Database Schema Requirements**:
- Extend `user_profiles` table or create `community_member_profiles`:
  - bio, avatar_url, badges, achievements, activity_stats
- `community_badges` table: id, name, description, icon, criteria
- `community_member_badges` table: id, user_id, badge_id, earned_at
- `community_activity_log` table: id, user_id, activity_type, activity_id, created_at

**Questions to Answer Before Implementation**:
- Should member profiles be public or private? (probably public for community members)
- What information to display on public profiles? (name, avatar, activity, but not email/private info)
- How to calculate activity stats? (reviews count, discussions count, helpful votes, etc.)
- Badge criteria? (automatic based on activity, or manual assignment?)
- Should users be able to customize their profile? (bio, avatar, preferences)

---

#### 55.5. Supporter Tier Community Benefits ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - key revenue driver and value proposition  
**Phase**: Phase 5 (Weeks 9-10)  
**Depends on**: Subscription system, Supporter Tier pricing  
**Action**:
- Create Supporter Tier benefits page/section:
  - Display all Supporter Tier benefits
  - Exclusive content access indicators
  - Supporter badge on profiles
- Quarterly Behind-the-Scenes Sessions:
  - Session scheduling system
  - Live Q&A session interface (or recorded sessions)
  - Upcoming features preview section
  - Development insights content
  - Community feedback collection
  - Session recording/archive (for supporters who miss live session)
- 30-Minute Guidance Calls:
  - Guidance call booking system (calendar integration)
  - One-on-one session scheduling
  - Session notes and follow-up
  - Call history tracking
  - Quarterly limit enforcement (1 call per quarter)
- Exclusive Access Features:
  - Early access to new tools (beta access)
  - Beta testing opportunities
  - Private discussion forums (Supporter-only)
  - Direct feedback channel to developer
  - Supporter-only content section
- Supporter Recognition:
  - Supporter badge on profile
  - Supporter-only member list
  - Recognition in community hub
  - Special Supporter forum access

**Integration Points**:
- Stripe subscription check (verify Supporter Tier subscription)
- Account page integration (show Supporter benefits)
- Community page integration (Supporter-only sections)
- Calendar/scheduling system for guidance calls
- Video/streaming platform for quarterly sessions (or simple video uploads)

**Questions to Answer Before Implementation**:
- How to schedule quarterly sessions? (fixed dates, user voting, admin selection?)
- Guidance call booking: Use existing calendar system or build new?
- How to handle session recordings? (video hosting, access control)
- Early access: How to grant beta access to tools? (special product access, beta flag)
- Private forums: Separate forum section or just access control on existing forums?

---

#### 55.6. Community Guidelines & Moderation System ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - essential for community health  
**Phase**: Phase 6 (Weeks 11-12)  
**Action**:
- Create community guidelines page:
  - Community values (respect, kindness, patience)
  - Code of conduct
  - Review guidelines and policies
  - Discussion rules and etiquette
  - Moderation policies
  - Reporting process
  - Consequences for violations
- Content moderation system:
  - Review moderation (approval, editing, deletion) - integrates with #54
  - Discussion moderation (approval, editing, deletion, locking)
  - Comment moderation (approval, editing, deletion)
  - Spam detection and filtering
  - Automated moderation rules (keyword filtering, rate limiting)
- Reporting and flagging system:
  - Report inappropriate content (reviews, discussions, comments)
  - Flag spam or abuse
  - Report user behavior
  - Admin moderation queue
  - Report resolution workflow
- Moderation tools (Admin):
  - Moderation dashboard
  - Pending content queue
  - Reported content queue
  - User moderation actions (warnings, temporary bans, permanent bans)
  - Moderation history and logs
  - Bulk moderation actions

**Database Schema Requirements**:
- `community_reports` table: id, reporter_id, reported_content_type, reported_content_id, reason, status, resolved_by, resolved_at, created_at
- `community_moderation_actions` table: id, moderator_id, target_user_id, action_type, reason, duration, created_at
- `community_moderation_log` table: id, moderator_id, action_type, target_type, target_id, details, created_at

**Questions to Answer Before Implementation**:
- Moderation workflow? (admin-only, or community moderators?)
- Automated moderation rules? (keyword filtering, spam detection, rate limiting)
- User ban system? (temporary bans, permanent bans, appeal process)
- How to handle false reports? (report abuse tracking)
- Moderation transparency? (show moderation actions, or keep private?)

---

#### 55.7. Community Page Integration & Navigation ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - needs to be accessible  
**Phase**: Phase 1 (but can be enhanced throughout)  
**Action**:
- Navigation menu integration:
  - Add "Community" link to main navigation (alongside Services, Catalog, Support)
  - Make accessible to all users (logged in and logged out, with different features)
  - Show community stats in navigation (optional: member count, activity indicator)
- Catalog integration:
  - Add reviews section to tool pages (link to community reviews)
  - Display review ratings and counts on tool cards
  - Link to community reviews from tool pages
- Service pages integration:
  - Add reviews section to service pages (commissioning, guidance)
  - Display service reviews on service pages
  - Link to community reviews from service pages
- Account page integration:
  - Link to community profile from account page
  - Show community activity on account page
  - Display reviews and discussions on account page
  - Show Supporter Tier benefits on account page
- Homepage integration:
  - Display featured reviews on homepage
  - Show community stats on homepage (members, activity)
  - Link to community page from homepage
  - Highlight Supporter Tier benefits on homepage

**Questions to Answer Before Implementation**:
- Where to place community link in navigation? (main nav, footer, both?)
- Should community stats be visible to non-members? (probably yes for social proof)
- How to handle community features for non-logged-in users? (read-only access, login prompts)

---

#### 55.8. Community Analytics & Success Metrics ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - important for measuring success  
**Phase**: Phase 7 (Weeks 13-14) or Phase 8 (Analytics Dashboard)  
**Action**:
- Community growth metrics:
  - Number of community members (total, active, new per month)
  - Active users (daily, weekly, monthly active)
  - Community engagement (reviews, discussions, contributions)
  - Community retention (monthly, quarterly, yearly)
  - Community growth rate (new members per month)
- Engagement metrics:
  - Reviews written (per tool, per service, total)
  - Discussions created (per category, per topic, total)
  - Comments and replies (per discussion, per review, total)
  - Helpful votes (per review, per discussion, total)
  - Member activity (reviews, discussions, contributions per user)
- Revenue metrics:
  - Subscription conversions (free to paid, All-Tools to Supporter)
  - Subscription retention (monthly, quarterly, yearly)
  - Revenue per subscriber (monthly, yearly)
  - Lifetime value (per subscriber)
  - Supporter Tier conversion rate
- Community health metrics:
  - Community satisfaction (surveys, feedback)
  - Community moderation (reports, flags, bans, resolution time)
  - Community guidelines compliance (violations, warnings)
  - Community diversity (members, contributions, perspectives)
  - Community advocacy (word-of-mouth, referrals)

**Integration Points**:
- Phase 8 Analytics Dashboard (feed community metrics to dashboard)
- Admin dashboard (community stats widget)
- Community hub (public stats display)

**Questions to Answer Before Implementation**:
- What metrics are most important to track? (prioritize based on business goals)
- How to measure community satisfaction? (surveys, NPS, feedback forms)
- How to track word-of-mouth and referrals? (referral codes, tracking links)
- Analytics dashboard integration? (separate community analytics or part of main dashboard)

---

**Success Metrics** (from planning document):
- **Volume Strategy**: 1000+ subscribers at CHF 5-8/month = CHF 5,000-8,000/month revenue
- **Community Growth**: Active, engaged community members
- **Engagement**: High review and discussion participation
- **Retention**: Low churn, high lifetime value
- **Advocacy**: Word-of-mouth growth and referrals

**Potential Issues**:
- Moderation workload (as one person, need efficient moderation tools)
- Spam and abuse prevention (automated detection, clear guidelines)
- Community growth strategy (how to attract initial members)
- Content quality control (ensure valuable discussions and reviews)
- Scaling considerations (plan for 1000+ members, performance optimization)

**Related Items**:
- #54 (Stories & Review System) - Community includes reviews
- #17 (Account Subscription Management) - Supporter Tier integration
- #52 (Notification Center Enhancements) - Community notifications
- Phase 8 Analytics Dashboard - Community metrics integration

### 56. Marketing & Social Media Integration ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Medium - important for growth but low-maintenance approach  
**Action**: Integrate marketing tools into website for easy, automated social media presence without daily manual posting

#### 56.1. Social Media Profile Setup & Website Integration ⚠️ **MISSING**
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

#### 56.2. Automated Content Publishing System ⚠️ **MISSING**
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

#### 56.3. Trustpilot Integration ⚠️ **MISSING**
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

#### 56.4. QR Code System for Offline Marketing ⚠️ **MISSING**
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

#### 56.5. Social Media Content Automation ⚠️ **MISSING**
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

#### 56.6. Email-to-Social Integration ⚠️ **MISSING**
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

### 57. Marketing Analytics Planning & Setup ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - must be ready before Phase 8 Analytics Dashboard  
**Action**: Plan and implement marketing analytics tracking to feed into Phase 8 Analytics Dashboard

#### 57.1. Marketing Attribution & Source Tracking ⚠️ **MISSING**
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

#### 57.2. Marketing Event Tracking ⚠️ **MISSING**
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

#### 57.3. Conversion Funnel Tracking ⚠️ **MISSING**
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

#### 57.4. Social Media Analytics Integration ⚠️ **MISSING**
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

#### 57.5. Marketing ROI Calculation ⚠️ **MISSING**
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

### 58. Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build dashboard with KPIs, recent activity, quick actions

### 59. Analytics Dashboard Implementation
**Status**: Only SPEC.md exists  
**Priority**: **LAST** - needs all data sources  
**Action**: Build analytics with real-time charts, user metrics, conversion funnels (includes marketing analytics from #57)

### 60. Admin Revenue Reports Module ✅ **SPEC UPDATED**
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
7. Upgrade Path: One-Time Purchase to Subscription (#17.5) - **HIGH PRIORITY - Users need ability to upgrade from single product to full subscription**
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
9. Admin Family Management UI (#15.9.5 / #50.1) - Family groups management, age override, member management
10. Multi-currency UI verification (#51)
10. Content Optimization & Translation Refinement (#53) - French copy improvements, content conciseness, redundancy reduction, color/contrast fixes
11. Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements, email integration
12. Stories & Review System (#54) - Main nav, stories page with rich format & video support, user account integration, admin moderation, home page display, example stories
13. Marketing & Social Media Integration (#55) - Social profiles, automated posting, Trustpilot, QR codes, content automation
14. Community Page & Features (#55) - Reviews, discussions, member profiles, Supporter Tier integration (14-week implementation)
15. Marketing Analytics Planning & Setup (#57) - Attribution tracking, event tracking, conversion funnels, ROI calculation (must be ready before Phase 8)


### ⚪ **LAST (Needs All Data)**
1. Dashboard (#58)
2. Analytics Dashboard (#59) - Includes marketing analytics from #57
3. Revenue Reports (#60)

---

## 🎯 **Recommended Implementation Order**

> **Note**: Week 1 (Production Readiness) and Week 2 (Stripe & Payment Foundation - completed items) are complete. See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) for details.

### Week 2 (Remaining): Stripe & Payment Foundation
- [x] Family Plan Database Schema (#15.9.1) - ✅ COMPLETED - Foundation for family plans
- [x] Family Plan Webhook Handler Updates (#15.9.3) - ✅ COMPLETED & TESTED - See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md)
  - ✅ All 10 tests passed (2026-01-05)
  - ✅ Deployed to DEV and PROD
  - ✅ Production ready

### Week 3: Purchase & Checkout Flow
- [ ] Stripe Checkout Integration (#16) - Core checkout flow
- [ ] Family Plan Stripe Checkout Integration (#15.9.2) - Add family plan support to checkout (depends on #16)
- [ ] Purchase Confirmation & Entitlements (#16.5)
- [ ] Cloudflare Worker Subdomain Protection (#16.6) - **CRITICAL - Must protect paid tools immediately** (includes family subscription checks)
- [ ] Receipt System implementation (#16.7)
- [ ] Wire up to catalog access buttons

### Week 4: Account Subscription Management
- [ ] Create account subscription management component (#17)
- [ ] User subscription cancellation & management (#17.2) - Includes family plan cancellation
- [ ] Payment method management (#17.3) - Includes family plan payment methods
- [ ] User Account: Receipts View (#17.1)
- [ ] Upgrade Path: One-Time Purchase to Subscription (#17.5) - Convert single product purchases to subscriptions
- [ ] Subscription renewal reminders (#17.4) - Includes family plan reminders
- [ ] Family Management API (#15.9.3.1) - Edge function for immediate member access granting
- [ ] Family Management UI (#15.9.4) - Account page family management component
- [ ] Wire up to existing data structures
- [ ] Integrate with Family Management API (#15.9.3.1)

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
- [ ] Admin Family Management UI (#15.9.5 / #50.1) - Family groups management, age override, member management
- [ ] Content Optimization & Translation Refinement (#53) - French copy improvements, content conciseness, color/contrast fixes (HIGH PRIORITY - based on user feedback)
- [ ] Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements
- [ ] Stories & Review System (#54) - Main nav, stories page with rich format & video support, user account integration, admin moderation, home page display, example stories (HIGH PRIORITY - based on user feedback)

### Week 17-18: Marketing Integration & Analytics Setup
- [ ] Marketing & Social Media Integration (#55) - Social profiles, automated posting, Trustpilot, QR codes
- [ ] Community Page & Features (#55) - Reviews, discussions, member profiles, Supporter Tier integration
- [ ] Marketing Analytics Planning & Setup (#57) - Attribution tracking, event tracking, conversion funnels, ROI calculation
- [ ] **CRITICAL**: Marketing analytics must be ready before Phase 8 Analytics Dashboard

### Week 19+: Analytics & Dashboard (LAST)
- [ ] Dashboard (#58)
- [ ] Analytics Dashboard (#59) - Includes marketing analytics from #57
- [ ] Admin Revenue Reports (#60)

---

**Note**: This order minimizes rework and ensures dependencies are met. Dashboard/analytics come last as requested, after all data sources are in place.

> **Note**: Phase 0 (Production Readiness) and Phase 1 (Content & Independent Work) are complete. See [PRIORITY-LIST-COMPLETED-ITEMS.md](./PRIORITY-LIST-COMPLETED-ITEMS.md) for details.

---
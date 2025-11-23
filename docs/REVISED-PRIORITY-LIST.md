# 🎯 Revised Priority List - Based on Actual Implementation Status

**Last Updated**: November 21, 2025 (Reorganized for logical workflow grouping)  
**Based on**: Actual codebase investigation (not just READMEs)

**Organization Philosophy**: Related workflows are grouped together (e.g., Tech Support + Commissioning in Phase 5, Contracts + Invoices in Phase 6) to ensure logical implementation order and minimize context switching.

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
- ✅ Product Wizard Steps 1-7 (All steps fully implemented, tested, and working - includes GitHub, Stripe, Cloudflare automation with edge functions)
- ✅ Stripe integration (product/service creation, subscription support, multi-currency, sale prices, trial periods)

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
- ❌ Cloudflare Worker Subdomain Protection (now in Phase 3, #16.6 - CRITICAL for protecting paid tools)
- ❌ Notification Center Enhancements (now in Phase 7, #52)
- ❌ Stories & Review System (now planned in Phase 7, #54)
- ❌ Marketing & Social Media Integration (now planned in Phase 7, #55)
- ❌ Marketing Analytics Planning & Setup (now planned in Phase 7, #56 - must be ready before Phase 8)

### ✅ **Partially Implemented / Needs Enhancement**
- ⚠️ FAQ system (exists but may need expansion)
- ⚠️ GDPR data deletion (account deletion exists, workflow incomplete)
- ✅ Multi-currency support (database implemented, verify UI)

### ✅ **Recently Completed**
- ✅ Production readiness fixes (hardcoded keys confirmed safe, localhost fallback fixed via Edge Function)
- ✅ SEO files (robots.txt, sitemap.xml created)
- ✅ Production security cleanup (console logs, security TODOs)
- ✅ Stripe Webhook Handler implemented (29 events, production-ready)
- ✅ CLI Tools Available: Stripe CLI (v1.32.0) and Supabase CLI (v2.58.5) installed, authenticated, and ready for testing/deployment

### 🛠️ **Development Tools Available**
- ✅ **Stripe CLI**: Installed and authenticated (v1.32.0) - Use for webhook testing (`stripe listen --forward-to`, `stripe trigger`). Can switch between test/live modes with `stripe config --set test_mode true/false`
- ✅ **Supabase CLI**: Installed and linked to both projects (v2.58.5) - Use for function deployment (`supabase functions deploy`) and project management. Linked to DEV (eygpejbljuqpxwwoawkn) and PROD (dynxqnrkmjcvgzsugxtm)
- ✅ **Docker**: Installed (v29.0.2) - Required for Supabase local development and schema comparisons. Note: May need `sudo` or docker group membership for some operations
- ✅ **Cloudflare Wrangler CLI**: Installed as dev dependency (v4.50.0) - Use for Cloudflare Workers testing/deployment (`npx wrangler deploy`, `npx wrangler dev`)
- 📝 See `/supabase/functions/stripe-webhook/TESTING-GUIDE.md` for complete CLI command reference and testing workflows

### 🔧 **Automation Scripts Available** (in `supabase/scripts/`)
- ✅ **`compare-databases.sh`** - Compare dev and prod database schemas automatically
- ✅ **`compare-table-structures.sh`** - Compare specific table structures between environments
- ✅ **`sync-functions.sh`** - Deploy Edge Functions to both DEV and PROD environments
- ✅ **`install-docker.sh`** - Docker installation helper script
- ✅ **`update-secrets.sh`** - Bulk update Supabase secrets from `.env-dev` and `.env-prod` files
- ✅ **`create-stripe-webhook.sh`** - Programmatically create Stripe webhook endpoints via API (supports both test and live modes)
- ✅ **`extract-secrets.sh`** - Helper script to extract secrets from Supabase projects using Management API

### 📚 **Documentation Available** (in `supabase/docs/`)
- ✅ **`AUTOMATION-GUIDE.md`** - Guide for using automation scripts
- ✅ **`SYNC-DATABASES.md`** - Database synchronization workflow
- ✅ **`ENV-SETUP.md`** - Environment variable setup guide
- ✅ **`DOCKER-SETUP.md`** - Docker installation and setup
- ✅ **`EXTRACT-SECRETS-GUIDE.md`** - How to extract secrets from Supabase Dashboard
- ✅ **`GET-CLOUDFLARE-API-TOKEN.md`** - Guide for obtaining/rotating Cloudflare API tokens
- ✅ **`WORKFLOW.md`** - General development workflow documentation

---



## 💳 **Phase 2: Stripe & Payment Foundation**

### 13. Stripe Account Setup and Configuration ✅ **COMPLETED**
**Status**: ✅ **COMPLETED** - Fully implemented and tested  
**Priority**: Foundation for payments  
**Completed Actions**:
- ✅ Added Stripe API versioning (`Stripe-Version: '2024-11-20.acacia'`)
- ✅ Enhanced error handling with database logging (`error_logs` table)
- ✅ Added multi-currency support (CHF, USD, EUR, GBP) to products
- ✅ Created edge functions: `create-stripe-service-product`, `create-stripe-subscription-product`, `update-stripe-service-product`, `update-stripe-product`
- ✅ Added subscription support (monthly/yearly prices)
- ✅ Added trial period support (`trial_days`, `trial_requires_payment`)
- ✅ Added sale price management for products and services
- ✅ Integrated Stripe into Service Management UI
- ✅ Integrated Stripe into Product Wizard Step 5
- ✅ Enhanced `delete-stripe-product` with improved error handling

**Note**: Stripe integration is Step 5 in the Product Wizard (not Step 4). Step order: 1) Basic Info, 2) Technical Spec, 3) Content & Media, 4) GitHub, 5) Stripe, 6) Cloudflare, 7) Review & Publish.

### 14. Stripe Webhook Handler ⚠️ **IMPLEMENTED - PARTIALLY TESTED**
**Status**: ⚠️ **IMPLEMENTED & DEPLOYED** - Code complete, but only 6 of 29 events tested  
**Priority**: Critical for subscription automation  
**Completed Actions**:
- ✅ Created `/functions/stripe-webhook` edge function handling 29 events
- ✅ Webhook signature verification using Stripe SDK
- ✅ Database operations for `product_purchases` table
- ✅ Handles: checkout sessions, subscriptions, invoices, charges, refunds, disputes
- ✅ Error logging and idempotency checks
- ✅ Deployed to production (version 23)
- ✅ Testing guide created with CLI workflows
- ✅ **Test Mode Webhook**: Configured in DEV and PROD (whsec_9XuaCqZ5EKCUFOtbsID3ZEVNVIRuGWFl)
- ✅ **Live Mode Webhook**: Created in PROD only (we_1SWeS4PBAwkcNEBloBQg67bc, whsec_ntkk0iTh2adifXM8YK95MqBP9n6NxfcZ)
- ✅ Both webhooks subscribed to all 29 events
- ✅ Environment variables properly configured: `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`

**Testing Status**:
- ✅ **Tested (6 events)**: `checkout.session.completed`, `charge.succeeded`, `customer.subscription.created`, `invoice.paid`, `invoice.created`, `invoice.finalized`
- ⏳ **Pending Testing (23 events)**:
  - Subscription lifecycle: `updated`, `deleted`, `paused`, `resumed`
  - Invoice events: `updated`, `voided`, `marked_uncollectible`, `payment_action_required`, `upcoming`, `payment_failed`
  - Refund events: `created`, `failed`, `updated`, `charge.refunded`
  - Dispute events: `charge.dispute.created`, `updated`, `closed`, `funds_withdrawn`, `funds_reinstated`
  - Trial/Update events: `trial_will_end`, `pending_update_applied`, `pending_update_expired`
  - Payment events: `charge.failed`

**Next Steps**: Complete testing of remaining 23 events per `/supabase/functions/stripe-webhook/TESTING-GUIDE.md`

### 14.1. Stripe Test/Live Mode Handling ⚠️ **CRITICAL - ACTION REQUIRED**
**Status**: ⚠️ **NEEDS IMPLEMENTATION** - Code doesn't properly handle test vs live mode  
**Priority**: **CRITICAL** - Must fix before accepting live payments  
**Issue**: 
- Webhook handler doesn't check `event.livemode` to use correct webhook secret
- In PROD, `STRIPE_SECRET_KEY` is set to LIVE key, but webhook uses TEST secret
- All Stripe functions use single `STRIPE_SECRET_KEY` without mode detection
- No way to control test vs live mode in production

**Required Actions**:
- [ ] **Fix webhook handler** to check `event.livemode` and use `STRIPE_WEBHOOK_SECRET_LIVE` or `STRIPE_WEBHOOK_SECRET_TEST` accordingly
- [ ] **Update all Stripe Edge Functions** (6 functions) to detect mode and use appropriate secret key
- [ ] **Add helper function** to determine which Stripe key to use based on environment and mode
- [ ] **Add `STRIPE_MODE` environment variable** (optional) for PROD control (test/live/auto)
- [ ] **Test webhook** with both test and live events to verify signature verification works
- [ ] **Document** the process for switching between test/live mode in production

**Current State**:
- ✅ Environment variables set: `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`
- ⚠️ PROD: `STRIPE_SECRET_KEY` = LIVE key (from backward compatibility)
- ⚠️ PROD: `STRIPE_WEBHOOK_SECRET` = TEST secret (will fail for live events)
- ⚠️ Code doesn't check `event.livemode` to determine which secrets to use

**Recommendation**: 
- Keep PROD on TEST mode until webhook handler is fixed and all events are tested
- Switch to LIVE mode only when ready to accept real payments
- See `/supabase/docs/STRIPE-TEST-LIVE-MODE-ANALYSIS.md` for detailed analysis and implementation plan

### 15. Stripe Products/Prices Setup ✅ **COMPLETED**
**Status**: ✅ **COMPLETED** - Fully implemented, tested, and integrated into Product Wizard Step 5  
**Priority**: Foundation for checkout  
**Completed Actions**:
- ✅ Enhanced product creation for multi-currency (CHF, USD, EUR, GBP)
- ✅ Added subscription pricing support (monthly/yearly)
- ✅ Added sale price creation and management
- ✅ Created update functions for products and services
- ✅ Added reduced fare pricing support for services
- ✅ Fully integrated into Product Wizard Step 5 with all features working
- ⏳ Still need: Verify integration with checkout flow (when checkout is implemented)

### 15.5. Product Wizard Steps 1-7 Verification & Completion ✅ **FULLY COMPLETED**
**Status**: ✅ **ALL STEPS COMPLETED AND TESTED**  
**Priority**: Complete all wizard steps  
**Completed Actions**:
- ✅ **Step 1 (Basic Information)**: Fully functional - product name, slug, category, description, tags, localized content
- ✅ **Step 2 (Technical Specification)**: Fully functional - AI-powered spec generation, manual editing
- ✅ **Step 3 (Content & Media)**: Fully functional - icon upload, screenshots, features, demo video, documentation URLs
- ✅ **Step 4 (GitHub)**: Fully functional - automated repository creation, branch configuration, clone instructions
- ✅ **Step 5 (Stripe)**: Fully functional and tested - multi-currency, freemium, subscription support
  - ✅ Removed enterprise pricing (all products use normal pricing)
  - ✅ Removed billing interval selector (auto-handles monthly/yearly)
  - ✅ Freemium products: hide pricing/trial sections, auto-set to 0
  - ✅ Uses `create-stripe-subscription-product` for subscriptions
  - ✅ Multi-currency price inputs for all pricing types (CHF, USD, EUR, GBP)
  - ✅ Trial period configuration for subscriptions
  - ✅ **Fixed 401 authentication error in create-stripe-product edge function** (session handling improved)
  - ✅ **Fixed delete-stripe-product to properly clear all pricing data** (pricing_type, price_amount_*, etc.)
  - ✅ **Fixed price ID preview display after product updates**
  - ✅ **Added conditional temp save button** (hidden in production, visible in dev/staging)
  - ✅ **Verified database updates persist correctly** (with verification queries)
- ✅ **Step 6 (Cloudflare)**: Fully functional with automation and clear activation guidance
  - ✅ Automated Cloudflare Worker creation via `create-cloudflare-worker` edge function
  - ✅ Subdomain configuration with live preview
  - ✅ Worker recreation functionality (use latest edge function code)
  - ✅ Comprehensive deployment setup instructions
  - ✅ GitHub Pages integration guidance
  - ✅ Expo/React Native specific deployment warnings (gh-pages branch)
  - ✅ Clear activation steps for newly created apps
  - ✅ DNS configuration guidance
  - ✅ Security enforcement documentation (access control via Supabase)
- ✅ **Step 7 (Review & Summary)**: Fully functional - comprehensive review of all steps, validation, save and publish

**Edge Functions Created**:
- ✅ `create-github-repository` - Automated GitHub repo creation
- ✅ `create-stripe-product` - Stripe product creation (one-time)
- ✅ `create-stripe-subscription-product` - Stripe subscription product creation
- ✅ `update-stripe-product` - Stripe product updates
- ✅ `delete-stripe-product` - Stripe product archiving and database cleanup
- ✅ `create-cloudflare-worker` - Automated Cloudflare Worker creation and deployment
- ✅ `update-github-repo-media` - GitHub repository media updates

**All Steps Verified**: All 7 steps are fully implemented, tested, and working correctly in production.

### 15.5.1. Product Wizard Step 5 (Stripe) Bug Fixes & Enhancements ✅ **COMPLETED**
**Status**: ✅ **COMPLETED** - All critical bugs fixed and enhancements added
**Priority**: Critical fixes completed
**Completed Actions**:
- ✅ **Fixed 401 Unauthorized error in create-stripe-product**:
  - Made user_sessions table check optional (PGRST116 error handling)
  - Added auto-creation of user_sessions records if missing
  - Improved error logging for authentication issues
  - Aligned with other edge functions' authentication patterns
- ✅ **Fixed delete-stripe-product database clearing**:
  - Added comprehensive database update verification
  - Implemented post-update verification queries
  - Fixed client-side form data overwriting database changes
  - Ensured all pricing fields (pricing_type, price_amount_*) are properly cleared
  - Added retry mechanism for uncleared fields
- ✅ **Fixed price ID preview after updates**:
  - Updated handleUpdateStripeProduct to pass complete pricing data
  - Fixed currency-specific price ID display
- ✅ **Added production environment detection**:
  - Conditionally hide temp save button in production
  - Button remains visible in dev/staging environments
  - Uses window.ENV_CONFIG.isProduction for detection

### 15.5.2. Product Wizard Step 6 (Cloudflare) Automation & Integration ✅ **COMPLETED**
**Status**: ✅ **COMPLETED** - Full automation with edge function and clear activation guidance
**Priority**: High - Critical for app deployment
**Completed Actions**:
- ✅ **Created `create-cloudflare-worker` edge function**:
  - Automated Cloudflare Worker creation
  - Worker code generation with access control
  - Integration with Supabase validate-license function
  - Automatic route configuration
- ✅ **Enhanced UI with activation guidance**:
  - Step-by-step deployment instructions
  - GitHub Pages integration guidance
  - DNS configuration instructions
  - Subdomain route setup instructions
  - Expo/React Native specific warnings (gh-pages branch)
- ✅ **Worker recreation functionality**:
  - Recreate worker with latest edge function code
  - Update existing workers automatically
- ✅ **Clear next steps for app activation**:
  - Instructions on what to do after worker creation
  - Cloudflare Dashboard links and guidance
  - Security enforcement documentation
  - Deployment command instructions

### 15.6. PostFinance Account Management Learning ⚠️ **MISSING**
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

### 15.7. Payment Strategy Decision ⚠️ **MISSING**
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

### 15.8. Stripe API Integration Planning & Setup ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: Foundation - document all Stripe API integrations needed across all phases  
**Action**:
- Document all Stripe API endpoints needed for later phases:
  - **Payment Method Management** (Phase 4, #17.3): Setup Intents API, Payment Methods API (attach/detach/update)
  - **Subscription Management** (Phase 4, #17.2): Subscriptions API (cancel, update, pause/resume)
  - **Refund Processing** (Phase 6, #43): Refunds API (`stripe.refunds.create`)
  - **Admin Subscription Management** (Phase 7, #50): Full Subscriptions API access
- Document additional webhook events to handle:
  - `customer.subscription.trial_will_end` (for trial reminders)
  - `payment_method.attached` (for payment method updates)
  - `payment_method.detached` (for payment method removal)
  - `invoice.upcoming` (for renewal reminders)
- Create reusable Stripe API wrapper functions/edge functions:
  - `create-setup-intent` (for payment method collection)
  - `update-payment-method` (for payment method updates)
  - `cancel-subscription` (for subscription cancellations)
  - `update-subscription` (for plan upgrades/downgrades)
  - `create-refund` (for refund processing)
- Note: Using **custom UI** (not Stripe Customer Portal) - all subscription management will be built in-house

**Questions to Answer Before Implementation**:
- Should we create separate edge functions for each Stripe API operation, or one unified Stripe API handler?
- How to handle Stripe API errors consistently across all operations?
- Should we cache Stripe customer/subscription data or always fetch fresh?
- How to handle rate limiting from Stripe API?

**Potential Issues**:
- Stripe API rate limits (100 requests/second for most endpoints)
- Need to handle webhook idempotency (avoid duplicate processing)
- Stripe API versioning (need to pin API version)
- Error handling for various Stripe error types (card declined, insufficient funds, etc.)

---

## 🛒 **Phase 3: Purchase & Checkout Flow**

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

### 51. Multi-Currency Support ✅ **IMPLEMENTED**
**Status**: **✅ IMPLEMENTED** - Database schema supports multi-currency  
**Priority**: N/A - Already implemented  
**Action**: None needed - verify UI displays currencies correctly

**Implementation Details**:
- ✅ `products` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with constraint for USD, EUR, CHF, GBP
- ✅ `product_purchases` table: `currency VARCHAR(3) NOT NULL` with same constraint
- ✅ `product_bundles` table: `price_currency VARCHAR(3) DEFAULT 'USD'` with same constraint
- ✅ `services` table: `base_price_currency VARCHAR(3) DEFAULT 'CHF'` with same constraint

**Note**: Verify that UI components properly display and handle currency selection/display.

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

### 54. Stories & Review System ⚠️ **MISSING**
**Status**: Database schema exists (`product_reviews` table)  
**Priority**: Medium - important for social proof and user engagement  
**Action**: Complete review system with public stories page, user account integration, admin moderation, and home page display

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
- Display approved reviews/stories with rich formatting
- Filtering options (by product, rating, date, featured)
- Sorting options (newest, highest rated, most helpful)
- Pagination or infinite scroll
- Featured stories section at top
- Review cards with: user avatar, name, rating, product, date, comment
- "Verified Purchase" badges
- Link to product pages from reviews
- Responsive design (mobile, tablet, desktop)
- SEO optimization (meta tags, structured data for reviews)

**Questions to Answer Before Implementation**:
- How many reviews per page? (10, 20, 50?)
- Should we show review excerpts or full text?
- Should users be able to mark reviews as "helpful"?
- Should we allow replies to reviews?
- Review display format? (cards, list, grid?)

#### 54.3. Example Stories Creation (Admin) ⚠️ **MISSING**
**Status**: **MISSING**  
**Priority**: High - needed for initial content  
**Action**:
- Admin UI to create example/review stories
- Allow admin to create reviews on behalf of users (or as "BitMinded Team")
- Mark example stories appropriately (maybe `is_featured = true` and special flag)
- Create initial set of example stories for launch
- Support rich text formatting in review comments
- Upload images/media for stories (optional)

**Questions to Answer Before Implementation**:
- Should example stories be clearly marked as "Example" or "Featured"?
- Should admin-created stories require a user_id or can they be anonymous?
- Should we allow admin to create reviews for products that don't exist yet?

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

### 59. Admin Revenue Reports Module
**Status**: Only SPEC.md exists  
**Priority**: Depends on Stripe data flowing  
**Action**: Build revenue reports with gross revenue, refunds, lifecycle events, CSV exports


---

## 📋 **Summary by Priority**

### 🔴 **CRITICAL (Do First)**
1. ~~Externalize Supabase keys~~ ✅ **FIXED - Confirmed not an issue**
2. ~~Fix localhost fallback~~ ✅ **FIXED - Edge Function implemented**
3. Stripe webhook handler (#14) - ⚠️ **IMPLEMENTED - Only 6/29 events tested, 23 events pending testing**
4. **Stripe Test/Live Mode Handling (#14.1)** - ⚠️ **CRITICAL - Must fix before accepting live payments** (webhook handler doesn't check livemode)
5. Stripe Checkout Integration (#16) - **CRITICAL - Needed for purchases**
5. Purchase Confirmation & Entitlements (#16.5) - **CRITICAL - Needed after checkout**
6. Cloudflare Worker Subdomain Protection (#16.6) - **CRITICAL - Must protect paid tools immediately**
7. Receipt System (#16.7) - **CRITICAL - Needed for all Stripe purchases**

### 🟡 **HIGH PRIORITY (Before Launch)**
7. ~~Production security cleanup~~ ✅ **FIXED - All TODOs implemented, console logs cleaned up**
8. ~~SEO files (robots.txt, sitemap.xml)~~ ✅ **FIXED - Both files created**
9. PostFinance Account Management Learning (#15.6) - **HIGH PRIORITY - Foundation for invoice system**
10. Payment Strategy Decision (#15.7) - **HIGH PRIORITY - Must decide Stripe vs bank transfer**
11. Stripe API Integration Planning & Setup (#15.8) - **HIGH PRIORITY - Document all Stripe API integrations needed**
12. Product Wizard Steps 4-7 Verification (#15.5) - **HIGH PRIORITY - Complete all wizard steps**
13. Account subscription management (#17) - **HIGH PRIORITY - User-facing subscription management**
14. User Subscription Cancellation & Management (#17.2) - **HIGH PRIORITY - Users need to manage subscriptions**
15. Payment Method Management (#17.3) - **HIGH PRIORITY - Users need to manage payment methods**
16. User Account Receipts View (#17.1) - **HIGH PRIORITY - User needs access to receipts**
17. Service Workflows (#18-28) - **HIGH PRIORITY - Tech Support + Commissioning + Service Delivery Helper**
18. Contract System (#29-33) - **HIGH PRIORITY - Needed for commissioning agreements**
19. Invoice System (#34-42) - **HIGH PRIORITY - Needed for commissioning and large purchases**
20. Refund Processing System (#43) - **HIGH PRIORITY - Needed for customer service**

### 🟢 **MEDIUM PRIORITY (Can Do in Parallel)**
21. Subscription renewal reminders (#17.4)
22. User onboarding flow (#44)
23. Email template management UI (#45)
24. FAQ system enhancement (#46)
25. GDPR data deletion workflow (#47)
26. Admin Communication Center (#48)
27. Admin Bulk Operations verification (#49)
28. Admin Subscription Management UI (#50)
29. Multi-currency UI verification (#51)
30. Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements, email integration
31. Stories & Review System (#54) - Main nav, stories page, user account integration, admin moderation, home page display
32. Marketing & Social Media Integration (#55) - Social profiles, automated posting, Trustpilot, QR codes, content automation
33. Marketing Analytics Planning & Setup (#56) - Attribution tracking, event tracking, conversion funnels, ROI calculation (must be ready before Phase 8)


### ⚪ **LAST (Needs All Data)**
34. Dashboard (#57)
35. Analytics Dashboard (#58) - Includes marketing analytics from #56
36. Revenue Reports (#59)

---

## 🎯 **Recommended Implementation Order**

### Week 1: Production Readiness ✅ **COMPLETE**
- [x] ~~Externalize Supabase keys~~ ✅ **FIXED - Confirmed not an issue**
- [x] ~~Fix localhost fallback~~ ✅ **FIXED - Edge Function implemented**
- [x] ~~Production security cleanup~~ ✅ **FIXED - All TODOs implemented, console logs cleaned up**
- [x] ~~Create robots.txt and sitemap.xml~~ ✅ **FIXED - Both files created**

### Week 2: Stripe & Payment Foundation
- [x] ~~Verify Stripe setup (#13)~~ ✅ **COMPLETED - Full Stripe integration implemented**
- [x] ~~Create Stripe webhook handler (#14)~~ ⚠️ **IMPLEMENTED & DEPLOYED - Code complete, webhooks configured, but only 6/29 events tested**
- [ ] **Fix Stripe Test/Live Mode Handling (#14.1)** - ⚠️ **CRITICAL - Must fix webhook handler to check event.livemode and use correct secrets**
- [ ] **Complete Stripe webhook testing (#14)** - ⏳ **CRITICAL - Test remaining 23 events** (subscription lifecycle, invoices, refunds, disputes, trials)
- [x] ~~Test product creation flow (#15)~~ ✅ **COMPLETED - Multi-currency, subscription, sale prices implemented**
- [x] ~~Verify Product Wizard Steps 1-7 (#15.5)~~ ✅ **COMPLETED - All 7 steps fully implemented and tested**
  - [x] ~~Step 1 (Basic Information)~~ ✅ **COMPLETED**
  - [x] ~~Step 2 (Technical Specification)~~ ✅ **COMPLETED**
  - [x] ~~Step 3 (Content & Media)~~ ✅ **COMPLETED**
  - [x] ~~Step 4 (GitHub)~~ ✅ **COMPLETED**
  - [x] ~~Step 5 (Stripe)~~ ✅ **COMPLETED - All bugs fixed**
  - [x] ~~Step 6 (Cloudflare)~~ ✅ **COMPLETED - Automation and edge function implemented**
  - [x] ~~Step 7 (Review & Summary)~~ ✅ **COMPLETED**
- [ ] Learn PostFinance e-banking and QR-bill generation (#15.6)
- [ ] Document payment strategy decision matrix (#15.7)
- [ ] Document all Stripe API integrations needed (#15.8) - Setup Intents, Payment Methods, Subscriptions, Refunds APIs
- [ ] Create reusable Stripe API wrapper functions/edge functions (#15.8)
- [ ] Research QR-bill libraries and invoice requirements

### Week 3: Purchase & Checkout Flow
- [ ] Stripe Checkout Integration (#16)
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
- [ ] Notification Center Enhancements (#52) - Additional notification types, push notifications, UI improvements
- [ ] Stories & Review System (#54) - Main nav, stories page, user account integration, admin moderation, home page display

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
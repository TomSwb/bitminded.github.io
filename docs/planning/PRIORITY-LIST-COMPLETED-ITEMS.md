# ✅ Priority List - Completed Items

**Last Updated**: November 21, 2025  
**Based on**: Actual codebase investigation (not just READMEs)

> **Note**: This document contains all completed items from the priority list. For active/incomplete items, see [PRIORITY-LIST-TO-DO.md](./PRIORITY-LIST-TO-DO.md).

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

### ✅ **Recently Completed**
- ✅ Production readiness fixes (hardcoded keys confirmed safe, localhost fallback fixed via Edge Function)
- ✅ SEO files (robots.txt, sitemap.xml created)
- ✅ Production security cleanup (console logs, security TODOs)
- ✅ Stripe Webhook Handler implemented (29 events, production-ready, service purchases supported, payment links working)
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

### 14. Stripe Webhook Handler ✅ **IMPLEMENTED - FULLY TESTED & PRODUCTION READY**
**Status**: ✅ **IMPLEMENTED & DEPLOYED** - Production-ready with comprehensive testing  
**Priority**: Critical for subscription automation  
**Completed Actions**:
- ✅ Created `/functions/stripe-webhook` edge function handling 29 events
- ✅ Webhook signature verification using Stripe SDK
- ✅ Database operations for both `product_purchases` and `service_purchases` tables
- ✅ Handles: checkout sessions, subscriptions, invoices, charges, refunds, disputes
- ✅ **Service purchase support**: Webhook now correctly identifies and processes both products and services
- ✅ **Payment link support**: Fixed to handle payment links when checkout sessions aren't retrievable
- ✅ Error logging and idempotency checks
- ✅ Deployed to production with `--no-verify-jwt` (required for Stripe webhooks)
- ✅ Testing guide created with CLI workflows
- ✅ **Test Mode Webhook**: Configured in DEV and PROD (whsec_9XuaCqZ5EKCUFOtbsID3ZEVNVIRuGWFl)
- ✅ **Live Mode Webhook**: Created in PROD only (we_1SWeS4PBAwkcNEBloBQg67bc, whsec_ntkk0iTh2adifXM8YK95MqBP9n6NxfcZ)
- ✅ Both webhooks subscribed to all 29 events
- ✅ Environment variables properly configured: `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`

**Testing Status** (2025-11-23):
- ✅ **Fully Verified (7 events with DB verification)**: Core subscription lifecycle events tested and verified
- ✅ **Handler Verified (22 events)**: All handlers tested, logic verified, production-ready
- ✅ **Service Purchases**: Payment links for services working correctly (tested with "Confidence Session" and "Guided Learning Bundle")
- ✅ **Payment Link Support**: Webhook handles payment links correctly even when checkout sessions aren't retrievable
- See `/supabase/functions/stripe-webhook/TESTING-GUIDE.md` for complete testing status (lines 886-950)

**Key Fixes Completed**:
- ✅ Fixed webhook authentication (deployed with `--no-verify-jwt`)
- ✅ Fixed payment link processing (handles non-retrievable checkout sessions)
- ✅ Fixed service/product identification (webhook now handles both tables)
- ✅ Fixed amount calculation for payment links (uses payment intent amount)
- ✅ Fixed default_price for products (new products automatically set default price)

**Next Steps**: Webhook handler is production-ready. Continue monitoring and testing edge cases as needed.

### 14.1. Stripe Test/Live Mode Handling ✅ **FULLY COMPLETED**
**Status**: ✅ **FULLY COMPLETED** - All Stripe functions now support test/live mode switching  
**Priority**: **CRITICAL** - Must fix before accepting live payments  
**Completed Actions**:
- ✅ **Fixed webhook handler** to check `event.livemode` and use `STRIPE_WEBHOOK_SECRET_LIVE` or `STRIPE_WEBHOOK_SECRET_TEST` accordingly
- ✅ **Added helper functions** `getStripeSecretKey()` and `getStripeInstance()` to determine which Stripe key to use based on mode
- ✅ **Implemented try-fallback logic**: Tries TEST secret first, then LIVE secret if verification fails
- ✅ **Added validation**: Ensures correct secret is used based on event.livemode
- ✅ **Deployed to production** (version updated)
- ✅ **Updated all 6 Stripe Edge Functions** to use mode-specific keys with `STRIPE_MODE` environment variable support
- ✅ **Added `STRIPE_MODE` environment variable support** for PROD control (defaults to test mode for safety)

**Current State**:
- ✅ Environment variables set: `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`
- ✅ Webhook handler checks both TEST and LIVE secrets automatically
- ✅ Webhook handler validates that correct secret matches event mode
- ✅ **All 6 Stripe Edge Functions now support mode-specific keys**:
  - `create-stripe-product` - Uses `STRIPE_MODE` env var (defaults to test)
  - `create-stripe-subscription-product` - Uses `STRIPE_MODE` env var (defaults to test)
  - `create-stripe-service-product` - Uses `STRIPE_MODE` env var (defaults to test)
  - `update-stripe-product` - Uses `STRIPE_MODE` env var (defaults to test)
  - `update-stripe-service-product` - Uses `STRIPE_MODE` env var (defaults to test)
  - `delete-stripe-product` - Uses `STRIPE_MODE` env var (defaults to test)
- ✅ Helper functions `getStripeMode()` and `getStripeSecretKey()` available in all functions
- ✅ All functions log which mode they're using for debugging

**Implementation Details**:
- Webhook handler tries TEST secret first (most common case)
- Falls back to LIVE secret if TEST verification fails
- Validates that event.livemode matches the secret used
- All admin Edge Functions check `STRIPE_MODE` environment variable (values: 'test', 'live', 'production')
- Defaults to test mode if `STRIPE_MODE` is not set (safe default)
- Logs which mode/secret was used for debugging in all functions
- Helper functions `getStripeMode()` and `getStripeSecretKey()` available in all functions

**How to Switch to Live Mode**:
- Set `STRIPE_MODE=live` or `STRIPE_MODE=production` in Supabase Edge Function secrets
- All 6 Stripe Edge Functions will automatically use `STRIPE_SECRET_KEY_LIVE`
- Webhook handler automatically detects live mode from event.livemode
- No code changes needed - just update environment variable

**Recommendation**: 
- ✅ All Stripe functions are now ready for both test and live modes
- ✅ All critical webhook events tested and production-ready
- ✅ All admin functions support mode switching via environment variable
- Switch to LIVE mode when ready to accept real payments by setting `STRIPE_MODE=live`
- See `/supabase/docs/STRIPE-TEST-LIVE-MODE-ANALYSIS.md` for detailed analysis

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

### 15.6. PostFinance Account Management Learning ✅ **RESEARCHED & PLANNED**
**Status**: **RESEARCHED** - Implementation plan created  
**Priority**: Foundation - must understand capabilities before building invoice system  
**Documentation**: See [POSTFINANCE-INTEGRATION-PLAN.md](../payment-financial/POSTFINANCE-INTEGRATION-PLAN.md)

**Completed Actions**:
- ✅ Documented current state: Private PostFinance account, manual QR-bill generation
- ✅ Documented future state: Business account with API access (when revenue threshold reached)
- ✅ Designed Phase 1: Manual workflow (invoice generation, QR-bill creation, payment entry)
- ✅ Designed Phase 2: Automated workflow (API integration, automated payment matching)
- ✅ Created database schema for invoices and bank transfer payments
- ✅ Designed admin panel UI components for manual payment entry
- ✅ Planned integration with Revenue Reports component
- ✅ Documented two-phase implementation approach

**Current Understanding**:
- ✅ **QR-Bill Generation**: Manual via PostFinance e-banking dashboard (Phase 1)
- ✅ **Payment Tracking**: Manual review and entry in admin panel (Phase 1)
- ✅ **Payment Matching**: Invoice number in reference field for matching
- ✅ **Business Account**: Available for CHF 5/month without commerce registration (can open when revenue starts)
- ✅ **API Access**: Available immediately with business account, but integration deferred to Phase 2 (enhancement)
- ✅ **Integration Strategy**: Manual workflow first (personal account), automated later (business account)
- ✅ **Account Status**: All payments initially go to personal accounts (Stripe → personal, PostFinance → personal)

**Questions Answered**:
- ✅ How to generate QR-bills: Manual via e-banking dashboard (documented process)
- ✅ Payment tracking: Invoice number in reference field, manual entry in admin panel
- ✅ Implementation approach: Two-phase (manual → automated)
- ✅ Database schema: Designed for both payment methods (Stripe + Bank Transfer)
- ✅ Admin panel integration: Manual payment entry form in Revenue Reports component

**Questions Answered**:
- ✅ Business account requirements: CHF 5/month, available without commerce registration, account in personal name initially
- ✅ Payment checking frequency: Weekly manual (Phase 1), Daily automated (Phase 2)
- ✅ Business account timing: Open when revenue starts (not before, to protect chômage status)

**Questions Answered** (Research Complete):
- ✅ **International QR-Bill Payments**: YES - International customers CAN pay PostFinance QR-bills
  - Automatic: If QR-bill includes IBAN + SCOR (Structured Creditor Reference), foreign banks can process automatically
  - Manual: If only IBAN, customer may need to manually initiate international payment in their banking
  - **Impact**: Commissioning services can use PostFinance QR-bills for international customers
- ✅ **Transaction Export Format**: PostFinance offers multiple export formats
  - **camt.053**: ISO 20022 standard format (for accounting software like BEXIO)
  - **CSV**: Simple format for Excel/Google Sheets (max 100 transactions per export)
  - **Location**: E-banking → "Documents" → "Extraits de compte"
  - **Note**: For >100 transactions, export multiple files by date range
- ✅ **Currency Support**: QR-bills support CHF and EUR
  - International payments possible in EUR (with currency conversion by banks)
  - Currency code (CHF or EUR) must be printed on QR-bill
  - Recommendation: Accept CHF primarily, EUR as secondary option

**Questions Still Open** (Future Research):
- ⏳ **PostFinance API Capabilities**: To be researched when business account opened
  - QR-bill generation programmatically
  - Payment notifications (webhooks vs polling)
  - Transaction export API

**Financial Declaration Strategy**:
- ✅ **ORP (Unemployment)**: Check monthly before declaring; small amounts (2 subs = CHF 10/month) = "pocket money" (not declared)
- ✅ **AVS (Social Security)**: Declare when revenue is "significant" (~CHF 2,300/year threshold)
- ✅ **Business Account Timing**: Open when revenue starts (CHF 5/month, personal name initially)
- ✅ **Revenue Tracking**: Admin panel tracks all revenue to monitor declaration thresholds
- ✅ **Personal Account Phase**: All payments (Stripe + PostFinance) go to personal accounts initially

**Implementation Plan**:
- **Phase 0 (Months 1-3)**: Build website, use personal accounts, no business account (protects chômage status)
- **Phase 1 (When Revenue Starts)**: Manual workflow with invoice generation, QR-bill upload, manual payment entry
  - Open PostFinance business account (CHF 5/month) when first revenue approaches
  - Account in personal name initially
  - All payments tracked in admin panel (both Stripe + PostFinance)
- **Phase 2 (Month 4-5, Enhancement)**: Automated API integration (after revenue established)
  - Build PostFinance API integration (enhancement, not critical for launch)
  - Automate payment checking and matching
- See [POSTFINANCE-INTEGRATION-PLAN.md](../payment-financial/POSTFINANCE-INTEGRATION-PLAN.md) for full details

**Potential Issues**:
- ✅ Addressed: No API access for private accounts → Manual workflow designed
- ✅ Addressed: QR-bill generation manual only → Process documented, automation planned for Phase 2
- ✅ Addressed: Payment matching requires manual work → Manual entry form designed, automation planned
- ✅ Addressed: Payment reconciliation → Reconciliation dashboard designed

### 15.7. Payment Strategy Decision ✅ **RESEARCHED & DECIDED**
**Status**: **RESEARCHED** - All questions answered, strategy finalized  
**Priority**: Foundation - must decide what uses Stripe vs bank transfer  
**Documentation**: See [PRICING-STRATEGY.md](../services/PRICING-STRATEGY.md) for current pricing

**Completed Actions**:
- ✅ Documented current pricing structure (matching database seed data)
- ✅ Analyzed pricing discrepancies and resolved
- ✅ Identified payment method decision criteria (type-based vs threshold-based)
- ✅ Designed database schema to support both payment methods
- ✅ Documented PostFinance integration plan (see 15.6)

**Current Pricing** (from database):
- ✅ **Catalog Access**: CHF 2-25 (one-time), CHF 5/month (All-Tools), CHF 8/month (Supporter)
- ✅ **Tech Support**: CHF 30-90 with reduced fares, travel costs separate
- ✅ **Commissioning**: CHF 20-1,950 (range pricing for variable services)

**Recommended Decision Matrix** (Based on service characteristics):
- **Stripe**: 
  - Catalog products (fixed pricing, CHF 2-25)
  - Subscriptions (recurring, CHF 5-8/month)
  - Remote tech support (fixed pricing, no travel, CHF 30-90)
  - Any service with fixed, predictable pricing
- **Bank Transfer (PostFinance QR-bills)**:
  - Commissioning services (variable/range pricing, CHF 350-1,950)
  - In-person tech support (with travel costs, CHF 50-90 + travel)
  - Services requiring custom quotes
  - Any service with variable pricing or additional costs

**Questions Answered**:
- ✅ Payment method selection: Type-based (service characteristics) rather than threshold-based
- ✅ Stripe price flexibility: Yes, prices can be changed but better to create new prices for one-time purchases
- ✅ Travel costs: Keep separate ("+ travel") for in-person services, use bank transfer for those
- ✅ Payment plans: Not currently implemented; if needed, use bank transfer (more flexible)

**Financial Considerations**:
- ✅ All payments (Stripe + PostFinance) initially go to personal accounts
- ✅ Stripe payments → Personal Stripe account → Personal bank account
- ✅ PostFinance payments → Personal PostFinance account
- ✅ Track revenue in admin panel to monitor declaration thresholds (ORP monthly check, AVS ~CHF 2,300/year)
- ✅ PostFinance business account (CHF 5/month) available without commerce registration
- ✅ Open business account when revenue starts (not before, to protect chômage status)

**Questions Answered** (Research Complete):
- ✅ **International QR-Bill Payments**: YES - International customers CAN pay PostFinance QR-bills (see 15.6)
- ✅ **Currency Acceptance**: CHF and EUR supported for QR-bills
  - Primary: CHF (Swiss Francs)
  - Secondary: EUR (Euros) - available for international customers
  - Recommendation: Use CHF primarily, offer EUR for international customers if needed
- ✅ **International Customers Strategy**: Both Stripe AND PostFinance QR-bills work for international customers
  - PostFinance QR-bills: Use for commissioning services (with IBAN + SCOR for best compatibility)
  - Stripe: Use for catalog products, subscriptions, and remote tech support
  - Decision: Type-based payment method assignment (not geography-based)
- ✅ **Refund Policies**: Manual bank transfer refund process
  - Process: Admin initiates refund → Manual bank transfer to customer IBAN via PostFinance e-banking
  - Reference: Include original invoice number and "REFUND" notation
  - Admin panel: Refund workflow UI to be implemented in Revenue Reports component (Item #59)

**Implementation Status** ✅ (2025-01-31):
- ✅ Database schema: `payment_method` column added to `services` table (migration: `20250131_add_payment_method_to_services.sql`)
- ✅ Existing services updated with correct `payment_method` values based on category (migration: `20250131_update_services_payment_method.sql`)
- ✅ Products table currency default changed from USD to CHF (migration: `20250131_update_products_currency_default.sql`)
- ✅ Invoices table created for PostFinance bank transfer workflow (migration: `20250131_create_invoices_table.sql`)
- ✅ Booking-level payment method: `service_format` and `payment_method` added to `service_purchases` table (migration: `20250131_add_booking_format_and_payment_method.sql`)
- ✅ Invoices linked to bookings: `service_purchase_id` added to `invoices` table
- ✅ Database: Added 'both' as payment_method option for services supporting both formats (migration: `20250131_allow_both_payment_method.sql`)
- ✅ Admin panel: Payment method dropdown added to service creation/editing modal with auto-selection logic (includes 'both' option)
- ✅ Admin panel: Payment method badges displayed in service management list (Stripe = purple, Bank Transfer = PostFinance yellow, Both = shows both badges)
- ✅ User-facing: Payment method badges removed from service cards - selection will be handled in checkout flow (see Item #16)
- ✅ Documentation: Item #16 updated with dual payment flow requirements (Stripe checkout + bank transfer booking forms)
- ✅ Documentation: PostFinance Integration Plan updated with booking-level payment method logic

**Booking-Level Payment Method Logic**:
- Service-level `payment_method` = default/suggestion for UI
- Booking-level `payment_method` = determined by `service_format`:
  - `service_format = 'in_person'` → `payment_method = 'bank_transfer'`
  - `service_format = 'remote'` → `payment_method = 'stripe'`
- Allows same service to use different payment methods based on delivery format

**Payment Strategy Finalized**:
- ✅ **Stripe**: Catalog products, subscriptions, remote tech support (fixed pricing)
- ✅ **PostFinance QR-bills**: Commissioning services, in-person tech support (variable pricing, includes international)
- ✅ **Currency**: CHF primary, EUR secondary (supported in QR-bills)
- ✅ **Refunds**: Manual bank transfer process documented

---

## 🛠️ **Phase 7: User Experience & Admin Tooling**

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

---


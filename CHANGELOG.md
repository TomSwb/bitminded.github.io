# Changelog

All notable changes to the BitMinded website project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [1.0.16] - 2026-01-XX

### Fixed
- **Admin Subscription Management Component**: Fixed translation visibility issue
  - Added `showTranslatableContent()` method to make translatable elements visible after initialization
  - Translatable content now properly displays on component load and language changes

### Changed
- **Admin Subscription Management Component UI Alignment**: Aligned component styling with user and product management panels
  - Updated header layout to centered title with absolute-positioned actions
  - Added search bar with consistent styling
  - Wrapped filters in bordered container with proper background and padding
  - Updated table container with background, border, and min-height
  - Made table header sticky for better scrolling experience
  - Changed table cell alignment to center (matching other admin panels)
  - Replaced hardcoded badge colors with CSS variables for consistent theming
  - Added loading spinner animation
  - Replaced non-standard CSS variables with standard design tokens
  - Enhanced mobile responsiveness with table-to-card transformation
  - Updated stat label colors from `--color-text-secondary` to `--color-text-primary`

### Added
- **Admin Subscription Management Component**: Added search functionality
  - Real-time search with 300ms debounce
  - Searches across username, email, product name, and subscription ID
  - Filter summary displays filtered vs total count
  - Clear search button integration

## [1.0.15] - 2026-01-XX

### Added
- **Admin Subscription Management Component (Item 17.2)**: Complete subscription lifecycle management interface
  - **Subscription Dashboard**: Metrics display with Total Subscriptions, Active Subscriptions, MRR (Monthly Recurring Revenue), and Churn Rate
  - **Unified Subscription View**: Aggregates subscriptions from multiple sources
    - Stripe subscriptions from `user_subscriptions` table
    - Product subscriptions from `product_purchases` table
    - Service subscriptions from `service_purchases` table
    - Manual entitlements from `entitlements` table
  - **Advanced Filtering**: Comprehensive filter panel with status, product/service, billing cycle, source, payment status, and date range filters
  - **Subscription Table**: 8-column table displaying User, Product/Plan, Status, Billing, Revenue, Source, Payment Method, and Actions
  - **Subscription Detail Modal**: Multi-tab interface with Overview, Billing History, Events, and Modifications tabs
  - **Subscription Actions**: Full lifecycle management capabilities
    - Cancel subscription (immediate or at period end)
    - Refund and cancel
    - Extend subscription (add days/months)
    - Change plan (upgrade/downgrade with proration)
    - Pause/Resume subscription
    - View in Stripe (external link)
  - **Stripe Sync Functionality**: Sync all Stripe subscriptions with database via Edge Function
  - **Export Functionality**: CSV export of filtered subscriptions
  - **Multi-language Support**: Complete translations for EN/FR/DE/ES
- **Sync Stripe Subscriptions Edge Function**: New Edge Function `sync-stripe-subscriptions`
  - Fetches all Stripe subscriptions via Stripe API
  - Compares with `user_subscriptions` table
  - Creates or updates subscription records
  - Returns sync results (created, updated, errors)
  - Admin-only access with rate limiting (5 req/min, 20 req/hour)
  - Handles pagination for large subscription lists

### Changed
- **Admin Layout**: Subscription Management component registered and ready for use
- **Priority Lists**: Item 17.2 (Subscription Management Component) implementation completed

### Deployment
- Deployed `sync-stripe-subscriptions` Edge Function to dev (eygpejbljuqpxwwoawkn)
- Deployed `sync-stripe-subscriptions` Edge Function to prod (dynxqnrkmjcvgzsugxtm)
- Updated deployment documentation in `supabase/dev/deployed-functions.md` and `supabase/prod/deployed-functions.md`

---

## [1.0.14] - 2026-01-15

### Added
- **Purchase Confirmation & Entitlements (Item 17)**: Complete implementation of purchase confirmation and entitlement synchronization
  - **Entitlement Sync**: Automatic entitlement creation/updates from purchases via `syncEntitlementFromPurchase()` function
    - Maps purchases to entitlements with correct `app_id` (product/service slug)
    - Syncs `grant_type` based on purchase type (subscription → 'subscription', one_time → 'lifetime', trial → 'trial')
    - Syncs expiration dates from purchases (subscriptions use `expires_at` or `current_period_end`)
    - Integrated into checkout completion, invoice payment, and subscription update handlers
  - **Family Subscription Access**: Added family subscription checks to `validate-license` function
    - Checks `service_purchases` table for family plan access
    - Calls `has_family_subscription_access()` RPC function for family group membership verification
    - Returns appropriate reason codes (`family_service_active`, `family_subscription_active`)
  - **Purchase Confirmation Emails**: Email notifications for purchase confirmations
    - One-time purchase confirmation template with product details, amount, receipt link
    - Subscription confirmation template with billing cycle, next billing date, manage link
    - Translations added for all languages (EN/FR/DE/ES)
    - Integrated into Stripe webhook after purchase creation and subscription renewals
  - **App Entitlements Enhancement**: Enhanced account "Apps" section to display purchases
    - Loads and displays purchases from `product_purchases` and `service_purchases` tables
    - Merges purchases with entitlements in unified display
    - Added "Source" column showing "Purchase" vs "Admin Grant" with color-coded badges
    - Displays subscription details (billing interval, next billing date) for purchase-based access
    - Translation keys added for purchase-related labels (EN/FR/DE/ES)

### Changed
- **App Entitlements Component**: Enhanced to show both purchases and admin-granted entitlements
  - Added `loadPurchases()` and `loadServices()` methods
  - Unified display with intelligent duplicate removal (prefers purchases for more detail)
  - Added visual distinction between purchase and admin-granted access
- **Priority Lists**: Moved item 17 (Purchase Confirmation & Entitlements) from TODO to completed items

### Fixed
- Fixed critical gap where purchases were created but entitlements were not synced
- Fixed family plan members not having access verified correctly (added service_purchases and family subscription checks)
- Fixed account "App Entitlements" section showing empty for purchased apps

### Deployment
- Deployed `stripe-webhook` to dev and prod (with `--no-verify-jwt`)
- Deployed `validate-license` to dev and prod (with JWT verification)
- Deployed `send-notification-email` to dev and prod (with `--no-verify-jwt`)
- Updated deployment documentation in `supabase/dev/deployed-functions.md` and `supabase/prod/deployed-functions.md`

---

## [1.0.13] - 2026-01-08

### Added
- **Date of Birth field in signup form**: Added required DOB field to user registration for age verification on purchases
  - DOB field positioned after email, before password
  - Validation: required field and prevents future dates
  - Translations added for all languages (en, es, fr, de)
  - Database integration: DOB saved to `user_profiles.date_of_birth` via updated `handle_new_user()` trigger
  - Migration: `20260108_add_dob_to_handle_new_user.sql`
- **Family Management UI component (15.9.4)**: Complete family management interface for account page
  - View family members, roles, and status
  - Add/remove family members with email invitations
  - Family creation functionality
  - Leave/delete family group functionality
  - Admin role management (promote members to admin)
- **Family Management Notifications**: Comprehensive notification system for all family management events
  - Email notifications for invitations, member additions/removals, role changes
  - In-app notifications for all family events
- **Family member invitation simplification**: Streamlined invitation process with email-only input

### Changed
- **Family Management UX improvements**: Enhanced error handling and user experience
  - Improved family group UI in user detail page
  - Better error messages and validation feedback
  - Simplified member invitation flow (removed role/relationship fields)
- **Priority lists cleanup**: Removed redundant sections and marked Phase 2 as complete
  - Moved item 15.10 (DOB signup field) to completed items
  - Marked Phase 2: Stripe & Payment Foundation as complete

### Fixed
- Fixed syntax errors in user detail page and session management
- Fixed family management empty state visibility issue

---

## [1.0.12] - 2026-01-05

### Added
- **Family Management API (Edge Function)**: New Edge Function `family-management` for managing family members with immediate access granting
  - `POST /add-member` - Add new family member and grant immediate access (updates Stripe subscription quantity with proration if needed)
  - `POST /remove-member` - Remove family member and revoke access (decreases Stripe subscription quantity with proration)
  - `POST /update-member-role` - Update member role (admin only)
  - `GET /family-status` - Get family group status, members, subscription details, and available slots
  - Immediate access granting: New members get access immediately instead of waiting for next renewal
  - Stripe integration: Automatically updates subscription quantity with proration when members are added/removed
  - Comprehensive error handling, authentication, authorization, and rate limiting (20/min, 100/hour)
- Added comprehensive test documentation and scripts:
  - `TEST-EXECUTION-CHECKLIST.md` - Complete test plan with 15 test scenarios
  - `find-test-data.sql` - SQL queries for finding test data
  - `test-api.sh`, `run-tests.sh`, `run-full-tests.sh` - Automated test scripts
  - `CRITICAL-MISSING-TESTS.md` - Additional test recommendations

### Changed
- Updated priority lists: Moved Family Management API (15.9.3.1) from TODO to completed items
- Updated Family Plan Webhook Handler documentation: Removed reference to Family Management API as pending requirement

### Testing
- ✅ 9/15 core tests passed - All critical functionality verified
- ✅ Immediate access granting verified - New members get access immediately
- ✅ Access revocation verified - Removed members lose access immediately
- ✅ Stripe integration verified - Subscription quantity updates correctly with proration
- ✅ Complete add/remove cycle verified - Members can be added, removed, and re-added successfully
- ✅ Edge cases handled - Duplicate member prevention, re-activation of removed members
- ✅ Error handling verified - Unauthorized, validation errors, forbidden access

### Deployment
- ✅ Deployed to DEV (eygpejbljuqpxwwoawkn) - script size: 499.2kB
- ✅ Deployed to PROD (dynxqnrkmjcvgzsugxtm) - script size: 499.2kB

---

## [1.0.11] - 2026-01-05

### Fixed
- **Family Plan Webhook Handler**: Fixed multiple critical bugs in family plan processing
  - Fixed family plan detection when checkout session retrieval fails - handler now checks `session.metadata.is_family_plan` before returning early, allowing family plans to be processed even when line items can't be retrieved
  - Fixed missing admin member when reusing existing family group - handler now ensures admin user is added as a family member with correct age calculation from `user_profiles.date_of_birth`
  - Fixed subscription cancellation timing - `cancelled_at` now correctly equals `current_period_end` (period end date) instead of cancellation time, ensuring access remains valid until period end
  - Fixed family member age validation trigger - updated `validate_family_member_constraints()` function to check NEW record being inserted, allowing first family member (admin) to be added without validation errors

### Added
- Added database migration `20251205_fix_family_member_age_validation.sql` to fix family member age validation trigger
- Added comprehensive test verification SQL files for family plan webhook testing:
  - Tests 1-5: `test1-verification.sql`, `test1-retest-verification.sql`, `test2-verification.sql`, `test3-verification.sql`, `test4-verification.sql`, `test5-verification.sql`, `test5-retest-verification.sql`
  - Tests 6-10: `test6-verification.sql`, `test7-verification.sql`, `test8-verification.sql`, `test9-verification.sql`, `test10-verification.sql`
- Added test data cleanup script `cleanup-test1-data.sql` for family plan webhook testing
- Added family member addition script `add-family-member.sql` for Test 10 (multiple members access)
- Added Family Management API requirement (15.9.3.1) to priority list - needed for immediate member access when members are added to existing family groups

### Changed
- Updated family plan webhook handler deployment to use `--no-verify-jwt` flag to allow Stripe webhooks without JWT verification
- Updated `TEST-EXECUTION-CHECKLIST.md` with comprehensive test results for all 10 tests (all passing):
  - Test 1: New Family Plan Purchase - ✅ PASS
  - Test 2: Existing Family Member Purchases Family Plan - ✅ PASS
  - Test 3: Subscription Creation Event - ✅ PASS
  - Test 4: Subscription Update (Quantity Change) - ✅ PASS
  - Test 5: Subscription Cancellation - ✅ PASS (timing fix verified)
  - Test 6: Invoice Payment (Renewal) - ✅ PASS
  - Test 7: Invalid Plan Name - ✅ PASS (code verified)
  - Test 8: Missing Service in Database - ✅ PASS (code verified)
  - Test 9: User Not Found - ✅ PASS
  - Test 10: Multiple Family Members Access - ✅ PASS
- Updated priority lists to reflect completed webhook handler testing and new Family Management API requirement
- Updated `supabase/prod/applied-migrations.md` to confirm migration deployment

---

## [1.0.10] - 2025-12-09

### Added
- Added comprehensive family plan webhook testing execution checklist (`TEST-EXECUTION-CHECKLIST.md`)
- Added file creation guidelines to `.cursorrules` to prevent redundant documentation files

### Changed
- Deployed stripe-webhook Edge Function to DEV environment with family plan support
- Updated deployment tracking documentation (`supabase/dev/deployed-functions.md`)
- Verified database schema and family plan services configuration in DEV

---

## [1.0.9] - 2025-12-09

### Fixed
- Fixed syntax error in email verification page - removed redundant nested try-catch blocks that caused "Missing catch or finally after try" error, preventing email verification from completing

---

## [1.0.8] - 2025-12-09

### Fixed
- Fixed family services pricing structure in production database - added migration to include missing `family_monthly` and `family_yearly` keys in pricing JSONB for both `all-tools-membership-family` and `supporter-tier-family` services

### Changed
- Repositioned currency switcher component to be below language switcher instead of to the right
- Increased language switcher z-index to be highest among header components (currency switcher, notification center, language switcher)

---

## [1.0.7] - 2025-12-09

### Fixed
- Fixed family prices switch on catalog access page not working in production - removed early return that blocked price updates when i18next wasn't loaded yet, making price updates work independently of translation system initialization

### Added
- Added family plan webhook handler functionality to Stripe webhook processor
  - Family plan purchase detection via session metadata, service slug, and product name
  - Automatic family group creation and management
  - Family subscription lifecycle management (create, update, cancel, renew)
  - Access granting/revoking for family members
  - Support for `all-tools-membership-family` and `supporter-tier-family` services
- Added comprehensive family plan webhook testing documentation (`FAMILY-PLAN-TESTING.md`)
- Added database verification queries for family plan webhook testing

### Changed
- Updated `findProductOrService()` function to return service slug for family plan detection
- Enhanced Stripe webhook handler to process family plan-specific events and metadata

---

## [1.0.6] - 2025-12-03

### Fixed
- Fixed syntax error in product-management.js - removed orphaned `throw error;` statement that broke try-catch structure

---

## [1.0.5] - 2025-11-29

### Fixed
- Fixed authentication token expiration check on page load - expired tokens now show logged out state immediately instead of false "logged in" state
- Fixed 401 errors on first Edge Function call after page load by ensuring fresh tokens are always used
- Added automatic token refresh and retry logic for Edge Function calls on 401 errors

### Added
- Added `window.invokeEdgeFunction()` helper function that ensures fresh authentication tokens before all Edge Function calls
- Added automatic session refresh before Edge Function invocations to prevent expired token errors
- Added 401 error retry logic with automatic token refresh in Edge Function helper

### Changed
- Updated all 54 Edge Function invocations across 26 files to use new `invokeEdgeFunction()` helper
- Updated `checkAuthState()` to validate token expiration before showing logged in state
- Simplified Edge Function calls by removing manual session checks and Authorization header management

---

## [1.0.4] - 2025-11-29

### Fixed
- Fixed LICENSE generation to use BitMinded as copyright holder instead of product name
- Updated existing repository licenses (rythmo, measure-mate) to use BitMinded proprietary license

---

## [1.0.3] - 2025-01-29

### Added
- Repository setup best practices integration in Product Wizard GitHub repository creation
- Automatic generation of CHANGELOG.md (Keep a Changelog format) for new repositories
- Automatic generation of .editorconfig with framework-aware settings (TypeScript support detection)
- Automatic generation of .cursorrules with hybrid template+AI approach (framework-specific templates with optional OpenAI enhancement)
- Automatic generation of .cursorignore with framework-specific exclusions
- Automatic generation of CONTRIBUTING.md with simplified generic template
- Automatic generation of LICENSE with proprietary license template
- Enhanced README.md generation using OpenAI API (professional formatting instead of raw spec)
- Framework-specific .cursorrules templates (React, Vue, Next.js, Expo, plain HTML, generic)
- TypeScript detection in .editorconfig generation (checks spec for TypeScript/TSX usage)
- Improved package.json detection logic (checks both techStack array and spec directly)

### Changed
- Updated GitHub repository creation to generate 7 additional best practices files
- Enhanced README.md generation to use AI enhancement instead of raw specification
- Improved tech stack detection for better framework-specific file generation
- Updated Product Wizard GitHub setup step preview to show all new files

### Fixed
- Fixed package.json creation detection (now properly detects Node.js/React projects from spec)
- Fixed TypeScript detection in .editorconfig (now checks spec directly as fallback)

---

## [1.0.2] - 2025-11-29

### Added
- .cursorrules for optimized Cursor AI assistance (~500 tokens)
- .cursorignore for improved Cursor indexing performance
- CONTRIBUTING.md with required tools and development workflow guide
- Repository setup summary documentation (docs/REPOSITORY-SETUP-SUMMARY.md)
- Git aliases for faster workflow (st, cod, com, pod, pom, lg, etc.)

### Changed
- Enhanced repository documentation structure

---

## [1.0.1] - 2025-11-29

### Added
- Main README.md for repository documentation
- .editorconfig for consistent code formatting
- CHANGELOG.md for tracking project changes

### Fixed
- Service management HTML indentation formatting

---

## [1.0.0] - 2025-11-26

### Added
- **Community Page & Features** - Added as major task item (#55) in priority list
- **Admin Component Translations** - Fixed translation persistence after rendering and section switches
- **Stripe Tab UI Improvements** - Enhanced Stripe tab with upgrade path planning
- **Family Plan Services** - Multi-currency pricing and catalog integration for family plans
- **9 Stripe API Edge Functions** - Complete Stripe integration infrastructure
- **Payment Method Badges** - Added badges for Online/In-Person/Both payment methods with multi-language support
- **User Feedback Integration** - Integrated user feedback into priority list
- **Stripe Test/Live Mode Support** - Full test/live mode switching for all Stripe functions
- **Supabase Folder Reorganization** - Improved structure and added Stripe webhook automation
- **Stripe Webhook Handler** - Production-ready webhook handler for 29 Stripe events
- **CLI Tools Setup** - Stripe CLI and Supabase CLI configured with testing guides
- **Product Overview Modal** - Comprehensive product information display in admin panel
- **Multi-Currency Support** - Full support for CHF, USD, EUR, GBP with currency-specific pricing
- **Sale Price Management** - Percentage-based sale system with multi-currency support
- **Framework Detection System** - Comprehensive framework detection and configuration
- **Product Wizard Enhancements** - Auto-create worker files, detect Expo apps, add post-build scripts
- **Error Logs Table** - Centralized error tracking system
- **Service Management System** - Complete CRUD for services with currency switcher
- **Security Enhancements** - CORS protection and rate limiting for all 33 browser-called edge functions
- **JWT Session Validation** - Fixed session revocation vulnerability with validation on all edge functions
- **Family Pricing Toggle** - Per-member pricing (3.50 CHF/member All-Tools, 5 CHF/member Supporter) with yearly options
- **FAQ Structure Refactor** - Centralized FAQ with sub-navigation and 4-column layout
- **Mobile Collapsible Cards** - Improved mobile UX with collapsible card components
- **Community Impact Feature** - Added to catalog access page
- **Theme-Aware Hero Image** - Dynamic hero image switching based on theme
- **Services Page Redesign** - 3-toggle system with improved layout
- **Tech Support Refactor** - Removed tabs, added category titles, reorganized card layout

### Changed
- **Documentation Reorganization** - Moved docs into topic-based folders with improved navigation
- **Payment Method Display** - Changed "Stripe" to "Online" in payment method badges
- **Navigation Menu** - Reordered items to Home-About-Services-Catalog-Support
- **Service Pages** - Renamed "Guidance Services" to "Tech Support"
- **Hero Subtitle** - Enhanced to emphasize uniqueness in English and French
- **Commissioning Page** - Refactored to remove redundant sections, enhance process timeline
- **Product Wizard** - Removed auto-save, added per-step save buttons
- **Stripe Step** - Fixed data preservation and navigation data loss issues
- **Service Management** - Added payment method field and booking format support

### Fixed
- **Admin Component Translations** - Fixed translation persistence issues
- **Product Wizard Stripe Step** - Fixed pricing data loading, display, and data loss on navigation
- **Stripe Product Deletion** - Fixed to clear all pricing data from database
- **Stripe Product Update** - Fixed to use 'Lifetime' for one-time prices and properly deactivate currency prices
- **Price Reset Issues** - Fixed price_amount_* conversion to pricing objects
- **Sale Price Calculation** - Fixed for all currencies and prevented Stripe step reinitialization
- **Pricing Column** - Fixed to save currency-specific price IDs to database
- **Stripe Product Creation** - Fixed 401 auth errors with explicit Authorization headers
- **Edge Function Authentication** - Fixed to check Authorization header before creating Supabase client
- **Product Deletion** - Fixed to prevent pricing data from being restored after deletion
- **Translation Error Handling** - Improved error handling and fixed step 1 data persistence
- **Missing Required Fields** - Fixed product load query to include all required fields
- **Currency Price Population** - Fixed to populate all currency prices and display monthly/yearly Stripe IDs
- **Mobile Collapsible Cards** - Fixed to set collapsed as default state
- **Mobile Navigation** - Fixed Services and FAQ sub-nav in hamburger menu
- **FAQ Translation Paths** - Fixed translation loading issues
- **Service Pages UI/UX** - Fixed various UI issues and console cleanup
- **Filter State Preservation** - Fixed to preserve filter state in service management

### Security
- **CORS Protection** - Added to all 33 browser-called edge functions
- **Rate Limiting** - Implemented for all edge functions
- **JWT Session Validation** - Fixed session revocation vulnerability
- **Authorization Headers** - Fixed 401 errors with proper authentication

---

## [0.9.0] - 2025-11-21

### Added
- **Stripe Integration** - Complete Stripe integration with multi-currency, subscriptions, and sale management
- **Product Management** - Full product catalog management with Stripe sync
- **Service Management** - CRUD operations for services with Stripe integration
- **Product Wizard** - Steps 1-7 fully implemented (Basic Info, Spec Generation, GitHub, Stripe, Cloudflare, Content, Review)
- **Sale Badge Display** - Added to catalog product cards
- **Multi-Currency Support** - Full support for CHF, USD, EUR, GBP
- **Subscription Support** - Monthly/yearly subscription pricing
- **Trial Period Support** - Trial days and trial requires payment options
- **Stripe Edge Functions** - 9 edge functions for product/service creation and management
- **Error Logs Table** - Centralized error tracking

### Changed
- **Priority List** - Updated with completed Stripe integration items
- **Product Wizard** - Enhanced Stripe step with multi-currency and subscription support

---

## [0.8.0] - 2025-11-20

### Added
- **About Section** - Vision & Mission and Team pages with full bios
- **Legal Pages Subnav** - Added to mobile menu
- **Percentage-Based Sale System** - Sale price management
- **Emoji Picker** - For product/service customization
- **Bulk Status Actions** - Admin panel bulk operations
- **Swiss Flag Emoji** - Added to Switzerland-only services
- **Currency Switcher** - Multi-currency support across services

### Changed
- **Services Hero Text** - Updated intro styling
- **Navigation Menu** - Disabled active nav items on FAQ and legal pages
- **Service Pages** - Improved UI/UX and fixed console logs

### Fixed
- **Authentication** - Fixed on legal pages
- **FAQ Translations** - Fixed translation paths

---

## [0.7.0] - 2025-11-19

### Added
- **Service Management System** - Complete service CRUD with admin panel
- **Family Pricing** - Per-member pricing with yearly options
- **Security Enhancements** - CORS protection and rate limiting
- **JWT Session Validation** - Session revocation vulnerability fix

### Changed
- **Tech Support Services** - Refactored to remove tabs, add category titles
- **Services Overview** - Redesigned with 3-toggle system
- **Catalog Access** - Renamed "Feature Voting" to "Development Influence"

### Fixed
- **Missing Translations** - Fixed in service pages
- **Session Revocation** - Fixed JWT vulnerability

---

## [0.6.0] - 2025-11-16

### Added
- **FAQ Structure** - Centralized FAQ with sub-navigation
- **4-Column Layout** - Independent column animations
- **Mobile Collapsible Cards** - Improved mobile UX
- **Community Impact Feature** - Added to catalog access page
- **Theme-Aware Hero Image** - Dynamic image switching

### Changed
- **Catalog Access Page** - Improved supporter tier description and badge animation
- **Tech Support Page** - Mobile responsive with audience cards and translations
- **Subnav Styling** - Improved across service pages

---

## [0.5.0] - 2025-11-15

### Added
- **Tech Support Services** - Complete tech support service pages
- **Commissioning Services** - Commissioning process and pricing
- **Catalog Access** - Product catalog with filtering
- **Support Ticket System** - User and admin ticket management
- **Notification Center** - User notification system

### Changed
- **Service Naming** - Renamed "Guidance Services" to "Tech Support"
- **Hero Subtitle** - Enhanced to emphasize uniqueness

---

## [0.4.0] - 2025-11-21

### Added
- **Admin Panel** - Complete admin interface
  - User Management (CRUD, search, filter, pagination)
  - Access Control (grant/revoke access, expiration management)
  - Support Desk (ticket management, status workflow)
  - Service Management (CRUD for services, pricing management)
  - Product Management (full product catalog management)
  - Product Wizard (Steps 1-7 complete)
  - Bulk Operations
  - Maintenance Mode
- **User Detail Component** - Complete user management with 5 tabs
- **Admin Layout** - Navigation, structure, access control
- **Admin Activity Logging** - Track all admin actions

### Security
- **Admin Role Verification** - 2FA required for admin access
- **RLS Policies** - Row Level Security on all admin tables

---

## [0.3.0] - 2025-10-XX

### Added
- **Account Management** - Complete user account system
  - Profile Management (username, email, avatar)
  - Security Management (password change, 2FA, login activity)
  - Notifications Preferences
  - Account Actions (export data, delete account, active sessions)
  - Support Tickets (user view)
  - App Entitlements
- **Authentication System** - Email/password with 2FA
  - Login/Signup forms
  - Password reset
  - Email verification
  - Session management
- **2FA System** - Two-factor authentication with TOTP
- **Password Reset Flow** - Complete password recovery system

### Security
- **Session Management** - Active session tracking and revocation
- **Login Activity Tracking** - IP address and location logging
- **GDPR Compliance** - Data export and account deletion

---

## [0.2.0] - 2025-09-XX

### Added
- **Multi-Language Support** - i18next integration (EN, FR, DE, ES)
- **Language Switcher** - Component for language selection
- **Theme Switcher** - Dark/light theme support
- **Component System** - Modular component architecture
- **Navigation Menu** - Responsive navigation with mobile hamburger
- **Site Footer** - Footer component with links
- **Loading Screen** - Page loading indicator
- **Notification Center** - User notification system

### Changed
- **Component Architecture** - Refactored to component-based system
- **Translation System** - Centralized translation management

---

## [0.1.0] - 2025-05-30

### Added
- **Initial Website** - Basic website structure
- **Homepage** - Hero section with mission toggle
- **Contact Page** - Initial contact functionality
- **CNAME** - Domain configuration
- **Favicon** - Site icons
- **Basic Styling** - Initial CSS architecture

### Changed
- **Header** - Added border and icon
- **Navigation** - Initial menu structure

---

[Unreleased]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.15...HEAD
[1.0.15]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.14...v1.0.15
[1.0.9]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v1.0.0
[0.9.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.9.0
[0.8.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.8.0
[0.7.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.7.0
[0.6.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.6.0
[0.5.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.5.0
[0.4.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.4.0
[0.3.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.3.0
[0.2.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.2.0
[0.1.0]: https://github.com/bitminded/bitminded.github.io/releases/tag/v0.1.0

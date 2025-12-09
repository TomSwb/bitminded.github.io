# Changelog

All notable changes to the BitMinded website project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/bitminded/bitminded.github.io/compare/v1.0.7...HEAD
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

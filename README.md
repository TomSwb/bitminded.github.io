# BitMinded Website

**We Build. We Guide.**

BitMinded is a Swiss software studio that builds artisanal apps for everyday needs and provides personal tech guidance to help people feel confident with technology.

## 🌐 Live Site

- **Production**: https://bitminded.ch
- **Repository**: https://github.com/bitminded/bitminded.github.io

## 🎯 Project Overview

BitMinded offers two main services:

1. **We Build** - Commission custom apps or purchase from our growing catalog of artisanal tools
2. **We Guide** - Personal tech coaching and support to build confidence with technology

The website includes:
- Public-facing pages (homepage, about, services, catalog, FAQ)
- User authentication and account management
- Admin panel for managing users, products, and services
- Multi-language support (i18n)
- Payment processing (Stripe integration)
- Support ticket system

## 🛠️ Tech Stack

### Frontend
- **HTML/CSS/JavaScript** - Vanilla JS, no framework
- **Component-based architecture** - Custom component loader system
- **i18next** - Internationalization
- **Responsive design** - Mobile-first approach

### Backend & Infrastructure
- **Supabase** - Database, authentication, Edge Functions
- **Cloudflare Pages** - Hosting and deployment
- **Stripe** - Payment processing
- **Resend** - Email delivery
- **Cloudflare Turnstile** - CAPTCHA

### Development Tools
- **Wrangler** - Cloudflare CLI tool
- **Git** - Version control

## 📁 Project Structure

```
bitminded.github.io/
├── about/              # About page and team information
├── account/            # User account management
├── admin/              # Admin panel components
├── auth/               # Authentication pages (login, signup, 2FA)
├── catalog/            # Product catalog
├── cloudflare/         # Cloudflare-specific configs
├── components/         # Shared UI components
├── css/                # Global stylesheets
├── docs/               # Project documentation
├── faq/                # FAQ pages
├── icons/              # Favicons and app icons
├── images/             # Image assets
├── js/                 # Global JavaScript files
├── legal-pages/        # Privacy, terms, cookies, imprint
├── maintenance/        # Maintenance mode page
├── services/           # Services pages (commissioning, tech support)
├── support/            # Support form
├── supabase/           # Supabase configs, migrations, Edge Functions
└── index.html          # Homepage
```

## 🚀 Getting Started

### Prerequisites

- Node.js (for npm packages)
- Git
- Supabase account (for backend services)
- Cloudflare account (for hosting)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/bitminded/bitminded.github.io.git
   cd bitminded.github.io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   - The site automatically detects environment based on hostname
   - Localhost uses dev Supabase project
   - Production domain uses production Supabase project
   - See `js/env-config.js` for configuration

4. **Run locally**
   - Use any static file server (e.g., VS Code Live Server, Python's `http.server`, or `npx serve`)
   - Or use Cloudflare Wrangler:
     ```bash
     npx wrangler pages dev
     ```

### Environment Configuration

The site uses environment-aware configuration:
- **Development**: Automatically uses dev Supabase when running on `localhost`
- **Production**: Uses production Supabase when deployed to `bitminded.ch`

Configuration is handled in `js/env-config.js` - no manual environment variables needed for frontend.

## 📚 Documentation

### Main Documentation
- **[docs/README.md](docs/README.md)** - Comprehensive documentation index
- **[docs/planning/PRIORITY-LIST-TO-DO.md](docs/planning/PRIORITY-LIST-TO-DO.md)** - Active implementation plan
- **[docs/planning/PRIORITY-LIST-COMPLETED-ITEMS.md](docs/planning/PRIORITY-LIST-COMPLETED-ITEMS.md)** - Completed features

### Key Sections
- **[admin/README.md](admin/README.md)** - Admin panel documentation
- **[supabase/README.md](supabase/README.md)** - Supabase setup and migrations
- **[services/README.md](services/README.md)** - Services and pricing information
- **[account/](account/)** - Account management documentation

### Business & Legal
- **[docs/business-legal/BUSINESS_MODEL.md](docs/business-legal/BUSINESS_MODEL.md)** - Business model
- **[docs/business-legal/LEGAL_COMPLIANCE_CHECKLIST.md](docs/business-legal/LEGAL_COMPLIANCE_CHECKLIST.md)** - Legal compliance

### Payment & Financial
- **[docs/payment-financial/POSTFINANCE-INTEGRATION-PLAN.md](docs/payment-financial/POSTFINANCE-INTEGRATION-PLAN.md)** - PostFinance integration
- **[docs/payment-financial/POINT-OF-SALE-READINESS.md](docs/payment-financial/POINT-OF-SALE-READINESS.md)** - POS system planning

## 🔧 Key Features

### Authentication & User Management
- Email/password authentication
- Two-factor authentication (2FA)
- Password reset and account recovery
- Session management
- Account deletion

### Admin Panel
- User management (CRUD operations)
- Product catalog management
- Service management
- Support ticket system
- Access control and permissions
- Analytics and reporting (planned)

### Services
- **Catalog Access**: Subscription-based access to app catalog
- **Commissioning**: Custom app development services
- **Tech Support**: Personal tech coaching and support

### Multi-language Support
- i18next integration
- Language switcher component
- Translatable content system

### Payment Processing
- Stripe integration for online payments
- Subscription management
- One-time purchases
- PostFinance integration (planned)

## 🗄️ Database

The project uses Supabase (PostgreSQL) with:
- User authentication tables
- Product catalog tables
- Subscription and payment tables
- Support ticket system
- Admin activity logging

See `supabase/schema/` for database schema and `supabase/migrations/` for migration files.

## 🚢 Deployment

### Cloudflare Pages

The site is deployed to Cloudflare Pages:

1. **Automatic deployment** - Pushes to `main` branch trigger production deployment
2. **Preview deployments** - Pull requests get preview URLs
3. **Environment variables** - Configured in Cloudflare dashboard

### Supabase Edge Functions

Edge Functions are deployed separately:

```bash
# Deploy to dev
supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn

# Deploy to prod
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

See `supabase/README.md` for detailed deployment instructions.

## 🔐 Security

- Row Level Security (RLS) policies on all database tables
- Environment-aware configuration (dev vs prod)
- Secure cookie handling for authentication
- CAPTCHA protection on forms
- 2FA support for admin accounts

## 🌍 Internationalization

The site supports multiple languages:
- Content is marked with `translatable-content` class
- Translation files in `lang-*/` directories
- Language switcher in navigation
- i18next for translation management

## 📝 Contributing

1. Create a feature branch from `dev`
2. Make your changes
3. Test thoroughly (especially in dev environment)
4. Submit a pull request

## 📄 License

Copyright © BitMinded. All rights reserved.

## 🔗 Links

- **Website**: https://bitminded.ch
- **GitHub**: https://github.com/bitminded/bitminded.github.io
- **Support**: https://bitminded.ch/support

---

**Built with care in Switzerland** 🇨🇭


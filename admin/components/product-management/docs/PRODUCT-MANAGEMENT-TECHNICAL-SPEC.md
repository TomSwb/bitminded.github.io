# 🏗️ Product Management System - Technical Specification

## 📋 **Overview**
Complete product management system for BitMinded with automated GitHub, Stripe, and Cloudflare integration, featuring a step-by-step wizard for product creation and PWA authentication system.

## ✅ **Implementation Status**

### **COMPLETED** ✅
- **Database Schema**: All 8 tables created with RLS policies and constraints
- **Product Management Component**: Complete admin interface with filtering, search, and CRUD operations
- **Translation System**: Full i18next integration (EN/ES/FR/DE)
- **Admin Panel Integration**: Seamlessly integrated with existing admin layout
- **Responsive Design**: Mobile-friendly with proper accessibility features

### **IN PROGRESS** ⏳
- **Product Creation Wizard**: Next step - Add Product button currently shows placeholder message

### **PENDING** ⏳
- **PWA Authentication System**: Specification ready, implementation pending
- **GitHub API Integration**: Repository creation and management
- **Stripe API Integration**: Payment processing and subscription management
- **Cloudflare Integration**: Domain and worker management
- **Analytics Dashboard**: Product performance metrics
- **Purchase Flow**: Complete checkout process

---

## 🗄️ **Database Strategy**

### **Database Architecture for Individual Products:**

#### **Strategy: Shared Supabase Database with Product Isolation**
- **Main Database**: Single Supabase project for all BitMinded products
- **Product Isolation**: Use `product_id` foreign keys to separate data
- **Benefits**: Unified authentication, cross-product analytics, cost-effective
- **Security**: RLS policies ensure users only access their own data

#### **Product Database Requirements:**
- **User Data**: Each product may need to store user-specific data
- **Product Data**: Product-specific content, settings, configurations
- **Analytics**: Usage tracking, feature usage, performance metrics
- **Offline Sync**: Local storage with server synchronization

### **Database Schema Design:**

#### **Product Data Isolation Pattern:**
```sql
-- All product-specific tables follow this pattern:
CREATE TABLE [product_name]_[data_type] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  -- Product-specific data fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example: Measure Mate data
CREATE TABLE measure_mate_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  measurement_type VARCHAR(100) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Dynamic Table Creation Strategy:**
- **Wizard Step**: "Does this product need a database?"
- **If Yes**: Create product-specific tables during product creation
- **Naming Convention**: `{product_slug}_{data_type}`
- **Auto-generated**: Based on product requirements

### **Core Tables:**

#### **1. `products`**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  category_id UUID REFERENCES product_categories(id),
  tags TEXT[], -- Array of tags
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, suspended, archived
  pricing_type VARCHAR(50) NOT NULL, -- one_time, subscription
  price_amount DECIMAL(10,2),
  price_currency VARCHAR(3) DEFAULT 'USD',
  subscription_interval VARCHAR(50), -- monthly, yearly (if subscription)
  github_repo_url VARCHAR(500),
  github_repo_name VARCHAR(255),
  cloudflare_domain VARCHAR(255),
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  is_commissioned BOOLEAN DEFAULT false,
  commissioned_by UUID REFERENCES user_profiles(id),
  commissioned_client_name VARCHAR(255),
  individual_price DECIMAL(10,2), -- Free for individuals
  enterprise_price DECIMAL(10,2), -- Reduced price for enterprises
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);
```

#### **2. `product_categories`**
```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Icon name/class
  color VARCHAR(7), -- Hex color
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **3. `product_purchases`**
```sql
CREATE TABLE product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  product_id UUID NOT NULL REFERENCES products(id),
  purchase_type VARCHAR(50) NOT NULL, -- one_time, subscription
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  user_type VARCHAR(50) NOT NULL, -- individual, enterprise
  discount_code VARCHAR(100),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired, suspended
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- For subscriptions
  cancelled_at TIMESTAMP WITH TIME ZONE,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE
);
```

#### **4. `product_analytics`**
```sql
CREATE TABLE product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID REFERENCES user_profiles(id), -- NULL for anonymous
  event_type VARCHAR(100) NOT NULL, -- view, purchase, usage, feature_used
  event_data JSONB, -- Additional event data
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **5. `product_reviews`**
```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **6. `discount_codes`**
```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(500),
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_amount DECIMAL(10,2),
  maximum_discount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **7. `product_maintenance`**
```sql
CREATE TABLE product_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  maintenance_type VARCHAR(50) NOT NULL, -- scheduled, emergency, update
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notify_users BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔐 **PWA Authentication System**

### **Access Control Strategy:**
1. **License Validation** - Check if user has valid purchase
2. **Offline Capability** - Cache license status locally
3. **Easy Integration** - Single file to include in PWAs
4. **Subdomain Protection** - Secure each product subdomain

### **Implementation:**
```javascript
// pwa-auth.js - Universal authentication file
class BitMindedAuth {
  constructor(productSlug) {
    this.productSlug = productSlug;
    this.domain = window.location.hostname;
    this.licenseKey = localStorage.getItem(`license_${productSlug}`);
    this.lastCheck = localStorage.getItem(`last_check_${productSlug}`);
  }

  async validateLicense() {
    // Check local cache first (offline capability)
    if (this.isLicenseValidLocally()) {
      return true;
    }

    // Online validation
    try {
      const response = await fetch('/api/validate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productSlug: this.productSlug,
          domain: this.domain,
          licenseKey: this.licenseKey 
        })
      });
      
      const result = await response.json();
      this.cacheLicenseStatus(result);
      return result.valid;
    } catch (error) {
      // Fallback to cached status if offline
      return this.isLicenseValidLocally();
    }
  }

  isLicenseValidLocally() {
    // Check if license is still valid based on cached data
    // Implement grace period logic here
    const expiresAt = localStorage.getItem(`expires_${this.productSlug}`);
    const lastCheck = localStorage.getItem(`last_check_${this.productSlug}`);
    
    if (!expiresAt || !lastCheck) return false;
    
    const now = Date.now();
    const lastCheckTime = parseInt(lastCheck);
    const expiresTime = parseInt(expiresAt);
    
    // License expired
    if (now > expiresTime) return false;
    
    // Cache is too old (24 hours)
    if (now - lastCheckTime > 24 * 60 * 60 * 1000) return false;
    
    return true;
  }

  cacheLicenseStatus(data) {
    localStorage.setItem(`license_${this.productSlug}`, data.licenseKey);
    localStorage.setItem(`last_check_${this.productSlug}`, Date.now());
    localStorage.setItem(`expires_${this.productSlug}`, data.expiresAt);
    localStorage.setItem(`domain_${this.productSlug}`, this.domain);
  }

  // Initialize protection on page load
  async init() {
    const isValid = await this.validateLicense();
    if (!isValid) {
      this.showAccessDenied();
    }
    return isValid;
  }

  showAccessDenied() {
    // Redirect to purchase page or show access denied message
    window.location.href = `https://bitminded.ch/products/${this.productSlug}`;
  }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
  const productSlug = document.querySelector('meta[name="product-slug"]')?.content;
  if (productSlug) {
    const auth = new BitMindedAuth(productSlug);
    auth.init();
  }
});
```

### **Subdomain Protection Strategy:**

#### **1. Domain-Based License Validation**
- Each product subdomain (e.g., `measure-mate.bitminded.ch`) validates against the main domain
- License keys are tied to specific domains
- Cross-subdomain authentication using shared cookies/localStorage

#### **2. Cloudflare Worker Protection**
```javascript
// cloudflare-worker.js - Subdomain protection
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const productSlug = url.hostname.split('.')[0]; // measure-mate from measure-mate.bitminded.ch
    
    // Check if user has valid license for this product
    const licenseValid = await validateLicense(request, productSlug);
    
    if (!licenseValid) {
      return new Response('Access Denied', { 
        status: 403,
        headers: { 'Location': `https://bitminded.ch/products/${productSlug}` }
      });
    }
    
    return fetch(request);
  }
};
```

#### **3. Database Schema Addition**
```sql
-- Add domain tracking to product_purchases
ALTER TABLE product_purchases ADD COLUMN allowed_domains TEXT[] DEFAULT ARRAY['bitminded.ch'];
ALTER TABLE product_purchases ADD COLUMN license_key VARCHAR(255) UNIQUE;
ALTER TABLE product_purchases ADD COLUMN domain_validated_at TIMESTAMP WITH TIME ZONE;

-- Create license validation table
CREATE TABLE product_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES product_purchases(id),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  license_key VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **4. Easy Integration for PWAs**
```html
<!-- Add to each PWA's index.html -->
<meta name="product-slug" content="measure-mate">
<script src="https://bitminded.ch/js/pwa-auth.js"></script>
```

#### **5. Grace Period Implementation**
- **7-day grace period** for expired licenses
- **24-hour cache** for offline validation
- **Automatic redirect** to purchase page when access denied
- **Graceful degradation** for offline scenarios

---

## 🧙‍♂️ **Product Creation Wizard Flow**

### **Step 1: Basic Information**
- Product name
- Description (rich text)
- Category selection
- Tags
- Pricing type (one-time vs subscription)
- **Database requirements** (Yes/No + data types needed)

### **Step 2: Pricing Configuration**
- Individual price (free)
- Enterprise price (reduced)
- Subscription interval (if applicable)
- Discount codes (optional)

### **Step 3: Database Configuration** (If Required)
- **Data Types**: What data will the product store?
- **Table Structure**: Auto-generate based on requirements
- **RLS Policies**: Automatic security policies
- **Offline Sync**: Local storage configuration
- **Migration Scripts**: Auto-generate for product updates

### **Step 4: GitHub Integration**
- Repository creation (automatic via GitHub API)
- Repository settings
- Branch protection rules
- Webhook configuration

### **Step 5: Stripe Integration**
- Product creation in Stripe
- Price creation
- Webhook setup for payments

### **Step 6: Cloudflare Configuration**
- Domain setup instructions
- DNS configuration guide
- SSL certificate setup

### **Step 7: Content & Media**
- Screenshots upload
- Demo videos (optional)
- Documentation links
- Feature list

### **Step 8: Review & Publish**
- Preview product page
- Test purchase flow
- Publish to catalog

---

## 🔌 **API Endpoints**

### **Database Management:**
- `POST /api/products/:id/database` - Create product database tables
- `GET /api/products/:id/database/schema` - Get product database schema
- `POST /api/products/:id/database/migrate` - Run database migrations
- `DELETE /api/products/:id/database` - Remove product database tables
- `POST /api/products/:id/database/backup` - Backup product data

### **Product Management:**
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/suspend` - Suspend product
- `POST /api/products/:id/reactivate` - Reactivate product

### **Purchase Management:**
- `POST /api/purchases` - Create purchase
- `GET /api/purchases/:id` - Get purchase details
- `POST /api/purchases/:id/cancel` - Cancel subscription

### **Analytics:**
- `POST /api/analytics/track` - Track event
- `GET /api/analytics/products/:id` - Get product analytics

### **License Validation:**
- `POST /api/validate-license` - Validate PWA license
- `GET /api/license/:productSlug` - Get license info
- `POST /api/license/generate` - Generate new license key
- `POST /api/license/revoke` - Revoke license access
- `POST /api/license/domain-validate` - Validate domain access

---

## 🎨 **UI Components**

### **Admin Panel Components:**
- `product-wizard/` - Step-by-step creation
- `product-list/` - Product management table
- `product-detail/` - Individual product management
- `analytics-dashboard/` - Product performance metrics
- `purchase-management/` - User purchase tracking

### **Public Components:**
- `product-catalog/` - Public product browsing
- `product-page/` - Individual product display
- `purchase-flow/` - Checkout process
- `license-validation/` - PWA authentication

---

## 🔄 **Integration Points**

### **GitHub API:**
- Repository creation
- Branch management
- Webhook setup
- File uploads

### **Stripe API:**
- Product creation
- Price management
- Payment processing
- Webhook handling

### **Cloudflare API:**
- DNS management
- SSL certificates
- Page rules
- Analytics

---

## 📊 **Success Metrics Tracking**

### **Key Metrics:**
- Product views
- Purchase conversions
- User engagement
- Revenue per product
- Support tickets
- User satisfaction (reviews)

### **Analytics Implementation:**
- Real-time dashboard
- Exportable reports
- Trend analysis
- Comparative metrics

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Foundation** ✅ **COMPLETED**
1. ✅ Database schema creation - **COMPLETED** (All 8 tables created with RLS policies)
2. ✅ Basic product CRUD operations - **COMPLETED** (Product Management Component)
3. ⏳ Simple purchase flow - **PENDING** (Database ready, UI pending)
4. ⏳ PWA authentication system - **PENDING** (Specification ready)

### **Phase 2: Wizard & Automation** ⏳ **IN PROGRESS**
1. ⏳ Product creation wizard - **NEXT STEP** (Add Product button placeholder)
2. ⏳ GitHub API integration - **PENDING**
3. ⏳ Stripe API integration - **PENDING**
4. ⏳ Cloudflare setup guides - **PENDING**

### **Phase 3: Advanced Features** ⏳ **PENDING**
1. ⏳ Analytics dashboard - **PENDING**
2. ⏳ Review system - **PENDING**
3. ⏳ Discount codes - **PENDING**
4. ⏳ Maintenance mode - **PENDING**

### **Phase 4: Optimization** ⏳ **PENDING**
1. ⏳ Performance improvements - **PENDING**
2. ⏳ Advanced analytics - **PENDING**
3. ⏳ A/B testing - **PENDING**
4. ⏳ Mobile optimization - **PENDING**

---

## 🔒 **Security Considerations**

### **Data Protection:**
- RLS policies for all tables
- Encrypted sensitive data
- Secure API endpoints
- Input validation

### **Access Control:**
- Admin-only product management
- User purchase validation
- License verification
- Rate limiting

---

## 📱 **PWA Requirements**

### **Offline Capability:**
- Service worker implementation
- Local data caching
- License status caching
- Graceful degradation

### **Performance:**
- Fast loading times
- Minimal bundle size
- Efficient caching
- Progressive enhancement

---

This technical specification provides the foundation for building a comprehensive product management system that meets all your requirements!

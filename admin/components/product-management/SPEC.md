# Product Management Component Specification

## Overview
Complete product catalog management system. Add, edit, and manage all products/tools with Stripe synchronization.

## Responsibilities
- Manage product catalog (CRUD operations)
- Configure pricing (monthly, yearly, lifetime)
- Create product bundles
- Sync with Stripe products and prices
- Enable/disable products
- Manage product metadata and descriptions
- Upload product images/icons

## UI Components

### Header Section
- Title: "Product Management"
- Total products count
- **Add New Product** button
- **Sync with Stripe** button
- **Create Bundle** button

### Products Grid/List View

**View Toggle**: Grid view / List view

**Each Product Card Shows**:
1. **Product Info**
   - Product icon/image
   - Product name
   - Product ID (subdomain)
   - Short description

2. **Pricing**
   - Monthly price (if applicable)
   - Yearly price (if applicable)
   - Lifetime price (if applicable)
   - Stripe price IDs

3. **Status**
   - Active/Inactive toggle
   - "Coming Soon" badge
   - "Beta" badge
   - Featured badge

4. **Metrics**
   - Active subscriptions count
   - Total revenue
   - Conversion rate

5. **Actions**
   - Edit product
   - View in Stripe
   - Duplicate product
   - Delete product (if no subs)

### Add/Edit Product Modal

**Form Fields**:

**Basic Information**:
- **Product ID** (slug: 'converter', 'measure-mate')
  - Auto-generated from name
  - Used in database and URLs
- **Product Name** (display name)
- **Tagline** (short description)
- **Description** (rich text, Phase 3)
- **Category** (dropdown: Productivity, Developer Tools, etc.)

**Subdomain Configuration**:
- **Subdomain** (e.g., 'converter.bitminded.ch')
- **GitHub Pages URL** (where tool is hosted)
- **Redirect URL** (for Cloudflare Worker)

**Pricing**:
- ☑ **Monthly Subscription**
  - Price (CHF)
  - Stripe Price ID (auto or manual)
  
- ☑ **Yearly Subscription**
  - Price (CHF)
  - Discount % (calculated from monthly)
  - Stripe Price ID

- ☑ **Lifetime Access**
  - One-time price (CHF)
  - Stripe Price ID

- ☑ **Free Trial**
  - Trial duration (days)
  - Requires payment method (yes/no)

**Media**:
- **Product Icon** (upload)
- **Product Images** (gallery, Phase 3)
- **Demo Video URL** (optional)

**Metadata**:
- **Features List** (bullet points)
- **Target Audience**
- **Technical Stack** (tags)
- **Documentation URL**
- **Support Email**

**Availability**:
- **Status**: Draft / Active / Coming Soon / Archived
- **Featured** (show on homepage)
- **Available for Purchase**
- **Require Admin Approval** (manual grant only)

**Stripe Integration**:
- ☑ **Create in Stripe** (auto-create Stripe product)
- ☑ **Sync Pricing** (keep prices in sync)
- **Stripe Product ID** (display only)

**Save** and **Save & Publish** buttons

### Bundle Creation Modal

**Bundle Configuration**:
- **Bundle Name** (e.g., "Professional Bundle")
- **Bundle ID** (e.g., "pro-bundle")
- **Description**
- **Select Products** (multi-select)
  - Show individual prices
  - Calculate total
- **Bundle Price** (discounted from total)
- **Discount %** (auto-calculated)
- **Pricing**:
  - Monthly bundle price
  - Yearly bundle price
  - Lifetime bundle price
- **Create Bundle** button

### Stripe Sync Panel

**Sync Options**:
- **Pull from Stripe** (import Stripe products)
- **Push to Stripe** (create/update Stripe products)
- **Two-way Sync** (bidirectional)

**Sync Status**:
- Last sync timestamp
- Products in sync: X/Y
- Products needing sync (list)
- **Sync Now** button

**Sync Log**:
- Recent sync activities
- Errors/warnings
- Success count

## Functionality

### Create Product
```javascript
async createProduct(productData) {
    // 1. Validate product data
    // 2. Generate product ID from name
    // 3. Upload product images
    // 4. Save to database
    
    // If create in Stripe:
    // 5. Create Stripe product
    // 6. Create Stripe prices
    // 7. Store Stripe IDs
    
    // 8. Log admin action
    // 9. Update UI
    // 10. Show success message
}
```

### Sync with Stripe
```javascript
async syncWithStripe(direction = 'pull') {
    if (direction === 'pull') {
        // 1. Fetch all Stripe products
        // 2. Fetch all Stripe prices
        // 3. Match with local products
        // 4. Update local database
        // 5. Create missing products
    }
    
    if (direction === 'push') {
        // 1. Get all local products
        // 2. Create/update in Stripe
        // 3. Store Stripe IDs locally
    }
    
    // Both:
    // 4. Log sync activity
    // 5. Show sync results
}
```

### Create Bundle
```javascript
async createBundle(bundleData) {
    // 1. Validate bundle products
    // 2. Calculate pricing
    // 3. Create bundle in database
    
    // Stripe:
    // 4. Create Stripe product for bundle
    // 5. Create prices
    
    // 6. Create entitlement mapping (bundle → products)
    // 7. Log action
    // 8. Update UI
}
```

### Enable/Disable Product
```javascript
async toggleProductStatus(productId, active) {
    // 1. Update product status
    
    // If disabling:
    // 2. Check for active subscriptions
    // 3. Warn if users will be affected
    // 4. Optionally migrate users
    
    // Stripe:
    // 5. Archive/unarchive Stripe product
    
    // 6. Log action
    // 7. Update UI
}
```

## Database Schema

### Products Table
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,  -- 'converter', 'measure-mate'
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT,
    subdomain TEXT UNIQUE,
    github_pages_url TEXT,
    
    -- Pricing
    price_monthly DECIMAL,
    price_yearly DECIMAL,
    price_lifetime DECIMAL,
    
    -- Stripe IDs
    stripe_product_id TEXT,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,
    stripe_price_lifetime_id TEXT,
    
    -- Media
    icon_url TEXT,
    images TEXT[],
    demo_video_url TEXT,
    
    -- Metadata
    features TEXT[],
    target_audience TEXT,
    tech_stack TEXT[],
    documentation_url TEXT,
    support_email TEXT,
    
    -- Availability
    status TEXT DEFAULT 'draft', -- draft, active, coming-soon, archived
    is_featured BOOLEAN DEFAULT false,
    is_available_for_purchase BOOLEAN DEFAULT true,
    requires_admin_approval BOOLEAN DEFAULT false,
    
    -- Trial
    trial_days INTEGER DEFAULT 0,
    trial_requires_payment BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Product Bundles Table
```sql
CREATE TABLE product_bundles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    product_ids TEXT[] NOT NULL,
    
    price_monthly DECIMAL,
    price_yearly DECIMAL,
    price_lifetime DECIMAL,
    
    stripe_product_id TEXT,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,
    stripe_price_lifetime_id TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Stripe Integration

### Create Product in Stripe
```javascript
const stripeProduct = await stripe.products.create({
    name: productData.name,
    description: productData.description,
    images: [productData.icon_url],
    metadata: {
        product_id: productData.id,
        subdomain: productData.subdomain
    }
});

// Create prices
if (productData.price_monthly) {
    const monthlyPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: productData.price_monthly * 100, // Convert to cents
        currency: 'chf',
        recurring: { interval: 'month' },
        metadata: { type: 'monthly' }
    });
}
```

## API Methods

```javascript
class ProductManagement {
    async init()
    async loadProducts()
    async createProduct(productData)
    async updateProduct(productId, updates)
    async deleteProduct(productId)
    async toggleProductStatus(productId, active)
    async duplicateProduct(productId)
    async createBundle(bundleData)
    async syncWithStripe(direction)
    async uploadProductIcon(file)
    async uploadProductImages(files)
    showProductModal(productId = null)
    showBundleModal()
    showSyncPanel()
}
```

## Translations Keys
- `product_management`: "Product Management"
- `total_products`: "Total Products"
- `add_new_product`: "Add New Product"
- `create_bundle`: "Create Bundle"
- `sync_with_stripe`: "Sync with Stripe"
- `product_name`: "Product Name"
- `product_id`: "Product ID"
- `description`: "Description"
- `pricing`: "Pricing"
- `monthly_price`: "Monthly Price"
- `yearly_price`: "Yearly Price"
- `lifetime_price`: "Lifetime Price"
- `subdomain`: "Subdomain"
- `status`: "Status"
- `active`: "Active"
- `inactive`: "Inactive"
- `coming_soon`: "Coming Soon"
- `featured`: "Featured"
- `save_product`: "Save Product"
- `delete_product`: "Delete Product"
- `edit_product`: "Edit Product"
- `view_in_stripe`: "View in Stripe"

## Styling Requirements
- Grid view for products (cards)
- List view option (table)
- Drag-and-drop for images
- Color-coded status badges
- Rich text editor for descriptions (Phase 3)
- Preview mode before publishing

## Dependencies
- Stripe SDK
- Supabase client (products table)
- Image upload service (Supabase Storage)
- Translation system
- Admin layout component
- Rich text editor (Phase 3)

## Security Considerations
- Only admins can manage products
- Validate product data thoroughly
- Secure Stripe API calls (server-side)
- Log all product changes
- Confirm before deleting products with subscriptions

## Performance Considerations
- Cache product list
- Lazy load product images
- Optimize Stripe sync (batch operations)
- Index products table

## Testing Checklist
- [ ] Create product works
- [ ] Edit product works
- [ ] Delete product works
- [ ] Toggle status works
- [ ] Duplicate product works
- [ ] Create bundle works
- [ ] Sync with Stripe (pull)
- [ ] Sync with Stripe (push)
- [ ] Upload images works
- [ ] Product validation works
- [ ] Mobile responsive
- [ ] All actions logged

## Implementation Priority
**Phase 2** - Essential for catalog management

## Future Enhancements
- Product variants (different tiers)
- Seasonal pricing
- Geographic pricing
- Product categories and tags
- Product reviews/ratings
- A/B testing for pricing
- Product analytics dashboard


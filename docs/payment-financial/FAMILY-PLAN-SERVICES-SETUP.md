# Family Plan Services Setup

> **Created:** 2025-11-25  
> **Status:** ✅ Ready for Stripe Product Creation  
> **Purpose:** Documentation for family plan service entries and Stripe product creation

---

## Overview

Family plan services are separate service entries in the database that are:
- **Hidden from catalog display** (`display_in_catalog = false`)
- **Linked to parent services** via `parent_service_slug`
- **Accessible via toggle** on the catalog access page
- **Ready for Stripe product creation** through the admin service management modal

---

## Database Structure

### New Fields Added to `services` Table

1. **`display_in_catalog`** (BOOLEAN, default: `true`)
   - Controls whether service appears in catalog access page
   - Family services have this set to `false`

2. **`parent_service_slug`** (VARCHAR(255), nullable)
   - Links family variant to parent service
   - Example: `'all-tools-membership-family'` → `'all-tools-membership'`

3. **`is_family_variant`** (BOOLEAN, default: `false`)
   - Marks service as a family plan variant
   - Used for filtering and identification

### Family Service Entries Created

1. **All-Tools Membership (Family)**
   - Slug: `all-tools-membership-family`
   - Parent: `all-tools-membership`
   - Pricing: CHF 3.50/member/month, CHF 38.50/member/year

2. **Supporter Tier (Family)**
   - Slug: `supporter-tier-family`
   - Parent: `supporter-tier`
   - Pricing: CHF 5/member/month, CHF 55/member/year

---

## How It Works

### Catalog Access Page

1. **Default Display**: Only shows individual services (`display_in_catalog = true`)
2. **Family Toggle**: When user toggles to "Family" pricing:
   - Page loads family variant service from database
   - Displays family pricing (per-member rates)
   - Uses family service for checkout

### Service Loader

- **`loadServices(category)`**: Filters out services where `display_in_catalog = false`
- **`getFamilyServiceByParentSlug(parentSlug)`**: Loads family variant by parent slug

### Checkout Flow

When user clicks "Subscribe" with family toggle ON:
- Uses family service slug (`all-tools-membership-family` or `supporter-tier-family`)
- Passes `is_family_plan: true` in metadata
- Webhook handler detects family plan and routes accordingly

---

## Creating Stripe Products for Family Services

### Via Admin Service Management Modal

1. **Navigate to Admin Panel** → Service Management
2. **Find Family Service**:
   - Search for "all-tools-membership-family" or "supporter-tier-family"
   - Or filter by category: "catalog-access"
3. **Edit Service**:
   - Click on the family service to edit
   - Verify pricing is correct (per-member rates)
4. **Create Stripe Product**:
   - Click "Create Stripe Product" button
   - System will:
     - Create Stripe product with name: "All-Tools Membership (Family)" or "Supporter Tier (Family)"
     - Create monthly price: CHF 3.50 or CHF 5 (per-member)
     - Create yearly price: CHF 38.50 or CHF 55 (per-member)
     - Store Stripe product ID and price IDs in service record
5. **Verify**:
   - Check that `stripe_product_id` is populated
   - Check that `stripe_price_monthly_id` and `stripe_price_yearly_id` are populated
   - View in Stripe dashboard to confirm

### Important Notes

- **Per-Member Pricing**: Stripe products use per-member prices (CHF 3.50 or CHF 5)
- **Quantity-Based**: Checkout will use `quantity = member_count` (2-6 members)
- **Metadata**: Stripe products should include metadata:
  ```json
  {
    "is_family_plan": "true",
    "plan_name": "family_all_tools" or "family_supporter",
    "parent_service_slug": "all-tools-membership" or "supporter-tier"
  }
  ```

---

## Webhook Handler Integration

The webhook handler (`stripe-webhook/index.ts`) will:

1. **Detect Family Plans**:
   - Check `session.metadata.is_family_plan === 'true'`
   - Or check product name contains "Family"
   - Or check service slug ends with "-family"

2. **Route to Family Handler**:
   - Calls `handleFamilyPlanPurchase()` function
   - Creates `family_groups` and `family_members` records
   - Creates `family_subscriptions` record with `plan_name = 'family_all_tools'` or `'family_supporter'`

3. **Grant Access**:
   - Grants subscription access to all family members
   - Links subscription to family group

---

## Testing Checklist

- [ ] Family services exist in database (`all-tools-membership-family`, `supporter-tier-family`)
- [ ] Family services have `display_in_catalog = false`
- [ ] Family services have `parent_service_slug` set correctly
- [ ] Catalog access page does NOT show family services as separate cards
- [ ] Family toggle on catalog access page loads family services correctly
- [ ] Family pricing displays correctly (CHF 3.50/member or CHF 5/member)
- [ ] Stripe products created for both family services
- [ ] Stripe product IDs saved to service records
- [ ] Checkout flow uses family service slug when toggle is ON
- [ ] Webhook handler detects and processes family plan purchases

---

## Migration Applied

**File**: `supabase/migrations/20251125_add_family_plan_services.sql`

**Changes**:
- Added `display_in_catalog`, `parent_service_slug`, `is_family_variant` columns
- Created indexes for performance
- Inserted family service entries
- Set family services to hidden from catalog

---

## Next Steps

1. ✅ Migration applied (run via SQL editor)
2. ⏳ Create Stripe products via admin service management modal
3. ⏳ Test catalog access page toggle
4. ⏳ Test checkout flow with family toggle
5. ⏳ Test webhook handler with family plan purchase

---

## Related Files

- Migration: `supabase/migrations/20251125_add_family_plan_services.sql`
- Service Loader: `services/components/service-loader/service-loader.js`
- Catalog Access Page: `services/catalog-access/catalog-access.js`
- Service Management: `admin/components/service-management/service-management.js`
- Webhook Handler: `supabase/functions/stripe-webhook/index.ts`
- Family Plans Schema: `supabase/migrations/20251125_create_family_plans_schema.sql`


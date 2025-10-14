# Access Control Component Specification

## Overview
Centralized view for managing manual access grants across all products and users. Provides bulk operations and access policy management.

## Responsibilities
- View all manual access grants
- Grant access to users (individual or bulk)
- Revoke access
- Set access policies and rules
- Monitor access usage
- Generate access reports

## UI Components

### Header Section
- Title: "Access Control"
- Total active grants count
- **Grant Access** button
- **Access Policies** button
- **Export Report** button

### Filter Panel
**Filter Options**:
- **Product**: All / Converter / DevFlow / etc.
- **Grant Type**: All / Manual / Subscription / Trial / Lifetime
- **Status**: All / Active / Expired / Revoked
- **Granted By**: All admins / Specific admin
- **Date Range**: Custom range picker
- **Has Expiration**: All / Yes / No

### Access Grants Table

**Columns**:
1. **User**
   - Avatar + Username
   - Email
   - Click to view user detail

2. **Product**
   - Product name
   - Product icon/badge

3. **Grant Type**
   - Manual badge
   - Subscription badge
   - Trial badge
   - Lifetime badge

4. **Status**
   - Active (green)
   - Expired (gray)
   - Revoked (red)

5. **Granted By**
   - Admin username
   - Or "System" (for Stripe)

6. **Granted Date**
   - Date/time
   - Relative time

7. **Expiration**
   - Date/time
   - "Never" for lifetime
   - Days remaining

8. **Reason/Notes**
   - Truncated text
   - Click to view full

9. **Actions**
   - Extend expiration
   - Revoke access
   - View details

### Grant Access Modal

**Form Fields**:
- **User Selection**
  - Search/select user
  - Or enter email
  - Bulk: Upload CSV or select multiple

- **Product Selection**
  - Dropdown or checkboxes
  - "All Products" option

- **Grant Type**
  - ○ Trial (with duration)
  - ○ Time-limited (with expiration)
  - ○ Lifetime
  - ○ Subscription-based (sync with Stripe)

- **Expiration** (if applicable)
  - Date picker
  - Or duration selector (7, 14, 30, 90 days)

- **Reason/Note**
  - Text field
  - Required for manual grants
  - Predefined templates:
    - "Beta tester"
    - "Partner access"
    - "Promotional grant"
    - "Customer support"
    - Custom

- **Notification**
  - ☑ Send email to user
  - ☑ Create in-app notification

- **Grant Access** button

### Access Policies Section (Phase 3)

**Policy Rules**:
- Auto-grant trials (new signups get 14-day trial)
- Partner domain rules (auto-grant for @partner.com)
- Referral grants (referrer gets bonus access)
- Seasonal promotions

**Each Policy Shows**:
- Policy name
- Conditions/rules
- Products affected
- Active/inactive toggle
- Edit/delete buttons

## Functionality

### Grant Access
```javascript
async grantAccess(userIds, products, grantType, expiration, reason) {
    // 1. Validate inputs
    // 2. Create entitlements for each user/product combination
    // 3. Set expiration if applicable
    // 4. Log admin action with reason
    // 5. Send notifications if selected
    // 6. Update UI
    // 7. Show success message with count
}
```

### Bulk Grant Access
```javascript
async bulkGrantAccess(csvFile) {
    // 1. Parse CSV (user_email, product_id, expiration, reason)
    // 2. Validate all entries
    // 3. Show preview with errors
    // 4. Confirm and execute
    // 5. Show results (success/failed count)
    // 6. Log all actions
}
```

### Revoke Access
```javascript
async revokeAccess(entitlementId, reason) {
    // 1. Confirm action
    // 2. Set entitlement to inactive
    // 3. Log action with reason
    // 4. Optionally notify user
    // 5. Update UI
}
```

### Extend Access
```javascript
async extendAccess(entitlementId, newExpiration, reason) {
    // 1. Update expiration date
    // 2. Log extension with reason
    // 3. Notify user
    // 4. Update UI
}
```

### Access Policies (Phase 3)
```javascript
async createPolicy(policyData) {
    // 1. Define policy rules
    // 2. Set triggers and conditions
    // 3. Specify products affected
    // 4. Activate policy
    // 5. Log policy creation
}

async evaluatePolicy(trigger, userContext) {
    // 1. Check if policy applies
    // 2. Grant access if conditions met
    // 3. Log automatic grant
}
```

## Database Queries

### View All Grants
```sql
SELECT 
    e.id,
    e.app_id,
    e.active,
    e.expires_at,
    e.created_at,
    e.granted_by,
    e.grant_reason,
    up.username,
    up.avatar_url,
    au.email,
    admin_up.username as granted_by_name
FROM entitlements e
JOIN user_profiles up ON e.user_id = up.id
JOIN auth.users au ON e.user_id = au.id
LEFT JOIN user_profiles admin_up ON e.granted_by = admin_up.id
WHERE 
    ($productId IS NULL OR e.app_id = $productId)
    AND ($status IS NULL OR e.active = $status)
    AND ($grantedBy IS NULL OR e.granted_by = $grantedBy)
ORDER BY e.created_at DESC;
```

### Extended Entitlements Table
```sql
-- Add fields to existing entitlements table
ALTER TABLE entitlements 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS grant_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS grant_reason TEXT;
```

### Access Policies Table (Phase 3)
```sql
CREATE TABLE access_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    policy_type TEXT NOT NULL, -- 'trial', 'partner', 'referral', 'promo'
    conditions JSONB NOT NULL,
    products TEXT[], -- array of product IDs
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Methods

```javascript
class AccessControl {
    async init()
    async loadGrants(filters)
    async grantAccess(userIds, products, grantType, expiration, reason)
    async bulkGrantAccess(csvData)
    async revokeAccess(entitlementId, reason)
    async extendAccess(entitlementId, newExpiration, reason)
    async loadPolicies()
    async createPolicy(policyData)
    async updatePolicy(policyId, updates)
    async deletePolicy(policyId)
    async togglePolicy(policyId, active)
    async exportAccessReport(filters)
    filterGrants(filters)
    showGrantModal()
    showPolicyModal()
}
```

## Translations Keys
- `access_control`: "Access Control"
- `total_active_grants`: "Total Active Grants"
- `grant_access`: "Grant Access"
- `access_policies`: "Access Policies"
- `export_report`: "Export Report"
- `filter_by_product`: "Filter by Product"
- `filter_by_type`: "Filter by Type"
- `grant_type`: "Grant Type"
- `manual`: "Manual"
- `subscription`: "Subscription"
- `trial`: "Trial"
- `lifetime`: "Lifetime"
- `granted_by`: "Granted By"
- `expiration`: "Expiration"
- `never_expires`: "Never"
- `days_remaining`: "days remaining"
- `reason_notes`: "Reason/Notes"
- `revoke_access`: "Revoke Access"
- `extend_access`: "Extend Access"
- `bulk_grant`: "Bulk Grant Access"
- `select_users`: "Select Users"
- `select_products`: "Select Products"
- `set_expiration`: "Set Expiration"
- `reason_required`: "Reason is required"
- `send_notification`: "Send notification to user"
- `grant_successful`: "Access granted successfully"
- `revoke_successful`: "Access revoked successfully"

## Styling Requirements
- Table view with sorting
- Color-coded grant types
- Expiration date warnings (red if < 7 days)
- Modal dialogs for actions
- CSV upload drag-and-drop
- Preview before bulk operations

## Dependencies
- Supabase client (entitlements, users)
- Translation system
- Admin layout component
- Email/notification service
- CSV parser library
- Date picker component

## Security Considerations
- Verify admin permissions
- Log all grant/revoke actions
- Require reason for manual grants
- Confirm bulk operations
- Rate limit grant requests
- Audit trail for all changes

## Performance Considerations
- Paginate large grant lists
- Index entitlements table properly
- Cache product list
- Debounce search inputs
- Optimize multi-join queries

## Testing Checklist
- [ ] Load grants correctly
- [ ] Filter and search work
- [ ] Grant access (single user)
- [ ] Grant access (multiple users)
- [ ] Bulk grant from CSV
- [ ] Revoke access works
- [ ] Extend access works
- [ ] Notifications sent correctly
- [ ] Access policies work (Phase 3)
- [ ] Export report works
- [ ] All actions logged
- [ ] Mobile responsive

## Implementation Priority
**Phase 1** - Manual grants and basic list
**Phase 2** - Bulk operations and CSV import
**Phase 3** - Access policies and automation

## Future Enhancements
- Access templates (save common grant configurations)
- Scheduled grants (grant access at future date)
- Conditional access (e.g., only during business hours)
- Usage-based access (revoke after X uses)
- Grace period on expiration


# Admin Layout Component Specification

## Overview
The main layout component for the admin panel, providing navigation, structure, and access control for all admin functionality.

## Responsibilities
- Verify admin role before allowing access
- Provide consistent navigation across all admin sections
- Handle responsive layout for mobile/tablet/desktop
- Display current admin user information
- Provide logout functionality
- Route to different admin sections

## UI Components

### Navigation Menu
**Desktop**:
- Vertical sidebar with sections
- Collapsible/expandable
- Active section highlighting
- Icons + text labels

**Mobile**:
- Hamburger menu
- Full-screen overlay navigation
- Touch-friendly targets

### Navigation Items (Phases)
**Phase 1**:
- Dashboard (overview)
- Users (user management)
- Access Control

**Phase 2**:
- Subscriptions
- Products
- Revenue

**Phase 3**:
- Analytics
- Communications
- Bulk Operations

### Header
- Admin panel title
- Current admin username
- Admin role badge
- Logout button
- Mobile menu toggle

### Main Content Area
- Dynamic content loading
- Section-specific content
- Loading states
- Error handling

### Footer
- Admin activity log link
- Last login info
- Quick actions

## Functionality

### Access Control
```javascript
async checkAdminAccess() {
    // 1. Check if user is authenticated
    // 2. Check if user has admin role
    // 3. Require 2FA if enabled
    // 4. Log admin access
    // 5. Redirect if not admin
}
```

### Navigation
```javascript
navigateToSection(sectionName) {
    // 1. Hide current section
    // 2. Load new section content
    // 3. Update URL (if using hash routing)
    // 4. Update active nav item
    // 5. Log navigation in admin activity
}
```

### Admin Activity Logging
```javascript
logAdminAction(action, details) {
    // Log to admin_activity table:
    // - admin_user_id
    // - action_type
    // - details (JSON)
    // - timestamp
    // - ip_address
}
```

## Database Requirements

### Tables Used
- `user_roles` - Check admin role
- `admin_activity` - Log admin actions (new table)
- `user_2fa` - Check 2FA requirement

### New Table Needed
```sql
CREATE TABLE admin_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Methods

```javascript
class AdminLayout {
    async init()
    async checkAdminAccess()
    async loadSection(sectionName)
    getCurrentSection()
    navigateToSection(sectionName)
    logAction(action, details)
    showError(message)
    showSuccess(message)
    logout()
}
```

## Translations Keys
- `admin_panel_title`: "Admin Panel"
- `dashboard`: "Dashboard"
- `users`: "Users"
- `access_control`: "Access Control"
- `subscriptions`: "Subscriptions"
- `products`: "Products"
- `revenue`: "Revenue"
- `analytics`: "Analytics"
- `communications`: "Communications"
- `bulk_operations`: "Bulk Operations"
- `admin_user`: "Admin User"
- `logout`: "Logout"
- `unauthorized_access`: "You do not have admin access"
- `admin_2fa_required`: "2FA is required for admin access"

## Styling Requirements
- Follow existing BitMinded design system
- Dark/light theme support
- Mobile-first responsive
- Consistent with account management layout
- Admin-specific color accents (different from user pages)

## Dependencies
- Supabase client (auth, database)
- Component loader system
- Translation system
- Theme system

## Security Considerations
- Admin role verification on every load
- 2FA enforcement for admin users
- Activity logging for audit trail
- Session timeout handling
- Secure navigation (no direct URL access without auth)

## Testing Checklist
- [ ] Non-admin users redirected
- [ ] Admin users can access all sections
- [ ] 2FA requirement works
- [ ] Navigation updates correctly
- [ ] Activity logging works
- [ ] Mobile navigation functions
- [ ] Logout works properly
- [ ] URL routing works
- [ ] Error states display correctly
- [ ] Loading states show properly

## Implementation Priority
**Phase 1** - Critical for all admin functionality


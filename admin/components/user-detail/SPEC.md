# User Detail Component Specification

## Overview
Comprehensive view of an individual user with all information and management capabilities in one place. Accessed by clicking a user from the user management list.

## Responsibilities
- Display complete user profile
- Edit user information
- Manage user access and subscriptions
- View user activity history
- Perform user actions (suspend, delete, reset password)
- Send direct messages to user

## UI Components

### Header Section
- **Back to Users** button
- User avatar (large)
- Username (editable inline)
- Email (editable inline)
- User ID (copy to clipboard)
- User status badges (Active, Suspended, Admin, etc.)

### Tab Navigation
1. **Overview** - General info and quick stats
2. **Subscriptions** - All access and subscriptions
3. **Activity** - Login history and actions
4. **Security** - 2FA status, password, sessions
5. **Actions** - Admin actions on this user

## Tab 1: Overview

### User Information Card
- **Username**: (editable)
- **Email**: (editable)
- **Role**: Dropdown (User, Admin)
- **Status**: Toggle (Active, Suspended)
- **Registration Date**: Display
- **Last Login**: Display
- **2FA Status**: Enabled/Disabled badge
- **Save Changes** button

### Quick Stats
- Total subscriptions: X
- Active subscriptions: X
- Lifetime value: $X
- Account age: X days

### Notes Section
- Admin notes about this user
- Add/edit/delete notes
- Timestamp and admin who added note
- Rich text editor (Phase 3)

## Tab 2: Subscriptions

### Current Subscriptions List
Each subscription shows:
- Product name
- Status (Active, Expired, Cancelled)
- Start date
- End date / Expiration
- Price paid
- Payment method (last 4 digits)
- **Actions**: Extend, Cancel, Refund

### Grant Access Section
- **Select Product** dropdown
- **Access Type**: 
  - Subscription (recurring)
  - One-time (with expiration)
  - Lifetime
- **Expiration Date** picker (if applicable)
- **Reason/Note** text field
- **Grant Access** button

### Access History
- All past and current access grants
- Who granted it (manual vs Stripe)
- When granted/revoked
- Reason/notes

## Tab 3: Activity

### Login History
Table with:
- Date/time
- IP address
- Location (if available)
- Device/browser
- Success/failure
- 2FA used (yes/no)

### User Actions Log
- All actions user has taken
- Account changes
- Subscription changes
- Downloads/exports
- Tool usage (future)

### Timeline View (Phase 3)
- Visual timeline of all events
- Filterable by event type

## Tab 4: Security

### 2FA Management
- Current status: Enabled/Disabled
- **Reset 2FA** button (removes 2FA, forces setup)
- Backup codes status
- Last used date

### Password Management
- **Reset Password** button
  - Sends reset email to user
  - Or admin sets temporary password
- Last changed date
- Password strength (if known)

### Active Sessions
- List of all active sessions
- Device info
- IP address
- Started date
- Last activity
- **Terminate Session** button for each
- **Terminate All Sessions** button

### Security Events
- Failed login attempts
- Password changes
- 2FA changes
- Suspicious activity alerts

## Tab 5: Actions

### User Management Actions

**Account Status**:
- **Suspend Account** (with reason required)
- **Reactivate Account**
- **Delete Account** (with confirmation, irreversible warning)

**Communication**:
- **Send Email** (opens email composer)
- **Send Notification** (in-app notification)

**Data Management**:
- **Export User Data** (GDPR compliance)
- **Download User Data** (JSON/CSV)
- **View Deletion Requests** (if scheduled)

**Access Management**:
- **View All Access** (summary from Tab 2)
- **Revoke All Access** (emergency button)
- **Grant Bundle Access** (all products)

### Action Confirmation Modals
- Destructive actions require confirmation
- Reason field for suspensions/deletions
- Email notification checkbox
- Admin password confirmation for critical actions

## Functionality

### Load User Data
```javascript
async loadUserData(userId) {
    // 1. Get user profile
    // 2. Get user auth data
    // 3. Get subscriptions/access
    // 4. Get activity history
    // 5. Get security info
    // 6. Get admin notes
}
```

### Edit User Information
```javascript
async updateUserInfo(userId, updates) {
    // 1. Validate changes
    // 2. Update database
    // 3. Log admin action
    // 4. Send notification to user (optional)
    // 5. Refresh UI
}
```

### Grant Access
```javascript
async grantAccess(userId, productId, accessType, expiration, reason) {
    // 1. Create entitlement
    // 2. Set expiration if applicable
    // 3. Log action with reason
    // 4. Send email to user
    // 5. Update UI
}
```

### Suspend User
```javascript
async suspendUser(userId, reason) {
    // 1. Show confirmation modal
    // 2. Update user status
    // 3. Revoke active sessions
    // 4. Log action with reason
    // 5. Send suspension email
    // 6. Update UI
}
```

### Delete User
```javascript
async deleteUser(userId, reason) {
    // 1. Show strong confirmation (type username)
    // 2. Export user data first
    // 3. Delete from all tables
    // 4. Log action with reason
    // 5. Send deletion confirmation email
    // 6. Navigate back to user list
}
```

## Database Queries

### User Overview
```sql
-- Complete user data
SELECT 
    up.*,
    au.email,
    au.created_at,
    ur.role,
    la.last_login,
    t2fa.is_enabled as has_2fa,
    COUNT(DISTINCT e.id) as total_subscriptions,
    COUNT(DISTINCT CASE WHEN e.active = true THEN e.id END) as active_subscriptions,
    COALESCE(SUM(p.amount), 0) as lifetime_value
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = up.id
LEFT JOIN user_2fa t2fa ON t2fa.user_id = up.id
LEFT JOIN login_activity la ON la.user_id = up.id 
    AND la.id = (SELECT id FROM login_activity WHERE user_id = up.id ORDER BY login_time DESC LIMIT 1)
LEFT JOIN entitlements e ON e.user_id = up.id
LEFT JOIN payments p ON p.user_id = up.id
WHERE up.id = $userId
GROUP BY up.id, au.email, au.created_at, ur.role, la.last_login, t2fa.is_enabled;
```

### Admin Notes
```sql
CREATE TABLE admin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Methods

```javascript
class UserDetail {
    async init(userId)
    async loadUserData(userId)
    async loadSubscriptions(userId)
    async loadActivity(userId)
    async loadSecurity(userId)
    async updateUserInfo(updates)
    async grantAccess(productId, accessType, expiration, reason)
    async revokeAccess(entitlementId, reason)
    async suspendUser(reason)
    async reactivateUser()
    async deleteUser(reason)
    async resetPassword(userId)
    async reset2FA(userId)
    async terminateSession(sessionId)
    async terminateAllSessions(userId)
    async exportUserData(userId)
    async addNote(note)
    async sendEmail(subject, message)
    switchTab(tabName)
}
```

## Translations Keys
- `user_detail`: "User Details"
- `back_to_users`: "Back to Users"
- `overview`: "Overview"
- `subscriptions`: "Subscriptions"
- `activity`: "Activity"
- `security`: "Security"
- `actions`: "Actions"
- `user_information`: "User Information"
- `quick_stats`: "Quick Stats"
- `admin_notes`: "Admin Notes"
- `grant_access`: "Grant Access"
- `current_subscriptions`: "Current Subscriptions"
- `access_history`: "Access History"
- `login_history`: "Login History"
- `suspend_account`: "Suspend Account"
- `delete_account`: "Delete Account"
- `send_email`: "Send Email"
- `export_data`: "Export User Data"
- `confirm_action`: "Confirm Action"
- `reason_required`: "Reason is required"
- `action_irreversible`: "This action cannot be undone"

## Styling Requirements
- Card-based layout for sections
- Tab navigation (sticky on scroll)
- Responsive for all devices
- Action buttons clearly marked (destructive in red)
- Loading states for each tab
- Inline editing for user info

## Dependencies
- Supabase client (all user data)
- Translation system
- Admin layout component
- Email service (for notifications)
- Export functionality

## Security Considerations
- Require admin password for destructive actions
- Log all changes to admin_activity
- Mask sensitive data appropriately
- Confirm before irreversible actions
- Send notifications to user when appropriate

## Performance Considerations
- Lazy load each tab's data
- Cache user data (refresh button available)
- Paginate long activity logs
- Optimize multi-table queries

## Testing Checklist
- [ ] User data loads correctly
- [ ] All tabs load properly
- [ ] Edit user info works
- [ ] Grant access works
- [ ] Revoke access works
- [ ] Suspend/reactivate works
- [ ] Delete user works (with safety)
- [ ] Reset password works
- [ ] Reset 2FA works
- [ ] Terminate sessions works
- [ ] Admin notes work
- [ ] Send email works
- [ ] Export data works
- [ ] All actions logged
- [ ] Confirmations show for destructive actions

## Implementation Priority
**Phase 1** - Core user management functionality (Tabs 1, 2, 5)
**Phase 2** - Subscription details (Tab 2 enhanced)
**Phase 3** - Advanced activity and timeline (Tabs 3, 4 enhanced)


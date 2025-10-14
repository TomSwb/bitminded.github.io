# User Management Component Specification

## Overview
Displays a comprehensive list of all users with search, filter, and pagination capabilities. Main entry point for user administration.

## Responsibilities
- Display all registered users
- Provide search and filtering
- Pagination for large user lists
- Sort by various criteria
- Quick actions on users
- Navigate to user detail view

## UI Components

### Header Section
- Title: "User Management"
- Total user count
- Search bar (real-time search)
- Add user button (Phase 3)
- Export users button

### Filter Panel
**Filter Options**:
- **Status**: All / Active / Inactive / Suspended
- **Role**: All / User / Admin / Beta
- **Subscription**: All / Active / None / Expired
- **Registration Date**: All / Today / This Week / This Month / Custom Range
- **Has 2FA**: All / Enabled / Disabled
- **Clear Filters** button

### User Table/List

**Columns**:
1. **User Info**
   - Avatar (or initial)
   - Username
   - Email

2. **Status**
   - Active/Inactive badge
   - Suspended badge (if applicable)

3. **Role**
   - User/Admin badge

4. **Subscriptions**
   - Count of active subscriptions
   - Product names (abbreviated)

5. **Registration Date**
   - Formatted date
   - "X days ago" relative time

6. **Last Login**
   - Date/time
   - Relative time

7. **Actions**
   - View details button
   - Quick suspend button
   - Quick grant access button

### Pagination
- Items per page selector (10, 25, 50, 100)
- Page numbers
- Previous/Next buttons
- Total count display
- Jump to page

### Bulk Actions (Phase 3)
- Select all checkbox
- Bulk suspend
- Bulk grant access
- Bulk email

## Functionality

### Search
```javascript
searchUsers(query) {
    // Real-time search (debounced)
    // Search fields:
    // - Username
    // - Email
    // - User ID
    // Update table with results
}
```

### Filter
```javascript
filterUsers(filters) {
    // Apply multiple filters
    // Combine with search
    // Update table with filtered results
}
```

### Sort
```javascript
sortUsers(column, direction) {
    // Sort by column
    // Toggle ascending/descending
    // Remember sort preference
}
```

### Pagination
```javascript
loadPage(pageNumber, itemsPerPage) {
    // Load specific page
    // Update URL with page param
    // Scroll to top
}
```

### Quick Actions
```javascript
quickSuspendUser(userId) {
    // Suspend with confirmation
    // Update UI immediately
    // Log action
}

quickGrantAccess(userId) {
    // Open mini grant access modal
    // Select product
    // Set expiration
    // Grant and update UI
}
```

## Database Queries

### Main Query (with all filters)
```sql
SELECT 
    up.id,
    up.username,
    up.avatar_url,
    up.created_at,
    au.email,
    la.last_login,
    up.status,
    ur.role,
    COUNT(e.id) as subscription_count,
    ARRAY_AGG(e.app_id) as subscribed_products
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
LEFT JOIN login_activity la ON la.user_id = up.id 
    AND la.id = (
        SELECT id FROM login_activity 
        WHERE user_id = up.id 
        ORDER BY login_time DESC 
        LIMIT 1
    )
LEFT JOIN user_roles ur ON ur.user_id = up.id
LEFT JOIN entitlements e ON e.user_id = up.id AND e.active = true
WHERE 
    (up.username ILIKE '%' || $search || '%' OR au.email ILIKE '%' || $search || '%')
    AND ($status IS NULL OR up.status = $status)
    AND ($role IS NULL OR ur.role = $role)
    AND ($hasSubscription IS NULL OR (
        CASE 
            WHEN $hasSubscription = true THEN COUNT(e.id) > 0
            WHEN $hasSubscription = false THEN COUNT(e.id) = 0
        END
    ))
GROUP BY up.id, au.email, la.last_login, up.status, ur.role
ORDER BY $sortColumn $sortDirection
LIMIT $limit OFFSET $offset;
```

### Count Query (for pagination)
```sql
SELECT COUNT(DISTINCT up.id) 
FROM user_profiles up
-- Same WHERE clause as main query
```

## API Methods

```javascript
class UserManagement {
    async init()
    async loadUsers(page, filters, sort)
    async searchUsers(query)
    async filterUsers(filters)
    async sortUsers(column, direction)
    async exportUsers(filters)
    async suspendUser(userId)
    async grantAccessQuick(userId, productId, expiration)
    navigateToUserDetail(userId)
    updateFilters(newFilters)
    clearFilters()
}
```

## Translations Keys
- `user_management`: "User Management"
- `total_users`: "Total Users"
- `search_users`: "Search users..."
- `filter_by`: "Filter by"
- `status`: "Status"
- `role`: "Role"
- `subscription_status`: "Subscription"
- `registration_date`: "Registration Date"
- `has_2fa`: "Has 2FA"
- `clear_filters`: "Clear Filters"
- `username`: "Username"
- `email`: "Email"
- `subscriptions`: "Subscriptions"
- `last_login`: "Last Login"
- `actions`: "Actions"
- `view_details`: "View Details"
- `suspend`: "Suspend"
- `grant_access`: "Grant Access"
- `items_per_page`: "Items per page"
- `export_users`: "Export Users"
- `no_users_found`: "No users found"
- `loading_users`: "Loading users..."

## Styling Requirements
- Responsive table (horizontal scroll on mobile)
- Compact mobile view (card-based)
- Sticky header when scrolling
- Row hover effects
- Loading skeletons
- Empty state illustration

## Dependencies
- Supabase client (user queries)
- Translation system
- Admin layout component
- User detail component (for navigation)

## Performance Considerations
- Implement virtual scrolling for large lists (Phase 3)
- Index database columns for fast search
- Debounce search input (300ms)
- Cache filter results
- Lazy load avatars
- Optimize queries with proper indexes

## Security Considerations
- Only show data admin has permission to see
- Mask sensitive user data if needed
- Log all user management actions
- Confirm destructive actions
- Rate limit API requests

## Testing Checklist
- [ ] User list loads correctly
- [ ] Search works in real-time
- [ ] All filters work correctly
- [ ] Sorting works for all columns
- [ ] Pagination works
- [ ] Quick actions work
- [ ] Navigate to detail works
- [ ] Export users works
- [ ] Mobile responsive layout
- [ ] Loading states show
- [ ] Error handling works
- [ ] Empty state displays

## Implementation Priority
**Phase 1** - Critical foundation for user administration

## Future Enhancements (Phase 3)
- Column customization (show/hide columns)
- Save filter presets
- Bulk actions with selection
- Advanced search with operators
- User import functionality


# Dashboard Component Specification

## Overview
The main admin dashboard providing an at-a-glance overview of key metrics, recent activity, and system health.

## Responsibilities
- Display key performance indicators (KPIs)
- Show recent user activity
- Display subscription metrics
- Show revenue summary
- Provide quick actions
- Alert to issues requiring attention

## UI Components

### Stats Cards (Top Row)
1. **Total Users**
   - Count of all registered users
   - Growth indicator (+X this week)
   - Click to view user list

2. **Active Subscriptions**
   - Count of active paid subscriptions
   - Revenue value
   - Click to view subscriptions

3. **Revenue (This Month)**
   - Current month revenue
   - Comparison to last month
   - Click to view revenue reports

4. **New Users (This Week)**
   - Count of new signups
   - Growth trend
   - Click to view new users

### Recent Activity Section
- Last 10 user registrations
- Recent subscription purchases
- Recent access grants (manual)
- Recent admin actions

### Subscription Overview
- Breakdown by product (pie chart or bars)
- Active vs cancelled subscriptions
- Upcoming renewals/expirations

### Quick Actions Panel
- Grant access to user (quick form)
- View latest support requests
- Send announcement
- Export data

### Alerts/Notifications
- Failed payments requiring attention
- Expiring trial subscriptions
- Support requests pending
- System issues

## Functionality

### Load Dashboard Data
```javascript
async loadDashboardData() {
    // 1. Get total users count
    // 2. Get active subscriptions count
    // 3. Get current month revenue
    // 4. Get new users this week
    // 5. Get recent activity
    // 6. Get subscription breakdown
    // 7. Get pending alerts
}
```

### Refresh Data
```javascript
refreshDashboard() {
    // Auto-refresh every 30 seconds
    // Manual refresh button
    // Show last updated timestamp
}
```

### Quick Actions
```javascript
quickGrantAccess(userId, productId) {
    // Inline form to grant access quickly
    // Without navigating away from dashboard
}
```

## Database Queries

### Stats Queries
```sql
-- Total users
SELECT COUNT(*) FROM user_profiles;

-- Active subscriptions
SELECT COUNT(*) FROM entitlements 
WHERE active = true;

-- Revenue this month
SELECT SUM(amount) FROM payments 
WHERE created_at >= date_trunc('month', NOW());

-- New users this week
SELECT COUNT(*) FROM user_profiles 
WHERE created_at >= date_trunc('week', NOW());
```

### Recent Activity
```sql
-- Recent registrations
SELECT * FROM user_profiles 
ORDER BY created_at DESC LIMIT 10;

-- Recent subscriptions
SELECT * FROM entitlements 
ORDER BY created_at DESC LIMIT 10;

-- Recent admin actions
SELECT * FROM admin_activity 
ORDER BY created_at DESC LIMIT 10;
```

### Subscription Breakdown
```sql
-- By product
SELECT app_id, COUNT(*) as count 
FROM entitlements 
WHERE active = true 
GROUP BY app_id;
```

## API Methods

```javascript
class Dashboard {
    async init()
    async loadStats()
    async loadRecentActivity()
    async loadSubscriptionBreakdown()
    async loadAlerts()
    async refreshData()
    async quickGrantAccess(userId, productId)
    navigateToSection(section)
}
```

## Translations Keys
- `dashboard_title`: "Dashboard Overview"
- `total_users`: "Total Users"
- `active_subscriptions`: "Active Subscriptions"
- `revenue_this_month`: "Revenue (This Month)"
- `new_users_this_week`: "New Users (This Week)"
- `recent_activity`: "Recent Activity"
- `subscription_overview`: "Subscription Overview"
- `quick_actions`: "Quick Actions"
- `alerts`: "Alerts & Notifications"
- `grant_access`: "Grant Access"
- `view_all`: "View All"
- `refresh`: "Refresh"
- `last_updated`: "Last updated"

## Charts/Visualizations

### Phase 1 (Basic)
- Simple stat cards with numbers
- Text-based recent activity list
- Table for subscriptions

### Phase 3 (Advanced)
- Line chart for user growth
- Pie/donut chart for subscription breakdown
- Bar chart for revenue trends
- Real-time updating charts

## Styling Requirements
- Grid layout for responsive stats cards
- Card-based UI for sections
- Color coding for metrics (green = good, red = attention needed)
- Loading skeletons for async data
- Empty states when no data

## Dependencies
- Supabase client (database queries)
- Chart library (Phase 3: Chart.js or D3.js)
- Translation system
- Admin layout component

## Security Considerations
- Only show data admin has permission to see
- Mask sensitive financial data if needed
- Log all dashboard actions
- Rate limit refresh requests

## Performance Considerations
- Cache dashboard data (30 second refresh)
- Lazy load charts and heavy visualizations
- Paginate recent activity if needed
- Optimize database queries with indexes

## Testing Checklist
- [ ] All stats display correctly
- [ ] Stats update on refresh
- [ ] Recent activity loads properly
- [ ] Quick actions work
- [ ] Alerts display correctly
- [ ] Navigation links work
- [ ] Mobile layout responsive
- [ ] Loading states show
- [ ] Error handling works
- [ ] Data refreshes automatically

## Implementation Priority
**Phase 1** - Basic stats and lists
**Phase 3** - Advanced charts and visualizations


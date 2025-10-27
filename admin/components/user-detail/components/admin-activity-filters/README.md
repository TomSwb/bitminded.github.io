# Admin Activity Filters Component

A comprehensive filtering system for the admin activity table that allows administrators to filter activities by date range, action types, and target users with persistent preferences.

## Features

### 🎯 **Multi-Column Filtering**
- **Date Range Filter**: All Time, Last 7 days, Last 30 days, Last 3 months, Last 6 months, Last year
- **Action Type Filter**: Multi-select dropdown with all available action types
- **Target User Filter**: Multi-select dropdown with usernames + "Admin Actions" option

### 💾 **Persistent Preferences**
- Filter settings are saved per admin user in the `admin_preferences` table
- Preferences are automatically restored when the admin returns
- Settings persist across browser sessions

### 🌍 **Internationalization**
- Full translation support for English, Spanish, French, and German
- Integrates with the existing i18next translation system
- Dynamic language switching

### 🔍 **Advanced UI Features**
- **Search functionality** within multi-select dropdowns
- **Select All / Deselect All** buttons for quick selection
- **Real-time filtering** without page reload
- **Filter count indicators** (e.g., "Showing 5 of 23 activities")
- **Clear All Filters** button for quick reset

## File Structure

```
admin/components/user-detail/components/admin-activity-filters/
├── admin-activity-filters.html          # Component HTML structure
├── admin-activity-filters.css           # Component styles
├── admin-activity-filters.js            # Main component logic
├── admin-activity-filters-translations.js # Translation system
├── locales/
│   └── admin-activity-filters-locales.json # Translation files
└── README.md                           # This file
```

## Database Requirements

### Admin Preferences Table
```sql
CREATE TABLE public.admin_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id)
);
```

## Integration

### 1. HTML Integration
The component is automatically loaded into the admin activity section:
```html
<div id="admin-activity-filters-container"></div>
<div id="user-detail-admin-actions" class="user-detail__activity-list">
    <!-- Filtered activities will be displayed here -->
</div>
```

### 2. JavaScript Integration
The component is dynamically loaded and initialized:
```javascript
// Component is loaded automatically when admin activity data is fetched
await this.loadAdminActivityFilters();

// Filter changes trigger table updates
window.addEventListener('adminActivityFiltered', (event) => {
    this.renderAdminActivityTable(event.detail.filteredActivities);
});
```

## Usage

### For Administrators
1. **Navigate** to any user's detail page
2. **Click** on the "Activity" tab
3. **Use filters** to narrow down admin activities:
   - Select date range from dropdown
   - Choose specific action types from multi-select
   - Filter by target users
4. **Search** within dropdowns for quick selection
5. **Clear filters** anytime with the "Clear All Filters" button

### Filter Options

#### Date Ranges
- **All Time**: Shows all activities
- **Last 7 days**: Activities from the past week
- **Last 30 days**: Activities from the past month
- **Last 3 months**: Activities from the past quarter
- **Last 6 months**: Activities from the past half year
- **Last year**: Activities from the past year

#### Action Types
- **View User Detail**: When admin views a user's profile
- **Update User Field**: When admin modifies user data
- **Send Email Change**: When admin sends email change request
- **Send Password Reset**: When admin sends password reset
- **Revoke All Sessions**: When admin revokes user sessions
- **Revoke Session**: When admin revokes a specific session
- **Admin Panel Access**: When admin accesses the panel
- **Section Navigation**: When admin navigates between sections
- **View User List**: When admin views the user list

#### Target Users
- **All Users**: Shows activities for all users
- **Specific Users**: Select individual users by username
- **Admin Actions**: Shows admin-only activities (no target user)

## Technical Details

### Component Lifecycle
1. **Initialization**: Component loads CSS, translations, and JavaScript
2. **Data Loading**: Receives admin activities from parent component
3. **Filter Setup**: Populates filter options based on available data
4. **Preference Loading**: Restores saved filter settings
5. **Event Binding**: Sets up filter change listeners
6. **Rendering**: Displays filtered results in real-time

### Event System
- **`adminActivityFiltered`**: Dispatched when filters change
  - `event.detail.filteredActivities`: Array of filtered activities
  - `event.detail.totalCount`: Total number of activities
  - `event.detail.filteredCount`: Number of filtered activities

### Translation Keys
```json
{
  "filter_admin_activity": "Filter Admin Activity",
  "clear_all_filters": "Clear All Filters",
  "date_range": "Date Range",
  "action_types": "Action Types",
  "target_users": "Target Users",
  "showing_all_activities": "Showing all activities",
  "showing_filtered_activities": "Showing {filteredCount} of {totalCount} activities"
}
```

## Performance Considerations

- **Lazy Loading**: Component only loads when admin activity data is fetched
- **Efficient Filtering**: Client-side filtering for fast response times
- **Cached Preferences**: Filter settings are cached and only saved on changes
- **Optimized Queries**: Database queries are optimized with proper indexing

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Features Used**: CSS Grid, Flexbox, ES6 Classes, Fetch API, Custom Events
- **Fallbacks**: Graceful degradation for older browsers

## Future Enhancements

- [ ] **Export Filtered Data**: Export filtered results to CSV/Excel
- [ ] **Saved Filter Presets**: Save and name custom filter combinations
- [ ] **Advanced Date Filters**: Custom date range picker
- [ ] **Bulk Actions**: Perform actions on filtered results
- [ ] **Real-time Updates**: Live updates when new activities occur
- [ ] **Activity Analytics**: Charts and statistics for filtered data

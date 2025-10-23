# Login Activity Filters Component

## Overview
A comprehensive filtering system for login activity data in the admin user detail page. Allows administrators to filter login activities by various criteria with persistent preferences.

## Features
- **Date Range Filtering**: Filter by time periods (24h, 7d, 30d, 90d, all)
- **Status Filtering**: Filter by success/failure status
- **Device Type Filtering**: Filter by device types (desktop, mobile, tablet)
- **Browser Filtering**: Filter by browser types
- **Location Filtering**: Filter by country/city
- **2FA Filtering**: Filter by 2FA usage
- **Persistent Preferences**: Filter settings saved per admin user
- **Real-time Search**: Search within filter dropdowns
- **Clear All Filters**: Quick reset functionality

## File Structure
```
login-activity-filters/
├── README.md
├── login-activity-filters.html
├── login-activity-filters.css
├── login-activity-filters.js
├── login-activity-filters-translations.js
└── locales/
    └── login-activity-filters-locales.json
```

## Usage
The component is automatically loaded into the user detail page and integrates with the login activity table to provide filtered views of login data.

## Database Requirements
- Uses existing `admin_preferences` table for storing filter preferences
- Requires `user_login_activity` table with columns: login_time, success, device_type, browser, location_country, location_city, used_2fa

## Translation Support
- English (EN)
- Spanish (ES) 
- French (FR)
- German (DE)

## Integration
- Loaded dynamically into `#login-activity-filters-container`
- Communicates with parent via custom events
- Receives login activities via `setActivities()` method
- Dispatches `loginActivityFiltered` event with filtered results

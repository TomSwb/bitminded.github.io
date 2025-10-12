# 🔔 Notification Center Component

## Overview

Global notification center component that displays in-app notifications with a bell icon. Shows unread count badge and dropdown list of recent notifications.

---

## Features

✅ **Bell icon in header** - Next to language switcher  
✅ **Unread count badge** - Red badge with number  
✅ **Dropdown notification list** - Shows 20 recent notifications  
✅ **Mark as read** - Click notification or mark all  
✅ **Auto-refresh** - Polls every 30 seconds for new notifications  
✅ **Multi-language** - Notifications in user's language (EN/ES/FR/DE)  
✅ **Dark mode** - Full theme support  
✅ **Responsive** - Mobile-friendly  
✅ **Categories** - Security, Account, Product, Announcement  

---

## File Structure

```
components/notification-center/
├── notification-center.html                # Bell icon + dropdown UI
├── notification-center.css                 # Styling
├── notification-center.js                  # Component logic
├── notification-center-translations.js     # Translation loader
├── locales/
│   └── notification-center-locales.json   # Translations
└── README.md                               # This file
```

---

## Integration

### Loaded Globally

The component is loaded on all pages via `js/script.js`:

```javascript
// Only loads if user is authenticated
async function loadNotificationCenter() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Skip if not logged in
    
    await componentLoader.load('notification-center', {
        container: 'header',
        priority: 'high'
    });
}
```

### Position in Header

Bell icon appears in header next to:
- 🌐 Language switcher
- 🔔 Notification center (new!)
- Auth buttons / User avatar

---

## How It Works

### Display Flow
```
1. User logs in
2. Notification center loads in header
3. Bell icon appears next to language switcher
4. Polls database every 30s for new notifications
5. Shows unread count in red badge
6. Click bell → Dropdown opens
7. Click notification → Marks as read, navigates to link
```

### Database Integration

**Table:** `user_notifications`

```sql
- id (UUID)
- user_id (UUID) - Foreign key to auth.users
- type (TEXT) - 'security', 'account', 'product', 'announcement'
- title (TEXT) - Notification title
- message (TEXT) - Notification message
- icon (TEXT) - Emoji icon
- link (TEXT) - Optional URL to navigate to
- read (BOOLEAN) - Read status
- created_at (TIMESTAMP) - When created
- read_at (TIMESTAMP) - When marked as read
- expires_at (TIMESTAMP) - Optional expiration
```

---

## Creating Notifications

### Automatic (via components)

When user performs actions, notifications are created automatically:

```javascript
// When password changed:
await notificationHelper.passwordChanged();
// Creates:
// - Email notification (if preference enabled)
// - In-app notification (always)
```

### Manual (via Edge Function)

```javascript
const { data, error } = await supabase.functions.invoke('create-notification', {
    body: {
        userId: user.id,
        type: 'password_changed',
        data: {}
    }
});
```

---

## Notification Types

### Security
- 🔒 Password Changed
- 🛡️ 2FA Enabled
- ⚠️ 2FA Disabled  
- 🔐 New Login

### Account
- 👤 Username Changed

### Future
- 🎉 Product Updates
- 📢 Announcements

---

## API

### Methods

**`init()`** - Initialize component
```javascript
await window.notificationCenter.init();
```

**`refresh()`** - Manually refresh notifications
```javascript
await window.notificationCenter.refresh();
```

**`markAsRead(notificationId)`** - Mark notification as read
```javascript
await window.notificationCenter.markAsRead('uuid');
```

**`markAllAsRead()`** - Mark all as read
```javascript
await window.notificationCenter.markAllAsRead();
```

**`destroy()`** - Stop polling and cleanup
```javascript
window.notificationCenter.destroy();
```

---

## Database Functions

### Get Unread Count
```sql
SELECT public.get_unread_notification_count();
-- Returns: INTEGER (number of unread notifications)
```

### Mark All as Read
```sql
SELECT public.mark_all_notifications_read();
-- Returns: INTEGER (number updated)
```

### Cleanup Old Notifications
```sql
SELECT public.cleanup_old_notifications(90);
-- Deletes notifications older than 90 days
```

---

## Styling

Uses CSS variables for theming:
- `--color-surface` - Dropdown background
- `--color-border` - Borders
- `--color-text-primary` - Text color
- `--color-primary` - Accent color
- `--color-error` - Badge color

Dark mode automatically supported via `[data-theme="dark"]` selectors.

---

## Polling

Notifications are polled every **30 seconds** to check for new items.

To change polling interval:
```javascript
// In notification-center.js, line ~430:
this.pollingInterval = setInterval(() => {
    this.loadNotifications();
}, 30000); // Change this value (in milliseconds)
```

---

## Performance

- Component size: ~15KB
- Database query: Simple indexed SELECT
- Polling: Every 30s (minimal impact)
- Limit: 20 most recent notifications
- Auto-cleanup: Deletes notifications > 90 days old

---

## Testing

### Manual Test
1. Refresh any page while logged in
2. Bell icon should appear in header
3. Change your password
4. Bell badge should show "1"
5. Click bell → See notification
6. Click notification → Marks as read, badge updates

### Console Test
```javascript
// Check if loaded
window.notificationCenter

// Manually refresh
await window.notificationCenter.refresh();

// Check notifications
console.log(window.notificationCenter.notifications);

// Check unread count
console.log(window.notificationCenter.unreadCount);
```

---

## Troubleshooting

**Bell doesn't appear:**
- Check if user is logged in
- Check console for errors
- Verify component-loader.js includes handler

**Notifications don't update:**
- Check database table exists
- Verify RLS policies
- Check Edge Function deployed: `create-notification`
- View logs: `supabase functions logs create-notification`

**Badge count wrong:**
- Refresh: `window.notificationCenter.refresh()`
- Check database: `SELECT * FROM user_notifications WHERE user_id = auth.uid()`

---

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** October 12, 2025



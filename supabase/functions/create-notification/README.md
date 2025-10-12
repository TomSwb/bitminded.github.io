# Create Notification Edge Function

## Overview

This Edge Function creates in-app notifications in the `user_notifications` table. While **user-action notifications** (password changes, logins, etc.) are created directly from the client, this function is designed for **admin-initiated notifications** like marketing campaigns, product announcements, and system messages.

---

## Current Status

✅ **Function deployed** but not currently used for user actions  
✅ **Ready for admin notifications** (marketing, announcements, etc.)  
⏳ **Waiting for admin dashboard implementation**

**Note:** User-action notifications (password changed, username changed, login, 2FA) are currently created directly from the client via `notification-helper.js` for simplicity and performance.

---

## Use Cases

### Admin-Initiated Notifications
- 📢 **Product Announcements**: New features, app launches
- 📧 **Marketing Campaigns**: Newsletters, special offers
- ⚠️ **System Messages**: Maintenance, updates, alerts
- 🎉 **Engagement**: Tips, tutorials, onboarding flows

---

## API Reference

### Endpoint
```
POST https://[YOUR-PROJECT].supabase.co/functions/v1/create-notification
```

### Authentication
Requires Supabase service role key or valid user JWT token.

### Request Body

```typescript
{
  userId: string,        // Target user ID (required)
  type: string,          // Notification type (required)
  data?: object          // Additional context (optional)
}
```

### Supported Notification Types

#### Security Notifications
- `password_changed`
- `two_fa_enabled`
- `two_fa_disabled`
- `new_login`

#### Account Notifications
- `username_changed`

#### Future (Admin) Notifications
- `product_announcement`
- `marketing_offer`
- `system_maintenance`
- `feature_tutorial`

---

## Examples

### Single User Notification

```javascript
// Send announcement to one user
const { data, error } = await supabase.functions.invoke('create-notification', {
  body: {
    userId: 'user-uuid-here',
    type: 'product_announcement',
    data: {
      customTitle: 'New Feature Released!',
      customMessage: 'Check out our new dashboard analytics',
      customIcon: '🎉',
      customLink: '/features/analytics'
    }
  }
})
```

### Bulk Notifications (All Users)

```javascript
// Get all users
const { data: users } = await supabase
  .from('user_preferences')
  .select('user_id, notification_preferences')

// Filter users who have marketing enabled
const marketingUsers = users.filter(u => 
  u.notification_preferences?.inapp?.marketing !== false
)

// Send to each user
const results = await Promise.all(
  marketingUsers.map(user =>
    supabase.functions.invoke('create-notification', {
      body: {
        userId: user.user_id,
        type: 'marketing_offer',
        data: {
          customTitle: 'Special Offer: 50% Off',
          customMessage: 'Limited time offer on premium features',
          customIcon: '💎',
          customLink: '/pricing'
        }
      }
    })
  )
)

console.log(`✅ Sent ${results.length} notifications`)
```

### Targeted Notifications

```javascript
// Target users who enabled specific preferences
const { data: targetUsers } = await supabase
  .from('user_preferences')
  .select('user_id, notification_preferences')
  .filter('notification_preferences->inapp->product_updates', 'eq', true)

// Send product update
for (const user of targetUsers) {
  await supabase.functions.invoke('create-notification', {
    body: {
      userId: user.user_id,
      type: 'product_announcement',
      data: {
        customTitle: 'New Apps Available',
        customMessage: 'We just added 5 new integrations to the catalog',
        customIcon: '🚀',
        customLink: '/catalog'
      }
    }
  })
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "notification": {
    "id": "notification-uuid",
    "user_id": "user-uuid",
    "type": "product",
    "title": "New Feature Released!",
    "message": "Check out our new dashboard analytics",
    "icon": "🎉",
    "link": "/features/analytics",
    "read": false,
    "created_at": "2025-10-12T10:30:00Z"
  }
}
```

### Skipped (User Disabled)
```json
{
  "success": true,
  "skipped": true,
  "reason": "User disabled marketing in-app notifications"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Missing required parameters: userId and type"
}
```

---

## Notification Templates

The function includes built-in templates for standard notifications. For admin notifications, you can override with custom data:

```javascript
data: {
  customTitle: 'Your title',      // Overrides template title
  customMessage: 'Your message',  // Overrides template message
  customIcon: '🎯',              // Overrides template icon
  customLink: '/custom/path'      // Overrides template link
}
```

---

## User Preferences

The function respects user notification preferences from `user_preferences.notification_preferences.inapp`:

```json
{
  "inapp": {
    "password_changed": true,
    "two_fa": true,
    "new_login": true,
    "username_changed": true,
    "product_updates": false,    // User disabled
    "marketing": false           // User disabled
  }
}
```

**Behavior:**
- If preference is `false`, notification is skipped
- If preference is `true` or missing, notification is sent
- Returns `{ skipped: true, reason: "..." }` when skipped

---

## Multi-Language Support

Notifications are automatically translated based on the user's language preference (`user_preferences.language`):

- **English** (en)
- **Spanish** (es)
- **French** (fr)
- **German** (de)

Templates are built-in for standard notification types. Custom notifications use the provided text.

---

## Admin Dashboard Integration (Future)

### Recommended Implementation

```typescript
// Admin dashboard - Send announcement to all users
async function sendBulkAnnouncement(announcement) {
  const { title, message, icon, link, targetAudience } = announcement
  
  // Get target users based on preferences
  const { data: users } = await supabase
    .from('user_preferences')
    .select('user_id, notification_preferences')
  
  // Filter based on target audience
  const targetUsers = users.filter(user => {
    if (targetAudience === 'all') return true
    if (targetAudience === 'product_updates') {
      return user.notification_preferences?.inapp?.product_updates !== false
    }
    if (targetAudience === 'marketing') {
      return user.notification_preferences?.inapp?.marketing !== false
    }
    return false
  })
  
  // Send to each user (consider batching for large audiences)
  const batchSize = 100
  for (let i = 0; i < targetUsers.length; i += batchSize) {
    const batch = targetUsers.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(user =>
        supabase.functions.invoke('create-notification', {
          body: {
            userId: user.user_id,
            type: 'product_announcement',
            data: {
              customTitle: title,
              customMessage: message,
              customIcon: icon,
              customLink: link
            }
          }
        })
      )
    )
    
    console.log(`✅ Sent batch ${i / batchSize + 1}`)
  }
  
  return { sent: targetUsers.length }
}
```

### Admin UI Example

```html
<!-- Admin panel form -->
<form id="send-announcement">
  <input name="title" placeholder="Notification Title" required />
  <textarea name="message" placeholder="Message" required></textarea>
  <input name="icon" placeholder="Icon (emoji)" />
  <input name="link" placeholder="Link (optional)" />
  
  <select name="audience">
    <option value="all">All Users</option>
    <option value="product_updates">Product Updates Enabled</option>
    <option value="marketing">Marketing Enabled</option>
  </select>
  
  <button type="submit">Send to All</button>
</form>
```

---

## Rate Limiting & Best Practices

### Batching
- Process users in batches of 100-500
- Add delay between batches for large campaigns
- Use `Promise.all()` within batches for parallel execution

### Error Handling
```javascript
const results = await Promise.allSettled(
  users.map(user => 
    supabase.functions.invoke('create-notification', {
      body: { userId: user.user_id, type: 'marketing', data: {...} }
    })
  )
)

const successful = results.filter(r => r.status === 'fulfilled').length
const failed = results.filter(r => r.status === 'rejected').length

console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`)
```

### Monitoring
- Log all bulk notification campaigns
- Track delivery success rates
- Monitor user engagement (read rates)

---

## Database Schema

Notifications are stored in `user_notifications`:

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT,           -- 'security', 'account', 'product', 'announcement'
  title TEXT,
  message TEXT,
  link TEXT,
  icon TEXT,
  read BOOLEAN,
  created_at TIMESTAMP,
  read_at TIMESTAMP,
  expires_at TIMESTAMP
)
```

---

## Testing

### Test Single Notification
```bash
curl -X POST 'https://[PROJECT].supabase.co/functions/v1/create-notification' \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "type": "product_announcement",
    "data": {
      "customTitle": "Test Notification",
      "customMessage": "This is a test",
      "customIcon": "🧪"
    }
  }'
```

### Check Notification in Database
```sql
SELECT * FROM user_notifications
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Deployment

```bash
# Deploy the function
supabase functions deploy create-notification

# Test deployment
supabase functions logs create-notification --limit 20
```

---

## Future Enhancements

- [ ] Scheduled notifications (cron jobs)
- [ ] Notification expiry/cleanup automation
- [ ] Rich media support (images, videos)
- [ ] Action buttons in notifications
- [ ] Notification categories/channels
- [ ] User notification frequency controls
- [ ] A/B testing for notification content

---

## Related Files

- **Client Helper**: `/js/notification-helper.js` (handles user-action notifications)
- **Notification Center**: `/components/notification-center/` (displays notifications)
- **Preferences UI**: `/account/components/notifications-preferences/`
- **Database Migration**: `/supabase/migrations/create-user-notifications-table.sql`

---

## Support

For questions or issues:
1. Check Edge Function logs: `supabase functions logs create-notification`
2. Verify RLS policies on `user_notifications` table
3. Ensure user preferences are correctly formatted
4. Test with a single user before bulk sending

---

**Last Updated**: October 2025  
**Status**: Ready for admin implementation  
**Version**: 1.0.0


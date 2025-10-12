# 🔔 Notifications & Preferences Component

## Overview

User-facing notification preferences management for the BitMinded platform. Allows users to control which email notifications they receive for security alerts and account updates.

---

## ✨ Features

### Current (Phase 1 - Production Ready)
- ✅ Granular email notification preferences
- ✅ 4 notification types with individual toggles
- ✅ Multi-language support (EN, ES, FR, DE)
- ✅ Dark/Light theme support
- ✅ Responsive table design
- ✅ Automatic email sending with preference checking
- ✅ Beautiful branded email templates

### Future (Phases 2 & 3)
- 📋 In-app notification center
- 📋 Browser push notifications
- 📋 Product updates and marketing preferences

---

## 📊 Notification Types

| Notification | Description | Trigger |
|--------------|-------------|---------|
| **New Login** | When someone logs into your account | Every successful login |
| **Password Changed** | When your password is updated | Password change in Security |
| **Two-Factor Authentication** | When 2FA is enabled or disabled | 2FA settings change |
| **Username Changed** | When your username is updated | Username edit in Profile |

---

## 🗂️ File Structure

```
notifications-preferences/
├── notifications-preferences.html          # Component UI
├── notifications-preferences.css           # Styling
├── notifications-preferences.js            # Component logic
├── notifications-preferences-translations.js # Translation loader
├── locales/
│   └── notifications-preferences-locales.json # Translations
├── docs/                                   # Documentation
│   ├── NOTIFICATIONS-IMPLEMENTATION-GUIDE.md # Full 3-phase guide
│   └── EMAIL-INTEGRATION-GUIDE.md         # Email integration details
└── README.md                               # This file
```

---

## 🚀 How It Works

### User Experience
```
1. User navigates to Account → Notifications
2. Table shows all notification types
3. User toggles preferences ON/OFF per type
4. Clicks "Save Preferences"
5. Preferences stored in database
6. Future notifications respect these settings
```

### Technical Flow
```
User Action (e.g., password change)
    ↓
Component triggers notification
    ↓
Edge Function checks user preferences
    ↓
If enabled → Send email via Resend
If disabled → Skip (log to console)
```

---

## 📧 Email System

### Edge Function
- **Location:** `/supabase/functions/send-notification-email/index.ts`
- **Purpose:** Check preferences and send emails
- **Service:** Resend API

### Helper Module
- **Location:** `/js/notification-helper.js`
- **Usage:** One-line notification triggers
- **Example:**
  ```javascript
  await window.notificationHelper.passwordChanged();
  ```

### Email Templates
All emails include:
- BitMinded logo (lime-green #cfde67)
- Professional white container
- Info boxes with details
- Centered action buttons
- Footer with preferences link

---

## 💾 Database Schema

### user_preferences table
```json
{
  "notification_preferences": {
    "email": {
      "password_changed": true,
      "two_fa": true,
      "new_login": true,
      "username_changed": true,
      "product_updates": false,   // Future
      "marketing": false           // Future
    }
  }
}
```

### Migration Files
- `supabase/migrations/add-notification-preferences.sql` - Add JSONB column

---

## 🧪 Testing

### Manual Test
1. Go to Account → Notifications
2. Toggle any notification type
3. Click "Save Preferences"
4. Perform the action (e.g., change password)
5. Check email inbox

### Test Preference Control
```javascript
// Enable notification
// Perform action → Email received ✅

// Disable notification  
// Perform action → No email ❌
// Console: "⏭️ User disabled [type] notifications"
```

### Browser Console Test
```javascript
// Test any notification type:
await window.notificationHelper.passwordChanged();
await window.notificationHelper.usernameChanged('old', 'new');
await window.notificationHelper.twoFAEnabled();
await window.notificationHelper.newLogin({ browser: 'Chrome' });
```

---

## 🔌 Integration

Already integrated in these components:
- ✅ `password-change.js` - Password changed notification
- ✅ `username-edit.js` - Username changed notification
- ✅ `2fa.js` - 2FA enabled/disabled notifications
- ✅ `login-form.js` - New login (no 2FA)
- ✅ `2fa-verify.js` - New login (with 2FA)

---

## 🎨 Customization

### Add New Notification Type

1. **Update HTML** - Add new row to table
2. **Update JavaScript** - Add checkbox reference and save logic
3. **Update Edge Function** - Add to `NOTIFICATION_TYPE_MAP` and create email template
4. **Update Translations** - Add keys for all languages
5. **Trigger in Component** - Call `notificationHelper.yourNewType()`

---

## 🐛 Troubleshooting

**Component doesn't load:**
- Check browser console for errors
- Verify component-loader.js includes handler

**Emails not sending:**
- Check if preference is enabled
- Verify Edge Function is deployed
- Check Resend API key is set
- View logs: `supabase functions logs send-notification-email`

**Preferences don't save:**
- Check Supabase connection
- Verify user is authenticated
- Check database has notification_preferences column

---

## 📚 Documentation

- **This README** - Component overview and quick reference
- **docs/NOTIFICATIONS-IMPLEMENTATION-GUIDE.md** - Complete 3-phase implementation plan
- **docs/EMAIL-INTEGRATION-GUIDE.md** - Detailed email integration guide

---

## 🔐 Security

- ✅ RLS policies enforce user can only access own preferences
- ✅ Preference checking prevents unwanted emails
- ✅ No sensitive data in email content
- ✅ All emails include preference management link

---

## 📈 Performance

- Component size: ~20KB (all files)
- Load time: < 100ms
- Database queries: 1 read on load, 1 write on save
- Email delivery: 1-2 seconds via Resend

---

## 🎯 Status

**Phase 1: Email Notifications** ✅ **COMPLETE & PRODUCTION READY**

- Users can manage preferences
- Emails send automatically on user actions
- Preference checking works
- Beautiful branded templates
- All components integrated

---

**Last Updated:** October 12, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

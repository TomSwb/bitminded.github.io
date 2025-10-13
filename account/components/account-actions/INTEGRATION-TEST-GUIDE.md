# Account Actions - Integration Test Guide

## ✅ Implementation Status

### Completed:
- ✅ Main account-actions component structure
- ✅ All sub-component placeholder files created
- ✅ **Export Data component fully implemented**
- ✅ Integration with account-page-loader (automatic)

## 📁 File Structure

```
account/components/account-actions/
├── README.md                           # Original planning document
├── INTEGRATION-TEST-GUIDE.md           # This file
├── account-actions.html                # Main container ✅
├── account-actions.css                 # Main styles ✅
├── account-actions.js                  # Main logic ✅
├── locales/
│   └── account-actions-locales.json   # Translations ✅
│
├── export-data/                        # ✅ FULLY IMPLEMENTED
│   ├── export-data.html
│   ├── export-data.css
│   ├── export-data.js
│   └── locales/
│       └── export-data-locales.json
│
├── account-summary/                    # 🔶 PLACEHOLDER
│   ├── account-summary.html
│   ├── account-summary.css
│   └── account-summary.js
│
├── delete-account/                     # 🔶 PLACEHOLDER
│   ├── delete-account.html
│   ├── delete-account.css
│   ├── delete-account.js
│   └── locales/
│       └── delete-account-locales.json
│
└── active-sessions/                    # 🔶 PLACEHOLDER
    ├── active-sessions.html
    ├── active-sessions.css
    ├── active-sessions.js
    └── locales/
        └── active-sessions-locales.json
```

## 🧪 Testing Instructions

### Step 1: Access the Account Actions Section

1. Navigate to `/account/` page
2. Log in if not already authenticated
3. Click on the **"Actions"** (⚙️) button in the sidebar
4. The account-actions component should load automatically

### Step 2: Test Export Data Component

#### Visual Check:
- [ ] Export Data card is visible with:
  - 📦 Icon and "Export My Data" title
  - Description text explaining the feature
  - Info box showing format (JSON) and what's included
  - Blue "Download Data" button

#### Functionality Test:
1. Click the **"Download Data"** button
2. Should see:
   - [ ] Progress indicator appears ("Preparing your data...")
   - [ ] Button becomes disabled during export
   - [ ] Success message appears (✅ "Data exported successfully!")
   - [ ] File downloads automatically with format: `bitminded-data-export-YYYY-MM-DDTHH-MM-SS.json`

#### Verify Downloaded JSON:
Open the downloaded file and verify it contains:
```json
{
  "export_date": "2025-10-13T...",
  "export_version": "1.0",
  "user_id": "...",
  "data": {
    "profile": { ... },
    "user_profile": { ... },
    "preferences": { ... },
    "roles": [ ... ],
    "notifications": [ ... ],
    "login_activity": [ ... ],
    "entitlements": [ ... ],
    "two_factor_auth": { ... },
    "active_sessions": [ ... ]
  }
}
```

### Step 3: Test Placeholder Components

The following components should display as placeholder cards:
- [ ] Account Summary (empty card)
- [ ] Delete Account (empty card)
- [ ] Active Sessions (empty card)

## 🔍 Expected Data in Export

### Data Included:
1. **Profile** - Email, creation date, last sign-in
2. **User Profile** - Username, avatar URL, timestamps
3. **Preferences** - Email notifications, language, theme
4. **Roles** - User roles (user, admin, etc.)
5. **Notifications** - All user notifications history
6. **Login Activity** - Last 100 login attempts
7. **Entitlements** - App purchases and access
8. **2FA Status** - Whether 2FA is enabled (without secret keys)
9. **Active Sessions** - Current active sessions

### Security Notes:
- ✅ Secret keys are NOT included in export (2FA secrets)
- ✅ Session tokens are NOT included
- ✅ Only includes data user already has access to

## 🎨 UI/UX Verification

### Layout (Desktop):
- [ ] 4 cards displayed in responsive grid
- [ ] Cards have hover effects (border color changes)
- [ ] Proper spacing between cards
- [ ] Matches profile-management section style

### Layout (Mobile):
- [ ] Cards stack vertically
- [ ] Touch-friendly button sizes
- [ ] Proper padding and spacing

### Theming:
- [ ] Works in dark mode
- [ ] Works in light mode (if implemented)
- [ ] Colors follow CSS variable system

## 🌐 Translation Testing

Test with different languages:
1. Switch to French (fr)
   - [ ] "Export My Data" → "Exporter mes données"
   - [ ] Button text translates correctly
2. Switch to German (de)
   - [ ] Proper German translations
3. Switch to Spanish (es)
   - [ ] Proper Spanish translations

## 🐛 Error Scenarios to Test

### Export Data Errors:
1. **Not authenticated:**
   - Log out before clicking export
   - Should show error: "You must be logged in to export data"

2. **Network error:**
   - Disable network or block Supabase requests
   - Should show error: "Failed to export data. Please try again."

3. **Missing data:**
   - New user with minimal data
   - Should still generate valid JSON with empty arrays

## 🚀 Next Steps

After testing Export Data successfully:

### Phase 1.2 - Account Summary (Next Priority)
Implement account summary to show:
- Account creation date
- Total notifications count
- Last login information
- Data retention policy link

### Phase 2 - Delete Account
Complex workflow requiring:
- Password confirmation
- Email verification
- Grace period implementation
- Database migration for soft delete

### Phase 3 - Active Sessions
Session management requiring:
- Real-time session tracking
- Device/browser detection
- IP address logging
- Session invalidation

## 📝 Integration Notes

### Component Loading:
The component loader automatically:
1. Loads `account-actions.html` into `#actions-content`
2. Injects `account-actions.css` into document head
3. Executes `account-actions.js`
4. Sub-components are loaded by `account-actions.js`

### Dependencies:
- ✅ Supabase client (`window.supabase`)
- ✅ Component loader (`window.componentLoader`)
- ✅ i18next for translations (optional)

### RLS Policies Required:
All database tables must have proper Row Level Security policies:
- ✅ `user_profiles` - Users can view own profile
- ✅ `user_preferences` - Users can view own preferences
- ✅ `user_roles` - Users can view own roles
- ✅ `user_notifications` - Users can view own notifications
- ✅ `login_activity` - Users can view own activity
- ✅ `entitlements` - Users can view own entitlements
- ✅ `user_2fa` - Users can view own 2FA status
- ✅ `user_sessions` - Users can view own sessions

## 🎯 Success Criteria

- [x] Component loads without errors
- [ ] Export data button triggers download
- [ ] Downloaded JSON contains all expected data
- [ ] UI matches profile-management style
- [ ] Responsive on mobile
- [ ] Translations work correctly
- [ ] Error handling works properly
- [ ] No console errors

## 📞 Support

If issues are found:
1. Check browser console for errors
2. Verify Supabase connection
3. Check RLS policies are set up
4. Verify file paths are correct
5. Test with a different user account

---

**Last Updated:** October 13, 2025  
**Status:** Ready for Testing  
**Component:** Export Data (Phase 1.1) ✅


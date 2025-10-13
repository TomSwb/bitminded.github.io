# Account Actions Component

## Overview

The Account Actions component provides users with essential account management features aligned with Bitminded's artisanal philosophy: transparency, simplicity, and user data ownership.

## Philosophy

- **Transparent:** Users know exactly what happens to their data
- **Simple:** Clean, purposeful actions without corporate complexity
- **Ethical:** Respect user ownership of purchased apps
- **Human:** Clear explanations, not legal jargon

---

## Implementation Plan

### Phase 1: Data Management (Priority 1) 🌱

#### 1.1 Export My Data
**Goal:** GDPR compliance and data transparency

**Components:**
- `export-data/` folder
  - `export-data.html` - Export interface
  - `export-data.css` - Clean card styling
  - `export-data.js` - Data aggregation logic
  - `locales/export-data-locales.json` - Translations

**Features:**
- Single "Download Data" button
- JSON file generation with:
  - Profile information
  - Purchased apps list
  - Notification preferences
  - Activity history
  - Account creation date
- Progress indicator during generation
- File download with timestamp

**Database Queries:**
```sql
-- User profile data
SELECT * FROM auth.users WHERE id = $user_id

-- User preferences
SELECT * FROM user_preferences WHERE user_id = $user_id

-- Notification history
SELECT * FROM user_notifications WHERE user_id = $user_id

-- App purchases (future)
SELECT * FROM user_app_purchases WHERE user_id = $user_id
```

#### 1.2 Account Summary
**Goal:** Transparency about stored data

**Components:**
- `account-summary/` folder
  - `account-summary.html` - Summary display
  - `account-summary.css` - Info card styling
  - `account-summary.js` - Data aggregation

**Features:**
- Account creation date
- Total apps purchased (when implemented)
- Storage used (if applicable)
- Last login information
- Data retention policy link

---

### Phase 2: Clean Exit Options (Priority 2) 🚪

#### 2.1 Delete Account
**Goal:** Respectful account termination

**Components:**
- `delete-account/` folder
  - `delete-account.html` - Deletion interface
  - `delete-account.css` - Warning styling (red theme)
  - `delete-account.js` - Deletion workflow
  - `locales/delete-account-locales.json` - Translations

**Workflow:**
1. **Initial Confirmation**
   - Password required
   - Clear explanation of what gets deleted
   - Explanation of what remains (purchased apps)

2. **Email Confirmation**
   - Send confirmation email with cancellation link
   - 30-day grace period
   - User can cancel anytime during grace period

3. **Final Deletion**
   - After 30 days, permanent deletion
   - Soft delete first (mark as deleted)
   - Hard delete after additional 7 days

**Database Operations:**
```sql
-- Mark account for deletion
UPDATE auth.users SET deleted_at = NOW() WHERE id = $user_id

-- Soft delete user data
UPDATE user_preferences SET deleted_at = NOW() WHERE user_id = $user_id
UPDATE user_notifications SET deleted_at = NOW() WHERE user_id = $user_id

-- Keep app purchases active (ethical requirement)
-- user_app_purchases remains untouched
```

**Edge Function:** `delete-account`
- Handles email confirmation
- Manages grace period
- Performs final deletion

---

### Phase 3: Session Management (Priority 3) 💻

#### 3.1 Active Sessions
**Goal:** Security without complexity

**Components:**
- `active-sessions/` folder
  - `active-sessions.html` - Session list
  - `active-sessions.css` - Session card styling
  - `active-sessions.js` - Session management

**Features:**
- List current logged-in devices
- Show device type, browser, last active
- "Logout all other devices" button
- Individual session logout
- Real-time updates

**Database Schema:**
```sql
-- Sessions table (if not exists)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    device_info JSONB,
    browser_info JSONB,
    ip_address INET,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## File Structure

```
account/components/account-actions/
├── README.md                           # This file
├── account-actions.html                # Main container
├── account-actions.css                 # Main styles
├── account-actions.js                  # Main logic
├── locales/
│   └── account-actions-locales.json   # Translations
│
├── export-data/                        # Phase 1.1
│   ├── export-data.html
│   ├── export-data.css
│   ├── export-data.js
│   └── locales/
│       └── export-data-locales.json
│
├── account-summary/                    # Phase 1.2
│   ├── account-summary.html
│   ├── account-summary.css
│   └── account-summary.js
│
├── delete-account/                     # Phase 2.1
│   ├── delete-account.html
│   ├── delete-account.css
│   ├── delete-account.js
│   └── locales/
│       └── delete-account-locales.json
│
└── active-sessions/                   # Phase 3.1
    ├── active-sessions.html
    ├── active-sessions.css
    ├── active-sessions.js
    └── locales/
        └── active-sessions-locales.json
```

---

## Integration Points

### Component Loader
Update `components/shared/component-loader.js`:
```javascript
else if (componentName === 'account-actions') {
    // Load account actions component
}
```

### Account Layout
The section already exists in `account-layout.html`:
```html
<section class="account-layout__section" id="section-actions" data-section="actions">
    <div class="account-layout__section-content" id="actions-content">
        <!-- Account actions component will be loaded here -->
    </div>
</section>
```

### Translation Integration
Follow existing pattern:
- Main component loads its own translations
- Sub-components load their own translations
- Use `translatable-content` class for dynamic updates

---

## Security Considerations

### Data Export
- ✅ Require authentication
- ✅ Rate limit exports (max 1 per hour)
- ✅ Log export requests
- ✅ Secure file generation (no sensitive data in filenames)

### Account Deletion
- ✅ Require password confirmation
- ✅ Email verification required
- ✅ Grace period with cancellation option
- ✅ Soft delete before hard delete
- ✅ Preserve purchased app entitlements

### Session Management
- ✅ Real-time session tracking
- ✅ Secure session invalidation
- ✅ IP address logging for security
- ✅ Device fingerprinting for identification

---

## Database Migrations Required

### 1. User Sessions Table
```sql
-- File: supabase/migrations/create-user-sessions-table.sql
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info JSONB,
    browser_info JSONB,
    ip_address INET,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active);

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" 
ON user_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
ON user_sessions FOR DELETE 
USING (auth.uid() = user_id);
```

### 2. Account Deletion Tracking
```sql
-- File: supabase/migrations/add-account-deletion-tracking.sql
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete columns to user tables
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_notifications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

---

## Edge Functions Required

### 1. Delete Account Function
**File:** `supabase/functions/delete-account/index.ts`

**Purpose:** Handle account deletion workflow
- Send confirmation email
- Manage grace period
- Perform final deletion

### 2. Export Data Function
**File:** `supabase/functions/export-user-data/index.ts`

**Purpose:** Generate and serve user data export
- Aggregate user data
- Generate JSON file
- Handle download requests

---

## Testing Strategy

### Phase 1 Testing
- [ ] Export data generation accuracy
- [ ] File download functionality
- [ ] Account summary data accuracy
- [ ] Translation loading

### Phase 2 Testing
- [ ] Password confirmation workflow
- [ ] Email confirmation sending
- [ ] Grace period cancellation
- [ ] Final deletion process
- [ ] App entitlement preservation

### Phase 3 Testing
- [ ] Session listing accuracy
- [ ] Session logout functionality
- [ ] Real-time updates
- [ ] Security validation

---

## Implementation Order

1. **Phase 1.1** - Export Data (Foundation)
2. **Phase 1.2** - Account Summary (Quick win)
3. **Phase 2.1** - Delete Account (Complex workflow)
4. **Phase 3.1** - Active Sessions (Security feature)

---

## Success Metrics

- **User Trust:** Clear data ownership and transparency
- **Compliance:** GDPR compliance for data export
- **Ethics:** Respectful account deletion process
- **Security:** Effective session management
- **Simplicity:** Clean, artisanal user experience

---

## Future Considerations

### Phase 4 (Future)
- **Data Retention Policy** - Clear explanation of data storage
- **Account Recovery** - Recovery options for deleted accounts
- **Bulk Operations** - Batch operations for power users

### Integration Opportunities
- **App Catalog** - Show purchased apps in account summary
- **Subscription Management** - Link to payment section
- **Notification Center** - Clear notification history option

---

**Last Updated:** October 2025  
**Status:** Planning Phase  
**Next Step:** Implement Phase 1.1 - Export Data

# Edit User Component

## Overview

The Edit User component is an admin-only interface that allows administrators to modify user profiles directly from the user detail page. It provides a comprehensive set of user management capabilities while maintaining security and audit trails.

## Purpose

This component enables administrators to:
- Edit user usernames with real-time availability checking
- Reset user avatars (remove them)
- Send email change verification requests to users
- Send password reset requests to users
- Update user personal information (DOB, gender, country)
- Maintain complete audit logs of all admin actions

## Architecture

### Component Structure
```
admin/components/user-detail/components/edit-user/
├── edit-user.js              # Main component class
├── edit-user.html            # Modal-based form interface
├── edit-user.css             # Component styling
├── locales/
│   └── edit-user-locales.json # i18n translations
└── README.md                 # This documentation
```

### Integration Points
- **Parent Component**: `admin/components/user-detail/user-detail-page.js`
- **Trigger**: "Edit User" button in Actions tab
- **Backend**: Supabase Edge Functions for secure operations
- **Database**: `user_profiles`, `admin_activity` tables

## Functionality

### 1. Username Editing
**Method**: Direct Supabase database update
**Pattern**: Follows existing `account/components/profile-management/username-edit/` component
**Features**:
- Real-time username availability checking
- Format validation (3-30 chars, alphanumeric + underscore)
- Duplicate prevention
- Admin activity logging

**Implementation**:
```javascript
// Direct update to user_profiles table
const { error } = await window.supabase
    .from('user_profiles')
    .update({ 
        username: newUsername,
        updated_at: new Date().toISOString()
    })
    .eq('id', targetUserId);
```

### 2. Avatar Reset
**Method**: Simple database update
**Purpose**: Remove user's avatar (set to null)
**Features**:
- One-click avatar removal
- Admin activity logging
- User notification (optional)

**Implementation**:
```javascript
// Set avatar_url to null
const { error } = await window.supabase
    .from('user_profiles')
    .update({ avatar_url: null })
    .eq('id', targetUserId);
```

### 3. Email Change Request
**Method**: Supabase Auth email verification
**Pattern**: Follows existing `account/components/profile-management/email-change/` component
**Features**:
- Sends verification email to new address
- Requires user to confirm new email
- Admin activity logging
- User notification

**Implementation**:
```javascript
// Use Supabase auth.updateUser with email verification
const { error } = await window.supabase.auth.updateUser({
    email: newEmail,
    options: {
        emailRedirectTo: `${window.location.origin}/auth/verify/`
    }
});
```

### 4. Password Reset Request
**Method**: Supabase Auth password reset
**Purpose**: Send password reset email to user
**Features**:
- One-click password reset email
- Admin activity logging
- Replaces existing password reset button in main user detail

**Implementation**:
```javascript
// Send password reset email
const { error } = await window.supabase.auth.resetPasswordForEmail(
    userEmail,
    {
        redirectTo: `${window.location.origin}/auth/?form=reset-password`
    }
);
```

### 5. Personal Information Editing
**Method**: Direct Supabase database update
**Pattern**: Follows existing `account/components/profile-management/personal-info/` component
**Fields**:
- `date_of_birth` (DATE)
- `gender` (TEXT: 'male', 'female', 'prefer_not_say')
- `country` (TEXT)

**Features**:
- Form validation
- Country dropdown with flags
- Age calculation
- Admin activity logging

**Implementation**:
```javascript
// Update personal info fields
const { error } = await window.supabase
    .from('user_profiles')
    .update({ 
        date_of_birth: dobValue,
        gender: genderValue,
        country: countryValue
    })
    .eq('id', targetUserId);
```

## Backend Infrastructure

### Edge Functions

#### 1. `admin-update-user`
**Purpose**: Handle secure user profile updates with admin authentication
**Location**: `supabase/functions/admin-update-user/index.ts`
**Input**:
```typescript
interface UpdateUserRequest {
    user_id: string;
    updates: {
        username?: string;
        avatar_url?: string | null;
        date_of_birth?: string | null;
        gender?: string | null;
        country?: string | null;
    };
    reason?: string;
}
```

**Features**:
- Admin authentication required
- Username uniqueness validation
- Comprehensive admin activity logging
- User notification support
- Error handling and validation

#### 2. `admin-send-email-change`
**Purpose**: Send email change verification as admin
**Location**: `supabase/functions/admin-send-email-change/index.ts`
**Input**:
```typescript
interface EmailChangeRequest {
    user_id: string;
    new_email: string;
    reason?: string;
}
```

**Features**:
- Admin authentication required
- Email format validation
- Supabase admin client usage
- Admin activity logging
- User notification

### Database Schema

#### Enhanced `admin_activity` Table
```sql
-- Add detailed action types
ALTER TABLE admin_activity ADD COLUMN IF NOT EXISTS action_type TEXT;
-- Values: 'username_changed', 'avatar_reset', 'email_change_sent', 'password_reset_sent', 'personal_info_updated'

-- Add target user reference
ALTER TABLE admin_activity ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id);

-- Add reason field for admin notes
ALTER TABLE admin_activity ADD COLUMN IF NOT EXISTS reason TEXT;
```

#### User Profiles Extensions
```sql
-- Ensure all personal info fields exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_say'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;
```

## Security Considerations

### Admin Authentication
- All operations require admin role verification
- JWT token validation for each request
- Prevention of self-modification for critical fields
- Session validation

### Audit Trail
- Complete logging of all admin actions
- Timestamp tracking
- Reason/justification fields
- Target user identification
- Admin user identification

### User Notifications
- Email notifications for sensitive changes
- In-app notifications for user awareness
- Notification delivery status tracking

## UI/UX Design

### Modal Interface
- **Trigger**: "Edit User" button in Actions tab
- **Layout**: Modal overlay with organized form sections
- **Sections**:
  1. **Basic Information**: Username, Avatar Reset
  2. **Email Management**: Send Email Change Request
  3. **Password Management**: Send Password Reset Request
  4. **Personal Information**: DOB, Gender, Country

### Form Validation
- **Real-time validation** for all input fields
- **Username availability** checking with debounced API calls
- **Email format** validation
- **Required field** indicators
- **Error state** management

### User Feedback
- **Loading states** for all async operations
- **Success messages** with auto-hide
- **Error messages** with detailed information
- **Confirmation dialogs** for destructive actions
- **Progress indicators** for multi-step processes

## Implementation Phases

### Phase 1: Core Structure + Username Editing
- [ ] Create basic component structure
- [ ] Implement modal interface
- [ ] Add username editing functionality
- [ ] Integrate with user detail page
- [ ] Add basic admin activity logging

### Phase 2: Avatar Reset + Personal Info
- [ ] Implement avatar reset functionality
- [ ] Add personal information editing
- [ ] Create country dropdown with flags
- [ ] Add form validation
- [ ] Enhance admin activity logging

### Phase 3: Email + Password Management
- [ ] Implement email change request functionality
- [ ] Add password reset request functionality
- [ ] Create `admin-send-email-change` edge function
- [ ] Remove existing password reset button from main user detail
- [ ] Add user notification system

### Phase 4: Enhanced Features
- [ ] Create `admin-update-user` edge function
- [ ] Add comprehensive error handling
- [ ] Implement user notification system
- [ ] Add advanced admin activity logging
- [ ] Create component documentation

## API Reference

### Component Methods

#### `init(userData)`
Initialize the component with user data
```javascript
const editUser = new EditUser();
await editUser.init(currentUser);
```

#### `show()`
Display the edit user modal
```javascript
editUser.show();
```

#### `hide()`
Hide the edit user modal
```javascript
editUser.hide();
```

#### `updateUsername(newUsername)`
Update user's username
```javascript
await editUser.updateUsername('newusername');
```

#### `resetAvatar()`
Remove user's avatar
```javascript
await editUser.resetAvatar();
```

#### `sendEmailChangeRequest(newEmail)`
Send email change verification
```javascript
await editUser.sendEmailChangeRequest('new@email.com');
```

#### `sendPasswordResetRequest()`
Send password reset email
```javascript
await editUser.sendPasswordResetRequest();
```

#### `updatePersonalInfo(data)`
Update personal information
```javascript
await editUser.updatePersonalInfo({
    date_of_birth: '1990-01-01',
    gender: 'male',
    country: 'United States'
});
```

### Events

#### `userUpdated`
Dispatched when user data is successfully updated
```javascript
window.addEventListener('userUpdated', (event) => {
    console.log('User updated:', event.detail);
    // Refresh user data in parent component
});
```

#### `editUserClosed`
Dispatched when edit user modal is closed
```javascript
window.addEventListener('editUserClosed', (event) => {
    console.log('Edit user modal closed');
});
```

## Translation Keys

### Required Translation Keys
```json
{
    "edit_user": "Edit User",
    "edit_user_modal_title": "Edit User Profile",
    "basic_information": "Basic Information",
    "username": "Username",
    "current_username": "Current Username",
    "new_username": "New Username",
    "username_available": "Username is available",
    "username_taken": "Username is already taken",
    "checking_availability": "Checking availability...",
    "avatar_reset": "Reset Avatar",
    "avatar_reset_confirm": "Are you sure you want to remove this user's avatar?",
    "email_management": "Email Management",
    "send_email_change": "Send Email Change Request",
    "new_email": "New Email Address",
    "email_change_sent": "Email change verification sent",
    "password_management": "Password Management",
    "send_password_reset": "Send Password Reset",
    "password_reset_sent": "Password reset email sent",
    "personal_information": "Personal Information",
    "date_of_birth": "Date of Birth",
    "gender": "Gender",
    "country": "Country",
    "male": "Male",
    "female": "Female",
    "prefer_not_say": "Prefer not to say",
    "save_changes": "Save Changes",
    "cancel": "Cancel",
    "close": "Close",
    "loading": "Loading...",
    "success": "Success",
    "error": "Error",
    "admin_action_logged": "Admin action logged successfully"
}
```

## Testing Checklist

### Component Testing
- [ ] Component initializes correctly with user data
- [ ] Modal opens and closes properly
- [ ] All form sections render correctly
- [ ] Form validation works as expected
- [ ] Username availability checking functions
- [ ] Country dropdown populates correctly

### Functionality Testing
- [ ] Username editing updates database correctly
- [ ] Avatar reset removes avatar successfully
- [ ] Email change request sends verification email
- [ ] Password reset request sends reset email
- [ ] Personal info updates save correctly
- [ ] All admin actions are logged properly

### Security Testing
- [ ] Admin authentication is required for all operations
- [ ] Non-admin users cannot access edit functionality
- [ ] All actions are properly logged with admin identification
- [ ] User notifications are sent for sensitive changes
- [ ] Input validation prevents malicious data

### Integration Testing
- [ ] Component integrates properly with user detail page
- [ ] User data refreshes after updates
- [ ] Events are dispatched correctly
- [ ] Translation system works properly
- [ ] Error handling works across all operations

## Dependencies

### Frontend Dependencies
- Supabase JavaScript client
- i18next for internationalization
- Existing profile management components (for patterns)
- User detail page component

### Backend Dependencies
- Supabase Edge Functions runtime
- Supabase Admin client
- Database schema updates
- Email service configuration

### External Services
- Supabase Auth for email verification
- Supabase Database for data persistence
- Email service for notifications

## Maintenance

### Regular Tasks
- Monitor admin activity logs for unusual patterns
- Update country list as needed
- Review and update translation keys
- Test email delivery functionality
- Validate admin permissions

### Updates
- Component follows existing profile management patterns
- Database schema changes require migration scripts
- Edge function updates require deployment
- Translation updates require locale file updates

## Troubleshooting

### Common Issues

#### Username Availability Not Working
- Check Supabase client configuration
- Verify database permissions
- Check network connectivity

#### Email Notifications Not Sending
- Verify Supabase Auth configuration
- Check email service settings
- Validate email templates

#### Admin Activity Not Logging
- Check admin authentication
- Verify database permissions
- Check edge function logs

#### Component Not Loading
- Verify file paths and structure
- Check JavaScript console for errors
- Validate component initialization

### Debug Mode
Enable debug logging by setting:
```javascript
window.editUserDebug = true;
```

This will provide detailed console output for troubleshooting.

## Contributing

When contributing to this component:

1. Follow existing code patterns from profile management components
2. Maintain comprehensive admin activity logging
3. Ensure all user-facing changes include notifications
4. Update translation keys for any new text
5. Add appropriate error handling and validation
6. Test all functionality thoroughly
7. Update this documentation as needed

## License

This component is part of the BitMinded admin panel and follows the same licensing terms as the main project.

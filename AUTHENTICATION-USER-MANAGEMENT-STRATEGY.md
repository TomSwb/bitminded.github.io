# Authentication & User Management Strategy

> **Purpose**: Comprehensive strategy for implementing user authentication, account management, and admin functionality across the BitMinded ecosystem.

---

## 📋 **Overview**

This document outlines the complete strategy for implementing authentication and user management features for the BitMinded website. The implementation will integrate seamlessly with the existing component architecture, Supabase backend, and multi-subdomain strategy.

### **Current Architecture Integration**
- ✅ **Component-based system** with loading-screen, language-switcher, theme-switcher, and navigation-menu
- ❌ **Supabase integration** - Project created but no client setup or configuration
- ✅ **Multi-subdomain strategy** planned with Cloudflare Workers for access control
- ✅ **Component loader system** for dynamic component injection
- ✅ **Translation system** with i18next integration

---

## 🎯 **User Experience Requirements**

### **Authentication States & UI**

#### **Unauthenticated Users**
- **Desktop**: Login and Signup buttons in top navigation
- **Mobile**: Login and Signup buttons visible when navigation menu is open
- **Behavior**: Clicking either button opens auth modal/page

#### **Authenticated Users**
- **Desktop**: Sign out button and Username button in top navigation
- **Mobile**: Sign out and Username buttons visible when navigation menu is open
- **Behavior**: 
  - Username button → Navigate to account management page
  - Sign out button → Logout and return to main page

#### **Admin Users**
- **Additional**: Admin button (only visible to admin users)
- **Behavior**: Admin button → Navigate to admin panel

### **Page Structure**
```
/auth/          - Login/Signup page with toggle between modes
/account/       - User account management page
/admin/         - Admin panel for user management (admin-only)
```

---

## 🏗️ **Component Architecture**

### **Component Architecture Organization**

#### **Site-Wide Components** (in `components/` folder)
These components are used across multiple pages and need to be globally available.

#### **1. Auth Button Component**
**Purpose**: Dynamic authentication buttons that change based on user state
**Features**:
- Login/Signup buttons for unauthenticated users
- Sign out/Username buttons for authenticated users
- Admin button for admin users
- Mobile-responsive design
- Translation support
- Theme-aware styling

**API**:
```javascript
// Initialize auth buttons
AuthButtons.init();

// Update auth state
AuthButtons.updateAuthState(isAuthenticated, userData);

// Check if user is admin
AuthButtons.showAdminButton(isAdmin);
```

#### **Page-Specific Components** (in `[page-name]/components/` folder)
These components are specific to individual pages and don't need to be globally available.

### **Authentication Page** (`auth/`)

#### **2. Login Form Component** (`auth/components/login-form/`)
**Purpose**: User login functionality
**Features**:
- Email/password login form
- Form validation and error handling
- Integration with Supabase Auth
- Translation support
- Theme-aware styling
- Mobile-responsive design

**API**:
```javascript
// Initialize login form
LoginForm.init();

// Submit login
LoginForm.submit(credentials);

// Clear form
LoginForm.clear();
```

#### **3. Signup Form Component** (`auth/components/signup-form/`)
**Purpose**: User registration functionality
**Features**:
- Email/password signup form
- Form validation and error handling
- Integration with Supabase Auth
- Translation support
- Theme-aware styling
- Mobile-responsive design

**API**:
```javascript
// Initialize signup form
SignupForm.init();

// Submit signup
SignupForm.submit(credentials);

// Clear form
SignupForm.clear();
```

#### **4. Auth Page Toggle Component** (`auth/components/auth-toggle/`)
**Purpose**: Toggle between login and signup modes
**Features**:
- Toggle buttons between login/signup
- Smooth transitions between forms
- Translation support
- Theme-aware styling

**API**:
```javascript
// Initialize auth toggle
AuthToggle.init();

// Switch to login mode
AuthToggle.showLogin();

// Switch to signup mode
AuthToggle.showSignup();
```

### **Account Management Page** (`account/`)

#### **5. Account Layout Component** (`account/components/account-layout/`)
**Purpose**: Main account page layout and navigation
**Features**:
- Account page structure and layout
- Section navigation (profile, security, etc.)
- Responsive design for mobile and desktop
- Translation support

**API**:
```javascript
// Initialize account layout
AccountLayout.init();

// Load specific section
AccountLayout.loadSection('profile' | 'security' | 'settings');

// Update user data display
AccountLayout.updateUserData(userData);
```

#### **6. Profile Management Component** (`account/components/profile-management/`)
**Purpose**: User profile information management
**Features**:
- Avatar upload and management
- Username change functionality
- Profile information display
- Form validation and error handling
- Translation support

**API**:
```javascript
// Initialize profile management
ProfileManagement.init();

// Update avatar
ProfileManagement.updateAvatar(file);

// Change username
ProfileManagement.changeUsername(newUsername);

// Get current profile data
ProfileManagement.getProfileData();
```

#### **7. Password Change Component** (`account/components/password-change/`)
**Purpose**: Secure password change functionality
**Features**:
- Current password verification
- New password validation
- Password strength requirements
- Form validation and error handling
- Modal or inline form options
- Translation support

**API**:
```javascript
// Initialize password change (modal or inline)
PasswordChange.init(options);

// Show password change form
PasswordChange.show();

// Hide password change form
PasswordChange.hide();

// Change password
PasswordChange.changePassword(currentPassword, newPassword);
```

#### **8. Email Change Component** (`account/components/email-change/`)
**Purpose**: Email address change functionality
**Features**:
- Current email verification
- New email validation
- Email change confirmation flow
- Form validation and error handling
- Translation support

**API**:
```javascript
// Initialize email change
EmailChange.init();

// Show email change form
EmailChange.show();

// Change email address
EmailChange.changeEmail(newEmail);

// Verify email change
EmailChange.verifyEmailChange(verificationCode);
```

#### **9. Login Activity Component** (`account/components/login-activity/`)
**Purpose**: Security and login history
**Features**:
- Recent login activity display
- Login location tracking
- Suspicious activity alerts
- Session management
- Translation support

**API**:
```javascript
// Initialize login activity
LoginActivity.init();

// Get recent login history
LoginActivity.getRecentLogins();

// Get current sessions
LoginActivity.getCurrentSessions();

// Terminate session
LoginActivity.terminateSession(sessionId);

// Refresh activity display
LoginActivity.refresh();
```

#### **10. Subscription Management Component** (`account/components/subscription-management/`)
**Purpose**: Subscription and billing management
**Features**:
- Current subscription plan display
- Payment history viewing
- Payment method management
- Subscription upgrade/downgrade/cancel
- Integration with Stripe
- Translation support

**API**:
```javascript
// Initialize subscription management
SubscriptionManagement.init();

// Get current subscription
SubscriptionManagement.getCurrentSubscription();

// Update payment method
SubscriptionManagement.updatePaymentMethod(paymentMethodId);

// Cancel subscription
SubscriptionManagement.cancelSubscription();

// Get payment history
SubscriptionManagement.getPaymentHistory();
```

#### **11. App Entitlements Component** (`account/components/app-entitlements/`)
**Purpose**: App access and entitlements display
**Features**:
- List of unlocked/locked apps
- Quick links to each app
- Visual status indicators
- Integration with entitlements table
- Translation support

**API**:
```javascript
// Initialize app entitlements
AppEntitlements.init();

// Get user entitlements
AppEntitlements.getUserEntitlements();

// Check app access
AppEntitlements.hasAccess(appId);

// Update entitlements display
AppEntitlements.updateDisplay();
```

#### **12. Notifications Preferences Component** (`account/components/notifications-preferences/`)
**Purpose**: User notification and preference settings
**Features**:
- Email notification settings
- Language preference (integration with existing language switcher)
- Theme preference (integration with existing theme switcher)
- Save preferences functionality
- Translation support

**API**:
```javascript
// Initialize notifications preferences
NotificationsPreferences.init();

// Update email notifications
NotificationsPreferences.updateEmailNotifications(settings);

// Update language preference
NotificationsPreferences.updateLanguage(language);

// Update theme preference
NotificationsPreferences.updateTheme(theme);

// Save all preferences
NotificationsPreferences.savePreferences();
```

#### **13. Account Actions Component** (`account/components/account-actions/`)
**Purpose**: Account management actions
**Features**:
- Sign out functionality
- Delete account with confirmation
- Export account data (GDPR compliance)
- Account deactivation options
- Translation support

**API**:
```javascript
// Initialize account actions
AccountActions.init();

// Sign out user
AccountActions.signOut();

// Delete account
AccountActions.deleteAccount(confirmation);

// Export account data
AccountActions.exportData();

// Deactivate account
AccountActions.deactivateAccount();
```

### **Two-Factor Authentication Page** (`2fa/`)

#### **14. Two-Factor Authentication Component** (`2fa/components/two-factor-auth/`)
**Purpose**: Complete 2FA setup and management
**Features**:
- 2FA setup wizard (QR code, secret key)
- TOTP verification and testing
- Backup codes generation and display
- Enable/disable 2FA functionality
- 2FA status display
- Translation support

**API**:
```javascript
// Initialize 2FA component
TwoFactorAuth.init();

// Setup 2FA (generate QR code and secret)
TwoFactorAuth.setup();

// Verify 2FA setup
TwoFactorAuth.verifySetup(code);

// Enable 2FA
TwoFactorAuth.enable();

// Disable 2FA
TwoFactorAuth.disable();

// Generate backup codes
TwoFactorAuth.generateBackupCodes();

// Check 2FA status
TwoFactorAuth.getStatus();
```

### **Admin Panel Page** (`admin/`)

#### **15. Admin Layout Component** (`admin/components/admin-layout/`)
**Purpose**: Main admin panel layout and navigation
**Features**:
- Admin panel structure and layout
- Admin navigation and sections
- Responsive design for mobile and desktop
- Translation support

**API**:
```javascript
// Initialize admin layout
AdminLayout.init();

// Load specific admin section
AdminLayout.loadSection('users' | 'roles' | 'settings');

// Check admin permissions
AdminLayout.checkPermissions();
```

#### **16. User Management Component** (`admin/components/user-management/`)
**Purpose**: User management and administration
**Features**:
- User list with search and filtering
- User role management
- User status management (active/suspended)
- Bulk user actions
- Translation support

**API**:
```javascript
// Initialize user management
UserManagement.init();

// Get user list
UserManagement.getUsers(filters);

// Update user role
UserManagement.updateUserRole(userId, role);

// Suspend/activate user
UserManagement.toggleUserStatus(userId);
```

#### **17. Access Control Component** (`admin/components/access-control/`)
**Purpose**: Access control and permissions management
**Features**:
- App access management
- Role-based permissions
- Entitlement management
- Access control policies
- Translation support

**API**:
```javascript
// Initialize access control
AccessControl.init();

// Manage app access
AccessControl.manageAppAccess(userId, appId, access);

// Update role permissions
AccessControl.updateRolePermissions(role, permissions);

// Get access reports
AccessControl.getAccessReports();
```

### **Component Integration Strategy**

#### **Navigation Menu Integration**
- Auth buttons will be integrated into existing navigation-menu component
- Mobile components will follow existing pattern (visible when menu is open)
- Consistent styling with existing navigation elements

#### **Component Loader Integration**
- Auth components will use existing component-loader system
- Dynamic loading based on user authentication state
- Proper initialization order and dependency management

### **Benefits of Modular Component Architecture**

#### **Reusability**
- **Password Change Component**: Can be used as modal, inline form, or standalone page
- **2FA Component**: Can be integrated into account page or used independently
- **Profile Management**: Reusable across different contexts

#### **Maintainability**
- **Single Responsibility**: Each component handles one specific functionality
- **Independent Testing**: Components can be tested in isolation
- **Easy Updates**: Changes to one component don't affect others

#### **Flexibility**
- **Multiple Display Options**: Components can be modals, inline forms, or full pages
- **Conditional Loading**: Components only load when needed
- **Customizable**: Easy to modify individual components without affecting the whole system

#### **User Experience**
- **Consistent Interface**: All components follow the same design patterns
- **Progressive Enhancement**: Components can be loaded on demand
- **Mobile Responsive**: Each component is optimized for mobile and desktop

### **Benefits of Page-Specific Component Organization**

#### **Clear Separation of Concerns**
- **Site-Wide Components**: Only global components in `components/` folder
- **Page-Specific Components**: Components specific to individual pages in `[page]/components/`
- **Logical Organization**: Easy to find and maintain components

#### **Performance Benefits**
- **Reduced Bundle Size**: Page-specific components only load when needed
- **Faster Page Loads**: Only necessary components are loaded per page
- **Better Caching**: Components can be cached per page

#### **Development Benefits**
- **Easier Navigation**: Clear folder structure for developers
- **Reduced Conflicts**: Page-specific components don't interfere with each other
- **Scalable Architecture**: Easy to add new pages and components

#### **Maintenance Benefits**
- **Isolated Changes**: Changes to one page don't affect others
- **Clear Dependencies**: Easy to see which components belong to which pages
- **Simplified Testing**: Page-specific components can be tested in isolation

---

## 🗄️ **Database Schema**

### **Supabase Tables**

#### **1. User Profiles Table**
```sql
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
```

#### **2. User Roles Table**
```sql
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin', 'moderator'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
```

#### **3. Two-Factor Authentication Table**
```sql
CREATE TABLE public.user_2fa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    secret_key TEXT NOT NULL,
    backup_codes TEXT[], -- Array of backup codes
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own 2FA settings
CREATE POLICY "Users can manage own 2FA" ON public.user_2fa
    FOR ALL USING (auth.uid() = user_id);
```

#### **4. User Sessions Table**
```sql
CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);
```

#### **5. User Preferences Table**
```sql
CREATE TABLE public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);
```

#### **6. Login Activity Table**
```sql
CREATE TABLE public.login_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT
);

-- Enable RLS
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own login activity
CREATE POLICY "Users can view own login activity" ON public.login_activity
    FOR SELECT USING (auth.uid() = user_id);
```

#### **7. Subscription Data Table**
```sql
CREATE TABLE public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', etc.
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription data
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
```

#### **8. Entitlements Table (Extended)**
```sql
-- Extend existing entitlements table
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### **Database Functions**

#### **1. User Profile Creation Function**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### **2. Admin Check Function**
```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔐 **Security Implementation**

### **Two-Factor Authentication (2FA)**

#### **Implementation Strategy**
- **Method**: TOTP (Time-based One-Time Password) using Google Authenticator, Authy, etc.
- **Library**: `speakeasy` for TOTP generation and verification
- **Backup Codes**: Generate 10 backup codes for account recovery
- **QR Code**: Generate QR code for easy setup

#### **2FA Flow**
1. User enables 2FA in account settings
2. Generate secret key and show QR code
3. User scans QR code with authenticator app
4. Verify setup with test code
5. Store encrypted secret key in database
6. Generate and display backup codes

### **Password Security**
- **Requirements**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Validation**: Client-side and server-side validation
- **Hashing**: Handled by Supabase Auth
- **Change Process**: Require current password + new password + confirmation

### **Session Management**
- **JWT Tokens**: Managed by Supabase Auth
- **Refresh Strategy**: Automatic token refresh
- **Session Tracking**: Track active sessions in user_sessions table
- **Logout**: Invalidate session tokens

### **Admin Access Control**
- **Role-based**: Admin role stored in user_roles table
- **Function-based**: Use `is_admin()` function for access control
- **UI Control**: Admin buttons/components only visible to admin users

---

## 📱 **Mobile Responsiveness**

### **Design Patterns**
- **Follow existing patterns**: Auth buttons follow same pattern as language-switcher and theme-switcher
- **Mobile menu integration**: Auth buttons visible when navigation menu is open
- **Touch-friendly**: Large touch targets for mobile devices
- **Responsive forms**: Account management forms optimized for mobile

### **Mobile-Specific Features**
- **Biometric authentication**: Fingerprint/Face ID for mobile devices
- **Mobile-optimized 2FA**: Easy QR code scanning
- **Responsive admin panel**: Mobile-friendly user management interface

---

## 🌐 **Translation Support**

### **Translation Files Structure**
```
components/auth-buttons/locales/
├── auth-buttons-locales.json
├── auth-modal-locales.json
└── account-management-locales.json

pages/auth/locales/
├── auth-locales.json
└── account-locales.json
```

### **Translatable Content**
- **Auth buttons**: "Login", "Sign Up", "Sign Out", "Account"
- **Auth forms**: Form labels, validation messages, error messages
- **Account management**: Section titles, form labels, button text
- **Admin panel**: User management interface text

---

## 🚀 **Implementation Phases**

### **Phase 0: Supabase Foundation Setup**
**Duration**: 1 week
**Tasks**:
- [ ] Get Supabase project credentials (URL and anon key)
- [ ] Create Supabase client configuration file
- [ ] Initialize Supabase client in JavaScript
- [ ] Enable Email/Password authentication in Supabase dashboard
- [ ] Configure authentication settings and email templates
- [ ] Test basic Supabase connection

### **Phase 1: Database Setup & Basic Auth Components**
**Duration**: 1-2 weeks
**Tasks**:
- [ ] Create database schema and tables
- [ ] Set up database functions and triggers
- [ ] Create auth-buttons component
- [ ] Integrate auth buttons with navigation-menu
- [ ] Basic authentication state management

### **Phase 2: Authentication Flow**
**Duration**: 2-3 weeks
**Tasks**:
- [ ] Create auth-modal component
- [ ] Implement login/signup functionality
- [ ] Create auth page (`/auth/`)
- [ ] Form validation and error handling
- [ ] Integration with Supabase Auth

### **Phase 3: Account Management Components**
**Duration**: 4-5 weeks
**Tasks**:
- [ ] Create account management page (`/account/`)
- [ ] Create profile management component (avatar, username)
- [ ] Create password change component (modal/inline)
- [ ] Create email change component
- [ ] Create login activity component
- [ ] Create notifications preferences component
- [ ] Create account actions component
- [ ] Avatar upload implementation
- [ ] Translation support for all components

### **Phase 4: Two-Factor Authentication Component**
**Duration**: 2-3 weeks
**Tasks**:
- [ ] Create two-factor authentication component
- [ ] 2FA setup wizard with QR code generation
- [ ] TOTP implementation and verification
- [ ] Backup codes generation and display
- [ ] Enable/disable 2FA functionality
- [ ] Integration with account management page

### **Phase 5: Subscription & Billing Components**
**Duration**: 3-4 weeks
**Tasks**:
- [ ] Create subscription management component
- [ ] Create app entitlements component
- [ ] Stripe integration for payments
- [ ] Payment method management
- [ ] Subscription upgrade/downgrade flows
- [ ] Integration with existing entitlements system

### **Phase 6: Admin Panel**
**Duration**: 2-3 weeks
**Tasks**:
- [ ] Create admin panel (`/admin/`)
- [ ] User management interface
- [ ] Role management functionality
- [ ] Access control implementation
- [ ] Admin-only access restrictions

### **Phase 7: Integration & Testing**
**Duration**: 1-2 weeks
**Tasks**:
- [ ] Integration with subdomain access control
- [ ] Cloudflare Workers integration
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit

---

## 🔧 **Technical Decisions**

### **2FA Implementation**
- **Decision**: TOTP (Time-based One-Time Password)
- **Rationale**: Industry standard, works with popular authenticator apps
- **Library**: `speakeasy` for TOTP generation and verification

### **Admin Access Control**
- **Decision**: Role-based access control
- **Rationale**: Scalable, allows for future role expansion
- **Implementation**: Database roles table with admin check function

### **Password Requirements**
- **Decision**: Minimum 8 characters with complexity requirements
- **Rationale**: Balance between security and usability
- **Validation**: Both client-side and server-side validation

### **Avatar Upload**
- **Decision**: Supabase Storage for avatar images
- **Rationale**: Integrated with existing Supabase setup
- **Implementation**: Direct upload to Supabase Storage with CDN

### **Session Management**
- **Decision**: JWT tokens managed by Supabase Auth
- **Rationale**: Leverages existing Supabase authentication
- **Enhancement**: Additional session tracking for admin purposes

---

## 📊 **Database Implementation Steps**

### **Prerequisites**
- [ ] Supabase project created and accessible
- [ ] Supabase client configured in frontend
- [ ] Authentication enabled in Supabase dashboard

### **Step 1: Create Tables**
```bash
# Connect to Supabase SQL Editor
# Execute the table creation scripts above
```

### **Step 2: Set Up Row Level Security**
```bash
# Execute RLS policies for each table
# Test policies with different user roles
```

### **Step 3: Create Functions and Triggers**
```bash
# Execute database functions
# Test user creation trigger
# Test admin check function
```

### **Step 4: Create Indexes**
```sql
-- Performance indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
```

### **Step 5: Set Up Admin User**
```sql
-- Create admin user (replace with actual user ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_ADMIN_USER_ID', 'admin');
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- [ ] Component initialization and functionality
- [ ] Authentication state management
- [ ] Form validation and error handling
- [ ] 2FA setup and verification

### **Integration Tests**
- [ ] Authentication flow end-to-end
- [ ] Account management functionality
- [ ] Admin panel access control
- [ ] Mobile responsiveness

### **Security Tests**
- [ ] Authentication bypass attempts
- [ ] Admin access control
- [ ] 2FA security
- [ ] Session management

### **Performance Tests**
- [ ] Component loading times
- [ ] Database query performance
- [ ] Mobile performance
- [ ] Large user list handling (admin panel)

---

## 📈 **Success Metrics**

### **Technical Metrics**
- [ ] Authentication success rate > 99%
- [ ] Page load times < 3 seconds
- [ ] Mobile responsiveness score > 90
- [ ] Security audit passed

### **User Experience Metrics**
- [ ] User registration completion rate
- [ ] 2FA adoption rate
- [ ] Account management usage
- [ ] Mobile user satisfaction

### **Admin Metrics**
- [ ] Admin panel efficiency
- [ ] User management task completion time
- [ ] Admin user satisfaction

---

## 🔮 **Future Enhancements**

### **Advanced Features**
- [ ] Social login (Google, GitHub, etc.)
- [ ] Email verification and password reset
- [ ] User activity logging
- [ ] Advanced admin analytics

### **Security Enhancements**
- [ ] Rate limiting for authentication attempts
- [ ] IP-based access control
- [ ] Advanced session management
- [ ] Security audit logging

### **User Experience**
- [ ] Remember me functionality
- [ ] Single sign-on (SSO) for subdomains
- [ ] Progressive web app (PWA) authentication
- [ ] Offline authentication support

---

## 📝 **Quick Start Commands**

### **Supabase Setup (Prerequisites)**
```bash
# 1. Get Supabase project URL and anon key from dashboard
# 2. Create config file for API credentials
# 3. Initialize Supabase client in JavaScript
# 4. Enable Email/Password authentication in dashboard
# 5. Test basic connection
```

### **Database Setup**
```bash
# 1. Connect to Supabase SQL Editor
# 2. Execute table creation scripts
# 3. Execute function and trigger scripts
# 4. Create indexes
# 5. Set up admin user
```

### **Component Development**
```bash
# 1. Create site-wide component directories
mkdir -p components/auth-buttons

# 2. Create page directories and their component folders
# Authentication Page
mkdir -p auth/components/login-form
mkdir -p auth/components/signup-form
mkdir -p auth/components/auth-toggle

# Account Management Page
mkdir -p account/components/account-layout
mkdir -p account/components/profile-management
mkdir -p account/components/password-change
mkdir -p account/components/email-change
mkdir -p account/components/login-activity
mkdir -p account/components/subscription-management
mkdir -p account/components/app-entitlements
mkdir -p account/components/notifications-preferences
mkdir -p account/components/account-actions

# Two-Factor Authentication Page
mkdir -p 2fa/components/two-factor-auth

# Admin Panel Page
mkdir -p admin/components/admin-layout
mkdir -p admin/components/user-management
mkdir -p admin/components/access-control

# 3. Set up component files (HTML, CSS, JS for each)
# 4. Implement authentication logic
# 5. Test integration with existing components
```

---

## ⚠️ **Important Considerations**

### **Security**
- [ ] Never expose admin functions to non-admin users
- [ ] Validate all user inputs server-side
- [ ] Use HTTPS for all authentication flows
- [ ] Implement rate limiting for authentication attempts

### **Performance**
- [ ] Optimize database queries with proper indexing
- [ ] Use lazy loading for non-critical components
- [ ] Implement caching for frequently accessed data
- [ ] Monitor and optimize mobile performance

### **User Experience**
- [ ] Provide clear error messages and feedback
- [ ] Ensure mobile-first design
- [ ] Test across different browsers and devices
- [ ] Maintain consistency with existing design patterns

---

**Remember**: This authentication system will serve as the foundation for user management across all BitMinded tools and subdomains. The modular component approach ensures consistency and maintainability while providing a scalable foundation for future enhancements.

## 🔄 **Current Status & Next Steps**

### **What's Ready:**
- ✅ Component architecture strategy documented
- ✅ Database schema designed
- ✅ Implementation phases planned
- ✅ Supabase project created (but not configured)

### **What's Needed:**
- ❌ Supabase client setup and configuration
- ❌ Authentication configuration in Supabase dashboard
- ❌ Database tables and functions creation
- ❌ Auth components development

### **Immediate Next Steps:**
1. **Get Supabase credentials** (project URL and anon key)
2. **Set up Supabase client** in the frontend
3. **Enable authentication** in Supabase dashboard
4. **Create database schema** with tables and functions

---

*Last updated: [Current Date]*
*Status: Planning Phase - Supabase Setup Required*
*Next Steps: Configure Supabase client and authentication*

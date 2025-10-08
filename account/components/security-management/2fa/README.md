# Two-Factor Authentication (2FA) Implementation Plan

## Overview
This document outlines the complete implementation plan for adding Two-Factor Authentication (2FA) to the BitMinded platform. The implementation will follow the existing component architecture patterns used in profile management and password change components.

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Requirements](#database-requirements)
3. [Component Structure](#component-structure)
4. [Implementation Steps](#implementation-steps)
5. [User Flow](#user-flow)
6. [Technical Specifications](#technical-specifications)
7. [Security Considerations](#security-considerations)
8. [Testing Checklist](#testing-checklist)

---

## 🏗️ Architecture Overview

### Component Pattern
Following the existing pattern used in:
- `profile-management/` - Shows how to organize sub-components
- `password-change/` - Shows form handling, validation, and state management
- `username-edit/` - Shows inline edit pattern with button triggers

### 2FA Component Structure
```
2fa/
├── 2fa.html                          # Main 2FA status component (inline display)
├── 2fa.js                            # Main 2FA component logic
├── 2fa.css                           # Styles for inline 2FA status
├── 2fa-setup.html                    # 2FA setup page (opens in new tab)
├── 2fa-setup.js                      # Setup page logic
├── 2fa-setup.css                     # Setup page styles
├── locales/
│   └── 2fa-locales.json             # Translation strings
├── 2fa-translations.js              # Translation manager
└── README.md                         # This file
```

---

## 🗄️ Database Requirements

### Current Database Status
✅ **ALREADY IMPLEMENTED** in `supabase/schema/database-schema.sql` (lines 54-70):

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

### Additional Database Tasks (YOU NEED TO DO)

#### 1. Add Index for Performance
```sql
-- Add index for faster lookups
CREATE INDEX idx_user_2fa_user_id ON public.user_2fa(user_id);
CREATE INDEX idx_user_2fa_is_enabled ON public.user_2fa(is_enabled);
```

#### 2. Add Last Verified Timestamp (Optional but Recommended)
```sql
-- Add column to track last successful 2FA verification
ALTER TABLE public.user_2fa 
ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE;
```

#### 3. Add Verification Attempts Tracking (Security Feature)
```sql
-- Create table to track verification attempts (prevent brute force)
CREATE TABLE public.user_2fa_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    ip_address INET
);

-- Enable RLS
ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (for logging), select for own records
CREATE POLICY "Users can view own 2FA attempts" ON public.user_2fa_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow insert 2FA attempts" ON public.user_2fa_attempts
    FOR INSERT WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_user_2fa_attempts_user_id ON public.user_2fa_attempts(user_id);
CREATE INDEX idx_user_2fa_attempts_time ON public.user_2fa_attempts(attempt_time);
```

#### 4. Update `updated_at` Trigger (If Not Already Set)
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_2fa table
CREATE TRIGGER update_user_2fa_updated_at 
    BEFORE UPDATE ON public.user_2fa 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📁 Component Structure

### 1. Main 2FA Status Component (`2fa.html`, `2fa.js`, `2fa.css`)

**Purpose**: Displays inline in the security management section, shows current 2FA status.

**States**:
- **Inactive** (default): Shows explanation and "Enable 2FA" button
- **Active**: Shows enabled status with "Manage 2FA" button (for future: disable, regenerate codes)

**UI Elements** (similar to password-change pattern):
```html
<div class="2fa-status" id="2fa-status">
    <div class="2fa-status__header">
        <h3 class="2fa-status__title">Two-Factor Authentication</h3>
        <div class="2fa-status__badge" id="2fa-status-badge">
            <!-- Shows "Inactive" or "Active" -->
        </div>
    </div>
    
    <div class="2fa-status__content">
        <div class="2fa-status__explanation">
            <p>Explanation of what 2FA is...</p>
            <ul>
                <li>Extra layer of security</li>
                <li>Requires phone app</li>
                <li>Protection against unauthorized access</li>
            </ul>
        </div>
        
        <div class="2fa-status__actions">
            <button id="2fa-setup-btn" class="2fa-status__action-btn">
                Enable 2FA
            </button>
            <!-- OR when active: -->
            <button id="2fa-manage-btn" class="2fa-status__action-btn">
                Manage 2FA
            </button>
        </div>
    </div>
</div>
```

**JavaScript Structure** (following PasswordChange pattern):
```javascript
class TwoFactorAuth {
    constructor() {
        this.isInitialized = false;
        this.is2FAEnabled = false;
        this.setupWindow = null; // Reference to setup popup window
    }

    async init() {
        // Load current 2FA status from database
        // Setup event listeners
        // Initialize translations
    }

    async load2FAStatus() {
        // Query user_2fa table for current user
        // Update UI based on is_enabled status
    }

    handleSetupClick() {
        // Open 2fa-setup.html in new tab
        // Listen for completion message from setup window
    }

    async refresh2FAStatus() {
        // Called when setup completes
        // Reload status from database
        // Update UI to show "Active"
    }
}
```

### 2. 2FA Setup Page (`2fa-setup.html`, `2fa-setup.js`, `2fa-setup.css`)

**Purpose**: Standalone page that opens in new tab, handles the complete 2FA setup flow.

**Setup Steps**:
1. **Welcome Screen**: Explain what will happen
2. **QR Code Display**: Show QR code for authenticator app
3. **Verification**: Enter 6-digit code to confirm setup
4. **Backup Codes**: Display and download recovery codes
5. **Completion**: Close window and return to main page

**UI Flow**:
```html
<!-- Step 1: Introduction -->
<div class="setup-step" id="step-intro">
    <h2>Set Up Two-Factor Authentication</h2>
    <p>You'll need an authenticator app...</p>
    <button id="start-setup-btn">Get Started</button>
</div>

<!-- Step 2: QR Code -->
<div class="setup-step hidden" id="step-qr">
    <h2>Scan QR Code</h2>
    <div class="qr-code-container">
        <canvas id="qr-code"></canvas>
    </div>
    <div class="manual-entry">
        <p>Or enter this code manually:</p>
        <code id="secret-key-display"></code>
        <button id="copy-secret-btn">Copy</button>
    </div>
    <button id="continue-to-verify-btn">Continue</button>
</div>

<!-- Step 3: Verification -->
<div class="setup-step hidden" id="step-verify">
    <h2>Verify Your Code</h2>
    <p>Enter the 6-digit code from your authenticator app:</p>
    <div class="verification-input">
        <input type="text" maxlength="6" pattern="[0-9]{6}" id="verify-code" />
    </div>
    <button id="verify-btn">Verify</button>
    <p class="error-message hidden" id="verify-error"></p>
</div>

<!-- Step 4: Backup Codes -->
<div class="setup-step hidden" id="step-backup">
    <h2>Save Your Backup Codes</h2>
    <p class="warning">Store these codes safely. You can use them to access your account if you lose your phone.</p>
    <div class="backup-codes-container">
        <ul id="backup-codes-list"></ul>
    </div>
    <div class="backup-actions">
        <button id="download-codes-btn">Download Codes</button>
        <button id="print-codes-btn">Print Codes</button>
    </div>
    <div class="confirmation">
        <label>
            <input type="checkbox" id="codes-saved-checkbox" />
            I have saved these codes in a safe place
        </label>
    </div>
    <button id="complete-setup-btn" disabled>Complete Setup</button>
</div>

<!-- Step 5: Success -->
<div class="setup-step hidden" id="step-success">
    <div class="success-icon">✅</div>
    <h2>2FA Enabled Successfully!</h2>
    <p>Your account is now protected with two-factor authentication.</p>
    <button id="close-window-btn">Close</button>
</div>
```

**JavaScript Flow**:
```javascript
class TwoFactorAuthSetup {
    constructor() {
        this.currentStep = 'intro';
        this.secretKey = null;
        this.backupCodes = [];
        this.steps = ['intro', 'qr', 'verify', 'backup', 'success'];
    }

    async init() {
        // Generate secret key
        // Setup event listeners for each step
        // Initialize step navigation
    }

    async generateSecret() {
        // Generate TOTP secret using otpauth library
        // Format: base32 encoded secret
    }

    async generateQRCode() {
        // Create QR code with format:
        // otpauth://totp/BitMinded:user@email.com?secret=SECRET&issuer=BitMinded
    }

    async verifyCode(code) {
        // Verify the 6-digit code matches current TOTP
        // Can use server-side verification or client-side library
    }

    async generateBackupCodes() {
        // Generate 10 random backup codes (8-12 characters each)
        // Format: XXXX-XXXX-XXXX
    }

    async saveToDatabase() {
        // Save secret_key, backup_codes, is_enabled=true to user_2fa table
    }

    downloadBackupCodes() {
        // Create text file with codes
        // Trigger download
    }

    async completeSetup() {
        // Save to database
        // Mark is_enabled = true
        // Send message to parent window (opener)
        // Close current window after 2 seconds
    }

    closeWindow() {
        // Send completion message to parent
        window.opener.postMessage({ type: '2fa-setup-complete' }, '*');
        window.close();
    }
}
```

---

## 🔄 Implementation Steps

### Phase 1: Database Setup (YOU DO THIS)
- [ ] Run the additional SQL scripts mentioned in Database Requirements section
- [ ] Verify RLS policies are working correctly
- [ ] Test inserting/updating/selecting from `user_2fa` table
- [ ] Ensure indexes are created for performance

### Phase 2: Install Required NPM Packages (YOU DO THIS)
The 2FA implementation will need these JavaScript libraries:

```bash
# TOTP (Time-based One-Time Password) library
npm install otpauth

# QR Code generation
npm install qrcode

# Or use CDN versions in HTML:
```

```html
<!-- Add to 2fa-setup.html -->
<script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

### Phase 3: Create Component Files (AI CAN HELP WITH THIS)
1. Create locales file first (`locales/2fa-locales.json`)
2. Create translations manager (`2fa-translations.js`)
3. Create main component files (`2fa.html`, `2fa.css`, `2fa.js`)
4. Create setup page files (`2fa-setup.html`, `2fa-setup.css`, `2fa-setup.js`)

### Phase 4: Update Component Loader (AI CAN HELP)
Add 2FA component loading logic to `components/shared/component-loader.js`:

```javascript
// Around line 249, add after password-change section:
else if (componentName === '2fa') {
    const translationScript = document.createElement('script');
    translationScript.src = '/account/components/security-management/2fa/2fa-translations.js';
    translationScript.onload = () => {
        const init2FA = () => {
            if (window.TwoFactorAuth && !window.twoFactorAuth) {
                window.twoFactorAuth = new window.TwoFactorAuth();
            }
            if (window.twoFactorAuth) {
                window.twoFactorAuth.init(config);
            }
        };
        setTimeout(init2FA, 50);
    };
    document.head.appendChild(translationScript);
}
```

### Phase 5: Update Security Management Component (AI CAN HELP)
Update `security-management.js`:

1. **Update `load2FAStatus()` method** (line 247):
```javascript
async load2FAStatus() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('Failed to get user for 2FA status');
            this.update2FAStatus(false);
            return;
        }

        // Query user_2fa table
        const { data: twoFAData, error } = await supabase
            .from('user_2fa')
            .select('is_enabled')
            .eq('user_id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Failed to load 2FA status:', error);
            this.update2FAStatus(false);
            return;
        }

        // Update UI based on status
        const isEnabled = twoFAData?.is_enabled || false;
        this.update2FAStatus(isEnabled);

    } catch (error) {
        console.error('Failed to load 2FA status:', error);
        this.update2FAStatus(false);
    }
}
```

2. **Update `update2FAStatus()` method** (already exists at line 373, should work as-is)

### Phase 6: Implement Backend Verification (YOU DO THIS - EDGE FUNCTION)
Create a Supabase Edge Function for server-side TOTP verification:

**File**: `supabase/functions/verify-2fa-code/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as OTPAuth from "https://esm.sh/otpauth@9.1.4"

serve(async (req) => {
  try {
    const { userId, code, action } = await req.json()
    
    // Get user's secret from database
    const { data: twoFAData, error } = await supabaseClient
      .from('user_2fa')
      .select('secret_key, is_enabled')
      .eq('user_id', userId)
      .single()
    
    if (error || !twoFAData) {
      return new Response(
        JSON.stringify({ success: false, message: 'No 2FA setup found' }),
        { status: 404 }
      )
    }
    
    // Verify TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: 'BitMinded',
      label: 'BitMinded',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: twoFAData.secret_key
    })
    
    const isValid = totp.validate({ token: code, window: 1 }) !== null
    
    // Log attempt
    await supabaseClient
      .from('user_2fa_attempts')
      .insert({
        user_id: userId,
        success: isValid,
        ip_address: req.headers.get('x-forwarded-for')
      })
    
    return new Response(
      JSON.stringify({ success: isValid }),
      { status: 200 }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    )
  }
})
```

### Phase 7: Testing (BOTH)
- Test complete setup flow
- Test with different authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
- Test backup codes
- Test security management integration
- Test translations
- Test responsive design
- Test error handling

---

## 👤 User Flow

### Setup Flow (New Tab)
1. User clicks "Enable 2FA" button in security management
2. New tab opens with `2fa-setup.html`
3. **Step 1**: User sees introduction, clicks "Get Started"
4. **Step 2**: QR code is displayed
   - User scans with authenticator app
   - Or copies manual entry code
5. **Step 3**: User enters 6-digit code from app
   - Verify code is correct
   - If incorrect, show error and allow retry
6. **Step 4**: Display 10 backup codes
   - User downloads or prints codes
   - User confirms they've saved codes
7. **Step 5**: Success message
   - User clicks "Close"
   - Tab closes and returns to security management
8. Security management page refreshes and shows "Active" status

### Verification Flow (Future - Login Integration)
1. User logs in with username/password
2. If 2FA is enabled, redirect to verification page
3. User enters 6-digit code from authenticator app
4. If correct, complete login
5. If incorrect, allow retry (track attempts)
6. Option to use backup code if lost phone

---

## 🔧 Technical Specifications

### TOTP Configuration
```javascript
{
  issuer: 'BitMinded',
  label: userEmail,
  algorithm: 'SHA1',      // Most compatible with authenticator apps
  digits: 6,              // Standard 6-digit codes
  period: 30,             // 30-second time window
  secret: base32Secret    // Base32 encoded secret
}
```

### QR Code Format
```
otpauth://totp/BitMinded:user@email.com?secret=SECRET&issuer=BitMinded&algorithm=SHA1&digits=6&period=30
```

### Backup Codes Format
- Generate 10 codes
- Each code: 12 characters
- Format: `XXXX-XXXX-XXXX` (dashes for readability)
- Characters: uppercase letters and numbers (no ambiguous: 0, O, I, 1)
- Store as hashed in database (bcrypt or similar)
- Mark as used when utilized

### Window Communication
```javascript
// From setup window to parent
window.opener.postMessage({
  type: '2fa-setup-complete',
  status: 'success'
}, window.location.origin);

// In main window (2fa.js)
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data.type === '2fa-setup-complete') {
    this.refresh2FAStatus();
  }
});
```

---

## 🔒 Security Considerations

### Secret Key Storage
- ✅ Store encrypted in database (Supabase handles this)
- ✅ Use RLS to ensure users can only access their own secrets
- ✅ Never expose secret key after initial setup
- ✅ Use HTTPS for all communication

### Rate Limiting
- Implement attempt tracking in `user_2fa_attempts` table
- Limit to 5 failed attempts per 15 minutes
- Lock account temporarily after threshold

### Backup Codes Security
- Hash backup codes before storing (use bcrypt)
- Mark codes as used when utilized
- Don't allow reuse of backup codes
- Generate new codes when user requests

### Client-Side vs Server-Side Verification
**Initial Setup**: Can verify client-side for better UX
**Login Verification**: MUST verify server-side for security

### Best Practices
- Use secure random number generator for secrets
- Implement time-based code validation with small window (±1 period)
- Clear sensitive data from memory after use
- Log all 2FA events for audit trail
- Provide clear user guidance throughout process

---

## ✅ Testing Checklist

### Functional Testing
- [ ] Can open setup in new tab
- [ ] QR code displays correctly
- [ ] Can scan QR code with Google Authenticator
- [ ] Can scan QR code with Authy
- [ ] Can scan QR code with Microsoft Authenticator
- [ ] Manual entry code works
- [ ] 6-digit code verification works
- [ ] Invalid code shows error
- [ ] Backup codes are generated (10 codes)
- [ ] Can download backup codes as text file
- [ ] Can print backup codes
- [ ] Checkbox prevents continuing until checked
- [ ] Setup saves to database correctly
- [ ] Window closes after completion
- [ ] Main page refreshes and shows "Active"
- [ ] Status persists after page refresh

### UI/UX Testing
- [ ] All text is translatable
- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet
- [ ] All buttons have hover states
- [ ] Loading states display correctly
- [ ] Error messages are clear and helpful
- [ ] Success messages are encouraging
- [ ] Copy buttons work
- [ ] QR code is properly sized and scannable

### Security Testing
- [ ] Secret is never exposed after setup
- [ ] RLS policies prevent unauthorized access
- [ ] Failed attempts are logged
- [ ] Backup codes are hashed in database
- [ ] Can't setup 2FA for another user
- [ ] Can't view another user's 2FA settings
- [ ] HTTPS is enforced
- [ ] No sensitive data in console logs
- [ ] No sensitive data in error messages

### Integration Testing
- [ ] Works with existing security management component
- [ ] Works with existing translation system
- [ ] Works with existing theme system
- [ ] Works with component loader
- [ ] Doesn't break other security features
- [ ] Password change still works
- [ ] Login activity still works

### Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 📚 Resources

### Libraries Documentation
- [otpauth](https://github.com/hectorm/otpauth) - TOTP/HOTP library
- [qrcode.js](https://github.com/davidshimjs/qrcodejs) - QR code generation
- [Supabase Auth](https://supabase.com/docs/guides/auth) - Authentication docs

### Authenticator Apps
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
- [Authy](https://authy.com/)
- [Microsoft Authenticator](https://www.microsoft.com/en-us/security/mobile-authenticator-app)

### Standards
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [RFC 4226 - HOTP](https://tools.ietf.org/html/rfc4226)

---

## 🚀 Future Enhancements

### Phase 2 Features (After Initial Implementation)
1. **Disable 2FA**: Allow users to turn off 2FA
2. **Regenerate Backup Codes**: Generate new codes after using
3. **Show Used Backup Codes**: Display which codes have been used
4. **SMS Backup**: Optional SMS as fallback (requires Twilio/similar)
5. **Recovery Email**: Send recovery codes via email
6. **Trust This Device**: Remember device for 30 days
7. **Multiple Devices**: Register multiple authenticator apps
8. **Login History**: Show when 2FA was used for login
9. **Security Alerts**: Notify when 2FA settings change

### Phase 3 Features (Advanced)
1. **WebAuthn/FIDO2**: Hardware security key support
2. **Biometric Authentication**: Fingerprint/Face ID
3. **Risk-Based Authentication**: Adaptive 2FA based on login patterns
4. **Admin Management**: Admins can see 2FA status for users
5. **Forced 2FA**: Require 2FA for certain user roles

---

## 📝 Notes

### Important Considerations
1. **Backup Codes are Critical**: Users MUST save them. Consider requiring email confirmation.
2. **Account Recovery**: Have a clear process if user loses both phone and backup codes.
3. **Support Documentation**: Create user-facing help docs explaining 2FA.
4. **Gradual Rollout**: Consider making 2FA optional initially, then required for admins.

### Development Tips
1. Use test accounts during development
2. Keep multiple authenticator apps for testing
3. Save backup codes during testing
4. Test the "lost phone" scenario
5. Test with expired codes (wait 30+ seconds)

---

## 📞 Support & Questions

If you have questions during implementation:
1. Check this README first
2. Review existing component implementations (password-change, username-edit)
3. Check Supabase documentation
4. Test with multiple authenticator apps
5. Ask for help if stuck on a specific step

---

**Last Updated**: October 8, 2025
**Status**: Planning Phase - Ready for Implementation
**Estimated Development Time**: 2-3 days
**Priority**: High - Security Feature

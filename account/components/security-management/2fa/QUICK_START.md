# 2FA Quick Start Guide

**Ready to implement 2FA?** Follow these steps in order.

---

## 🚀 Step 1: Database Setup (5-10 minutes)

### What to do:
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `2fa-database-setup.sql`
3. Paste and execute in SQL Editor
4. Check the output for any errors
5. Verify all checkmarks (✓) appear in verification section

### What you're setting up:
- Performance indexes for faster queries
- Attempt tracking table (security)
- Helper functions for 2FA checks
- Triggers for auto-updating timestamps

### How to verify it worked:
Run this query in SQL Editor:
```sql
-- Should return your 2FA table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_2fa';

-- Should show: id, user_id, secret_key, backup_codes, is_enabled, 
--              created_at, updated_at, last_verified_at

-- Should return the attempts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_2fa_attempts';
```

**✅ Done when:** All verification checks pass and tables exist

---

## 🔌 Step 2: Choose Your Library Approach (2 minutes)

### Option A: CDN (Recommended - Easier)
No installation needed! Just remember to add these to your HTML files:

```html
<!-- Add to 2fa-setup.html <head> section -->
<script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

### Option B: NPM (If using build process)
```bash
cd /home/tomswb/bitminded.github.io
npm install otpauth qrcode
```

**Choose one and move on!**

---

## 🌐 Step 3: Create Edge Function (15-20 minutes)

### Why:
Server-side TOTP verification for security

### What to do:
1. Create folder structure:
   ```bash
   mkdir -p supabase/functions/verify-2fa-code
   ```

2. Create `supabase/functions/verify-2fa-code/index.ts`

3. Copy the TypeScript code from `README.md` Section 6, Phase 6

4. Deploy to Supabase:
   ```bash
   supabase functions deploy verify-2fa-code
   ```

5. Get the function URL from Supabase Dashboard

### How to test:
Use curl or Postman:
```bash
curl -X POST 'YOUR_FUNCTION_URL' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test-uuid","code":"123456","action":"verify"}'
```

**✅ Done when:** Function deploys successfully and responds to test calls

**⚠️ Note:** You might want to skip this initially and use client-side verification for testing, then add server-side later for production.

---

## 📝 Step 4: Review Component Architecture (5 minutes)

### Files you'll create:
```
2fa/
├── locales/2fa-locales.json          ← Translation strings
├── 2fa-translations.js                ← Translation manager
├── 2fa.html                           ← Status component (inline)
├── 2fa.css                            ← Status component styles
├── 2fa.js                             ← Status component logic
├── 2fa-setup.html                     ← Setup page (new tab)
├── 2fa-setup.css                      ← Setup page styles
└── 2fa-setup.js                       ← Setup page logic
```

### Component relationship:
1. **Main page** (`security-management`) contains `2fa.html` inline
2. User clicks "Enable 2FA" button
3. Opens `2fa-setup.html` in **new tab**
4. User completes setup in new tab
5. New tab closes, sends message to main page
6. Main page refreshes and shows "Active" status

**✅ Done when:** You understand the two-component architecture

---

## 🎨 Step 5: Build Locales First (10 minutes)

### Create: `locales/2fa-locales.json`

Start with English and your other languages:
```json
{
  "en": {
    "Two-Factor Authentication": "Two-Factor Authentication",
    "2FA adds an extra layer of security": "2FA adds an extra layer of security to your account",
    "Status": "Status",
    "Inactive": "Inactive",
    "Active": "Active",
    "Enable 2FA": "Enable 2FA",
    "Manage 2FA": "Manage 2FA",
    "Disable 2FA": "Disable 2FA",
    ...
  },
  "de": { ... },
  "fr": { ... }
}
```

See `password-change/locales/password-change-locales.json` for pattern

### Create: `2fa-translations.js`

Copy the pattern from `password-change-translations.js` and adapt for 2FA

**✅ Done when:** You have translations for all UI text

---

## 🔨 Step 6: Build Main Component (30-45 minutes)

### Create these files in order:

1. **2fa.html** - The inline status display
   - Status badge (Active/Inactive)
   - Explanation text
   - Action button

2. **2fa.css** - Styling
   - Follow existing `.password-change` patterns
   - Use `.2fa-status` as base class

3. **2fa.js** - Logic
   - Load current 2FA status from database
   - Handle "Enable 2FA" button click → open new tab
   - Listen for completion message from setup window
   - Refresh status when setup completes

**Key code snippet for 2fa.js:**
```javascript
class TwoFactorAuth {
    constructor() {
        this.isInitialized = false;
        this.is2FAEnabled = false;
        this.setupWindow = null;
    }

    async init() {
        await this.load2FAStatus();
        this.setupEventListeners();
        this.setupMessageListener();
    }

    async load2FAStatus() {
        const { data: user } = await supabase.auth.getUser();
        const { data: twoFA } = await supabase
            .from('user_2fa')
            .select('is_enabled')
            .eq('user_id', user.id)
            .single();
        
        this.is2FAEnabled = twoFA?.is_enabled || false;
        this.updateUI();
    }

    handleSetupClick() {
        // Open setup in new tab
        this.setupWindow = window.open(
            '/account/components/security-management/2fa/2fa-setup.html',
            '2fa-setup',
            'width=600,height=800'
        );
    }

    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type === '2fa-setup-complete') {
                this.refresh2FAStatus();
            }
        });
    }
}
```

**✅ Done when:** Status component displays and button opens new tab

---

## 🎯 Step 7: Build Setup Page (2-3 hours)

### This is the biggest part! Take it step by step.

### Create: `2fa-setup.html`
Structure with 5 steps:
1. Introduction
2. QR Code Display
3. Code Verification
4. Backup Codes
5. Success

### Create: `2fa-setup.css`
- Wizard-style layout
- Step indicators
- QR code container
- Backup codes grid

### Create: `2fa-setup.js`
Main logic flow:
```javascript
class TwoFactorAuthSetup {
    constructor() {
        this.currentStep = 0;
        this.secretKey = null;
        this.backupCodes = [];
        this.steps = ['intro', 'qr', 'verify', 'backup', 'success'];
    }

    async init() {
        await this.generateSecret();
        this.setupEventListeners();
    }

    async generateSecret() {
        // Use otpauth library
        const totp = new OTPAuth.TOTP({
            issuer: 'BitMinded',
            label: userEmail,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });
        this.secretKey = totp.secret.base32;
    }

    async showQRCode() {
        // Use qrcode library
        const otpauthUrl = `otpauth://totp/BitMinded:${userEmail}?secret=${this.secretKey}&issuer=BitMinded`;
        QRCode.toCanvas(canvas, otpauthUrl);
    }

    async verifyCode(code) {
        // Verify TOTP code
        // Can use client-side or call Edge Function
    }

    async generateBackupCodes() {
        // Generate 10 random codes
        // Format: XXXX-XXXX-XXXX
    }

    async saveToDatabase() {
        const { data: user } = await supabase.auth.getUser();
        
        // Hash backup codes before storing
        const hashedCodes = await this.hashBackupCodes(this.backupCodes);
        
        await supabase.from('user_2fa').upsert({
            user_id: user.id,
            secret_key: this.secretKey,
            backup_codes: hashedCodes,
            is_enabled: true
        });
    }

    completeSetup() {
        // Send message to parent window
        window.opener.postMessage({
            type: '2fa-setup-complete',
            status: 'success'
        }, window.location.origin);
        
        // Close after 2 seconds
        setTimeout(() => window.close(), 2000);
    }
}
```

**Pro tips:**
- Build one step at a time
- Test each step before moving to next
- Use real authenticator app for QR testing
- Save backup codes during testing!

**✅ Done when:** Complete flow works from start to finish

---

## 🔗 Step 8: Integration (30 minutes)

### Update: `component-loader.js`
Add 2FA loading logic around line 249 (after password-change section)

See `README.md` Phase 4 for exact code

### Update: `security-management.js`
Update the `load2FAStatus()` method around line 247

See `README.md` Phase 5 for exact code

**✅ Done when:** 2FA component loads when clicking "Setup" in security page

---

## 🧪 Step 9: Testing (1-2 hours)

### Test with real authenticator apps:
1. Google Authenticator (Android/iOS)
2. Microsoft Authenticator (Android/iOS)
3. Authy (Desktop/Mobile)

### Test flow:
1. ✅ Open security management
2. ✅ Click "Enable 2FA"
3. ✅ New tab opens
4. ✅ Scan QR code with phone
5. ✅ Enter 6-digit code
6. ✅ Download backup codes
7. ✅ Complete setup
8. ✅ Tab closes
9. ✅ Main page shows "Active"
10. ✅ Refresh page - still shows "Active"

### Test edge cases:
- Wrong code entered
- No authenticator app
- Manual entry method
- Backup codes download
- Multiple browsers
- Mobile responsive

**✅ Done when:** All tests pass

---

## 🎉 Step 10: Deploy & Document (30 minutes)

### Create user documentation:
- How to enable 2FA
- Which authenticator apps to use
- How to use backup codes
- What to do if phone is lost

### Deploy:
```bash
git add .
git commit -m "Add 2FA functionality"
git push
```

### Celebrate! 🎊
You've implemented enterprise-grade 2FA!

---

## 📞 Need Help?

### Stuck on database?
- Check Supabase logs
- Verify RLS policies
- Test queries manually

### Stuck on components?
- Look at password-change component for patterns
- Check browser console for errors
- Test with simple HTML first

### Stuck on TOTP/QR?
- Use CDN versions first (easier)
- Test QR with multiple apps
- Check otpauth documentation

### Stuck on testing?
- Use your own account for testing
- Keep backup codes somewhere safe during testing
- Test one step at a time

---

## 📊 Time Estimate

- **Database Setup**: 10 minutes
- **Edge Function**: 20 minutes (or skip initially)
- **Locales**: 10 minutes
- **Main Component**: 45 minutes
- **Setup Page**: 3 hours
- **Integration**: 30 minutes
- **Testing**: 2 hours
- **Documentation**: 30 minutes

**Total: ~7-8 hours** for complete implementation

---

## 🎯 Minimum Viable Product (MVP)

If you want to start simple:

### MVP Includes:
- ✅ Database setup
- ✅ Main status component
- ✅ Basic setup page (QR + verify)
- ✅ Save to database
- ✅ Show active status

### MVP Excludes (add later):
- ❌ Edge Function (use client-side verification)
- ❌ Backup codes (can add in phase 2)
- ❌ Attempt tracking
- ❌ Disable 2FA feature
- ❌ Regenerate codes

Start with MVP, then enhance!

---

**Ready?** Start with Step 1 (Database Setup) and work through each step!

Good luck! 🚀

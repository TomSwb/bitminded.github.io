# 2FA Implementation Checklist

Quick reference checklist for implementing Two-Factor Authentication.

## 🎯 Your Tasks (Database Setup)

### Database Configuration
- [ ] **Add Performance Indexes**
  ```sql
  CREATE INDEX idx_user_2fa_user_id ON public.user_2fa(user_id);
  CREATE INDEX idx_user_2fa_is_enabled ON public.user_2fa(is_enabled);
  ```

- [ ] **Add Last Verified Timestamp** (Optional)
  ```sql
  ALTER TABLE public.user_2fa 
  ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE;
  ```

- [ ] **Create Attempts Tracking Table**
  ```sql
  -- Run the SQL from README.md section "Add Verification Attempts Tracking"
  ```

- [ ] **Add Updated_at Trigger**
  ```sql
  -- Run the SQL from README.md section "Update updated_at Trigger"
  ```

- [ ] **Test Database Access**
  - [ ] Test SELECT from user_2fa table
  - [ ] Test INSERT into user_2fa table
  - [ ] Test UPDATE on user_2fa table
  - [ ] Verify RLS policies work correctly

### Edge Function Setup
- [ ] **Create verify-2fa-code Edge Function**
  - [ ] Create folder: `supabase/functions/verify-2fa-code/`
  - [ ] Create `index.ts` file (code in README.md)
  - [ ] Deploy function to Supabase
  - [ ] Test function with sample data

### Dependencies
- [ ] **Install Required Libraries** (Choose ONE approach)
  
  **Option A: NPM** (if using build process)
  ```bash
  npm install otpauth qrcode
  ```
  
  **Option B: CDN** (simpler, recommended for this project)
  - Add to `2fa-setup.html`:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  ```

---

## 🤖 AI Tasks (Component Development)

### Phase 1: Localization
- [ ] Create `locales/2fa-locales.json`
- [ ] Create `2fa-translations.js`

### Phase 2: Main 2FA Component
- [ ] Create `2fa.html` (status display)
- [ ] Create `2fa.css` (styling)
- [ ] Create `2fa.js` (logic)

### Phase 3: Setup Page
- [ ] Create `2fa-setup.html` (setup flow)
- [ ] Create `2fa-setup.css` (setup styling)
- [ ] Create `2fa-setup.js` (setup logic)

### Phase 4: Integration
- [ ] Update `component-loader.js` to handle 2FA component
- [ ] Update `security-management.js` to properly load 2FA status
- [ ] Update `security-management.html` if needed

---

## 🧪 Testing Tasks (Both)

### Functional Tests
- [ ] Setup flow opens in new tab
- [ ] QR code generates correctly
- [ ] Manual entry code is displayed
- [ ] 6-digit code verification works
- [ ] Invalid codes show errors
- [ ] Backup codes are generated (10 codes)
- [ ] Download codes feature works
- [ ] Checkbox prevents premature completion
- [ ] Database saves correctly
- [ ] Window closes after completion
- [ ] Main page refreshes and shows "Active"

### Authenticator App Tests
- [ ] Test with Google Authenticator
- [ ] Test with Authy
- [ ] Test with Microsoft Authenticator
- [ ] Test manual entry method

### Security Tests
- [ ] RLS policies prevent unauthorized access
- [ ] Attempts are logged
- [ ] Backup codes are hashed
- [ ] No sensitive data in console
- [ ] HTTPS enforced

### UI/UX Tests
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] All translations work
- [ ] Theme compatibility (light/dark)
- [ ] Loading states work
- [ ] Error messages are clear

### Browser Tests
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## 📋 Development Order (Recommended)

### Step 1: Database Setup (YOU)
1. Run all SQL scripts in Supabase SQL Editor
2. Verify tables exist and RLS works
3. Test with manual inserts

### Step 2: Edge Function (YOU)
1. Create Edge Function for TOTP verification
2. Deploy to Supabase
3. Test with Postman or curl

### Step 3: Setup Dependencies (YOU)
1. Choose NPM or CDN approach
2. Install/add required libraries

### Step 4: Component Files (AI/YOU)
1. Create locales and translations
2. Build main 2FA status component
3. Build setup page
4. Test each part as you build

### Step 5: Integration (AI/YOU)
1. Update component loader
2. Update security management
3. Test navigation flow

### Step 6: Testing (BOTH)
1. Test complete flow end-to-end
2. Test with different authenticator apps
3. Test edge cases and errors
4. Test security measures

### Step 7: Documentation (YOU)
1. Create user-facing help docs
2. Add inline code comments
3. Update main project README

---

## 🚨 Critical Points

### Don't Forget
- **Backup codes are essential** - Users MUST save them
- **Test with real authenticator apps** - Not just mock data
- **Security first** - Hash backup codes, log attempts, verify server-side
- **User experience** - Clear instructions, helpful errors, smooth flow
- **Translations** - All text must be translatable
- **Mobile responsive** - Many users will setup on mobile

### Common Pitfalls
- ❌ Forgetting to hash backup codes before storing
- ❌ Not handling window.opener communication correctly
- ❌ QR code not being scannable (too small/wrong format)
- ❌ Not testing with actual authenticator apps
- ❌ Missing RLS policies
- ❌ Not logging failed attempts
- ❌ Poor error messages
- ❌ Forgetting to refresh parent window after setup

---

## 📞 When Stuck

### Reference These Components
- `password-change/` - Form handling, validation, state management
- `username-edit/` - Inline editing pattern
- `avatar-upload/` - File handling (for download feature)
- `email-change/` - Multi-step flow

### Documentation
- See main README.md for detailed specs
- Check Supabase docs for database queries
- Check otpauth library docs for TOTP
- Check qrcode library docs for QR generation

---

## 📈 Progress Tracking

### Current Status: 🟡 Planning Complete, Ready for Development

**Database Setup**: ⬜ Not Started
**Edge Function**: ⬜ Not Started
**Dependencies**: ⬜ Not Started
**Component Files**: ⬜ Not Started
**Integration**: ⬜ Not Started
**Testing**: ⬜ Not Started
**Documentation**: ⬜ Not Started

### Update Status
Update these as you complete each phase:
- ⬜ Not Started
- 🟡 In Progress
- ✅ Complete
- ❌ Blocked

---

**Next Steps**: Start with Database Setup - Run SQL scripts in Supabase

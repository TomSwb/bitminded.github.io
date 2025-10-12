# 📧 Email Notifications Integration Guide

## Overview

This guide shows you how to integrate email notifications into your existing components using the Edge Function we just created.

---

## 🚀 Quick Start

### Step 1: Deploy the Edge Function

```bash
cd /home/tomswb/bitminded.github.io

# Deploy the send-notification-email function
supabase functions deploy send-notification-email

# Set environment variables (if using external email service later)
# supabase secrets set RESEND_API_KEY="your-key-here"
```

### Step 2: Include the Helper Script

Add this to any page that needs to send notifications (e.g., `account/index.html`):

```html
<!-- Add after supabase-config.js -->
<script src="/js/notification-helper.js"></script>
```

### Step 3: Send Notifications

In your component, trigger notifications like this:

```javascript
// After successful password change
await window.notificationHelper.passwordChanged();

// After email change
await window.notificationHelper.emailChanged(oldEmail, newEmail);

// After 2FA enabled
await window.notificationHelper.twoFAEnabled();
```

---

## 📦 Integration Examples

### Example 1: Password Change Component

**File:** `/account/components/security-management/password-change/password-change.js`

**Find this section** (around line 250-300):

```javascript
// After successful password update
const { error } = await supabase.auth.updateUser({
    password: this.newPasswordInput.value
});

if (error) throw error;

console.log('✅ Password Change: Password updated successfully');
this.showSuccess(this.getTranslation('Password updated successfully'));
```

**Add notification trigger after it:**

```javascript
// After successful password update
const { error } = await supabase.auth.updateUser({
    password: this.newPasswordInput.value
});

if (error) throw error;

console.log('✅ Password Change: Password updated successfully');
this.showSuccess(this.getTranslation('Password updated successfully'));

// 🔔 Send notification email
await window.notificationHelper.passwordChanged({
    device: this.getDeviceInfo(),
    location: 'Unknown' // You can integrate geolocation API later
});
```

---

### Example 2: Email Change Component

**File:** `/account/components/profile-management/email-change/email-change.js`

**Find the successful email update section:**

```javascript
// After email update successful
console.log('✅ Email Change: Email updated successfully');
this.showSuccess(this.getTranslation('Email updated successfully'));
```

**Add notification:**

```javascript
// After email update successful
const oldEmail = this.user.email; // Store before update
const newEmail = this.newEmailInput.value;

console.log('✅ Email Change: Email updated successfully');
this.showSuccess(this.getTranslation('Email updated successfully'));

// 🔔 Send notification to BOTH old and new email
await window.notificationHelper.emailChanged(oldEmail, newEmail);
```

---

### Example 3: 2FA Component

**File:** `/account/components/security-management/2fa/2fa.js`

**When 2FA is enabled:**

```javascript
// After 2FA successfully enabled
this.is2FAEnabled = true;
this.render();
this.showSuccess(this.getTranslation('Two-factor authentication enabled successfully'));

// 🔔 Send notification
await window.notificationHelper.twoFAEnabled();
```

**When 2FA is disabled:**

```javascript
// After 2FA successfully disabled
this.is2FAEnabled = false;
this.render();
this.showSuccess(this.getTranslation('Two-factor authentication disabled'));

// 🔔 Send notification
await window.notificationHelper.twoFADisabled();
```

---

### Example 4: Username Change Component

**File:** `/account/components/profile-management/username-edit/username-edit.js`

**After username update:**

```javascript
// After successful username update
const oldUsername = this.currentUsername;
const newUsername = this.newUsernameInput.value;

this.showSuccess(this.getTranslation('Username updated successfully'));

// 🔔 Send notification
await window.notificationHelper.usernameChanged(oldUsername, newUsername);
```

---

### Example 5: Login Activity (New Login Detection)

**File:** `/account/components/security-management/login-activity/login-activity.js`

**After recording new login:**

```javascript
// After inserting login activity record
const { error } = await supabase
    .from('user_login_activity')
    .insert({
        user_id: user.id,
        success: true,
        device: deviceInfo,
        location: locationInfo,
        ip_address: ipAddress
    });

if (!error) {
    // 🔔 Send new login notification
    await window.notificationHelper.newLogin({
        device: deviceInfo,
        location: locationInfo,
        ip: ipAddress,
        browser: window.notificationHelper.getBrowserInfo()
    });
}
```

---

## 🧪 Testing Guide

### Test 1: Check Edge Function Deployment

```bash
# List deployed functions
supabase functions list

# You should see: send-notification-email
```

### Test 2: Test from Browser Console

Open your account page and run:

```javascript
// Test password changed notification
await window.notificationHelper.passwordChanged({
    device: 'Chrome on MacOS',
    location: 'New York, USA'
});

// Check console for:
// ✅ Notification sent: password_changed
// or
// ⏭️ Notification skipped: User disabled security_alerts
```

### Test 3: Verify Preference Checking

```javascript
// Step 1: Enable security alerts
// Go to Notifications → Turn ON "Security Alerts" → Save

// Step 2: Test notification
await window.notificationHelper.passwordChanged();
// Should see: ✅ Notification sent

// Step 3: Disable security alerts
// Go to Notifications → Turn OFF "Security Alerts" → Save

// Step 4: Test again
await window.notificationHelper.passwordChanged();
// Should see: ⏭️ Notification skipped
```

### Test 4: Check Edge Function Logs

```bash
# View function logs in real-time
supabase functions logs send-notification-email --follow

# Try sending a notification and watch the logs
```

---

## 📧 Email Service Integration (Optional)

Right now, the Edge Function logs emails but doesn't actually send them. To send real emails:

### Option A: Resend (Recommended - Easy)

1. **Sign up:** https://resend.com (Free: 3,000 emails/month)
2. **Get API key:** Dashboard → API Keys → Create
3. **Set secret:**
   ```bash
   supabase secrets set RESEND_API_KEY="re_xxxxx"
   ```
4. **Update Edge Function** (uncomment the Resend code in `index.ts`):
   ```typescript
   // Around line 400 in send-notification-email/index.ts
   const resendApiKey = Deno.env.get('RESEND_API_KEY')
   const emailResponse = await fetch('https://api.resend.com/emails', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${resendApiKey}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       from: 'BitMinded <notifications@yourdomain.com>',
       to: emailData.to,
       subject: emailData.subject,
       html: emailData.html
     })
   })
   ```
5. **Redeploy:**
   ```bash
   supabase functions deploy send-notification-email
   ```

### Option B: SendGrid

```typescript
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: emailData.to }]
    }],
    from: { email: 'notifications@yourdomain.com', name: 'BitMinded' },
    subject: emailData.subject,
    content: [{ type: 'text/html', value: emailData.html }]
  })
})
```

### Option C: Mailgun, Postmark, AWS SES

Similar integration - check their API docs and update the Edge Function accordingly.

---

## 🔒 Security Best Practices

### 1. Email Content
- ✅ Never include sensitive data (passwords, tokens) in emails
- ✅ Use relative timestamps ("2 hours ago" vs exact time)
- ✅ Include action links (reset password, secure account)
- ✅ Add preference management link in footer

### 2. Rate Limiting
Add to Edge Function to prevent abuse:

```typescript
// Check how many emails sent to this user in last hour
const { count } = await supabase
  .from('email_log')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('sent_at', new Date(Date.now() - 3600000).toISOString())

if (count >= 10) {
  throw new Error('Too many emails sent. Please try again later.')
}
```

### 3. Email Logging
Track sent emails:

```sql
-- Create email log table
CREATE TABLE email_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    sent_to TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE
);
```

---

## 📊 Monitoring & Analytics

### Track Email Performance

```sql
-- Email sent by type (last 7 days)
SELECT 
    type,
    COUNT(*) as sent,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
FROM email_log
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY sent DESC;

-- Most active users (emails received)
SELECT 
    user_id,
    COUNT(*) as emails_received
FROM email_log
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY emails_received DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: Notification helper not defined

**Solution:** Add script tag to page:
```html
<script src="/js/notification-helper.js"></script>
```

### Issue: Edge Function not found

**Solution:** Deploy the function:
```bash
supabase functions deploy send-notification-email
```

### Issue: Notifications not sending

**Check:**
1. Edge Function deployed: `supabase functions list`
2. User authenticated: `await supabase.auth.getUser()`
3. Preferences allow it: Check `notification_preferences` in database
4. Console errors: Check browser console for errors

### Issue: Email template not rendering

**Debug:**
```javascript
// Test template locally
const template = EMAIL_TEMPLATES.password_changed;
console.log(template.html({ device: 'Test', location: 'Test' }));
```

---

## 📝 Complete Integration Checklist

### Setup
- [ ] Edge Function deployed
- [ ] Helper script included in page
- [ ] Email service configured (optional for now)

### Components Updated
- [ ] Password Change → `passwordChanged()`
- [ ] Email Change → `emailChanged()`
- [ ] 2FA Enable → `twoFAEnabled()`
- [ ] 2FA Disable → `twoFADisabled()`
- [ ] Username Change → `usernameChanged()`
- [ ] Login Activity → `newLogin()`

### Testing
- [ ] Test with preferences ON → Email sent
- [ ] Test with preferences OFF → Email skipped
- [ ] Check Edge Function logs
- [ ] Verify database updates
- [ ] Test all notification types

### Production
- [ ] Configure real email service
- [ ] Set up email logging
- [ ] Add rate limiting
- [ ] Monitor email delivery
- [ ] Set up alerts for failures

---

## 🎉 Next Steps

1. **Deploy Edge Function** (5 min)
2. **Add helper script** to account page (2 min)
3. **Update one component** (password-change) to test (5 min)
4. **Test end-to-end** with preferences ON/OFF (10 min)
5. **Update remaining components** (30 min)
6. **(Optional) Integrate email service** (15 min)

---

## 💡 Tips

- Start with **password change** - easiest to test
- Use **console.log** to see notification status
- Test with **preferences OFF** to verify skipping works
- **Edge Function logs** show exactly what's happening
- You can send test emails from browser console

---

**Questions or issues?** Check the Edge Function logs first:
```bash
supabase functions logs send-notification-email --follow
```

Good luck! 🚀


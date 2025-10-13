# Account Deletion Component

Complete account deletion system with 30-day grace period and cancellation capability.

## 🎯 Features

- **Password Confirmation:** Users must verify password before deletion
- **30-Day Grace Period:** Accounts scheduled for deletion 30 days later
- **Cancellation:** Users can cancel anytime via account page or email link
- **Multi-Language:** Email notifications in 4 languages (en, fr, de, es)
- **Ethical Preservation:** App entitlements are never deleted
- **Automated Processing:** Daily cron job processes expired deletions
- **Full Audit Trail:** Complete deletion history in database

## 📁 Files

### Frontend
- `delete-account.html` - Component markup
- `delete-account.css` - Component styles
- `delete-account.js` - Component logic
- `delete-account-translations.js` - Translation loader
- `locales/delete-account-locales.json` - Translations (en, fr, de, es)

### Backend (Supabase)
- `supabase/migrations/20241013_create_account_deletion_system.sql` - Database setup
- `supabase/migrations/20241013_setup_deletion_cron.sql` - Cron job setup
- `supabase/functions/send-deletion-email/` - Email notifications
- `supabase/functions/schedule-account-deletion/` - Request deletion
- `supabase/functions/cancel-account-deletion/` - Cancel deletion
- `supabase/functions/process-account-deletions/` - Automated processing

## 🔄 User Flow

### Request Deletion
1. User clicks "Delete My Account"
2. Enters password for verification
3. System creates deletion request (scheduled +30 days)
4. Email sent with cancellation link
5. In-app notification created
6. UI shows countdown and cancel button

### Cancellation
**Via Account Page:**
1. User sees warning with days remaining
2. Clicks "Cancel Deletion & Keep Account"
3. Deletion cancelled immediately
4. Confirmation email sent

**Via Email Link:**
1. User clicks "Cancel Deletion" in email
2. Redirected to account page
3. Deletion cancelled automatically
4. Confirmation shown

### Automated Processing
1. Cron job runs daily at midnight UTC
2. Finds accounts past grace period
3. Soft deletes user data
4. Preserves app entitlements
5. Deletes auth user
6. Sends final confirmation email

## 🗄️ Database Tables

### `account_deletion_requests`
Tracks deletion requests with status and timestamps.

**Columns:**
- `user_id` - User requesting deletion (UNIQUE)
- `requested_at` - When deletion was requested
- `scheduled_for` - When deletion will occur (+30 days)
- `status` - scheduled | cancelled | processing | completed
- `cancellation_token` - UUID for email link cancellation
- `cancelled_at` - When user cancelled (if applicable)
- `processed_at` - When deletion was completed

### Modified Tables
Soft-delete columns added to:
- `user_profiles` - deletion_requested_at, deletion_scheduled_for, deleted_at
- `user_preferences` - deleted_at
- `user_notifications` - deleted_at
- `login_activity` - deleted_at
- `user_2fa` - deleted_at
- `user_sessions` - deleted_at

**Note:** `entitlements` table is never touched (ethical commitment)

## 🔐 Security

- **RLS Policies:** Users can only access their own deletion requests
- **Password Verification:** Required before scheduling deletion
- **Service Role:** Only cron jobs use service role key (server-side)
- **Cancellation Tokens:** Unique UUID for each deletion request
- **Audit Trail:** All actions logged with timestamps

## 📧 Email Notifications

**4 Email Types:**
1. **Deletion Scheduled** - Sent when user requests deletion
   - Shows scheduled date
   - Lists what will be deleted
   - Prominent cancel button
   - Available in en, fr, de, es

2. **Deletion Reminder** - Sent 7 days before (optional)
   - Final warning
   - Cancel link included

3. **Deletion Cancelled** - Sent when user cancels
   - Welcome back message
   - Confirms account is safe

4. **Deletion Completed** - Sent after deletion
   - Final confirmation
   - Reminds about preserved entitlements

**Email Service:** Resend API  
**From Address:** `BitMinded <notifications@bitminded.ch>`

## ⚙️ Configuration

### Grace Period
Default: 30 days  
To change: Edit `supabase/functions/schedule-account-deletion/index.ts` line 87
```typescript
scheduledFor.setDate(scheduledFor.getDate() + 30); // Change 30 to desired days
```

### Cron Schedule
Default: Daily at midnight UTC  
To change: Edit `supabase/migrations/20241013_setup_deletion_cron.sql` line 27
```sql
'0 0 * * *'  -- Current: Daily at midnight UTC
'0 2 * * *'  -- Example: Daily at 2 AM UTC
```

## 🧪 Testing

### Check Pending Deletions
```sql
SELECT * FROM account_deletion_requests WHERE status = 'scheduled';
```

### Check Your Deletion Status
```sql
SELECT * FROM account_deletion_requests WHERE user_id = auth.uid();
```

### Check Cron Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'process-account-deletions';
```

### Manual Test Processing
```sql
-- Make deletion ready for immediate processing (test account only!)
UPDATE account_deletion_requests
SET scheduled_for = NOW() - INTERVAL '1 hour'
WHERE user_id = 'test_user_id';
```

## 📊 Monitoring

### Cron Job Logs
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-account-deletions')
ORDER BY start_time DESC LIMIT 10;
```

### Deletion Statistics
```sql
SELECT status, COUNT(*) 
FROM account_deletion_requests 
GROUP BY status;
```

## 🚀 Deployment Status

✅ Database tables created  
✅ Edge functions deployed  
✅ Cron jobs scheduled  
✅ Frontend integrated  
✅ Email system configured  
✅ Production ready

---

**Created:** October 13, 2025  
**Status:** Production Ready ✨  
**Version:** 1.0


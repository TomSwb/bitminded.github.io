# Communication Center Component Specification

## Overview
Centralized communication hub for admin-to-user messaging, announcements, email campaigns, and notification management.

## Responsibilities
- Send emails to individual users or groups
- Create and send system announcements
- Manage email templates
- Send automated notifications
- Track email delivery and opens
- Manage communication preferences
- Create email campaigns

## UI Components

### Header Section
- Title: "Communication Center"
- **New Email** button
- **New Announcement** button
- **Email Templates** button
- **Campaign Stats** button

### Tab Navigation
1. **Compose** - Create new messages
2. **Templates** - Manage email templates
3. **Announcements** - System-wide announcements
4. **History** - Sent messages history
5. **Analytics** - Email performance metrics

## Tab 1: Compose Email

### Email Composer

**Recipient Selection**:
- **Single User**: Search and select user
- **Multiple Users**: Select multiple
- **User Segment**: 
  - All users
  - Active subscribers
  - Trial users
  - Inactive users
  - By product (all converter users)
  - Custom SQL filter (advanced)

**Email Form**:
- **From Name**: Admin name or "BitMinded Team"
- **From Email**: Display (actual from will be system email)
- **Reply-To**: Admin email or support email
- **Subject Line**: Text field (with variable support)
- **Preview Text**: First line shown in inbox
- **Email Body**: 
  - Rich text editor
  - HTML editor toggle
  - Variable insertion ({{username}}, {{product}}, etc.)
  - Image upload
  - Link insertion
  - Emoji picker

**Personalization Variables**:
- {{username}} - User's username
- {{email}} - User's email
- {{product}} - Product name
- {{expiration_date}} - Subscription expiration
- {{trial_days_remaining}} - Trial countdown
- Custom variables from user profile

**Preview & Test**:
- Live preview panel
- Mobile preview
- Test email button (send to self)
- Spam score check

**Schedule**:
- ○ Send now
- ○ Schedule for later (date/time picker)
- ○ Send in user's timezone

**Actions**:
- **Save as Draft**
- **Save as Template**
- **Send Email**

## Tab 2: Email Templates

### Template Library

**Template Categories**:
- Welcome emails
- Access granted
- Subscription notifications
- Trial reminders
- Account actions
- Support responses
- Marketing campaigns

**Each Template Shows**:
- Template name
- Category
- Preview thumbnail
- Last used date
- Usage count
- **Actions**: Edit, Duplicate, Delete, Use

### Template Editor

**Template Form**:
- Template name
- Category
- Subject line template
- Body template (with variables)
- Default recipients (optional)
- **Save Template**

**Predefined Templates** (examples):
1. **Welcome Email**
   - Subject: "Welcome to BitMinded, {{username}}!"
   - Intro to platform
   - Next steps

2. **Access Granted**
   - Subject: "You now have access to {{product}}"
   - Access details
   - How to use

3. **Trial Ending**
   - Subject: "Your {{product}} trial ends in {{days_remaining}} days"
   - Upgrade CTA
   - Value reminder

4. **Subscription Cancelled**
   - Subject: "We're sorry to see you go"
   - Cancellation confirmation
   - Feedback request
   - Re-activation offer

## Tab 3: Announcements

### System Announcements

**Announcement Types**:
- **In-app Banner**: Shows at top of app
- **In-app Modal**: Popup notification
- **Email**: Sent via email
- **Both**: In-app + email

**Create Announcement**:
- **Title**: Short headline
- **Message**: Full content (rich text)
- **Type**: Info / Warning / Success / Error
- **Target Users**: 
  - All users
  - Logged in users only
  - Specific segments
- **Display Settings**:
  - Show once or persistent
  - Dismissible or not
  - Start date/time
  - End date/time (auto-hide)
- **CTA Button** (optional):
  - Button text
  - Button link
  - Button color

**Active Announcements List**:
- Title and preview
- Type badge
- Target audience
- Start/end dates
- Views count
- Clicks count
- **Actions**: Edit, Disable, View Analytics

### Announcement Analytics
- Total views
- Unique views
- Click-through rate
- Dismiss rate
- Time to dismiss

## Tab 4: Communication History

### Sent Messages Table

**Columns**:
1. **Date/Time** (sent)
2. **Subject Line**
3. **Recipients** (count or names)
4. **Type** (email, announcement, notification)
5. **Status** (sent, scheduled, failed)
6. **Sent By** (admin name)
7. **Delivery Rate** (% delivered)
8. **Open Rate** (% opened)
9. **Actions** (View, Resend, Analytics)

**Filters**:
- Date range
- Message type
- Sent by (admin)
- Status
- Recipient segment

### Message Detail View
- Full message content
- Recipient list
- Delivery status per recipient
- Open/click tracking
- Bounces and failures
- **Resend to Failed** button
- **Send Again** button (to different users)

## Tab 5: Communication Analytics

### Email Performance Metrics

**Key Metrics**:
- Total emails sent
- Delivery rate (%)
- Open rate (%)
- Click-through rate (%)
- Bounce rate (%)
- Unsubscribe rate (%)

**Charts**:
1. **Email Volume Over Time** (line chart)
2. **Performance Comparison** (bar chart)
   - Compare templates
   - Compare campaigns
3. **Best Performing Emails** (table)
   - By open rate
   - By click rate
   - By conversion

**Per-Template Analytics**:
- Usage count
- Average open rate
- Average click rate
- Conversion rate (if trackable)

### Engagement Tracking
- Time of day best for opens
- Day of week analysis
- Subject line A/B test results
- Content length impact

## Functionality

### Send Email
```javascript
async sendEmail(recipients, subject, body, options) {
    // 1. Validate recipients and content
    // 2. Personalize content for each recipient
    //    - Replace variables ({{username}}, etc.)
    // 3. Send via email service (Supabase, SendGrid, etc.)
    // 4. Track sending status
    // 5. Log email in history
    // 6. Update analytics
    // 7. Handle failures and retries
}
```

### Personalize Content
```javascript
personalizeContent(template, userData) {
    let content = template;
    
    // Replace all variables
    content = content.replace(/\{\{username\}\}/g, userData.username);
    content = content.replace(/\{\{email\}\}/g, userData.email);
    content = content.replace(/\{\{product\}\}/g, userData.product);
    // ... more replacements
    
    return content;
}
```

### Create Announcement
```javascript
async createAnnouncement(announcementData) {
    // 1. Validate announcement data
    // 2. Save to database
    // 3. Determine target users
    // 4. Send email if type includes email
    // 5. Create in-app notifications if type includes in-app
    // 6. Schedule start/end if specified
    // 7. Log announcement creation
}
```

### Track Email Opens
```javascript
async trackEmailOpen(emailId, userId) {
    // 1. Record open event
    // 2. Update email analytics
    // 3. Only count first open as "unique"
    // 4. Store timestamp
    
    await supabase
        .from('email_tracking')
        .insert({
            email_id: emailId,
            user_id: userId,
            event_type: 'open',
            timestamp: new Date()
        });
}
```

### Schedule Email
```javascript
async scheduleEmail(emailData, scheduledTime, timezone) {
    // 1. Save email as scheduled
    // 2. Set trigger time (consider timezone)
    // 3. Use cron job or scheduled function to send
    // 4. Update status to "scheduled"
    
    // When time arrives:
    // 5. Send email
    // 6. Update status to "sent"
    // 7. Log delivery
}
```

## Database Schema

### Email History Table
```sql
CREATE TABLE email_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sent_by UUID REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient_type TEXT, -- 'single', 'multiple', 'segment'
    recipient_ids UUID[],
    recipient_count INTEGER,
    template_id UUID,
    sent_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP,
    status TEXT DEFAULT 'sent', -- scheduled, sent, failed
    delivery_rate DECIMAL,
    open_rate DECIMAL,
    click_rate DECIMAL
);
```

### Email Tracking Table
```sql
CREATE TABLE email_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_id UUID REFERENCES email_history(id),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- open, click, bounce, unsubscribe
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### Announcements Table
```sql
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    announcement_type TEXT NOT NULL, -- info, warning, success, error
    display_type TEXT NOT NULL, -- banner, modal, email, both
    target_users TEXT, -- all, logged_in, segment_id
    is_dismissible BOOLEAN DEFAULT true,
    show_once BOOLEAN DEFAULT false,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    cta_text TEXT,
    cta_link TEXT,
    is_active BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Email Templates Table
```sql
CREATE TABLE email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables TEXT[], -- list of variables used
    created_by UUID REFERENCES auth.users(id),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Email Service Integration

### Resend Integration ✅ PRIMARY EMAIL SERVICE

**Existing Implementation** (already working in 3+ Edge Functions):
```typescript
// Pattern used in: send-notification-email, send-support-request, send-deletion-email

const resendApiKey = Deno.env.get('RESEND_API_KEY')

if (!resendApiKey) {
  throw new Error('Email service not configured')
}

const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'BitMinded <admin@bitminded.ch>',
    to: userEmail,
    subject: emailSubject,
    html: emailHtml
  })
})

const emailResult = await emailResponse.json()

if (!emailResponse.ok) {
  throw new Error(`Failed to send email: ${emailResult.message}`)
}

console.log('✅ Email sent successfully via Resend')
console.log('📬 Email ID:', emailResult.id)
```

**For Admin Panel - Reuse Same Pattern**:
```typescript
// Admin email function will use the same Resend API pattern
async function sendAdminEmail(to, subject, html, options = {}) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: options.from || 'BitMinded <admin@bitminded.ch>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            reply_to: options.replyTo || 'support@bitminded.ch'
        })
    })
    
    const result = await emailResponse.json()
    
    if (!emailResponse.ok) {
        throw new Error(`Resend API error: ${result.message}`)
    }
    
    return { success: true, emailId: result.id }
}
```

**Email Tracking with Resend**:
- Resend provides built-in tracking via dashboard
- Access email status via Resend API
- Webhook events for delivery, opens, clicks (optional)

**Webhook Integration** (optional - for Phase 3):
```typescript
// Edge Function: /functions/resend-webhook
serve(async (req) => {
    const event = await req.json()
    
    switch (event.type) {
        case 'email.delivered':
            await trackEmailDelivered(event.data)
            break
        case 'email.opened':
            await trackEmailOpen(event.data)
            break
        case 'email.clicked':
            await trackEmailClick(event.data)
            break
        case 'email.bounced':
            await handleEmailBounce(event.data)
            break
    }
    
    return new Response('OK')
})
```

**Resend Features Used**:
- ✅ Transactional emails (access grants, notifications)
- ✅ Marketing emails (announcements, campaigns)
- ✅ Email templates (stored locally in database)
- ✅ Direct API integration (no SDK needed)
- ✅ Domain verification (bitminded.ch - already done)
- ✅ RESEND_API_KEY (already configured in Supabase)

## API Methods

```javascript
class CommunicationCenter {
    async init()
    async sendEmail(recipients, subject, body, options)
    async scheduleEmail(emailData, scheduledTime, timezone)
    async sendToSegment(segment, subject, body)
    async createTemplate(templateData)
    async loadTemplates()
    async useTemplate(templateId, customData)
    async createAnnouncement(announcementData)
    async loadAnnouncements()
    async updateAnnouncement(announcementId, updates)
    async loadEmailHistory(filters)
    async getEmailAnalytics(emailId)
    async trackEmailEvent(emailId, userId, eventType)
    async resendEmail(emailId, newRecipients)
    async exportEmailList(filters)
    personalizeContent(template, userData)
    validateEmail(emailData)
}
```

## Translations Keys
- `communication_center`: "Communication Center"
- `compose`: "Compose"
- `templates`: "Templates"
- `announcements`: "Announcements"
- `history`: "History"
- `analytics`: "Analytics"
- `new_email`: "New Email"
- `new_announcement`: "New Announcement"
- `recipients`: "Recipients"
- `subject`: "Subject"
- `message`: "Message"
- `send_now`: "Send Now"
- `schedule`: "Schedule"
- `save_draft`: "Save as Draft"
- `save_template`: "Save as Template"
- `preview`: "Preview"
- `test_email`: "Send Test Email"
- `delivery_rate`: "Delivery Rate"
- `open_rate`: "Open Rate"
- `click_rate`: "Click Rate"
- `sent_by`: "Sent By"

## Styling Requirements
- Rich text editor with formatting tools
- Email preview panel (desktop + mobile)
- Template cards with previews
- Color-coded announcement types
- Responsive email composer
- Analytics charts
- Loading states

## Dependencies
- **Resend API** (direct fetch) ✅ ALREADY WORKING - Email service
- Rich text editor (Quill, TinyMCE, or Tiptap)
- Chart library for email analytics
- Supabase client (database and real-time)
- Translation system (i18next)
- Admin layout component
- Date/time picker (for scheduling)
- Existing Edge Functions pattern (reuse send-notification-email approach)

## Security Considerations
- Validate email content (XSS prevention)
- Rate limit email sending
- Require admin verification for mass emails
- Log all communications
- Sanitize HTML content
- Protect against email injection
- Verify unsubscribe links

## Performance Considerations
- Queue large email sends
- Batch email processing
- Cache templates
- Optimize recipient queries
- Lazy load email history
- Index email_tracking table

## Testing Checklist
- [ ] Send single email works
- [ ] Send to multiple users works
- [ ] Send to segment works
- [ ] Personalization works
- [ ] Templates save and load
- [ ] Scheduled emails send correctly
- [ ] Announcements display correctly
- [ ] Email tracking works
- [ ] Analytics calculate correctly
- [ ] Resend functionality works
- [ ] Mobile email preview accurate
- [ ] All actions logged

## Implementation Priority
**Phase 3** - Communication and engagement

## Future Enhancements
- A/B testing for subject lines
- Automated drip campaigns
- Behavioral email triggers
- SMS notifications
- Push notifications (web push)
- Multi-language email templates
- Email deliverability monitoring
- Spam score checking
- Link shortening and tracking
- Email list segmentation builder
- WYSIWYG email builder with drag-and-drop
- Integration with marketing tools (Mailchimp, etc.)


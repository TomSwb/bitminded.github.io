# User Communication System

## Overview
This system allows admins to send both in-app notifications and emails to users through a unified interface. It provides language-aware messaging with customizable signatures and comprehensive activity tracking.

## Folder Structure

```
admin/components/user-detail/components/user-communication/
├── README.md
├── email/                          # Email-specific components
│   ├── email-composition.css
│   ├── email-composition.js
│   ├── email-composition.html
│   ├── email-composition-locales.json
│   └── email-composition-translations.js
├── notification/                   # Notification-specific components
│   ├── notification-composition.css
│   ├── notification-composition.js
│   ├── notification-composition.html
│   ├── notification-composition-locales.json
│   └── notification-composition-translations.js
└── shared/                         # Shared components
    ├── message-composition.css
    ├── message-composition.js
    ├── signature-selector.css
    ├── signature-selector.js
    ├── language-detector.js
    └── shared-locales.json
```

## Architecture

### Database Tables

#### `user_communications`
Tracks all communications sent to users (notifications + emails)
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- admin_id: UUID (references auth.users) 
- type: TEXT ('notification' | 'email')
- subject: TEXT
- body: TEXT
- signature_used: TEXT
- language_used: TEXT
- sent_at: TIMESTAMP
- delivered_at: TIMESTAMP
- status: TEXT ('sent' | 'delivered' | 'failed')
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `communication_signatures`
Stores admin signature preferences
```sql
- id: UUID (primary key)
- admin_id: UUID (references auth.users)
- name: TEXT (e.g., "Dev Team", "Support Team")
- content: TEXT (signature text)
- is_default: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `user_profiles` (enhancement)
Add language preference field
```sql
- language: TEXT (e.g., 'en', 'es', 'fr', 'de') DEFAULT 'en'
```

### Edge Functions

#### `send-notification`
- Sends in-app notifications to users
- Stores notification in database
- Updates user's notification center

#### `send-email`
- Sends emails via Resend service
- Stores email record in database
- Handles delivery tracking

## Implementation Steps

### Step 1: Database Schema & Edge Functions
- [ ] Create `user_communications` table
- [ ] Create `communication_signatures` table
- [ ] Add `language` field to `user_profiles`
- [ ] Create `send-notification` edge function
- [ ] Create `send-email` edge function

### Step 2: UI Changes
- [ ] Rename "Send Email" button to "Contact User"
- [ ] Create message composition page
- [ ] Add language indicator flag
- [ ] Add signature selection dropdown

### Step 3: Message Composition
- [ ] Language-aware greeting ("Dear Username")
- [ ] Custom message body editor
- [ ] Signature selection
- [ ] Send notification vs email buttons

### Step 4: Activity Integration
- [ ] Add "Communications" tab to user details
- [ ] Show all sent messages with timestamps
- [ ] Message preview and delivery status

## Features

### Language Support
- **User Language Detection**: Fetches from `user_profiles.language`
- **UI Language Indicator**: Shows target language flag
- **Translated Greetings**: "Dear Username" in user's language
- **Fallback**: Defaults to English if no language set

### Signature System
- **Predefined Options**: Dev/Contact/Support/Legal Team
- **Custom Signatures**: Admins can create their own
- **Default Signature**: Set per admin preference
- **Quick Selection**: Dropdown in composition UI

### Message Types
- **Notifications**: In-app messages, instant delivery
- **Emails**: External emails via Resend, delivery tracking
- **Unified Interface**: Same composition for both types

### Activity Tracking
- **Communication Log**: All sent messages tracked
- **Delivery Status**: Sent/delivered/failed states
- **Message Preview**: Subject and body preview
- **Audit Trail**: Complete communication history

## Technical Notes

### Translation Handling
- **No Modals**: Uses dedicated pages to avoid translation issues
- **Language Flags**: Visual indicators for target language
- **Dynamic Greetings**: Translated based on user preference

### Error Handling
- **Edge Function Failures**: Graceful error handling
- **Delivery Tracking**: Status updates for email delivery
- **Retry Logic**: Failed sends can be retried

### Security
- **Admin Only**: Only admins can send communications
- **User Verification**: Ensures user exists before sending
- **Rate Limiting**: Prevents spam (future enhancement)

## Future Enhancements
- **Bulk Communications**: Mass email/notification system
- **Templates**: Predefined message templates
- **Scheduling**: Send messages at specific times
- **Analytics**: Communication effectiveness tracking

# 🔔 Notifications & Preferences System - Complete Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Phase 1: Email Notifications (MVP)](#phase-1-email-notifications-mvp)
3. [Phase 2: In-App Notifications](#phase-2-in-app-notifications)
4. [Phase 3: Push Notifications](#phase-3-push-notifications)
5. [Database Schema](#database-schema)
6. [Component Structure](#component-structure)
7. [Translation Keys](#translation-keys)
8. [Testing Checklist](#testing-checklist)

---

## Overview

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                 Notification System                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Phase 1: Email (Security & Account)                │
│  Phase 2: In-App (Products & Updates)               │
│  Phase 3: Push (Urgent & Real-time)                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Current Status
- **Profile Management**: ✅ Complete
- **Security Management**: ✅ Complete (Password, 2FA, Login Activity)
- **Notifications System**: ❌ To be implemented

### Target Completion Time
- **Phase 1**: 2-3 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 6-8 hours
- **Total**: 12-17 hours

---

## Phase 1: Email Notifications (MVP)

### 🎯 Goal
Implement basic email notification preferences for security and account alerts.

### ✨ Features
- Toggle for email notifications ON/OFF
- Security alerts (new login, password change, 2FA changes)
- Account updates (email change, username change)
- Simple, clean UI
- No external dependencies (uses Supabase)

### 📊 Database Updates

#### Option A: Use Existing Column (Recommended)
```sql
-- user_preferences table ALREADY has:
-- email_notifications BOOLEAN DEFAULT TRUE

-- Just use this column for now
-- Future: Add granular preferences
```

#### Option B: Add Granular Preferences (Future)
```sql
-- Add to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "security_alerts": true,
    "account_updates": true,
    "marketing": false
  }
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.user_preferences.notification_preferences 
IS 'Granular notification preferences per channel and type';
```

### 🎨 UI Component

**File Structure:**
```
account/components/notifications-preferences/
├── notifications-preferences.html
├── notifications-preferences.css
├── notifications-preferences.js
├── notifications-preferences-translations.js
├── locales/
│   └── notifications-preferences-locales.json
└── NOTIFICATIONS-IMPLEMENTATION-GUIDE.md (this file)
```

**Component Layout:**
```
┌───────────────────────────────────────────────┐
│ Notifications & Preferences                   │
├───────────────────────────────────────────────┤
│                                               │
│ Account Preferences                           │
│ • Language: English (Change in settings)      │
│ • Theme: Dark Mode (Change in settings)       │
│                                               │
│ Email Notifications                           │
│ ☑ Security Alerts                            │
│   New logins, password changes, 2FA updates   │
│                                               │
│ ☑ Account Updates                            │
│   Email changes, username updates             │
│                                               │
│ [Save Preferences]                            │
│                                               │
│ ℹ️ In-app and push notifications coming soon!│
│                                               │
└───────────────────────────────────────────────┘
```

### 📧 Email Triggers

**What sends emails:**
1. **New Login** (From Login Activity)
   - Triggered when: `user_login_activity` record created with success=true
   - Email: "New login detected from [device] in [location]"
   - Link: View login activity

2. **Password Changed** (From Password Change)
   - Triggered when: Password updated via password-change component
   - Email: "Your password was changed"
   - Link: If not you, reset password

3. **Email Changed** (From Profile Management)
   - Triggered when: Email updated via email-change component
   - Email sent to: BOTH old and new email
   - Link: Revert change (if not you)

4. **2FA Enabled/Disabled** (From 2FA Management)
   - Triggered when: 2FA status changes in `user_2fa` table
   - Email: "Two-factor authentication has been [enabled/disabled]"
   - Link: Manage 2FA settings

5. **Username Changed** (From Profile Management)
   - Triggered when: Username updated
   - Email: "Your username was changed to [new username]"
   - Link: View profile

### 🔧 Implementation Steps

#### Step 1: Create Preferences UI Component
```javascript
// notifications-preferences.js
class NotificationsPreferences {
    constructor() {
        this.isInitialized = false;
        this.preferences = null;
    }

    async init() {
        await this.loadPreferences();
        this.setupEventListeners();
        this.render();
    }

    async loadPreferences() {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('email_notifications')
            .eq('user_id', user.id)
            .single();
        
        this.preferences = data;
    }

    async savePreferences() {
        const { error } = await supabase
            .from('user_preferences')
            .update({
                email_notifications: this.preferences.email_notifications
            })
            .eq('user_id', user.id);
    }
}
```

#### Step 2: Integrate with Component Loader
```javascript
// Add to component-loader.js
else if (componentName === 'notifications-preferences') {
    // Similar to other security components
}
```

#### Step 3: Add Email Sending Logic (Optional for MVP)
```typescript
// supabase/functions/send-notification-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    const { userId, type, data } = await req.json()
    
    // Check if user has email notifications enabled
    const { data: prefs } = await supabase
        .from('user_preferences')
        .select('email_notifications')
        .eq('user_id', userId)
        .single()
    
    if (!prefs?.email_notifications) {
        return new Response('Notifications disabled', { status: 200 })
    }
    
    // Send email via Supabase Auth or custom service
    // Implementation depends on email provider
})
```

### 📝 Translation Keys

```json
{
  "en": {
    "Notifications & Preferences": "Notifications & Preferences",
    "Account Preferences": "Account Preferences",
    "Language:": "Language:",
    "Theme:": "Theme:",
    "Change in settings": "Change in settings",
    "Email Notifications": "Email Notifications",
    "Security Alerts": "Security Alerts",
    "New logins, password changes, 2FA updates": "New logins, password changes, 2FA updates",
    "Account Updates": "Account Updates",
    "Email changes, username updates": "Email changes, username updates",
    "Save Preferences": "Save Preferences",
    "Preferences saved successfully": "Preferences saved successfully",
    "Failed to save preferences": "Failed to save preferences",
    "In-app and push notifications coming soon!": "In-app and push notifications coming soon!"
  }
}
```

---

## Phase 2: In-App Notifications

### 🎯 Goal
Implement notification center with bell icon for product updates, announcements, and user activity.

### ✨ Features
- Bell icon in navigation with unread badge
- Dropdown notification list
- Mark as read/unread
- Delete notifications
- Notification categories
- Persistence in database

### 📊 Database Schema

```sql
-- Create notifications table
CREATE TABLE public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'security', 'account', 'product', 'announcement', 'commission'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Optional link for action
    icon TEXT, -- Emoji or icon name
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- Auto-delete after date
);

-- Add indexes
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX idx_user_notifications_created ON public.user_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" 
ON public.user_notifications
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON public.user_notifications
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
ON public.user_notifications
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow system to insert (for server-side notifications)
CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications
FOR INSERT 
WITH CHECK (true);

-- Helper function: Get unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_notifications 
        WHERE user_id = user_uuid 
        AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Mark all as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.user_notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = user_uuid AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function: Delete old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_notifications
    WHERE (
        expires_at IS NOT NULL AND expires_at < NOW()
    ) OR (
        created_at < (NOW() - INTERVAL '1 day' * days_to_keep)
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
```

### 🎨 UI Components

**File Structure:**
```
components/notification-center/
├── notification-center.html       (Bell icon + dropdown)
├── notification-center.css
├── notification-center.js
├── locales/
│   └── notification-center-locales.json
└── README.md
```

**Component Layout:**
```
Navigation Bar:
┌────────────────────────────────┐
│ [Logo] [Menu]        [🔔 (3)] │
└────────────────────────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │ Notifications       [×] │
            ├─────────────────────────┤
            │ 🔒 New login detected   │
            │    2 hours ago          │
            ├─────────────────────────┤
            │ ✅ Email verified       │
            │    Yesterday            │
            ├─────────────────────────┤
            │ 🎉 Welcome to BitMinded │
            │    2 days ago           │
            ├─────────────────────────┤
            │ [Mark all as read]      │
            │ [View all →]            │
            └─────────────────────────┘
```

### 🔧 Notification Center Component

```javascript
// notification-center.js
class NotificationCenter {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
    }

    async init() {
        await this.loadNotifications();
        this.render();
        this.setupEventListeners();
        this.startPolling(); // Poll every 30 seconds
    }

    async loadNotifications() {
        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        this.notifications = data || [];
        this.updateUnreadCount();
    }

    async markAsRead(notificationId) {
        await supabase
            .from('user_notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);
    }

    async markAllAsRead() {
        await supabase.rpc('mark_all_notifications_read');
        await this.loadNotifications();
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        setInterval(() => this.loadNotifications(), 30000);
    }
}
```

### 📧 Notification Types

```javascript
const NOTIFICATION_TYPES = {
    // Security
    NEW_LOGIN: {
        type: 'security',
        icon: '🔒',
        color: 'warning',
        title: 'New login detected'
    },
    PASSWORD_CHANGED: {
        type: 'security',
        icon: '🔐',
        color: 'error',
        title: 'Password changed'
    },
    TWO_FA_ENABLED: {
        type: 'security',
        icon: '🛡️',
        color: 'success',
        title: '2FA enabled'
    },
    
    // Account
    EMAIL_VERIFIED: {
        type: 'account',
        icon: '✅',
        color: 'success',
        title: 'Email verified'
    },
    EMAIL_CHANGED: {
        type: 'account',
        icon: '📧',
        color: 'info',
        title: 'Email updated'
    },
    
    // Products (Future)
    NEW_APP_AVAILABLE: {
        type: 'product',
        icon: '🎉',
        color: 'primary',
        title: 'New app available'
    },
    PURCHASE_COMPLETE: {
        type: 'product',
        icon: '🛍️',
        color: 'success',
        title: 'Purchase complete'
    },
    
    // Announcements
    SYSTEM_ANNOUNCEMENT: {
        type: 'announcement',
        icon: '📢',
        color: 'info',
        title: 'Announcement'
    }
};
```

### 🔄 Real-time Updates (Optional Enhancement)

```javascript
// Use Supabase Realtime for instant notifications
const subscription = supabase
    .channel('notifications')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
        },
        (payload) => {
            this.addNotification(payload.new);
            this.showToast(payload.new);
        }
    )
    .subscribe();
```

---

## Phase 3: Push Notifications

### 🎯 Goal
Implement browser push notifications for urgent/real-time alerts.

### ⚠️ Prerequisites
- **HTTPS**: Required for Service Workers
- **User Permission**: Must request browser permission
- **Browser Support**: Chrome, Firefox, Edge (Safari limited)
- **Maintenance**: Ongoing management of VAPID keys

### ✨ Features
- Browser push permission request
- Service Worker for background notifications
- VAPID keys for secure communication
- Preference toggles for push types
- Fallback to email if permission denied

### 📊 Database Updates

```sql
-- Add to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_subscription JSONB; -- Stores push subscription data

-- Add comment
COMMENT ON COLUMN public.user_preferences.push_subscription 
IS 'Web Push API subscription object including endpoint and keys';
```

### 🔧 Service Worker Setup

**File: `/service-worker.js`** (at root)
```javascript
// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
    const data = event.data.json();
    
    const options = {
        body: data.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data.tag || 'notification',
        data: {
            url: data.url || '/',
            notificationId: data.id
        },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
```

### 🔐 VAPID Keys Generation

```bash
# Install web-push library
npm install web-push -g

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BEL...
# Private Key: abc...
```

**Store in Supabase Edge Function Environment:**
```bash
supabase secrets set VAPID_PUBLIC_KEY="your-public-key"
supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
supabase secrets set VAPID_EMAIL="your-email@example.com"
```

### 💻 Client-Side Implementation

```javascript
// notifications-preferences.js - Push section
class NotificationsPreferences {
    async requestPushPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return;
        }
        
        if (!('serviceWorker' in navigator)) {
            alert('This browser does not support push notifications');
            return;
        }
        
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            await this.subscribeToPush();
        } else {
            console.log('Push notification permission denied');
        }
    }
    
    async subscribeToPush() {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        // Save subscription to database
        await supabase
            .from('user_preferences')
            .update({
                push_notifications: true,
                push_subscription: subscription.toJSON()
            })
            .eq('user_id', user.id);
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}
```

### 📤 Server-Side Push Sending

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push'

serve(async (req) => {
    const { userId, notification } = await req.json()
    
    // Get user's push subscription
    const { data: prefs } = await supabase
        .from('user_preferences')
        .select('push_notifications, push_subscription')
        .eq('user_id', userId)
        .single()
    
    if (!prefs?.push_notifications || !prefs?.push_subscription) {
        return new Response('Push not enabled', { status: 200 })
    }
    
    // Configure VAPID
    webpush.setVapidDetails(
        `mailto:${Deno.env.get('VAPID_EMAIL')}`,
        Deno.env.get('VAPID_PUBLIC_KEY'),
        Deno.env.get('VAPID_PRIVATE_KEY')
    )
    
    // Send push notification
    try {
        await webpush.sendNotification(
            prefs.push_subscription,
            JSON.stringify(notification)
        )
        return new Response('Push sent', { status: 200 })
    } catch (error) {
        console.error('Push error:', error)
        return new Response('Push failed', { status: 500 })
    }
})
```

### 🎨 UI for Push Preferences

```
┌───────────────────────────────────────────────┐
│ Push Notifications (Browser)                  │
├───────────────────────────────────────────────┤
│                                               │
│ Status: [🔕 Not enabled]                     │
│                                               │
│ Get instant alerts directly to your browser, │
│ even when the app is closed.                  │
│                                               │
│ [Enable Push Notifications]                  │
│                                               │
│ After enabling, choose which types:          │
│ ☐ Security alerts (recommended)              │
│ ☐ Product updates                            │
│ ☐ Announcements                              │
│                                               │
│ [Save]                                        │
│                                               │
└───────────────────────────────────────────────┘
```

### 📝 Push Notification Best Practices

**Do:**
- ✅ Only request permission after explaining benefit
- ✅ Provide clear opt-out option
- ✅ Send only important/actionable notifications
- ✅ Respect notification frequency
- ✅ Provide fallback to email if denied

**Don't:**
- ❌ Request permission immediately on page load
- ❌ Send marketing/promotional push notifications
- ❌ Send more than 2-3 notifications per day
- ❌ Make notifications vague or unclear
- ❌ Force users to enable push

---

## Database Schema (Complete)

### Full Schema for All 3 Phases

```sql
-- ============================================================================
-- NOTIFICATIONS SYSTEM DATABASE SCHEMA
-- ============================================================================

-- 1. Update user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "security_alerts": true,
    "account_updates": true,
    "product_updates": false,
    "marketing": false
  },
  "push": {
    "security_alerts": true,
    "product_updates": false,
    "announcements": false
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 2. Create user_notifications table (in-app)
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('security', 'account', 'product', 'announcement', 'commission')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    icon TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);

-- 4. Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" 
ON public.user_notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" 
ON public.user_notifications FOR DELETE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true);

-- 6. Helper Functions
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.user_notifications WHERE user_id = user_uuid AND read = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE updated_count INTEGER;
BEGIN
    UPDATE public.user_notifications SET read = TRUE, read_at = NOW() WHERE user_id = user_uuid AND read = FALSE;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_notifications WHERE (expires_at IS NOT NULL AND expires_at < NOW()) OR (created_at < (NOW() - INTERVAL '1 day' * days_to_keep));
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;

-- 8. Add comments
COMMENT ON TABLE public.user_notifications IS 'In-app notifications for user activity and updates';
COMMENT ON COLUMN public.user_preferences.notification_preferences IS 'Granular notification preferences per channel and type';
COMMENT ON COLUMN public.user_preferences.push_subscription IS 'Web Push API subscription object';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name IN ('email_notifications', 'notification_preferences', 'push_notifications', 'push_subscription');

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_notifications'
);

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_unread_notification_count', 'mark_all_notifications_read', 'cleanup_old_notifications');
```

---

## Component Structure

### File Organization

```
account/components/notifications-preferences/
├── notifications-preferences.html
├── notifications-preferences.css
├── notifications-preferences.js
├── notifications-preferences-translations.js
├── locales/
│   └── notifications-preferences-locales.json
├── NOTIFICATIONS-IMPLEMENTATION-GUIDE.md
└── README.md

components/notification-center/
├── notification-center.html
├── notification-center.css
├── notification-center.js
├── notification-center-translations.js
├── locales/
│   └── notification-center-locales.json
└── README.md

supabase/functions/
├── send-notification-email/
│   └── index.ts
├── send-push-notification/
│   └── index.ts
└── create-notification/
    └── index.ts

service-worker.js (at root)
```

---

## Translation Keys (Complete)

### notifications-preferences-locales.json

```json
{
  "en": {
    "Notifications & Preferences": "Notifications & Preferences",
    "Configure how you receive notifications and updates": "Configure how you receive notifications and updates",
    
    "Account Preferences": "Account Preferences",
    "Language:": "Language:",
    "Theme:": "Theme:",
    "Change in settings": "Change in settings",
    
    "Email Notifications": "Email Notifications",
    "Receive important updates via email": "Receive important updates via email",
    "Security Alerts": "Security Alerts",
    "New logins, password changes, 2FA updates": "New logins, password changes, 2FA updates",
    "Account Updates": "Account Updates",
    "Email changes, username updates": "Email changes, username updates",
    "Product Updates": "Product Updates",
    "New apps, features, and improvements": "New apps, features, and improvements",
    "Marketing": "Marketing",
    "Newsletters and special offers": "Newsletters and special offers",
    
    "Push Notifications": "Push Notifications",
    "Get instant alerts in your browser": "Get instant alerts in your browser",
    "Status:": "Status:",
    "Not enabled": "Not enabled",
    "Enabled": "Enabled",
    "Enable Push Notifications": "Enable Push Notifications",
    "Disable Push Notifications": "Disable Push Notifications",
    "Browser push notifications require permission": "Browser push notifications require permission",
    
    "In-App Notifications": "In-App Notifications",
    "See notifications while using the app": "See notifications while using the app",
    "Always enabled": "Always enabled",
    
    "Save Preferences": "Save Preferences",
    "Preferences saved successfully": "Preferences saved successfully",
    "Failed to save preferences": "Failed to save preferences",
    
    "Coming Soon": "Coming Soon",
    "In-app and push notifications coming soon!": "In-app and push notifications coming soon!",
    "More notification options will be available when our app catalog launches!": "More notification options will be available when our app catalog launches!"
  },
  "es": {
    "Notifications & Preferences": "Notificaciones y Preferencias",
    "Configure how you receive notifications and updates": "Configura cómo recibes notificaciones y actualizaciones",
    
    "Account Preferences": "Preferencias de Cuenta",
    "Language:": "Idioma:",
    "Theme:": "Tema:",
    "Change in settings": "Cambiar en ajustes",
    
    "Email Notifications": "Notificaciones por Email",
    "Receive important updates via email": "Recibe actualizaciones importantes por email",
    "Security Alerts": "Alertas de Seguridad",
    "New logins, password changes, 2FA updates": "Nuevos inicios de sesión, cambios de contraseña, actualizaciones de 2FA",
    "Account Updates": "Actualizaciones de Cuenta",
    "Email changes, username updates": "Cambios de email, actualizaciones de usuario",
    "Product Updates": "Actualizaciones de Productos",
    "New apps, features, and improvements": "Nuevas apps, características y mejoras",
    "Marketing": "Marketing",
    "Newsletters and special offers": "Boletines y ofertas especiales",
    
    "Push Notifications": "Notificaciones Push",
    "Get instant alerts in your browser": "Recibe alertas instantáneas en tu navegador",
    "Status:": "Estado:",
    "Not enabled": "No habilitado",
    "Enabled": "Habilitado",
    "Enable Push Notifications": "Habilitar Notificaciones Push",
    "Disable Push Notifications": "Deshabilitar Notificaciones Push",
    "Browser push notifications require permission": "Las notificaciones push requieren permiso del navegador",
    
    "In-App Notifications": "Notificaciones en la App",
    "See notifications while using the app": "Ver notificaciones mientras usas la app",
    "Always enabled": "Siempre habilitado",
    
    "Save Preferences": "Guardar Preferencias",
    "Preferences saved successfully": "Preferencias guardadas exitosamente",
    "Failed to save preferences": "Error al guardar preferencias",
    
    "Coming Soon": "Próximamente",
    "In-app and push notifications coming soon!": "¡Notificaciones en la app y push próximamente!",
    "More notification options will be available when our app catalog launches!": "¡Más opciones de notificación estarán disponibles cuando lancemos nuestro catálogo de apps!"
  },
  "fr": {
    "Notifications & Preferences": "Notifications et Préférences",
    "Email Notifications": "Notifications par Email",
    "Security Alerts": "Alertes de Sécurité",
    "Save Preferences": "Enregistrer les Préférences"
  },
  "de": {
    "Notifications & Preferences": "Benachrichtigungen und Einstellungen",
    "Email Notifications": "E-Mail-Benachrichtigungen",
    "Security Alerts": "Sicherheitswarnungen",
    "Save Preferences": "Einstellungen Speichern"
  }
}
```

### notification-center-locales.json

```json
{
  "en": {
    "Notifications": "Notifications",
    "No notifications": "No notifications",
    "You're all caught up!": "You're all caught up!",
    "Mark all as read": "Mark all as read",
    "View all": "View all",
    "Delete": "Delete",
    "Mark as read": "Mark as read",
    "Mark as unread": "Mark as unread",
    "Just now": "Just now",
    "minutes ago": "minutes ago",
    "hours ago": "hours ago",
    "days ago": "days ago",
    "weeks ago": "weeks ago"
  }
}
```

---

## Testing Checklist

### Phase 1: Email Notifications
- [ ] Database `email_notifications` column exists
- [ ] Preferences page loads correctly
- [ ] Toggle switches work
- [ ] Save preferences updates database
- [ ] Translations work in all 4 languages
- [ ] Mobile responsive
- [ ] Theme support (dark/light)

### Phase 2: In-App Notifications
- [ ] Database table `user_notifications` created
- [ ] Bell icon shows in navigation
- [ ] Unread count badge displays correctly
- [ ] Dropdown opens/closes properly
- [ ] Notifications list displays
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Polling updates count
- [ ] Real-time updates (if implemented)
- [ ] Translations work
- [ ] Mobile responsive

### Phase 3: Push Notifications
- [ ] Service Worker registers
- [ ] Permission request displays
- [ ] Permission grant/deny handled
- [ ] Subscription saved to database
- [ ] Push notifications received
- [ ] Notification click opens correct page
- [ ] Unsubscribe works
- [ ] Fallback to email if denied
- [ ] VAPID keys configured
- [ ] Edge Function sends push
- [ ] Translations work

---

## Deployment Steps

### Phase 1 Deployment
1. Run database migration (if using granular preferences)
2. Deploy notifications-preferences component
3. Update component-loader.js
4. Deploy translations
5. Test on staging
6. Deploy to production
7. Monitor error logs

### Phase 2 Deployment
1. Run database schema for `user_notifications`
2. Deploy notification-center component
3. Add to navigation menu
4. Deploy Edge Function for creating notifications
5. Update existing components to create notifications
6. Test polling
7. Deploy to production

### Phase 3 Deployment
1. Generate VAPID keys
2. Store secrets in Supabase
3. Deploy service-worker.js to root
4. Update user_preferences schema
5. Deploy send-push-notification Edge Function
6. Add push section to preferences page
7. Test on HTTPS only
8. Deploy to production
9. Monitor subscription rate

---

## Performance Considerations

### Phase 1 (Email)
- No performance impact
- Async email sending

### Phase 2 (In-App)
- **Polling**: 30-second intervals (minimal impact)
- **Database**: Indexed queries (fast)
- **Cleanup**: Run daily via cron
- **Limit**: Show only 20 recent notifications

### Phase 3 (Push)
- **Service Worker**: ~10-20KB
- **Push payload**: Keep under 4KB
- **Battery**: Minimal impact
- **Data**: Negligible

---

## Security Considerations

### Email
- ✅ Validate email addresses
- ✅ Rate limit email sending
- ✅ Include unsubscribe link
- ✅ Don't expose sensitive data in emails

### In-App
- ✅ RLS policies prevent cross-user access
- ✅ Validate notification ownership
- ✅ Sanitize HTML content
- ✅ Expire old notifications

### Push
- ✅ Use VAPID authentication
- ✅ Validate subscription endpoints
- ✅ Encrypt sensitive data
- ✅ Handle subscription expiry

---

## Future Enhancements

### Potential Features
- 📊 Notification analytics
- 🔕 Quiet hours (don't notify 10pm-8am)
- 📱 SMS notifications (via Twilio)
- 🌐 Multi-language email templates
- 🎨 Custom notification sounds
- 📅 Scheduled notifications
- 🔔 Priority levels (high/medium/low)
- 📦 Batch notifications (digest mode)
- 🎯 Smart notification routing

---

## Resources & Documentation

### Official Docs
- [Supabase Auth Emails](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

### Libraries
- [web-push (Node.js)](https://github.com/web-push-libs/web-push)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

### Inspiration
- Gmail notifications
- GitHub notifications
- Slack notifications
- Discord notifications

---

## Support & Troubleshooting

### Common Issues

**Email not sending:**
- Check Supabase email settings
- Verify SMTP configuration
- Check spam folder
- Verify email template

**Push not working:**
- Ensure HTTPS
- Check browser support
- Verify VAPID keys
- Check service worker registration
- Verify permission granted

**In-app not updating:**
- Check RLS policies
- Verify polling interval
- Check console for errors
- Test database query directly

---

## Conclusion

This notifications system is designed to grow with your platform:
- **Phase 1**: Quick MVP for immediate security value
- **Phase 2**: Enhanced UX for engaged users
- **Phase 3**: Advanced real-time capabilities

Start simple, iterate based on user feedback, and add complexity only when needed!

---

**Good luck with implementation! 🚀**


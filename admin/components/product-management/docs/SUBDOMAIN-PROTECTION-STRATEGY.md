# Subdomain Protection & Subscription Integration Strategy

> **Purpose**: Complete strategy for protecting BitMinded subdomains behind subscriptions and managing access control across the ecosystem.

---

## 📋 **Overview**

This document explains how BitMinded's subdomain-based tools (`converter.bitminded.ch`, `devflow.bitminded.ch`, etc.) will be protected behind subscriptions and how users will access them through a unified authentication and payment system.

### **Architecture Summary**
- **Main Site** (`bitminded.ch`) = Dashboard/App Store where users browse and subscribe
- **Subdomains** (`converter.bitminded.ch`) = Individual tools protected behind paywalls
- **Authentication** = Supabase-based user management
- **Payments** = Stripe-based subscription system
- **Access Control** = Cloudflare Workers enforcing subscription-based access

---

## 🎯 **Business Model Integration**

### **How Subdomains Connect to Subscriptions**

#### **User Journey:**
1. **Discovery**: User visits `bitminded.ch` and sees available tools
2. **Subscription**: User subscribes to specific tools or bundles
3. **Access**: User can now access subscribed tools on subdomains
4. **Management**: User manages subscriptions from their account page

#### **Tool Protection Model:**
- **Individual Subscriptions**: User pays for `converter.bitminded.ch` separately
- **Bundle Subscriptions**: User pays for access to multiple tools
- **Admin Grants**: Admin can give free access to specific users
- **Trial Access**: Temporary access for testing (optional)

### **Subscription Types**
```
Individual Tool Access:
- Converter Pass: $X/month for converter.bitminded.ch
- DevFlow Pass: $Y/month for devflow.bitminded.ch
- Notes Pass: $Z/month for notes.bitminded.ch

Bundle Access:
- Professional Bundle: $W/month for all tools
- Developer Bundle: $V/month for dev-focused tools

Admin-Granted Access:
- Free access for beta testers
- Free access for partners
- Free access for specific users
```

---

## 🏗️ **Technical Architecture**

### **Component Integration**

#### **1. Main Site (`bitminded.ch`)**
**Role**: Central hub for authentication and subscription management
**Components**:
- Authentication system (login/signup)
- Subscription management interface
- Tool showcase and pricing
- User account management
- Admin panel for user management

#### **2. Subdomains (`converter.bitminded.ch`, etc.)**
**Role**: Individual tools protected behind access control
**Protection**: Cloudflare Workers check subscription status
**Access**: Only users with valid subscriptions can access

#### **3. Authentication System**
**Role**: Manages user identity and session state
**Integration**: Shared across main site and all subdomains
**Features**: Login, signup, 2FA, session management

#### **4. Subscription System**
**Role**: Handles payments and access grants
**Integration**: Updates user entitlements automatically
**Features**: Stripe integration, webhook handling, subscription management

#### **5. Access Control System**
**Role**: Enforces subscription-based access to subdomains
**Implementation**: Cloudflare Workers intercept requests
**Logic**: Check authentication + subscription status before allowing access

---

## 🔐 **Access Control Flow**

### **Detailed User Flow**

#### **Scenario 1: Unauthenticated User**
```
User visits converter.bitminded.ch
↓
Cloudflare Worker intercepts request
↓
No authentication token found
↓
Redirect to bitminded.ch/auth?redirect=converter.bitminded.ch
↓
User logs in on main site
↓
Redirect back to converter.bitminded.ch
↓
Cloudflare Worker checks subscription status
↓
If subscribed: Allow access to tool
If not subscribed: Redirect to bitminded.ch/subscribe?tool=converter
```

#### **Scenario 2: Authenticated User Without Subscription**
```
User visits converter.bitminded.ch
↓
Cloudflare Worker intercepts request
↓
Valid authentication token found
↓
Check subscription status in Supabase
↓
No active subscription for converter tool
↓
Redirect to bitminded.ch/subscribe?tool=converter
↓
User subscribes via Stripe
↓
Stripe webhook updates Supabase entitlements
↓
User can now access converter.bitminded.ch
```

#### **Scenario 3: Authenticated User With Subscription**
```
User visits converter.bitminded.ch
↓
Cloudflare Worker intercepts request
↓
Valid authentication token found
↓
Check subscription status in Supabase
↓
Active subscription found for converter tool
↓
Proxy request to GitHub Pages (actual tool)
↓
User sees the converter tool
```

#### **Scenario 4: Subscription Expires**
```
User visits converter.bitminded.ch
↓
Cloudflare Worker intercepts request
↓
Valid authentication token found
↓
Check subscription status in Supabase
↓
Subscription expired or cancelled
↓
Redirect to bitminded.ch/subscribe?tool=converter
↓
User must resubscribe to regain access
```

---

## 🗄️ **Database Schema Integration**

### **Entitlements Table (Core Protection Logic)**
```sql
CREATE TABLE public.entitlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id TEXT NOT NULL, -- 'converter', 'devflow', 'notes', 'all'
    subscription_id TEXT, -- Stripe subscription ID
    stripe_customer_id TEXT, -- Stripe customer ID
    active BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_id)
);
```

### **Subscription Management Table**
```sql
CREATE TABLE public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL, -- 'converter', 'devflow', 'all', etc.
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', etc.
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Access Control Functions**
```sql
-- Check if user has access to specific app
CREATE OR REPLACE FUNCTION public.has_app_access(
    user_uuid UUID DEFAULT auth.uid(),
    app_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.entitlements 
        WHERE user_id = user_uuid 
        AND app_id = app_name 
        AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ) OR EXISTS (
        SELECT 1 FROM public.entitlements 
        WHERE user_id = user_uuid 
        AND app_id = 'all' 
        AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 💳 **Payment Integration**

### **Stripe Product Configuration**

#### **Individual Tool Products**
```
Product: "Converter Access"
- Price: $9.99/month
- Metadata: { "app_id": "converter" }

Product: "DevFlow Access"  
- Price: $14.99/month
- Metadata: { "app_id": "devflow" }

Product: "Notes Access"
- Price: $4.99/month
- Metadata: { "app_id": "notes" }
```

#### **Bundle Products**
```
Product: "Professional Bundle"
- Price: $24.99/month
- Metadata: { "app_id": "all" }

Product: "Developer Bundle"
- Price: $19.99/month
- Metadata: { "app_id": "devflow,converter" }
```

### **Webhook Integration**

#### **Payment Success Webhook**
```javascript
// Stripe webhook handler
if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.user_id;
    const appId = session.metadata.app_id;
    
    // Update entitlements in Supabase
    await supabase
        .from('entitlements')
        .upsert({
            user_id: userId,
            app_id: appId,
            subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            active: true,
            expires_at: new Date(session.subscription_details.current_period_end)
        });
}
```

#### **Subscription Cancellation Webhook**
```javascript
if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    
    // Deactivate entitlements
    await supabase
        .from('entitlements')
        .update({ active: false })
        .eq('subscription_id', subscription.id);
}
```

---

## 🚀 **Cloudflare Workers Implementation**

### **Worker Logic for Access Control**

#### **Basic Worker Structure**
```javascript
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const appId = getAppIdFromSubdomain(url.hostname);
        
        // Check authentication
        const authToken = getAuthToken(request);
        if (!authToken) {
            return redirectToLogin(url.hostname);
        }
        
        // Verify token and check entitlements
        const hasAccess = await checkUserAccess(authToken, appId);
        if (!hasAccess) {
            return redirectToSubscribe(appId);
        }
        
        // Proxy to GitHub Pages
        return fetch(request, {
            cf: {
                resolveOverride: env.GITHUB_PAGES_URL
            }
        });
    }
};
```

#### **Authentication Token Handling**
```javascript
function getAuthToken(request) {
    // Check cookies first
    const cookieToken = request.headers.get('Cookie')
        ?.split(';')
        .find(c => c.trim().startsWith('sb-access-token='))
        ?.split('=')[1];
    
    if (cookieToken) return cookieToken;
    
    // Check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    return null;
}
```

#### **Entitlement Checking**
```javascript
async function checkUserAccess(token, appId) {
    try {
        // Verify JWT token
        const user = await verifySupabaseToken(token);
        if (!user) return false;
        
        // Check entitlements in Supabase
        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/has_app_access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_uuid: user.id,
                app_name: appId
            })
        });
        
        const result = await response.json();
        return result === true;
    } catch (error) {
        console.error('Access check failed:', error);
        return false;
    }
}
```

---

## 🔄 **Cross-Domain Authentication**

### **Session Sharing Strategy**

#### **Cookie Configuration**
```javascript
// Set authentication cookie on main site
document.cookie = `sb-access-token=${token}; domain=.bitminded.ch; path=/; secure; samesite=lax`;
```

#### **Token Validation**
- Main site: Full authentication flow
- Subdomains: Token validation via Cloudflare Workers
- Shared session state across all domains

### **Authentication State Management**

#### **Main Site Authentication**
```javascript
// User logs in on bitminded.ch
const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});

if (data.user) {
    // Set cross-domain cookie
    setAuthCookie(data.session.access_token);
    
    // Redirect to intended subdomain or dashboard
    const redirectUrl = getRedirectUrl();
    window.location.href = redirectUrl;
}
```

#### **Subdomain Access**
```javascript
// Cloudflare Worker checks authentication
const token = getAuthToken(request);
const isValid = await verifySupabaseToken(token);

if (isValid) {
    // Check subscription status
    const hasAccess = await checkSubscriptionStatus(token, appId);
    return hasAccess ? proxyToApp() : redirectToSubscribe();
} else {
    return redirectToLogin();
}
```

---

## 📱 **User Experience Design**

### **Main Site Dashboard**

#### **Tool Showcase Page**
```html
<section class="tools-showcase">
    <div class="tool-card">
        <h3>Unit Converter</h3>
        <p>Convert between 152+ units across 18 categories</p>
        <div class="tool-status">
            <span class="status-unlocked" v-if="hasAccess('converter')">
                ✅ Unlocked
            </span>
            <span class="status-locked" v-else>
                🔒 Subscribe to unlock
            </span>
        </div>
        <a href="https://converter.bitminded.ch" 
           class="cta-button"
           :class="{ 'disabled': !hasAccess('converter') }">
            {{ hasAccess('converter') ? 'Use Converter' : 'Subscribe Now' }}
        </a>
    </div>
</section>
```

#### **Subscription Management**
```html
<section class="subscription-management">
    <h2>Your Subscriptions</h2>
    <div class="subscription-list">
        <div class="subscription-item" v-for="sub in subscriptions">
            <h3>{{ sub.plan_name }}</h3>
            <p>Status: {{ sub.status }}</p>
            <p>Next billing: {{ sub.current_period_end }}</p>
            <button @click="manageSubscription(sub.id)">
                Manage Subscription
            </button>
        </div>
    </div>
</section>
```

### **Subdomain User Experience**

#### **Access Denied Page**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Access Required - BitMinded</title>
</head>
<body>
    <div class="access-denied">
        <h1>🔒 Access Required</h1>
        <p>You need a subscription to access this tool.</p>
        <a href="https://bitminded.ch/subscribe?tool=converter" 
           class="subscribe-button">
            Subscribe Now
        </a>
        <a href="https://bitminded.ch" class="back-button">
            Back to Dashboard
        </a>
    </div>
</body>
</html>
```

---

## 🛠️ **Implementation Checklist**

### **Phase 1: Foundation Setup**
- [ ] Set up Supabase project with authentication
- [ ] Create database tables (entitlements, subscriptions)
- [ ] Configure Stripe products and webhooks
- [ ] Set up Cloudflare Workers for access control
- [ ] Configure DNS for subdomains

### **Phase 2: Authentication Integration**
- [ ] Implement cross-domain authentication
- [ ] Set up session sharing between domains
- [ ] Test authentication flow across subdomains
- [ ] Implement token validation in Workers

### **Phase 3: Subscription Integration**
- [ ] Connect Stripe webhooks to Supabase
- [ ] Implement subscription status checking
- [ ] Test payment flows and access grants
- [ ] Implement subscription management interface

### **Phase 4: Access Control Testing**
- [ ] Test access control for each subdomain
- [ ] Verify subscription-based access works
- [ ] Test edge cases (expired subscriptions, etc.)
- [ ] Implement admin access control

### **Phase 5: User Experience**
- [ ] Create subscription management interface
- [ ] Implement access denied pages
- [ ] Test user flows across all domains
- [ ] Optimize mobile experience

---

## 🔍 **Testing Strategy**

### **Authentication Testing**
- [ ] Test login/logout across all domains
- [ ] Verify session persistence
- [ ] Test token expiration handling
- [ ] Test 2FA integration

### **Subscription Testing**
- [ ] Test payment success/failure flows
- [ ] Verify webhook integration
- [ ] Test subscription cancellation
- [ ] Test subscription renewal

### **Access Control Testing**
- [ ] Test access with valid subscriptions
- [ ] Test access without subscriptions
- [ ] Test access with expired subscriptions
- [ ] Test admin-granted access

### **Edge Case Testing**
- [ ] Test network failures
- [ ] Test Supabase downtime
- [ ] Test Stripe webhook failures
- [ ] Test Cloudflare Worker failures

---

## 📊 **Monitoring & Analytics**

### **Key Metrics to Track**
- **Authentication Success Rate**: % of successful logins
- **Subscription Conversion Rate**: % of users who subscribe
- **Access Control Effectiveness**: % of unauthorized access attempts blocked
- **User Engagement**: Time spent on tools after subscription
- **Churn Rate**: % of users who cancel subscriptions

### **Monitoring Setup**
- **Supabase Monitoring**: Database performance and auth metrics
- **Stripe Monitoring**: Payment success rates and webhook delivery
- **Cloudflare Monitoring**: Worker performance and access patterns
- **Custom Analytics**: User behavior across subdomains

---

## ⚠️ **Security Considerations**

### **Access Control Security**
- **Token Validation**: Always verify JWT tokens server-side
- **Subscription Verification**: Check subscription status on every request
- **Rate Limiting**: Implement rate limiting for authentication attempts
- **Audit Logging**: Log all access attempts and subscription changes

### **Data Protection**
- **User Data**: Encrypt sensitive user information
- **Payment Data**: Never store payment details (use Stripe)
- **Session Security**: Use secure cookies and HTTPS
- **Admin Access**: Implement proper admin access controls

---

## 🔮 **Future Enhancements**

### **Advanced Features**
- **Single Sign-On (SSO)**: Integration with enterprise SSO providers
- **Usage Analytics**: Track tool usage for billing optimization
- **Dynamic Pricing**: Different pricing based on usage or features
- **API Access**: Provide API access for subscribed users

### **Scalability Improvements**
- **CDN Integration**: Use Cloudflare CDN for better performance
- **Database Optimization**: Implement caching for frequent queries
- **Worker Optimization**: Optimize Cloudflare Workers for better performance
- **Monitoring Enhancement**: Advanced monitoring and alerting

---

## 📝 **Quick Reference**

### **Key URLs**
- **Main Site**: `bitminded.ch`
- **Authentication**: `bitminded.ch/auth`
- **Account Management**: `bitminded.ch/account`
- **Subscription Management**: `bitminded.ch/subscribe`
- **Admin Panel**: `bitminded.ch/admin`

### **Key Subdomains**
- **Unit Converter**: `converter.bitminded.ch`
- **DevFlow**: `devflow.bitminded.ch`
- **Notes**: `notes.bitminded.ch`
- **Future Tools**: `calculator.bitminded.ch`, `generator.bitminded.ch`

### **Key Integration Points**
- **Supabase**: Authentication and database
- **Stripe**: Payment processing and webhooks
- **Cloudflare Workers**: Access control and routing
- **GitHub Pages**: Static hosting for tools

---

**Remember**: This subdomain protection strategy transforms your collection of tools into a professional SaaS platform. The authentication and user management system provides the foundation, while the subscription system enables monetization, and the access control system ensures only paying users can access your tools.

---

## 📚 **Related Documentation**

### **Implementation Guides**
- **[AUTHENTICATION-IMPLEMENTATION-ORDER.md](./AUTHENTICATION-IMPLEMENTATION-ORDER.md)** - Detailed step-by-step implementation phases
- **[AUTHENTICATION-USER-MANAGEMENT-STRATEGY.md](./AUTHENTICATION-USER-MANAGEMENT-STRATEGY.md)** - Complete component architecture and database schema

### **Setup Guides**
- **[auht-payment.md](./auht-payment.md)** - Quick setup guide for the complete ecosystem
- **[MULTIPLE-SUBDOMAINS-GUIDE.md](./MULTIPLE-SUBDOMAINS-GUIDE.md)** - Subdomain setup and configuration

### **Feature Checklists**
- **[account-management.md](./account-management.md)** - Account page features checklist

### **Supabase Files**
- **[../supabase/database-schema.sql](../supabase/database-schema.sql)** - Complete database schema
- **[../supabase/fix-rls-policy.sql](../supabase/fix-rls-policy.sql)** - RLS policy fix
- **[../supabase/supabase-test.html](../supabase/supabase-test.html)** - Connection test page
- **[../supabase/email-templates.md](../supabase/email-templates.md)** - Custom email templates

---

*Last updated: [Current Date]*
*Status: Ready for Implementation*
*Next Steps: Begin with authentication and user management implementation*

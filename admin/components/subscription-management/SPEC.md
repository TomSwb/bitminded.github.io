# Subscription Management Component Specification

## Overview
Complete subscription lifecycle management integrated with Stripe. View, manage, and analyze all subscriptions across users and products.

## Responsibilities
- View all subscriptions (manual and Stripe)
- Manage subscription lifecycle
- Handle cancellations and refunds
- Override subscription settings
- Monitor subscription health
- Generate subscription reports

## UI Components

### Header Section
- Title: "Subscription Management"
- **Stats Row**:
  - Total subscriptions
  - Active subscriptions
  - MRR (Monthly Recurring Revenue)
  - Churn rate

### Filter Panel
**Filter Options**:
- **Status**: All / Active / Cancelled / Past Due / Trialing
- **Product**: All products dropdown
- **Billing**: Monthly / Yearly / Lifetime
- **Source**: All / Stripe / Manual / Trial
- **Date Range**: Subscription start date
- **Payment Status**: All / Paid / Failed / Pending

### Subscriptions Table

**Columns**:
1. **User**
   - Avatar + Username
   - Email
   - Click to view user detail

2. **Product/Plan**
   - Product name
   - Plan type (monthly/yearly)
   - Price

3. **Status**
   - Active (green badge)
   - Cancelled (gray badge)
   - Past Due (yellow badge)
   - Trialing (blue badge)

4. **Billing**
   - Current period start
   - Current period end
   - Next billing date

5. **Revenue**
   - Amount per cycle
   - Total paid to date
   - LTV (lifetime value)

6. **Source**
   - Stripe (with subscription ID)
   - Manual grant
   - Trial

7. **Payment Method**
   - Card brand + last 4
   - Or "N/A" for manual

8. **Actions**
   - View in Stripe
   - Extend/modify
   - Cancel
   - Refund

### Subscription Detail Modal

**Tabs**:
1. **Overview**: Basic subscription info
2. **Billing History**: All charges and invoices
3. **Events**: Subscription events timeline
4. **Modifications**: Change history

**Actions Available**:
- Pause subscription
- Resume subscription
- Change plan (upgrade/downgrade)
- Update payment method
- Apply discount/coupon
- Extend trial period
- Cancel immediately
- Cancel at period end
- Refund and cancel

### Quick Actions Panel
- **Cancel Subscription** (immediate or at period end)
- **Refund Last Payment**
- **Extend Subscription** (add days/months)
- **Apply Discount** (one-time or recurring)
- **Change Plan** (upgrade/downgrade)

### Subscription Analytics (Charts)
- Subscription growth over time (line chart)
- Plan distribution (pie chart)
- Churn rate trend
- MRR trend

## Functionality

### Load Subscriptions
```javascript
async loadSubscriptions(filters) {
    // 1. Query entitlements and Stripe subscriptions
    // 2. Combine manual and Stripe data
    // 3. Calculate metrics
    // 4. Apply filters
    // 5. Sort and paginate
}
```

### Sync with Stripe
```javascript
async syncStripeSubscriptions() {
    // 1. Fetch all Stripe subscriptions
    // 2. Compare with database
    // 3. Update differences
    // 4. Log sync activity
    // 5. Show sync results
}
```

### Cancel Subscription
```javascript
async cancelSubscription(subscriptionId, immediate, reason) {
    // If Stripe subscription:
    // 1. Cancel via Stripe API
    // 2. Update local database via webhook
    
    // If manual:
    // 1. Set expiration to now (immediate) or period end
    // 2. Update entitlement status
    
    // Both:
    // 3. Log cancellation with reason
    // 4. Send cancellation email to user
    // 5. Update UI
}
```

### Refund and Cancel
```javascript
async refundAndCancel(subscriptionId, refundAmount, reason) {
    // 1. Process refund via Stripe
    // 2. Cancel subscription
    // 3. Update entitlements
    // 4. Log refund action
    // 5. Send refund confirmation email
    // 6. Update UI
}
```

### Extend Subscription
```javascript
async extendSubscription(subscriptionId, extensionDays, reason) {
    // 1. Calculate new end date
    // 2. Update Stripe metadata (if Stripe sub)
    // 3. Update local expiration
    // 4. Log extension
    // 5. Notify user
    // 6. Update UI
}
```

### Change Plan
```javascript
async changePlan(subscriptionId, newPlanId, proration) {
    // 1. Update Stripe subscription plan
    // 2. Handle proration (immediate or at period end)
    // 3. Update local database
    // 4. Log plan change
    // 5. Send confirmation email
    // 6. Update UI
}
```

## Database Queries

### Subscriptions View
```sql
-- Combine Stripe and manual subscriptions
SELECT 
    e.id,
    e.user_id,
    e.app_id,
    e.active,
    e.expires_at,
    e.subscription_id as stripe_subscription_id,
    us.plan_name,
    us.status as stripe_status,
    us.current_period_start,
    us.current_period_end,
    us.stripe_customer_id,
    up.username,
    au.email,
    COALESCE(
        (SELECT SUM(amount) FROM payments WHERE user_id = e.user_id AND app_id = e.app_id),
        0
    ) as total_paid,
    CASE 
        WHEN e.subscription_id IS NOT NULL THEN 'stripe'
        WHEN e.grant_type = 'trial' THEN 'trial'
        ELSE 'manual'
    END as source
FROM entitlements e
JOIN user_profiles up ON e.user_id = up.id
JOIN auth.users au ON e.user_id = au.id
LEFT JOIN user_subscriptions us ON us.stripe_subscription_id = e.subscription_id
WHERE 
    ($status IS NULL OR (
        CASE 
            WHEN $status = 'active' THEN e.active = true
            WHEN $status = 'cancelled' THEN us.status = 'canceled'
            WHEN $status = 'past_due' THEN us.status = 'past_due'
            WHEN $status = 'trialing' THEN e.grant_type = 'trial'
        END
    ))
    AND ($productId IS NULL OR e.app_id = $productId)
ORDER BY e.created_at DESC;
```

### Subscription Metrics
```sql
-- Calculate key metrics
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN active = true THEN 1 END) as active_subscriptions,
    SUM(CASE WHEN active = true THEN price END) as mrr,
    (COUNT(CASE WHEN status = 'canceled' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as churn_rate
FROM subscription_view
WHERE created_at >= date_trunc('month', NOW());
```

## Stripe Integration

### Webhook Events to Handle
```javascript
// stripe_webhooks.js
const webhookHandlers = {
    'customer.subscription.created': handleSubscriptionCreated,
    'customer.subscription.updated': handleSubscriptionUpdated,
    'customer.subscription.deleted': handleSubscriptionDeleted,
    'invoice.paid': handleInvoicePaid,
    'invoice.payment_failed': handlePaymentFailed,
    'charge.refunded': handleChargeRefunded
};

async function handleSubscriptionUpdated(subscription) {
    // Update user_subscriptions table
    // Update entitlements if needed
    // Send user notification if status changed
}
```

### Stripe API Methods
```javascript
// Cancel subscription in Stripe
await stripe.subscriptions.cancel(subscriptionId, {
    prorate: true,
    invoice_now: false
});

// Update subscription plan
await stripe.subscriptions.update(subscriptionId, {
    items: [{
        id: subscriptionItemId,
        price: newPriceId
    }],
    proration_behavior: 'create_prorations'
});

// Issue refund
await stripe.refunds.create({
    charge: chargeId,
    amount: refundAmount,
    reason: 'requested_by_customer'
});
```

## API Methods

```javascript
class SubscriptionManagement {
    async init()
    async loadSubscriptions(filters)
    async syncStripeSubscriptions()
    async getSubscriptionDetails(subscriptionId)
    async cancelSubscription(subscriptionId, immediate, reason)
    async pauseSubscription(subscriptionId)
    async resumeSubscription(subscriptionId)
    async refundAndCancel(subscriptionId, amount, reason)
    async extendSubscription(subscriptionId, days, reason)
    async changePlan(subscriptionId, newPlanId, proration)
    async applyDiscount(subscriptionId, couponCode)
    async updatePaymentMethod(subscriptionId)
    async getBillingHistory(subscriptionId)
    async exportSubscriptions(filters)
    calculateMetrics(subscriptions)
    filterSubscriptions(filters)
}
```

## Translations Keys
- `subscription_management`: "Subscription Management"
- `total_subscriptions`: "Total Subscriptions"
- `active_subscriptions`: "Active Subscriptions"
- `mrr`: "Monthly Recurring Revenue"
- `churn_rate`: "Churn Rate"
- `subscription_status`: "Status"
- `billing_cycle`: "Billing Cycle"
- `monthly`: "Monthly"
- `yearly`: "Yearly"
- `lifetime`: "Lifetime"
- `current_period`: "Current Period"
- `next_billing`: "Next Billing Date"
- `cancel_subscription`: "Cancel Subscription"
- `cancel_immediate`: "Cancel Immediately"
- `cancel_at_period_end`: "Cancel at Period End"
- `refund_and_cancel`: "Refund and Cancel"
- `extend_subscription`: "Extend Subscription"
- `change_plan`: "Change Plan"
- `view_in_stripe`: "View in Stripe"
- `sync_with_stripe`: "Sync with Stripe"
- `payment_method`: "Payment Method"
- `total_paid`: "Total Paid"

## Styling Requirements
- Table with status color coding
- Stripe badge/logo for Stripe subs
- Payment method icons (Visa, MC, etc.)
- Charts for analytics
- Modal dialogs for actions
- Confirmation dialogs for destructive actions

## Dependencies
- Stripe SDK
- Supabase client
- Chart library (Chart.js)
- Translation system
- Admin layout component
- Email/notification service

## Security Considerations
- Verify admin permissions for all actions
- Log all subscription modifications
- Require confirmation for refunds
- Secure Stripe API key (server-side only)
- Validate webhook signatures
- Mask full payment details

## Performance Considerations
- Cache Stripe data (refresh periodically)
- Paginate large subscription lists
- Lazy load billing history
- Optimize webhook processing
- Index subscription tables

## Testing Checklist
- [ ] Load subscriptions correctly
- [ ] Sync with Stripe works
- [ ] Cancel subscription works (Stripe)
- [ ] Cancel subscription works (manual)
- [ ] Refund processes correctly
- [ ] Extend subscription works
- [ ] Change plan works
- [ ] Webhooks handled properly
- [ ] Metrics calculated correctly
- [ ] Export works
- [ ] Mobile responsive
- [ ] All actions logged

## Implementation Priority
**Phase 2** - Essential for monetization

## Future Enhancements
- Subscription pause/resume
- Dunning management (retry failed payments)
- Subscription upgrade paths
- Win-back campaigns for cancelled subs
- Cohort analysis
- LTV predictions


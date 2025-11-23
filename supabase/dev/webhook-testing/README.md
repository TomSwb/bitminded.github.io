# Webhook Testing Files

This directory contains SQL queries and utilities for testing the Stripe webhook handler.

## Files

### Verification Queries

- **`verify-all-tested-events.sql`** ⭐ **COMPREHENSIVE** - Verify all events marked as "TESTED & WORKING"
  - Checks database state for all tested events
  - Identifies which tests need DB verification
  - Run this first to see what's actually in the DB vs what we think was tested

- **`verify-webhook-test.sql`** - General purpose query to verify webhook processing for a specific user
  - Checks `product_purchases` table
  - Checks `error_logs` table
  - Shows recent purchases and errors

- **`verify-webhook-fix-test.sql`** - Verify subscription_interval fix
  - Checks if `subscription_interval` is correctly set after webhook processes invoice.paid
  - Shows status with visual indicators (✅/❌)

### Debugging Queries

- **`check-existing-purchase.sql`** - Check existing purchase record for a user+product combination
  - Useful when debugging duplicate key errors
  - Shows active purchases for a specific product

- **`check-new-checkout-subscription.sql`** - Check purchase record created from checkout
  - Verifies subscription created via checkout.session.completed
  - Shows subscription_interval status

- **`test-subscription-interval-fix.sql`** - Comprehensive test for subscription_interval fix
  - Multiple queries to check interval status
  - Compares product vs purchase interval

- **`test-webhook-fix.sql`** - Test the webhook fix by resetting and verifying
  - Resets subscription_interval to NULL
  - Verifies it gets set correctly after webhook processes

- **`quick-check-subscription.sql`** - Quick check for a specific subscription
  - Simple query to check subscription_interval for a specific subscription ID

## Usage

1. **After creating a subscription via checkout:**
   ```sql
   -- Run this to verify the purchase was created
   \i webhook-testing/check-new-checkout-subscription.sql
   ```

2. **To verify subscription_interval fix:**
   ```sql
   -- Reset interval to NULL for testing
   UPDATE product_purchases SET subscription_interval = NULL WHERE stripe_subscription_id = 'sub_xxx';
   
   -- Trigger invoice.paid event (via Stripe Dashboard or CLI)
   -- Then verify it was set:
   \i webhook-testing/verify-webhook-fix-test.sql
   ```

3. **General webhook verification:**
   ```sql
   -- Check all webhook activity for a user
   \i webhook-testing/verify-webhook-test.sql
   ```

## Notes

- All queries are designed for the `dev@bitminded.ch` test user
- Adjust email/subscription IDs as needed
- Most queries check the last 10 minutes to 1 hour of activity


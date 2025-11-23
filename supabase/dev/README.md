# Development Tools & Scripts

This directory contains development utilities, test data setup scripts, and debugging tools.

## Directory Structure

```
dev/
├── webhook-testing/      # Webhook test queries and verification scripts
├── archive/              # Archived documentation and setup files
├── utils/                # Utility scripts for database operations
└── README.md            # This file
```

## Quick Links

### Test Products
- **`INSERT-TEST-PRODUCTS-FINAL.sql`** - Final test products for webhook testing
  - 3 test products: One-time, Monthly subscription, Yearly subscription
  - All marked as `status='draft'` to prevent showing on catalog
  - Use this when setting up webhook test environment

### Webhook Testing
See `webhook-testing/README.md` for webhook-specific test queries and utilities.

### Utilities
See `utils/README.md` for database utility scripts.

## Important Notes

- All test products are marked as `status='draft'` - they won't appear on the catalog page
- Test user: `dev@bitminded.ch` (customer ID: `cus_TTLy3ineN51ZEh`)
- All webhook testing should be done in Stripe Test Mode

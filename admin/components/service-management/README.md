# Service Management Component

A comprehensive admin component for managing all BitMinded services (commissioning, tech support, catalog access) with multi-currency pricing, status management, and sales/offers.

## Overview

The Service Management component provides a complete interface for administrators to:
- View and manage all services across all categories
- Search and filter services by various criteria
- Add, edit, and delete services
- Manage multi-currency pricing (CHF, USD, EUR, GBP)
- Set up reduced fare pricing
- Create and manage sales/special offers
- Set service status (available, unavailable, overbooked, on-sale, coming-soon, archived)
- Prepare for Stripe integration (fields ready but not connected)

## Files Structure

```
service-management/
├── service-management.html          # Main HTML structure
├── service-management.css           # Component styling
├── service-management.js            # Main JavaScript functionality
├── service-management-translations.js # Translation handling
├── locales/
│   └── service-management-locales.json # Translation data
└── README.md                        # This documentation
```

## Features

### Core Functionality
- **Service List View**: Table-based display with sorting and filtering
- **Search**: Real-time search across service names, slugs, and descriptions
- **Advanced Filtering**: Multi-select filters for category and status, single-select for sale status and featured
- **Sorting**: Clickable column headers with visual indicators
- **Responsive Design**: Mobile-friendly card layout for small screens

### Filter Options
- **Category**: commissioning, tech-support, catalog-access
- **Status**: available, unavailable, overbooked, on-sale, coming-soon, archived
- **Sale Status**: All, On Sale Only, Not On Sale
- **Featured**: All, Featured Only, Not Featured

### Service Management
- **Add Service**: Create new services with full configuration
- **Edit Service**: Update existing services
- **Delete Service**: Remove services with confirmation
- **Status Management**: Quick status updates
- **Featured Toggle**: Mark services as featured

### Pricing Management
- **Multi-Currency Support**: Set prices in CHF, USD, EUR, GBP
- **Pricing Types**: Fixed, hourly, range, variable
- **Reduced Fare**: Configure reduced fare pricing per currency
- **Sales & Offers**: Create time-limited sales with custom pricing
- **Additional Costs**: Specify additional costs (e.g., "+ travel")

### Stripe Integration (Ready)
- Stripe Product ID field (disabled, ready for integration)
- Stripe Price ID field (disabled, ready for integration)
- Stripe Reduced Price ID field (disabled, ready for integration)

## Service Categories

### Commissioning Services
- Personal Project Intake
- Commission a Feature
- Simple App
- Standard App
- Complex App

### Tech Support Services
- Confidence Session
- Guided Learning Bundle
- Parent & Home Tech Session
- Quick Tech Help
- Friendly Tech Drop-In
- Home Visit Essentials
- Device Procurement

### Catalog Access Services
- Single Tool License
- All-Tools Membership
- Supporter Tier

## Database Schema

Services are stored in the `services` table with:
- Multi-currency pricing stored as JSONB
- Status management fields
- Sales/offers configuration
- Reduced fare support
- Stripe integration fields (ready but not connected)

## Usage

The component is automatically loaded when navigating to the Services section in the admin panel. It provides a full CRUD interface for managing all services.

## Future Enhancements

- Stripe integration for payment processing
- Bulk operations (bulk status updates, bulk pricing changes)
- Service analytics and usage tracking
- Service templates for quick creation
- Import/export functionality


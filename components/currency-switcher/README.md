# Currency Switcher Component

A main component for switching between currencies (CHF, USD, EUR, GBP) on services and catalog pages.

## Overview

The Currency Switcher component allows users to view prices in their preferred currency. It appears only on services and catalog pages where pricing is displayed, positioned next to the language switcher and notification center.

## Features

- Currency selection (CHF, USD, EUR, GBP)
- Persistent currency preference (localStorage)
- Emits `currencyChanged` event for other components to listen
- Positioned after notification center in header
- Mobile support with compact mode in navigation menu
- Only visible on `/services/*` and `/catalog/*` pages

## Files Structure

```
currency-switcher/
├── currency-switcher.html                # Component HTML
├── currency-switcher.css                 # Component styling
├── currency-switcher.js                  # Component logic
├── currency-switcher-translations.js     # Translation loader
├── locales/
│   └── currency-switcher-locales.json   # Translation data
└── README.md                             # This documentation
```

## Integration

### Conditional Loading

The component is automatically loaded only on services and catalog pages via `js/script.js`:

```javascript
async function loadCurrencySwitcher() {
    const pathname = window.location.pathname;
    const isServicesPage = pathname.startsWith('/services');
    const isCatalogPage = pathname.startsWith('/catalog');
    
    if (!isServicesPage && !isCatalogPage) {
        return;
    }
    
    await componentLoader.load('currency-switcher', {
        container: 'header',
        priority: 'high'
    });
}
```

### Position in Header

Currency switcher appears in header after:
- Language switcher (left: var(--spacing-md))
- Notification center (left: calc(var(--spacing-md) + 3.5rem))
- Currency switcher (left: calc(var(--spacing-md) + 7rem))

### Mobile Support

On mobile devices, the currency switcher is moved to the navigation menu's mobile components section, positioned after the notification center.

## Usage

### Listening for Currency Changes

Other components can listen for currency changes:

```javascript
document.addEventListener('currencyChanged', (e) => {
    const { currency, previousCurrency } = e.detail;
    // Update price displays based on new currency
});
```

### Getting Current Currency

```javascript
if (window.currencySwitcher) {
    const currentCurrency = window.currencySwitcher.getCurrentCurrency();
}
```

### Setting Currency Programmatically

```javascript
if (window.currencySwitcher) {
    window.currencySwitcher.setCurrency('USD');
}
```

## Styling

The component matches the language-switcher styling for consistency:
- Same button size and styling
- Same dropdown behavior
- Same hover and focus states
- Responsive design with mobile support

## Browser Support

- Modern browsers with ES6+ support
- Local Storage for preference persistence
- CSS Grid and Flexbox support required


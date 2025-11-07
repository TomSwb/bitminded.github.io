# Site Footer Component

Provides a consistent footer across the site with legal navigation, quick links, and a theme switcher slot.

## Features

- Responsive layout with brand tagline and grouped navigation columns
- Dedicated legal links (Privacy, Terms, Imprint, Cookies)
- Placeholder slot for the existing Theme Switcher component
- Translation support (EN/DE/FR/ES) via `i18next`

## Files

- `site-footer.html` – Markup for the footer block
- `site-footer.css` – Styling and responsive layout
- `site-footer.js` – Translation loader and language-change listener
- `locales/site-footer-locales.json` – Translations

## Usage

Load through the shared component loader:

```javascript
componentLoader.load('site-footer', {
    container: 'footer',
    priority: 'medium'
});
```

The component exposes a `#footer-theme-switcher` div; the global script mounts the Theme Switcher there after the footer finishes loading.


# Language Switcher Component

A flag-based language switching component that integrates with i18next for seamless multilingual support.

## Overview

The Language Switcher component provides an intuitive way for users to switch between supported languages. It uses flag icons for visual language selection and automatically syncs with the i18next translation system.

## Features

- **Flag-Based Interface**: Visual language selection using country flags
- **i18next Integration**: Seamless integration with i18next translation system
- **Persistent Preferences**: Remembers user's language choice in localStorage
- **Browser Language Detection**: Automatically detects user's preferred language
- **Event System**: Emits events for other components to respond to language changes
- **Compact Mode**: Supports compact display for mobile navigation menus
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Files

- `language-switcher.html` - HTML structure with flag buttons
- `language-switcher.css` - Styling for flag buttons and states
- `language-switcher.js` - JavaScript logic and i18next integration

## Usage

### Basic Initialization

```javascript
// Initialize with default settings
const languageSwitcher = new LanguageSwitcher();
languageSwitcher.init();

// Initialize in compact mode (for mobile menus)
languageSwitcher.init({ compact: true });
```

### Integration with Component Loader

```javascript
// Load via component loader
ComponentLoader.load('language-switcher', {
    container: 'header',
    priority: 'high'
});
```

## API Reference

### Constructor

```javascript
new LanguageSwitcher()
```

### Methods

#### `init(config)`
Initializes the language switcher component.

**Parameters:**
- `config` (Object, optional) - Configuration options
  - `compact` (boolean) - Enable compact mode for mobile (default: false)

#### `changeLanguage(language)`
Changes the current language and updates all connected systems.

**Parameters:**
- `language` (string) - Language code ('en', 'fr', etc.)

#### `getCurrentLanguage()`
Returns the currently selected language code.

**Returns:** `string` - Current language code

#### `syncWithI18next()`
Syncs the component state with i18next's current language.

## Configuration

### Supported Languages

Currently supports:
- **English (en)** - 🇺🇸 US Flag
- **French (fr)** - 🇫🇷 French Flag

### Language Detection Priority

1. **User Selection** - Previously selected language from localStorage
2. **Browser Language** - User's browser language preference
3. **Default Fallback** - English ('en')

## Styling

### CSS Classes

- `.language-switcher` - Main container
- `.language-switcher.compact` - Compact mode for mobile
- `.language-switcher__button` - Individual language button
- `.language-switcher__button.active` - Currently selected language
- `.language-switcher__flag` - Flag icon

### Custom Properties

```css
:root {
    --lang-switcher-gap: 0.5rem;
    --lang-switcher-button-size: 2rem;
    --lang-switcher-border-radius: 0.25rem;
}
```

## Events

### Custom Events Emitted

#### `languageChanged`
Fired when the language is changed.

**Event Detail:**
```javascript
{
    language: 'en', // New language code
    previousLanguage: 'fr' // Previous language code
}
```

### Event Listeners

- Listens for `languageChanged` events from other language switcher instances
- Integrates with global `window.changeLanguage()` function

## Integration

### With i18next

The component automatically:
- Syncs with i18next's current language
- Calls `i18next.changeLanguage()` when language changes
- Updates when i18next language changes externally

### With Other Components

Other components can listen for language changes:

```javascript
window.addEventListener('languageChanged', (e) => {
    console.log('Language changed to:', e.detail.language);
    // Update component translations
});
```

### With Navigation Menu

The component integrates seamlessly with the Navigation Menu component:
- Automatically appears in mobile navigation menu
- Maintains state across desktop and mobile views
- Supports compact mode for mobile display

## Accessibility

### ARIA Support

- `aria-label`: "Switch to [Language Name]"
- `title`: Language name for tooltips
- Keyboard navigation support
- Screen reader friendly

### Keyboard Navigation

- **Tab**: Navigate between language buttons
- **Enter/Space**: Select language
- **Arrow Keys**: Navigate between options (if multiple)

## Browser Support

- Modern browsers with ES6+ support
- localStorage support for persistence
- CSS Grid/Flexbox support for layout

## Performance

- Minimal DOM manipulation
- Efficient event handling
- No unnecessary re-renders
- Lightweight implementation

## Troubleshooting

### Language Not Persisting
- Check localStorage availability
- Verify no conflicting localStorage keys
- Check for JavaScript errors in console

### i18next Integration Issues
- Ensure i18next is loaded before component initialization
- Check i18next configuration
- Verify language codes match i18next resources

### Flag Icons Not Displaying
- Check CSS file is loaded
- Verify flag icon classes are correct
- Check for CSS conflicts

## Examples

### Basic Usage

```javascript
// Initialize language switcher
const langSwitcher = new LanguageSwitcher();
langSwitcher.init();

// Change language programmatically
langSwitcher.changeLanguage('fr');
```

### Event Handling

```javascript
// Listen for language changes
window.addEventListener('languageChanged', (e) => {
    const newLang = e.detail.language;
    console.log(`Language changed to: ${newLang}`);
    
    // Update page content
    updatePageContent(newLang);
});
```

### Mobile Integration

```javascript
// Initialize in compact mode for mobile menu
const mobileLangSwitcher = new LanguageSwitcher();
mobileLangSwitcher.element = mobileContainer;
mobileLangSwitcher.init({ compact: true });
```

## Future Enhancements

- Support for additional languages
- Custom flag icon support
- Language-specific date/number formatting
- RTL language support
- Language-specific font loading

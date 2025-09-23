# Theme Switcher Component

A theme switching component that provides light/dark mode toggle functionality with system preference detection and persistence.

## Overview

The Theme Switcher component allows users to toggle between light and dark themes. It automatically detects system preferences, persists user choices, and provides smooth transitions between themes.

## Features

- **Light/Dark Mode Toggle**: Switch between light and dark themes
- **System Preference Detection**: Automatically detects user's system theme preference
- **Persistent Storage**: Remembers user's theme choice in localStorage
- **Smooth Transitions**: CSS transitions for theme changes
- **Icon Animation**: Smooth icon transitions between sun/moon
- **CSS Custom Properties**: Uses CSS variables for easy theming
- **Accessibility**: Proper ARIA labels and keyboard support

## Files

- `theme-switcher.html` - HTML structure with toggle button
- `theme-switcher.css` - Styling and theme transitions
- `theme-switcher.js` - JavaScript logic and theme management

## Usage

### Basic Initialization

```javascript
// Initialize theme switcher
const themeSwitcher = new ThemeSwitcher();
themeSwitcher.init();

// Initialize with custom configuration
themeSwitcher.init({
    persistTheme: true,
    showAnimation: true
});
```

### Integration with Component Loader

```javascript
// Load via component loader
ComponentLoader.load('theme-switcher', {
    container: 'footer',
    priority: 'medium'
});
```

## API Reference

### Constructor

```javascript
new ThemeSwitcher()
```

### Methods

#### `init(config)`
Initializes the theme switcher component.

**Parameters:**
- `config` (Object, optional) - Configuration options
  - `persistTheme` (boolean) - Save theme preference to localStorage (default: true)
  - `showAnimation` (boolean) - Show transition animations (default: true)

#### `toggle()`
Toggles between light and dark themes.

#### `setTheme(theme)`
Sets a specific theme.

**Parameters:**
- `theme` (string) - Theme name ('light' or 'dark')

#### `getCurrentTheme()`
Returns the current theme.

**Returns:** `string` - Current theme ('light' or 'dark')

#### `getCurrentThemeValue()`
Returns the current theme value (same as getCurrentTheme).

**Returns:** `string` - Current theme value

## Configuration

### Theme Detection Priority

1. **User Preference** - Previously selected theme from localStorage
2. **System Preference** - User's system dark/light mode preference
3. **Default Fallback** - Light theme

### Supported Themes

- **Light Theme** (`light`) - Default light theme
- **Dark Theme** (`dark`) - Dark theme with inverted colors

## Styling

### CSS Classes

- `.theme-switcher` - Main container
- `.theme-switcher__button` - Toggle button
- `.theme-switcher__icon` - Theme icon (sun/moon)
- `.theme-switcher__icon--sun` - Sun icon for light theme
- `.theme-switcher__icon--moon` - Moon icon for dark theme

### CSS Custom Properties

The component uses CSS custom properties for theming:

```css
:root {
    /* Light theme */
    --color-background-primary: #ffffff;
    --color-text-primary: #333333;
    --color-primary: #007bff;
}

[data-theme="dark"] {
    /* Dark theme */
    --color-background-primary: #1a1a1a;
    --color-text-primary: #ffffff;
    --color-primary: #4dabf7;
}
```

### Theme Variables

The component automatically applies `data-theme` attribute to the document:

```css
/* Light theme (default) */
:root {
    --theme-bg: #ffffff;
    --theme-text: #333333;
}

/* Dark theme */
[data-theme="dark"] {
    --theme-bg: #1a1a1a;
    --theme-text: #ffffff;
}
```

## Events

### Custom Events Emitted

#### `themeChanged`
Fired when the theme is changed.

**Event Detail:**
```javascript
{
    theme: 'dark', // New theme
    previousTheme: 'light' // Previous theme
}
```

### Event Listeners

- Listens for system theme changes via `prefers-color-scheme` media query
- Integrates with other components that need theme awareness

## Integration

### With CSS Custom Properties

The component automatically:
- Applies `data-theme` attribute to document
- Updates CSS custom properties for theme colors
- Provides smooth transitions between themes

### With Other Components

Other components can listen for theme changes:

```javascript
window.addEventListener('themeChanged', (e) => {
    console.log('Theme changed to:', e.detail.theme);
    // Update component styling
});
```

### With Navigation Menu

The component integrates seamlessly with the Navigation Menu:
- Automatically appears in mobile navigation menu
- Maintains state across desktop and mobile views
- Supports touch interactions on mobile

## Accessibility

### ARIA Support

- `aria-label`: "Toggle theme" for the button
- `title`: Theme name for tooltips
- Keyboard navigation support
- Screen reader friendly

### Keyboard Navigation

- **Tab**: Focus the theme switcher button
- **Enter/Space**: Toggle theme
- **Arrow Keys**: Not applicable (binary toggle)

## Browser Support

- Modern browsers with CSS custom properties support
- localStorage support for persistence
- `prefers-color-scheme` media query support
- CSS transitions support

## Performance

- Minimal DOM manipulation
- Efficient event handling
- CSS-based transitions for smooth performance
- Lightweight implementation

## Troubleshooting

### Theme Not Persisting
- Check localStorage availability
- Verify no conflicting localStorage keys
- Check for JavaScript errors in console

### System Preference Not Detected
- Check browser support for `prefers-color-scheme`
- Verify media query is working correctly
- Check for CSS conflicts

### Theme Transitions Not Smooth
- Ensure CSS transitions are supported
- Check for conflicting CSS rules
- Verify component is properly initialized

### Icon Not Updating
- Check CSS file is loaded correctly
- Verify icon classes are correct
- Check for CSS conflicts

## Examples

### Basic Usage

```javascript
// Initialize theme switcher
const themeSwitcher = new ThemeSwitcher();
themeSwitcher.init();

// Toggle theme programmatically
themeSwitcher.toggle();

// Set specific theme
themeSwitcher.setTheme('dark');
```

### Event Handling

```javascript
// Listen for theme changes
window.addEventListener('themeChanged', (e) => {
    const newTheme = e.detail.theme;
    console.log(`Theme changed to: ${newTheme}`);
    
    // Update component styling
    updateComponentThemes(newTheme);
});
```

### Custom Configuration

```javascript
// Initialize with custom settings
themeSwitcher.init({
    persistTheme: false, // Don't save to localStorage
    showAnimation: false // Disable transitions
});
```

### CSS Integration

```css
/* Component-specific theming */
.my-component {
    background-color: var(--color-background-primary);
    color: var(--color-text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* Dark theme specific styles */
[data-theme="dark"] .my-component {
    border: 1px solid var(--color-primary);
}
```

## Future Enhancements

- Support for additional themes (high contrast, sepia, etc.)
- Theme preview functionality
- Custom theme creation
- Theme-specific font loading
- Integration with design system
- Theme scheduling (auto-switch based on time)
- Multiple theme switchers on same page

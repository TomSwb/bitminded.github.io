# Navigation Menu Component

A responsive navigation menu with mobile hamburger menu, active page highlighting, and integrated component support.

## Overview

The Navigation Menu component provides a unified navigation system across all pages. It features a responsive design with a desktop horizontal menu and a mobile hamburger menu overlay, plus integration with Language Switcher and Theme Switcher components.

## Features

- **Responsive Design**: Desktop horizontal menu, mobile hamburger overlay
- **Active Page Highlighting**: Automatically highlights current page
- **Mobile Integration**: Language and Theme switchers in mobile menu
- **Self-Contained Translations**: Own translation system for navigation items
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Smooth Animations**: Hamburger-to-X animation and smooth transitions
- **Touch Optimized**: Mobile-friendly touch interactions

## Files

- `navigation-menu.html` - HTML structure with hamburger and links
- `navigation-menu.css` - Responsive styling and animations
- `navigation-menu.js` - JavaScript logic and component integration
- `locales/navigation-locales.json` - Translation files

## Usage

### Basic Initialization

```javascript
// Initialize navigation menu
const navMenu = new NavigationMenu();
navMenu.init();

// Initialize with custom configuration
navMenu.init({
    closeOnLinkClick: true,
    autoDetectPage: true
});
```

### Integration with Component Loader

```javascript
// Load via component loader
ComponentLoader.load('navigation-menu', {
    container: 'header',
    priority: 'high'
});
```

## API Reference

### Constructor

```javascript
new NavigationMenu()
```

### Methods

#### `init(config)`
Initializes the navigation menu component.

**Parameters:**
- `config` (Object, optional) - Configuration options
  - `closeOnLinkClick` (boolean) - Close mobile menu on link click (default: true)
  - `autoDetectPage` (boolean) - Auto-detect current page (default: true)

#### `addItem(id, text, href)`
Adds a new navigation item.

**Parameters:**
- `id` (string) - Unique identifier for the item
- `text` (string) - Display text
- `href` (string) - Link URL

#### `setActivePage(pageId)`
Sets the active page highlighting.

**Parameters:**
- `pageId` (string) - ID of the active page

#### `toggleMobileMenu()`
Toggles the mobile menu open/closed state.

#### `openMobileMenu()`
Opens the mobile menu.

#### `closeMobileMenu()`
Closes the mobile menu.

## Configuration

### Default Navigation Items

- **Home** (`nav-home`) - Links to `/`
- **Contact** (`nav-contact`) - Links to `/contact/`

### Mobile Menu Behavior

- **Desktop**: Horizontal menu with navigation links
- **Mobile/Tablet**: Hamburger menu with full-screen overlay
- **Components**: Language and Theme switchers appear in mobile menu only

## Styling

### CSS Classes

- `.navigation-menu` - Main container
- `.navigation-menu__hamburger` - Hamburger button
- `.navigation-menu__hamburger.active` - Active hamburger (X state)
- `.navigation-menu__links` - Navigation links container
- `.navigation-menu__links.active` - Active mobile menu
- `.navigation-menu__link` - Individual navigation link
- `.navigation-menu__link.active` - Currently active page
- `.navigation-menu__mobile-components` - Mobile components container

### Responsive Breakpoints

```css
/* Mobile and tablet */
@media (max-width: 768px) {
    /* Mobile hamburger menu */
}

/* Desktop */
@media (min-width: 769px) {
    /* Horizontal menu */
}
```

### Custom Properties

```css
:root {
    --nav-bg: #ffffff;
    --nav-text: #333333;
    --nav-hover: #f8f9fa;
    --nav-active: #007bff;
    --nav-mobile-overlay: rgba(0, 0, 0, 0.5);
}
```

## Events

### Custom Events Emitted

#### `navigationMenuOpened`
Fired when mobile menu is opened.

#### `navigationMenuClosed`
Fired when mobile menu is closed.

### Event Listeners

- Listens for `languageChanged` events to update translations
- Integrates with Language Switcher and Theme Switcher components

## Mobile Integration

### Component Loading

The navigation menu automatically:
- Detects existing Language Switcher and Theme Switcher components
- Clones them for mobile menu display
- Re-initializes them in compact mode
- Prevents duplicate loading with `mobileComponentsLoaded` flag

### Mobile Menu Features

- **Full-Screen Overlay**: Covers entire viewport
- **Centered Content**: Navigation links and components centered
- **Touch Optimized**: Proper touch feedback and interactions
- **Accessibility**: Maintains keyboard navigation and screen reader support

## Translations

### Translation Files

Located in `locales/navigation-locales.json`:

```json
{
  "en": {
    "translation": {
      "nav-home": "Home",
      "nav-contact": "Contact"
    }
  },
  "fr": {
    "translation": {
      "nav-home": "Accueil", 
      "nav-contact": "Contact"
    }
  }
}
```

### Translation Integration

- Automatically loads translations on initialization
- Updates when language changes
- No dependency on page-level translation files

## Accessibility

### ARIA Support

- `aria-label`: "Toggle navigation menu" for hamburger button
- `role="navigation"` on main container
- Proper focus management for mobile menu
- Screen reader announcements for state changes

### Keyboard Navigation

- **Tab**: Navigate between menu items
- **Enter/Space**: Activate menu items
- **Escape**: Close mobile menu
- **Arrow Keys**: Navigate between items (if multiple)

## Browser Support

- Modern browsers with CSS Grid/Flexbox support
- CSS animations support for smooth transitions
- Touch events support for mobile interactions

## Performance

- Efficient DOM manipulation
- Event delegation for better performance
- Minimal re-renders
- Optimized mobile component loading

## Troubleshooting

### Mobile Menu Not Opening
- Check if hamburger button is properly initialized
- Verify CSS is loaded correctly
- Check for JavaScript errors in console

### Components Not Appearing in Mobile Menu
- Ensure Language Switcher and Theme Switcher are loaded first
- Check `mobileComponentsLoaded` flag
- Verify component cloning logic

### Active Page Not Highlighted
- Check `detectCurrentPage()` method
- Verify page URLs match navigation links
- Check CSS for `.active` class styling

### Translation Issues
- Ensure translation files are accessible
- Check language change event handling
- Verify i18next integration

## Examples

### Basic Usage

```javascript
// Initialize navigation menu
const navMenu = new NavigationMenu();
navMenu.init();
```

### Adding Custom Navigation Items

```javascript
// Add new navigation item
navMenu.addItem('nav-about', 'About', '/about/');
navMenu.addItem('nav-services', 'Services', '/services/');
```

### Custom Configuration

```javascript
// Initialize with custom settings
navMenu.init({
    closeOnLinkClick: false, // Keep menu open after link click
    autoDetectPage: false    // Manual page detection
});

// Manually set active page
navMenu.setActivePage('nav-contact');
```

### Event Handling

```javascript
// Listen for menu state changes
document.addEventListener('navigationMenuOpened', () => {
    console.log('Mobile menu opened');
});

document.addEventListener('navigationMenuClosed', () => {
    console.log('Mobile menu closed');
});
```

## Future Enhancements

- Support for nested navigation menus
- Breadcrumb integration
- Search functionality
- User authentication state integration
- Custom mobile menu animations
- Support for additional languages

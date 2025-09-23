# Component Loader

A dynamic component loading system that manages the injection, initialization, and dependency management of modular components.

## Overview

The Component Loader is the core system that enables the modular component architecture. It dynamically loads HTML, CSS, and JavaScript files for components and injects them into the DOM, handling initialization order and dependency management.

## Features

- **Dynamic Loading**: Loads components on-demand from separate files
- **Dependency Management**: Handles component initialization order
- **Error Handling**: Graceful fallbacks for failed component loads
- **Performance Optimization**: Efficient loading and caching strategies
- **Priority System**: Critical, high, medium, and low priority loading
- **Container Targeting**: Load components into specific DOM containers
- **Event System**: Component lifecycle events and communication

## Files

- `component-loader.js` - Main loader logic and component management

## Usage

### Basic Component Loading

```javascript
// Load a component
ComponentLoader.load('component-name', {
    container: 'header',
    priority: 'high'
});
```

### Critical Component Loading

```javascript
// Load critical components first
ComponentLoader.loadCritical(['loading-screen', 'navigation-menu']);
```

### Component Initialization

```javascript
// Load and initialize component
ComponentLoader.load('theme-switcher', {
    container: 'footer',
    priority: 'medium',
    config: {
        persistTheme: true
    }
});
```

## API Reference

### Methods

#### `load(componentName, options)`
Loads a component dynamically.

**Parameters:**
- `componentName` (string) - Name of the component to load
- `options` (Object) - Loading options
  - `container` (string) - CSS selector for target container
  - `priority` (string) - Loading priority ('critical', 'high', 'medium', 'low')
  - `config` (Object) - Configuration to pass to component
  - `dependencies` (Array) - Array of component dependencies

#### `loadCritical(componentNames)`
Loads critical components that must be available immediately.

**Parameters:**
- `componentNames` (Array) - Array of critical component names

#### `unload(componentName)`
Unloads a component and cleans up resources.

**Parameters:**
- `componentName` (string) - Name of component to unload

#### `isLoaded(componentName)`
Checks if a component is currently loaded.

**Parameters:**
- `componentName` (string) - Name of component to check

**Returns:** `boolean` - Whether component is loaded

## Component Structure

Each component must follow this structure:

```
components/
├── component-name/
│   ├── component-name.html
│   ├── component-name.css
│   ├── component-name.js
│   └── README.md
```

### Component Requirements

#### HTML File
- Must contain the component's HTML structure
- Should be self-contained and not depend on external elements

#### CSS File
- Must contain all component-specific styles
- Should use CSS custom properties for theming
- Should be responsive and accessible

#### JavaScript File
- Must export a class with the same name as the component
- Must have an `init(config)` method
- Should handle cleanup in `destroy()` method if needed

### Example Component Structure

```javascript
// components/my-component/my-component.js
class MyComponent {
    constructor() {
        this.element = null;
        this.isInitialized = false;
    }
    
    init(config = {}) {
        // Initialize component
        this.isInitialized = true;
    }
    
    destroy() {
        // Cleanup if needed
        this.isInitialized = false;
    }
}

// Make available globally
window.MyComponent = MyComponent;
```

## Loading Priorities

### Critical Priority
- Loaded immediately, blocking other operations
- Used for essential components (loading screen, navigation)
- Examples: `loading-screen`, `navigation-menu`

### High Priority
- Loaded after critical components
- Used for important user interface elements
- Examples: `language-switcher`, `theme-switcher`

### Medium Priority
- Loaded after high priority components
- Used for secondary features
- Examples: `contact-form`, `modal`

### Low Priority
- Loaded last, non-blocking
- Used for optional or background features
- Examples: `analytics`, `chat-widget`

## Error Handling

The component loader includes comprehensive error handling:

### Loading Failures
- Graceful fallback for missing files
- Console warnings for debugging
- Continues loading other components

### Initialization Failures
- Catches component initialization errors
- Logs detailed error information
- Prevents single component failure from breaking others

### Dependency Failures
- Waits for dependencies to load
- Handles circular dependency detection
- Provides clear error messages

## Performance Optimization

### Loading Strategies

#### Parallel Loading
- Loads multiple components simultaneously when possible
- Respects priority order and dependencies
- Optimizes network requests

#### Caching
- Caches loaded components to prevent re-loading
- Efficient memory management
- Prevents duplicate requests

#### Lazy Loading
- Components can be loaded on-demand
- Reduces initial page load time
- Improves user experience

## Events

### Component Lifecycle Events

#### `componentLoaded`
Fired when a component is successfully loaded and initialized.

**Event Detail:**
```javascript
{
    componentName: 'theme-switcher',
    element: HTMLElement,
    config: Object
}
```

#### `componentLoadFailed`
Fired when a component fails to load.

**Event Detail:**
```javascript
{
    componentName: 'theme-switcher',
    error: Error,
    reason: string
}
```

### Custom Events

Components can emit custom events that other components can listen to:

```javascript
// Component emits event
window.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: 'dark' }
}));

// Other components listen
window.addEventListener('themeChanged', (e) => {
    console.log('Theme changed:', e.detail.theme);
});
```

## Integration Examples

### Page Initialization

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Load critical components first
    ComponentLoader.loadCritical(['loading-screen']);
    
    // Load main components
    ComponentLoader.load('navigation-menu', {
        container: 'header',
        priority: 'high'
    });
    
    ComponentLoader.load('language-switcher', {
        container: 'header',
        priority: 'high'
    });
    
    ComponentLoader.load('theme-switcher', {
        container: 'footer',
        priority: 'medium'
    });
});
```

### Dynamic Component Loading

```javascript
// Load component on user interaction
document.getElementById('load-contact-form').addEventListener('click', () => {
    ComponentLoader.load('contact-form', {
        container: '#contact-container',
        priority: 'medium'
    });
});
```

### Component Communication

```javascript
// Language switcher emits event
window.dispatchEvent(new CustomEvent('languageChanged', {
    detail: { language: 'fr' }
}));

// Navigation menu listens and updates
window.addEventListener('languageChanged', (e) => {
    this.updateTranslations(e.detail.language);
});
```

## Browser Support

- Modern browsers with ES6+ support
- Fetch API support for dynamic loading
- CSS custom properties support
- Custom events support

## Troubleshooting

### Component Not Loading
- Check file paths and naming conventions
- Verify component structure follows requirements
- Check console for error messages
- Ensure component class is properly exported

### Initialization Errors
- Verify `init()` method exists and is callable
- Check component dependencies are loaded
- Verify configuration object is valid
- Check for JavaScript errors in component code

### Performance Issues
- Check component loading order and priorities
- Verify no unnecessary re-loading
- Monitor network requests and caching
- Check for memory leaks in components

## Best Practices

### Component Design
- Keep components self-contained
- Use CSS custom properties for theming
- Implement proper error handling
- Follow accessibility guidelines

### Loading Strategy
- Load critical components first
- Use appropriate priorities
- Minimize dependencies
- Implement lazy loading where appropriate

### Performance
- Optimize component file sizes
- Use efficient CSS and JavaScript
- Implement proper cleanup
- Monitor loading performance

## Future Enhancements

- Hot reloading for development
- Component versioning system
- Advanced dependency resolution
- Component marketplace
- Automated testing integration
- Performance monitoring
- Component analytics

# Loading Screen Component

A smooth, animated loading screen that provides visual feedback during page initialization and language changes.

## Overview

The Loading Screen component displays an animated logo and spinner while the page loads, then smoothly fades out once all critical resources are ready. It integrates with the translation system to ensure proper timing.

## Features

- **Animated Logo**: Smooth logo animation during loading
- **Spinner Animation**: Rotating spinner for visual feedback
- **Smooth Transitions**: Fade-in/fade-out animations
- **Translation Integration**: Waits for translation system to be ready
- **Theme Aware**: Adapts to light/dark theme preferences
- **Performance Optimized**: Minimal impact on page load time

## Files

- `loading-screen.html` - HTML structure
- `loading-screen.css` - Styling and animations
- `loading-screen.js` - JavaScript logic and initialization

## Usage

### Basic Initialization

```javascript
// Initialize loading screen
LoadingScreen.init();

// Hide loading screen when ready
LoadingScreen.hide();

// Show loading screen (e.g., during language change)
LoadingScreen.show();
```

### Integration with Component Loader

```javascript
// Load via component loader
ComponentLoader.load('loading-screen', {
    container: 'head',
    priority: 'critical'
});
```

## API Reference

### Methods

#### `init(config)`
Initializes the loading screen component.

**Parameters:**
- `config` (Object, optional) - Configuration options
  - `showOnInit` (boolean) - Whether to show immediately on init (default: true)

#### `show()`
Displays the loading screen with fade-in animation.

#### `hide()`
Hides the loading screen with fade-out animation.

#### `setReadyFlag(type, value)`
Sets a ready flag to track when different systems are loaded.

**Parameters:**
- `type` (string) - Type of ready flag ('translation', 'components', etc.)
- `value` (boolean) - Whether the system is ready

## Configuration

The loading screen automatically integrates with:
- **Translation System**: Waits for `window.translationReady = true`
- **Component Loader**: Receives ready flags from other components
- **Theme System**: Adapts to current theme

## Styling

The component uses CSS custom properties for theming:

```css
:root {
    --loading-bg: #ffffff;
    --loading-text: #333333;
    --loading-spinner: #007bff;
}
```

## Events

### Custom Events Emitted

- `loadingScreenShown` - Fired when loading screen is displayed
- `loadingScreenHidden` - Fired when loading screen is hidden

### Event Listeners

- Listens for `languageChanged` events to show loading screen during language switches

## Dependencies

- **CSS Custom Properties**: For theming support
- **Translation System**: For timing coordination
- **Component Loader**: For integration with other components

## Browser Support

- Modern browsers with CSS animations support
- Graceful degradation for older browsers

## Performance Notes

- Uses `transform` and `opacity` for smooth animations
- Minimal DOM manipulation for optimal performance
- Automatically removes itself from DOM when hidden

## Troubleshooting

### Loading Screen Stuck Visible
- Check if `window.translationReady` is being set
- Verify all ready flags are being set correctly
- Check console for JavaScript errors

### Animation Issues
- Ensure CSS animations are supported
- Check for conflicting CSS rules
- Verify component is properly initialized

## Examples

### Manual Control

```javascript
// Show loading screen
LoadingScreen.show();

// Simulate loading time
setTimeout(() => {
    LoadingScreen.hide();
}, 2000);
```

### Integration with Page Load

```javascript
document.addEventListener('DOMContentLoaded', () => {
    LoadingScreen.init();
    
    // Hide when everything is ready
    if (window.translationReady) {
        LoadingScreen.hide();
    }
});
```

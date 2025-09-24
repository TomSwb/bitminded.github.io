# Auth Buttons Component

A responsive authentication component that displays login/signup buttons for unauthenticated users and a user menu for authenticated users.

## Features

- **Responsive Design**: Adapts to mobile and desktop layouts
- **Authentication States**: Shows appropriate UI based on user authentication status
- **User Menu**: Dropdown menu with account options for authenticated users
- **Supabase Integration**: Seamless integration with Supabase authentication
- **Translation Support**: Full internationalization with English and French
- **Accessibility**: Full keyboard navigation and screen reader support
- **Theme Support**: Matches your existing design system and color palette

## Files

- `auth-buttons.html` - HTML structure
- `auth-buttons.css` - Styling and responsive design
- `auth-buttons.js` - JavaScript functionality and Supabase integration
- `locales/auth-locales.json` - Translation files (English and French)
- `README.md` - This documentation

## Usage

### Automatic Integration

The auth-buttons component is automatically loaded on all main pages through the component loader system. No manual setup required!

### Component Loading

The component is loaded via `js/script.js`:

```javascript
// Automatically loads auth-buttons component
loadAuthButtons();
```

### Positioning

- **Desktop**: Auth buttons appear at the top center of the page (fixed positioning)
- **Mobile/Tablet**: Auth buttons appear in the navigation menu with compact styling, below the language switcher

### Manual Integration (if needed)

If you need to manually load the component:

```html
<!-- Include Supabase client first -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="/js/supabase-config.js"></script>

<!-- Include auth buttons component -->
<link rel="stylesheet" href="/components/auth-buttons/auth-buttons.css">
<script src="/components/auth-buttons/auth-buttons.js"></script>
```

### Compact Mode

The component supports compact mode for mobile navigation menus:

```css
.auth-buttons.compact {
    position: static;
    top: auto;
    left: auto;
    transform: none;
    margin: var(--spacing-sm) 0;
    width: 100%;
}
```

The compact class is automatically applied when the component is cloned for mobile navigation.

## States

### Logged Out State
- Shows "Login" and "Sign Up" buttons
- Buttons link to `/auth/` with appropriate action parameters
- Responsive layout (stacked on mobile, side-by-side on desktop)

### Logged In State
- Shows user avatar (first letter of name/email)
- Shows user name
- Dropdown menu with account options:
  - Account settings
  - Preferences
  - Logout

### Loading State
- Uses the global loading screen component
- Shows "Checking authentication..." during auth state checks
- Shows "Logging out..." during logout process
- Integrates seamlessly with your existing loading system

## Translation Support

The component includes full internationalization support with English and French translations.

### Translation Keys

The following translation keys are available:

- `auth.login` - "Login" / "Connexion"
- `auth.signup` - "Sign Up" / "S'inscrire"
- `auth.account` - "Account" / "Compte"
- `auth.preferences` - "Preferences" / "Préférences"
- `auth.logout` - "Logout" / "Déconnexion"
- `auth.user` - "User" / "Utilisateur"

### Language Detection

The component automatically detects the current language from:
1. `window.languageSwitcher.getCurrentLanguage()` (if available)
2. `localStorage.getItem('language')` (fallback)
3. Defaults to `'en'` if neither is available

### Manual Language Switching

To manually switch languages:

```javascript
// Set language in localStorage
localStorage.setItem('language', 'fr');

// Refresh translations
if (window.authButtons) {
    window.authButtons.refreshTranslations();
}
```

### Adding New Languages

To add support for additional languages:

1. Add the language to `locales/auth-locales.json`:

```json
{
  "es": {
    "translation": {
      "auth.login": "Iniciar sesión",
      "auth.signup": "Registrarse",
      // ... other keys
    }
  }
}
```

2. The component will automatically use the new language when detected.

## Loading Screen Integration

The auth-buttons component integrates with your existing loading screen component for a consistent user experience.

### Integration Features

- **Automatic Integration**: Uses `window.loadingScreen` if available
- **Contextual Messages**: Shows relevant loading messages during auth operations
- **Seamless Experience**: No custom loading states, uses your global loading system

### Loading Messages

- **Authentication Check**: "Checking authentication..."
- **Logout Process**: "Logging out..."

### Usage

The component automatically integrates with your loading screen. No additional setup required:

```javascript
// The component will automatically use the loading screen
if (window.loadingScreen) {
    window.loadingScreen.updateText('Checking authentication...');
}
```

## Styling

The component uses your existing CSS custom properties:

- **Colors**: `--color-primary`, `--color-secondary`, `--color-background-primary`
- **Spacing**: `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- **Border Radius**: `--radius-sm`, `--radius-md`
- **Transitions**: `--transition-fast`

### Customization

You can customize the appearance by overriding CSS variables or adding custom styles:

```css
/* Custom button colors */
.auth-buttons__button--login {
    --custom-bg: #your-color;
}

/* Custom dropdown width */
.auth-buttons__dropdown {
    min-width: 200px;
}
```

## JavaScript API

The component exposes a global `AuthButtons` class instance as `window.authButtons`:

```javascript
// Check if user is authenticated
if (window.authButtons.isAuthenticated()) {
    console.log('User is logged in');
}

// Get current user
const user = window.authButtons.getCurrentUser();
console.log('Current user:', user);

// Check initialization status
if (window.authButtons.isInitialized) {
    console.log('Component is ready');
}
```

## Events

The component listens for Supabase authentication state changes and automatically updates the UI:

- `SIGNED_IN` - User logs in
- `SIGNED_OUT` - User logs out  
- `TOKEN_REFRESHED` - Session token is refreshed

## Accessibility

- **Keyboard Navigation**: Full keyboard support with Tab navigation
- **Screen Readers**: Proper ARIA attributes and semantic HTML
- **Focus Management**: Clear focus indicators
- **Escape Key**: Closes dropdown menu
- **Click Outside**: Closes dropdown when clicking elsewhere

## Mobile Support

- **Touch-Friendly**: Large touch targets (60px minimum)
- **Responsive Layout**: Adapts to mobile screen sizes
- **Touch Effects**: Visual feedback for touch interactions
- **No Hover States**: Proper mobile interaction patterns

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires Supabase client library

## Dependencies

- **Supabase Client**: `@supabase/supabase-js`
- **Supabase Config**: Your `js/supabase-config.js` file

## Error Handling

The component includes comprehensive error handling:

- **Network Errors**: Graceful fallback to logged out state
- **Supabase Errors**: Console logging with user-friendly messages
- **Missing Elements**: Validation of required DOM elements
- **Initialization Errors**: Safe fallback behavior

## Performance

- **Lazy Loading**: Only initializes when component element exists
- **Event Delegation**: Efficient event handling
- **Memory Management**: Proper cleanup on component destruction
- **Cached Elements**: DOM elements cached for performance

## Testing

### Manual Testing Checklist

- [ ] Component loads correctly
- [ ] Shows login/signup buttons when logged out
- [ ] Shows user menu when logged in
- [ ] Dropdown opens and closes properly
- [ ] Logout functionality works
- [ ] Responsive design on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility

### Integration Testing

- [ ] Works with existing navigation component
- [ ] Supabase authentication integration
- [ ] Theme switching compatibility
- [ ] Language switching compatibility

## Troubleshooting

### Common Issues

1. **Component not showing**: Check that Supabase client is loaded first
2. **Authentication not working**: Verify Supabase configuration
3. **Styling issues**: Ensure CSS variables are defined
4. **Mobile layout problems**: Check responsive CSS rules

### Debug Mode

Enable debug logging by opening browser console. The component logs:
- Initialization status
- Authentication state changes
- Error messages
- User interactions

## Future Enhancements

Potential improvements for future versions:

- **User Avatar Images**: Support for profile pictures
- **Notification Badges**: Show notification counts
- **Quick Actions**: Additional dropdown menu items
- **Animation Options**: More transition effects
- **Custom Themes**: Additional styling options

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Supabase configuration
3. Test with different authentication states
4. Check responsive design on different screen sizes

---

*Last updated: [Current Date]*
*Version: 1.0.0*
*Compatible with: Supabase v2.x*

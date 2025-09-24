# Signup Form Component

A complete signup form component with Supabase authentication integration, form validation, and translation support.

## Files

- `signup-form.html` - HTML structure
- `signup-form.css` - Styling and responsive design
- `signup-form.js` - JavaScript functionality and Supabase integration

## Features

### ✅ Authentication Integration
- Supabase `signUp()` integration
- Email verification flow
- Automatic redirect to verification page
- Error handling for common signup issues

### ✅ Form Validation
- Real-time email validation
- Password strength requirements (minimum 6 characters)
- Password confirmation matching
- Terms and conditions checkbox validation
- Field-specific error messages

### ✅ User Experience
- Password visibility toggle
- Loading states during submission
- Success message after account creation
- Responsive design for mobile and desktop
- Accessibility features (ARIA labels, keyboard navigation)

### ✅ Translation Support
- Event-driven translation updates
- Uses existing translation system
- FOUC prevention with `translatable-content` class
- Support for English and French

### ✅ Error Handling
- User-friendly error messages
- Field-specific error display
- Supabase error mapping
- Network error handling

## Usage

The component automatically initializes when the DOM is ready. It integrates with:

- **Supabase**: For user authentication
- **Translation System**: For multi-language support
- **Component Loader**: For dynamic loading

## Styling

Uses CSS custom properties from the design system:
- `--color-primary`, `--color-secondary`
- `--color-background-primary`, `--color-text-primary`
- `--spacing-*` variables for consistent spacing
- `--radius-*` variables for border radius
- `--transition-fast` for smooth animations

## Translation Keys

The component expects these translation keys in the locale files:

```json
{
  "signup.title": "Create Account",
  "signup.subtitle": "Join BitMinded today",
  "signup.email": "Email Address",
  "signup.password": "Password",
  "signup.confirmPassword": "Confirm Password",
  "signup.agreeTerms": "I agree to the",
  "signup.termsLink": "Terms of Service",
  "signup.and": "and",
  "signup.privacyLink": "Privacy Policy",
  "signup.submit": "Create Account",
  "signup.creating": "Creating account...",
  "signup.successTitle": "Account Created!",
  "signup.successMessage": "Please check your email to verify your account."
}
```

## Integration

To use this component in the auth page:

1. Load the HTML into the signup form container
2. Include the CSS file
3. Include the JavaScript file
4. The component will auto-initialize

Example:
```html
<div id="signup-form-container">
    <!-- Component will be loaded here -->
</div>
```

## Browser Support

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Form validation API support
- Local Storage support for language preferences

# CAPTCHA Component

A reusable Cloudflare Turnstile CAPTCHA component for BitMinded applications.

## Features

- **Cloudflare Turnstile Integration**: Uses Cloudflare's privacy-focused CAPTCHA service
- **Reusable Component**: Can be used across different forms and pages
- **Accessibility Support**: ARIA labels, keyboard navigation, and screen reader support
- **Theme Support**: Light, dark, and auto themes
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error handling and user feedback
- **Event System**: Custom events for integration with other components

## Usage

### Basic Implementation

```html
<!-- Include the component files -->
<link rel="stylesheet" href="components/captcha/captcha.css">
<script src="components/captcha/captcha.js"></script>

<!-- Add the HTML structure -->
<div id="captcha-container">
    <div id="captcha-widget"></div>
    <div id="captcha-error" role="alert" aria-live="polite"></div>
    <div id="captcha-loading">
        <div class="captcha-spinner"></div>
        <span class="captcha-loading-text">Loading security verification...</span>
    </div>
</div>

<!-- Initialize the component -->
<script>
const captcha = new CaptchaComponent({
    siteKey: '0x4AAAAAAB3ePnQXAhy39NwT',
    theme: 'auto',
    size: 'normal'
});
</script>
```

### Advanced Configuration

```javascript
const captcha = new CaptchaComponent({
    siteKey: '0x4AAAAAAB3ePnQXAhy39NwT',
    theme: 'dark', // 'light', 'dark', 'auto'
    size: 'compact', // 'normal', 'compact'
    language: 'en', // 'auto' or specific language code
    callback: (token) => {
        console.log('CAPTCHA verified:', token);
        // Handle successful verification
    },
    errorCallback: (error) => {
        console.error('CAPTCHA error:', error);
        // Handle verification error
    },
    expiredCallback: () => {
        console.log('CAPTCHA expired');
        // Handle expiration
    },
    timeoutCallback: () => {
        console.log('CAPTCHA timeout');
        // Handle timeout
    }
});
```

### Event Listeners

```javascript
// Listen for CAPTCHA events
document.getElementById('captcha-container').addEventListener('captchaSuccess', (e) => {
    console.log('CAPTCHA verified:', e.detail.token);
});

document.getElementById('captcha-container').addEventListener('captchaError', (e) => {
    console.error('CAPTCHA error:', e.detail.error);
});

document.getElementById('captcha-container').addEventListener('captchaExpired', () => {
    console.log('CAPTCHA expired');
});

document.getElementById('captcha-container').addEventListener('captchaTimeout', () => {
    console.log('CAPTCHA timeout');
});
```

### Form Integration

```javascript
// Check if CAPTCHA is verified before form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!captcha.isCaptchaVerified()) {
        alert('Please complete the security verification');
        return;
    }
    
    const token = captcha.getToken();
    // Proceed with form submission
    submitForm(token);
}

// Reset CAPTCHA after form submission
function resetForm() {
    captcha.reset();
}
```

### Server-Side Verification

```javascript
// Verify the CAPTCHA token on the server
async function verifyCaptcha(token) {
    const isValid = await captcha.verifyToken(token);
    return isValid;
}
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `siteKey` | string | `'0x4AAAAAAB3ePnQXAhy39NwT'` | Cloudflare Turnstile site key |
| `theme` | string | `'auto'` | Widget theme: 'light', 'dark', 'auto' |
| `size` | string | `'normal'` | Widget size: 'normal', 'compact' |
| `language` | string | `'auto'` | Widget language or 'auto' |
| `callback` | function | `null` | Success callback function |
| `errorCallback` | function | `null` | Error callback function |
| `expiredCallback` | function | `null` | Expiration callback function |
| `timeoutCallback` | function | `null` | Timeout callback function |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `reset()` | none | void | Reset the CAPTCHA widget |
| `getToken()` | none | string\|null | Get the current verification token |
| `isCaptchaVerified()` | none | boolean | Check if CAPTCHA is verified |
| `verifyToken(token)` | string | Promise<boolean> | Verify token on server |
| `destroy()` | none | void | Destroy the component |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `captchaSuccess` | `{ token }` | Fired when CAPTCHA is verified |
| `captchaError` | `{ error }` | Fired when verification fails |
| `captchaExpired` | none | Fired when CAPTCHA expires |
| `captchaTimeout` | none | Fired when CAPTCHA times out |

## Styling

The component uses CSS custom properties for theming:

```css
:root {
    --border-color: #e1e5e9;
    --border-hover-color: #c1c5c9;
    --error-color: #dc3545;
    --success-color: #28a745;
    --background-color: #ffffff;
    --text-muted: #6c757d;
    --primary-color: #007bff;
    --focus-color: #007bff;
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
    :root {
        --dark-background: #1a1a1a;
        --dark-border: #333;
        --dark-border-hover: #555;
        --dark-text-muted: #888;
    }
}
```

## Security Considerations

1. **Server-Side Verification**: Always verify CAPTCHA tokens on the server
2. **Token Expiration**: Tokens expire after a short time (typically 5 minutes)
3. **Rate Limiting**: Implement rate limiting on your server endpoints
4. **Error Handling**: Don't expose sensitive information in error messages

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies

- Cloudflare Turnstile API
- Modern JavaScript (ES6+)

## License

This component is part of the BitMinded project.

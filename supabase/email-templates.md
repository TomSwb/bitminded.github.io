# BitMinded Custom Email Templates

## Email Template Configuration

### 1. Confirm Signup Email

**Subject:** Welcome to BitMinded - Confirm Your Account

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BitMinded</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #cfde67;
            margin-bottom: 10px;
        }
        .tagline {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #cfde67;
            color: #272b2e;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #d286bd;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .highlight {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #cfde67;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BitMinded</div>
            <div class="tagline">Professional Digital Solutions</div>
        </div>
        
        <div class="content">
            <h2>Welcome to BitMinded!</h2>
            
            <p>Thank you for signing up for BitMinded. We're excited to have you join our community of professionals who rely on our digital tools and solutions.</p>
            
            <div class="highlight">
                <strong>Next Step:</strong> Please confirm your email address to activate your account and start using our professional tools.
            </div>
            
            <p>Click the button below to confirm your account:</p>
            
            <a href="{{ .ConfirmationURL }}" class="button">Confirm My Account</a>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">{{ .ConfirmationURL }}</p>
            
            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Access our professional unit converter</li>
                <li>Use DevFlow for AI-powered project planning</li>
                <li>Explore our growing suite of digital tools</li>
                <li>Manage your account and preferences</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{ .Email }}. If you didn't create an account with BitMinded, you can safely ignore this email.</p>
            <p>© 2024 BitMinded. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 2. Magic Link Email

**Subject:** Your BitMinded Login Link

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BitMinded Login</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #cfde67;
            margin-bottom: 10px;
        }
        .tagline {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #cfde67;
            color: #272b2e;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #d286bd;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .security-notice {
            background: #fff3cd;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BitMinded</div>
            <div class="tagline">Professional Digital Solutions</div>
        </div>
        
        <div class="content">
            <h2>Your BitMinded Login Link</h2>
            
            <p>You requested a login link for your BitMinded account. Click the button below to sign in securely:</p>
            
            <a href="{{ .ConfirmationURL }}" class="button">Sign In to BitMinded</a>
            
            <div class="security-notice">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this login link, please ignore this email.
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">{{ .ConfirmationURL }}</p>
            
            <p><strong>Need Help?</strong></p>
            <p>If you're having trouble accessing your account, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{ .Email }}. If you didn't request this login link, you can safely ignore this email.</p>
            <p>© 2024 BitMinded. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 3. Password Reset Email

**Subject:** Reset Your BitMinded Password

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - BitMinded</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #cfde67;
            margin-bottom: 10px;
        }
        .tagline {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #cfde67;
            color: #272b2e;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #d286bd;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .security-notice {
            background: #fff3cd;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BitMinded</div>
            <div class="tagline">Professional Digital Solutions</div>
        </div>
        
        <div class="content">
            <h2>Reset Your Password</h2>
            
            <p>You requested to reset your BitMinded account password. Click the button below to create a new password:</p>
            
            <a href="{{ .ConfirmationURL }}" class="button">Reset My Password</a>
            
            <div class="security-notice">
                <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request a password reset, please ignore this email and consider changing your password.
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">{{ .ConfirmationURL }}</p>
            
            <p><strong>Password Tips:</strong></p>
            <ul>
                <li>Use at least 8 characters</li>
                <li>Include uppercase and lowercase letters</li>
                <li>Include numbers and special characters</li>
                <li>Don't reuse passwords from other accounts</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{ .Email }}. If you didn't request a password reset, you can safely ignore this email.</p>
            <p>© 2024 BitMinded. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 4. Email Change Confirmation

**Subject:** Confirm Your New Email Address - BitMinded

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Change Confirmation - BitMinded</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #cfde67;
            margin-bottom: 10px;
        }
        .tagline {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #cfde67;
            color: #272b2e;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #d286bd;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .highlight {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #cfde67;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BitMinded</div>
            <div class="tagline">Professional Digital Solutions</div>
        </div>
        
        <div class="content">
            <h2>Confirm Your New Email Address</h2>
            
            <p>You requested to change your BitMinded account email address. To complete this change, please confirm your new email address by clicking the button below:</p>
            
            <div class="highlight">
                <strong>New Email:</strong> {{ .Email }}
            </div>
            
            <a href="{{ .ConfirmationURL }}" class="button">Confirm New Email</a>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">{{ .ConfirmationURL }}</p>
            
            <p><strong>Important:</strong> This confirmation link will expire in 24 hours. If you don't confirm your new email address, your account will continue to use your previous email address.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{ .Email }}. If you didn't request an email change, please contact our support team immediately.</p>
            <p>© 2024 BitMinded. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## How to Configure These Templates in Supabase

### Step 1: Go to Authentication Settings
1. **Open your Supabase dashboard**
2. **Go to Authentication** → **Settings**
3. **Scroll down to "Email Templates"**

### Step 2: Configure Each Template
1. **Confirm signup** - Copy the first HTML template
2. **Magic Link** - Copy the second HTML template  
3. **Reset password** - Copy the third HTML template
4. **Email change** - Copy the fourth HTML template

### Step 3: Update Template Variables
Make sure these variables are in your templates:
- `{{ .ConfirmationURL }}` - The confirmation/reset link
- `{{ .Email }}` - The user's email address

### Step 4: Test the Templates
1. **Save each template**
2. **Test by creating a new account**
3. **Check that emails look professional**

## Customization Options

### Brand Colors
- **Primary:** `#cfde67` (BitMinded green)
- **Secondary:** `#d286bd` (BitMinded pink)
- **Dark:** `#272b2e` (BitMinded dark)
- **Light:** `#eee9e4` (BitMinded light)

### Logo Options
You can replace the text logo with an actual image:
```html
<img src="https://bitminded.ch/logo.png" alt="BitMinded" style="height: 40px;">
```

### Additional Information
You can add:
- **Support contact information**
- **Social media links**
- **Company address**
- **Unsubscribe links**

Would you like me to help you configure any specific aspects of these email templates?

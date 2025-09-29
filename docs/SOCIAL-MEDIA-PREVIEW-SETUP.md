# Social Media Preview Setup Guide

## Overview

This guide explains how to set up rich previews for your website when links are shared on social media platforms and messaging apps. These previews are controlled by **Open Graph (OG)** and **Twitter Card** meta tags.

## What Are Social Media Previews?

When someone shares a link to your website on platforms like:
- Facebook, LinkedIn, WhatsApp (use Open Graph tags)
- Twitter/X (uses Twitter Card tags)
- Slack, Discord, Telegram (typically use Open Graph)

The platform generates a rich preview card showing:
- **Title** - The page title
- **Description** - Brief summary of the content
- **Image** - Preview thumbnail
- **URL** - The actual link

## Current Status

✅ **Main page (`/`)** - Has basic meta tags  
❌ **Other pages** - Missing social media meta tags:
- `/contact/` - Contact page
- `/auth/` - Authentication pages
- `/legal-pages/privacy/` - Privacy policy
- `/legal-pages/terms/` - Terms of service

## Required Meta Tags

### Open Graph Tags (Facebook, LinkedIn, WhatsApp, etc.)
```html
<!-- Open Graph meta tags for social media sharing -->
<meta property="og:title" content="Page Title - BitMinded">
<meta property="og:description" content="Brief description of the page content">
<meta property="og:image" content="https://bitminded.github.io/path/to/preview-image.png">
<meta property="og:url" content="https://bitminded.github.io/page-url">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BitMinded">
```

### Twitter Card Tags (Twitter/X)
```html
<!-- Twitter Card meta tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page Title - BitMinded">
<meta name="twitter:description" content="Brief description of the page content">
<meta name="twitter:image" content="https://bitminded.github.io/path/to/preview-image.png">
```

### Additional SEO Tags
```html
<!-- Additional SEO meta tags -->
<meta name="description" content="SEO description for search engines">
<meta name="keywords" content="relevant, keywords, for, seo">
<meta name="author" content="BitMinded">
```

## Implementation Options

### 1. Hardcoded Approach (Simplest)
Add the meta tags directly to each HTML page's `<head>` section.

**Pros**: Simple, works immediately  
**Cons**: Code duplication, harder to maintain

### 2. Component-Based Approach (Recommended)
Create a reusable meta tags component using your existing component system:

1. Create `/components/meta-tags/meta-tags.js`
2. Create `/components/meta-tags/meta-tags.html` (empty, just for structure)
3. Each page calls the component with page-specific data:

```javascript
// In each page's script
componentLoader.load('meta-tags', {
    config: {
        title: 'Contact - BitMinded',
        description: 'Get in touch with BitMinded for digital solutions',
        image: 'https://bitminded.github.io/icons/icon-512x512.png',
        url: 'https://bitminded.github.io/contact/'
    }
});
```

### 3. Server-Side Generation (Advanced)
Generate meta tags during build time or server-side rendering.

## Page-Specific Examples

### Contact Page (`/contact/`)
```html
<meta property="og:title" content="Contact - BitMinded">
<meta property="og:description" content="Get in touch with BitMinded for digital solutions and consulting services. We're here to help your business thrive.">
<meta property="og:url" content="https://bitminded.github.io/contact/">
```

### Auth Page (`/auth/`)
```html
<meta property="og:title" content="Sign In - BitMinded">
<meta property="og:description" content="Sign in to your BitMinded account to access digital solutions and consulting services.">
<meta property="og:url" content="https://bitminded.github.io/auth/">
```

### Privacy Policy (`/legal-pages/privacy/`)
```html
<meta property="og:title" content="Privacy Policy - BitMinded">
<meta property="og:description" content="Learn how BitMinded protects and manages your personal information and privacy.">
<meta property="og:url" content="https://bitminded.github.io/legal-pages/privacy/">
```

## Image Recommendations

### Current Setup
- Using existing icon: `https://bitminded.github.io/icons/icon-512x512.png`
- Works but not optimal for social sharing

### What Are Dedicated Social Preview Images?

A **dedicated social preview image** is a custom image specifically designed for social media sharing, separate from your regular website images or icons.

#### How It Works
When someone shares your link, social platforms look for an image to display in the preview card. They use this priority order:

1. **Open Graph image** (`og:image`) - **Your custom preview image**
2. **Twitter image** (`twitter:image`) - **Your custom preview image**  
3. **Fallback** - First image found on the page
4. **Default** - Platform's generic placeholder

#### Visual Comparison

**Current (Icon)**
```
┌─────────────┐
│    [Logo]   │  ← Square, just your logo
│             │
└─────────────┘
```

**Dedicated Preview**
```
┌─────────────────────────────────┐
│ [Logo] BitMinded                │  ← Rectangular, branded
│        Digital Solutions        │
│        & Consulting             │
└─────────────────────────────────┘
```

#### What Makes a Good Preview Image

**Design Elements**
- **Your logo** - Prominent but not overwhelming
- **Company name** - Clear, readable font
- **Tagline** - Brief description of what you do
- **Background** - Professional color scheme
- **Brand colors** - Consistent with your website

**Technical Specs**
- **Size**: 1200x630px (Facebook/LinkedIn standard)
- **Format**: PNG or JPG
- **File size**: Under 5MB
- **Text**: Large enough to read on mobile

#### Page-Specific Images

You can create **different preview images** for different pages:

**Homepage**
```
┌─────────────────────────────────┐
│ [Logo] BitMinded                │
│        Welcome to Digital       │
│        Solutions                │
└─────────────────────────────────┘
```

**Contact Page**
```
┌─────────────────────────────────┐
│ [Logo] BitMinded                │
│        Get In Touch             │
│        Let's Work Together      │
└─────────────────────────────────┘
```

#### Creation Options

**Simple Tools**
- **Canva** - Templates for social media images
- **Figma** - Free design tool
- **Photoshop/GIMP** - Professional editing

**Template Structure**
```
Background: Your brand color (#272B2E)
Logo: Top left (your existing logo)
Title: "BitMinded" (large, white text)
Subtitle: "Digital Solutions & Consulting" (smaller, #CFDE67)
```

#### File Organization

Create in your `/images/` folder:
```
/images/
  ├── social-preview-home.png      ← Homepage preview
  ├── social-preview-contact.png   ← Contact page preview
  ├── social-preview-auth.png      ← Auth page preview
  └── social-preview-default.png   ← Fallback for other pages
```

#### Implementation

Then reference in your meta tags:
```html
<!-- Homepage -->
<meta property="og:image" content="https://bitminded.github.io/images/social-preview-home.png">

<!-- Contact page -->
<meta property="og:image" content="https://bitminded.github.io/images/social-preview-contact.png">
```

### Recommended Improvements
1. **Create dedicated social preview images** (1200x630px)
2. **Use consistent branding** across all previews
3. **Include your logo and tagline**
4. **Make text readable** at small sizes

### Image Requirements
- **Open Graph**: 1200x630px (recommended)
- **Twitter**: 1200x675px (recommended)
- **Minimum**: 600x315px
- **Format**: PNG or JPG
- **File size**: Under 5MB

## Testing Your Previews

### Online Tools
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Manual Testing
1. Share your URL on each platform
2. Check how the preview appears
3. Adjust meta tags as needed
4. Clear platform cache if changes don't appear

## Multilingual Considerations

### Current Limitation
Meta tags are **static HTML** and cannot be dynamically translated using your current i18next setup.

### Solutions
1. **Language-specific URLs**: `/en/`, `/es/`, `/fr/`
2. **Server-side detection**: Detect language and serve appropriate meta tags
3. **Accept English-only**: Keep meta tags in English for consistency

## Implementation Priority

### High Priority
1. **Contact page** - People frequently share contact links
2. **Main pages** - Homepage, key landing pages

### Medium Priority
3. **Auth page** - Rarely shared but good for completeness
4. **Legal pages** - Privacy, Terms (rarely shared)

### Low Priority
5. **Account pages** - Private user areas (typically not shared)

## Maintenance Notes

- **Update descriptions** when page content changes
- **Refresh preview images** for seasonal updates
- **Test regularly** across different platforms
- **Monitor analytics** to see which pages get shared most

## Next Steps

1. Choose implementation approach (hardcoded vs component-based)
2. Create page-specific meta tags for high-priority pages
3. Design and create dedicated social preview images
4. Test previews across major platforms
5. Document any custom configurations or exceptions

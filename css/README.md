# CSS Architecture Documentation

## Overview

This CSS architecture follows modern best practices for separation of concerns, maintainability, and scalability. The styles are organized into modular files that can be easily maintained and extended.

## File Structure

```
css/
├── main.css          # Main entry point - imports all modules
├── variables.css     # CSS custom properties and design tokens
├── base.css          # Base styles, typography, and resets
├── components.css    # Reusable UI components
├── layout.css        # Page structure and responsive design
├── utilities.css     # Helper classes and utility functions
└── README.md         # This documentation file
```

## Import Order

The CSS files are imported in a specific order to ensure proper cascade and inheritance:

1. **variables.css** - CSS custom properties (design tokens)
2. **base.css** - Base styles and typography
3. **components.css** - Reusable components
4. **layout.css** - Layout and responsive design
5. **utilities.css** - Utility classes

## File Descriptions

### variables.css
Contains all CSS custom properties (design tokens) including:
- Color palette and semantic color mapping
- Typography scale (responsive and fixed)
- Spacing scale
- Border radius values
- Shadow definitions
- Transition timings
- Z-index scale
- Breakpoint definitions

### base.css
Contains foundational styles:
- CSS reset and box-sizing
- Body and root styles
- Typography (headings, paragraphs, links)
- Base button and image styles
- Accessibility considerations (reduced motion)

### components.css
Contains reusable UI components:
- Button variants (language switcher, contact, hamburger)
- Navigation components (menu, pages, dropdowns)
- Language switcher
- Contact link component
- Animations and keyframes

### layout.css
Contains layout-specific styles:
- Header layout
- Responsive breakpoints (tablet, mobile)
- Mobile-specific adjustments
- Desktop-specific rules

### utilities.css
Contains utility classes for:
- Display utilities (hidden, visible, screen reader only)
- Text utilities (alignment, colors, weights)
- Spacing utilities (margins, padding)
- Flexbox utilities
- Position utilities
- Size utilities
- Border utilities
- Background utilities
- Transition utilities
- Responsive utilities

## Usage

### In HTML Files
Simply link to the main CSS file:
```html
<link rel="stylesheet" href="css/main.css">
```

### Adding New Styles

1. **New Design Tokens**: Add to `variables.css`
2. **New Components**: Add to `components.css`
3. **New Layout Rules**: Add to `layout.css`
4. **New Utilities**: Add to `utilities.css`
5. **Base Styles**: Add to `base.css` (rarely needed)

### Best Practices

1. **Use CSS Custom Properties**: Always use variables from `variables.css`
2. **Component-First**: Create reusable components in `components.css`
3. **Mobile-First**: Write responsive styles with mobile-first approach
4. **Semantic Naming**: Use descriptive class names that indicate purpose
5. **Consistent Spacing**: Use the spacing scale from variables
6. **Accessibility**: Always consider accessibility in your styles

## Responsive Design

The architecture uses a mobile-first approach with these breakpoints:
- Mobile: up to 480px
- Tablet: up to 768px
- Desktop: 481px and above

## Color System

The color system uses semantic naming:
- `--color-primary`: Main accent color (green)
- `--color-secondary`: Secondary accent color (pink)
- `--color-background`: Background color (dark)
- `--color-text`: Primary text color (light)
- `--color-text-primary`: Accent text color (green)

## Benefits

1. **Maintainability**: Easy to find and modify specific styles
2. **Scalability**: Easy to add new components and features
3. **Consistency**: Centralized design tokens ensure consistency
4. **Performance**: Modular loading allows for optimization
5. **Team Collaboration**: Clear structure makes it easy for multiple developers
6. **Reusability**: Components can be easily reused across pages

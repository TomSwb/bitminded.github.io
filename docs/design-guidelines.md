# Design Guidelines - Bitminder.ch

## Color Palette

### Primary Colors

- **Dark Background**: `rgb(39, 43, 46)` - `#272B2E`
- **Accent Green**: `rgb(207, 222, 103)` - `#CFDE67`
- **Accent Pink**: `rgb(210, 134, 189)` - `#D286BD`
- **Light Text**: `rgb(238, 233, 228)` - `#EEE9E4`

### Usage

- **Background**: Use dark background as the primary surface
- **Primary Text**: Use accent green for main headings and navigation
- **Secondary Elements**: Use accent pink for buttons and interactive elements
- **Body Text**: Use light text for readable content

## Typography

### Font Sizing

- **Headings**: Use `clamp()` for responsive typography
  - H1: `clamp(2rem, 5vw, 3.25rem)` (32px - 52px)
  - H2: `clamp(1.5rem, 4vw, 2.5rem)` (24px - 40px)
  - Paragraphs: `clamp(1rem, 2.5vw, 1.5rem)` (16px - 24px)

### Best Practices

- Use `rem` units for consistent scaling
- Implement responsive typography with `clamp()`
- Maintain minimum 44px touch targets for mobile

## Layout

### Navigation

- **Desktop**: Horizontal layout with bordered container
- **Tablet**: Responsive flexbox with wrapping
- **Mobile**: Hamburger menu with slide-out navigation

### Responsive Breakpoints

- **Mobile**: `max-width: 480px`
- **Tablet**: `max-width: 768px`
- **Desktop**: `min-width: 769px`

## Accessibility

### Key Requirements

- Minimum 44px touch targets
- Focus states for keyboard navigation
- Reduced motion support for users with motion sensitivity
- Proper contrast ratios
- Semantic HTML structure

### Implementation

```css
/* Focus states */
.pages:focus {
  outline: 2px solid var(--accent-green);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Interactive Elements

### Buttons

- Use accent pink for primary actions
- Implement hover effects with smooth transitions
- Include subtle lift effects (`translateY(-2px)`)
- Add soft shadows on hover

### Navigation

- Green accent for menu items
- Pink accent on hover
- Smooth color transitions (0.2s ease)

## Mobile Considerations

### Touch-Friendly Design

- Minimum 44px touch targets
- Adequate spacing between interactive elements
- Easy-to-reach navigation placement

### Performance

- Optimize images for mobile
- Use efficient CSS animations
- Minimize layout shifts

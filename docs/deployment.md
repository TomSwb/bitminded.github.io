# Deployment Guide - Bitminded.ch

## Overview

The Bitminded.ch website uses a two-repository system:

- **Development**: `bitminded-dev` (this repository)
- **Production**: `bitminded.github.io`

## Development Workflow

### 1. Local Development

```bash
# Navigate to development directory
cd /home/tomswb/programming/bitminded-dev

# Start development server
python3 -m http.server 8000
# OR
npx serve . -p 8000
```

### 2. Making Changes

1. Create a feature branch: `git checkout -b feature/new-feature`
2. Make your changes
3. Test locally at `http://localhost:8000`
4. Commit changes: `git add . && git commit -m "Description"`
5. Push branch: `git push origin feature/new-feature`

### 3. Testing

- Test on multiple screen sizes
- Check responsive design at different breakpoints
- Verify navigation works on mobile
- Test color contrast and accessibility

## Production Deployment

### Automated Deployment (Recommended)

```bash
# Run the deployment script
./dev/deploy.sh
```

This script will:

1. Copy files from development to production repository
2. Show git status for review
3. Prompt for confirmation
4. Commit and push changes if approved

### Manual Deployment

```bash
# Copy files manually
cp -r css js images *.html CNAME /home/tomswb/bitminded.github.io/

# Navigate to production repository
cd /home/tomswb/bitminded.github.io

# Commit and push
git add .
git commit -m "Deploy changes - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
```

## GitHub Pages Configuration

### Domain Setup

- Custom domain: `bitminded.ch`
- CNAME file contains: `bitminded.ch`
- DNS A records point to GitHub Pages IPs

### Repository Settings

- Source: Deploy from `main` branch
- Custom domain: `bitminded.ch`
- Enforce HTTPS: Enabled

## Rollback Procedure

If issues occur after deployment:

1. **Quick Fix**: Edit files directly in production repo
2. **Full Rollback**:
   ```bash
   cd /home/tomswb/bitminded.github.io
   git revert HEAD
   git push origin main
   ```
3. **Sync Back**: Update development repo with fixed version

## Pre-Deployment Checklist

- [ ] All links work correctly
- [ ] Images load properly
- [ ] Mobile navigation functions
- [ ] No console errors
- [ ] Accessibility features work
- [ ] Color contrast is acceptable
- [ ] Typography scales properly
- [ ] Contact forms work (if applicable)

## Post-Deployment Verification

1. Visit `https://bitminded.ch`
2. Test navigation on desktop and mobile
3. Verify all pages load correctly
4. Check browser developer tools for errors
5. Test on different browsers (Chrome, Firefox, Safari)

## Troubleshooting

### Common Issues

- **404 errors**: Check file paths and case sensitivity
- **CSS not loading**: Verify relative paths in HTML
- **Mobile menu not working**: Check JavaScript file inclusion
- **Images not displaying**: Verify image paths and file existence

### GitHub Pages Delays

- Changes can take 5-10 minutes to propagate
- Check GitHub Actions tab for deployment status
- Clear browser cache if changes don't appear

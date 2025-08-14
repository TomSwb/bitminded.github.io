# Bitminder.ch Development Repository

This is the development repository for the Bitminder.ch website. This repo is used for testing new features, making changes, and experimenting before deploying to the production site.

## Project Structure

```
bitminder-dev/
├── index.html          # Main homepage
├── about.html          # About page
├── contact.html        # Contact page
├── project.html        # Portfolio/projects page
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   └── script.js       # JavaScript functionality
├── images/             # Image assets
├── dev/                # Development tools and configs
└── docs/               # Documentation
```

## Development Setup

### Prerequisites

- A modern web browser
- A local web server (optional, for testing)

### Local Development

1. Clone this repository
2. Open `index.html` in your browser, or
3. Use a local server like Live Server extension in VS Code

### Using Python's built-in server

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`

### Using Node.js serve

```bash
npx serve .
```

## Deployment

When changes are ready for production:

1. Test thoroughly in this development environment
2. Copy changes to the production repository (bitminded.github.io)
3. Deploy to GitHub Pages

## Development Workflow

1. Create a new branch for each feature: `git checkout -b feature/new-feature`
2. Make your changes
3. Test locally
4. Commit and push changes
5. Create a pull request for review
6. Merge to main when ready
7. Deploy to production

## Notes

- This repository uses the domain bitminded.ch for production
- The development version can be accessed via GitHub Pages development branch
- Keep the CNAME file updated if domain changes

## Development vs Production

- **Development**: This repository (`bitminder-dev`)
- **Production**: `bitminded.github.io` repository
- Domain: `bitminded.ch`

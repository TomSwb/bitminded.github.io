# Development Configuration

This folder contains development tools and configuration files.

## Files

- `package.json` - Node.js dependencies for development tools
- `live-server.json` - Live Server configuration
- `deploy.sh` - Deployment script to production

## Development Tools

### Live Server

Use Live Server extension in VS Code or install globally:

```bash
npm install -g live-server
live-server --config-file=dev/live-server.json
```

### Development Server

Python built-in server:

```bash
python3 -m http.server 8000
```

Node.js serve:

```bash
npx serve . -p 8000
```

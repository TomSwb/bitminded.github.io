# Contributing to BitMinded

## Required Tools

### Essential (Must Have)
- **Node.js & npm** - For Cloudflare Wrangler
  ```bash
  node --version  # Should be v16+
  npm --version
  ```

- **Git** - Version control
  ```bash
  git --version
  ```

### Supabase Development
- **Supabase CLI** (v2.58.5+) - Function deployment
  ```bash
  supabase --version
  supabase login
  supabase link --project-ref eygpejbljuqpxwwoawkn  # Dev
  ```
  Install: https://supabase.com/docs/guides/cli

- **Docker** (v29.0.2+) - Required for Supabase local dev and schema comparisons
  ```bash
  docker --version
  ```
  Install: `./supabase/scripts/install-docker.sh` or https://docs.docker.com

### Payment Testing
- **Stripe CLI** (v1.32.0+) - Webhook testing
  ```bash
  stripe --version
  stripe login
  stripe config --set test_mode true  # Switch to test mode
  ```
  Install: https://stripe.com/docs/stripe-cli

### Cloudflare
- **Wrangler** (v4.50.0+) - Cloudflare Workers (via npm)
  ```bash
  npm install  # Installs wrangler
  npx wrangler --version
  ```

### Optional but Useful
- **GitHub CLI** (`gh`) - Manual repo management
  ```bash
  gh --version
  gh auth login
  ```
  Install: https://cli.github.com

- **jq** - JSON parsing for CLI outputs
  ```bash
  jq --version
  ```
  Install: `sudo apt install jq` (Linux) or `brew install jq` (Mac)

---

## Quick Start
1. Work on `dev` branch (never commit directly to `main`)
2. Test locally (auto-connects to dev Supabase)
3. Follow component patterns (see `components/shared/README.md`)
4. Use `window.logger` (never `console.log`)
5. Add translations for all user-facing text

## Development Workflow

### Local Development
- Run on localhost → automatically uses **dev** Supabase (`eygpejbljuqpxwwoawkn`)
- Test freely without affecting production
- Check environment: `console.log(window.ENV_CONFIG)`

### Making Changes

#### Frontend Code
```bash
git checkout dev
# Make changes
git add .
git commit -m "feat: description"
git push origin dev
```

#### Database Changes (CRITICAL: Dev First!)
1. Write SQL migration
2. Test in **dev** SQL Editor: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/sql
3. Document in `supabase/dev/pending-migrations.md`
4. Test thoroughly on localhost
5. **Only then** apply to production
6. Update `supabase/prod/applied-migrations.md`

#### Edge Functions
```bash
# Deploy to dev first
supabase functions deploy <name> --project-ref eygpejbljuqpxwwoawkn

# Test on localhost, then deploy to prod
supabase functions deploy <name> --project-ref dynxqnrkmjcvgzsugxtm
```

Or use automation script:
```bash
./supabase/scripts/sync-functions.sh <function-name>
```

### Deploying to Production

#### Sync dev → main
```bash
git checkout main
git merge dev
git push origin main  # Auto-deploys to bitminded.ch
git checkout dev
```

#### Database Migration
1. Copy SQL from dev
2. Run in **prod** SQL Editor: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/sql
3. Update tracking files

## Code Standards

### Component Development
- Structure: `component-name.html/css/js` + translations
- Pattern: `constructor()` → `async init()` → `cacheElements()` → `bindEvents()`
- Always: `this.isInitialized` flag, `this.elements = {}` cache
- See `components/shared/README.md` for details

### Styling
- **Always** use CSS variables: `var(--color-text-primary)`, `var(--spacing-md)`
- Never hardcode colors/spacing
- See `css/variables.css` for available variables
- Mobile-first responsive design

### Translations
- HTML: `<span class="translatable-content" data-translate="key">Default</span>`
- Load translations, add to i18next if available
- Support: EN, FR, DE, ES

### Logging
```javascript
window.logger?.log('message');    // Dev only
window.logger?.error('❌ error'); // Always logs
// NEVER: console.log() directly
```

## Common Mistakes to Avoid
- ❌ Committing to `main` directly (use `dev` branch)
- ❌ Testing in production database (use dev first!)
- ❌ Using `console.log` (use `window.logger`)
- ❌ Hardcoding colors/spacing (use CSS variables)
- ❌ Missing translations (all text must be translatable)
- ❌ Forgetting mobile responsiveness
- ❌ Deploying Edge Functions without testing in dev

## Environment References

### Dev Environment
- Project: `eygpejbljuqpxwwoawkn`
- Dashboard: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn
- Auto-connects: localhost (ports 5500/5501/8080)

### Production Environment
- Project: `dynxqnrkmjcvgzsugxtm`
- Dashboard: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm
- Auto-connects: bitminded.ch

## Documentation
- Components: `components/shared/README.md`
- CSS: `css/README.md`
- Admin: `admin/README.md`
- Supabase: `supabase/README.md`
- Workflow: `supabase/docs/WORKFLOW.md`


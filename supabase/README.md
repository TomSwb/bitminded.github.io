# Supabase Project Organization

This folder contains all Supabase-related configurations, migrations, and Edge Functions.

## Folder Structure

```
supabase/
├── dev/                    # Dev environment tracking & config
│   ├── deployed-functions.md
│   ├── pending-migrations.md
│   ├── SETUP_COMPLETE.md
│   └── utils/             # Dev utility scripts
│
├── prod/                   # Production tracking & checklists
│   ├── deployed-functions.md
│   ├── applied-migrations.md
│   └── DEPLOYMENT_CHECKLIST.md
│
├── functions/              # Edge Functions (deploy to both)
├── migrations/             # SQL migrations (apply to both)
├── schema/                 # Reference docs (don't run)
├── debug/                  # Debug queries (dev only)
├── fixes/                  # Historical fixes (reference)
└── tools/                  # Utility tools (both envs)
```

## Development vs Production

### Dev Environment
- **Project**: `eygpejbljuqpxwwoawkn`
- **URL**: https://eygpejbljuqpxwwoawkn.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn
- **Used when**: Running on localhost (127.0.0.1, ports 5500/5501/8080)

### Production Environment
- **Project**: `dynxqnrkmjcvgzsugxtm`
- **URL**: https://dynxqnrkmjcvgzsugxtm.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm
- **Used when**: Deployed to bitminded.ch

## Workflow for Database Changes

### 1. Test in Dev First
```bash
# 1. Write your SQL migration
# 2. Run it in DEV SQL Editor
# 3. Test thoroughly on localhost
# 4. Track in supabase/dev/pending-migrations.md
```

### 2. Apply to Production
```bash
# 1. When ready, run the same SQL in PROD SQL Editor
# 2. Move from pending-migrations.md to applied-migrations.md
# 3. Test on bitminded.ch
```

### 3. Keep Both Synced
- Always test in dev first
- Document what's been applied to prod
- Keep migration files in `migrations/` folder
- Track deployment status in `prod/` and `dev/` folders

## Edge Functions

Edge Functions are in `/functions/` and are deployed to BOTH environments:

```bash
# Deploy to dev
supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn

# Deploy to prod
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

Track which functions are deployed where in:
- `dev/deployed-functions.md`
- `prod/deployed-functions.md`

## Environment Detection

The app automatically detects which environment to use based on hostname:
- **localhost** → Dev Supabase
- **bitminded.ch** → Production Supabase

See `/js/env-config.js` for implementation.

## Quick Links

### Dev Setup
- Setup guide: `/supabase/dev/SETUP.md`
- Cron jobs: `/supabase/dev/cron-jobs.sql`
- Environment vars: `/supabase/dev/environment-variables.md`

### Production Deployment
- Deployment checklist: `/supabase/prod/DEPLOYMENT_CHECKLIST.md`
- Applied migrations: `/supabase/prod/applied-migrations.md`

## Best Practices

1. **Never test directly in production**
2. **Always test migrations in dev first**
3. **Document what's deployed where**
4. **Keep service role keys secure** (not in git)
5. **Use environment variables in Edge Functions**
6. **Track pending vs applied migrations**

## Getting Help

- Check `/supabase/dev/` for dev environment docs
- Check `/supabase/prod/` for production docs
- Review `/supabase/shared/` for common patterns

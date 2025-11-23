# Automation Guide

This guide explains how to use the automation scripts to manage your Supabase projects.

## Prerequisites

1. **Docker installed** (see `DOCKER-SETUP.md`)
2. **Supabase CLI installed** (already done ✅)
3. **Logged into Supabase CLI**: `supabase login`

## Available Scripts

### 1. `install-docker.sh`
Installs Docker on your system.

```bash
cd supabase
./install-docker.sh
```

**After running**: Log out and log back in for docker group changes to take effect.

### 2. `compare-databases.sh`
Compares dev and prod database schemas automatically.

```bash
cd supabase
./compare-databases.sh
```

**What it does**:
- Links to dev project
- Pulls dev schema to `schema-dev.sql`
- Links to prod project
- Pulls prod schema to `schema-prod.sql`
- Compares schemas and generates diff
- Creates comparison report

**Output files**:
- `schema-dev.sql` - Dev database schema
- `schema-prod.sql` - Prod database schema
- `schema-diff.txt` - Differences (if any)
- `comparison-report.md` - Summary report

### 3. `sync-functions.sh`
Deploys Edge Functions to both environments.

```bash
cd supabase
./sync-functions.sh <function-name>
```

**Example**:
```bash
./sync-functions.sh stripe-webhook
```

**What it does**:
- Deploys function to dev
- Asks for confirmation
- Deploys function to prod (if confirmed)

## Workflow Examples

### Daily Development Workflow

```bash
# 1. Compare databases to ensure they're in sync
cd supabase
./compare-databases.sh

# 2. Make changes in dev
# ... edit function code ...

# 3. Deploy to dev
./sync-functions.sh my-function

# 4. Test in dev
# ... test function ...

# 5. Deploy to prod when ready
./sync-functions.sh my-function
```

### Database Migration Workflow

```bash
# 1. Create migration in dev
supabase link --project-ref eygpejbljuqpxwwoawkn
supabase migration new my_migration_name

# 2. Edit migration file
nano supabase/migrations/xxxxx_my_migration_name.sql

# 3. Apply to dev
supabase db push

# 4. Test thoroughly

# 5. Compare schemas
./compare-databases.sh

# 6. Apply to prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm
supabase db push
```

### Environment Variable Sync

```bash
# 1. Check dev env vars
# Go to: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions

# 2. Check prod env vars
# Go to: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions

# 3. Update local reference files
nano supabase/.env-dev
nano supabase/.env-prod
```

## Quick Commands Reference

### Switch Between Projects
```bash
# Dev
supabase link --project-ref eygpejbljuqpxwwoawkn

# Prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm
```

### Check Current Project
```bash
supabase projects list
```

### View Function Logs
```bash
# Dev
supabase link --project-ref eygpejbljuqpxwwoawkn
supabase functions logs <function-name>

# Prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm
supabase functions logs <function-name>
```

### List All Functions
```bash
ls -1 supabase/functions/ | grep -v "^_" | grep -v "types.d.ts"
```

## Troubleshooting

### Docker Not Running
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Permission Denied
```bash
# Add user to docker group (if not already)
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker
```

### Supabase CLI Not Authenticated
```bash
supabase login
```

### Schema Pull Fails
Make sure:
1. Docker is running
2. You're logged into Supabase CLI
3. Project is linked correctly

## Tips

1. **Always test in dev first** before deploying to prod
2. **Compare databases regularly** to catch drift early
3. **Keep env files updated** for reference
4. **Document migrations** in `pending-migrations.md` and `applied-migrations.md`
5. **Use the sync scripts** to avoid manual errors


# Database Synchronization Guide

This guide helps ensure your dev and prod databases are in sync.

## Projects

- **Dev**: `eygpejbljuqpxwwoawkn` - https://eygpejbljuqpxwwoawkn.supabase.co
- **Prod**: `dynxqnrkmjcvgzsugxtm` - https://dynxqnrkmjcvgzsugxtm.supabase.co

## Quick Comparison Methods

### Method 1: Using Supabase Dashboard (Easiest)

1. **Compare Tables**:
   - Dev: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/editor
   - Prod: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/editor
   - Manually compare table structures

2. **Compare Functions**:
   - Dev: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/database/functions
   - Prod: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/database/functions

3. **Compare Edge Functions**:
   - Dev: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions
   - Prod: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions

### Method 2: Using SQL Queries

Run these queries in both databases and compare results:

#### List All Tables
```sql
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

#### List All Functions
```sql
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

#### List All Policies (RLS)
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### List All Indexes
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Method 3: Using Supabase CLI (Requires Docker)

If Docker is running:

```bash
# Link to dev
supabase link --project-ref eygpejbljuqpxwwoawkn

# Pull dev schema
supabase db pull

# Link to prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm

# Compare
supabase db diff
```

## Syncing Process

### 1. Apply Migrations to Dev First

Always test in dev before applying to prod:

```sql
-- 1. Write your migration in supabase/migrations/
-- 2. Run in Dev SQL Editor: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/sql
-- 3. Test thoroughly
-- 4. Document in supabase/dev/pending-migrations.md
```

### 2. Apply to Production

After testing in dev:

```sql
-- 1. Run the same SQL in Prod SQL Editor: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/sql
-- 2. Move from pending-migrations.md to applied-migrations.md
-- 3. Test on production
```

### 3. Sync Edge Functions

```bash
# Deploy to dev
supabase link --project-ref eygpejbljuqpxwwoawkn
supabase functions deploy <function-name>

# Deploy to prod
supabase link --project-ref dynxqnrkmjcvgzsugxtm
supabase functions deploy <function-name>
```

### 4. Sync Environment Variables

1. Check dev function env vars: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions
2. Check prod function env vars: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions
3. Ensure all required variables are set in both
4. Update local `.env-dev` and `.env-prod` files for reference

## Checklist for Keeping Databases in Sync

- [ ] All tables exist in both databases
- [ ] All columns match (name, type, constraints)
- [ ] All indexes are the same
- [ ] All RLS policies are identical
- [ ] All functions (SQL) are the same
- [ ] All triggers are the same
- [ ] All Edge Functions are deployed to both
- [ ] All Edge Function environment variables are set in both
- [ ] All migrations have been applied to both

## Current Status

Check these files for tracking:
- `supabase/dev/pending-migrations.md` - Migrations not yet in prod
- `supabase/prod/applied-migrations.md` - Migrations applied to prod
- `supabase/dev/deployed-functions.md` - Functions deployed to dev
- `supabase/prod/deployed-functions.md` - Functions deployed to prod


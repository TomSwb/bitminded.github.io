# Database Comparison Report
Generated: $(date)

## Schema Files
- Dev: `schema-dev.sql`
- Prod: `schema-prod.sql`
- Diff: `schema-diff.txt` (if differences found)

## Quick Comparison

### Tables
Run in both databases:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Functions
Run in both databases:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

### Policies
Run in both databases:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```


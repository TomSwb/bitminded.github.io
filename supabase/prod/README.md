# Production Environment - Quick Reference

**Project**: dynxqnrkmjcvgzsugxtm  
**URL**: https://dynxqnrkmjcvgzsugxtm.supabase.co  
**Dashboard**: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm

## ⚠️ PRODUCTION - Handle with Care

## What's Here

- `applied-migrations.md` - SQL migrations applied to production
- `deployed-functions.md` - Edge Functions deployed to production
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist

## Quick Actions

### Deploy Edge Function to Prod
```bash
# ⚠️ Test in dev first!
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```

### Run SQL Migration in Prod
1. **Test in dev first!**
2. Go to: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/sql
3. Run your SQL
4. Add to `applied-migrations.md`
5. Remove from `dev/pending-migrations.md`

## Environment Detection

When deployed to **bitminded.ch**, the app automatically connects to this production database.

See `/js/env-config.js` for configuration.

## Safety Rules

1. ❌ **Never test directly in production**
2. ✅ **Always test in dev first**
3. ✅ **Have rollback plan ready**
4. ✅ **Backup before major changes**
5. ✅ **Document everything in applied-migrations.md**


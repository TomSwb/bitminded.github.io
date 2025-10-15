# Production Deployment Checklist

Use this checklist before deploying any changes to production.

## Pre-Deployment

### Code Changes
- [ ] All changes tested locally (dev environment)
- [ ] No console.log or debug code left in
- [ ] No hardcoded URLs or secrets
- [ ] Environment detection working correctly

### Database Changes
- [ ] SQL tested in dev database first
- [ ] Backup plan / rollback SQL ready
- [ ] Breaking changes documented
- [ ] RLS policies tested
- [ ] No data loss risk identified

### Edge Functions
- [ ] Function tested in dev environment
- [ ] Environment variables configured in prod
- [ ] No hardcoded values
- [ ] Error handling in place
- [ ] Logging appropriate (not excessive)

## Deployment Steps

### 1. Frontend Deployment (GitHub Pages)
```bash
git add .
git commit -m "Description of changes"
git push origin main  # or your branch
```

### 2. Database Migration (if needed)
1. Go to prod SQL Editor
2. Run migration SQL
3. Verify tables/functions created
4. Test with sample queries
5. Update `prod/applied-migrations.md`

### 3. Edge Function Deployment (if needed)
```bash
supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
```
- Update `prod/deployed-functions.md`

## Post-Deployment

### Verification
- [ ] Visit bitminded.ch - site loads correctly
- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test core features
- [ ] Check browser console for errors
- [ ] Verify Supabase connection (should say PRODUCTION)

### Monitoring
- [ ] Check Edge Function logs for errors
- [ ] Check database logs
- [ ] Monitor error rates
- [ ] Test critical user flows

## Rollback Plan

If something goes wrong:

### Frontend
```bash
git revert <commit-hash>
git push origin main
```

### Database
Run rollback SQL (from applied-migrations.md)

### Edge Function
Deploy previous version or fix and redeploy

## Emergency Contacts

- Supabase Dashboard: https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm
- GitHub Repo: https://github.com/[your-username]/bitminded.github.io

## Notes

- Production URL: https://bitminded.ch
- Always test in dev first
- Document everything
- Have rollback plan ready


# Dev Environment Setup - COMPLETE ✅

## Summary

Your development environment is now fully configured and ready to use!

## What's Been Done

### ✅ Database Setup
- Created dev Supabase project: `eygpejbljuqpxwwoawkn`
- Imported all 45 production SQL migrations
- Verified all 17 tables match production
- All functions, triggers, indexes, and RLS policies in place
- Storage buckets configured

### ✅ Frontend Configuration
- Updated `js/env-config.js` with dev anon key
- Environment auto-detection configured:
  - **localhost/127.0.0.1** (ports 5500, 5501, 8080) → Dev
  - **bitminded.ch** → Production

### ✅ Edge Functions
- All 12 Edge Functions deployed to dev
- Environment variables configured for all functions
- Functions use environment variables (work in both dev and prod)

### ✅ Cron Jobs
- Daily account deletion processing scheduled
- Reminder emails scheduled
- Configured with dev service role key

## How It Works

### Automatic Environment Detection

When you run your app:
- **Locally** (localhost:5501, etc.) → Connects to **DEV** Supabase
- **Production** (bitminded.ch) → Connects to **PRODUCTION** Supabase

No manual switching needed! The app detects the environment automatically.

## Testing Your Dev Environment

### 1. Start Local Dev Server
```bash
# Using Live Server (port 5501) or any local server
```

### 2. Open Browser Console
You should see:
```
💻 Environment: DEVELOPMENT
✅ Environment config loaded: {environment: 'development', supabaseUrl: 'https://eygpejbljuqpxwwoawkn.supabase.co'}
🔗 Supabase connected: DEVELOPMENT
```

### 3. Test Features
- [ ] User registration
- [ ] Login/logout
- [ ] 2FA setup and verification
- [ ] Profile updates
- [ ] Notifications
- [ ] Contact form
- [ ] Admin panel (if you have admin role in dev)
- [ ] Account deletion flow

### 4. Monitor Logs
- **Edge Functions:** https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/functions
- **Database Logs:** https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/logs
- **Auth Logs:** https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/auth/users

## Development Workflow

### Making Changes

1. **Work Locally**
   - Code changes
   - Test against dev database
   - No risk to production data

2. **Database Changes**
   ```bash
   # Test migration in dev first
   # Run SQL in dev SQL Editor
   # Verify it works
   # Then apply to production
   ```

3. **Edge Function Updates**
   ```bash
   # Deploy to dev first
   supabase functions deploy <function-name> --project-ref eygpejbljuqpxwwoawkn
   
   # Test thoroughly
   # Then deploy to production
   supabase functions deploy <function-name> --project-ref dynxqnrkmjcvgzsugxtm
   ```

### Keeping Dev in Sync

Periodically sync dev with production:
1. Export new SQL migrations from production
2. Run them in dev SQL Editor
3. Keep schemas identical

## Project References

### Development
- **Project Ref:** `eygpejbljuqpxwwoawkn`
- **URL:** https://eygpejbljuqpxwwoawkn.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn
- **Auto-connects when:** Running on localhost or local dev server

### Production
- **Project Ref:** `dynxqnrkmjcvgzsugxtm`
- **URL:** https://dynxqnrkmjcvgzsugxtm.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm
- **Auto-connects when:** Running on bitminded.ch

## Configuration Files

All dev setup files are in: `/supabase/dev-environment/`

- `SETUP_COMPLETE.md` - This file
- `SETUP_CHECKLIST.md` - Complete setup checklist
- `SETUP_CRON_JOBS.sql` - Cron job configuration
- `ENVIRONMENT_VARIABLES.md` - Environment variables guide
- `DEPLOY_EDGE_FUNCTIONS.sh` - Deployment script
- `RESET_AND_IMPORT_PRODUCTION.md` - Schema import guide
- `COMPLETE_RESET.sql` - Database reset (if needed)
- `DROP_TRIGGER.sql` - Trigger cleanup (if needed)
- `FIX_STORAGE_BUCKET.sql` - Storage fix (if needed)

## Quick Reference

### Check Current Environment
Open browser console when app is running:
```javascript
console.log(window.ENV_CONFIG);
// Shows: {isDevelopment: true, isProduction: false, ...}
```

### Force Specific Environment (for testing)
In `js/env-config.js`, temporarily modify the detection logic.

### Common Issues

**App connects to wrong environment:**
- Check browser console for environment detection
- Verify hostname/port in `env-config.js`

**Edge Functions not working:**
- Verify environment variables are set in dashboard
- Check function logs for errors
- Ensure service role key is correct

**Database queries failing:**
- Compare schemas between dev and prod
- Check RLS policies
- Verify user has correct roles

## Success Criteria ✅

Your dev environment is ready if:
- ✅ Local app connects to dev Supabase
- ✅ User registration works
- ✅ Login/logout works
- ✅ Edge Functions execute without errors
- ✅ Emails are sent (if tested)
- ✅ No console errors
- ✅ Production app still works on bitminded.ch

## Next Steps

### Start Developing!
1. Make changes locally
2. Test against dev database
3. When ready, deploy to production
4. Keep dev and prod schemas in sync

### Add Test Data
Create test users in dev:
- Regular users for testing features
- Admin user for testing admin panel
- Test various scenarios safely

### Monitor Both Environments
- Dev: For testing and development
- Prod: For real users and data

## Support

If you encounter issues:
1. Check specific guide in `/supabase/dev-environment/`
2. Review Supabase dashboard logs
3. Compare dev vs production configurations
4. Test components individually

## Congratulations! 🎉

Your development environment is fully operational. You can now:
- Develop safely without affecting production
- Test new features thoroughly
- Experiment with database changes
- Debug issues in isolation
- Deploy with confidence

Happy coding! 🚀

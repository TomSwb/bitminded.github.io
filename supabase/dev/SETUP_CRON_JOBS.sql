-- ============================================================================
-- ACCOUNT DELETION - CRON JOB SETUP (DEVELOPMENT ENVIRONMENT)
-- ============================================================================
-- This sets up the daily cron job to process account deletions
-- 
-- Prerequisites:
-- 1. pg_cron extension must be enabled in Supabase
-- 2. process-account-deletions edge function must be deployed to DEV
-- 3. ✅ Dev Supabase URL: https://eygpejbljuqpxwwoawkn.supabase.co
-- 4. ⚠️ Replace YOUR_DEV_SERVICE_ROLE_KEY with your DEV service role key
-- 
-- To get your DEV service role key:
-- 1. Go to https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn
-- 2. Navigate to Settings → API
-- 3. Copy the "service_role" key (secret)
-- 
-- Execute this in DEV Supabase SQL Editor AFTER deploying edge functions
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing deletion processing jobs (cleanup)
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname = 'process-account-deletions';

-- Schedule daily account deletion processing
-- Runs every day at 00:00 UTC (midnight)
SELECT cron.schedule(
  'process-account-deletions',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT net.http_post(
    url:='https://eygpejbljuqpxwwoawkn.supabase.co/functions/v1/process-account-deletions',
    headers:='{"Authorization": "Bearer YOUR_DEV_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- OPTIONAL: Schedule reminder emails (7 days before deletion)
-- ============================================================================

-- Unschedule any existing reminder jobs (cleanup)
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname = 'send-deletion-reminders';

-- Schedule reminder emails
-- Runs every day at 09:00 UTC
SELECT cron.schedule(
  'send-deletion-reminders',
  '0 9 * * *', -- Daily at 9 AM UTC
  $$
  SELECT net.http_post(
    url:='https://eygpejbljuqpxwwoawkn.supabase.co/functions/v1/send-deletion-reminders',
    headers:='{"Authorization": "Bearer YOUR_DEV_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if cron jobs are scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname IN ('process-account-deletions', 'send-deletion-reminders')
ORDER BY jobname;

-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- ============================================================================
-- IMPORTANT NOTES - DEVELOPMENT ENVIRONMENT
-- ============================================================================

/*
BEFORE RUNNING THIS IN DEV:

1. ⚠️ REPLACE YOUR_DEV_SERVICE_ROLE_KEY:
   - Go to: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/settings/api
   - Copy the "service_role" key (secret - starts with "eyJ...")
   - Replace ALL occurrences of YOUR_DEV_SERVICE_ROLE_KEY in this file

2. ✅ Deploy all edge functions to DEV first:
   supabase functions deploy send-deletion-email --project-ref eygpejbljuqpxwwoawkn
   supabase functions deploy schedule-account-deletion --project-ref eygpejbljuqpxwwoawkn
   supabase functions deploy cancel-account-deletion --project-ref eygpejbljuqpxwwoawkn
   supabase functions deploy process-account-deletions --project-ref eygpejbljuqpxwwoawkn

3. 🧪 Test manually first:
   - Call process-account-deletions function manually via Supabase Functions
   - Verify it works before enabling cron

MONITORING:
- Check cron job logs: 
  SELECT * FROM cron.job_run_details 
  WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('process-account-deletions', 'send-deletion-reminders'))
  ORDER BY start_time DESC LIMIT 10;
  
- Check for errors in Supabase Functions logs (Dashboard → Edge Functions → Logs)
- Monitor account_deletions table for status updates

TIMEZONE:
- All times are UTC
- Adjust schedule if you need different timezone
- Format: 'minute hour day month weekday'
- Examples:
  - '0 0 * * *'   = Daily at midnight UTC
  - '0 9 * * *'   = Daily at 9 AM UTC
  - '0 0 * * 0'   = Weekly on Sunday at midnight UTC
  - '0 0 1 * *'   = Monthly on 1st at midnight UTC

DEVELOPMENT vs PRODUCTION:
- This is for the DEV environment (eygpejbljuqpxwwoawkn)
- Production uses: dynxqnrkmjcvgzsugxtm
- Keep service role keys separate and never commit them to git!
*/

-- ============================================================================
-- CLEANUP COMMANDS (if you need to stop cron jobs)
-- ============================================================================

-- To stop processing deletions:
-- SELECT cron.unschedule('process-account-deletions');

-- To stop reminder emails:
-- SELECT cron.unschedule('send-deletion-reminders');

-- To view all scheduled jobs:
-- SELECT * FROM cron.job ORDER BY jobname;

-- To delete all scheduled jobs:
-- SELECT cron.unschedule(jobname) FROM cron.job;

-- ============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  DEV ENVIRONMENT CRON JOB SETUP';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Replace placeholders before running!';
    RAISE NOTICE '';
    RAISE NOTICE '1. YOUR_DEV_SERVICE_ROLE_KEY → Your DEV service role key';
    RAISE NOTICE '   Get it from: https://supabase.com/dashboard/project/eygpejbljuqpxwwoawkn/settings/api';
    RAISE NOTICE '';
    RAISE NOTICE '2. Deploy Edge Functions to DEV first:';
    RAISE NOTICE '   supabase functions deploy --project-ref eygpejbljuqpxwwoawkn';
    RAISE NOTICE '';
    RAISE NOTICE '✅ After updating placeholders, run this SQL to schedule cron jobs';
    RAISE NOTICE '📊 Verify with: SELECT * FROM cron.job;';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

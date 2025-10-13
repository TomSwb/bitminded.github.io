-- ============================================================================
-- ACCOUNT DELETION - CRON JOB SETUP
-- ============================================================================
-- This sets up the daily cron job to process account deletions
-- 
-- Prerequisites:
-- 1. pg_cron extension must be enabled in Supabase
-- 2. process-account-deletions edge function must be deployed
-- 3. ✅ Supabase URL already configured: https://dynxqnrkmjcvgzsugxtm.supabase.co
-- 4. ⚠️ Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- 
-- Execute this in Supabase SQL Editor AFTER deploying edge functions
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
    url:='https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/process-account-deletions',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
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
    url:='https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/send-deletion-reminders',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
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
-- IMPORTANT NOTES
-- ============================================================================

/*
BEFORE RUNNING THIS:
1. Deploy all edge functions first: ✅ DONE
   - supabase functions deploy send-deletion-email
   - supabase functions deploy schedule-account-deletion
   - supabase functions deploy cancel-account-deletion
   - supabase functions deploy process-account-deletions

2. Replace placeholders:
   - YOUR_PROJECT_REF: ✅ Already set to dynxqnrkmjcvgzsugxtm
   - YOUR_SERVICE_ROLE_KEY: ⚠️ REPLACE THIS - Found in Supabase Dashboard → Settings → API → service_role key (secret)

3. Test manually first:
   - Call process-account-deletions function manually via Supabase Functions
   - Verify it works before enabling cron

MONITORING:
- Check cron job logs: SELECT * FROM cron.job_run_details WHERE jobid = [your_job_id] ORDER BY start_time DESC LIMIT 10;
- Check for errors in Supabase Functions logs
- Monitor deletion_requests table for status updates

TIMEZONE:
- All times are UTC
- Adjust schedule if you need different timezone
- Format: 'minute hour day month weekday'
- Examples:
  - '0 0 * * *'   = Daily at midnight UTC
  - '0 9 * * *'   = Daily at 9 AM UTC
  - '0 0 * * 0'   = Weekly on Sunday at midnight UTC
  - '0 0 1 * *'   = Monthly on 1st at midnight UTC
*/

-- ============================================================================
-- CLEANUP COMMANDS (if you need to stop cron jobs)
-- ============================================================================

-- To stop processing deletions:
-- SELECT cron.unschedule('process-account-deletions');

-- To stop reminder emails:
-- SELECT cron.unschedule('send-deletion-reminders');

-- To delete all scheduled jobs:
-- SELECT cron.unschedule(jobname) FROM cron.job;

-- ============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE '⚠️  IMPORTANT: Replace placeholders before running!';
    RAISE NOTICE '1. YOUR_PROJECT_REF → Your Supabase project reference';
    RAISE NOTICE '2. YOUR_SERVICE_ROLE_KEY → Your service role key';
    RAISE NOTICE '';
    RAISE NOTICE '✅ After updating placeholders, run this SQL to schedule cron jobs';
    RAISE NOTICE '📊 Verify with: SELECT * FROM cron.job;';
END $$;


-- Add suspension fields to user_profiles table
-- This migration adds fields to track user suspensions and follow-up processes

-- Add suspension-related columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_followup_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reactivation_reason TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended_at ON public.user_profiles(suspended_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspension_followup_sent ON public.user_profiles(suspension_followup_sent);

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN public.user_profiles.suspended_by IS 'Admin user ID who suspended the user';
COMMENT ON COLUMN public.user_profiles.suspension_reason IS 'Reason provided for suspension';
COMMENT ON COLUMN public.user_profiles.suspension_followup_sent IS 'Whether 7-day follow-up email was sent to dev team';
COMMENT ON COLUMN public.user_profiles.reactivated_at IS 'Timestamp when user was reactivated';
COMMENT ON COLUMN public.user_profiles.reactivated_by IS 'Admin user ID who reactivated the user';
COMMENT ON COLUMN public.user_profiles.reactivation_reason IS 'Reason provided for reactivation';

-- Update RLS policies to allow admins to update suspension fields
-- (Assuming existing RLS policies already allow admin access)

-- Create a function to get users needing follow-up emails
CREATE OR REPLACE FUNCTION public.get_users_needing_suspension_followup()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    suspended_at TIMESTAMP,
    suspension_reason TEXT,
    suspended_by_username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id as user_id,
        up.username,
        up.email,
        up.suspended_at,
        up.suspension_reason,
        admin_up.username as suspended_by_username
    FROM public.user_profiles up
    LEFT JOIN public.user_profiles admin_up ON up.suspended_by = admin_up.id
    WHERE up.status = 'suspended'
        AND up.suspended_at IS NOT NULL
        AND up.suspension_followup_sent = FALSE
        AND up.suspended_at <= NOW() - INTERVAL '7 days';
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.get_users_needing_suspension_followup() TO authenticated;

-- Create a function to mark follow-up as sent
CREATE OR REPLACE FUNCTION public.mark_suspension_followup_sent(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_profiles 
    SET suspension_followup_sent = TRUE
    WHERE id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.mark_suspension_followup_sent(UUID) TO authenticated;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to send follow-up emails for suspended users
CREATE OR REPLACE FUNCTION public.send_suspension_followup_emails()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    email_body TEXT;
    email_subject TEXT;
    days_since_suspension INTEGER;
BEGIN
    -- Get all users who need follow-up emails
    FOR user_record IN
        SELECT 
            up.id as user_id,
            up.username,
            up.email,
            up.suspended_at,
            up.suspension_reason,
            admin_up.username as suspended_by_username
        FROM public.user_profiles up
        LEFT JOIN public.user_profiles admin_up ON up.suspended_by = admin_up.id
        WHERE up.status = 'suspended'
            AND up.suspended_at IS NOT NULL
            AND up.suspension_followup_sent = FALSE
            AND up.suspended_at <= NOW() - INTERVAL '7 days'
    LOOP
        -- Calculate days since suspension
        days_since_suspension := EXTRACT(DAY FROM NOW() - user_record.suspended_at)::INTEGER;
        
        -- Create email content
        email_subject := '⚠️ Suspension Follow-up Required: ' || user_record.username || ' (' || days_since_suspension || ' days)';
        
        email_body := 'Hello BitMinded Dev Team,

A user suspension requires your attention:

**User Details:**
- Username: ' || user_record.username || '
- Email: ' || user_record.email || '
- Suspended: ' || user_record.suspended_at::DATE || ' (' || days_since_suspension || ' days ago)
- Suspended by: ' || COALESCE(user_record.suspended_by_username, 'Unknown') || '
- Reason: ' || COALESCE(user_record.suspension_reason, 'No reason provided') || '

**Action Required:**
Please review this suspension and determine if:
1. The issue has been resolved and the account should be reactivated
2. The account should remain suspended
3. The account should be permanently deleted

**Next Steps:**
- Check if the user has contacted support
- Review the suspension reason
- Take appropriate action (reactivate, maintain suspension, or delete)

**Admin Panel:**
You can manage this user in the admin panel at: https://bitminded.ch/admin/?section=users

Best regards,
BitMinded System';

        -- Send email using Supabase's built-in email function (if available)
        -- Note: This requires Supabase's email service to be configured
        -- For now, we'll just log the action and mark as sent
        
        -- Log the follow-up action
        INSERT INTO public.admin_activity (
            admin_id,
            action_type,
            target_user_id,
            details,
            created_at
        ) VALUES (
            NULL, -- System action
            'suspension_followup_required',
            user_record.user_id,
            jsonb_build_object(
                'username', user_record.username,
                'email', user_record.email,
                'days_since_suspension', days_since_suspension,
                'suspension_reason', user_record.suspension_reason,
                'email_subject', email_subject,
                'email_body', email_body
            ),
            NOW()
        );
        
        -- Mark follow-up as sent
        UPDATE public.user_profiles 
        SET suspension_followup_sent = TRUE
        WHERE id = user_record.user_id;
        
        -- Log success
        RAISE NOTICE 'Follow-up email prepared for user: % (%)', user_record.username, days_since_suspension;
    END LOOP;
END;
$$;

-- Grant execute permission to the cron job
GRANT EXECUTE ON FUNCTION public.send_suspension_followup_emails() TO postgres;

-- Schedule the cron job to run daily at 9 AM UTC
-- This will check for users who have been suspended for 7+ days
SELECT cron.schedule(
    'suspension-followup-daily',
    '0 9 * * *', -- Daily at 9 AM UTC
    'SELECT public.send_suspension_followup_emails();'
);

-- Create a manual trigger function for immediate follow-up (optional)
CREATE OR REPLACE FUNCTION public.trigger_suspension_followup(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be called manually to send follow-up for a specific user
    -- It will be used by the edge function for immediate follow-up
    PERFORM public.send_suspension_followup_emails();
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.trigger_suspension_followup(UUID) TO authenticated;

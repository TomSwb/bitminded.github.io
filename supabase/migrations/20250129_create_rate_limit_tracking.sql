-- ============================================================================
-- RATE LIMITING TRACKING TABLE
-- ============================================================================
-- This migration creates the rate_limit_tracking table for tracking API
-- request rates per user/IP and function to prevent abuse and DoS attacks.
-- 
-- Features:
-- - Track requests per identifier (user_id or IP address)
-- - Track requests per function name
-- - Sliding window tracking (per minute and per hour)
-- - Automatic cleanup of old entries
--
-- Execute this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- user_id or IP address
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user', 'ip')), -- 'user' or 'ip'
  function_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(identifier, identifier_type, function_name, window_start)
);

-- Add helpful comments
COMMENT ON TABLE public.rate_limit_tracking IS 'Tracks API request rates per user/IP and function for rate limiting';
COMMENT ON COLUMN public.rate_limit_tracking.identifier IS 'User ID (UUID) or IP address string';
COMMENT ON COLUMN public.rate_limit_tracking.identifier_type IS 'Type of identifier: user or ip';
COMMENT ON COLUMN public.rate_limit_tracking.function_name IS 'Name of the edge function being rate limited';
COMMENT ON COLUMN public.rate_limit_tracking.request_count IS 'Number of requests in this time window';
COMMENT ON COLUMN public.rate_limit_tracking.window_start IS 'Start timestamp of the rate limiting window';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
  ON public.rate_limit_tracking(identifier, identifier_type, function_name, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
  ON public.rate_limit_tracking(window_start);

-- Enable RLS (Row Level Security)
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage rate limit tracking
-- Service role can read/write everything (used by edge functions)
CREATE POLICY "Service role can manage rate limit tracking"
  ON public.rate_limit_tracking
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


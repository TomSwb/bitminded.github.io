import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS')
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [
        'https://bitminded.ch',
        'https://www.bitminded.ch',
        'http://localhost',
        'http://127.0.0.1:5501',
        'https://*.github.io'
      ]
  
  let allowedOrigin = allowedOrigins[0]
  if (origin) {
    const matched = allowedOrigins.find(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
        return regex.test(origin)
      }
      if (pattern === 'https://bitminded.ch' || pattern === 'https://www.bitminded.ch') {
        return origin === pattern || origin.endsWith('.bitminded.ch')
      }
      return origin === pattern || origin.startsWith(pattern)
    })
    if (matched) {
      allowedOrigin = origin
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  identifierType: 'user' | 'ip',
  functionName: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  await supabaseAdmin
    .from('rate_limit_tracking')
    .delete()
    .lt('window_start', oneHourAgo.toISOString())
  
  const minuteWindowStart = new Date(now.getTime() - 60 * 1000)
  const { data: minuteWindow, error: minuteError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', minuteWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (minuteError) {
    console.error('Rate limit check error (minute):', minuteError)
    return { allowed: true }
  }
  
  const minuteCount = minuteWindow?.request_count || 0
  if (minuteCount >= config.requestsPerMinute) {
    const windowEnd = minuteWindow ? new Date(minuteWindow.window_start) : now
    windowEnd.setSeconds(windowEnd.getSeconds() + 60)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const hourWindowStart = new Date(now.getTime() - 60 * 60 * 1000)
  const { data: hourWindow, error: hourError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', hourWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (hourError) {
    console.error('Rate limit check error (hour):', hourError)
    return { allowed: true }
  }
  
  const hourCount = hourWindow?.request_count || 0
  if (hourCount >= config.requestsPerHour) {
    const windowEnd = hourWindow ? new Date(hourWindow.window_start) : now
    windowEnd.setHours(windowEnd.getHours() + 1)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const currentMinuteStart = new Date(now)
  currentMinuteStart.setSeconds(0, 0)
  const currentHourStart = new Date(now)
  currentHourStart.setMinutes(0, 0, 0)
  
  if (minuteWindow && minuteWindow.window_start === currentMinuteStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: minuteCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', minuteWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentMinuteStart.toISOString()
      })
  }
  
  if (hourWindow && hourWindow.window_start === currentHourStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: hourCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', hourWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentHourStart.toISOString()
      })
  }
  
  return { allowed: true }
}

/**
 * Schedule Account Deletion Edge Function
 * 
 * Creates a deletion request with 30-day grace period
 * Sends confirmation email and in-app notification
 * 
 * Frontend already verifies password before calling this
 */

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      throw new Error('Unauthorized: Session revoked')
    }

    // Rate limiting: User function - 5/min, 10/hour per user (sensitive operation)
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      'user',
      'schedule-account-deletion',
      { requestsPerMinute: 5, requestsPerHour: 10, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      )
    }

    console.log(`🗑️ Processing deletion request for user: ${user.id}`)

    // Parse request body (optional reason)
    const body = await req.json().catch(() => ({}))
    const { reason, requestIp } = body

    // Check if user already has a pending deletion
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .single()

    if (existingRequest) {
      // User already has a pending deletion
      const daysRemaining = Math.ceil(
        (new Date(existingRequest.scheduled_for).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Deletion already scheduled',
          scheduledFor: existingRequest.scheduled_for,
          daysRemaining
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Delete any old cancelled/completed requests for this user (to avoid unique constraint violation)
    await supabase
      .from('account_deletion_requests')
      .delete()
      .eq('user_id', user.id)
      .in('status', ['cancelled', 'completed'])

    // Calculate scheduled deletion date (30 days from now)
    const requestedAt = new Date()
    const scheduledFor = new Date(requestedAt)
    scheduledFor.setDate(scheduledFor.getDate() + 30)

    console.log(`📅 Scheduled deletion for: ${scheduledFor.toISOString()}`)

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        requested_at: requestedAt.toISOString(),
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
        reason: reason || null,
        requested_from_ip: requestIp || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating deletion request:', insertError)
      throw new Error(`Failed to create deletion request: ${insertError.message}`)
    }

    console.log('✅ Deletion request created:', deletionRequest.id)

    // Generate cancellation URL with token
    const cancelUrl = `https://bitminded.github.io/account?action=cancel-deletion&token=${deletionRequest.cancellation_token}`

    // Format scheduled date for email
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('language')
      .eq('user_id', user.id)
      .single()

    const userLanguage = userPrefs?.language || 'en'
    const scheduledDateFormatted = scheduledFor.toLocaleDateString(userLanguage, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send deletion scheduled email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-deletion-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        type: 'deletion_scheduled',
        data: {
          scheduledDate: scheduledDateFormatted,
          cancelUrl
        }
      })
    })

    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('⚠️ Email send failed:', emailResult)
      // Don't fail the whole request if email fails
    } else {
      console.log('✅ Deletion scheduled email sent')
    }

    // Create in-app notification
    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.id,
        type: 'account',
        title: 'Account Deletion Scheduled',
        message: `Your account will be deleted on ${scheduledDateFormatted}. You can cancel anytime before then.`,
        link: '/account?section=delete',
        icon: '🗑️'
      })
    })

    if (!notificationResponse.ok) {
      console.error('⚠️ Notification creation failed')
      // Don't fail the whole request
    } else {
      console.log('✅ In-app notification created')
    }

    // Calculate days remaining
    const daysRemaining = 30

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion scheduled successfully',
        deletionRequest: {
          id: deletionRequest.id,
          requestedAt: requestedAt.toISOString(),
          scheduledFor: scheduledFor.toISOString(),
          daysRemaining,
          cancellationToken: deletionRequest.cancellation_token
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error scheduling account deletion:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})


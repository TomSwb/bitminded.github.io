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
 * Cancel Account Deletion Edge Function
 * 
 * Cancels a scheduled account deletion
 * Can be called via:
 * 1. Authenticated user from account page
 * 2. Cancellation token from email link
 * 
 * Sends confirmation email and in-app notification
 */

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Parse request body
    const body = await req.json()
    const { cancellationToken, cancelIp } = body

    let userId: string | null = null
    let deletionRequest: any = null

    // Method 1: Cancel via token (from email link)
    if (cancellationToken) {
      console.log(`🔑 Cancelling via token: ${cancellationToken}`)

      // Rate limiting: IP-based for token cancellation - 5/min, 20/hour
      const rateLimitResult = await checkRateLimit(
        supabase,
        ipAddress,
        'ip',
        'cancel-account-deletion-token',
        { requestsPerMinute: 5, requestsPerHour: 20, windowMinutes: 60 }
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

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('cancellation_token', cancellationToken)
        .eq('status', 'scheduled')
        .single()

      if (error || !data) {
        throw new Error('Invalid or expired cancellation token')
      }

      deletionRequest = data
      userId = data.user_id
    } 
    // Method 2: Cancel via auth token (from account page)
    else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Missing authorization or cancellation token')
      }

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

      // Rate limiting: User function - 10/min, 100/hour per user
      const rateLimitResult = await checkRateLimit(
        supabase,
        user.id,
        'user',
        'cancel-account-deletion',
        { requestsPerMinute: 10, requestsPerHour: 100, windowMinutes: 60 }
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

      userId = user.id

      // Get user's deletion request
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .single()

      if (error || !data) {
        throw new Error('No pending deletion request found')
      }

      deletionRequest = data
    }

    console.log(`🗑️ Cancelling deletion request for user: ${userId}`)

    // Check if deletion is already past scheduled date
    const scheduledFor = new Date(deletionRequest.scheduled_for)
    if (scheduledFor < new Date()) {
      throw new Error('Deletion request has already been processed')
    }

    // Update deletion request to cancelled
    const { error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_from_ip: cancelIp || null
      })
      .eq('id', deletionRequest.id)

    if (updateError) {
      console.error('❌ Error cancelling deletion request:', updateError)
      throw new Error(`Failed to cancel deletion: ${updateError.message}`)
    }

    console.log('✅ Deletion request cancelled:', deletionRequest.id)

    // Send deletion cancelled email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-deletion-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        type: 'deletion_cancelled',
        data: {}
      })
    })

    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('⚠️ Email send failed:', emailResult)
      // Don't fail the whole request if email fails
    } else {
      console.log('✅ Deletion cancelled email sent')
    }

    // Create in-app notification
    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        type: 'account',
        title: 'Account Deletion Cancelled',
        message: 'Your account deletion has been cancelled. Your account remains active.',
        link: '/account',
        icon: '✅'
      })
    })

    if (!notificationResponse.ok) {
      console.error('⚠️ Notification creation failed')
      // Don't fail the whole request
    } else {
      console.log('✅ In-app notification created')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion cancelled successfully',
        cancelledAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error cancelling account deletion:', error)

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


// deno-lint-ignore-file no-explicit-any
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

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')

    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create Supabase client with service role key (admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      console.error('❌ Session revoked or not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Authenticated user:', user.id)

    // Rate limiting: Admin function - 60/min, 2000/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'get-user-sessions',
      { requestsPerMinute: 60, requestsPerHour: 2000, windowMinutes: 60 }
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

    // Parse request body
    const { user_id } = await req.json()
    
    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    const isAdmin = !roleError && roleData

    // Non-admin users can only view their own sessions
    if (!isAdmin && user_id !== user.id) {
      console.error('❌ User attempted to access another user\'s sessions:', user.id, 'requested:', user_id)
      return new Response(
        JSON.stringify({ error: 'Forbidden - You can only view your own sessions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Getting sessions for user:', user_id, isAdmin ? '(admin request)' : '(own sessions)')

    // Get active sessions from user_sessions table (now includes user_agent, ip, etc.)
    const { data: userSessions, error: userSessionsError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (userSessionsError) {
      throw userSessionsError
    }

    // Get active auth.sessions using database function (has proper permissions)
    const { data: authSessions, error: authError } = await supabaseAdmin
      .rpc('get_active_auth_sessions', { user_uuid: user_id })

    if (authError) {
      console.error('❌ Could not query auth.sessions:', authError)
      console.warn('⚠️ Returning all non-revoked sessions without auth.sessions filtering')
      
      // Return all user_sessions without filtering (fallback)
      return new Response(
        JSON.stringify({ 
          sessions: userSessions || [],
          auth_sessions_available: false,
          error_message: authError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 User sessions:', userSessions?.length || 0)
    console.log('📊 Auth sessions:', authSessions?.length || 0)

    // Filter login sessions to only include those with active auth.sessions
    const activeAuthSessions = authSessions?.filter(s => 
      !s.not_after || new Date(s.not_after) > new Date()
    ) || []

    console.log('📊 Active auth sessions:', activeAuthSessions.length)
    console.log('📊 Auth sessions data:', authSessions)

    // Create a Set of active auth session IDs for quick lookup
    const activeAuthSessionIds = new Set(activeAuthSessions.map(s => s.session_id))
    
    console.log('🔍 Active auth session IDs:', Array.from(activeAuthSessionIds))
    
    // Match user_sessions with active auth sessions
    // user_sessions.session_token is the JWT that contains a session_id field
    const activeSessions: any[] = []
    
    if (userSessions) {
      for (const userSession of userSessions) {
        try {
          // Decode JWT to get the actual session_id
          const jwtPayload = userSession.session_token.split('.')[1]
          const decoded = JSON.parse(atob(jwtPayload))
          const actualSessionId = decoded.session_id
          
          console.log('🔍 Checking user_session:', {
            created: userSession.created_at,
            expires: userSession.expires_at,
            decoded_session_id: actualSessionId
          })
          
          // Check if this session exists in active auth.sessions and hasn't expired
          const isExpired = new Date(userSession.expires_at) < new Date()
          
          if (actualSessionId && activeAuthSessionIds.has(actualSessionId) && !isExpired) {
            activeSessions.push(userSession)
            console.log('✅ Active session matched:', actualSessionId)
          } else {
            if (isExpired) {
              console.log('❌ Session expired:', actualSessionId)
            } else {
              console.log('❌ Session not in auth.sessions:', actualSessionId)
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not process user_session:', e)
        }
      }
    }

    console.log('✅ Returning active sessions:', activeSessions.length)
    
    // Clean up stale sessions - delete any user_sessions that don't match auth.sessions
    const staleSessions = userSessions?.filter(us => {
      try {
        const jwtPayload = us.session_token.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const actualSessionId = decoded.session_id
        return !activeAuthSessionIds.has(actualSessionId)
      } catch {
        return true // If can't decode, it's stale
      }
    }) || []
    
    if (staleSessions.length > 0) {
      console.log('🧹 Cleaning up', staleSessions.length, 'stale sessions')
      
      for (const staleSession of staleSessions) {
        await supabaseAdmin
          .from('user_sessions')
          .delete()
          .eq('session_token', staleSession.session_token)
      }
    }

    return new Response(
      JSON.stringify({ 
        sessions: activeSessions,
        auth_sessions_available: true,
        total_auth_sessions: activeAuthSessions.length,
        cleaned_stale_sessions: staleSessions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface LogLoginRequest {
  user_id: string
  success: boolean
  failure_reason?: string | null
  user_agent: string
  device_type: string
  browser: string
  os: string
  used_2fa: boolean
  session_id?: string | null
}

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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase admin client with service role access
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

    // Get IP address from headers
    // Priority: x-forwarded-for (most common), cf-connecting-ip (Cloudflare), x-real-ip
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Rate limiting: Authentication function - 10/min, 100/hour per IP
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      ipAddress,
      'ip',
      'log-login',
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

    // Parse request body
    const body: LogLoginRequest = await req.json()
    
    // Get location from IP address using ipapi.co (free geolocation API)
    let location = null
    let locationCity = null
    let locationCountry = null
    
    if (ipAddress && ipAddress !== '127.0.0.1' && !ipAddress.startsWith('192.168.')) {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          locationCity = geoData.city || null
          locationCountry = geoData.country_name || null
          
          // Format combined location: "City, Country" or just "Country" if no city
          if (locationCity && locationCountry) {
            location = `${locationCity}, ${locationCountry}`
          } else if (locationCountry) {
            location = locationCountry
          }
          console.log(`📍 Location resolved: ${location}`)
        }
      } catch (geoError) {
        console.warn('⚠️ Failed to resolve location from IP:', geoError)
        // Don't fail the whole request if geolocation fails
      }
    }

    console.log(`📊 Logging login attempt for user ${body.user_id}`)
    console.log(`   IP: ${ipAddress}`)
    console.log(`   Location: ${location || 'Unknown'}`)
    console.log(`   Device: ${body.device_type} • ${body.browser} • ${body.os}`)
    console.log(`   Success: ${body.success}`)
    console.log(`   2FA: ${body.used_2fa}`)
    console.log(`   Session ID: ${body.session_id ? 'captured' : 'none'}`)

    // Insert login activity record
    const { data, error } = await supabaseAdmin
      .from('user_login_activity')
      .insert({
        user_id: body.user_id,
        success: body.success,
        failure_reason: body.failure_reason,
        ip_address: ipAddress,
        user_agent: body.user_agent,
        device_type: body.device_type,
        browser: body.browser,
        os: body.os,
        location_city: locationCity,
        location_country: locationCountry,
        used_2fa: body.used_2fa,
        session_id: body.session_id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error logging login attempt:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log login attempt' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Login attempt logged successfully')
    
    // If login was successful and has session_id, also create/update user_sessions record
    if (body.success && body.session_id) {
      try {
        console.log('📝 Creating user_sessions record...')
        
        // Decode JWT to get expiration
        const jwtPayload = body.session_id.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const expiresAt = new Date(decoded.exp * 1000).toISOString()
        
        const { error: sessionError } = await supabaseAdmin
          .from('user_sessions')
          .upsert({
            user_id: body.user_id,
            session_token: body.session_id,
            expires_at: expiresAt,
            last_accessed: new Date().toISOString(),
            user_agent: body.user_agent,
            ip_address: ipAddress,
            location: location, // Geolocation from IP address
            device_type: body.device_type,
            browser: body.browser,
            os: body.os
          }, {
            onConflict: 'session_token'
          })
        
        if (sessionError) {
          console.warn('⚠️ Failed to create user_sessions record:', sessionError)
          // Don't fail the whole request if this fails
        } else {
          console.log('✅ User session record created')
        }
      } catch (e) {
        console.warn('⚠️ Error creating user_sessions record:', e)
        // Don't fail the whole request
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Login attempt logged',
        ip_address: ipAddress 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in log-login function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/log-login' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "user_id": "user-uuid-here",
      "success": true,
      "user_agent": "Mozilla/5.0...",
      "device_type": "Desktop",
      "browser": "Chrome",
      "os": "Linux",
      "used_2fa": false,
      "session_id": "session-token-here"
    }'

*/


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as OTPAuth from "https://esm.sh/otpauth@9.2.3"

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
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limiting: IP-based for 2FA verification - 20/min, 200/hour (prevent brute force)
    const rateLimitResult = await checkRateLimit(
      supabase,
      ipAddress,
      'ip',
      'verify-2fa-code',
      { requestsPerMinute: 20, requestsPerHour: 200, windowMinutes: 60 }
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
    const { userId, code, type = 'totp' } = await req.json()
    
    // Validate required fields
    if (!userId || !code) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'userId and code are required' 
      }), {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    // Validate code format based on type
    if (type === 'totp' && !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'TOTP code must be 6 digits' 
      }), {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    if (type === 'backup' && !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid backup code format' 
      }), {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    // Get user's 2FA data from database
    const { data: twoFAData, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret_key, is_enabled, backup_codes')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError || !twoFAData) {
      console.error('Failed to fetch 2FA data:', fetchError)
      
      // Log failed attempt
      await supabase.from('user_2fa_attempts').insert({
        user_id: userId,
        success: false,
        failure_reason: 'No 2FA setup found',
        attempt_type: type,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
      })

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No 2FA setup found for this user' 
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    let isValid = false

    // Verify based on type
    if (type === 'backup') {
      // Verify backup code
      const hashedCode = btoa(code) // Use same encoding as when saving
      const backupCodes = twoFAData.backup_codes || []
      
      // Check if code exists in backup codes
      const codeIndex = backupCodes.indexOf(hashedCode)
      isValid = codeIndex !== -1

      if (isValid) {
        // Remove used backup code from array
        const updatedCodes = backupCodes.filter((_, index) => index !== codeIndex)
        
        await supabase
          .from('user_2fa')
          .update({ 
            backup_codes: updatedCodes,
            last_verified_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        console.log(`Backup code used. Remaining codes: ${updatedCodes.length}`)
      }
    } else {
      // Verify TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: 'BitMinded',
        label: 'BitMinded',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: twoFAData.secret_key
      })

      // Verify the code (allow 1 time window before/after for clock skew)
      const delta = totp.validate({ 
        token: code, 
        window: 1  // Allow ±30 seconds clock skew
      })
      
      isValid = delta !== null

      // If valid, update last_verified_at timestamp
      if (isValid) {
        await supabase
          .from('user_2fa')
          .update({ last_verified_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
    }

    // Log the attempt
    await supabase.from('user_2fa_attempts').insert({
      user_id: userId,
      success: isValid,
      failure_reason: isValid ? null : 'Invalid code',
      attempt_type: type,
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
    })

    // Log verification result (for debugging)
    console.log('2FA verification:', {
      userId,
      success: isValid,
      timestamp: new Date().toISOString()
    })

    // Return verification result
    return new Response(JSON.stringify({ 
      success: isValid,
      message: isValid ? 'Code verified successfully' : 'Invalid code'
    }), {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
    
  } catch (error) {
    console.error('2FA verification error:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})


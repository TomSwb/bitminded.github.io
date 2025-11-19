import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

// Translation functions
function getGreeting(language: string): string {
  const greetings = {
    'en': 'Hello',
    'es': 'Hola',
    'fr': 'Bonjour',
    'de': 'Hallo'
  }
  return greetings[language as keyof typeof greetings] || 'Hello'
}

function translateSignature(signature: string, language: string): string {
  if (!signature) return ''
  
  const signatureTranslations = {
    'en': {
      'Your BitMinded Legal Team': 'Your BitMinded Legal Team',
      'Your BitMinded Contact Team': 'Your BitMinded Contact Team',
      'Your BitMinded Support Team': 'Your BitMinded Support Team',
      'Your BitMinded System Team': 'Your BitMinded System Team',
      'Your BitMinded Development Team': 'Your BitMinded Development Team'
    },
    'es': {
      'Your BitMinded Legal Team': 'Su Equipo Legal de BitMinded',
      'Your BitMinded Contact Team': 'Su Equipo de Contacto de BitMinded',
      'Your BitMinded Support Team': 'Su Equipo de Soporte de BitMinded',
      'Your BitMinded System Team': 'Su Equipo del Sistema de BitMinded',
      'Your BitMinded Development Team': 'Su Equipo de Desarrollo de BitMinded'
    },
    'fr': {
      'Your BitMinded Legal Team': 'Votre Équipe Juridique BitMinded',
      'Your BitMinded Contact Team': 'Votre Équipe de Contact BitMinded',
      'Your BitMinded Support Team': 'Votre Équipe de Support BitMinded',
      'Your BitMinded System Team': 'Votre Équipe Système BitMinded',
      'Your BitMinded Development Team': 'Votre Équipe de Développement BitMinded'
    },
    'de': {
      'Your BitMinded Legal Team': 'Ihr BitMinded Rechtsteam',
      'Your BitMinded Contact Team': 'Ihr BitMinded Kontaktteam',
      'Your BitMinded Support Team': 'Ihr BitMinded Support-Team',
      'Your BitMinded System Team': 'Ihr BitMinded System-Team',
      'Your BitMinded Development Team': 'Ihr BitMinded Entwicklungsteam'
    }
  }
  
  const translations = signatureTranslations[language as keyof typeof signatureTranslations]
  return translations?.[signature as keyof typeof translations] || signature
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token from Authorization header and verify session exists (prevent use of revoked tokens)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create admin client for user_sessions query
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: Notification function - 20/min, 500/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'send-notification',
      { requestsPerMinute: 20, requestsPerHour: 500, windowMinutes: 60 }
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

    // Verify user is admin
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { target_user_id, subject, body, signature_used, language_used } = await req.json()

    // Validate required fields
    if (!target_user_id || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id and body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabaseClient
      .from('user_profiles')
      .select('id, username, language')
      .eq('id', target_user_id)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's language for translation
    const userLanguage = language_used || targetUser.language || 'en'
    
    // Create greeting and translate signature
    const greeting = getGreeting(userLanguage)
    const translatedSignature = translateSignature(signature_used || '', userLanguage)
    
    // Construct the full message with greeting
    const fullMessage = `${greeting} ${targetUser.username},\n\n${body}`

    // Create notification record in database
    const { data: communication, error: communicationError } = await supabaseClient
      .from('user_communications')
      .insert({
        user_id: target_user_id,
        admin_id: user.id,
        type: 'notification',
        subject: subject || null,
        body: fullMessage,
        signature_used: translatedSignature || null,
        language_used: userLanguage,
        status: 'delivered' // Notifications are delivered instantly
      })
      .select()
      .single()

    if (communicationError) {
      console.error('Database error:', communicationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create notification record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification in user_notifications table for the notification center
    const { error: notificationError } = await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: target_user_id,
        type: 'announcement',
        title: subject || 'Message from BitMinded',
        message: fullMessage,
        icon: '📧',
        read: false
      })

    if (notificationError) {
      console.error('Failed to create user notification:', notificationError)
    }

    // Log admin action
    const { error: logError } = await supabaseClient
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        action: 'notification_sent',
        details: `Sent notification to user: ${targetUser.username}`,
        user_id: target_user_id
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        communication_id: communication.id,
        message: 'Notification sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

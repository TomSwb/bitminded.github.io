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

type MaintenanceSettingsRecord = {
  id: number
  is_enabled: boolean
  bypass_ips: string[]
  bypass_cookie_secret: string | null
  last_generated_token: string | null
  last_generated_token_expires_at: string | null
  updated_at: string | null
  updated_by: string | null
}

const DEFAULT_SETTINGS: MaintenanceSettingsRecord = {
  id: 1,
  is_enabled: false,
  bypass_ips: [],
  bypass_cookie_secret: null,
  last_generated_token: null,
  last_generated_token_expires_at: null,
  updated_at: null,
  updated_by: null
}

const BYPASS_TTL_SECONDS = 60 * 60 * 24 // 24 hours
const MAX_ALLOWLIST_ENTRIES = 64
const DEFAULT_BASE_URL =
  Deno.env.get('MAINTENANCE_BYPASS_BASE_URL') ??
  Deno.env.get('PUBLIC_SITE_URL') ??
  'https://bitminded.ch'

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401, corsHeaders)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return jsonResponse({ error: 'Invalid authorization header' }, 401, corsHeaders)
    }

    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

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

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('❌ maintenance-settings: auth failure', userError)
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      console.error('❌ maintenance-settings: session revoked')
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // Rate limiting: Admin function - 60/min, 2000/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'maintenance-settings',
      { requestsPerMinute: 60, requestsPerHour: 2000, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter },
        429,
        corsHeaders
      )
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.warn('⚠️ maintenance-settings: non-admin access attempt', {
        user_id: user.id
      })
      return jsonResponse({ error: 'Forbidden - Admin access required' }, 403, corsHeaders)
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const action = typeof body.action === 'string' ? body.action.toLowerCase() : 'get'

    if (action === 'get') {
      const settings = await getSettings(supabaseAdmin)
      const responsePayload = await decorateSettings(supabaseAdmin, settings)
      return jsonResponse({ success: true, settings: responsePayload }, 200, corsHeaders)
    }

    if (action === 'update') {
      return await handleUpdate({
        supabaseAdmin,
        userId: user.id,
        body,
        corsHeaders
      })
    }

    return jsonResponse({ error: `Unsupported action: ${action}` }, 400, corsHeaders)
  } catch (error: any) {
    console.error('❌ maintenance-settings: unhandled error', error)
    return jsonResponse({ error: 'Internal server error', details: error?.message }, 500, corsHeaders)
  }
})

async function handleUpdate({
  supabaseAdmin,
  userId,
  body,
  corsHeaders
}: {
  supabaseAdmin: ReturnType<typeof createClient>
  userId: string
  body: any
  corsHeaders: Record<string, string>
}) {
  const currentSettings = await getSettings(supabaseAdmin)

  console.log('📋 maintenance-settings: currentSettings.bypass_ips', JSON.stringify(currentSettings.bypass_ips))
  console.log('📋 maintenance-settings: body.bypass_ips', JSON.stringify(body.bypass_ips))
  
  const requestedEnabled = typeof body.is_enabled === 'boolean'
    ? body.is_enabled
    : currentSettings.is_enabled

  // Only update bypass_ips if explicitly provided in the request
  // This preserves existing IPs when toggling maintenance mode on/off
  const bypassIpsProvided = body.bypass_ips !== undefined
  const requestedIps = bypassIpsProvided
    ? normalizeIps(body.bypass_ips, currentSettings.bypass_ips)
    : currentSettings.bypass_ips

  console.log('📋 maintenance-settings: bypassIpsProvided', bypassIpsProvided)
  console.log('📋 maintenance-settings: requestedIps', JSON.stringify(requestedIps))

  const generateBypassToken = Boolean(body.generate_bypass_token)

  const updatePayload: Partial<MaintenanceSettingsRecord> = {
    id: 1, // Include id for upsert to work
    is_enabled: requestedEnabled,
    bypass_ips: requestedIps,
    updated_by: userId,
    updated_at: new Date().toISOString()
  }

  let bypassLink: string | null = null

  if (generateBypassToken) {
    // Generate new token and expiry
    const secret = currentSettings.bypass_cookie_secret ?? generateSecret()
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + BYPASS_TTL_SECONDS
    const rawToken = generateToken()
    const signature = await signToken(secret, `${rawToken}.${expiresAt}`)
    const signedToken = `${rawToken}.${expiresAt}.${signature}`

    updatePayload.bypass_cookie_secret = secret
    updatePayload.last_generated_token = signedToken
    updatePayload.last_generated_token_expires_at = new Date(expiresAt * 1000).toISOString()
    bypassLink = buildBypassLink(signedToken)
  } else if (requestedEnabled) {
    // Maintenance mode is enabled: preserve existing token fields if they exist
    if (currentSettings.bypass_cookie_secret) {
      updatePayload.bypass_cookie_secret = currentSettings.bypass_cookie_secret
    }
    if (currentSettings.last_generated_token) {
      updatePayload.last_generated_token = currentSettings.last_generated_token
      updatePayload.last_generated_token_expires_at = currentSettings.last_generated_token_expires_at
      bypassLink = buildBypassLink(currentSettings.last_generated_token)
    }
  } else {
    // Maintenance mode is disabled: clear token fields for clean state
    updatePayload.bypass_cookie_secret = null
    updatePayload.last_generated_token = null
    updatePayload.last_generated_token_expires_at = null
  }

  const { data: updatedSettings, error: updateError } = await supabaseAdmin
    .from('maintenance_settings')
    .upsert(updatePayload as Record<string, unknown>, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (updateError) {
    console.error('❌ maintenance-settings: upsert failed', updateError)

    if (generateBypassToken && updateError.code === '42703') {
      return jsonResponse(
        {
          error: 'Bypass tokens are not supported in the current database schema.',
          hint:
            'Apply the maintenance_settings migration (20251112_create_maintenance_settings.sql) or disable bypass token generation.'
        },
        400,
        corsHeaders
      )
    }

    return jsonResponse({ error: 'Failed to update maintenance settings' }, 500, corsHeaders)
  }

  const responseSettings = await decorateSettings(supabaseAdmin, updatedSettings, bypassLink)

  return jsonResponse({
    success: true,
    message: 'Maintenance settings updated.',
    settings: responseSettings
  }, 200, corsHeaders)
}

async function getSettings(supabaseAdmin: ReturnType<typeof createClient>): Promise<MaintenanceSettingsRecord> {
  const { data, error } = await supabaseAdmin
    .from('maintenance_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('❌ maintenance-settings: failed to fetch settings', error)
    throw error
  }

  if (!data) return DEFAULT_SETTINGS

  // Normalize bypass_ips to ensure it's always a proper JS array
  return {
    ...data,
    bypass_ips: parseTextArray(data.bypass_ips)
  }
}

async function decorateSettings(
  supabaseAdmin: ReturnType<typeof createClient>,
  settings: MaintenanceSettingsRecord,
  explicitLink?: string | null
) {
  let updatedByEmail: string | null = null

  if (settings.updated_by) {
    try {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(settings.updated_by)
      updatedByEmail = adminUser?.user?.email ?? null
    } catch (error) {
      console.warn('⚠️ maintenance-settings: could not resolve updated_by email', error)
    }
  }

  const link = explicitLink
    ?? (settings.last_generated_token ? buildBypassLink(settings.last_generated_token) : null)

  return {
    id: settings.id,
    is_enabled: settings.is_enabled,
    bypass_ips: settings.bypass_ips ?? [],
    updated_at: settings.updated_at,
    updated_by: settings.updated_by,
    updated_by_email: updatedByEmail,
    last_generated_link: link,
    last_generated_link_expires_at: settings.last_generated_token_expires_at
  }
}

function parseTextArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(v => String(v ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '{}') return []
    const inner = trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed.slice(1, -1)
      : trimmed
    if (!inner) return []
    return inner
      .match(/"([^"\\]*(\\.[^"\\]*)*)"|[^,]+/g)
      ?.map(s => s.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').trim())
      .filter(Boolean) || []
  }
  return []
}

function normalizeIps(input: unknown, fallback: string[]) {
  if (!Array.isArray(input)) {
    return fallback ?? []
  }

  const deduped = new Set<string>()

  for (const value of input) {
    const candidate = String(value ?? '').trim()
    if (!candidate) continue
    if (!isValidIpOrCidr(candidate)) continue
    deduped.add(candidate)
    if (deduped.size >= MAX_ALLOWLIST_ENTRIES) {
      break
    }
  }

  return Array.from(deduped)
}

function isValidIpOrCidr(value: string) {
  if (!value) return false

  if (value.toLowerCase() === 'localhost') {
    return true
  }

  const ipv4Segment = '(25[0-5]|2[0-4]\\d|1?\\d?\\d)'
  const ipv4Pattern = new RegExp(`^(${ipv4Segment}\\.){3}${ipv4Segment}(\\/(3[0-2]|[12]?\\d))?$`)
  if (ipv4Pattern.test(value)) {
    return true
  }

  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{0,4})(\/(12[0-8]|1[01][0-9]|[1-9]?[0-9]))?$/
  return ipv6Pattern.test(value)
}

function generateSecret() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
}

function generateToken() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)))
}

async function signToken(secret: string, payload: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

function base64UrlEncode(bytes: Uint8Array) {
  const binary = String.fromCharCode(...bytes)
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function buildBypassLink(token: string) {
  const sanitizedBase = DEFAULT_BASE_URL.replace(/\/+$/, '')
  return `${sanitizedBase}/maintenance/unlock?code=${encodeURIComponent(token)}`
}

function jsonResponse(payload: Record<string, unknown>, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}


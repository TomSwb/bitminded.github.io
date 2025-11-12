// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return jsonResponse({ error: 'Invalid authorization header' }, 401)
    }

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
      return jsonResponse({ error: 'Unauthorized' }, 401)
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
      return jsonResponse({ error: 'Forbidden - Admin access required' }, 403)
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
      return jsonResponse({ success: true, settings: responsePayload })
    }

    if (action === 'update') {
      return await handleUpdate({
        supabaseAdmin,
        userId: user.id,
        body
      })
    }

    return jsonResponse({ error: `Unsupported action: ${action}` }, 400)
  } catch (error) {
    console.error('❌ maintenance-settings: unhandled error', error)
    return jsonResponse({ error: 'Internal server error', details: error?.message }, 500)
  }
})

async function handleUpdate({
  supabaseAdmin,
  userId,
  body
}: {
  supabaseAdmin: ReturnType<typeof createClient>
  userId: string
  body: any
}) {
  const currentSettings = await getSettings(supabaseAdmin)

  const requestedEnabled = typeof body.is_enabled === 'boolean'
    ? body.is_enabled
    : currentSettings.is_enabled

  const requestedIps = normalizeIps(body.bypass_ips, currentSettings.bypass_ips)
  const generateBypassToken = Boolean(body.generate_bypass_token)

  const updatePayload: Partial<MaintenanceSettingsRecord> = {
    is_enabled: requestedEnabled,
    bypass_ips: requestedIps,
    updated_by: userId,
    updated_at: new Date().toISOString()
  }

  let bypassLink: string | null = null

  if (generateBypassToken) {
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
  } else if (currentSettings.last_generated_token) {
    bypassLink = buildBypassLink(currentSettings.last_generated_token)
  }

  const { data: updatedSettings, error: updateError } = await supabaseAdmin
    .from('maintenance_settings')
    .update(updatePayload as Record<string, unknown>)
    .eq('id', 1)
    .select()
    .single()

  if (updateError) {
    console.error('❌ maintenance-settings: update failed', updateError)
    return jsonResponse({ error: 'Failed to update maintenance settings' }, 500)
  }

  const responseSettings = await decorateSettings(supabaseAdmin, updatedSettings, bypassLink)

  return jsonResponse({
    success: true,
    message: 'Maintenance settings updated.',
    settings: responseSettings
  })
}

async function getSettings(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseAdmin
    .from('maintenance_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('❌ maintenance-settings: failed to fetch settings', error)
    throw error
  }

  return data ?? DEFAULT_SETTINGS
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

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}


interface Env {
  ORIGIN_URL: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  MAINTENANCE_PAGE_URL?: string
  MAINTENANCE_SETTINGS_CACHE_SECONDS?: string
  MAINTENANCE_BYPASS_COOKIE_NAME?: string
  MAINTENANCE_COOKIE_DOMAIN?: string
}

type MaintenanceSettings = {
  is_enabled: boolean
  bypass_ips: string[]
  bypass_cookie_secret: string | null
  last_generated_token: string | null
  last_generated_token_expires_at: string | null
  updated_at: string | null
}

type CachedValue<T> = {
  value: T | null
  expiresAt: number
}

const settingsCache: CachedValue<MaintenanceSettings> = {
  value: null,
  expiresAt: 0
}

const maintenancePageCache: CachedValue<string> = {
  value: null,
  expiresAt: 0
}

const DEFAULT_CACHE_SECONDS = 30
const BYPASS_TTL_SECONDS = 60 * 60 * 24 // 24 hours
const DEFAULT_COOKIE_NAME = 'maintenance_bypass'
const MAINTENANCE_UNLOCK_PATH = '/maintenance/unlock'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    const url = new URL(request.url)

    if (url.pathname === MAINTENANCE_UNLOCK_PATH) {
      const settings = await getSettings(env, { bypassCache: true })
      return await handleBypassUnlock(request, env, settings)
    }

    // Health check endpoint
    if (url.pathname === '/.well-known/maintenance-status') {
      const settings = await getSettings(env)
      return new Response(
        JSON.stringify({
          maintenance: settings.is_enabled,
          updated_at: settings.updated_at
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    const settings = await getSettings(env)

    if (!settings.is_enabled) {
      return proxyToOrigin(request, env)
    }

    const clientIp = getClientIp(request)
    const allowlist = settings.bypass_ips || []
    const cookieName = getCookieName(env)

    if (clientIp && ipMatchesAllowlist(clientIp, allowlist)) {
      return proxyToOrigin(request, env)
    }

    const bypassCookie = getCookie(request.headers.get('Cookie') ?? '', cookieName)
    if (bypassCookie && await verifyBypassToken(bypassCookie, settings)) {
      return proxyToOrigin(request, env)
    }

    return await serveMaintenancePage(env, settings)
  }
}

async function proxyToOrigin(request: Request, env: Env) {
  const originUrl = env.ORIGIN_URL ?? ''
  if (!originUrl) {
    return new Response('Origin URL not configured', {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store'
      }
    })
  }

  const incomingUrl = new URL(request.url)
  const target = new URL(incomingUrl.pathname + incomingUrl.search, originUrl)
  const proxiedRequest = new Request(target.toString(), request)

  return fetch(proxiedRequest)
}

async function serveMaintenancePage(env: Env, settings: MaintenanceSettings) {
  const body = await getMaintenancePage(env, settings)
  return new Response(body, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Retry-After': '600'
    }
  })
}

async function getMaintenancePage(env: Env, settings: MaintenanceSettings) {
  const now = Date.now()
  if (maintenancePageCache.value && maintenancePageCache.expiresAt > now) {
    return maintenancePageCache.value
  }

  const cacheDuration = (parseInt(env.MAINTENANCE_SETTINGS_CACHE_SECONDS ?? '', 10) || DEFAULT_CACHE_SECONDS) * 1000

  if (env.MAINTENANCE_PAGE_URL) {
    try {
      const response = await fetch(env.MAINTENANCE_PAGE_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (response.ok) {
        const html = await response.text()
        maintenancePageCache.value = html
        maintenancePageCache.expiresAt = now + cacheDuration
        return html
      }
    } catch (error) {
      console.error('⚠️ maintenance-worker: failed to fetch maintenance page asset', error)
    }
  }

  const fallbackHtml = buildFallbackMaintenancePage(settings)
  maintenancePageCache.value = fallbackHtml
  maintenancePageCache.expiresAt = now + cacheDuration
  return fallbackHtml
}

function buildFallbackMaintenancePage(settings: MaintenanceSettings) {
  const estimatedReturn = settings.updated_at
    ? new Date(settings.updated_at).toLocaleString()
    : 'soon'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>We&rsquo;ll be right back</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top, rgba(17, 24, 39, 0.1), rgba(17, 24, 39, 0.04));
        color: #111827;
        padding: 2rem;
      }
      .card {
        max-width: 520px;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(8px);
        border-radius: 24px;
        padding: 3rem 2.5rem;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
        text-align: center;
      }
      h1 {
        font-size: clamp(2rem, 4vw, 2.75rem);
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }
      p {
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.08);
        color: #111827;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .contact {
        font-size: 0.95rem;
        color: rgba(17, 24, 39, 0.7);
      }
      a {
        color: inherit;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Maintenance</div>
      <h1>We&rsquo;re polishing a few things</h1>
      <p>Our team is applying updates right now. Service will resume shortly &mdash; thanks for your patience.</p>
      <p class="contact">Latest update: ${estimatedReturn}. Need a hand? Email <a href="mailto:hello@bitminded.ch">hello@bitminded.ch</a></p>
    </div>
  </body>
</html>`
}

async function handleBypassUnlock(request: Request, env: Env, settings: MaintenanceSettings) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirectTo = url.searchParams.get('redirect') || '/'
  const cookieName = getCookieName(env)

  if (!code || !(await verifyBypassToken(code, settings))) {
    return new Response('Invalid or expired bypass code.', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store'
      }
    })
  }

  const response = Response.redirect(redirectTo, 302)
  const cookieValue = buildBypassCookie(cookieName, code, request.url, env)
  response.headers.append('Set-Cookie', cookieValue)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function buildBypassCookie(name: string, value: string, requestUrl: string, env: Env) {
  const secure = requestUrl.startsWith('https://')
  const domain = env.MAINTENANCE_COOKIE_DOMAIN
  const attributes = [
    `${name}=${value}`,
    `Max-Age=${BYPASS_TTL_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    'HttpOnly',
    domain ? `Domain=${domain}` : ''
  ].filter(Boolean)

  return attributes.join('; ')
}

async function verifyBypassToken(token: string, settings: MaintenanceSettings) {
  if (!settings.bypass_cookie_secret || !token) {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }

  const [rawToken, expires, signature] = parts

  const expirySeconds = parseInt(expires, 10)
  if (Number.isNaN(expirySeconds) || expirySeconds * 1000 < Date.now()) {
    return false
  }

  const secret = settings.bypass_cookie_secret
  try {
    const expectedSignature = await generateSignature(secret, `${rawToken}.${expires}`)
    return timingSafeEqual(expectedSignature, signature)
  } catch {
    return false
  }
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

async function generateSignature(secret: string, payload: string) {
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
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getCookieName(env: Env) {
  return env.MAINTENANCE_BYPASS_COOKIE_NAME || DEFAULT_COOKIE_NAME
}

function getCookie(cookieHeader: string, name: string) {
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())
  for (const cookie of cookies) {
    if (!cookie) continue
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex === -1) continue
    const key = cookie.slice(0, separatorIndex)
    if (key === name) {
      return cookie.slice(separatorIndex + 1)
    }
  }
  return null
}

async function getSettings(env: Env, options: { bypassCache?: boolean } = {}) {
  const now = Date.now()
  const cacheDuration = (parseInt(env.MAINTENANCE_SETTINGS_CACHE_SECONDS ?? '', 10) || DEFAULT_CACHE_SECONDS) * 1000

  if (!options.bypassCache && settingsCache.value && settingsCache.expiresAt > now) {
    return settingsCache.value
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/maintenance_settings?id=eq.1`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation'
      }
    })

    if (!response.ok) {
      throw new Error(`Supabase responded with ${response.status}`)
    }

    const data = (await response.json()) as any[]
    const record = data?.[0] ?? {}

    const settings: MaintenanceSettings = {
      is_enabled: Boolean(record.is_enabled),
      bypass_ips: parseSupabaseTextArray(record.bypass_ips),
      bypass_cookie_secret: record.bypass_cookie_secret ?? null,
      last_generated_token: record.last_generated_token ?? null,
      last_generated_token_expires_at: record.last_generated_token_expires_at ?? null,
      updated_at: record.updated_at ?? null
    }

    settingsCache.value = settings
    settingsCache.expiresAt = now + cacheDuration
    return settings
  } catch (error) {
    console.error('⚠️ maintenance-worker: failed to fetch settings, defaulting to fail-open', error)
    const fallback: MaintenanceSettings = {
      is_enabled: false,
      bypass_ips: [],
      bypass_cookie_secret: null,
      last_generated_token: null,
      last_generated_token_expires_at: null,
      updated_at: null
    }
    settingsCache.value = fallback
    settingsCache.expiresAt = now + cacheDuration
    return fallback
  }
}

function parseSupabaseTextArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '{}') {
      return []
    }
    const inner = trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed.slice(1, -1)
      : trimmed
    if (!inner) {
      return []
    }
    return inner
      .match(/"([^"\\]*(\\.[^"\\]*)*)"|[^,]+/g)
      ?.map((segment) => segment.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').trim())
      .filter(Boolean) ?? []
  }
  return []
}

function getClientIp(request: Request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  )
}

function ipMatchesAllowlist(ip: string, allowlist: string[]) {
  if (!allowlist.length) {
    return false
  }

  for (const entry of allowlist) {
    if (!entry) continue
    if (entry.toLowerCase() === 'localhost') {
      continue
    }

    if (entry.includes('/')) {
      if (matchCidr(ip, entry)) {
        return true
      }
    } else if (ip === entry) {
      return true
    }
  }

  return false
}

function matchCidr(ip: string, cidr: string) {
  const [base, mask] = cidr.split('/')
  const maskBits = parseInt(mask ?? '', 10)
  if (Number.isNaN(maskBits)) {
    return false
  }

  if (isIpv4(ip) && isIpv4(base)) {
    return matchIpv4Cidr(ip, base, maskBits)
  }

  if (isIpv6(ip) && isIpv6(base)) {
    return matchIpv6Cidr(ip, base, maskBits)
  }

  return false
}

function isIpv4(value: string) {
  return value.includes('.')
}

function isIpv6(value: string) {
  return value.includes(':')
}

function matchIpv4Cidr(ip: string, base: string, maskBits: number) {
  if (maskBits < 0 || maskBits > 32) {
    return false
  }
  const ipInt = ipv4ToInt(ip)
  const baseInt = ipv4ToInt(base)
  if (ipInt === null || baseInt === null) {
    return false
  }
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

function ipv4ToInt(ip: string) {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }
  let result = 0
  for (const part of parts) {
    const value = parseInt(part, 10)
    if (Number.isNaN(value) || value < 0 || value > 255) {
      return null
    }
    result = (result << 8) + value
  }
  return result >>> 0
}

function matchIpv6Cidr(ip: string, base: string, maskBits: number) {
  if (maskBits < 0 || maskBits > 128) {
    return false
  }
  const ipBigInt = ipv6ToBigInt(ip)
  const baseBigInt = ipv6ToBigInt(base)
  if (ipBigInt === null || baseBigInt === null) {
    return false
  }
  if (maskBits === 0) {
    return true
  }
  const bits = BigInt(maskBits)
  const mask = bits === 128n
    ? (1n << 128n) - 1n
    : ((1n << bits) - 1n) << (128n - bits)
  return (ipBigInt & mask) === (baseBigInt & mask)
}

function ipv6ToBigInt(ip: string) {
  const [head, tail] = ip.split('::')
  const headSegments = head ? head.split(':') : []
  const tailSegments = tail ? tail.split(':') : []

  if (tail !== undefined && ip.indexOf('::') !== ip.lastIndexOf('::')) {
    return null
  }

  const missingSegments = 8 - (headSegments.length + tailSegments.length)
  if (missingSegments < 0) {
    return null
  }

  const segments = [
    ...headSegments,
    ...Array(missingSegments).fill('0'),
    ...tailSegments
  ]

  if (segments.length !== 8) {
    return null
  }

  let result = 0n
  for (const segment of segments) {
    if (segment.includes('.')) {
      // IPv4-mapped IPv6 (e.g. ::ffff:192.0.2.128)
      const ipv4Int = ipv4ToInt(segment)
      if (ipv4Int === null) {
        return null
      }
      result = (result << 32n) + BigInt(ipv4Int)
      continue
    }

    const value = parseInt(segment || '0', 16)
    if (Number.isNaN(value) || value < 0 || value > 0xffff) {
      return null
    }
    result = (result << 16n) + BigInt(value)
  }

  return result
}


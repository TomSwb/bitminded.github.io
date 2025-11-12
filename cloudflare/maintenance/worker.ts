const settingsCache = { value: null, expiresAt: 0 };
const maintenancePageCache = { value: null, expiresAt: 0 };

const DEFAULT_CACHE_SECONDS = 30;
const BYPASS_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const DEFAULT_COOKIE_NAME = 'maintenance_bypass';
const MAINTENANCE_UNLOCK_PATH = '/maintenance/unlock';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === MAINTENANCE_UNLOCK_PATH) {
      const settings = await getSettings(env, { bypassCache: true });
      return handleBypassUnlock(request, env, settings);
    }

    if (url.pathname === '/.well-known/maintenance-status') {
      const settings = await getSettings(env);
      return jsonResponse({
        maintenance: settings.is_enabled,
        updated_at: settings.updated_at,
      });
    }

    const settings = await getSettings(env);

    if (!settings.is_enabled) {
      return proxyToOrigin(request, env);
    }

    const clientIp = getClientIp(request);
    const allowlist = settings.bypass_ips || [];
    const cookieName = getCookieName(env);

    if (clientIp && ipMatchesAllowlist(clientIp, allowlist)) {
      return proxyToOrigin(request, env);
    }

    const bypassCookie = getCookie(request.headers.get('Cookie') || '', cookieName);
    if (bypassCookie && (await verifyBypassToken(bypassCookie, settings))) {
      return proxyToOrigin(request, env);
    }

    return serveMaintenancePage(env, settings);
  },
};

async function proxyToOrigin(request, env) {
  const originUrl = env.ORIGIN_URL || 'https://bitminded.ch';
  const incomingUrl = new URL(request.url);
  const target = new URL(incomingUrl.pathname + incomingUrl.search, originUrl);

  const proxiedRequest = new Request(target.toString(), request);
  const headers = new Headers(proxiedRequest.headers);
  const originHost = new URL(originUrl).host;
  headers.set('host', originHost);

  return fetch(proxiedRequest, {
    headers,
    cf: { resolveOverride: 'bitminded.github.io' }, // GitHub Pages origin
  });
}

async function serveMaintenancePage(env, settings) {
  const body = await getMaintenancePage(env, settings);
  return new Response(body, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Retry-After': '600',
    },
  });
}

async function getMaintenancePage(env, settings) {
  const now = Date.now();
  const cacheDuration =
    (parseInt(env.MAINTENANCE_SETTINGS_CACHE_SECONDS || '', 10) || DEFAULT_CACHE_SECONDS) * 1000;

  if (maintenancePageCache.value && maintenancePageCache.expiresAt > now) {
    return maintenancePageCache.value;
  }

  if (env.MAINTENANCE_PAGE_URL) {
    try {
      const response = await fetch(env.MAINTENANCE_PAGE_URL, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const html = await response.text();
        maintenancePageCache.value = html;
        maintenancePageCache.expiresAt = now + cacheDuration;
        return html;
      }
    } catch (error) {
      console.error('⚠️ maintenance-worker: failed to fetch maintenance page asset', error);
    }
  }

  const fallbackHtml = buildFallbackMaintenancePage(settings);
  maintenancePageCache.value = fallbackHtml;
  maintenancePageCache.expiresAt = now + cacheDuration;
  return fallbackHtml;
}

function buildFallbackMaintenancePage(settings) {
  const estimatedReturn = settings.updated_at
    ? new Date(settings.updated_at).toLocaleString()
    : 'soon';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maintenance in progress · BitMinded</title>
    <style>
      :root {
        color-scheme: dark light;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2.75rem 1.75rem;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(140% 140% at 12% -10%, rgba(210, 134, 189, 0.18) 0%, rgba(39, 43, 46, 0) 55%),
          radial-gradient(120% 120% at 85% 0%, rgba(207, 222, 103, 0.16) 0%, rgba(39, 43, 46, 0) 60%),
          #272b2e;
        color: #eee9e4;
      }

      .card {
        width: min(100%, 540px);
        padding: clamp(2.5rem, 5vw, 3.75rem);
        background: rgba(21, 23, 30, 0.82);
        border-radius: 28px;
        border: 1px solid rgba(238, 233, 228, 0.15);
        box-shadow: 0 32px 60px rgba(15, 23, 42, 0.3);
        text-align: center;
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 1.15rem;
        border-radius: 999px;
        background: rgba(207, 222, 103, 0.18);
        color: #cfdE67;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      h1 {
        margin: 1.25rem 0 0.75rem;
        font-size: clamp(2.35rem, 5vw, 3.1rem);
        letter-spacing: -0.02em;
      }

      .lead {
        margin: 0 0 2.25rem;
        font-size: 1.05rem;
        color: rgba(238, 233, 228, 0.82);
        line-height: 1.7;
      }

      .details {
        display: grid;
        gap: 1.1rem;
        padding: 1.1rem 1.4rem;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        text-align: left;
      }

      .details-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
      }

      .details-label {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: rgba(238, 233, 228, 0.6);
        font-weight: 600;
      }

      .details-value {
        font-weight: 600;
        color: #eee9e4;
      }

      .contact {
        margin: 2rem 0 0;
        font-size: 0.95rem;
        color: rgba(238, 233, 228, 0.7);
      }

      a {
        color: #cfdE67;
        text-decoration: none;
        border-bottom: 1px solid rgba(207, 222, 103, 0.35);
        transition: color 0.2s ease, border-color 0.2s ease;
      }

      a:hover {
        color: #e7ff9a;
        border-bottom-color: rgba(207, 222, 103, 0.65);
      }

      @media (max-width: 520px) {
        .details-row {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">Maintenance</span>
      <h1>We’ll be right back</h1>
      <p class="lead">We’re shipping updates behind the scenes. Thanks for your patience while we finish the rollout.</p>
      <div class="details">
        <div class="details-row">
          <span class="details-label">Last update</span>
          <span class="details-value">${estimatedReturn}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Need assistance?</span>
          <span class="details-value"><a href="mailto:support@bitminded.ch">support@bitminded.ch</a></span>
        </div>
      </div>
      <p class="contact">We’ll restore full access as soon as maintenance wraps up.</p>
    </div>
  </body>
</html>`;
}

async function handleBypassUnlock(request, env, settings) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectTo = url.searchParams.get('redirect') || '/';
  const cookieName = getCookieName(env);

  if (!code || !(await verifyBypassToken(code, settings))) {
    return new Response('Invalid or expired bypass code.', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    });
  }

  const response = Response.redirect(redirectTo, 302);
  const cookieValue = buildBypassCookie(cookieName, code, request.url, env);
  response.headers.append('Set-Cookie', cookieValue);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function buildBypassCookie(name, value, requestUrl, env) {
  const secure = requestUrl.startsWith('https://');
  const domain = env.MAINTENANCE_COOKIE_DOMAIN;
  const attributes = [
    `${name}=${value}`,
    `Max-Age=${BYPASS_TTL_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    'HttpOnly',
    domain ? `Domain=${domain}` : '',
  ].filter(Boolean);

  return attributes.join('; ');
}

async function verifyBypassToken(token, settings) {
  if (!settings.bypass_cookie_secret || !token) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [rawToken, expires, signature] = parts;
  const expirySeconds = parseInt(expires, 10);

  if (Number.isNaN(expirySeconds) || expirySeconds * 1000 < Date.now()) {
    return false;
  }

  const payload = `${rawToken}.${expires}`;

  try {
    const expectedSignature = await generateSignature(settings.bypass_cookie_secret, payload);
    return timingSafeEqual(expectedSignature, signature);
  } catch {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function generateSignature(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getCookieName(env) {
  return env.MAINTENANCE_BYPASS_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function getCookie(cookieHeader, name) {
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    if (!cookie) continue;
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = cookie.slice(0, separatorIndex);
    if (key === name) {
      return cookie.slice(separatorIndex + 1);
    }
  }
  return null;
}

async function getSettings(env, options = {}) {
  const now = Date.now();
  const cacheDuration =
    (parseInt(env.MAINTENANCE_SETTINGS_CACHE_SECONDS || '', 10) || DEFAULT_CACHE_SECONDS) * 1000;

  if (!options.bypassCache && settingsCache.value && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/maintenance_settings?id=eq.1`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase responded with ${response.status}`);
    }

    const data = await response.json();
    const record = data?.[0] || {};

    const settings = {
      is_enabled: Boolean(record.is_enabled),
      bypass_ips: parseSupabaseTextArray(record.bypass_ips),
      bypass_cookie_secret: record.bypass_cookie_secret || null,
      last_generated_token: record.last_generated_token || null,
      last_generated_token_expires_at: record.last_generated_token_expires_at || null,
      updated_at: record.updated_at || null,
      updated_by: record.updated_by || null,
    };

    settingsCache.value = settings;
    settingsCache.expiresAt = now + cacheDuration;
    return settings;
  } catch (error) {
    console.error('⚠️ maintenance-worker: failed to fetch settings, defaulting to fail-open', error);
    const fallback = {
      is_enabled: false,
      bypass_ips: [],
      bypass_cookie_secret: null,
      last_generated_token: null,
      last_generated_token_expires_at: null,
      updated_at: null,
      updated_by: null,
    };
    settingsCache.value = fallback;
    settingsCache.expiresAt = now + cacheDuration;
    return fallback;
  }
}

function parseSupabaseTextArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '{}') {
      return [];
    }
    const inner = trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed.slice(1, -1)
      : trimmed;
    if (!inner) {
      return [];
    }
    return (
      inner
        .match(/"([^"\\]*(\\.[^"\\]*)*)"|[^,]+/g)
        ?.map((segment) => segment.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').trim())
        .filter(Boolean) || []
    );
  }
  return [];
}

function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  );
}

function ipMatchesAllowlist(ip, allowlist) {
  if (!allowlist.length) {
    return false;
  }

  for (const entry of allowlist) {
    if (!entry) continue;
    if (entry.toLowerCase() === 'localhost') {
      continue;
    }

    if (entry.includes('/')) {
      if (matchCidr(ip, entry)) {
        return true;
      }
    } else if (ip === entry) {
      return true;
    }
  }

  return false;
}

function matchCidr(ip, cidr) {
  const [base, mask] = cidr.split('/');
  const maskBits = parseInt(mask || '', 10);
  if (Number.isNaN(maskBits)) {
    return false;
  }

  if (isIpv4(ip) && isIpv4(base)) {
    return matchIpv4Cidr(ip, base, maskBits);
  }

  if (isIpv6(ip) && isIpv6(base)) {
    return matchIpv6Cidr(ip, base, maskBits);
  }

  return false;
}

function isIpv4(value) {
  return value.includes('.');
}

function isIpv6(value) {
  return value.includes(':');
}

function matchIpv4Cidr(ip, base, maskBits) {
  if (maskBits < 0 || maskBits > 32) {
    return false;
  }
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) {
    return false;
  }
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let result = 0;
  for (const part of parts) {
    const value = parseInt(part, 10);
    if (Number.isNaN(value) || value < 0 || value > 255) {
      return null;
    }
    result = (result << 8) + value;
  }
  return result >>> 0;
}

function matchIpv6Cidr(ip, base, maskBits) {
  if (maskBits < 0 || maskBits > 128) {
    return false;
  }
  const ipBigInt = ipv6ToBigInt(ip);
  const baseBigInt = ipv6ToBigInt(base);
  if (ipBigInt === null || baseBigInt === null) {
    return false;
  }
  if (maskBits === 0) {
    return true;
  }
  const bits = BigInt(maskBits);
  const shift = 128n - bits;
  const mask = bits === 128n ? (1n << 128n) - 1n : ((1n << bits) - 1n) << shift;
  return (ipBigInt & mask) === (baseBigInt & mask);
}

function ipv6ToBigInt(ip) {
  const [head, tail] = ip.split('::');
  const headSegments = head ? head.split(':') : [];
  const tailSegments = tail ? tail.split(':') : [];

  if (tail !== undefined && ip.indexOf('::') !== ip.lastIndexOf('::')) {
    return null;
  }

  const missingSegments = 8 - (headSegments.length + tailSegments.length);
  if (missingSegments < 0) {
    return null;
  }

  const segments = [...headSegments, ...Array(missingSegments).fill('0'), ...tailSegments];
  if (segments.length !== 8) {
    return null;
  }

  let result = 0n;
  for (const segment of segments) {
    if (segment.includes('.')) {
      const ipv4Int = ipv4ToInt(segment);
      if (ipv4Int === null) {
        return null;
      }
      result = (result << 32n) + BigInt(ipv4Int);
      continue;
    }

    const value = parseInt(segment || '0', 16);
    if (Number.isNaN(value) || value < 0 || value > 0xffff) {
      return null;
    }
    result = (result << 16n) + BigInt(value);
  }

  return result;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
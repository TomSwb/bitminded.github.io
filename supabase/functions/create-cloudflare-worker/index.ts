/**
 * Create Cloudflare Worker Edge Function
 * Automatically creates and deploys a Cloudflare Worker for the product
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subdomain, productName, productSlug, supabaseFunctionsUrl: suppliedFunctionsUrl, supabaseAnonKey, githubPagesUrl } = await req.json()

    if (!subdomain || !productName) {
      throw new Error('Subdomain and product name are required')
    }

    // Get Cloudflare credentials from Supabase secrets
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const cloudflareZoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')
    
    if (!cloudflareApiToken || !cloudflareAccountId) {
      throw new Error('Cloudflare credentials not configured')
    }

    const workerName = `${productSlug}-worker`

    // Derive Supabase functions base URL to call validate-license from the Worker
    // Prefer frontend-supplied functions URL to match the exact project used by the wizard session
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const envFunctionsUrl = supabaseUrl ? supabaseUrl.replace('.supabase.co', '.functions.supabase.co') : ''
    const supabaseFunctionsUrl = suppliedFunctionsUrl || envFunctionsUrl

    // Step 1: Create the Worker
    console.log(`📦 Creating Cloudflare Worker: ${workerName}`)
    
    const createWorkerResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/javascript'
        },
        body: generateWorkerCode(productName, productSlug, supabaseFunctionsUrl, supabaseAnonKey || '', githubPagesUrl)
      }
    )

    if (!createWorkerResponse.ok) {
      const error = await createWorkerResponse.text()
      throw new Error(`Failed to create Worker: ${error}`)
    }

    console.log('✅ Worker created successfully')

    // Step 1.1: Resolve account workers.dev subdomain for dev URL
    let workersSubdomain = ''
    try {
      const subdomainRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/subdomain`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${cloudflareApiToken}` }
        }
      )
      if (subdomainRes.ok) {
        const subdomainJson = await subdomainRes.json()
        workersSubdomain = subdomainJson?.result?.subdomain || ''
      }
    } catch (_) {
      // ignore; fallback handled below
    }

    // Step 2: Configure DNS + route for custom domain
    const customDomain = `${subdomain}.bitminded.ch`
    
    console.log(`🌐 Configuring custom domain: ${customDomain}`)

    // Step 2.1: Ensure DNS record exists and proxied
    if (cloudflareZoneId) {
      try {
        // First, check if DNS record exists
        const listDnsRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records?name=${customDomain}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${cloudflareApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        const listDnsJson = await listDnsRes.json()
        const existingRecords = listDnsJson?.result || []
        
        if (existingRecords.length > 0) {
          // Update existing record to ensure it's proxied
          const recordId = existingRecords[0].id
          const updateRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records/${recordId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${cloudflareApiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proxied: true
              })
            }
          )
          
          if (updateRes.ok) {
            console.log('✅ DNS record updated to proxied')
          } else {
            const dnsTxt = await updateRes.text()
            console.warn(`⚠️ Could not update DNS record to proxied: ${dnsTxt}`)
          }
        } else {
          // Create new DNS record
          const dnsRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/dns_records`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cloudflareApiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'A',
                name: subdomain,
                content: '192.0.2.1', // placeholder IP, requests terminate at edge
                ttl: 1,
                proxied: true
              })
            }
          )
          
          if (!dnsRes.ok) {
            const dnsTxt = await dnsRes.text()
            console.warn(`⚠️ Could not create DNS record: ${dnsTxt}`)
          } else {
            console.log('✅ DNS record created (proxied)')
          }
        }
      } catch (e) {
        console.warn('⚠️ DNS creation failed (will rely on existing record)', e)
      }
    }

    let domainResponse: Response | null = null
    if (cloudflareZoneId) {
      // Preferred: zone-level routes API
      domainResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/workers/routes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cloudflareApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pattern: `${subdomain}.bitminded.ch/*`,
            script: workerName
          })
        }
      )
    }

    if (!domainResponse.ok) {
      const error = await domainResponse.text()
      console.warn(`⚠️ Could not configure custom domain: ${error}`)
      // Don't fail if domain setup fails, it can be done manually
    } else {
      console.log('✅ Custom domain configured successfully')
    }

    // Step 3: Bind environment variables if needed
    // (For example, to pass Supabase credentials to the Worker)

    const workerUrl = `https://${subdomain}.bitminded.ch`
    const workerDevUrl = workersSubdomain
      ? `https://${workerName}.${workersSubdomain}.workers.dev`
      : ''

    return new Response(
      JSON.stringify({
        success: true,
        workerName,
        workerUrl,
        workerDevUrl,
        customDomain: domainResponse && domainResponse.ok ? customDomain : null,
        message: 'Cloudflare Worker created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error in create-cloudflare-worker:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/**
 * Generate the Worker code for the product
 */
function generateWorkerCode(productName: string, productSlug: string, supabaseFunctionsUrl: string, supabaseAnonKey: string, githubPagesUrl?: string): string {
  return `/**
* ${productName} - Cloudflare Worker (classic)
* Enforces access via Supabase validate-license.
*/

const SUBSCRIBE_URL = 'https://bitminded.ch/subscribe?tool=${productSlug}'
const VALIDATE_URL = '${supabaseFunctionsUrl}/validate-license'
const SUPABASE_ANON_KEY = '${supabaseAnonKey}'

function getCookie(name, cookieHeader) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map(p => p.trim())
  for (const part of parts) {
    if (part.startsWith(name + '=')) {
      return part.substring(name.length + 1)
    }
  }
  return null
}

function getToken(req) {
  const cookieHeader = req.headers.get('Cookie') || ''
  // Try common cookie names set by Supabase or app
  const candidates = ['sb-access-token', 'supabase-auth-token']
  for (const name of candidates) {
    const v = getCookie(name, cookieHeader)
    if (v) return v
  }
  const authHeader = req.headers.get('Authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  return null
}

async function handleRequest(request) {
  const url = new URL(request.url)

  // Declare GITHUB_PAGES_URL once at the beginning
  const GITHUB_PAGES_URL = ${githubPagesUrl ? `'${githubPagesUrl}'` : 'null'}

  // Bypass trivial assets to avoid noisy errors before app routing is wired
  if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
    return new Response(null, { status: 204 })
  }

  // Allow auth pages to bypass authentication check
  // This allows users to login when their token expires
  if (url.pathname.startsWith('/auth')) {
    if (GITHUB_PAGES_URL) {
      const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
      return fetch(targetUrl, {
        headers: request.headers,
        method: request.method,
        body: request.body
      })
    }
  }

  // Proxy static assets directly to GitHub Pages without authentication
  // This allows React/Expo apps to load their JavaScript bundles, CSS, images, etc.
  // Static assets don't need auth - only the HTML page does
  
  // Allow static assets to bypass authentication check
  if (GITHUB_PAGES_URL && (
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.eot') ||
    url.pathname.endsWith('.ico')
  )) {
    const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
    return fetch(targetUrl, {
      headers: request.headers,
      method: request.method,
      body: request.body
    })
  }

  const token = getToken(request)

  // Lightweight debug mode: append ?debug=1 to see diagnostics (no secrets leaked)
  const debug = url.searchParams.get('debug') === '1'
  if (!token) {
    // Redirect to app's own auth page instead of main site
    const authUrl = '/auth?redirect=' + encodeURIComponent(url.pathname + url.search)
    return new Response(null, {
      status: 302,
      headers: { 'Location': authUrl }
    })
  }

  try {
    const validateRes = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ product_slug: '${productSlug}' })
    })

    if (!validateRes.ok) {
      // If token is expired/invalid (401/403), redirect to auth page
      if (validateRes.status === 401 || validateRes.status === 403) {
        const authUrl = '/auth?redirect=' + encodeURIComponent(url.pathname + url.search)
        return new Response(null, {
          status: 302,
          headers: { 'Location': authUrl }
        })
      }
      
      if (debug) {
        const bodyTxt = await validateRes.text().catch(() => '')
        const diag = { validate_url: VALIDATE_URL, status: validateRes.status, token_present: !!token, token_len: token ? token.length : 0, body_preview: bodyTxt.slice(0, 160) }
        return new Response(JSON.stringify(diag), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('Access check failed: ' + validateRes.status, { status: 502 })
    }

    const result = await validateRes.json()
    if (!result || !result.allowed) {
      if (debug) {
        const diag = { validate_url: VALIDATE_URL, status: 200, token_present: !!token, token_len: token ? token.length : 0, result }
        return new Response(JSON.stringify(diag), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(null, { status: 302, headers: { 'Location': SUBSCRIBE_URL } })
    }
  } catch (e) {
    if (debug) {
      const diag = { error: 'validation_exception', message: String(e), validate_url: VALIDATE_URL, token_present: !!token }
      return new Response(JSON.stringify(diag), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Access validation error', { status: 502 })
  }

  // Proxy to GitHub Pages for the actual app (HTML pages and other authenticated routes)
  if (!GITHUB_PAGES_URL) {
    return new Response('App not configured: GitHub Pages URL missing', { 
      status: 502,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  const targetUrl = GITHUB_PAGES_URL + url.pathname + url.search
  
  // Forward the request to GitHub Pages
  return fetch(targetUrl, {
    headers: request.headers,
    method: request.method,
    body: request.body
  })
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
`
}


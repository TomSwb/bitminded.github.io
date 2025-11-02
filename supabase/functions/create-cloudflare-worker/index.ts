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
    const { subdomain, productName, productSlug, supabaseFunctionsUrl: suppliedFunctionsUrl, supabaseAnonKey, githubPagesUrl, githubRepoUrl, cloudflarePagesUrl } = await req.json()

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

    // Determine Pages URL: prioritize Cloudflare Pages (private), fallback to GitHub Pages (public)
    let pagesUrl: string | null = cloudflarePagesUrl || null
    
    // If Cloudflare Pages URL not provided but GitHub repo URL is, try to create/get Pages project
    if (!pagesUrl && githubRepoUrl) {
      console.log(`🔍 Attempting to find/create Cloudflare Pages project for: ${githubRepoUrl}`)
      pagesUrl = await createOrGetCloudflarePagesProject(
        cloudflareApiToken,
        cloudflareAccountId,
        githubRepoUrl,
        productSlug
      )
      if (pagesUrl) {
        console.log(`✅ Cloudflare Pages URL resolved: ${pagesUrl}`)
      } else {
        console.warn(`⚠️ Could not find/create Cloudflare Pages project for ${githubRepoUrl}`)
      }
    } else if (!pagesUrl) {
      console.warn('⚠️ No Cloudflare Pages URL or GitHub repo URL provided')
    }
    
    // Fallback to GitHub Pages URL if nothing else available (not recommended for subscription apps)
    if (!pagesUrl) {
      pagesUrl = githubPagesUrl || null
      if (pagesUrl) {
        console.warn('⚠️ Using public GitHub Pages URL - not suitable for subscription-based apps')
      }
    }

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
        body: generateWorkerCode(productName, productSlug, supabaseFunctionsUrl, supabaseAnonKey || '', pagesUrl)
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
        pagesUrl: pagesUrl, // Cloudflare Pages URL used for proxying
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
 * Create or get Cloudflare Pages project from GitHub repo
 * Requires GitHub OAuth integration to be set up in Cloudflare dashboard
 */
async function createOrGetCloudflarePagesProject(
  apiToken: string,
  accountId: string,
  githubRepoUrl: string,
  projectName: string
): Promise<string | null> {
  console.log(`🔍 createOrGetCloudflarePagesProject called with:`)
  console.log(`   - githubRepoUrl: ${githubRepoUrl}`)
  console.log(`   - projectName: ${projectName}`)
  console.log(`   - accountId: ${accountId}`)
  
  try {
    // Extract owner/repo from GitHub URL
    const match = githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      console.warn('⚠️ Invalid GitHub repo URL:', githubRepoUrl)
      return null
    }
    
    const owner = match[1]
    const repo = match[2]
    const sanitizedProjectName = projectName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    
    console.log(`📦 Checking for Cloudflare Pages project: ${sanitizedProjectName} (from ${owner}/${repo})`)
    
    // Step 1: List existing Pages projects
    const listProjectsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!listProjectsResponse.ok) {
      const error = await listProjectsResponse.text()
      console.error('❌ Failed to list Pages projects:', error)
      return null
    }
    
    const projectsData = await listProjectsResponse.json()
    const existingProject = projectsData.result?.find(
      (p: any) => p.name === sanitizedProjectName || p.name === repo.toLowerCase()
    )
    
    // Step 2: If project exists, get deployment URL
    if (existingProject) {
      console.log(`✅ Found existing Cloudflare Pages project: ${existingProject.name}`)
      
      // Get latest deployment
      const deploymentsResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${existingProject.name}/deployments?page=1&per_page=1`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (deploymentsResponse.ok) {
        const deployments = await deploymentsResponse.json()
        const latestDeployment = deployments.result?.[0]
        if (latestDeployment?.url) {
          console.log(`✅ Found deployment URL: ${latestDeployment.url}`)
          return latestDeployment.url
        }
      }
      
      // Fallback to standard Pages URL pattern
      return `https://${existingProject.name}.pages.dev`
    }
    
    // Step 3: Create new Pages project from GitHub
    console.log(`📦 Creating new Cloudflare Pages project from GitHub: ${owner}/${repo}`)
    
    // Get available GitHub connections
    // Note: This requires GitHub OAuth to be set up in Cloudflare dashboard
    let connectionId: string | null = null
    
    try {
      // Try multiple API endpoints to find GitHub connections
      // Cloudflare API endpoints for git integrations may vary
      const endpoints = [
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/git/repos`,
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${sanitizedProjectName}/git/repos`,
      ]
      
      for (const endpoint of endpoints) {
        try {
          const connectionListResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (connectionListResponse.ok) {
            const connections = await connectionListResponse.json()
            console.log(`🔍 GitHub connections API response:`, JSON.stringify(connections).substring(0, 200))
            
            // Try different response structures
            const repos = connections.result || connections.repos || []
            const matchingConnection = repos.find((c: any) => 
              c.name?.includes(owner) || 
              c.owner === owner ||
              c.full_name?.includes(`${owner}/${repo}`) ||
              c.repo === repo
            )
            
            if (matchingConnection?.id || matchingConnection?.connection_id) {
              connectionId = matchingConnection.id || matchingConnection.connection_id
              console.log(`✅ Found GitHub connection: ${connectionId}`)
              break
            }
          } else {
            const errorText = await connectionListResponse.text()
            console.log(`⚠️ Connection endpoint failed (${endpoint}): ${errorText.substring(0, 200)}`)
          }
        } catch (endpointError) {
          console.log(`⚠️ Error checking endpoint ${endpoint}:`, endpointError)
        }
      }
      
      if (!connectionId) {
        console.warn('⚠️ No GitHub connection found. Will create project without repo link.')
        console.warn('   You may need to manually link the repo in Cloudflare dashboard.')
      }
    } catch (e) {
      console.error('❌ Error fetching GitHub connections:', e)
    }
    
    // Create the project with GitHub connection if available
    const projectConfig: any = {
      name: sanitizedProjectName,
      production_branch: 'main',
    }
    
    // If we have a connection ID, link the GitHub repo
    if (connectionId) {
      projectConfig.git_repo = {
        owner: owner,
        repo: repo,
        connection_id: connectionId
      }
      console.log(`📦 Linking GitHub repo: ${owner}/${repo}`)
    } else {
      console.warn('⚠️ No GitHub connection found. Project will be created without repo link.')
      console.warn('   Set up GitHub OAuth in Cloudflare dashboard first for full automation.')
    }
    
    // Create the Pages project
    const createProjectResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectConfig)
      }
    )
    
    if (createProjectResponse.ok) {
      const projectData = await createProjectResponse.json()
      console.log(`✅ Created Cloudflare Pages project: ${projectData.result?.name}`)
      
      // The project URL follows a predictable pattern
      const projectUrl = `https://${sanitizedProjectName}.pages.dev`
      
      // Try to link GitHub repo (requires connection ID - may need manual setup)
      // For now, return the URL and log instructions
      console.log(`📝 Project created. Link GitHub repo manually in dashboard, or provide connection_id for automation.`)
      console.log(`   Project URL: ${projectUrl}`)
      
      return projectUrl
    } else {
      const error = await createProjectResponse.text()
      console.error('❌ Failed to create Pages project:', error)
      
      // Check if project name already exists with different casing
      if (error.includes('already exists') || error.includes('409')) {
        return `https://${sanitizedProjectName}.pages.dev`
      }
      
      return null
    }
  } catch (error) {
    console.error('❌ Error managing Cloudflare Pages project:', error)
    return null
  }
}

/**
 * Generate the Worker code for the product
 */
function generateWorkerCode(productName: string, productSlug: string, supabaseFunctionsUrl: string, supabaseAnonKey: string, pagesUrl?: string): string {
  return `/**
* ${productName} - Cloudflare Worker (classic)
* Enforces access via Supabase validate-license.
*/

const LOGIN_URL = 'https://bitminded.ch/auth'
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

  // Bypass trivial assets to avoid noisy errors before app routing is wired
  if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
    return new Response(null, { status: 204 })
  }

  const token = getToken(request)

  // Lightweight debug mode: append ?debug=1 to see diagnostics (no secrets leaked)
  const debug = url.searchParams.get('debug') === '1'
  if (!token) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': LOGIN_URL + '?redirect=' + encodeURIComponent(url.href) }
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

  // Proxy to Pages (Cloudflare Pages or GitHub Pages) for the actual app
  const PAGES_URL = ${pagesUrl ? `'${pagesUrl}'` : 'null'}
  
  if (!PAGES_URL) {
    return new Response('App not configured: Pages URL missing', { 
      status: 502,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  const targetUrl = PAGES_URL + url.pathname + url.search
  
  // Forward the request to Pages
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


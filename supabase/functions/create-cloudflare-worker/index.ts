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
        body: generateWorkerCode(productName, productSlug, supabaseFunctionsUrl, supabaseAnonKey || '', pagesUrl || undefined)
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

    if (domainResponse && !domainResponse.ok) {
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
        pagesUrl: pagesUrl || null, // Cloudflare Pages URL used for proxying
        customDomain: (domainResponse && domainResponse.ok) ? customDomain : null,
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
    
    // Step 0: Try to find GitHub connection ID from any existing projects
    // This helps us link repos even if we can't list connections directly
    let connectionId: string | null = null
    
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
    const projectsList = projectsData.result || []
    
    // Extract connection_id from any existing project with git_repo
    for (const p of projectsList) {
      if (p.git_repo?.connection_id) {
        connectionId = p.git_repo.connection_id
        console.log(`✅ Found connection_id from existing project (${p.name}): ${connectionId}`)
        break
      }
    }
    
    const existingProject = projectsList.find(
      (p: any) => p.name === sanitizedProjectName || p.name === repo.toLowerCase()
    )
    
    // Step 2: If project exists, check if it needs git_repo linking
    if (existingProject) {
      console.log(`✅ Found existing Cloudflare Pages project: ${existingProject.name}`)
      
      // Check if project already has git_repo configured
      if (!existingProject.git_repo) {
        console.log(`🔗 Existing project found without git_repo - attempting to link...`)
        
        // Try to update the project with git_repo (connectionId already found above)
        if (connectionId) {
          try {
            const updateResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${existingProject.name}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${apiToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  git_repo: {
                    owner: owner,
                    repo: repo,
                    connection_id: connectionId
                  }
                })
              }
            )
            
            if (updateResponse.ok) {
              const updateData = await updateResponse.json()
              // Verify the git_repo was actually set
              if (updateData.result?.git_repo) {
                console.log(`✅ Successfully linked GitHub repo to existing project: ${updateData.result.git_repo.owner}/${updateData.result.git_repo.repo}`)
              } else {
                console.warn(`⚠️ Update succeeded but git_repo not in response. Verifying...`)
                
                // Re-fetch to verify
                const verifyResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${existingProject.name}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${apiToken}`,
                      'Content-Type': 'application/json'
                    }
                  }
                )
                
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json()
                  if (verifyData.result?.git_repo) {
                    console.log(`✅ Verified: GitHub repo is linked: ${verifyData.result.git_repo.owner}/${verifyData.result.git_repo.repo}`)
                  } else {
                    console.warn(`❌ Verification failed: git_repo still not set despite connection_id.`)
                    console.warn(`   Response: ${JSON.stringify(verifyData).substring(0, 400)}`)
                  }
                }
              }
            } else {
              const updateError = await updateResponse.text()
              console.warn(`⚠️ Could not link repo to existing project: ${updateError.substring(0, 200)}`)
            }
          } catch (updateError) {
            console.warn(`⚠️ Error updating project with git_repo:`, updateError)
          }
        } else {
          // Try without connection_id - might work if OAuth is configured
          try {
            const updateResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${existingProject.name}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${apiToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  git_repo: {
                    owner: owner,
                    repo: repo
                  }
                })
              }
            )
            
            if (updateResponse.ok) {
              const updateData = await updateResponse.json()
              // Verify the git_repo was actually set in the response
              if (updateData.result?.git_repo) {
                console.log(`✅ Successfully linked GitHub repo (auto-connect): ${updateData.result.git_repo.owner}/${updateData.result.git_repo.repo}`)
              } else {
                console.warn(`⚠️ Update succeeded but git_repo not in response. Verifying...`)
                
                // Re-fetch the project to verify git_repo was actually set
                const verifyResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${existingProject.name}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${apiToken}`,
                      'Content-Type': 'application/json'
                    }
                  }
                )
                
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json()
                  if (verifyData.result?.git_repo) {
                    console.log(`✅ Verified: GitHub repo is linked: ${verifyData.result.git_repo.owner}/${verifyData.result.git_repo.repo}`)
                  } else {
                    console.warn(`❌ Verification failed: git_repo still not set. Cloudflare API may require connection_id.`)
                    console.warn(`   Response: ${JSON.stringify(verifyData).substring(0, 400)}`)
                    console.warn(`   This typically means GitHub OAuth is not properly set up in Cloudflare dashboard.`)
                    console.warn(`   Manual setup required: https://dash.cloudflare.com/workers/pages/${existingProject.name}/settings/git`)
                  }
                }
              }
            } else {
              const updateError = await updateResponse.text()
              console.warn(`⚠️ Could not auto-link repo: ${updateError.substring(0, 200)}`)
            }
          } catch (updateError) {
            console.warn(`⚠️ Error auto-linking repo:`, updateError)
          }
        }
      } else {
        console.log(`✅ Project already has git_repo configured`)
      }
      
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
    // connectionId was already found above from existing projects
    // If not found, try additional methods below
    
    try {
      // Try to find GitHub connections using various API endpoints
      // Note: Cloudflare's API for listing available repos may require checking through existing projects
      // or may need to be done via the dashboard OAuth flow
      const endpoints = [
        // Try to get repos from any existing project (might reveal connection pattern)
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
      ]
      
      // First, try to see if we can infer connection from existing projects
      try {
        const projectsResponse = await fetch(endpoints[0], {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (projectsResponse.ok) {
          const projects = await projectsResponse.json()
          const projectsList = projects.result || []
          
          // Check if any existing project has a git connection we can reference
          for (const existingProject of projectsList) {
            if (existingProject.git_repo) {
              // Found a project with git connection - extract connection ID pattern
              // The connection might be reusable, or we need to use a different approach
              console.log(`🔍 Found project with git connection: ${existingProject.name}`)
              // Try to use similar connection structure
              if (existingProject.git_repo.connection_id) {
                connectionId = existingProject.git_repo.connection_id
                console.log(`✅ Using connection ID from existing project: ${connectionId}`)
                break
              }
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ Could not check existing projects for connection pattern:`, e)
      }
      
      // If no connection found, we'll need manual linking
      // The Cloudflare Pages API doesn't expose a direct endpoint to list available GitHub repos
      // This typically requires going through the dashboard OAuth flow
      if (!connectionId) {
        console.warn('⚠️ Could not automatically find GitHub connection ID.')
        console.warn('   Cloudflare Pages API requires manual repo linking via dashboard.')
        console.warn(`   After project creation, link manually at:`)
        console.warn(`   https://dash.cloudflare.com/workers/pages/${sanitizedProjectName}/settings/git`)
      }
    } catch (e) {
      console.error('❌ Error fetching GitHub connections:', e)
    }
    
    // Create the project with GitHub repo info
    // Try with connection_id if found, otherwise try without (Cloudflare may auto-resolve)
    const projectConfig: any = {
      name: sanitizedProjectName,
      production_branch: 'main',
    }
    
    // Always try to include git_repo - Cloudflare may auto-connect if OAuth is set up
    // Try with connection_id first if we found one, otherwise try without
    projectConfig.git_repo = {
      owner: owner,
      repo: repo,
    }
    
    if (connectionId) {
      projectConfig.git_repo.connection_id = connectionId
      console.log(`📦 Creating project with GitHub repo (connection_id: ${connectionId}): ${owner}/${repo}`)
    } else {
      console.log(`📦 Creating project with GitHub repo (auto-connect attempt): ${owner}/${repo}`)
      console.log(`   If this fails, you may need to set up GitHub OAuth in Cloudflare dashboard`)
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
      const projectName = projectData.result?.name || sanitizedProjectName
      const projectGitRepo = projectData.result?.git_repo
      
      console.log(`✅ Created Cloudflare Pages project: ${projectName}`)
      
      if (projectGitRepo) {
        console.log(`✅ GitHub repo automatically linked: ${projectGitRepo.owner}/${projectGitRepo.repo}`)
      } else {
        console.warn(`⚠️ Project created but GitHub repo was not linked`)
      }
      
      // The project URL follows a predictable pattern
      const projectUrl = `https://${projectName}.pages.dev`
      
      // If repo wasn't linked automatically, try to link it after creation
      if (!projectGitRepo && connectionId) {
        try {
          console.log(`🔗 Attempting to link GitHub repo after project creation...`)
          const linkRepoResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                git_repo: {
                  owner: owner,
                  repo: repo,
                  connection_id: connectionId
                }
              })
            }
          )
          
          if (linkRepoResponse.ok) {
            console.log(`✅ Successfully linked GitHub repo: ${owner}/${repo}`)
          } else {
            const errorText = await linkRepoResponse.text()
            console.warn(`⚠️ Could not link repo automatically: ${errorText.substring(0, 200)}`)
            console.warn(`   Please link manually: https://dash.cloudflare.com/workers/pages/${projectName}/settings/git`)
          }
        } catch (linkError) {
          console.warn(`⚠️ Error linking repo:`, linkError)
          console.warn(`   Please link manually: https://dash.cloudflare.com/workers/pages/${projectName}/settings/git`)
        }
      } else {
        console.warn('⚠️ No GitHub connection found. Project created without repo link.')
        console.warn(`   Link manually: https://dash.cloudflare.com/workers/pages/${projectName}/settings/git`)
        console.warn(`   Select repo: ${owner}/${repo}, branch: main`)
      }
      
      return projectUrl
    } else {
      const errorText = await createProjectResponse.text()
      let errorJson: any = {}
      try {
        errorJson = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      console.error('❌ Failed to create Pages project:', errorText.substring(0, 500))
      
      // If error mentions connection_id or git, try creating without git_repo
      if ((errorJson.errors?.[0]?.message?.includes('connection') || 
           errorText.includes('connection') || 
           errorText.includes('git')) && 
          projectConfig.git_repo && 
          !connectionId) {
        console.log(`🔄 Retrying project creation without git_repo (will link manually)...`)
        
        // Retry without git_repo
        const retryConfig = {
          name: sanitizedProjectName,
          production_branch: 'main'
        }
        
        const retryResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(retryConfig)
          }
        )
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          const retryProjectName = retryData.result?.name || sanitizedProjectName
          console.log(`✅ Created project without git_repo: ${retryProjectName}`)
          console.warn(`⚠️ Manual git linking required: https://dash.cloudflare.com/workers/pages/${retryProjectName}/settings/git`)
          return `https://${retryProjectName}.pages.dev`
        }
      }
      
      // Check if project name already exists with different casing
      if (errorText.includes('already exists') || errorText.includes('409')) {
        console.log(`⚠️ Project already exists, returning URL`)
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


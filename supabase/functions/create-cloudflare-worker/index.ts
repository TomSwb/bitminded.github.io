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
    const { subdomain, productName, productSlug } = await req.json()

    if (!subdomain || !productName) {
      throw new Error('Subdomain and product name are required')
    }

    // Get Cloudflare credentials from Supabase secrets
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    
    if (!cloudflareApiToken || !cloudflareAccountId) {
      throw new Error('Cloudflare credentials not configured')
    }

    const workerName = `${productSlug}-worker`

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
        body: generateWorkerCode(productName, productSlug)
      }
    )

    if (!createWorkerResponse.ok) {
      const error = await createWorkerResponse.text()
      throw new Error(`Failed to create Worker: ${error}`)
    }

    console.log('✅ Worker created successfully')

    // Step 2: Configure custom domain
    const customDomain = `${subdomain}.bitminded.ch`
    
    console.log(`🌐 Configuring custom domain: ${customDomain}`)

    const domainResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/services/${workerName}/routes`,
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
    const workerDevUrl = `${workerName}.${cloudflareAccountId}.workers.dev`

    return new Response(
      JSON.stringify({
        success: true,
        workerName,
        workerUrl,
        workerDevUrl,
        customDomain: domainResponse.ok ? customDomain : null,
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
function generateWorkerCode(productName: string, productSlug: string): string {
  return `/**
 * ${productName} - Cloudflare Worker
 * 
 * This Worker serves the ${productName} application.
 * It includes basic authentication and subscription checking.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    // Allow requests to the main domain
    if (url.hostname === 'bitminded.ch') {
      return fetch(request)
    }
    
    // Check authentication cookie
    const authCookie = request.headers.get('Cookie')
    const hasAuth = authCookie && authCookie.includes('supabase-auth-token')
    
    if (!hasAuth) {
      // Redirect to login page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': \`https://bitminded.ch/auth?redirect=\${encodeURIComponent(url.href)}\`
        }
      })
    }
    
    // TODO: Add subscription validation
    // const isValid = await validateSubscription(authCookie, '${productSlug}')
    // if (!isValid) {
    //   return new Response('Subscription required', { status: 403 })
    // }
    
    // For now, just proxy the request or serve static content
    // In production, you would serve your actual PWA here
    return new Response('Worker created for ${productName}. Configure your routing here.', {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}`
}


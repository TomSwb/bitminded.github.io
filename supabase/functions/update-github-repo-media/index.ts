/**
 * Update GitHub Repository with Media Edge Function
 * Uploads product media files (icons, screenshots) to GitHub repository
 */

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

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Rate limiting: IP-based for GitHub media uploads - 10/min, 100/hour
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      const rateLimitResult = await checkRateLimit(
        supabaseAdmin,
        ipAddress,
        'ip',
        'update-github-repo-media',
        { requestsPerMinute: 10, requestsPerHour: 100, windowMinutes: 60 }
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
    }

    const { repoName, iconUrl, screenshots } = await req.json()

    if (!repoName) {
      throw new Error('Repository name is required')
    }

    // Get GitHub token from Supabase secrets
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (!githubToken) {
      throw new Error('GitHub token not configured')
    }

    // repoName might already be in the format "username/repo-name" or just "repo-name"
    const repoFullName = repoName.includes('/') 
      ? repoName  // Already includes username
      : `${Deno.env.get('GITHUB_USERNAME') || 'TomSwb'}/${repoName}`  // Need to add username

    console.log('📦 Repository details:', {
      repoName,
      repoFullName
    })

    const uploadedFiles = []

    // Upload icon if provided
    if (iconUrl) {
      try {
        await uploadFileFromUrl(githubToken, repoFullName, iconUrl, 'icon.png', 'Add product icon')
        uploadedFiles.push('icon.png')
      } catch (error) {
        console.error('❌ Error uploading icon:', error)
      }
    }

    // Upload screenshots if provided
    if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
      for (let i = 0; i < screenshots.length; i++) {
        const screenshotUrl = screenshots[i]
        if (screenshotUrl && screenshotUrl.startsWith('http')) {
          try {
            const filename = `screenshot-${i + 1}.png`
            await uploadFileFromUrl(githubToken, repoFullName, screenshotUrl, filename, `Add screenshot ${i + 1}`)
            uploadedFiles.push(filename)
          } catch (error) {
            console.error(`❌ Error uploading screenshot ${i + 1}:`, error)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ Error in update-github-repo-media:', error)
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
 * Upload a file to GitHub repository by fetching it from a URL
 */
async function uploadFileFromUrl(githubToken: string, repoFullName: string, fileUrl: string, filename: string, message: string) {
  // Fetch the image from the URL
  const imageResponse = await fetch(fileUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from ${fileUrl}`)
  }

  // Get image as array buffer
  const imageBuffer = await imageResponse.arrayBuffer()
  const uint8Array = new Uint8Array(imageBuffer)
  
  // Convert to base64 efficiently (avoid stack overflow with large images)
  let binary = ''
  const len = uint8Array.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64Content = btoa(binary)

  console.log(`📤 Uploading ${filename} to ${repoFullName}`)

  // Check if file already exists in the repository
  let sha = null
  try {
    const checkResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filename}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (checkResponse.ok) {
      const existingFile = await checkResponse.json()
      sha = existingFile.sha
      console.log(`📝 File ${filename} already exists, will update it`)
    } else {
      console.log(`✨ File ${filename} is new, will create it`)
    }
  } catch (error) {
    console.log(`⚠️ Could not check if file exists: ${error.message}`)
  }

  // Upload to GitHub (PUT method creates or updates)
  const requestBody: any = {
    message: message,
    content: base64Content
  }

  // If file exists, include the SHA to update it
  if (sha) {
    requestBody.sha = sha
  }

  const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload file to GitHub: ${error}`)
  }

  console.log(`✅ Uploaded ${filename} to GitHub`)
}


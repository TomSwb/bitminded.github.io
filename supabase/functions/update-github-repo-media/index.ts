/**
 * Update GitHub Repository with Media Edge Function
 * Uploads product media files (icons, screenshots) to GitHub repository
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  } catch (error) {
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


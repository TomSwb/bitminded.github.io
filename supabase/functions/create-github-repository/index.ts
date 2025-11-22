/**
 * Create GitHub Repository Edge Function
 * Creates a GitHub repository with initial structure based on technical specification
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

/**
 * Create initial repository files based on technical specification
 */
async function createInitialFiles(
  token: string, 
  repoFullName: string, 
  spec: string, 
  generatedReadme?: string, 
  productSlug?: string,
  productName?: string,
  iconUrl?: string,
  screenshots?: string[]
) {
  // Use provided productName, fallback to extraction
  const finalProductName = productName || extractProductName(spec)
  const techStack = extractTechStack(spec)
  
  // Extract repo name for subdomain (default to repo name if productSlug not provided)
  const repoName = repoFullName.split('/')[1]
  const subdomain = productSlug || repoName
  
  // Detect deployment type (Expo/React Native vs standard)
  const deploymentInfo = detectDeploymentType(spec)
  
  // Create README.md using spec as content
  await createFile(token, repoFullName, 'README.md', spec)
  
  // Create .gitignore based on tech stack
  const gitignore = generateGitignore(techStack)
  await createFile(token, repoFullName, '.gitignore', gitignore)
  
  // Create package.json if it's a Node.js project
  if (techStack.includes('Node.js') || techStack.includes('React') || techStack.includes('Next.js') || techStack.includes('Expo') || 
      techStack.includes('Vue') || techStack.includes('Angular') || techStack.includes('Svelte') || techStack.includes('Vite')) {
    const packageJson = generatePackageJson(finalProductName, techStack, deploymentInfo)
    await createFile(token, repoFullName, 'package.json', packageJson)
  }
  
  // Create index.html with access protection script and token checker (only for plain HTML or frameworks that need it)
  if (deploymentInfo.framework === 'plain' || deploymentInfo.framework === 'unknown') {
    const indexHtml = generateIndexHtml(finalProductName, subdomain, repoName)
  await createFile(token, repoFullName, 'index.html', indexHtml)
  }
  
  // Create auth page files (location depends on framework)
  await createAuthFiles(token, repoFullName, finalProductName, subdomain, iconUrl, deploymentInfo)
  
  // Create post-build script for frameworks that need it
  if (deploymentInfo.needsPostBuild) {
    await createPostBuildScript(token, repoFullName, finalProductName, productSlug || subdomain, deploymentInfo)
  }
  
  // Create framework-specific configuration files
  await createFrameworkConfigFiles(token, repoFullName, productSlug || subdomain, deploymentInfo)
  
  // Create framework setup guide
  await createFrameworkSetupGuide(token, repoFullName, finalProductName, productSlug || subdomain, deploymentInfo)
  
  // Create worker files
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseFunctionsUrl = supabaseUrl ? supabaseUrl.replace('.supabase.co', '.functions.supabase.co') : ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnhxbnJrbWpjdmd6c3VneHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNDMsImV4cCI6MjA3NDE0NDM0M30.-HAyQJV9SjJa0DrT-n3dCkHR44BQrdMTP-8qX3SADDY'
  await createWorkerFiles(token, repoFullName, finalProductName, productSlug || subdomain, supabaseFunctionsUrl, supabaseAnonKey, deploymentInfo)
  
  // Upload media files if provided
  const uploadedFiles: string[] = []
  
  // Upload icon if provided
  if (iconUrl && iconUrl.startsWith('http')) {
    try {
      await uploadFileFromUrl(token, repoFullName, iconUrl, 'icon.png', 'Add product icon')
      uploadedFiles.push('icon.png')
      console.log('✅ Icon uploaded successfully')
    } catch (error) {
      console.error('❌ Error uploading icon:', error)
      // Don't fail the entire operation if media upload fails
    }
  }
  
  // Upload screenshots if provided
  if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
    for (let i = 0; i < screenshots.length; i++) {
      const screenshotUrl = screenshots[i]
      if (screenshotUrl && screenshotUrl.startsWith('http')) {
        try {
          const filename = `screenshot-${i + 1}.png`
          await uploadFileFromUrl(token, repoFullName, screenshotUrl, filename, `Add screenshot ${i + 1}`)
          uploadedFiles.push(filename)
          console.log(`✅ Screenshot ${i + 1} uploaded successfully`)
        } catch (error) {
          console.error(`❌ Error uploading screenshot ${i + 1}:`, error)
          // Don't fail the entire operation if media upload fails
        }
      }
    }
  }
  
  console.log(`✅ Initial files created successfully${uploadedFiles.length > 0 ? ` (${uploadedFiles.length} media file(s) uploaded)` : ''}`)
}

/**
 * Create a file in the repository using GitHub API
 */
async function createFile(token: string, repoFullName: string, filename: string, content: string) {
  // Convert to base64 using UTF-8 encoding
  const encoder = new TextEncoder()
  const bytes = encoder.encode(content)
  const base64Content = btoa(String.fromCharCode(...bytes))
  
  const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Add ${filename}`,
      content: base64Content
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error(`Error creating ${filename}:`, error)
  }
}

/**
 * Upload a file to GitHub repository by fetching it from a URL
 * Used for media files (images) that need to be downloaded first
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

  // Upload to GitHub (PUT method creates or updates)
  // For initial creation, we don't need to check for existing files
  const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      content: base64Content
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload file to GitHub: ${error}`)
  }

  console.log(`✅ Uploaded ${filename} to GitHub`)
}

/**
 * Generate README.md using OpenAI
 */
async function generateReadmeWithAI(productName: string, spec: string): Promise<string> {
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      console.warn('No OpenAI API key found, using fallback README generation')
      return generateReadme(productName, spec)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer specializing in creating GitHub README files. Create a professional, comprehensive README based on the provided technical specification.'
          },
          {
            role: 'user',
            content: `Create a professional GitHub README for: ${productName}\n\nTechnical Specification:\n${spec}\n\nInclude: Overview, Tech Stack, Getting Started, Installation instructions, Usage, Contributing guidelines.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content

  } catch (error) {
    console.error('Error generating README with AI:', error)
    // Fallback to manual generation
    return generateReadme(productName, spec)
  }
}

/**
 * Extract product name from specification
 */
function extractProductName(spec: string): string {
  // Try to get the product name from the beginning
  const lines = spec.split('\n')
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      return line.trim()
    }
  }
  return 'Product'
}

/**
 * Extract tech stack from specification
 */
function extractTechStack(spec: string): string[] {
  const stack: string[] = []
  
  // Look for platform
  if (spec.includes('Progressive Web App') || spec.includes('PWA')) {
    stack.push('Platform: Progressive Web App')
  }
  
  // Look for frontend
  if (spec.match(/React/i)) {
    stack.push('Frontend: React')
  }
  
  // Look for backend
  if (spec.match(/Node\.js/i)) {
    stack.push('Backend: Node.js')
  }
  
  // Look for database
  if (spec.match(/MongoDB/i)) {
    stack.push('Database: MongoDB')
  }
  
  if (stack.length === 0) {
    stack.push('Details in technical specification')
  }
  
  return stack
}

/**
 * Framework detection result
 */
interface FrameworkInfo {
  framework: 'expo' | 'nextjs' | 'vite' | 'create-react-app' | 'vue' | 'angular' | 'svelte' | 'gatsby' | 'nuxt' | 'plain' | 'unknown'
  buildOutput: string
  branch: string
  needsPostBuild: boolean
  needsBasePath: boolean
  authFolder: string
}

/**
 * Detect framework and deployment configuration based on tech stack
 */
function detectDeploymentType(spec: string): FrameworkInfo {
  const specLower = spec.toLowerCase()
  
  // Expo/React Native
  if (specLower.includes('expo') || 
      specLower.includes('react native') || 
      specLower.includes('react-native') ||
      specLower.includes('expo/')) {
    return {
      framework: 'expo',
      buildOutput: 'dist',
      branch: 'gh-pages',
      needsPostBuild: true,
      needsBasePath: false,
      authFolder: 'web/auth'
    }
  }
  
  // Next.js
  if (specLower.includes('next.js') || 
      specLower.includes('nextjs') ||
      specLower.includes('next.js static') ||
      specLower.includes('next static export')) {
    return {
      framework: 'nextjs',
      buildOutput: 'out', // Next.js static export uses 'out'
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true, // Next.js needs basePath for GitHub Pages
      authFolder: 'auth'
    }
  }
  
  // Vite
  if (specLower.includes('vite') && !specLower.includes('vue')) {
    return {
      framework: 'vite',
      buildOutput: 'dist',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true, // Vite needs base config for GitHub Pages
      authFolder: 'auth'
    }
  }
  
  // Vue.js
  if (specLower.includes('vue') && !specLower.includes('nuxt')) {
    return {
      framework: 'vue',
      buildOutput: 'dist',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Nuxt.js
  if (specLower.includes('nuxt')) {
    return {
      framework: 'nuxt',
      buildOutput: 'dist',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Angular
  if (specLower.includes('angular')) {
    return {
      framework: 'angular',
      buildOutput: 'dist',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Svelte/SvelteKit
  if (specLower.includes('svelte')) {
    return {
      framework: 'svelte',
      buildOutput: 'build',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Gatsby
  if (specLower.includes('gatsby')) {
    return {
      framework: 'gatsby',
      buildOutput: 'public',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Create React App
  if (specLower.includes('create react app') || 
      specLower.includes('cra') ||
      (specLower.includes('react') && specLower.includes('webpack'))) {
    return {
      framework: 'create-react-app',
      buildOutput: 'build',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: true,
      authFolder: 'auth'
    }
  }
  
  // Plain HTML/CSS/JS (no framework)
  if (specLower.includes('html') && 
      specLower.includes('css') && 
      specLower.includes('javascript') &&
      !specLower.includes('react') &&
      !specLower.includes('vue') &&
      !specLower.includes('angular')) {
    return {
      framework: 'plain',
      buildOutput: '',
      branch: 'main',
      needsPostBuild: false,
      needsBasePath: false,
      authFolder: 'auth'
    }
  }
  
  // Default/Unknown - assume standard React or similar
  return {
    framework: 'unknown',
    buildOutput: 'dist',
    branch: 'main',
    needsPostBuild: false,
    needsBasePath: false,
    authFolder: 'auth'
  }
}

/**
 * Generate README.md content
 */
function generateReadme(productName: string, spec: string): string {
  // Extract description from the spec
  let description = 'A powerful and comprehensive application.'
  
  // Try to find the Solution Approach section
  const solutionMatch = spec.match(/Solution Approach:\s*(.+?)(?:\n\n|$)/s)
  if (solutionMatch && solutionMatch[1]) {
    description = solutionMatch[1].trim()
  } else {
    // Fallback: try to get any meaningful description from the overview
    const overviewMatch = spec.match(/## 1\. Product Overview\s*##(.+?)(?:\n\n|##)/s)
    if (overviewMatch && overviewMatch[1]) {
      const overviewContent = overviewMatch[1]
      const solutionInOverview = overviewContent.match(/Solution Approach:\s*(.+?)(?:\n-|##|$)/s)
      if (solutionInOverview) {
        description = solutionInOverview[1].trim()
      }
    }
  }
  
  return `# ${productName}

## Overview

${description}

## Tech Stack

${extractTechStack(spec).join('\n- ')}

## Getting Started

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/${productName.toLowerCase().replace(/\s+/g, '-')}.git
cd ${productName.toLowerCase().replace(/\s+/g, '-')}

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## Development

This project uses the following technologies:
${extractTechStack(spec).map(tech => `- ${tech}`).join('\n')}

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is proprietary software.

---

Generated by BitMinded Product Creation Wizard
`
}

/**
 * Generate .gitignore based on tech stack
 */
function generateGitignore(stack: string[]): string {
  const ignore = ['# Dependencies', 'node_modules/', '/dist/', '/build/', '*.log']
  
  if (stack.some(tech => tech.includes('Node'))) {
    ignore.push('# Node.js', '.env', '.env.local', '.npm/', 'yarn-error.log')
  }
  
  return ignore.join('\n')
}

/**
 * Generate index.html with redirect-based access protection and token checker
 * Works with any framework (React, Vue, Svelte, vanilla JS, etc.)
 * Uses simple redirect instead of overlay - prevents GitHub Pages access
 */
function generateIndexHtml(productName: string, subdomain: string, repoName: string): string {
  const protectedUrl = `https://${subdomain}.bitminded.ch`
  
  // Simple redirect protection script - inline for immediate execution
  // Redirects to protected subdomain if accessed via GitHub Pages
  const protectionScript = `
    (function() {
      'use strict';
      // Get protected URL from meta tag (with fallback)
      const metaTag = document.querySelector('meta[name="bitminded-protected-url"]');
      const protectedUrl = metaTag ? metaTag.getAttribute('content') : '${protectedUrl}';
      
      // Check if accessed via GitHub Pages
      const hostname = window.location.hostname;
      if (hostname.includes('.github.io') || hostname.includes('github.com')) {
        // Strip repository name from path if present, preserve query params and hash
        let path = window.location.pathname;
        // Remove '/${repoName}' prefix if it exists (for GitHub Pages project sites)
        if (path.startsWith('/${repoName}')) {
          path = path.replace('/${repoName}', '') || '/';
        }
        // Build redirect URL with query params and hash
        const queryAndHash = window.location.search + window.location.hash;
        const redirectUrl = (path === '/' ? protectedUrl : protectedUrl + path) + queryAndHash;
        // Use replace() to avoid adding to browser history
        window.location.replace(redirectUrl);
      }
    })();
  `
  
  // Token checker script - checks for expired JWT tokens and redirects to auth
  const tokenCheckerScript = `
    (function() {
      'use strict';
      // Only run on protected subdomain, not GitHub Pages
      const hostname = window.location.hostname;
      if (!hostname.includes('bitminded.ch')) return;
      
      // Skip token check for auth pages
      if (window.location.pathname.startsWith('/auth')) return;
      
      try {
        // Check localStorage for Supabase session (format: sb-<project-ref>-auth-token)
        // Try to find any Supabase session key
        let sessionKey = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('sb-') && key.includes('-auth-token')) {
            sessionKey = key;
            break;
          }
        }
        
        if (!sessionKey) return;
        
        const sessionData = localStorage.getItem(sessionKey);
        if (!sessionData) return;
        
        const session = JSON.parse(sessionData);
        if (!session || !session.expires_at) return;
        
        // Check if token is expired (expires_at is in seconds)
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // If expired or expires in less than 5 minutes, redirect to auth
        if (now >= expiresAt || (expiresAt - now) < 5 * 60 * 1000) {
          console.log('Token expired or expiring soon, redirecting to auth...');
          window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
      } catch (e) {
        // Silently fail - Cloudflare Worker will handle auth check
        console.debug('Token check error:', e);
      }
    })();
  `
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="bitminded-protected-url" content="${protectedUrl}">
    <title>${productName}</title>
    <!-- Access Protection: Redirects to protected subdomain if accessed via GitHub Pages -->
    <script>${protectionScript}</script>
    <!-- Token Checker: Checks for expired tokens and redirects to auth -->
    <script>${tokenCheckerScript}</script>
</head>
<body>
    <!-- Your app content goes here -->
    <div id="app">
        <h1>Welcome to ${productName}</h1>
        <p>Your application content will go here.</p>
    </div>
</body>
</html>`
}

/**
 * Create auth page files for the app
 */
async function createAuthFiles(
  token: string,
  repoFullName: string,
  productName: string,
  subdomain: string,
  iconUrl: string | undefined,
  deploymentInfo: FrameworkInfo
) {
  // Use framework-specific auth folder location
  const authPrefix = deploymentInfo.authFolder
  
  // Create auth directory structure
  const authIndexHtml = generateAuthIndexHtml(productName, subdomain, iconUrl)
  await createFile(token, repoFullName, `${authPrefix}/index.html`, authIndexHtml)
  
  const authCss = generateAuthCss()
  await createFile(token, repoFullName, `${authPrefix}/auth.css`, authCss)
  
  const authJs = generateAuthJs(subdomain)
  await createFile(token, repoFullName, `${authPrefix}/auth.js`, authJs)
  
  const authConfig = generateAuthConfig(productName, subdomain)
  await createFile(token, repoFullName, `${authPrefix}/config.js`, authConfig)
  
  console.log(`✅ Auth page files created successfully in ${authPrefix}/`)
}

/**
 * Generate auth/index.html - Login-only auth page
 */
function generateAuthIndexHtml(productName: string, subdomain: string, iconUrl?: string): string {
  // Generate favicon/icon links
  const faviconLink = iconUrl 
    ? `<link rel="icon" type="image/png" href="${iconUrl}">`
    : `<link rel="icon" type="image/x-icon" href="/favicon.ico">`
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - ${productName}</title>
    <link rel="stylesheet" href="/auth/auth.css">
    ${faviconLink}
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
</head>
<body>
    <main class="auth-main">
        <div class="auth-container">
            <h1 id="auth-title">Sign In</h1>
            
            <div id="auth-error" class="auth-error hidden" role="alert">
                <span id="auth-error-message"></span>
            </div>
            
            <form class="login-form" id="login-form">
                <div class="login-form__header">
                    <h2 class="login-form__title">Welcome Back</h2>
                    <p class="login-form__subtitle">Sign in to continue</p>
                </div>
                
                <div class="login-form__fields">
                    <div class="login-form__field">
                        <label for="login-email" class="login-form__label">Email Address</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            name="email" 
                            class="login-form__input" 
                            required 
                            autocomplete="email"
                            placeholder="Enter your email"
                        >
                        <div class="login-form__error" id="login-email-error" role="alert"></div>
                    </div>
                    
                    <div class="login-form__field">
                        <label for="login-password" class="login-form__label">Password</label>
                        <div class="login-form__password-container">
                            <input 
                                type="password" 
                                id="login-password" 
                                name="password" 
                                class="login-form__input" 
                                required 
                                autocomplete="current-password"
                                placeholder="Enter your password"
                            >
                        </div>
                        <div class="login-form__error" id="login-password-error" role="alert"></div>
                    </div>
                    
                    <div class="login-form__forgot-password">
                        <a href="https://bitminded.ch/auth?action=forgot-password" class="login-form__forgot-link" target="_blank">
                            Forgot your password?
                        </a>
                    </div>
                </div>
                
                <div class="auth-submit-container">
                    <button type="submit" class="auth-submit-button" id="auth-submit-button">
                        <span class="auth-submit-text" id="auth-submit-text">Sign In</span>
                        <div class="auth-submit-loading" id="auth-submit-loading" style="display: none;">
                            <div class="auth-submit-spinner"></div>
                            <span id="auth-submit-loading-text">Signing in...</span>
                        </div>
                    </button>
                </div>
            </form>
            
            <div class="auth-footer">
                <p>Don't have an account? <a href="https://bitminded.ch/auth?action=signup" target="_blank">Sign up on BitMinded</a></p>
            </div>
        </div>
    </main>
    
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
    <script src="/auth/config.js"></script>
    <script src="/auth/auth.js"></script>
</body>
</html>`
}

/**
 * Generate auth/auth.css - Base styles with CSS variables for customization
 */
function generateAuthCss(): string {
  return `/* Auth Page Styles - Base Template */
/* Override CSS variables in your app's main CSS to customize colors */

:root {
  /* Color Palette - Default BitMinded colors (override in your app) */
  --auth-color-primary: rgb(207, 222, 103);
  --auth-color-secondary: rgb(210, 134, 189);
  --auth-color-background: rgb(39, 43, 46);
  --auth-color-background-light: rgb(238, 233, 228);
  --auth-color-text-primary: rgb(238, 233, 228);
  --auth-color-text-secondary: rgb(39, 43, 46);
  --auth-color-error: #dc2626;
  --auth-color-error-bg: rgba(220, 38, 38, 0.1);
  --auth-border-color: rgba(255, 255, 255, 0.1);
  
  /* Spacing */
  --auth-spacing-xs: 0.25rem;
  --auth-spacing-sm: 0.5rem;
  --auth-spacing-md: 1rem;
  --auth-spacing-lg: 1.5rem;
  --auth-spacing-xl: 2rem;
  
  /* Typography */
  --auth-font-size-sm: 0.875rem;
  --auth-font-size-base: 1rem;
  --auth-font-size-lg: 1.125rem;
  --auth-font-size-xl: 1.25rem;
  --auth-font-size-2xl: 1.5rem;
  --auth-font-size-3xl: 1.875rem;
  
  /* Border Radius */
  --auth-radius-sm: 4px;
  --auth-radius-md: 8px;
  
  /* Shadows */
  --auth-shadow-lg: 0 4px 12px rgba(210, 134, 189, 0.3);
  
  /* Transitions */
  --auth-transition-fast: 0.2s ease;
}

[data-theme="light"] {
  --auth-color-background: var(--auth-color-background-light);
  --auth-color-text-primary: var(--auth-color-text-secondary);
  --auth-color-text-secondary: var(--auth-color-text-primary);
  --auth-color-primary: var(--auth-color-secondary);
  --auth-color-secondary: var(--auth-color-primary);
  --auth-border-color: rgba(0, 0, 0, 0.1);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--auth-color-background);
  color: var(--auth-color-text-primary);
  min-height: 100vh;
}

.auth-main {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--auth-spacing-4xl, 6rem);
}

.auth-container {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

#auth-title {
  text-align: center;
  font-size: var(--auth-font-size-3xl);
  color: var(--auth-color-text-primary);
  margin-bottom: var(--auth-spacing-lg);
}

.auth-error {
  background-color: var(--auth-color-error-bg);
  border: 2px solid var(--auth-color-error);
  border-radius: var(--auth-radius-sm);
  padding: var(--auth-spacing-md);
  margin-bottom: var(--auth-spacing-lg);
  color: var(--auth-color-error);
}

.auth-error.hidden {
  display: none;
}

.login-form {
  max-width: 480px;
  width: 100%;
  margin: 0;
  padding: var(--auth-spacing-xl);
  background-color: var(--auth-color-background);
  border: 2px solid var(--auth-border-color);
  border-radius: var(--auth-radius-md);
  box-shadow: var(--auth-shadow-lg);
}

.login-form__header {
  text-align: center;
  margin-bottom: var(--auth-spacing-md);
}

.login-form__title {
  font-size: var(--auth-font-size-2xl);
  font-weight: bold;
  color: var(--auth-color-text-primary);
  margin: 0 0 var(--auth-spacing-sm) 0;
}

.login-form__subtitle {
  font-size: var(--auth-font-size-base);
  color: var(--auth-color-text-primary);
  opacity: 0.8;
  margin: 0;
}

.login-form__fields {
  margin-top: calc(-1 * var(--auth-spacing-md));
  margin-bottom: var(--auth-spacing-lg);
}

.login-form__field {
  margin-bottom: var(--auth-spacing-lg);
}

.login-form__label {
  display: block;
  font-size: var(--auth-font-size-sm);
  font-weight: 600;
  color: var(--auth-color-text-primary);
  margin-bottom: var(--auth-spacing-sm);
}

.login-form__input {
  width: 100%;
  padding: var(--auth-spacing-md);
  border: 2px solid var(--auth-border-color);
  border-radius: var(--auth-radius-sm);
  background-color: var(--auth-color-background);
  color: var(--auth-color-text-primary);
  font-size: var(--auth-font-size-base);
  transition: all var(--auth-transition-fast);
}

.login-form__input:focus {
  outline: none;
  border-color: var(--auth-color-primary);
  box-shadow: 0 0 0 3px rgba(207, 222, 103, 0.1);
}

.login-form__input::placeholder {
  color: var(--auth-color-text-primary);
  opacity: 0.5;
}

.login-form__error {
  font-size: var(--auth-font-size-sm);
  color: var(--auth-color-error);
  margin-top: var(--auth-spacing-xs);
  min-height: 1.2em;
  display: none;
}

.login-form__error.show {
  display: block;
}

.login-form__field.error .login-form__input {
  border-color: var(--auth-color-error);
}

.login-form__forgot-password {
  text-align: right;
  margin-bottom: var(--auth-spacing-lg);
}

.login-form__forgot-link {
  color: var(--auth-color-primary);
  text-decoration: none;
  font-size: var(--auth-font-size-sm);
  font-weight: 500;
  transition: color var(--auth-transition-fast);
}

.login-form__forgot-link:hover {
  color: var(--auth-color-secondary);
  text-decoration: underline;
}

.auth-submit-container {
  margin-top: var(--auth-spacing-lg);
  width: 100%;
}

.auth-submit-button {
  width: 100%;
  padding: var(--auth-spacing-md) var(--auth-spacing-lg);
  background-color: var(--auth-color-primary);
  color: var(--auth-color-text-secondary);
  border: none;
  border-radius: var(--auth-radius-sm);
  font-size: var(--auth-font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--auth-transition-fast);
  position: relative;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--auth-shadow-lg);
}

.auth-submit-button:hover:not(:disabled) {
  background-color: var(--auth-color-secondary);
  transform: translateY(-1px);
}

.auth-submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.auth-submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.auth-submit-loading {
  display: flex;
  align-items: center;
  gap: var(--auth-spacing-sm);
}

.auth-submit-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-footer {
  margin-top: var(--auth-spacing-lg);
  text-align: center;
  font-size: var(--auth-font-size-sm);
  color: var(--auth-color-text-primary);
  opacity: 0.8;
}

.auth-footer a {
  color: var(--auth-color-primary);
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .auth-main {
    padding-top: var(--auth-spacing-xl);
  }
  
  .auth-container {
    max-width: 85vw;
  }
  
  .login-form {
    padding: var(--auth-spacing-lg);
  }
  
  #auth-title {
    font-size: var(--auth-font-size-2xl);
  }
}

@media (max-width: 480px) {
  .auth-container {
    max-width: 90vw;
  }
  
  .login-form {
    padding: var(--auth-spacing-md);
  }
}`
}

/**
 * Generate auth/auth.js - Auth logic with Supabase integration
 */
function generateAuthJs(subdomain: string): string {
  return `/**
 * Auth Page Logic
 * Handles login and redirects back to app
 */

// Wait for Supabase to load
let supabaseClient = null;

(async function init() {
  // Wait for Supabase library to load
  while (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Initialize Supabase client
  const { createClient } = supabase || window.supabase;
  supabaseClient = createClient(
    window.AUTH_CONFIG.supabaseUrl,
    window.AUTH_CONFIG.supabaseAnonKey,
    {
      auth: {
        storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
  
  window.supabase = supabaseClient;
  
  // Sync token to cookies for Cloudflare Worker
  syncAuthToCookies();
  
  // Check if already logged in
  checkExistingSession();
  
  // Initialize form
  initLoginForm();
})();

// Sync localStorage token to cookies for Cloudflare Worker
async function syncAuthToCookies() {
  if (!supabaseClient) return;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.access_token) {
    const cookieDomain = window.location.hostname.includes('bitminded.ch') ? '.bitminded.ch' : '';
    document.cookie = \`sb-access-token=\${session.access_token}; domain=\${cookieDomain}; path=/; secure; samesite=lax; max-age=\${60 * 60 * 24 * 7}\`;
  }
}

// Check for existing session
async function checkExistingSession() {
  if (!supabaseClient) return;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    // Already logged in, redirect to app
    redirectToApp();
  }
}

// Initialize login form
function initLoginForm() {
  const form = document.getElementById('login-form');
  const submitButton = document.getElementById('auth-submit-button');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailError = document.getElementById('login-email-error');
  const passwordError = document.getElementById('login-password-error');
  const errorDiv = document.getElementById('auth-error');
  const errorMessage = document.getElementById('auth-error-message');
  
  if (!form || !submitButton) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (submitButton.disabled) return;
    
    // Clear previous errors
    clearErrors();
    
    // Validate inputs
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }
    
    if (!validateEmail(email)) {
      showFieldError('email', 'Please enter a valid email address');
      return;
    }
    
    // Set submitting state
    setSubmitting(true);
    
    try {
      // Wait for Supabase client
      while (!supabaseClient) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Attempt login
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        // Success! Sync to cookies and redirect
        // Note: Apps skip 2FA - only main website requires 2FA verification
        await syncAuthToCookies();
        
        // Redirect to app immediately (no 2FA check for apps)
        redirectToApp();
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message === 'Invalid login credentials') {
        showFieldError('password', 'Invalid email or password');
      } else if (error.message === 'Email not confirmed') {
        showFieldError('email', 'Please verify your email address before signing in');
      } else {
        showError(error.message || 'An error occurred during login');
      }
    } finally {
      setSubmitting(false);
    }
  });
  
  // Real-time validation
  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (email && !validateEmail(email)) {
      showFieldError('email', 'Please enter a valid email address');
    } else {
      clearFieldError('email');
    }
  });
}

function validateEmail(email) {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

function showError(message) {
  const errorDiv = document.getElementById('auth-error');
  const errorMessage = document.getElementById('auth-error-message');
  
  if (errorDiv && errorMessage) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}

function clearErrors() {
  const errorDiv = document.getElementById('auth-error');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
  clearFieldError('email');
  clearFieldError('password');
}

function showFieldError(fieldName, message) {
  const errorElement = document.getElementById(\`login-\${fieldName}-error\`);
  const inputElement = document.getElementById(\`login-\${fieldName}\`);
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }
  
  if (inputElement) {
    inputElement.classList.add('error');
  }
}

function clearFieldError(fieldName) {
  const errorElement = document.getElementById(\`login-\${fieldName}-error\`);
  const inputElement = document.getElementById(\`login-\${fieldName}\`);
  
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('show');
  }
  
  if (inputElement) {
    inputElement.classList.remove('error');
  }
}

function setSubmitting(isSubmitting) {
  const submitButton = document.getElementById('auth-submit-button');
  const submitText = document.getElementById('auth-submit-text');
  const submitLoading = document.getElementById('auth-submit-loading');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  
  if (submitButton) {
    submitButton.disabled = isSubmitting;
  }
  
  if (submitText && submitLoading) {
    submitText.style.display = isSubmitting ? 'none' : 'block';
    submitLoading.style.display = isSubmitting ? 'flex' : 'none';
  }
  
  if (emailInput) emailInput.disabled = isSubmitting;
  if (passwordInput) passwordInput.disabled = isSubmitting;
}

function redirectToApp() {
  // Get redirect URL from query params or default to app root
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect') || '/';
  
  // Redirect to app
  window.location.href = redirect;
}

// Listen for auth changes and sync to cookies
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      syncAuthToCookies();
    } else if (event === 'SIGNED_OUT') {
      const cookieDomain = window.location.hostname.includes('bitminded.ch') ? '.bitminded.ch' : '';
      document.cookie = \`sb-access-token=; domain=\${cookieDomain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT\`;
    }
  });
}`
}

/**
 * Generate auth/config.js - App-specific configuration
 */
function generateAuthConfig(productName: string, subdomain: string): string {
  return `/**
 * Auth Configuration
 * App-specific configuration for authentication
 */

window.AUTH_CONFIG = {
  appName: '${productName}',
  subdomain: '${subdomain}',
  supabaseUrl: 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnhxbnJrbWpjdmd6c3VneHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNDMsImV4cCI6MjA3NDE0NDM0M30.-HAyQJV9SjJa0DrT-n3dCkHR44BQrdMTP-8qX3SADDY'
};`
}

/**
 * Create worker files in repository
 */
async function createWorkerFiles(
  token: string,
  repoFullName: string,
  productName: string,
  productSlug: string,
  supabaseFunctionsUrl: string,
  supabaseAnonKey: string,
  deploymentInfo: FrameworkInfo
) {
  // Extract GitHub username from repoFullName (format: username/repo)
  const [githubUsername] = repoFullName.split('/')
  const githubPagesUrl = `https://${githubUsername}.github.io/${productSlug}`
  
  // Generate worker-updated.js (ES modules format for Wrangler v4)
  const workerCode = generateWorkerCodeForRepo(productName, productSlug, supabaseFunctionsUrl, supabaseAnonKey, githubPagesUrl, deploymentInfo)
  await createFile(token, repoFullName, 'worker-updated.js', workerCode)
  
  // Generate wrangler.toml
  const wranglerConfig = generateWranglerConfig(productSlug)
  await createFile(token, repoFullName, 'wrangler.toml', wranglerConfig)
  
  console.log('✅ Worker files created successfully')
}

/**
 * Generate worker-updated.js for repository (ES modules format)
 */
function generateWorkerCodeForRepo(
  productName: string,
  productSlug: string,
  supabaseFunctionsUrl: string,
  supabaseAnonKey: string,
  githubPagesUrl: string,
  deploymentInfo: FrameworkInfo
): string {
  return `/**
* ${productName} - Cloudflare Worker (ES Modules)
* Enforces access via Supabase validate-license.
* Proxies requests to GitHub Pages after authentication.
*/

const SUBSCRIBE_URL = 'https://bitminded.ch/subscribe?tool=${productSlug}'
const VALIDATE_URL = '${supabaseFunctionsUrl}/validate-license'
const SUPABASE_ANON_KEY = '${supabaseAnonKey}'
const GITHUB_PAGES_URL = '${githubPagesUrl}'

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

// Modern ES modules export format for Wrangler v4
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request)
  }
}
`
}

/**
 * Generate wrangler.toml configuration
 */
function generateWranglerConfig(productSlug: string): string {
  const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  // Cloudflare automatically adds "-worker" suffix, so match that in wrangler.toml
  const workerName = `${productSlug}-worker`
  return `name = "${workerName}"
compatibility_date = "${currentDate}"
main = "worker-updated.js"
compatibility_flags = ["nodejs_compat"]
`
}

/**
 * Create framework-specific configuration files
 */
async function createFrameworkConfigFiles(
  token: string,
  repoFullName: string,
  productSlug: string,
  deploymentInfo: FrameworkInfo
) {
  if (!deploymentInfo.needsBasePath) {
    return // No config files needed
  }
  
  const basePath = `/${productSlug}` // GitHub Pages project site base path
  
  switch (deploymentInfo.framework) {
    case 'nextjs': {
      // Create next.config.js with basePath for GitHub Pages
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '${basePath}',
  assetPrefix: '${basePath}',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
`
      await createFile(token, repoFullName, 'next.config.js', nextConfig)
      console.log('✅ Next.js config created')
      break
    }
      
    case 'vite': {
      // Create vite.config.js with base path
      const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '${basePath}',
  plugins: [react()],
  build: {
    outDir: '${deploymentInfo.buildOutput}'
  }
})
`
      await createFile(token, repoFullName, 'vite.config.js', viteConfig)
      console.log('✅ Vite config created')
      break
    }
      
    case 'gatsby': {
      // Create gatsby-config.js with pathPrefix
      const gatsbyConfig = `module.exports = {
  pathPrefix: '${basePath}',
  siteMetadata: {
    title: '${productSlug}',
  },
  plugins: []
}
`
      await createFile(token, repoFullName, 'gatsby-config.js', gatsbyConfig)
      console.log('✅ Gatsby config created')
      break
    }
      
    case 'vue': {
      // Create vue.config.js with publicPath
      const vueConfig = `module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '${basePath}'
    : '/',
  outputDir: '${deploymentInfo.buildOutput}'
}
`
      await createFile(token, repoFullName, 'vue.config.js', vueConfig)
      console.log('✅ Vue config created')
      break
    }
      
    case 'angular': {
      // Create angular.json baseHref (would need to update existing angular.json)
      // For now, just document it in a comment file
      const angularNote = `# Angular Configuration for GitHub Pages

To configure Angular for GitHub Pages, update your angular.json:

1. Set "outputPath" to "${deploymentInfo.buildOutput}"
2. Add "baseHref": "${basePath}" to the build options

Example:
{
  "projects": {
    "your-project": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "${deploymentInfo.buildOutput}",
            "baseHref": "${basePath}"
          }
        }
      }
    }
  }
}
`
      await createFile(token, repoFullName, 'ANGULAR_GITHUB_PAGES_SETUP.md', angularNote)
      console.log('✅ Angular setup notes created')
      break
    }
  }
}

/**
 * Create framework setup guide explaining files and how to modify them
 */
async function createFrameworkSetupGuide(
  token: string,
  repoFullName: string,
  productName: string,
  productSlug: string,
  deploymentInfo: FrameworkInfo
) {
  const guide = generateFrameworkSetupGuide(productName, productSlug, deploymentInfo, repoFullName)
  await createFile(token, repoFullName, 'FRAMEWORK_SETUP.md', guide)
  console.log('✅ Framework setup guide created')
}

/**
 * Generate framework setup guide
 */
function generateFrameworkSetupGuide(
  productName: string,
  productSlug: string,
  deploymentInfo: FrameworkInfo,
  repoFullName: string
): string {
  const [githubUsername] = repoFullName.split('/')
  const githubPagesUrl = `https://${githubUsername}.github.io/${productSlug}`
  const protectedUrl = `https://${productSlug}.bitminded.ch`
  const basePath = `/${productSlug}`
  
  let frameworkSpecificSection = ''
  let configFilesSection = ''
  let buildInstructions = ''
  
  // Framework-specific instructions
  switch (deploymentInfo.framework) {
    case 'expo':
      frameworkSpecificSection = `## Expo/React Native Specific Setup

This project uses **Expo** for React Native development with web support.

### Key Files:
- **\`package.json\`**: Contains Expo scripts and dependencies
- **\`scripts/post-build.js\`**: Post-build script that:
  - Injects GitHub Pages redirect protection
  - Copies auth files from \`web/auth/\` to \`dist/auth/\`
  - Injects token checker script
  - Fixes asset paths for GitHub Pages

### Build & Deploy:
\`\`\`bash
npm run build:web        # Build for web
npm run deploy           # Build and deploy to gh-pages
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`gh-pages\` branch for GitHub Pages deployment
- **Auth Files**: Located in \`web/auth/\` (source) → copied to \`dist/auth/\` during build
- **Build Output**: \`dist/\` directory`
      buildInstructions = `### Post-Build Script:
The \`scripts/post-build.js\` script runs automatically after building and:
1. Injects GitHub Pages redirect protection
2. Copies auth files to build output
3. Injects token checker script
4. Fixes asset paths for GitHub Pages compatibility`
      break
      
    case 'nextjs':
      frameworkSpecificSection = `## Next.js Specific Setup

This project uses **Next.js** with static export for GitHub Pages.

### Key Files:
- **\`next.config.js\`**: Configured with:
  - \`output: 'export'\` - Static export mode
  - \`basePath: '${basePath}'\` - GitHub Pages project site path
  - \`assetPrefix: '${basePath}'\` - Asset path prefix
  - \`images.unoptimized: true\` - Required for static export

### Build & Deploy:
\`\`\`bash
npm run build            # Build static export (outputs to 'out/')
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`out/\` directory
- **Base Path**: All routes are prefixed with \`${basePath}\``
      configFilesSection = `### Configuration Files:
- **\`next.config.js\`**: Next.js configuration with basePath for GitHub Pages`
      break
      
    case 'vite':
      frameworkSpecificSection = `## Vite Specific Setup

This project uses **Vite** for fast development and optimized builds.

### Key Files:
- **\`vite.config.js\`**: Configured with:
  - \`base: '${basePath}'\` - GitHub Pages project site path
  - \`build.outDir: '${deploymentInfo.buildOutput}'\` - Build output directory

### Build & Deploy:
\`\`\`bash
npm run build            # Build for production (outputs to '${deploymentInfo.buildOutput}/')
npm run preview          # Preview production build locally
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Base Path**: All assets are prefixed with \`${basePath}\``
      configFilesSection = `### Configuration Files:
- **\`vite.config.js\`**: Vite configuration with base path for GitHub Pages`
      break
      
    case 'vue':
      frameworkSpecificSection = `## Vue.js Specific Setup

This project uses **Vue.js** for reactive UI development.

### Key Files:
- **\`vue.config.js\`**: Configured with:
  - \`publicPath: '${basePath}'\` - GitHub Pages project site path (production)
  - \`outputDir: '${deploymentInfo.buildOutput}'\` - Build output directory

### Build & Deploy:
\`\`\`bash
npm run build            # Build for production (outputs to '${deploymentInfo.buildOutput}/')
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Base Path**: All assets are prefixed with \`${basePath}\` in production`
      configFilesSection = `### Configuration Files:
- **\`vue.config.js\`**: Vue CLI configuration with publicPath for GitHub Pages`
      break
      
    case 'gatsby':
      frameworkSpecificSection = `## Gatsby Specific Setup

This project uses **Gatsby** for static site generation.

### Key Files:
- **\`gatsby-config.js\`**: Configured with:
  - \`pathPrefix: '${basePath}'\` - GitHub Pages project site path

### Build & Deploy:
\`\`\`bash
npm run build            # Build static site (outputs to '${deploymentInfo.buildOutput}/')
npm run serve            # Serve production build locally
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Path Prefix**: All routes are prefixed with \`${basePath}\``
      configFilesSection = `### Configuration Files:
- **\`gatsby-config.js\`**: Gatsby configuration with pathPrefix for GitHub Pages`
      break
      
    case 'angular':
      frameworkSpecificSection = `## Angular Specific Setup

This project uses **Angular** for enterprise-scale applications.

### Key Files:
- **\`ANGULAR_GITHUB_PAGES_SETUP.md\`**: Contains instructions for configuring Angular

### Build & Deploy:
\`\`\`bash
npm run build            # Build for production (outputs to '${deploymentInfo.buildOutput}/')
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Configuration**: Update \`angular.json\` with baseHref: '${basePath}'`
      configFilesSection = `### Configuration Files:
- **\`ANGULAR_GITHUB_PAGES_SETUP.md\`**: Instructions for configuring Angular for GitHub Pages
- **\`angular.json\`**: Update manually with baseHref configuration`
      break
      
    case 'svelte':
      frameworkSpecificSection = `## Svelte/SvelteKit Specific Setup

This project uses **Svelte** or **SvelteKit** for lightweight reactive applications.

### Build & Deploy:
\`\`\`bash
npm run build            # Build for production (outputs to '${deploymentInfo.buildOutput}/')
npm run preview          # Preview production build locally
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Base Path**: Configure in your SvelteKit config if needed`
      break
      
    case 'create-react-app':
      frameworkSpecificSection = `## Create React App Specific Setup

This project uses **Create React App** for React development.

### Key Files:
- **\`package.json\`**: Contains \`homepage\` field for GitHub Pages

### Build & Deploy:
\`\`\`bash
npm run build            # Build for production (outputs to '${deploymentInfo.buildOutput}/')
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **Build Output**: \`${deploymentInfo.buildOutput}/\` directory
- **Homepage**: Set in \`package.json\` for GitHub Pages`
      break
      
    case 'plain':
      frameworkSpecificSection = `## Plain HTML/CSS/JavaScript Setup

This project uses **plain HTML, CSS, and JavaScript** (no framework).

### Key Files:
- **\`index.html\`**: Main HTML file with:
  - Access protection script (redirects from GitHub Pages to protected subdomain)
  - Token checker script (validates authentication)

### Deploy:
\`\`\`bash
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`main\` branch for GitHub Pages
- **No Build Step**: Files are served directly`
      break
      
    default:
      frameworkSpecificSection = `## Framework Setup

**Detected Framework**: ${deploymentInfo.framework === 'unknown' ? 'Unknown/Default' : deploymentInfo.framework}

### Build & Deploy:
\`\`\`bash
npm run deploy:worker    # Deploy Cloudflare Worker
\`\`\`

### Important:
- **Branch**: Use \`${deploymentInfo.branch}\` branch for GitHub Pages
- **Build Output**: ${deploymentInfo.buildOutput ? `\`${deploymentInfo.buildOutput}/\` directory` : 'No build step required'}`
  }
  
  return `# Framework Setup Guide - ${productName}

This guide explains the files created for this project and how to modify them if you change frameworks or deployment options.

---

## 📁 Files Created & Their Purpose

### Core Files (Always Created):

#### 1. **\`worker-updated.js\`** - Cloudflare Worker
**Purpose**: Enforces authentication and license validation before serving your app.

**What it does**:
- Checks for valid Supabase session token
- Validates user license via \`validate-license\` Edge Function
- Redirects unauthenticated users to \`/auth\`
- Redirects users without license to subscription page
- Proxies authenticated requests to GitHub Pages

**If you change frameworks**: No changes needed - works with all frameworks.

**Location**: Root directory

---

#### 2. **\`wrangler.toml\`** - Cloudflare Worker Configuration
**Purpose**: Configures the Cloudflare Worker deployment.

**What it contains**:
- Worker name: \`${productSlug}-worker\`
- Compatibility date
- Main script: \`worker-updated.js\`
- Node.js compatibility flag

**If you change frameworks**: No changes needed - worker configuration is framework-agnostic.

**Location**: Root directory

---

#### 3. **\`auth/\`** - Authentication Pages
**Purpose**: Login page for your app's protected subdomain.

**What it contains**:
- \`index.html\` - Login form
- \`auth.css\` - Styling
- \`auth.js\` - Authentication logic
- \`config.js\` - App-specific configuration

**If you change frameworks**: 
- For **Expo**: Auth files are in \`web/auth/\` (source) and copied to \`dist/auth/\` during build
- For **other frameworks**: Auth files are in root \`auth/\` directory
- You may need to update paths in your build process if switching frameworks

**Location**: ${deploymentInfo.authFolder}

---

#### 4. **\`package.json\`** - Node.js Dependencies & Scripts
**Purpose**: Defines project dependencies and build/deploy scripts.

**What it contains**:
- Framework-specific scripts (build, dev, deploy, etc.)
- \`wrangler\` dependency for Cloudflare Worker deployment
- ${deploymentInfo.framework === 'expo' ? '\`gh-pages\` dependency for GitHub Pages deployment' : 'Other framework-specific dependencies'}

**If you change frameworks**: 
- Update scripts to match your new framework
- Update dependencies
- May need to add/remove framework-specific packages

**Location**: Root directory

---

${frameworkSpecificSection}

${configFilesSection ? `\n${configFilesSection}\n` : ''}

${buildInstructions ? `\n${buildInstructions}\n` : ''}

---

## 🔄 Changing Frameworks During Development

If you decide to switch frameworks after initial setup, here's what to update:

### Step 1: Update Configuration Files

**Remove old framework config** (if exists):
- \`next.config.js\` (Next.js)
- \`vite.config.js\` (Vite)
- \`vue.config.js\` (Vue)
- \`gatsby-config.js\` (Gatsby)
- \`angular.json\` modifications (Angular)

**Add new framework config**:
- Create appropriate config file for your new framework
- Set base path to \`${basePath}\` for GitHub Pages
- Configure build output directory

### Step 2: Update package.json

**Update scripts**:
\`\`\`json
{
  "scripts": {
    "build": "your-new-framework-build-command",
    "dev": "your-new-framework-dev-command",
    "deploy:worker": "npx wrangler deploy"
  }
}
\`\`\`

**Update dependencies**:
- Remove old framework dependencies
- Add new framework dependencies
- Keep \`wrangler\` for Cloudflare Worker deployment

### Step 3: Update Build Output Directory

**In your new framework config**, set output directory to match what the worker expects:
- Most frameworks: \`dist/\` or \`build/\`
- Next.js static export: \`out/\`
- Gatsby: \`public/\`

**Update worker code** (if needed):
The worker proxies to: \`${githubPagesUrl}\`
Make sure your build outputs to a directory that GitHub Pages can serve.

### Step 4: Update Auth Files Location

**If switching to/from Expo**:
- **To Expo**: Move \`auth/\` → \`web/auth/\`, update post-build script
- **From Expo**: Move \`web/auth/\` → \`auth/\`, remove post-build script (or update it)

**For other frameworks**: Auth files stay in root \`auth/\` directory.

### Step 5: Update Post-Build Script (if needed)

**If your new framework needs post-build processing**:
- Create/update \`scripts/post-build.js\`
- Update \`package.json\` deploy script to run post-build

**If your new framework doesn't need post-build**:
- Remove \`scripts/post-build.js\`
- Update \`package.json\` deploy script

### Step 6: Update GitHub Pages Branch

**If switching to/from Expo**:
- **To Expo**: Change GitHub Pages source to \`gh-pages\` branch
- **From Expo**: Change GitHub Pages source to \`main\` branch

**For other frameworks**: Usually use \`main\` branch.

---

## 🚀 Deployment Workflow

### Standard Deployment:
1. **Build your app**: \`npm run build\` (or framework-specific command)
2. **Deploy to GitHub Pages**: Push build output to appropriate branch
3. **Deploy Cloudflare Worker**: \`npm run deploy:worker\`

### For Expo Apps:
1. **Build**: \`npm run build:web\`
2. **Post-build**: Automatically runs \`scripts/post-build.js\`
3. **Deploy to GitHub Pages**: \`npm run deploy:gh-pages\` (pushes to \`gh-pages\` branch)
4. **Deploy Cloudflare Worker**: \`npm run deploy:worker\`

---

## 🔧 Common Modifications

### Changing Subdomain:
1. Update \`wrangler.toml\` worker name (if needed)
2. Update Cloudflare Worker route in Cloudflare Dashboard
3. Update \`auth/config.js\` subdomain field
4. Update any hardcoded URLs in your app

### Changing GitHub Pages URL:
1. Update \`worker-updated.js\` \`GITHUB_PAGES_URL\` constant
2. Update any framework config files with base paths
3. Redeploy worker

### Adding/Removing Features:
- **Auth**: Files in \`${deploymentInfo.authFolder}/\` - modify as needed
- **Worker**: Modify \`worker-updated.js\` for custom logic
- **Build**: Modify framework config files or \`package.json\` scripts

---

## 📚 Additional Resources

- **Cloudflare Worker Docs**: https://developers.cloudflare.com/workers/
- **GitHub Pages Docs**: https://docs.github.com/en/pages
- **Framework-specific docs**: Check your framework's official documentation

---

## ❓ Need Help?

If you encounter issues:
1. Check this guide first
2. Review framework-specific documentation
3. Check Cloudflare Worker logs
4. Verify GitHub Pages deployment status

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Detected Framework**: ${deploymentInfo.framework}
**Build Output**: ${deploymentInfo.buildOutput || 'N/A'}
**Deployment Branch**: ${deploymentInfo.branch}
`
}

/**
 * Create post-build script for frameworks that need it
 */
async function createPostBuildScript(
  token: string,
  repoFullName: string,
  productName: string,
  productSlug: string,
  deploymentInfo: FrameworkInfo
) {
  const protectedUrl = `https://${productSlug}.bitminded.ch`
  const postBuildScript = generatePostBuildScript(productName, productSlug, protectedUrl, deploymentInfo)
  await createFile(token, repoFullName, 'scripts/post-build.js', postBuildScript)
  console.log('✅ Post-build script created successfully')
}

/**
 * Generate post-build script for frameworks that need it
 */
function generatePostBuildScript(productName: string, productSlug: string, protectedUrl: string, deploymentInfo: FrameworkInfo): string {
  const buildOutput = deploymentInfo.buildOutput || 'dist'
  const authSourceFolder = deploymentInfo.authFolder === 'web/auth' ? 'web/auth' : 'auth'
  
  return `#!/usr/bin/env node

/**
 * Post-build script to inject GitHub Pages redirect protection
 * This ensures the protection script is included in the built HTML
 * Also copies auth folder and injects token checker
 */

const fs = require('fs');
const path = require('path');

const webBuildPath = path.join(__dirname, '..', '${buildOutput}');
const indexHtmlPath = path.join(webBuildPath, 'index.html');
const authSourcePath = path.join(__dirname, '..', '${authSourceFolder}');
const authDestPath = path.join(webBuildPath, 'auth');

// Protection script to inject
const protectionScript = \`
  <meta name="bitminded-protected-url" content="${protectedUrl}">
  <script>
    (function() {
      'use strict';
      // Get protected URL from meta tag (with fallback)
      const metaTag = document.querySelector('meta[name="bitminded-protected-url"]');
      const protectedUrl = metaTag ? metaTag.getAttribute('content') : '${protectedUrl}';
      
      // Check if accessed via GitHub Pages
      const hostname = window.location.hostname;
      if (hostname.includes('.github.io') || hostname.includes('github.com')) {
        // Strip repository name from path if present, preserve query params and hash
        let path = window.location.pathname;
        // Remove '/${productSlug}' prefix if it exists (for GitHub Pages project sites)
        if (path.startsWith('/${productSlug}')) {
          path = path.replace('/${productSlug}', '') || '/';
        }
        // Build redirect URL with query params and hash
        const queryAndHash = window.location.search + window.location.hash;
        const redirectUrl = (path === '/' ? protectedUrl : protectedUrl + path) + queryAndHash;
        // Use replace() to avoid adding to browser history
        window.location.replace(redirectUrl);
      }
    })();
  </script>\`;

// Token checker script to inject
const tokenCheckerScript = \`
  <script>
    (function() {
      'use strict';
      // Only run on protected subdomain, not GitHub Pages
      const hostname = window.location.hostname;
      if (!hostname.includes('bitminded.ch')) return;
      
      // Skip token check for auth pages
      if (window.location.pathname.startsWith('/auth')) return;
      
      try {
        // Check localStorage for Supabase session (format: sb-<project-ref>-auth-token)
        // Try to find any Supabase session key
        let sessionKey = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('sb-') && key.includes('-auth-token')) {
            sessionKey = key;
            break;
          }
        }
        
        if (!sessionKey) {
          // No session found, redirect to auth
          window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
          return;
        }
        
        const sessionData = localStorage.getItem(sessionKey);
        if (!sessionData) {
          window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
          return;
        }
        
        const session = JSON.parse(sessionData);
        if (!session || !session.expires_at) {
          window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
          return;
        }
        
        // Check if token is expired (expires_at is in seconds)
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // If expired or expires in less than 5 minutes, redirect to auth
        if (now >= expiresAt || (expiresAt - now) < 5 * 60 * 1000) {
          console.log('Token expired or expiring soon, redirecting to auth...');
          window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
      } catch (e) {
        // Silently fail - Cloudflare Worker will handle auth check
        console.debug('Token check error:', e);
      }
    })();
  </script>\`;

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(\`Warning: Source directory \${src} does not exist\`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Check if build output directory exists
  if (!fs.existsSync(webBuildPath)) {
    console.error(\`Error: \${webBuildPath} directory not found. Run the build command first.\`);
    process.exit(1);
  }

  // Copy auth folder to build output
  if (fs.existsSync(authSourcePath)) {
    copyDir(authSourcePath, authDestPath);
    console.log(\`✓ Copied auth folder to \${authDestPath}\`);
  } else {
    console.warn(\`⚠ Warning: \${authSourcePath} folder not found\`);
  }

  // Read the generated index.html
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('Error: index.html not found in dist directory.');
    process.exit(1);
  }

  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  let protectionInjected = false;
  let tokenCheckerInjected = false;

  // Check if protection is already injected (to avoid duplicates)
  if (html.includes('bitminded-protected-url')) {
    console.log('✓ Protection script already exists in index.html');
    protectionInjected = true;
  } else {
    // Inject the protection script right after <head> tag
    html = html.replace(/<head>/i, \`<head>\${protectionScript}\`);
  }

  // Inject token checker script if not already present
  if (html.includes('Token expired or expiring soon')) {
    console.log('✓ Token checker already exists in index.html');
    tokenCheckerInjected = true;
  } else {
    // Inject token checker script right before closing </head> tag
    if (html.includes('</head>')) {
      html = html.replace('</head>', \`\${tokenCheckerScript}</head>\`);
    } else {
      // Fallback: inject after protection script if </head> not found
      html = html.replace(/bitminded-protected-url.*?<\\/script>/is, \`$&\${tokenCheckerScript}\`);
    }
  }

  // Fix asset paths for GitHub Pages - convert absolute paths to relative
  // This fixes 404 errors for assets when hosted on GitHub Pages project sites
  html = html.replace(/href="\\/(?!\\/)/g, 'href="./');
  html = html.replace(/src="\\/(?!\\/)/g, 'src="./');

  // Write the modified HTML back
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  
  // Note: .nojekyll file will be created by gh-pages CLI using --nojekyll flag
  
  if (!protectionInjected) {
    console.log('✓ Successfully injected GitHub Pages redirect protection');
  }
  if (!tokenCheckerInjected) {
    console.log('✓ Successfully injected token checker script');
  }
  console.log('✓ Fixed asset paths for GitHub Pages compatibility');
  
} catch (error) {
  console.error('Error in post-build script:', error);
  process.exit(1);
}
`
}

/**
 * Generate package.json based on framework
 */
function generatePackageJson(productName: string, stack: string[], deploymentInfo: FrameworkInfo): string {
  const name = productName.toLowerCase().replace(/\s+/g, '-')
  
  const basePackage: any = {
    name,
    version: '0.1.0',
    description: 'Generated by BitMinded Product Creation Wizard',
    main: 'index.js',
    scripts: {},
    dependencies: {},
    devDependencies: {
      wrangler: '^3.0.0' // Always include wrangler for worker deployment
    }
  }
  
  switch (deploymentInfo.framework) {
    case 'expo':
      basePackage.scripts = {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        'build:web': 'npx expo export --platform web',
        deploy: 'npm run build:web && node scripts/post-build.js && npm run deploy:gh-pages',
        'deploy:gh-pages': `gh-pages -d ${deploymentInfo.buildOutput} --nojekyll`,
        'deploy:worker': 'npx wrangler deploy'
      }
      basePackage.devDependencies['gh-pages'] = '^6.1.1'
      break
      
    case 'nextjs':
      basePackage.scripts = {
      dev: 'next dev',
      build: 'next build',
        export: 'next export', // For static export
      start: 'next start',
        lint: 'next lint',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'vite':
      basePackage.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'vue':
      basePackage.scripts = {
        serve: 'vue-cli-service serve',
        build: 'vue-cli-service build',
        lint: 'vue-cli-service lint',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'angular':
      basePackage.scripts = {
        ng: 'ng',
        start: 'ng serve',
        build: 'ng build',
        test: 'ng test',
        lint: 'ng lint',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'svelte':
      basePackage.scripts = {
        dev: 'vite dev',
        build: 'vite build',
        preview: 'vite preview',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'gatsby':
      basePackage.scripts = {
        develop: 'gatsby develop',
        build: 'gatsby build',
        serve: 'gatsby serve',
        clean: 'gatsby clean',
        deploy: 'npx wrangler deploy'
      }
      break
      
    case 'create-react-app':
      basePackage.scripts = {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject',
        deploy: 'npx wrangler deploy'
      }
      // Add homepage for GitHub Pages
      basePackage.homepage = `https://${name}.github.io/${name}`
      break
      
    default:
      // Standard/default scripts
      basePackage.scripts = {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        deploy: 'npx wrangler deploy'
      }
  }
  
  return JSON.stringify(basePackage, null, 2)
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: Admin function - 10/min, 100/hour per user (GitHub API limits)
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      user.id,
      'user',
      'create-github-repository',
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

    // Parse request body
    const { repoName, description, private: isPrivate, specification, generatedReadme, productSlug, productName, iconUrl, screenshots } = await req.json()

    // TODO: Get GitHub token from user's stored credentials
    // For now, we'll use an environment variable
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    
    if (!githubToken) {
      throw new Error('GitHub token not configured')
    }

    // Get username first
    const userResponse = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info')
    }
    
    const userData = await userResponse.json()
    const username = userData.login
    const repoFullName = `${username}/${repoName}`
    
    // First, check if repository already exists
    const checkRepoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    let repoData
    let repoExists = false

    if (checkRepoResponse.ok) {
      // Repository exists
      repoData = await checkRepoResponse.json()
      repoExists = true
      console.log('Repository already exists')
    } else {
      // Repository doesn't exist, create it
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          description: description,
          private: isPrivate,
          auto_init: false
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`GitHub API error: ${error}`)
      }

      repoData = await response.json()
      console.log('Repository created')
    }

    // Only create files if repository is new
    if (!repoExists) {
      await createInitialFiles(githubToken, repoData.full_name, specification, generatedReadme, productSlug, productName, iconUrl, screenshots)
    }

    return new Response(
      JSON.stringify({
        success: true,
        repoUrl: repoData.html_url,
        repoName: repoData.full_name,
        cloneUrl: repoData.clone_url,
        defaultBranch: repoData.default_branch,
        repoExists: repoExists,
        message: repoExists 
          ? 'Repository already exists' 
          : 'Repository created successfully with initial structure'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating GitHub repository:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})


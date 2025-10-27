/**
 * Create GitHub Repository Edge Function
 * Creates a GitHub repository with initial structure based on technical specification
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Create initial repository files based on technical specification
 */
async function createInitialFiles(token: string, repoFullName: string, spec: string, generatedReadme?: string) {
  // Extract key info from specification
  const productName = extractProductName(spec)
  const techStack = extractTechStack(spec)
  
  // Create README.md using spec as content
  await createFile(token, repoFullName, 'README.md', spec)
  
  // Create .gitignore based on tech stack
  const gitignore = generateGitignore(techStack)
  await createFile(token, repoFullName, '.gitignore', gitignore)
  
  // Create package.json if it's a Node.js project
  if (techStack.includes('Node.js') || techStack.includes('React') || techStack.includes('Next.js')) {
    const packageJson = generatePackageJson(productName, techStack)
    await createFile(token, repoFullName, 'package.json', packageJson)
  }
  
  console.log('✅ Initial files created successfully')
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
 * Generate package.json
 */
function generatePackageJson(productName: string, stack: string[]): string {
  const name = productName.toLowerCase().replace(/\s+/g, '-')
  
  return JSON.stringify({
    name,
    version: '0.1.0',
    description: `Generated by BitMinded Product Creation Wizard`,
    main: 'index.js',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    dependencies: {},
    devDependencies: {}
  }, null, 2)
}

serve(async (req) => {
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
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { repoName, description, private: isPrivate, specification, generatedReadme } = await req.json()

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
      await createInitialFiles(githubToken, repoData.full_name, specification, generatedReadme)
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


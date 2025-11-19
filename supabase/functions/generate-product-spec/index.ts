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
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Try to get authenticated user for user-based rate limiting
    let userId: string | null = null
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      userId = user?.id || null
    } catch {
      // Not authenticated, use IP-based rate limiting
    }

    // Create admin client for rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Rate limiting: User-based if authenticated, IP-based otherwise - 10/min, 100/hour (AI generation is expensive)
    const rateLimitIdentifier = userId || ipAddress
    const rateLimitType: 'user' | 'ip' = userId ? 'user' : 'ip'
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      rateLimitIdentifier,
      rateLimitType,
      'generate-product-spec',
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

    // Get the request body
    const { 
      productName,
      productSlug,
      category,
      shortDescription,
      description,
      tags,
      platformType,
      frontendTech,
      backendTech,
      databaseType,
      authType,
      paymentType,
      targetUsers,
      businessProblem,
      timelineContext,
      aiRecommendations,
      aiFinalDecisions
    } = await req.json()

    // Validate required fields
    if (!productName || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: productName and description are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine the final technical decisions (prioritize AI final decisions over form values)
    const finalDecisions = {
      platformType: aiFinalDecisions?.['platform-type'] || platformType || 'web-app',
      frontendTech: aiFinalDecisions?.['frontend-tech'] || frontendTech || 'html-css-js',
      backendTech: aiFinalDecisions?.['backend-tech'] || backendTech || 'static',
      databaseType: aiFinalDecisions?.['database-type'] || databaseType || 'none',
      authType: aiFinalDecisions?.['auth-type'] || authType || 'none',
      paymentType: aiFinalDecisions?.['payment-type'] || paymentType || 'none'
    }

    // Extract AI reasoning for each decision
    const getAiReasoning = (fieldName) => {
      const recommendation = aiRecommendations?.[fieldName]
      return recommendation ? recommendation.reasoning : 'No AI reasoning provided'
    }

    // Prepare the AI prompt
    const aiPrompt = `You are a senior technical product manager creating a precise, Cursor-ready technical specification.

**PRODUCT ANALYSIS:**
- Name: "${productName}"
- Category: "${category}"
- Description: "${description}"
- Tags: ${tags ? tags.join(', ') : 'None'}
- Target Users: ${targetUsers || 'General users'}
- Business Problem: ${businessProblem || 'Not specified'}
- Timeline: ${timelineContext || 'No specific constraints'}

**AI-RECOMMENDED TECHNICAL DECISIONS:**
- Platform: ${finalDecisions.platformType}
  Reasoning: ${getAiReasoning('platform-type')}
- Frontend: ${finalDecisions.frontendTech}
  Reasoning: ${getAiReasoning('frontend-tech')}
- Backend: ${finalDecisions.backendTech}
  Reasoning: ${getAiReasoning('backend-tech')}
- Database: ${finalDecisions.databaseType}
  Reasoning: ${getAiReasoning('database-type')}
- Authentication: ${finalDecisions.authType}
  Reasoning: ${getAiReasoning('auth-type')}
- Payment: ${finalDecisions.paymentType}
  Reasoning: ${getAiReasoning('payment-type')}

**CRITICAL REQUIREMENTS:**
1. **MUST** use the exact technology choices listed above
2. **MUST** be consistent with the AI reasoning provided
3. **MUST** create a specification that matches the AI recommendations
4. **MUST** provide specific implementation details for the chosen tech stack
5. **MUST** be accurate and error-free for Cursor development
6. **MUST** consider the actual product complexity and user needs

**SPECIFICATION STRUCTURE:**
# Technical Specification: ${productName}

## 1. Product Overview
- **Problem Statement**: ${businessProblem || 'Define the core problem this product solves'}
- **Solution Approach**: Technical strategy using ${finalDecisions.platformType} platform
- **Target Users**: ${targetUsers || 'General users'}
- **Success Metrics**: Measurable outcomes for this product type

## 2. Technical Architecture
- **Platform**: ${finalDecisions.platformType} - ${getAiReasoning('platform-type')}
- **Frontend**: ${finalDecisions.frontendTech} - ${getAiReasoning('frontend-tech')}
- **Backend**: ${finalDecisions.backendTech} - ${getAiReasoning('backend-tech')}
- **Database**: ${finalDecisions.databaseType} - ${getAiReasoning('database-type')}
- **Authentication**: ${finalDecisions.authType} - ${getAiReasoning('auth-type')}
- **Payment Processing**: ${finalDecisions.paymentType} - ${getAiReasoning('payment-type')}

## 3. User Stories & Acceptance Criteria
- **Core Functionality**: Based on the product description and category
- **User Experience**: Specific to ${finalDecisions.platformType} platform
- **Technical Requirements**: Aligned with chosen tech stack

## 4. Implementation Details
- **File Structure**: Specific to ${finalDecisions.frontendTech} and ${finalDecisions.backendTech}
- **Key Components**: Core functionality implementation
- **Integration Points**: External services and APIs
- **Deployment Strategy**: Based on ${finalDecisions.platformType} choice

## 5. Development Guidelines
- **Code Standards**: Specific to chosen technologies
- **Testing Strategy**: Appropriate for the tech stack
- **Performance Considerations**: Based on platform choice
- **Security Requirements**: Based on authentication choice

Generate a comprehensive specification that is 100% consistent with the AI recommendations above.`

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical product manager creating precise, accurate technical specifications. You MUST use the exact technology choices and reasoning provided in the prompt. Do not deviate from the AI recommendations. Create specifications that are 100% consistent with the provided technical decisions and reasoning. Focus on accuracy and implementation details specific to the chosen technologies.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API Error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const openaiData = await openaiResponse.json()
    const specification = openaiData.choices[0]?.message?.content

    if (!specification) {
      throw new Error('No specification generated from OpenAI')
    }

    // Return the generated specification
    return new Response(
      JSON.stringify({ 
        success: true,
        specification: specification,
        model: 'gpt-4o-mini',
        tokens_used: openaiData.usage?.total_tokens || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Error in generate-product-spec function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

  } catch (error) {
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

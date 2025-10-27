import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // Get the request body
    const { 
      productName,
      productSlug,
      category,
      shortDescription,
      description,
      tags,
      fieldName,
      userQuestion,
      currentDecision,
      conversationHistory
    } = await req.json()

    // Validate required fields
    if (!fieldName) {
        console.error('Missing required field: fieldName')
        return new Response(
            JSON.stringify({ error: 'Missing required field: fieldName is required' }),
            { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
        )
    }

    // Provide default values for missing product context
    const finalProductName = productName || 'New Product'
    const finalDescription = description || 'A new product to be developed'
    const finalCategory = category || 'General'

    console.log('Conversational AI request:', { fieldName, userQuestion, currentDecision })

    // Create contextual AI prompt
    const aiPrompt = `You are a senior technical architect making precise technical decisions.

**PRODUCT ANALYSIS:**
- Name: "${finalProductName}"
- Category: "${finalCategory}"
- Description: "${finalDescription}"
- Tags: ${Array.isArray(tags) ? tags.join(', ') : tags}

**ANALYZE THIS PRODUCT TYPE:**
Based on the name, category, description, and tags, determine:
1. What type of application this is (tool, service, platform, etc.)
2. Who the target users are
3. What the core functionality requires
4. Complexity level (simple, moderate, complex)

**CURRENT DECISION:** ${fieldName}

**VALID OPTIONS:**
${getValidOptions(fieldName)}

**CONVERSATION CONTEXT:**
${conversationHistory ? `Previous conversation: ${conversationHistory}` : ''}
${currentDecision ? `Current decision: ${currentDecision}` : ''}

**USER QUESTION:** ${userQuestion || 'Provide your initial recommendation with specific technical reasoning.'}

**DECISION CRITERIA:**
For ${fieldName}, consider:
${getDecisionCriteria(fieldName)}

**REQUIREMENTS:**
1. **MUST** be technically accurate for this specific product
2. **MUST** consider the actual complexity and user needs
3. **MUST** provide specific reasoning, not generic statements
4. **MUST** be consistent with other technical choices
5. **MUST** consider scalability and maintenance

**RESPONSE FORMAT:**
{
  "recommendation": "specific_option",
  "reasoning": "detailed technical explanation specific to this product",
  "alternatives": [
    {
      "option": "alternative_option",
      "pros": "specific advantages for this product",
      "cons": "specific disadvantages for this product"
    }
  ],
  "confidence": 0.8
}`

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
            content: 'You are a senior technical architect making precise technical decisions. Analyze the specific product context carefully and provide accurate recommendations based on actual technical requirements. Be specific about why each technology choice fits this particular product. Avoid generic statements. Always base decisions on technical merit and product needs. Return only valid JSON.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API Error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0]?.message?.content?.trim()

    if (!aiResponse) {
      throw new Error('No response generated from OpenAI')
    }

    // Parse AI response
    let response
    try {
      response = JSON.parse(aiResponse)
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Invalid JSON response from AI')
    }

    // Return the response
    return new Response(
      JSON.stringify({ 
        success: true,
        response: response,
        tokens_used: openaiData.usage?.total_tokens || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in conversational-tech-guidance function:', error)
    
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

function getValidOptions(fieldName) {
  const options = {
    'platformType': 'web-app, pwa, mobile-ios, mobile-android, desktop, cross-platform',
    'frontendTech': 'html-css-js, react, vue, angular, flutter, native',
    'backendTech': 'serverless, nodejs, python, php, dotnet, static',
    'databaseType': 'postgresql, mysql, mongodb, firebase, supabase, none',
    'authType': 'none, email-password, oauth, magic-link, sso',
    'paymentType': 'none, stripe, paypal, apple-pay, google-pay, subscription'
  }
  
  return options[fieldName] || 'various options available'
}

function getDecisionCriteria(fieldName) {
  const criteria = {
    'platformType': `
- Web-app: For browser-based tools, calculators, simple utilities
- PWA: For offline-capable apps, mobile-like experience
- Mobile: For native mobile features, offline-first apps
- Desktop: For complex desktop applications, file system access
- Cross-platform: For apps needed on multiple platforms`,
    
    'frontendTech': `
- HTML-CSS-JS: For simple tools, calculators, static content
- React: For interactive UIs, state management, component reusability
- Vue: For moderate complexity, easier learning curve
- Angular: For enterprise apps, complex data binding
- Flutter: For mobile-first, cross-platform consistency
- Native: For platform-specific features, maximum performance`,
    
    'backendTech': `
- Serverless: For simple APIs, event-driven, cost-effective
- Node.js: For JavaScript ecosystem, real-time features
- Python: For data processing, ML, complex algorithms
- PHP: For traditional web apps, CMS-like functionality
- .NET: For enterprise applications, Windows ecosystem
- Static: For no backend needed, client-side only`,
    
    'databaseType': `
- PostgreSQL: For complex queries, ACID compliance, relational data
- MySQL: For web applications, moderate complexity
- MongoDB: For flexible schemas, document storage
- Firebase: For real-time features, offline sync
- Supabase: For PostgreSQL with real-time, auth built-in
- None: For static apps, client-side storage only`,
    
    'authType': `
- None: For public tools, calculators, informational sites
- Email-password: For user accounts, personal data
- OAuth: For social login, third-party integration
- Magic-link: For passwordless, email-based auth
- SSO: For enterprise, organization-wide access`,
    
    'paymentType': `
- None: For free tools, informational content
- Stripe: For subscriptions, complex billing
- PayPal: For simple payments, international
- Apple Pay: For iOS apps, mobile payments
- Google Pay: For Android apps, mobile payments
- Subscription: For recurring revenue, SaaS models`
  }
  
  return criteria[fieldName] || 'Consider the specific needs of this product type'
}

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
    const requestBody = await req.json()
    const { 
      fieldName, 
      productName,
      category,
      shortDescription,
      description,
      tags,
      currentValue 
    } = requestBody

    // Validate required fields
    if (!fieldName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fieldName' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate prompt based on field name
    let prompt = ''
    if (fieldName === 'target-users') {
      prompt = `Based on this product information:
Product Name: ${productName || 'Not specified'}
Category: ${category || 'Not specified'}
Description: ${description || shortDescription || 'Not specified'}
Tags: ${tags?.join(', ') || 'None'}
${currentValue ? `Current value: ${currentValue}` : ''}

Generate a detailed description of the target users for this product. Consider demographics, technical proficiency, use cases, and pain points. Be specific and actionable.`
    } else if (fieldName === 'business-problem') {
      prompt = `Based on this product information:
Product Name: ${productName || 'Not specified'}
Category: ${category || 'Not specified'}
Description: ${description || shortDescription || 'Not specified'}
Tags: ${tags?.join(', ') || 'None'}
${currentValue ? `Current value: ${currentValue}` : ''}

Generate a detailed description of the business problem this product solves. Consider the market needs, pain points addressed, and value proposition. Be specific and actionable.`
    } else if (fieldName === 'timeline-context') {
      prompt = `Based on this product information:
Product Name: ${productName || 'Not specified'}
Category: ${category || 'Not specified'}
Description: ${description || shortDescription || 'Not specified'}
Tags: ${tags?.join(', ') || 'None'}
${currentValue ? `Current value: ${currentValue}` : ''}

Generate timeline context information including urgency, deadlines, market timing considerations, and any relevant scheduling constraints. Be specific and actionable.`
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown field name: ${fieldName}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI API for field suggestion
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
            content: 'You are a technical product manager assistant. Provide specific, actionable suggestions for product specification fields. Give direct answers and recommendations, not generic advice. Be concise and practical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API Error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const openaiData = await openaiResponse.json()
    const suggestion = openaiData.choices[0]?.message?.content?.trim()

    if (!suggestion) {
      throw new Error('No suggestion generated from OpenAI')
    }

    // Return the generated suggestion
    return new Response(
      JSON.stringify({ 
        success: true,
        suggestion: suggestion,
        fieldName: fieldName,
        model: 'gpt-4o-mini',
        tokens_used: openaiData.usage?.total_tokens || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-field-suggestion function:', error)
    
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

/**
 * Create Stripe Product Edge Function
 * Creates a Stripe product and price based on the wizard configuration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment')
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const {
      name,
      description,
      fullDescription,
      iconUrl,
      documentationUrl,
      supportEmail,
      category,
      tags,
      pricingType,
      currency = 'chf',
      enterprisePrice,
      subscriptionInterval,
      subscriptionPrice,
      oneTimePrice,
      trialDays,
      trialRequiresPayment
    } = body

    console.log('💳 Creating Stripe product:', { name, pricingType })

    // Build product metadata
    const metadata: Record<string, string> = {
      pricing_type: pricingType
    }
    if (category) metadata.category = category
    if (tags) metadata.tags = tags
    if (documentationUrl) metadata.documentation_url = documentationUrl
    if (supportEmail) metadata.support_email = supportEmail
    
    // Add full description to metadata if available
    if (fullDescription) {
      metadata.full_description = fullDescription
    }

    // Build Stripe product params
    const productParams: Record<string, string> = {
      name: name,
      description: description || '',
      statement_descriptor: name.substring(0, 22) // Stripe limit: 22 characters, what shows on statement
    }
    
    // Add images if available
    if (iconUrl) {
      productParams['images[0]'] = iconUrl
    }

    // Add metadata
    Object.keys(metadata).forEach((key, index) => {
      productParams[`metadata[${key}]`] = metadata[key]
    })

    // Create Stripe product
    const stripeProduct = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(productParams)
    })

    if (!stripeProduct.ok) {
      const error = await stripeProduct.text()
      console.error('❌ Error creating Stripe product:', error)
      throw new Error('Failed to create Stripe product')
    }

    const productData = await stripeProduct.json()
    console.log('✅ Stripe product created:', productData.id)

    // Create price based on pricing type
    let priceData = null

    switch (pricingType) {
      case 'freemium':
        // Create price for enterprise (individual is free, handled in app logic)
        if (enterprisePrice && enterprisePrice > 0) {
          priceData = await createStripePrice(
            stripeSecretKey,
            productData.id,
            enterprisePrice,
            currency,
            'one_time',
            'Enterprise'
          )
        }
        break

      case 'subscription':
        if (subscriptionPrice && subscriptionPrice > 0) {
          priceData = await createStripePrice(
            stripeSecretKey,
            productData.id,
            subscriptionPrice,
            currency,
            'recurring',
            null,
            subscriptionInterval === 'yearly' ? 'year' : 'month'
          )
        }
        break

      case 'one_time':
        if (oneTimePrice && oneTimePrice > 0) {
          priceData = await createStripePrice(
            stripeSecretKey,
            productData.id,
            oneTimePrice,
            currency,
            'one_time',
            'Lifetime'
          )
        }
        break
    }

    // For freemium with 0 price, we don't create a price (individual is free)
    if (!priceData) {
      console.log('ℹ️ No price created (likely freemium with 0 price)')
      
      return new Response(
        JSON.stringify({
          success: true,
          productId: productData.id,
          priceId: null,
          product: productData,
          price: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Stripe price created:', priceData.id)

    return new Response(
      JSON.stringify({
        success: true,
        productId: productData.id,
        priceId: priceData.id,
        product: productData,
        price: priceData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in create-stripe-product:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Create a Stripe price
 */
async function createStripePrice(
  secretKey: string,
  productId: string,
  amount: number,
  currency: string,
  type: 'one_time' | 'recurring',
  nickname?: string,
  interval?: 'month' | 'year'
) {
  const params: Record<string, string> = {
    product: productId,
    unit_amount: String(Math.round(amount * 100)), // Convert to cents
    currency: currency.toLowerCase()
  }

  if (type === 'recurring') {
    params['recurring[interval]'] = interval || 'month'
  }

  if (nickname) {
    params.nickname = nickname
  }

  const response = await fetch('https://api.stripe.com/v1/prices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create price: ${error}`)
  }

  return await response.json()
}


/**
 * Create Stripe Product Edge Function
 * Creates a Stripe product and price based on the wizard configuration
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
 * Log error to database
 */
async function logError(
  supabaseAdmin: any,
  functionName: string,
  errorType: 'stripe_api' | 'validation' | 'network' | 'auth' | 'database' | 'other',
  errorMessage: string,
  errorDetails: any,
  userId: string | null,
  requestData: any,
  ipAddress?: string
) {
  try {
    await supabaseAdmin
      .from('error_logs')
      .insert({
        function_name: functionName,
        error_type: errorType,
        error_message: errorMessage,
        error_details: errorDetails ? JSON.parse(JSON.stringify(errorDetails)) : null,
        user_id: userId,
        request_data: requestData ? JSON.parse(JSON.stringify(requestData)) : null,
        ip_address: ipAddress || null
      })
  } catch (logError) {
    // Don't throw - error logging should not break the main flow
    console.error('❌ Failed to log error to database:', logError)
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
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

    // Extract token from Authorization header and verify session exists (prevent use of revoked tokens)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Create admin client for user_sessions query
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
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

    // Rate limiting: Admin function - 20/min, 200/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'create-stripe-product',
      { requestsPerMinute: 20, requestsPerHour: 200, windowMinutes: 60 }
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

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment')
      await logError(
        supabaseAdmin,
        'create-stripe-product',
        'validation',
        'STRIPE_SECRET_KEY not found in environment',
        { missing_secret: 'STRIPE_SECRET_KEY' },
        user.id,
        { has_auth: true },
        ipAddress
      )
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
      currency = 'chf', // Deprecated, use pricing object instead
      pricing, // Multi-currency pricing object: {CHF: 50, USD: 55, EUR: 48, GBP: 42}
      enterprisePrice, // Deprecated, use pricing object instead
      subscriptionInterval,
      subscriptionPrice, // Deprecated, use pricing object instead
      oneTimePrice, // Deprecated, use pricing object instead
      trialDays,
      trialRequiresPayment
    } = body

    console.log('💳 Creating Stripe product:', { name, pricingType, pricing })

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
    
    // Add supported currencies to metadata
    if (pricing && typeof pricing === 'object') {
      const currencies = Object.keys(pricing).filter(curr => pricing[curr] > 0)
      if (currencies.length > 0) {
        metadata.supported_currencies = currencies.join(',')
      }
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
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-11-20.acacia'
      },
      body: new URLSearchParams(productParams)
    })

    if (!stripeProduct.ok) {
      const error = await stripeProduct.text()
      console.error('❌ Error creating Stripe product:', error)
      await logError(
        supabaseAdmin,
        'create-stripe-product',
        'stripe_api',
        'Failed to create Stripe product',
        { stripe_error: error, status: stripeProduct.status },
        user.id,
        { name, pricingType, currency },
        ipAddress
      )
      throw new Error('Failed to create Stripe product')
    }

    const productData = await stripeProduct.json()
    console.log('✅ Stripe product created:', productData.id)

    // Determine price type and interval for price creation
    let priceType: 'one_time' | 'recurring' = 'one_time'
    let priceInterval: 'month' | 'year' | null = null
    let priceNickname: string | null = null

    switch (pricingType) {
      case 'freemium':
        priceType = 'one_time'
        priceNickname = 'Enterprise'
        break
      case 'subscription':
        priceType = 'recurring'
        priceInterval = subscriptionInterval === 'yearly' ? 'year' : 'month'
        break
      case 'one_time':
        priceType = 'one_time'
        priceNickname = 'Lifetime'
        break
    }

    // Create prices for all currencies in pricing object
    const prices: Record<string, any> = {}
    const priceErrors: Record<string, string> = {}

    if (pricing && typeof pricing === 'object') {
      // Multi-currency pricing
      for (const [currency, amount] of Object.entries(pricing)) {
        const currencyUpper = currency.toUpperCase()
        const priceAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
        
        if (priceAmount > 0) {
          try {
            const priceData = await createStripePrice(
              stripeSecretKey,
              productData.id,
              priceAmount,
              currencyUpper.toLowerCase(),
              priceType,
              priceNickname,
              priceInterval || undefined
            )
            prices[currencyUpper] = priceData.id
            console.log(`✅ Stripe price created for ${currencyUpper}:`, priceData.id)
          } catch (error) {
            console.error(`❌ Error creating price for ${currencyUpper}:`, error)
            priceErrors[currencyUpper] = error.message
            // Log error but continue with other currencies
            await logError(
              supabaseAdmin,
              'create-stripe-product',
              'stripe_api',
              `Failed to create price for ${currencyUpper}`,
              { 
                currency: currencyUpper,
                amount: priceAmount,
                error: error.message,
                error_string: String(error)
              },
              user.id,
              { name, pricingType, currency: currencyUpper, amount: priceAmount },
              ipAddress
            )
          }
        }
      }
    } else {
      // Fallback to old single-currency format for backward compatibility
      let singlePrice: number | null = null
      
      switch (pricingType) {
        case 'freemium':
          singlePrice = enterprisePrice || 0
          break
        case 'subscription':
          singlePrice = subscriptionPrice || 0
          break
        case 'one_time':
          singlePrice = oneTimePrice || 0
          break
      }

      if (singlePrice && singlePrice > 0) {
        try {
          const priceData = await createStripePrice(
            stripeSecretKey,
            productData.id,
            singlePrice,
            currency.toLowerCase(),
            priceType,
            priceNickname,
            priceInterval || undefined
          )
          prices[currency.toUpperCase()] = priceData.id
          console.log(`✅ Stripe price created for ${currency.toUpperCase()}:`, priceData.id)
        } catch (error) {
          console.error(`❌ Error creating price for ${currency}:`, error)
          priceErrors[currency.toUpperCase()] = error.message
          await logError(
            supabaseAdmin,
            'create-stripe-product',
            'stripe_api',
            `Failed to create price for ${currency}`,
            { 
              currency: currency,
              amount: singlePrice,
              error: error.message,
              error_string: String(error)
            },
            user.id,
            { name, pricingType, currency, amount: singlePrice },
            ipAddress
          )
        }
      }
    }

    // If no prices were created and it's not freemium with 0 price, return error
    if (Object.keys(prices).length === 0 && pricingType !== 'freemium') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid prices provided',
          priceErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get primary price ID (first currency or CHF if available)
    const primaryPriceId = prices.CHF || prices.USD || prices.EUR || prices.GBP || Object.values(prices)[0] || null

    return new Response(
      JSON.stringify({
        success: true,
        productId: productData.id,
        priceId: primaryPriceId, // Primary price ID for backward compatibility
        prices: prices, // All price IDs by currency
        product: productData,
        priceErrors: Object.keys(priceErrors).length > 0 ? priceErrors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in create-stripe-product:', error)
    
    // Try to get user ID for logging (may not be available in all error cases)
    let userId: string | null = null
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      )
      const { data: { user } } = await supabaseClient.auth.getUser()
      userId = user?.id || null
    } catch {
      // Ignore auth errors when logging
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'
    
    await logError(
      supabaseAdmin,
      'create-stripe-product',
      'other',
      error.message || 'Unknown error',
      { 
        error_name: error.name,
        error_stack: error.stack,
        error_string: String(error)
      },
      userId,
      { method: req.method, url: req.url },
      ipAddress
    )
    
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
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-11-20.acacia'
    },
    body: new URLSearchParams(params)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create price: ${error}`)
  }

  return await response.json()
}


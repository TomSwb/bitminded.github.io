/**
 * Create Stripe Subscription Product
 * 
 * Dedicated edge function for creating Stripe products specifically for subscriptions.
 * This ensures proper setup for subscription-based products with trial periods,
 * recurring prices, and subscription-optimized metadata.
 * 
 * Used for:
 * - Catalog access services (All-Tools Membership, Supporter Tier)
 * - Product Wizard subscription products
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

/**
 * Rate limiting check
 */
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
    console.error('❌ Failed to log error to database:', logError)
  }
}

/**
 * Create Stripe recurring price
 */
async function createStripeRecurringPrice(
  secretKey: string,
  productId: string,
  amount: number,
  currency: string,
  interval: 'month' | 'year',
  nickname?: string
) {
  const params: Record<string, string> = {
    product: productId,
    unit_amount: String(Math.round(amount * 100)), // Convert to cents
    currency: currency.toLowerCase(),
    'recurring[interval]': interval
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
    throw new Error(`Failed to create recurring price: ${error}`)
  }

  return await response.json()
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

    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Rate limiting: Admin function - 20/min, 200/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'create-stripe-subscription-product',
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

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
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
      short_description,
      pricing, // JSONB pricing object: {"CHF": {"monthly": 10, "yearly": 100}, ...}
      trial_days = 0,
      trial_requires_payment = false,
      entity_type = 'service' // 'service' or 'product'
    } = body

    // Validation
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pricing || typeof pricing !== 'object' || Object.keys(pricing).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pricing data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('💳 Creating Stripe subscription product:', { name, trial_days, trial_requires_payment })

    // Build product metadata optimized for subscriptions
    const metadata: Record<string, string> = {
      entity_type: entity_type,
      pricing_type: 'subscription',
      subscription_optimized: 'true',
      trial_days: String(trial_days || 0),
      trial_requires_payment: String(trial_requires_payment || false)
    }

    // Build Stripe product params
    const productParams: Record<string, string> = {
      name: name,
      description: description || short_description || '',
      statement_descriptor: name.substring(0, 22) // Stripe limit: 22 characters
    }

    // Add metadata
    Object.keys(metadata).forEach((key) => {
      productParams[`metadata[${key}]`] = metadata[key]
    })

    // Create Stripe product
    const stripeProductResponse = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-11-20.acacia'
      },
      body: new URLSearchParams(productParams)
    })

    if (!stripeProductResponse.ok) {
      const error = await stripeProductResponse.text()
      console.error('❌ Error creating Stripe product:', error)
      await logError(
        supabaseAdmin,
        'create-stripe-subscription-product',
        'stripe_api',
        'Failed to create Stripe product',
        { stripe_error: error, status: stripeProductResponse.status },
        user.id,
        { name, description },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to create Stripe product', details: error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeProduct = await stripeProductResponse.json()
    console.log('✅ Stripe subscription product created:', stripeProduct.id)

    // Create recurring prices for all currencies
    const monthlyPrices: Record<string, any> = {}
    const yearlyPrices: Record<string, any> = {}
    const priceErrors: Record<string, string> = {}

    // Determine if we need to create monthly and/or yearly prices
    let hasMonthly = false
    let hasYearly = false
    
    const firstCurrencyData = Object.values(pricing)[0]
    if (typeof firstCurrencyData === 'object' && firstCurrencyData !== null) {
      const priceObj = firstCurrencyData as { monthly?: number; yearly?: number; [key: string]: any }
      hasMonthly = priceObj.monthly !== undefined && priceObj.monthly > 0
      hasYearly = priceObj.yearly !== undefined && priceObj.yearly > 0
    }

    const shouldCreateMonthly = hasMonthly || !hasYearly // Create monthly if specified, or if no yearly
    const shouldCreateYearly = hasYearly

    for (const [currency, priceData] of Object.entries(pricing)) {
      const currencyUpper = currency.toUpperCase()
      
      if (typeof priceData === 'object' && priceData !== null) {
        const priceObj = priceData as { 
          monthly?: number;
          yearly?: number;
          amount?: number; // Fallback
          [key: string]: any;
        }
        
        const monthlyAmount = priceObj.monthly || 0
        const yearlyAmount = priceObj.yearly || 0
        const fallbackAmount = priceObj.amount || 0

        // Create monthly recurring price
        if (shouldCreateMonthly) {
          const amount = monthlyAmount > 0 ? monthlyAmount : fallbackAmount
          if (amount > 0) {
            try {
              const price = await createStripeRecurringPrice(
                stripeSecretKey,
                stripeProduct.id,
                amount,
                currencyUpper.toLowerCase(),
                'month',
                'Monthly'
              )
              monthlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe monthly subscription price created for ${currencyUpper} (amount: ${amount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating monthly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_monthly`] = error.message
              await logError(
                supabaseAdmin,
                'create-stripe-subscription-product',
                'stripe_api',
                `Failed to create monthly price for ${currencyUpper}`,
                { currency: currencyUpper, amount, error: error.message },
                user.id,
                { name, currency: currencyUpper, amount },
                ipAddress
              )
            }
          }
        }

        // Create yearly recurring price
        if (shouldCreateYearly) {
          const amount = yearlyAmount > 0 ? yearlyAmount : fallbackAmount
          if (amount > 0) {
            try {
              const price = await createStripeRecurringPrice(
                stripeSecretKey,
                stripeProduct.id,
                amount,
                currencyUpper.toLowerCase(),
                'year',
                'Yearly'
              )
              yearlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe yearly subscription price created for ${currencyUpper} (amount: ${amount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating yearly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_yearly`] = error.message
              await logError(
                supabaseAdmin,
                'create-stripe-subscription-product',
                'stripe_api',
                `Failed to create yearly price for ${currencyUpper}`,
                { currency: currencyUpper, amount, error: error.message },
                user.id,
                { name, currency: currencyUpper, amount },
                ipAddress
              )
            }
          }
        }
      }
    }

    // Get primary price IDs (prefer CHF, then USD, EUR, GBP, then first available)
    const primaryMonthlyPriceId = monthlyPrices.CHF || monthlyPrices.USD || monthlyPrices.EUR || monthlyPrices.GBP || Object.values(monthlyPrices)[0] || null
    const primaryYearlyPriceId = yearlyPrices.CHF || yearlyPrices.USD || yearlyPrices.EUR || yearlyPrices.GBP || Object.values(yearlyPrices)[0] || null

    return new Response(
      JSON.stringify({
        success: true,
        productId: stripeProduct.id,
        monthlyPriceId: primaryMonthlyPriceId,
        yearlyPriceId: primaryYearlyPriceId,
        priceId: primaryMonthlyPriceId || primaryYearlyPriceId, // Backward compatibility
        monthlyPrices: Object.keys(monthlyPrices).length > 0 ? monthlyPrices : undefined,
        yearlyPrices: Object.keys(yearlyPrices).length > 0 ? yearlyPrices : undefined,
        product: stripeProduct,
        priceErrors: Object.keys(priceErrors).length > 0 ? priceErrors : undefined,
        message: 'Subscription product created successfully with recurring prices. Trial period info stored in metadata for use when creating subscriptions.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error creating Stripe subscription product:', error)
    
    // Try to log error
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await logError(
        supabaseAdmin,
        'create-stripe-subscription-product',
        'other',
        error.message || 'Internal server error',
        { error: String(error), stack: error.stack },
        null,
        {},
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      )
    } catch (logErr) {
      // Ignore logging errors
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


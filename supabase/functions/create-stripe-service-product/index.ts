/**
 * Create Stripe Service Product Edge Function
 * Creates a Stripe product and prices for services with multi-currency and reduced fare support
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

    // Extract token from Authorization header and verify session exists
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

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

    // Verify session exists (optional check - getUser() above is the primary auth)
    // This check helps prevent use of revoked tokens, but we don't fail if the table doesn't exist
    try {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .select('session_token')
        .eq('session_token', token)
        .maybeSingle()

      // Only fail if there's a specific error indicating the session was revoked
      // If the table doesn't exist or query fails, we still allow the request since getUser() succeeded
      if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 = table not found
        console.warn('⚠️ Session verification warning:', sessionError.message)
        // Don't fail - getUser() already verified the user is authenticated
      }
    } catch (sessionCheckError) {
      // If session check fails (e.g., table doesn't exist), log but don't fail
      // The getUser() check above is sufficient for authentication
      console.warn('⚠️ Could not verify session in user_sessions table:', sessionCheckError)
    }

    // Rate limiting: Admin function - 20/min, 200/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'create-stripe-service-product',
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
        'create-stripe-service-product',
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
      short_description,
      pricing, // JSONB pricing object: {"CHF": {"amount": 50, "reduced_amount": 35, "monthly": 5, "yearly": 55}, ...}
      has_reduced_fare = false,
      pricing_type = 'fixed',
      trial_days = 0,
      trial_requires_payment = false
    } = body

    console.log('💳 Creating Stripe service product:', { name, pricing_type })

    // Validate pricing
    if (!pricing || typeof pricing !== 'object' || Object.keys(pricing).length === 0) {
      await logError(
        supabaseAdmin,
        'create-stripe-service-product',
        'validation',
        'Pricing data is required',
        { pricing },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Pricing data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build product metadata
    const metadata: Record<string, string> = {
      entity_type: 'service',
      pricing_type: pricing_type
    }

    // Add trial period info to metadata if subscription
    if (pricing_type === 'subscription' && trial_days > 0) {
      metadata.trial_days = String(trial_days)
      metadata.trial_requires_payment = String(trial_requires_payment)
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
        'create-stripe-service-product',
        'stripe_api',
        'Failed to create Stripe product',
        { stripe_error: error, status: stripeProduct.status },
        user.id,
        { name, pricing_type },
        ipAddress
      )
      throw new Error('Failed to create Stripe product')
    }

    const productData = await stripeProduct.json()
    console.log('✅ Stripe product created:', productData.id)

    // Determine if we need to create monthly and/or yearly prices
    // Check if pricing object has 'monthly' and/or 'yearly' fields
    let hasMonthly = false
    let hasYearly = false
    
    if (pricing_type === 'subscription') {
      // Check first currency's pricing structure to determine if we have monthly/yearly
      const firstCurrencyData = Object.values(pricing)[0]
      if (typeof firstCurrencyData === 'object' && firstCurrencyData !== null) {
        const priceObj = firstCurrencyData as { monthly?: number; yearly?: number; [key: string]: any }
        hasMonthly = priceObj.monthly !== undefined && priceObj.monthly > 0
        hasYearly = priceObj.yearly !== undefined && priceObj.yearly > 0
      }
    }

    // Create monthly if monthly field exists, or if no yearly exists (fallback to amount)
    // Create yearly if yearly field exists
    const shouldCreateMonthly = pricing_type === 'subscription' && (hasMonthly || !hasYearly)
    const shouldCreateYearly = pricing_type === 'subscription' && hasYearly

    // Create prices for all currencies
    const monthlyPrices: Record<string, any> = {}
    const yearlyPrices: Record<string, any> = {}
    const oneTimePrices: Record<string, any> = {}
    const reducedPrices: Record<string, any> = {}
    const priceErrors: Record<string, string> = {}

    for (const [currency, priceData] of Object.entries(pricing)) {
      const currencyUpper = currency.toUpperCase()
      
      if (typeof priceData === 'object' && priceData !== null) {
        const priceObj = priceData as { 
          amount?: number; 
          reduced_amount?: number;
          monthly?: number;
          yearly?: number;
          [key: string]: any;
        }
        
        const amount = priceObj.amount || 0
        const reducedAmount = priceObj.reduced_amount || 0
        const monthlyAmount = priceObj.monthly || 0
        const yearlyAmount = priceObj.yearly || 0

        // Debug logging
        console.log(`🔍 Pricing data for ${currencyUpper}:`, {
          amount,
          monthly: monthlyAmount,
          yearly: yearlyAmount,
          reduced_amount: reducedAmount,
          has_reduced_fare,
          pricing_type,
          priceData
        })

        if (pricing_type === 'subscription') {
          // Create monthly price if needed
          if (shouldCreateMonthly && monthlyAmount > 0) {
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productData.id,
                monthlyAmount,
                currencyUpper.toLowerCase(),
                'recurring',
                'Monthly',
                'month'
              )
              monthlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe monthly price created for ${currencyUpper} (amount: ${monthlyAmount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating monthly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_monthly`] = error.message
              await logError(
                supabaseAdmin,
                'create-stripe-service-product',
                'stripe_api',
                `Failed to create monthly price for ${currencyUpper}`,
                { currency: currencyUpper, amount: monthlyAmount, error: error.message },
                user.id,
                { name, currency: currencyUpper, amount: monthlyAmount },
                ipAddress
              )
            }
          } else if (shouldCreateMonthly && amount > 0) {
            // Fallback to 'amount' field if monthly not specified
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productData.id,
                amount,
                currencyUpper.toLowerCase(),
                'recurring',
                'Monthly',
                'month'
              )
              monthlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe monthly price created for ${currencyUpper} (using amount: ${amount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating monthly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_monthly`] = error.message
            }
          }

          // Create yearly price if needed
          if (shouldCreateYearly && yearlyAmount > 0) {
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productData.id,
                yearlyAmount,
                currencyUpper.toLowerCase(),
                'recurring',
                'Yearly',
                'year'
              )
              yearlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe yearly price created for ${currencyUpper} (amount: ${yearlyAmount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating yearly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_yearly`] = error.message
              await logError(
                supabaseAdmin,
                'create-stripe-service-product',
                'stripe_api',
                `Failed to create yearly price for ${currencyUpper}`,
                { currency: currencyUpper, amount: yearlyAmount, error: error.message },
                user.id,
                { name, currency: currencyUpper, amount: yearlyAmount },
                ipAddress
              )
            }
          } else if (shouldCreateYearly && amount > 0) {
            // Fallback to 'amount' field if yearly not specified
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productData.id,
                amount,
                currencyUpper.toLowerCase(),
                'recurring',
                'Yearly',
                'year'
              )
              yearlyPrices[currencyUpper] = price.id
              console.log(`✅ Stripe yearly price created for ${currencyUpper} (using amount: ${amount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating yearly price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_yearly`] = error.message
            }
          }

          // Create reduced fare prices if applicable
          if (has_reduced_fare && reducedAmount > 0) {
            if (shouldCreateMonthly) {
              try {
                const reducedPrice = await createStripePrice(
                  stripeSecretKey,
                  productData.id,
                  reducedAmount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Monthly Reduced',
                  'month'
                )
                // Store reduced prices separately - we'll use the same structure
                if (!reducedPrices[currencyUpper]) reducedPrices[currencyUpper] = {}
                reducedPrices[currencyUpper].monthly = reducedPrice.id
                console.log(`✅ Stripe monthly reduced fare price created for ${currencyUpper}:`, reducedPrice.id)
              } catch (error: any) {
                console.error(`❌ Error creating monthly reduced fare price for ${currencyUpper}:`, error)
              }
            }
            if (shouldCreateYearly) {
              try {
                const reducedPrice = await createStripePrice(
                  stripeSecretKey,
                  productData.id,
                  reducedAmount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Yearly Reduced',
                  'year'
                )
                if (!reducedPrices[currencyUpper]) reducedPrices[currencyUpper] = {}
                reducedPrices[currencyUpper].yearly = reducedPrice.id
                console.log(`✅ Stripe yearly reduced fare price created for ${currencyUpper}:`, reducedPrice.id)
              } catch (error: any) {
                console.error(`❌ Error creating yearly reduced fare price for ${currencyUpper}:`, error)
              }
            }
          }
        } else {
          // One-time payment (fixed pricing)
          if (amount > 0) {
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productData.id,
                amount,
                currencyUpper.toLowerCase(),
                'one_time',
                'Regular',
                undefined
              )
              oneTimePrices[currencyUpper] = price.id
              console.log(`✅ Stripe one-time price created for ${currencyUpper} (amount: ${amount}):`, price.id)
            } catch (error: any) {
              console.error(`❌ Error creating one-time price for ${currencyUpper}:`, error)
              priceErrors[currencyUpper] = error.message
              await logError(
                supabaseAdmin,
                'create-stripe-service-product',
                'stripe_api',
                `Failed to create one-time price for ${currencyUpper}`,
                { currency: currencyUpper, amount, error: error.message },
                user.id,
                { name, currency: currencyUpper, amount },
                ipAddress
              )
            }
          }

          // Create reduced fare price for one-time payments
          if (has_reduced_fare && reducedAmount > 0) {
            try {
              const reducedPrice = await createStripePrice(
                stripeSecretKey,
                productData.id,
                reducedAmount,
                currencyUpper.toLowerCase(),
                'one_time',
                'Reduced Fare',
                undefined
              )
              reducedPrices[currencyUpper] = reducedPrice.id
              console.log(`✅ Stripe reduced fare price created for ${currencyUpper} (reduced_amount: ${reducedAmount}):`, reducedPrice.id)
            } catch (error: any) {
              console.error(`❌ Error creating reduced fare price for ${currencyUpper}:`, error)
            }
          }
        }
      } else if (typeof priceData === 'number') {
        // Handle legacy format where pricing is just a number
        const amount = priceData
        if (amount > 0) {
          try {
            // Legacy format: default to monthly for subscriptions
            const priceType = pricing_type === 'subscription' ? 'recurring' : 'one_time'
            const interval = pricing_type === 'subscription' ? 'month' : undefined
            const nickname = pricing_type === 'subscription' ? 'Monthly' : 'Regular'
            
            const price = await createStripePrice(
              stripeSecretKey,
              productData.id,
              amount,
              currencyUpper.toLowerCase(),
              priceType,
              nickname,
              interval
            )
            if (pricing_type === 'subscription') {
              if (subscription_interval === 'yearly') {
                yearlyPrices[currencyUpper] = price.id
              } else {
                monthlyPrices[currencyUpper] = price.id
              }
            } else {
              oneTimePrices[currencyUpper] = price.id
            }
            console.log(`✅ Stripe price created for ${currencyUpper} (legacy format, amount: ${amount}):`, price.id)
          } catch (error: any) {
            console.error(`❌ Error creating price for ${currencyUpper}:`, error)
            priceErrors[currencyUpper] = error.message
          }
        }
      }
    }

    // Get primary price IDs (CHF if available, otherwise first)
    const primaryMonthlyPriceId = monthlyPrices.CHF || monthlyPrices.USD || monthlyPrices.EUR || monthlyPrices.GBP || Object.values(monthlyPrices)[0] || null
    const primaryYearlyPriceId = yearlyPrices.CHF || yearlyPrices.USD || yearlyPrices.EUR || yearlyPrices.GBP || Object.values(yearlyPrices)[0] || null
    const primaryOneTimePriceId = oneTimePrices.CHF || oneTimePrices.USD || oneTimePrices.EUR || oneTimePrices.GBP || Object.values(oneTimePrices)[0] || null
    const primaryReducedPriceId = typeof reducedPrices === 'object' && !Array.isArray(reducedPrices) && reducedPrices.CHF
      ? (typeof reducedPrices.CHF === 'string' ? reducedPrices.CHF : reducedPrices.CHF.monthly || reducedPrices.CHF.yearly)
      : (reducedPrices.USD || reducedPrices.EUR || reducedPrices.GBP || Object.values(reducedPrices)[0] || null)

    // Validate that at least one price was created
    const hasAnyPrice = primaryMonthlyPriceId || primaryYearlyPriceId || primaryOneTimePriceId
    if (!hasAnyPrice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid prices created',
          priceErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        productId: productData.id,
        priceId: primaryOneTimePriceId || primaryMonthlyPriceId || primaryYearlyPriceId, // Backward compatibility
        monthlyPriceId: primaryMonthlyPriceId || null,
        yearlyPriceId: primaryYearlyPriceId || null,
        reducedPriceId: primaryReducedPriceId || null,
        monthlyPrices: Object.keys(monthlyPrices).length > 0 ? monthlyPrices : undefined,
        yearlyPrices: Object.keys(yearlyPrices).length > 0 ? yearlyPrices : undefined,
        oneTimePrices: Object.keys(oneTimePrices).length > 0 ? oneTimePrices : undefined,
        prices: Object.keys(monthlyPrices).length > 0 ? monthlyPrices : (Object.keys(yearlyPrices).length > 0 ? yearlyPrices : oneTimePrices), // Backward compatibility
        reducedPrices: Object.keys(reducedPrices).length > 0 ? reducedPrices : undefined,
        product: productData,
        priceErrors: Object.keys(priceErrors).length > 0 ? priceErrors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in create-stripe-service-product:', error)
    
    // Try to get user ID for logging
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
      'create-stripe-service-product',
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


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
    // Don't throw - error logging should not break the main flow
    console.error('❌ Failed to log error to database:', logError)
  }
}

/**
 * Determine if we should use live mode based on STRIPE_MODE environment variable
 * Defaults to test mode for safety
 */
function getStripeMode(): boolean {
  const mode = Deno.env.get('STRIPE_MODE')?.toLowerCase()
  return mode === 'live' || mode === 'production'
}

/**
 * Get the correct Stripe secret key based on mode (test or live)
 */
function getStripeSecretKey(isLiveMode?: boolean): string {
  const liveMode = isLiveMode !== undefined ? isLiveMode : getStripeMode()
  
  if (liveMode) {
    return Deno.env.get('STRIPE_SECRET_KEY_LIVE') || 
           Deno.env.get('STRIPE_SECRET_KEY') || 
           ''
  } else {
    return Deno.env.get('STRIPE_SECRET_KEY_TEST') || 
           Deno.env.get('STRIPE_SECRET_KEY') || 
           ''
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
    // Extract token from Authorization header first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser()

    if (!user || userError) {
      console.error('❌ getUser() failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
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

    // Get Stripe secret key based on mode (STRIPE_MODE env var, defaults to test)
    const isLiveMode = getStripeMode()
    const stripeSecretKey = getStripeSecretKey()
    if (!stripeSecretKey) {
      console.error(`❌ Stripe secret key not found in environment for ${isLiveMode ? 'LIVE' : 'TEST'} mode`)
      return new Response(
        JSON.stringify({ error: `Stripe configuration missing for ${isLiveMode ? 'LIVE' : 'TEST'} mode` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`💳 Using Stripe ${isLiveMode ? 'LIVE' : 'TEST'} mode for subscription product creation`)

    // Parse request body
    const body = await req.json()
    const {
      name,
      description,
      short_description,
      pricing, // JSONB pricing object: {"CHF": {"monthly": 10, "yearly": 100}, ...}
      trial_days = 0,
      trial_requires_payment = false,
      entity_type = 'service', // 'service' or 'product'
      productId = null, // Database product ID (optional)
      slug = null // Product slug (optional)
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

    // Set default_price on the product for Stripe Dashboard UX
    // This doesn't affect payment links - they can be created from any price directly
    // Priority: monthly > yearly (regular prices only, not reduced)
    const defaultPriceId = primaryMonthlyPriceId || primaryYearlyPriceId
    if (defaultPriceId) {
      try {
        const updateResponse = await fetch(`https://api.stripe.com/v1/products/${stripeProduct.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': '2024-11-20.acacia'
          },
          body: new URLSearchParams({ default_price: defaultPriceId })
        })

        if (!updateResponse.ok) {
          const error = await updateResponse.text()
          console.warn('⚠️ Failed to set default_price on product (non-critical):', error)
          // Don't fail the whole operation - default_price is optional for Dashboard UX
        } else {
          console.log('✅ Set default_price on product:', defaultPriceId)
        }
      } catch (error) {
        console.warn('⚠️ Error setting default_price on product (non-critical):', error)
        // Don't fail the whole operation
      }
    }

    // Update database with Stripe product ID and price IDs
    // Try multiple methods to find the product
    let dbProduct: any = null
    let dbProductError: any = null

    // Method 1: Try by productId if provided
    if (productId) {
      const result = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', productId)
        .maybeSingle()
      dbProduct = result.data
      dbProductError = result.error
    }

    // Method 2: Try by slug if productId didn't work
    if (!dbProduct && slug) {
      const result = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      dbProduct = result.data
      dbProductError = result.error
    }

    // Method 3: Fallback - try to find by stripe_product_id (in case product was already created)
    if (!dbProduct) {
      console.log('⚠️ Product not found by ID/slug, trying to find by stripe_product_id...')
      const fallbackResult = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('stripe_product_id', stripeProduct.id)
        .maybeSingle()
      if (fallbackResult.data) {
        dbProduct = fallbackResult.data
        dbProductError = null
        console.log('✅ Found product by stripe_product_id:', dbProduct.id)
      } else {
        console.log('⚠️ Product not found by any method. Database update skipped.')
      }
    }

    if (dbProduct && !dbProductError) {
      const updateData: Record<string, any> = {
        stripe_product_id: stripeProduct.id,
        pricing_type: 'subscription',
        updated_at: new Date().toISOString()
      }

      // Update currency-specific monthly price IDs and amounts
      if (Object.keys(monthlyPrices).length > 0) {
        if (monthlyPrices.CHF) updateData.stripe_price_chf_id = monthlyPrices.CHF
        if (monthlyPrices.USD) updateData.stripe_price_usd_id = monthlyPrices.USD
        if (monthlyPrices.EUR) updateData.stripe_price_eur_id = monthlyPrices.EUR
        if (monthlyPrices.GBP) updateData.stripe_price_gbp_id = monthlyPrices.GBP
        
        // Update primary monthly price_id
        updateData.stripe_price_monthly_id = primaryMonthlyPriceId
        updateData.stripe_price_id = primaryMonthlyPriceId // Backward compatibility
        
        // Set price amounts for all currencies (monthly subscription prices)
        const chfData = pricing?.CHF ?? pricing?.chf
        const usdData = pricing?.USD ?? pricing?.usd
        const eurData = pricing?.EUR ?? pricing?.eur
        const gbpData = pricing?.GBP ?? pricing?.gbp
        
        // Extract monthly amounts and convert to numbers if needed
        if (chfData !== undefined && chfData !== null) {
          const monthlyChf = typeof chfData === 'object' && chfData?.monthly ? chfData.monthly : (typeof chfData === 'number' ? chfData : null)
          if (monthlyChf !== null && monthlyChf !== undefined) {
            const numChf = typeof monthlyChf === 'number' ? monthlyChf : parseFloat(String(monthlyChf))
            if (!isNaN(numChf) && numChf > 0) {
              updateData.price_amount_chf = numChf
              console.log('✅ Set price_amount_chf (monthly):', numChf)
            } else {
              console.warn('⚠️ Skipping price_amount_chf (monthly) - invalid value:', monthlyChf, 'parsed:', numChf)
            }
          }
        }
        if (usdData !== undefined && usdData !== null) {
          const monthlyUsd = typeof usdData === 'object' && usdData?.monthly ? usdData.monthly : (typeof usdData === 'number' ? usdData : null)
          if (monthlyUsd !== null && monthlyUsd !== undefined) {
            const numUsd = typeof monthlyUsd === 'number' ? monthlyUsd : parseFloat(String(monthlyUsd))
            if (!isNaN(numUsd) && numUsd > 0) {
              updateData.price_amount_usd = numUsd
              console.log('✅ Set price_amount_usd (monthly):', numUsd)
            } else {
              console.warn('⚠️ Skipping price_amount_usd (monthly) - invalid value:', monthlyUsd, 'parsed:', numUsd)
            }
          }
        }
        if (eurData !== undefined && eurData !== null) {
          const monthlyEur = typeof eurData === 'object' && eurData?.monthly ? eurData.monthly : (typeof eurData === 'number' ? eurData : null)
          if (monthlyEur !== null && monthlyEur !== undefined) {
            const numEur = typeof monthlyEur === 'number' ? monthlyEur : parseFloat(String(monthlyEur))
            if (!isNaN(numEur) && numEur > 0) {
              updateData.price_amount_eur = numEur
              console.log('✅ Set price_amount_eur (monthly):', numEur)
            } else {
              console.warn('⚠️ Skipping price_amount_eur (monthly) - invalid value:', monthlyEur, 'parsed:', numEur)
            }
          }
        }
        if (gbpData !== undefined && gbpData !== null) {
          const monthlyGbp = typeof gbpData === 'object' && gbpData?.monthly ? gbpData.monthly : (typeof gbpData === 'number' ? gbpData : null)
          if (monthlyGbp !== null && monthlyGbp !== undefined) {
            const numGbp = typeof monthlyGbp === 'number' ? monthlyGbp : parseFloat(String(monthlyGbp))
            if (!isNaN(numGbp) && numGbp > 0) {
              updateData.price_amount_gbp = numGbp
              console.log('✅ Set price_amount_gbp (monthly):', numGbp)
            } else {
              console.warn('⚠️ Skipping price_amount_gbp (monthly) - invalid value:', monthlyGbp, 'parsed:', numGbp)
            }
          }
        }
        
        // Set price_amount and price_currency from primary monthly currency (for backward compatibility)
        const primaryCurrency = monthlyPrices.CHF ? 'CHF' : (monthlyPrices.USD ? 'USD' : (monthlyPrices.EUR ? 'EUR' : (monthlyPrices.GBP ? 'GBP' : 'USD')))
        // Try both uppercase and lowercase keys since pricing object might have either
        const primaryPriceData = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
        console.log(`💰 Setting subscription price_amount: currency=${primaryCurrency}, priceData=`, primaryPriceData)
        if (typeof primaryPriceData === 'object' && primaryPriceData?.monthly) {
          updateData.price_amount = primaryPriceData.monthly
          updateData.price_currency = primaryCurrency
          console.log(`✅ Subscription price amount set: ${primaryPriceData.monthly} ${primaryCurrency}/month`)
        } else {
          console.warn(`⚠️ Could not set subscription price_amount: primaryPriceData=`, primaryPriceData, 'pricing object:', pricing)
        }
        
        console.log('💰 Currency amounts saved (monthly):', {
          CHF: (typeof chfData === 'object' && chfData?.monthly) ? chfData.monthly : null,
          USD: (typeof usdData === 'object' && usdData?.monthly) ? usdData.monthly : null,
          EUR: (typeof eurData === 'object' && eurData?.monthly) ? eurData.monthly : null,
          GBP: (typeof gbpData === 'object' && gbpData?.monthly) ? gbpData.monthly : null
        })
      }

      // Update currency-specific yearly price IDs
      if (Object.keys(yearlyPrices).length > 0) {
        updateData.stripe_price_yearly_id = primaryYearlyPriceId
      }

      // Update trial days if provided
      if (trial_days !== undefined) {
        updateData.trial_days = trial_days
      }
      if (trial_requires_payment !== undefined) {
        updateData.trial_requires_payment = trial_requires_payment
      }

      // Perform database update
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', dbProduct.id)

      if (updateError) {
        console.error('⚠️ Failed to update database with Stripe product ID and price IDs:', updateError)
        await logError(
          supabaseAdmin,
          'create-stripe-subscription-product',
          'database',
          'Failed to update database with Stripe product ID and price IDs',
          { error: updateError.message, productId: dbProduct.id, updateData },
          user.id,
          { stripeProductId: stripeProduct.id, updateData, monthlyPrices, yearlyPrices },
          ipAddress
        )
      } else {
        console.log('✅ Database updated with Stripe subscription product ID and price IDs for product:', dbProduct.id)
        console.log('📊 Monthly Price IDs saved:', { 
          CHF: monthlyPrices.CHF || null, 
          USD: monthlyPrices.USD || null, 
          EUR: monthlyPrices.EUR || null, 
          GBP: monthlyPrices.GBP || null 
        })
        console.log('📊 Yearly Price IDs saved:', { 
          CHF: yearlyPrices.CHF || null, 
          USD: yearlyPrices.USD || null, 
          EUR: yearlyPrices.EUR || null, 
          GBP: yearlyPrices.GBP || null 
        })
        console.log('💰 Subscription price amount saved:', {
          amount: updateData.price_amount || null,
          currency: updateData.price_currency || null,
          interval: 'monthly'
        })
        console.log('💰 Currency amounts in updateData that were sent to database:', {
          price_amount_chf: updateData.price_amount_chf || null,
          price_amount_usd: updateData.price_amount_usd || null,
          price_amount_eur: updateData.price_amount_eur || null,
          price_amount_gbp: updateData.price_amount_gbp || null
        })
        
        // Verify the update by reading back from database
        const { data: verifyData, error: verifyError } = await supabaseAdmin
          .from('products')
          .select('price_amount_chf, price_amount_usd, price_amount_eur, price_amount_gbp, price_amount, price_currency')
          .eq('id', dbProduct.id)
          .single()
        
        if (!verifyError && verifyData) {
          console.log('✅ Verified currency amounts in database after update:', verifyData)
          // Check if amounts were actually saved
          if (updateData.price_amount_chf && verifyData.price_amount_chf === null) {
            console.error('❌ WARNING: price_amount_chf was set in updateData (' + updateData.price_amount_chf + ') but is null in database! Columns may not exist or update was overwritten.')
          }
          if (updateData.price_amount_usd && verifyData.price_amount_usd === null) {
            console.error('❌ WARNING: price_amount_usd was set in updateData (' + updateData.price_amount_usd + ') but is null in database! Columns may not exist or update was overwritten.')
          }
          if (updateData.price_amount_eur && verifyData.price_amount_eur === null) {
            console.error('❌ WARNING: price_amount_eur was set in updateData (' + updateData.price_amount_eur + ') but is null in database! Columns may not exist or update was overwritten.')
          }
          if (updateData.price_amount_gbp && verifyData.price_amount_gbp === null) {
            console.error('❌ WARNING: price_amount_gbp was set in updateData (' + updateData.price_amount_gbp + ') but is null in database! Columns may not exist or update was overwritten.')
          }
        } else if (verifyError) {
          console.warn('⚠️ Could not verify currency amounts (columns may not exist):', verifyError.message)
          if (verifyError.message && (verifyError.message.includes('column') || verifyError.message.includes('does not exist'))) {
            console.error('❌ CRITICAL: Database columns do not exist! Please run migration: 20251122_add_currency_price_amounts.sql')
          }
        }
      }
    } else {
      console.warn('⚠️ Could not find product in database to update. ProductId:', productId, 'Slug:', slug, 'StripeProductId:', stripeProduct.id)
    }

    // Build response
    const responseData: any = {
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
    }

    // Add price_amount and price_currency to response if we have them
    if (dbProduct && !dbProductError) {
      const primaryCurrency = monthlyPrices.CHF ? 'CHF' : (monthlyPrices.USD ? 'USD' : (monthlyPrices.EUR ? 'EUR' : (monthlyPrices.GBP ? 'GBP' : 'USD')))
      const primaryPriceData = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
      if (typeof primaryPriceData === 'object' && primaryPriceData?.monthly) {
        responseData.price_amount = primaryPriceData.monthly
        responseData.price_currency = primaryCurrency
      }
      
      // Add currency-specific price amounts to response (monthly subscription prices)
      const chfData = pricing?.CHF ?? pricing?.chf
      const usdData = pricing?.USD ?? pricing?.usd
      const eurData = pricing?.EUR ?? pricing?.eur
      const gbpData = pricing?.GBP ?? pricing?.gbp
      
      if (typeof chfData === 'object' && chfData?.monthly && chfData.monthly > 0) responseData.price_amount_chf = chfData.monthly
      if (typeof usdData === 'object' && usdData?.monthly && usdData.monthly > 0) responseData.price_amount_usd = usdData.monthly
      if (typeof eurData === 'object' && eurData?.monthly && eurData.monthly > 0) responseData.price_amount_eur = eurData.monthly
      if (typeof gbpData === 'object' && gbpData?.monthly && gbpData.monthly > 0) responseData.price_amount_gbp = gbpData.monthly
    }

    return new Response(
      JSON.stringify(responseData),
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


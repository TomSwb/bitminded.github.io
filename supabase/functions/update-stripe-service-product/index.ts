/**
 * Update Stripe Service Product
 * 
 * Updates an existing Stripe product and prices for a service.
 * Can update product name, description, metadata, and create/update prices.
 * 
 * Note: Stripe prices are immutable - we create new prices and deactivate old ones.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
 * Create Stripe price
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
 * Deactivate Stripe price
 */
async function deactivateStripePrice(
  secretKey: string,
  priceId: string
) {
  const response = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-11-20.acacia'
    },
    body: new URLSearchParams({ active: 'false' })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to deactivate price: ${error}`)
  }

  return await response.json()
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
    
    console.log(`💳 Using Stripe ${isLiveMode ? 'LIVE' : 'TEST'} mode for service product update`)

    // Parse request body
    const body = await req.json()
    const {
      productId, // Existing Stripe product ID
      name,
      description,
      short_description,
      pricing, // JSONB pricing object
      has_reduced_fare = false,
      pricing_type = 'fixed',
      trial_days = 0,
      trial_requires_payment = false,
      is_on_sale = false,
      sale_pricing = null, // JSONB sale pricing object (calculated from discount percentage)
      // Old price IDs to deactivate
      old_price_id = null,
      old_monthly_price_id = null,
      old_yearly_price_id = null,
      old_reduced_price_id = null,
      old_sale_price_id = null,
      old_sale_monthly_price_id = null,
      old_sale_yearly_price_id = null,
      // Flag to indicate if only sales changed (optimization)
      only_sales_changed = false,
      // Existing regular price IDs (to return when only sales changed)
      existing_price_id = null,
      existing_monthly_price_id = null,
      existing_yearly_price_id = null
    } = body

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Updating Stripe service product:', { productId, name, pricing_type })

    // Update Stripe product
    const productParams: Record<string, string> = {}
    if (name) productParams.name = name
    if (description || short_description) {
      productParams.description = description || short_description || ''
    }

    // Build metadata
    const metadata: Record<string, string> = {
      entity_type: 'service',
      pricing_type: pricing_type
    }

    // Always include trial period info for subscriptions (even if 0, for clarity)
    if (pricing_type === 'subscription') {
      metadata.trial_days = String(trial_days || 0)
      metadata.trial_requires_payment = String(trial_requires_payment || false)
      metadata.subscription_optimized = 'true' // Add this flag too
    }

    // Add metadata to params
    Object.keys(metadata).forEach((key) => {
      productParams[`metadata[${key}]`] = metadata[key]
    })

    // Update product
    const updateResponse = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-11-20.acacia'
      },
      body: new URLSearchParams(productParams)
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      console.error('❌ Error updating Stripe product:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update Stripe product', details: error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updatedProduct = await updateResponse.json()
    console.log('✅ Stripe product updated:', updatedProduct.id)

    // Optimization: If only sales changed, skip regular price deactivation/recreation
    const deactivatedPrices: string[] = []
    const shouldUpdateRegularPrices = !only_sales_changed
    
    if (shouldUpdateRegularPrices) {
      console.log('🔄 Regular prices changed - will deactivate and recreate them')
      
      // Fetch all active prices for this product from Stripe and deactivate regular prices
      try {
        // Fetch all prices for this product
        const pricesResponse = await fetch(`https://api.stripe.com/v1/prices?product=${productId}&active=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Stripe-Version': '2024-11-20.acacia'
          }
        })

        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json()
          const allPrices = pricesData.data || []
          
          console.log(`📋 Found ${allPrices.length} active price(s) for product ${productId}`)
          
          // Separate regular prices from sale prices (sale prices have "(Sale)" in nickname)
          const regularPrices = allPrices.filter((price: any) => 
            !price.nickname || !price.nickname.toLowerCase().includes('sale')
          )
          
          console.log(`📋 Regular prices to deactivate: ${regularPrices.length}`)
          
          // Deactivate all regular prices (we'll recreate them)
          for (const price of regularPrices) {
            try {
              await deactivateStripePrice(stripeSecretKey, price.id)
              deactivatedPrices.push(price.id)
              const priceType = price.recurring ? `${price.recurring.interval}ly` : 'one-time'
              console.log(`✅ Deactivated old regular price: ${price.id} (${price.currency.toUpperCase()}, ${priceType})`)
            } catch (error: any) {
              console.error(`⚠️ Failed to deactivate old price ${price.id}:`, error.message)
            }
          }
        } else {
          const error = await pricesResponse.text()
          console.error('⚠️ Failed to fetch prices for deactivation:', error)
          // Fallback: try to deactivate the price IDs we were given
          const priceIdsToDeactivate = [
            old_price_id,
            old_monthly_price_id,
            old_yearly_price_id,
            old_reduced_price_id
          ].filter(id => id && typeof id === 'string' && id.trim() !== '')

          for (const oldPriceId of priceIdsToDeactivate) {
            try {
              await deactivateStripePrice(stripeSecretKey, oldPriceId)
              deactivatedPrices.push(oldPriceId)
              console.log(`✅ Deactivated old price (fallback): ${oldPriceId}`)
            } catch (error: any) {
              console.error(`⚠️ Failed to deactivate old price ${oldPriceId}:`, error.message)
            }
          }
        }
      } catch (error: any) {
        console.error('⚠️ Failed to fetch prices for deactivation:', error.message)
        // Fallback: try to deactivate the price IDs we were given
        const priceIdsToDeactivate = [
          old_price_id,
          old_monthly_price_id,
          old_yearly_price_id,
          old_reduced_price_id
        ].filter(id => id && typeof id === 'string' && id.trim() !== '')

        for (const oldPriceId of priceIdsToDeactivate) {
          try {
            await deactivateStripePrice(stripeSecretKey, oldPriceId)
            deactivatedPrices.push(oldPriceId)
            console.log(`✅ Deactivated old price (fallback): ${oldPriceId}`)
          } catch (error: any) {
            console.error(`⚠️ Failed to deactivate old price ${oldPriceId}:`, error.message)
          }
        }
      }
    } else {
      console.log('💰 Only sales changed - skipping regular price deactivation')
    }

    // Always handle sale prices separately
    try {
      const pricesResponse = await fetch(`https://api.stripe.com/v1/prices?product=${productId}&active=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Stripe-Version': '2024-11-20.acacia'
        }
      })

      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json()
        const allPrices = pricesData.data || []
        const salePrices = allPrices.filter((price: any) => 
          price.nickname && price.nickname.toLowerCase().includes('sale')
        )
        
        console.log(`💰 Found ${salePrices.length} sale price(s) to handle`)
        
        // Handle sale prices: deactivate if sale is disabled, or if sale pricing changed
        if (!is_on_sale || !sale_pricing) {
          // Sale is disabled or no sale pricing - deactivate all sale prices
          for (const price of salePrices) {
            try {
              await deactivateStripePrice(stripeSecretKey, price.id)
              deactivatedPrices.push(price.id)
              console.log(`✅ Deactivated old sale price (sale disabled): ${price.id}`)
            } catch (error: any) {
              console.error(`⚠️ Failed to deactivate sale price ${price.id}:`, error.message)
            }
          }
        } else {
          // Sale is enabled - deactivate old sale prices (we'll create new ones)
          for (const price of salePrices) {
            try {
              await deactivateStripePrice(stripeSecretKey, price.id)
              deactivatedPrices.push(price.id)
              console.log(`✅ Deactivated old sale price (updating): ${price.id}`)
            } catch (error: any) {
              console.error(`⚠️ Failed to deactivate sale price ${price.id}:`, error.message)
            }
          }
        }
      } else {
        // Fallback: try to deactivate the sale price IDs we were given
        const salePriceIdsToDeactivate = [
          old_sale_price_id,
          old_sale_monthly_price_id,
          old_sale_yearly_price_id
        ].filter(id => id && typeof id === 'string' && id.trim() !== '')

        for (const oldPriceId of salePriceIdsToDeactivate) {
          try {
            await deactivateStripePrice(stripeSecretKey, oldPriceId)
            deactivatedPrices.push(oldPriceId)
            console.log(`✅ Deactivated old sale price (fallback): ${oldPriceId}`)
          } catch (error: any) {
            console.error(`⚠️ Failed to deactivate sale price ${oldPriceId}:`, error.message)
          }
        }
      }
    } catch (error: any) {
      console.error('⚠️ Failed to fetch sale prices for deactivation:', error.message)
      // Fallback: try to deactivate the sale price IDs we were given
      const salePriceIdsToDeactivate = [
        old_sale_price_id,
        old_sale_monthly_price_id,
        old_sale_yearly_price_id
      ].filter(id => id && typeof id === 'string' && id.trim() !== '')

      for (const oldPriceId of salePriceIdsToDeactivate) {
        try {
          await deactivateStripePrice(stripeSecretKey, oldPriceId)
          deactivatedPrices.push(oldPriceId)
          console.log(`✅ Deactivated old sale price (fallback): ${oldPriceId}`)
        } catch (error: any) {
          console.error(`⚠️ Failed to deactivate sale price ${oldPriceId}:`, error.message)
        }
      }
    }

    // Determine if we need to create new prices
    let hasMonthly = false
    let hasYearly = false
    
    if (pricing_type === 'subscription' && pricing) {
      const firstCurrencyData = Object.values(pricing)[0]
      if (typeof firstCurrencyData === 'object' && firstCurrencyData !== null) {
        const priceObj = firstCurrencyData as { monthly?: number; yearly?: number; [key: string]: any }
        hasMonthly = priceObj.monthly !== undefined && priceObj.monthly > 0
        hasYearly = priceObj.yearly !== undefined && priceObj.yearly > 0
      }
    }

    const shouldCreateMonthly = pricing_type === 'subscription' && (hasMonthly || !hasYearly)
    const shouldCreateYearly = pricing_type === 'subscription' && hasYearly

    // Create new prices if pricing data is provided
    const newMonthlyPrices: Record<string, any> = {}
    const newYearlyPrices: Record<string, any> = {}
    const newOneTimePrices: Record<string, any> = {}
    const newSaleMonthlyPrices: Record<string, any> = {}
    const newSaleYearlyPrices: Record<string, any> = {}
    const newSaleOneTimePrices: Record<string, any> = {}
    const priceErrors: Record<string, string> = {}

    // Only create regular prices if they changed (not if only sales changed)
    if (shouldUpdateRegularPrices && pricing && typeof pricing === 'object' && Object.keys(pricing).length > 0) {
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
          const monthlyAmount = priceObj.monthly || 0
          const yearlyAmount = priceObj.yearly || 0

          if (pricing_type === 'subscription') {
            // Create monthly price if needed
            if (shouldCreateMonthly && monthlyAmount > 0) {
              try {
                const price = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  monthlyAmount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Monthly',
                  'month'
                )
                newMonthlyPrices[currencyUpper] = price.id
                console.log(`✅ New monthly price created for ${currencyUpper}:`, price.id)
              } catch (error: any) {
                console.error(`❌ Error creating monthly price for ${currencyUpper}:`, error)
                priceErrors[`${currencyUpper}_monthly`] = error.message
              }
            } else if (shouldCreateMonthly && amount > 0) {
              try {
                const price = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  amount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Monthly',
                  'month'
                )
                newMonthlyPrices[currencyUpper] = price.id
                console.log(`✅ New monthly price created for ${currencyUpper} (using amount):`, price.id)
              } catch (error: any) {
                priceErrors[`${currencyUpper}_monthly`] = error.message
              }
            }

            // Create yearly price if needed
            if (shouldCreateYearly && yearlyAmount > 0) {
              try {
                const price = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  yearlyAmount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Yearly',
                  'year'
                )
                newYearlyPrices[currencyUpper] = price.id
                console.log(`✅ New yearly price created for ${currencyUpper}:`, price.id)
              } catch (error: any) {
                console.error(`❌ Error creating yearly price for ${currencyUpper}:`, error)
                priceErrors[`${currencyUpper}_yearly`] = error.message
                await logError(
                  supabaseAdmin,
                  'update-stripe-service-product',
                  'stripe_api',
                  `Failed to create yearly price for ${currencyUpper}`,
                  { currency: currencyUpper, amount: yearlyAmount, error: error.message },
                  user.id,
                  { productId, currency: currencyUpper, amount: yearlyAmount },
                  ipAddress
                )
              }
            } else if (shouldCreateYearly && amount > 0) {
              try {
                const price = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  amount,
                  currencyUpper.toLowerCase(),
                  'recurring',
                  'Yearly',
                  'year'
                )
                newYearlyPrices[currencyUpper] = price.id
                console.log(`✅ New yearly price created for ${currencyUpper} (using amount):`, price.id)
              } catch (error: any) {
                priceErrors[`${currencyUpper}_yearly`] = error.message
              }
            }
          } else {
            // One-time payment
            if (amount > 0) {
              try {
                const price = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  amount,
                  currencyUpper.toLowerCase(),
                  'one_time',
                  'Regular',
                  undefined
                )
                newOneTimePrices[currencyUpper] = price.id
                console.log(`✅ New one-time price created for ${currencyUpper}:`, price.id)
              } catch (error: any) {
                priceErrors[currencyUpper] = error.message
                await logError(
                  supabaseAdmin,
                  'update-stripe-service-product',
                  'stripe_api',
                  `Failed to create one-time price for ${currencyUpper}`,
                  { currency: currencyUpper, amount, error: error.message },
                  user.id,
                  { productId, currency: currencyUpper, amount },
                  ipAddress
                )
              }
            }
          }
        }
      }
    }

    // Create sale prices if service is on sale and sale_pricing is provided
    if (is_on_sale && sale_pricing && typeof sale_pricing === 'object' && Object.keys(sale_pricing).length > 0) {
      console.log('💰 Creating/updating sale prices for service on sale')
      
      for (const [currency, salePriceData] of Object.entries(sale_pricing)) {
        const currencyUpper = currency.toUpperCase()
        
        if (typeof salePriceData === 'object' && salePriceData !== null) {
          const salePriceObj = salePriceData as { 
            amount?: number; 
            monthly?: number;
            yearly?: number;
            [key: string]: any;
          }
          
          const saleAmount = salePriceObj.amount || 0
          const saleMonthlyAmount = salePriceObj.monthly || 0
          const saleYearlyAmount = salePriceObj.yearly || 0

          if (pricing_type === 'subscription') {
            // Create monthly sale price
            if (shouldCreateMonthly && (saleMonthlyAmount > 0 || saleAmount > 0)) {
              const amount = saleMonthlyAmount > 0 ? saleMonthlyAmount : saleAmount
              if (amount > 0) {
                try {
                  const salePrice = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    amount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Monthly (Sale)',
                    'month'
                  )
                  newSaleMonthlyPrices[currencyUpper] = salePrice.id
                  console.log(`✅ New monthly sale price created for ${currencyUpper}:`, salePrice.id)
                } catch (error: any) {
                  console.error(`❌ Error creating monthly sale price for ${currencyUpper}:`, error)
                  priceErrors[`${currencyUpper}_sale_monthly`] = error.message
                }
              }
            }

            // Create yearly sale price
            if (shouldCreateYearly && (saleYearlyAmount > 0 || saleAmount > 0)) {
              const amount = saleYearlyAmount > 0 ? saleYearlyAmount : saleAmount
              if (amount > 0) {
                try {
                  const salePrice = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    amount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Yearly (Sale)',
                    'year'
                  )
                  newSaleYearlyPrices[currencyUpper] = salePrice.id
                  console.log(`✅ New yearly sale price created for ${currencyUpper}:`, salePrice.id)
                } catch (error: any) {
                  console.error(`❌ Error creating yearly sale price for ${currencyUpper}:`, error)
                  priceErrors[`${currencyUpper}_sale_yearly`] = error.message
                }
              }
            }
          } else {
            // One-time sale price
            if (saleAmount > 0) {
              try {
                const salePrice = await createStripePrice(
                  stripeSecretKey,
                  productId,
                  saleAmount,
                  currencyUpper.toLowerCase(),
                  'one_time',
                  'Regular (Sale)',
                  undefined
                )
                newSaleOneTimePrices[currencyUpper] = salePrice.id
                console.log(`✅ New one-time sale price created for ${currencyUpper}:`, salePrice.id)
              } catch (error: any) {
                console.error(`❌ Error creating one-time sale price for ${currencyUpper}:`, error)
                priceErrors[`${currencyUpper}_sale`] = error.message
              }
            }
          }
        }
      }
    }

    // Get primary new price IDs (only if prices were created)
    // If only sales changed, use existing price IDs instead
    const primaryMonthlyPriceId = Object.keys(newMonthlyPrices).length > 0 
      ? (newMonthlyPrices.CHF || newMonthlyPrices.USD || newMonthlyPrices.EUR || newMonthlyPrices.GBP || Object.values(newMonthlyPrices)[0] || null)
      : (only_sales_changed ? existing_monthly_price_id : null)
    const primaryYearlyPriceId = Object.keys(newYearlyPrices).length > 0
      ? (newYearlyPrices.CHF || newYearlyPrices.USD || newYearlyPrices.EUR || newYearlyPrices.GBP || Object.values(newYearlyPrices)[0] || null)
      : (only_sales_changed ? existing_yearly_price_id : null)
    const primaryOneTimePriceId = Object.keys(newOneTimePrices).length > 0
      ? (newOneTimePrices.CHF || newOneTimePrices.USD || newOneTimePrices.EUR || newOneTimePrices.GBP || Object.values(newOneTimePrices)[0] || null)
      : (only_sales_changed ? existing_price_id : null)
    const primarySaleMonthlyPriceId = Object.keys(newSaleMonthlyPrices).length > 0
      ? (newSaleMonthlyPrices.CHF || newSaleMonthlyPrices.USD || newSaleMonthlyPrices.EUR || newSaleMonthlyPrices.GBP || Object.values(newSaleMonthlyPrices)[0] || null)
      : null
    const primarySaleYearlyPriceId = Object.keys(newSaleYearlyPrices).length > 0
      ? (newSaleYearlyPrices.CHF || newSaleYearlyPrices.USD || newSaleYearlyPrices.EUR || newSaleYearlyPrices.GBP || Object.values(newSaleYearlyPrices)[0] || null)
      : null
    const primarySaleOneTimePriceId = Object.keys(newSaleOneTimePrices).length > 0
      ? (newSaleOneTimePrices.CHF || newSaleOneTimePrices.USD || newSaleOneTimePrices.EUR || newSaleOneTimePrices.GBP || Object.values(newSaleOneTimePrices)[0] || null)
      : null

    return new Response(
      JSON.stringify({
        success: true,
        productId: updatedProduct.id,
        monthlyPriceId: primaryMonthlyPriceId,
        yearlyPriceId: primaryYearlyPriceId,
        priceId: primaryOneTimePriceId || primaryMonthlyPriceId || primaryYearlyPriceId, // Backward compatibility
        monthlyPrices: Object.keys(newMonthlyPrices).length > 0 ? newMonthlyPrices : undefined,
        yearlyPrices: Object.keys(newYearlyPrices).length > 0 ? newYearlyPrices : undefined,
        oneTimePrices: Object.keys(newOneTimePrices).length > 0 ? newOneTimePrices : undefined,
        // Sale prices
        saleMonthlyPriceId: primarySaleMonthlyPriceId || null,
        saleYearlyPriceId: primarySaleYearlyPriceId || null,
        salePriceId: primarySaleOneTimePriceId || null,
        saleMonthlyPrices: Object.keys(newSaleMonthlyPrices).length > 0 ? newSaleMonthlyPrices : undefined,
        saleYearlyPrices: Object.keys(newSaleYearlyPrices).length > 0 ? newSaleYearlyPrices : undefined,
        saleOneTimePrices: Object.keys(newSaleOneTimePrices).length > 0 ? newSaleOneTimePrices : undefined,
        product: updatedProduct,
        priceErrors: Object.keys(priceErrors).length > 0 ? priceErrors : undefined,
        message: only_sales_changed 
          ? 'Sale prices updated. Regular prices unchanged.' 
          : 'Product updated. New prices created. Old prices deactivated.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error updating Stripe product:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


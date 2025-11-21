/**
 * Update Stripe Product
 * 
 * Updates an existing Stripe product and prices for a product.
 * Can update product name, description, metadata, and create/update prices.
 * Handles sale price creation and updates.
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
      'update-stripe-product',
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
      productId, // Existing Stripe product ID
      name,
      description,
      pricing, // JSONB pricing object (optional - only if updating regular prices)
      pricing_type = 'one_time', // one_time, subscription, freemium
      is_on_sale = false,
      sale_discount_percentage = null, // Discount percentage (0-100)
      // Old price IDs to deactivate
      existing_price_id = null,
      existing_monthly_price_id = null,
      existing_yearly_price_id = null,
      old_sale_price_id = null,
      old_sale_monthly_price_id = null,
      old_sale_yearly_price_id = null,
      // Flag to indicate if only sales changed (optimization)
      only_sales_changed = false
    } = body

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Updating Stripe product:', { productId, name, pricing_type, is_on_sale })

    // Update Stripe product metadata if needed (for sale tracking)
    const productParams: Record<string, string> = {}
    if (name) productParams.name = name
    if (description) productParams.description = description

    // Build metadata
    const metadata: Record<string, string> = {
      entity_type: 'product',
      pricing_type: pricing_type
    }

    // Add sale information to metadata
    if (is_on_sale && sale_discount_percentage !== null) {
      metadata.is_on_sale = 'true'
      metadata.sale_discount_percentage = String(sale_discount_percentage)
    } else {
      metadata.is_on_sale = 'false'
    }

    // Add metadata to params
    Object.keys(metadata).forEach((key) => {
      productParams[`metadata[${key}]`] = metadata[key]
    })

    // Update product if we have changes
    if (Object.keys(productParams).length > 0) {
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
        await logError(
          supabaseAdmin,
          'update-stripe-product',
          'stripe_api',
          'Failed to update Stripe product',
          { stripe_error: error, status: updateResponse.status },
          user.id,
          { productId, name },
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Failed to update Stripe product', details: error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updatedProduct = await updateResponse.json()
      console.log('✅ Stripe product updated:', updatedProduct.id)
    }

    // Handle sale prices
    const deactivatedPrices: string[] = []
    
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
        if (!is_on_sale || sale_discount_percentage === null) {
          // Sale is disabled - deactivate all sale prices
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

    // Create sale prices if product is on sale and we have pricing data
    const newSaleMonthlyPrices: Record<string, any> = {}
    const newSaleYearlyPrices: Record<string, any> = {}
    const newSaleOneTimePrices: Record<string, any> = {}
    const priceErrors: Record<string, string> = {}

    if (is_on_sale && sale_discount_percentage !== null && pricing && typeof pricing === 'object' && Object.keys(pricing).length > 0) {
      console.log('💰 Creating sale prices with discount:', sale_discount_percentage + '%')
      
      const discountMultiplier = 1 - (sale_discount_percentage / 100)

      // Determine if we need monthly/yearly prices
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

      for (const [currency, priceData] of Object.entries(pricing)) {
        const currencyUpper = currency.toUpperCase()
        
        if (typeof priceData === 'object' && priceData !== null) {
          const priceObj = priceData as { 
            amount?: number; 
            monthly?: number;
            yearly?: number;
            [key: string]: any;
          }
          
          const amount = priceObj.amount || 0
          const monthlyAmount = priceObj.monthly || 0
          const yearlyAmount = priceObj.yearly || 0

          if (pricing_type === 'subscription') {
            // Create monthly sale price
            if (shouldCreateMonthly && (monthlyAmount > 0 || amount > 0)) {
              const saleAmount = monthlyAmount > 0 
                ? Math.round(monthlyAmount * discountMultiplier * 100) / 100
                : Math.round(amount * discountMultiplier * 100) / 100
              
              if (saleAmount > 0) {
                try {
                  const salePrice = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    saleAmount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Monthly (Sale)',
                    'month'
                  )
                  newSaleMonthlyPrices[currencyUpper] = salePrice.id
                  console.log(`✅ New monthly sale price created for ${currencyUpper}: ${salePrice.id} (${saleAmount})`)
                } catch (error: any) {
                  console.error(`❌ Error creating monthly sale price for ${currencyUpper}:`, error)
                  priceErrors[`${currencyUpper}_sale_monthly`] = error.message
                  await logError(
                    supabaseAdmin,
                    'update-stripe-product',
                    'stripe_api',
                    `Failed to create monthly sale price for ${currencyUpper}`,
                    { currency: currencyUpper, amount: saleAmount, error: error.message },
                    user.id,
                    { productId, currency: currencyUpper, amount: saleAmount },
                    ipAddress
                  )
                }
              }
            }

            // Create yearly sale price
            if (shouldCreateYearly && (yearlyAmount > 0 || amount > 0)) {
              const saleAmount = yearlyAmount > 0 
                ? Math.round(yearlyAmount * discountMultiplier * 100) / 100
                : Math.round(amount * discountMultiplier * 100) / 100
              
              if (saleAmount > 0) {
                try {
                  const salePrice = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    saleAmount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Yearly (Sale)',
                    'year'
                  )
                  newSaleYearlyPrices[currencyUpper] = salePrice.id
                  console.log(`✅ New yearly sale price created for ${currencyUpper}: ${salePrice.id} (${saleAmount})`)
                } catch (error: any) {
                  console.error(`❌ Error creating yearly sale price for ${currencyUpper}:`, error)
                  priceErrors[`${currencyUpper}_sale_yearly`] = error.message
                  await logError(
                    supabaseAdmin,
                    'update-stripe-product',
                    'stripe_api',
                    `Failed to create yearly sale price for ${currencyUpper}`,
                    { currency: currencyUpper, amount: saleAmount, error: error.message },
                    user.id,
                    { productId, currency: currencyUpper, amount: saleAmount },
                    ipAddress
                  )
                }
              }
            }
          } else if (pricing_type === 'one_time') {
            // One-time sale price
            if (amount > 0) {
              const saleAmount = Math.round(amount * discountMultiplier * 100) / 100
              
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
                console.log(`✅ New one-time sale price created for ${currencyUpper}: ${salePrice.id} (${saleAmount})`)
              } catch (error: any) {
                console.error(`❌ Error creating one-time sale price for ${currencyUpper}:`, error)
                priceErrors[`${currencyUpper}_sale`] = error.message
                await logError(
                  supabaseAdmin,
                  'update-stripe-product',
                  'stripe_api',
                  `Failed to create one-time sale price for ${currencyUpper}`,
                  { currency: currencyUpper, amount: saleAmount, error: error.message },
                  user.id,
                  { productId, currency: currencyUpper, amount: saleAmount },
                  ipAddress
                )
              }
            }
          }
        } else if (typeof priceData === 'number' && priceData > 0) {
          // Simple number format (backward compatibility)
          const saleAmount = Math.round(priceData * discountMultiplier * 100) / 100
          
          if (pricing_type === 'one_time') {
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
              console.log(`✅ New one-time sale price created for ${currencyUpper}: ${salePrice.id} (${saleAmount})`)
            } catch (error: any) {
              console.error(`❌ Error creating one-time sale price for ${currencyUpper}:`, error)
              priceErrors[`${currencyUpper}_sale`] = error.message
            }
          }
        }
      }
    }

    // Get primary sale price IDs
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
        productId: productId,
        // Sale prices
        sale_monthly_price_id: primarySaleMonthlyPriceId || null,
        sale_yearly_price_id: primarySaleYearlyPriceId || null,
        sale_price_id: primarySaleOneTimePriceId || null,
        saleMonthlyPrices: Object.keys(newSaleMonthlyPrices).length > 0 ? newSaleMonthlyPrices : undefined,
        saleYearlyPrices: Object.keys(newSaleYearlyPrices).length > 0 ? newSaleYearlyPrices : undefined,
        saleOneTimePrices: Object.keys(newSaleOneTimePrices).length > 0 ? newSaleOneTimePrices : undefined,
        priceErrors: Object.keys(priceErrors).length > 0 ? priceErrors : undefined,
        message: is_on_sale 
          ? 'Sale prices created/updated successfully.' 
          : 'Sale prices deactivated successfully.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error updating Stripe product:', error)
    
    // Try to log error
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')
      let userId: string | null = null
      
      if (token) {
        try {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
              global: {
                headers: { Authorization: authHeader! },
              },
            }
          )
          const { data: { user } } = await supabaseClient.auth.getUser()
          userId = user?.id || null
        } catch (e) {
          // Ignore auth errors in error logging
        }
      }
      
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                        req.headers.get('cf-connecting-ip') ||
                        req.headers.get('x-real-ip') ||
                        'unknown'
      
      await logError(
        supabaseAdmin,
        'update-stripe-product',
        'other',
        error.message || 'Internal server error',
        { error: error.toString(), stack: error.stack },
        userId,
        null,
        ipAddress
      )
    } catch (logError) {
      console.error('❌ Failed to log error:', logError)
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


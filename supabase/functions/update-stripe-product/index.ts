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

    // Handle regular (non-sale) prices - create new prices if pricing_type changed or pricing provided
    const newMonthlyPrices: Record<string, any> = {}
    const newYearlyPrices: Record<string, any> = {}
    const newOneTimePrices: Record<string, any> = {}
    const regularPriceErrors: Record<string, string> = {}
    
    // Always deactivate old regular prices when pricing_type changes (to avoid orphaned prices)
    const oldPriceIdsToDeactivate = [
      existing_price_id,
      existing_monthly_price_id,
      existing_yearly_price_id
    ].filter(id => id && typeof id === 'string' && id.trim() !== '')
    
    // If changing TO freemium, deactivate all existing prices
    if (pricing_type === 'freemium' && oldPriceIdsToDeactivate.length > 0) {
      console.log('🆓 Changing to freemium - deactivating all existing prices')
      for (const oldPriceId of oldPriceIdsToDeactivate) {
        try {
          await deactivateStripePrice(stripeSecretKey, oldPriceId)
          console.log(`✅ Deactivated old price (freemium): ${oldPriceId}`)
        } catch (error: any) {
          console.error(`⚠️ Failed to deactivate old price ${oldPriceId}:`, error.message)
        }
      }
    }
    
    // Check if we need to create regular prices (not freemium and pricing provided)
    if (pricing_type !== 'freemium' && pricing && typeof pricing === 'object' && Object.keys(pricing).length > 0) {
      console.log('💰 Creating regular prices for pricing_type:', pricing_type)
      
      // Deactivate old regular prices if they exist (when changing between one_time/subscription)
      if (oldPriceIdsToDeactivate.length > 0) {
        for (const oldPriceId of oldPriceIdsToDeactivate) {
          try {
            await deactivateStripePrice(stripeSecretKey, oldPriceId)
            console.log(`✅ Deactivated old regular price: ${oldPriceId}`)
          } catch (error: any) {
            console.error(`⚠️ Failed to deactivate old price ${oldPriceId}:`, error.message)
          }
        }
      }
      
      // Determine if we need monthly/yearly prices for subscriptions
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
      
      // Create regular prices
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
            // Create monthly price
            if (shouldCreateMonthly && (monthlyAmount > 0 || amount > 0)) {
              const finalAmount = monthlyAmount > 0 ? monthlyAmount : amount
              if (finalAmount > 0) {
                try {
                  const price = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    finalAmount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Monthly',
                    'month'
                  )
                  newMonthlyPrices[currencyUpper] = price.id
                  console.log(`✅ New monthly price created for ${currencyUpper}: ${price.id} (${finalAmount})`)
                } catch (error: any) {
                  console.error(`❌ Error creating monthly price for ${currencyUpper}:`, error)
                  regularPriceErrors[`${currencyUpper}_monthly`] = error.message
                }
              }
            }
            
            // Create yearly price
            if (shouldCreateYearly && (yearlyAmount > 0 || amount > 0)) {
              const finalAmount = yearlyAmount > 0 ? yearlyAmount : (amount * 12 * 0.9) // Default yearly calculation
              if (finalAmount > 0) {
                try {
                  const price = await createStripePrice(
                    stripeSecretKey,
                    productId,
                    finalAmount,
                    currencyUpper.toLowerCase(),
                    'recurring',
                    'Yearly',
                    'year'
                  )
                  newYearlyPrices[currencyUpper] = price.id
                  console.log(`✅ New yearly price created for ${currencyUpper}: ${price.id} (${finalAmount})`)
                } catch (error: any) {
                  console.error(`❌ Error creating yearly price for ${currencyUpper}:`, error)
                  regularPriceErrors[`${currencyUpper}_yearly`] = error.message
                }
              }
            }
          } else if (pricing_type === 'one_time') {
            // One-time price
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
                console.log(`✅ New one-time price created for ${currencyUpper}: ${price.id} (${amount})`)
              } catch (error: any) {
                console.error(`❌ Error creating one-time price for ${currencyUpper}:`, error)
                regularPriceErrors[`${currencyUpper}`] = error.message
              }
            }
          }
        } else if (typeof priceData === 'number' && priceData > 0) {
          // Simple number format (backward compatibility)
          if (pricing_type === 'one_time') {
            try {
              const price = await createStripePrice(
                stripeSecretKey,
                productId,
                priceData,
                currencyUpper.toLowerCase(),
                'one_time',
                'Regular',
                undefined
              )
              newOneTimePrices[currencyUpper] = price.id
              console.log(`✅ New one-time price created for ${currencyUpper}: ${price.id} (${priceData})`)
            } catch (error: any) {
              console.error(`❌ Error creating one-time price for ${currencyUpper}:`, error)
              regularPriceErrors[`${currencyUpper}`] = error.message
            }
          }
        }
      }
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

    // Get primary regular price IDs
    const primaryMonthlyPriceId = Object.keys(newMonthlyPrices).length > 0 
      ? (newMonthlyPrices.CHF || newMonthlyPrices.USD || newMonthlyPrices.EUR || newMonthlyPrices.GBP || Object.values(newMonthlyPrices)[0] || null)
      : null
    const primaryYearlyPriceId = Object.keys(newYearlyPrices).length > 0
      ? (newYearlyPrices.CHF || newYearlyPrices.USD || newYearlyPrices.EUR || newYearlyPrices.GBP || Object.values(newYearlyPrices)[0] || null)
      : null
    const primaryOneTimePriceId = Object.keys(newOneTimePrices).length > 0
      ? (newOneTimePrices.CHF || newOneTimePrices.USD || newOneTimePrices.EUR || newOneTimePrices.GBP || Object.values(newOneTimePrices)[0] || null)
      : null

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

    // Combine all price errors
    const allPriceErrors = { ...regularPriceErrors, ...priceErrors }

    // Update database with new price IDs
    // Find the product in database by Stripe product ID
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('stripe_product_id', productId)
      .single()

    if (!productError && productData) {
      const updateData: Record<string, any> = {
        pricing_type: pricing_type,
        updated_at: new Date().toISOString()
      }

      // Update currency-specific one-time price IDs and amounts
      if (Object.keys(newOneTimePrices).length > 0) {
        if (newOneTimePrices.CHF) updateData.stripe_price_chf_id = newOneTimePrices.CHF
        if (newOneTimePrices.USD) updateData.stripe_price_usd_id = newOneTimePrices.USD
        if (newOneTimePrices.EUR) updateData.stripe_price_eur_id = newOneTimePrices.EUR
        if (newOneTimePrices.GBP) updateData.stripe_price_gbp_id = newOneTimePrices.GBP
        
        // Update primary price_id and price_amount/currency for backward compatibility
        updateData.stripe_price_id = primaryOneTimePriceId
        
        // Set price amounts for all currencies
        const chfAmount = pricing?.CHF ?? pricing?.chf
        const usdAmount = pricing?.USD ?? pricing?.usd
        const eurAmount = pricing?.EUR ?? pricing?.eur
        const gbpAmount = pricing?.GBP ?? pricing?.gbp
        
        // Convert to numbers if needed and set in updateData
        if (chfAmount !== undefined && chfAmount !== null) {
          const numChf = typeof chfAmount === 'number' ? chfAmount : parseFloat(String(chfAmount))
          if (!isNaN(numChf) && numChf > 0) {
            updateData.price_amount_chf = numChf
            console.log('✅ Set price_amount_chf:', numChf)
          } else {
            console.warn('⚠️ Skipping price_amount_chf - invalid value:', chfAmount, 'parsed:', numChf)
          }
        }
        if (usdAmount !== undefined && usdAmount !== null) {
          const numUsd = typeof usdAmount === 'number' ? usdAmount : parseFloat(String(usdAmount))
          if (!isNaN(numUsd) && numUsd > 0) {
            updateData.price_amount_usd = numUsd
            console.log('✅ Set price_amount_usd:', numUsd)
          } else {
            console.warn('⚠️ Skipping price_amount_usd - invalid value:', usdAmount, 'parsed:', numUsd)
          }
        }
        if (eurAmount !== undefined && eurAmount !== null) {
          const numEur = typeof eurAmount === 'number' ? eurAmount : parseFloat(String(eurAmount))
          if (!isNaN(numEur) && numEur > 0) {
            updateData.price_amount_eur = numEur
            console.log('✅ Set price_amount_eur:', numEur)
          } else {
            console.warn('⚠️ Skipping price_amount_eur - invalid value:', eurAmount, 'parsed:', numEur)
          }
        }
        if (gbpAmount !== undefined && gbpAmount !== null) {
          const numGbp = typeof gbpAmount === 'number' ? gbpAmount : parseFloat(String(gbpAmount))
          if (!isNaN(numGbp) && numGbp > 0) {
            updateData.price_amount_gbp = numGbp
            console.log('✅ Set price_amount_gbp:', numGbp)
          } else {
            console.warn('⚠️ Skipping price_amount_gbp - invalid value:', gbpAmount, 'parsed:', numGbp)
          }
        }
        
        // Set price_amount and price_currency from primary currency (for backward compatibility)
        const primaryCurrency = newOneTimePrices.CHF ? 'CHF' : (newOneTimePrices.USD ? 'USD' : (newOneTimePrices.EUR ? 'EUR' : (newOneTimePrices.GBP ? 'GBP' : 'USD')))
        const primaryPriceData = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
        if (typeof primaryPriceData === 'number') {
          updateData.price_amount = primaryPriceData
          updateData.price_currency = primaryCurrency
        } else if (typeof primaryPriceData === 'object' && primaryPriceData?.amount) {
          updateData.price_amount = primaryPriceData.amount
          updateData.price_currency = primaryCurrency
        }
      }

      // Update currency-specific monthly price IDs and amounts (for subscriptions)
      if (Object.keys(newMonthlyPrices).length > 0) {
        updateData.stripe_price_monthly_id = primaryMonthlyPriceId
        // For subscriptions, store monthly price in currency-specific fields
        if (newMonthlyPrices.CHF) updateData.stripe_price_chf_id = newMonthlyPrices.CHF
        if (newMonthlyPrices.USD) updateData.stripe_price_usd_id = newMonthlyPrices.USD
        if (newMonthlyPrices.EUR) updateData.stripe_price_eur_id = newMonthlyPrices.EUR
        if (newMonthlyPrices.GBP) updateData.stripe_price_gbp_id = newMonthlyPrices.GBP
        
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
        
        // Set price_amount and price_currency from primary currency (for backward compatibility)
        const primaryCurrency = newMonthlyPrices.CHF ? 'CHF' : (newMonthlyPrices.USD ? 'USD' : (newMonthlyPrices.EUR ? 'EUR' : (newMonthlyPrices.GBP ? 'GBP' : 'USD')))
        const primaryPriceData = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
        if (typeof primaryPriceData === 'object' && primaryPriceData?.monthly) {
          updateData.price_amount = primaryPriceData.monthly
          updateData.price_currency = primaryCurrency
        }
      }

      // Update currency-specific yearly price IDs (for subscriptions)
      if (Object.keys(newYearlyPrices).length > 0) {
        updateData.stripe_price_yearly_id = primaryYearlyPriceId
      }

      // Update sale price IDs if they exist
      if (primarySaleOneTimePriceId) {
        updateData.stripe_price_sale_id = primarySaleOneTimePriceId
      }
      if (primarySaleMonthlyPriceId) {
        updateData.stripe_price_monthly_sale_id = primarySaleMonthlyPriceId
      }
      if (primarySaleYearlyPriceId) {
        updateData.stripe_price_yearly_sale_id = primarySaleYearlyPriceId
      }

      // Update currency-specific sale price amounts
      if (is_on_sale && sale_discount_percentage !== null && pricing && typeof pricing === 'object') {
        const discountMultiplier = 1 - (sale_discount_percentage / 100)
        
        // Calculate sale prices for one-time products
        if (pricing_type === 'one_time') {
          const chfAmount = pricing?.CHF ?? pricing?.chf
          const usdAmount = pricing?.USD ?? pricing?.usd
          const eurAmount = pricing?.EUR ?? pricing?.eur
          const gbpAmount = pricing?.GBP ?? pricing?.gbp
          
          if (chfAmount !== undefined && chfAmount !== null) {
            const numChf = typeof chfAmount === 'number' ? chfAmount : parseFloat(String(chfAmount))
            if (!isNaN(numChf) && numChf > 0) {
              updateData.sale_price_amount_chf = Math.round(numChf * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_chf:', updateData.sale_price_amount_chf)
            }
          }
          if (usdAmount !== undefined && usdAmount !== null) {
            const numUsd = typeof usdAmount === 'number' ? usdAmount : parseFloat(String(usdAmount))
            if (!isNaN(numUsd) && numUsd > 0) {
              updateData.sale_price_amount_usd = Math.round(numUsd * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_usd:', updateData.sale_price_amount_usd)
            }
          }
          if (eurAmount !== undefined && eurAmount !== null) {
            const numEur = typeof eurAmount === 'number' ? eurAmount : parseFloat(String(eurAmount))
            if (!isNaN(numEur) && numEur > 0) {
              updateData.sale_price_amount_eur = Math.round(numEur * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_eur:', updateData.sale_price_amount_eur)
            }
          }
          if (gbpAmount !== undefined && gbpAmount !== null) {
            const numGbp = typeof gbpAmount === 'number' ? gbpAmount : parseFloat(String(gbpAmount))
            if (!isNaN(numGbp) && numGbp > 0) {
              updateData.sale_price_amount_gbp = Math.round(numGbp * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_gbp:', updateData.sale_price_amount_gbp)
            }
          }
        } else if (pricing_type === 'subscription') {
          // For subscriptions, calculate monthly sale prices
          const chfData = pricing?.CHF ?? pricing?.chf
          const usdData = pricing?.USD ?? pricing?.usd
          const eurData = pricing?.EUR ?? pricing?.eur
          const gbpData = pricing?.GBP ?? pricing?.gbp
          
          if (chfData !== undefined && chfData !== null) {
            const monthlyChf = typeof chfData === 'object' && chfData?.monthly ? chfData.monthly : (typeof chfData === 'number' ? chfData : null)
            if (monthlyChf !== null && monthlyChf !== undefined && !isNaN(monthlyChf) && monthlyChf > 0) {
              updateData.sale_price_amount_chf = Math.round(monthlyChf * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_chf (monthly):', updateData.sale_price_amount_chf)
            }
          }
          if (usdData !== undefined && usdData !== null) {
            const monthlyUsd = typeof usdData === 'object' && usdData?.monthly ? usdData.monthly : (typeof usdData === 'number' ? usdData : null)
            if (monthlyUsd !== null && monthlyUsd !== undefined && !isNaN(monthlyUsd) && monthlyUsd > 0) {
              updateData.sale_price_amount_usd = Math.round(monthlyUsd * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_usd (monthly):', updateData.sale_price_amount_usd)
            }
          }
          if (eurData !== undefined && eurData !== null) {
            const monthlyEur = typeof eurData === 'object' && eurData?.monthly ? eurData.monthly : (typeof eurData === 'number' ? eurData : null)
            if (monthlyEur !== null && monthlyEur !== undefined && !isNaN(monthlyEur) && monthlyEur > 0) {
              updateData.sale_price_amount_eur = Math.round(monthlyEur * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_eur (monthly):', updateData.sale_price_amount_eur)
            }
          }
          if (gbpData !== undefined && gbpData !== null) {
            const monthlyGbp = typeof gbpData === 'object' && gbpData?.monthly ? gbpData.monthly : (typeof gbpData === 'number' ? gbpData : null)
            if (monthlyGbp !== null && monthlyGbp !== undefined && !isNaN(monthlyGbp) && monthlyGbp > 0) {
              updateData.sale_price_amount_gbp = Math.round(monthlyGbp * discountMultiplier * 100) / 100
              console.log('✅ Set sale_price_amount_gbp (monthly):', updateData.sale_price_amount_gbp)
            }
          }
        }
      } else if (!is_on_sale) {
        // Clear sale price amounts when sale is disabled
        updateData.sale_price_amount_chf = null
        updateData.sale_price_amount_usd = null
        updateData.sale_price_amount_eur = null
        updateData.sale_price_amount_gbp = null
      }

      // Update is_on_sale flag
      updateData.is_on_sale = is_on_sale
      if (is_on_sale && sale_discount_percentage !== null) {
        updateData.sale_discount_percentage = sale_discount_percentage
      } else if (!is_on_sale) {
        updateData.sale_discount_percentage = null
      }

      // Perform database update
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', productData.id)

      if (updateError) {
        console.error('⚠️ Failed to update database with price IDs:', updateError)
        console.error('⚠️ Update error details:', JSON.stringify(updateError, null, 2))
        // Check if error is about missing columns
        if (updateError.message && (updateError.message.includes('column') || updateError.message.includes('does not exist'))) {
          console.error('❌ CRITICAL: Database columns may not exist! Please run migration: 20251122_add_currency_price_amounts.sql')
          console.error('❌ Error message:', updateError.message)
        }
        await logError(
          supabaseAdmin,
          'update-stripe-product',
          'database',
          'Failed to update database with price IDs',
          { error: updateError.message, productId: productData.id, updateData },
          user.id,
          { productId, updateData },
          ipAddress
        )
      } else {
        console.log('✅ Database updated with price IDs for product:', productData.id)
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
          .eq('id', productData.id)
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
    } else if (productError) {
      console.error('⚠️ Failed to find product in database:', productError)
      // Don't fail the request - Stripe update was successful
    }

    // Build response
    const responseData: any = {
        success: true,
        productId: productId,
      // Regular prices
      priceId: primaryOneTimePriceId || null,
      monthlyPriceId: primaryMonthlyPriceId || null,
      yearlyPriceId: primaryYearlyPriceId || null,
      monthlyPrices: Object.keys(newMonthlyPrices).length > 0 ? newMonthlyPrices : undefined,
      yearlyPrices: Object.keys(newYearlyPrices).length > 0 ? newYearlyPrices : undefined,
      oneTimePrices: Object.keys(newOneTimePrices).length > 0 ? newOneTimePrices : undefined,
        // Sale prices
        sale_monthly_price_id: primarySaleMonthlyPriceId || null,
        sale_yearly_price_id: primarySaleYearlyPriceId || null,
        sale_price_id: primarySaleOneTimePriceId || null,
        saleMonthlyPrices: Object.keys(newSaleMonthlyPrices).length > 0 ? newSaleMonthlyPrices : undefined,
        saleYearlyPrices: Object.keys(newSaleYearlyPrices).length > 0 ? newSaleYearlyPrices : undefined,
        saleOneTimePrices: Object.keys(newSaleOneTimePrices).length > 0 ? newSaleOneTimePrices : undefined,
      priceErrors: Object.keys(allPriceErrors).length > 0 ? allPriceErrors : undefined,
      message: (Object.keys(newMonthlyPrices).length > 0 || Object.keys(newYearlyPrices).length > 0 || Object.keys(newOneTimePrices).length > 0)
        ? 'Product and prices updated successfully.'
        : (is_on_sale 
          ? 'Sale prices created/updated successfully.' 
          : 'Product updated successfully.')
    }

    // Add price_amount and price_currency to response if we updated them
    if (productData && !productError) {
      // Check if we have one-time prices (for one_time pricing type)
      if (Object.keys(newOneTimePrices).length > 0) {
        const primaryCurrency = newOneTimePrices.CHF ? 'CHF' : (newOneTimePrices.USD ? 'USD' : (newOneTimePrices.EUR ? 'EUR' : (newOneTimePrices.GBP ? 'GBP' : 'USD')))
        const primaryPriceData = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
        if (typeof primaryPriceData === 'number' && primaryPriceData > 0) {
          responseData.price_amount = primaryPriceData
          responseData.price_currency = primaryCurrency
        }
        
        // Add currency-specific price amounts to response
        const chfAmount = pricing?.CHF ?? pricing?.chf
        const usdAmount = pricing?.USD ?? pricing?.usd
        const eurAmount = pricing?.EUR ?? pricing?.eur
        const gbpAmount = pricing?.GBP ?? pricing?.gbp
        
        if (typeof chfAmount === 'number' && chfAmount > 0) responseData.price_amount_chf = chfAmount
        if (typeof usdAmount === 'number' && usdAmount > 0) responseData.price_amount_usd = usdAmount
        if (typeof eurAmount === 'number' && eurAmount > 0) responseData.price_amount_eur = eurAmount
        if (typeof gbpAmount === 'number' && gbpAmount > 0) responseData.price_amount_gbp = gbpAmount
      }
      // Check if we have monthly prices (for subscription pricing type)
      else if (Object.keys(newMonthlyPrices).length > 0) {
        const primaryCurrency = newMonthlyPrices.CHF ? 'CHF' : (newMonthlyPrices.USD ? 'USD' : (newMonthlyPrices.EUR ? 'EUR' : (newMonthlyPrices.GBP ? 'GBP' : 'USD')))
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
    }

    return new Response(
      JSON.stringify(responseData),
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


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
    // Extract token from Authorization header first
    const authHeader = req.headers.get('Authorization')
    console.log('🔐 Received Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header. Header value:', authHeader)
      console.error('❌ All request headers:', Object.fromEntries(req.headers.entries()))
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized: Missing or invalid Authorization header',
          details: {
            hasHeader: !!authHeader,
            headerValue: authHeader ? `${authHeader.substring(0, 20)}...` : null,
            startsWithBearer: authHeader?.startsWith('Bearer ') || false
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

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
    // Note: This is a secondary check - getUser() above is the primary authentication
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    // Log detailed error information for debugging
    if (sessionError) {
      console.error('❌ Error checking user_sessions table:', {
        error: sessionError,
        errorCode: sessionError.code,
        errorMessage: sessionError.message,
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token ? token.substring(0, 20) + '...' : null
      })
      
      // If it's a table not found error, continue (table might not exist yet)
      if (sessionError.code === 'PGRST116') {
        console.warn('⚠️ user_sessions table not found, but continuing since getUser() succeeded')
      } else {
        // For other database errors, log but continue (getUser() already verified auth)
        console.warn('⚠️ Session verification warning, but continuing since getUser() succeeded:', sessionError.message)
      }
    }

    // If session doesn't exist but JWT is valid, it's a NEW session (not yet logged)
    // Auto-create the record for future checks and tracking
    if (!sessionData && !sessionError) {
      try {
        console.log('ℹ️ Session not found in user_sessions, auto-creating record...')
        // Decode JWT to get expiration
        const jwtPayload = token.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const expiresAt = new Date(decoded.exp * 1000).toISOString()
        
        const { error: createError } = await supabaseAdmin
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            session_token: token,
            expires_at: expiresAt,
            last_accessed: new Date().toISOString(),
            ip_address: ipAddress
          }, {
            onConflict: 'session_token'
          })
        
        if (createError) {
          console.warn('⚠️ Failed to create user_sessions record:', createError)
          // Continue anyway - JWT validation passed via getUser()
        } else {
          console.log('✅ Auto-created user_sessions record for new session')
        }
      } catch (e) {
        console.warn('⚠️ Error creating user_sessions record:', e)
        // Continue anyway - JWT validation passed via getUser()
      }
    } else if (!sessionData && sessionError) {
      // Session not found AND there was an error
      // Only fail if it's a critical error (not table not found)
      if (sessionError.code !== 'PGRST116') {
        console.error('❌ Critical error checking user_sessions, but getUser() succeeded. Continuing...')
        // Don't return 401 - getUser() already verified the user is authenticated
      }
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

    // Get Stripe secret key based on mode (STRIPE_MODE env var, defaults to test)
    const isLiveMode = getStripeMode()
    const stripeSecretKey = getStripeSecretKey()
    if (!stripeSecretKey) {
      console.error(`❌ Stripe secret key not found in environment for ${isLiveMode ? 'LIVE' : 'TEST'} mode`)
      await logError(
        supabaseAdmin,
        'create-stripe-product',
        'validation',
        `Stripe secret key not configured for ${isLiveMode ? 'LIVE' : 'TEST'} mode`,
        { 
          missing_secret: isLiveMode ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST',
          stripe_mode: isLiveMode ? 'live' : 'test',
          has_legacy_key: !!Deno.env.get('STRIPE_SECRET_KEY')
        },
        user.id,
        { has_auth: true },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: `Stripe configuration missing for ${isLiveMode ? 'LIVE' : 'TEST'} mode` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`💳 Using Stripe ${isLiveMode ? 'LIVE' : 'TEST'} mode for product creation`)

    // Parse request body
    let body: any
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : String(parseError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      pricing, // Multi-currency pricing object: {CHF: 50, USD: 55, EUR: 48, GBP: 42} or nested for subscriptions
      enterprisePrice, // Deprecated, use pricing object instead
      subscriptionInterval,
      subscriptionPrice, // Deprecated, use pricing object instead
      oneTimePrice, // Deprecated, use pricing object instead
      trialDays,
      trialRequiresPayment,
      productId, // Database product ID (optional)
      slug // Product slug (optional, used if productId not provided)
    } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pricingType || !['freemium', 'subscription', 'one_time'].includes(pricingType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid pricing type. Must be freemium, subscription, or one_time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('💳 Creating Stripe product:', { name, pricingType, pricing, hasPricing: !!pricing })

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

    console.log('🔍 Pricing object received:', JSON.stringify(pricing, null, 2))
    console.log('🔍 Pricing object type:', typeof pricing)
    console.log('🔍 Pricing object keys:', pricing ? Object.keys(pricing) : 'null/undefined')

    if (pricing && typeof pricing === 'object') {
      // Multi-currency pricing
      for (const [currency, amount] of Object.entries(pricing)) {
        const currencyUpper = currency.toUpperCase()
        
        // Handle nested pricing structure (for subscriptions: {monthly: X, yearly: Y})
        // or flat structure (for one-time/freemium: X)
        let priceAmount: number | null = null
        
        if (typeof amount === 'number') {
          priceAmount = amount
        } else if (typeof amount === 'object' && amount !== null) {
          // Nested structure - skip for now (handled by subscription function)
          console.log(`⚠️ Skipping nested pricing structure for ${currencyUpper} in create-stripe-product`)
          continue
        } else {
          priceAmount = parseFloat(String(amount))
        }
        
        // Skip if amount is NaN or <= 0
        if (isNaN(priceAmount) || priceAmount <= 0) {
          console.log(`ℹ️ Skipping price creation for ${currencyUpper} (amount: ${priceAmount})`)
          continue
        }
        
        try {
          const priceData = await createStripePrice(
            stripeSecretKey,
            productData.id,
            priceAmount,
            currencyUpper.toLowerCase(),
            priceType,
            priceNickname,
            priceInterval ?? undefined
          )
          prices[currencyUpper] = priceData.id
          console.log(`✅ Stripe price created for ${currencyUpper}:`, priceData.id)
        } catch (error) {
          console.error(`❌ Error creating price for ${currencyUpper}:`, error)
          priceErrors[currencyUpper] = error instanceof Error ? error.message : String(error)
          // Log error but continue with other currencies
          await logError(
            supabaseAdmin,
            'create-stripe-product',
            'stripe_api',
            `Failed to create price for ${currencyUpper}`,
            { 
              currency: currencyUpper,
              amount: priceAmount,
              error: error instanceof Error ? error.message : String(error),
              error_string: String(error)
            },
            user.id,
            { name, pricingType, currency: currencyUpper, amount: priceAmount },
            ipAddress
          )
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
            priceInterval ?? undefined
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
    // For freemium products, this will be null since no prices are created
    const primaryPriceId = prices.CHF || prices.USD || prices.EUR || prices.GBP || Object.values(prices)[0] || null

    // Set default_price on the product for Stripe Dashboard UX
    // This doesn't affect payment links - they can be created from any price directly
    if (primaryPriceId) {
      try {
        const updateResponse = await fetch(`https://api.stripe.com/v1/products/${productData.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': '2024-11-20.acacia'
          },
          body: new URLSearchParams({ default_price: primaryPriceId })
        })

        if (!updateResponse.ok) {
          const error = await updateResponse.text()
          console.warn('⚠️ Failed to set default_price on product (non-critical):', error)
          // Don't fail the whole operation - default_price is optional for Dashboard UX
        } else {
          console.log('✅ Set default_price on product:', primaryPriceId)
        }
      } catch (error) {
        console.warn('⚠️ Error setting default_price on product (non-critical):', error)
        // Don't fail the whole operation
      }
    }

    console.log('✅ Product creation complete:', {
      productId: productData.id,
      pricingType,
      pricesCreated: Object.keys(prices).length,
      primaryPriceId,
      hasPriceErrors: Object.keys(priceErrors).length > 0
    })

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
        .eq('stripe_product_id', productData.id)
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
        stripe_product_id: productData.id,
        pricing_type: pricingType,
        updated_at: new Date().toISOString()
      }

      // Update currency-specific price IDs and amounts
      if (Object.keys(prices).length > 0) {
        if (prices.CHF) updateData.stripe_price_chf_id = prices.CHF
        if (prices.USD) updateData.stripe_price_usd_id = prices.USD
        if (prices.EUR) updateData.stripe_price_eur_id = prices.EUR
        if (prices.GBP) updateData.stripe_price_gbp_id = prices.GBP
        
        // Update primary price_id for backward compatibility
        updateData.stripe_price_id = primaryPriceId
        
        // Set price amounts for all currencies
        // CRITICAL: pricing variable is from the request body, should still be available here
        console.log('🔍 DEBUG: About to extract currency amounts. Pricing variable:', JSON.stringify(pricing, null, 2))
        console.log('🔍 DEBUG: Pricing variable type:', typeof pricing)
        console.log('🔍 DEBUG: Pricing variable is null?', pricing === null)
        console.log('🔍 DEBUG: Pricing variable is undefined?', pricing === undefined)
        
        const chfAmount = pricing?.CHF ?? pricing?.chf
        const usdAmount = pricing?.USD ?? pricing?.usd
        const eurAmount = pricing?.EUR ?? pricing?.eur
        const gbpAmount = pricing?.GBP ?? pricing?.gbp
        
        console.log('🔍 Extracting currency amounts from pricing object:', {
          pricingObject: pricing,
          chfAmount: chfAmount,
          usdAmount: usdAmount,
          eurAmount: eurAmount,
          gbpAmount: gbpAmount,
          chfType: typeof chfAmount,
          usdType: typeof usdAmount,
          eurType: typeof eurAmount,
          gbpType: typeof gbpAmount
        })
        
        // Convert to numbers if needed and set in updateData
        if (chfAmount !== undefined && chfAmount !== null) {
          const numChf = typeof chfAmount === 'number' ? chfAmount : parseFloat(String(chfAmount))
          if (!isNaN(numChf) && numChf > 0) {
            updateData.price_amount_chf = numChf
            console.log('✅ Set price_amount_chf:', numChf)
          } else {
            console.warn('⚠️ Skipping price_amount_chf - invalid value:', chfAmount, 'parsed:', numChf, 'type:', typeof chfAmount)
          }
        }
        if (usdAmount !== undefined && usdAmount !== null) {
          const numUsd = typeof usdAmount === 'number' ? usdAmount : parseFloat(String(usdAmount))
          if (!isNaN(numUsd) && numUsd > 0) {
            updateData.price_amount_usd = numUsd
            console.log('✅ Set price_amount_usd:', numUsd)
          } else {
            console.warn('⚠️ Skipping price_amount_usd - invalid value:', usdAmount, 'parsed:', numUsd, 'type:', typeof usdAmount)
          }
        }
        if (eurAmount !== undefined && eurAmount !== null) {
          const numEur = typeof eurAmount === 'number' ? eurAmount : parseFloat(String(eurAmount))
          if (!isNaN(numEur) && numEur > 0) {
            updateData.price_amount_eur = numEur
            console.log('✅ Set price_amount_eur:', numEur)
          } else {
            console.warn('⚠️ Skipping price_amount_eur - invalid value:', eurAmount, 'parsed:', numEur, 'type:', typeof eurAmount)
          }
        }
        if (gbpAmount !== undefined && gbpAmount !== null) {
          const numGbp = typeof gbpAmount === 'number' ? gbpAmount : parseFloat(String(gbpAmount))
          if (!isNaN(numGbp) && numGbp > 0) {
            updateData.price_amount_gbp = numGbp
            console.log('✅ Set price_amount_gbp:', numGbp)
          } else {
            console.warn('⚠️ Skipping price_amount_gbp - invalid value:', gbpAmount, 'parsed:', numGbp, 'type:', typeof gbpAmount)
          }
        }
        
        // Set price_amount and price_currency from primary currency (for backward compatibility)
        const primaryCurrency = prices.CHF ? 'CHF' : (prices.USD ? 'USD' : (prices.EUR ? 'EUR' : (prices.GBP ? 'GBP' : 'USD')))
        // Try both uppercase and lowercase keys since pricing object might have either
        const primaryPriceAmount = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
        console.log(`💰 Setting price_amount: currency=${primaryCurrency}, amount=${primaryPriceAmount}, type=${typeof primaryPriceAmount}`)
        if (typeof primaryPriceAmount === 'number' && primaryPriceAmount > 0) {
          updateData.price_amount = primaryPriceAmount
          updateData.price_currency = primaryCurrency
          console.log(`✅ Price amount set: ${primaryPriceAmount} ${primaryCurrency}`)
        } else {
          console.warn(`⚠️ Could not set price_amount: primaryPriceAmount=${primaryPriceAmount}, type=${typeof primaryPriceAmount}, pricing object:`, pricing)
        }
        
        console.log('💰 Currency amounts saved:', {
          CHF: chfAmount || null,
          USD: usdAmount || null,
          EUR: eurAmount || null,
          GBP: gbpAmount || null
        })
      }

      // Update trial days if provided
      if (trialDays !== undefined) {
        updateData.trial_days = trialDays
      }
      if (trialRequiresPayment !== undefined) {
        updateData.trial_requires_payment = trialRequiresPayment
      }

      // Perform database update
      console.log('📦 Full updateData being sent to database:', JSON.stringify(updateData, null, 2))
      console.log('🔍 Checking if currency amount columns exist in updateData:', {
        has_price_amount_chf: 'price_amount_chf' in updateData,
        has_price_amount_usd: 'price_amount_usd' in updateData,
        has_price_amount_eur: 'price_amount_eur' in updateData,
        has_price_amount_gbp: 'price_amount_gbp' in updateData
      })
      
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', dbProduct.id)

      if (updateError) {
        console.error('⚠️ Failed to update database with Stripe product ID and price IDs:', updateError)
        console.error('⚠️ Update error details:', JSON.stringify(updateError, null, 2))
        // Check if error is about missing columns
        if (updateError.message && (updateError.message.includes('column') || updateError.message.includes('does not exist'))) {
          console.error('❌ CRITICAL: Database columns may not exist! Please run migration: 20251122_add_currency_price_amounts.sql')
          console.error('❌ Error message:', updateError.message)
        }
        await logError(
          supabaseAdmin,
          'create-stripe-product',
          'database',
          'Failed to update database with Stripe product ID and price IDs',
          { error: updateError.message, productId: dbProduct.id, updateData },
          user.id,
          { stripeProductId: productData.id, updateData, prices },
          ipAddress
        )
      } else {
        console.log('✅ Database updated with Stripe product ID and price IDs for product:', dbProduct.id)
        console.log('📊 Price IDs saved:', { 
          CHF: prices.CHF || null, 
          USD: prices.USD || null, 
          EUR: prices.EUR || null, 
          GBP: prices.GBP || null 
        })
        console.log('💰 Price amount saved:', {
          amount: updateData.price_amount || null,
          currency: updateData.price_currency || null
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
          if (verifyData.price_amount_chf === null && updateData.price_amount_chf) {
            console.error('❌ WARNING: price_amount_chf was set in updateData but is null in database! Columns may not exist.')
          }
          if (verifyData.price_amount_usd === null && updateData.price_amount_usd) {
            console.error('❌ WARNING: price_amount_usd was set in updateData but is null in database! Columns may not exist.')
          }
          if (verifyData.price_amount_eur === null && updateData.price_amount_eur) {
            console.error('❌ WARNING: price_amount_eur was set in updateData but is null in database! Columns may not exist.')
          }
          if (verifyData.price_amount_gbp === null && updateData.price_amount_gbp) {
            console.error('❌ WARNING: price_amount_gbp was set in updateData but is null in database! Columns may not exist.')
          }
        } else if (verifyError) {
          console.warn('⚠️ Could not verify currency amounts (columns may not exist):', verifyError.message)
          if (verifyError.message && verifyError.message.includes('column')) {
            console.error('❌ CRITICAL: Database columns do not exist! Please run migration: 20251122_add_currency_price_amounts.sql')
          }
        }
      }
    } else {
      console.warn('⚠️ Could not find product in database to update. ProductId:', productId, 'Slug:', slug, 'StripeProductId:', productData.id)
    }

    // Build response
    const responseData: any = {
      success: true,
      productId: productData.id,
      priceId: primaryPriceId, // Primary price ID for backward compatibility (null for freemium)
      prices: prices, // All price IDs by currency (empty object for freemium)
      product: productData
    }

    // Add price_amount and price_currency to response if we have them
    if (dbProduct && !dbProductError) {
      const primaryCurrency = prices.CHF ? 'CHF' : (prices.USD ? 'USD' : (prices.EUR ? 'EUR' : (prices.GBP ? 'GBP' : 'USD')))
      const primaryPriceAmount = pricing?.[primaryCurrency] ?? pricing?.[primaryCurrency.toLowerCase()]
      if (typeof primaryPriceAmount === 'number' && primaryPriceAmount > 0) {
        responseData.price_amount = primaryPriceAmount
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

    // Only include priceErrors if there are any
    if (Object.keys(priceErrors).length > 0) {
      responseData.priceErrors = priceErrors
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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


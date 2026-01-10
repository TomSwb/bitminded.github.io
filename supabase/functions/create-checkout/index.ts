/**
 * Create Checkout Edge Function
 * Creates a Stripe Checkout session for products or services
 * Unified function that handles both products and services
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

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
      allowedOrigin = matched
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
 * Get or create Stripe customer for user
 * Checks both product_purchases and service_purchases tables
 */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  supabaseAdmin: any,
  userId: string,
  userEmail: string,
  existingCustomerId?: string
): Promise<string> {
  // If customer ID provided, verify it exists and belongs to user
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId)
      if (customer && !customer.deleted) {
        // Verify customer belongs to this user by checking both purchase tables
        const { data: productPurchase } = await supabaseAdmin
          .from('product_purchases')
          .select('user_id')
          .eq('stripe_customer_id', existingCustomerId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        
        if (productPurchase) {
          return existingCustomerId
        }
        
        const { data: servicePurchase } = await supabaseAdmin
          .from('service_purchases')
          .select('user_id')
          .eq('stripe_customer_id', existingCustomerId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        
        if (servicePurchase) {
          return existingCustomerId
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Could not retrieve existing customer, will create new one:', error.message)
    }
  }

  // Check if user already has a Stripe customer in database (check both tables)
  const { data: productPurchase } = await supabaseAdmin
    .from('product_purchases')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (productPurchase?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(productPurchase.stripe_customer_id)
      if (customer && !customer.deleted) {
        return productPurchase.stripe_customer_id
      }
    } catch (error: any) {
      console.warn('⚠️ Existing customer from product_purchases not found in Stripe, checking service_purchases:', error.message)
    }
  }

  // Check service_purchases table
  const { data: servicePurchase } = await supabaseAdmin
    .from('service_purchases')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (servicePurchase?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(servicePurchase.stripe_customer_id)
      if (customer && !customer.deleted) {
        return servicePurchase.stripe_customer_id
      }
    } catch (error: any) {
      console.warn('⚠️ Existing customer from service_purchases not found in Stripe, creating new one:', error.message)
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      user_id: userId
    }
  })

  return customer.id
}

/**
 * Get Stripe price ID for a product based on currency and interval
 */
async function getProductPriceId(
  product: any,
  currency: string,
  interval?: 'monthly' | 'yearly',
  stripe?: Stripe
): Promise<{ priceId: string | null; currency: string; verified: boolean }> {
  const currencyUpper = currency.toUpperCase()
  
  // If subscription with interval, check interval-specific fields first
  if (interval && (interval === 'monthly' || interval === 'yearly')) {
    const intervalField = interval === 'monthly' ? 'stripe_price_monthly_id' : 'stripe_price_yearly_id'
    const intervalPriceId = product[intervalField]
    
    if (intervalPriceId && stripe) {
      // Verify currency match via Stripe API if possible
      try {
        const price = await stripe.prices.retrieve(intervalPriceId)
        if (price.currency.toLowerCase() === currency.toLowerCase()) {
          return { priceId: intervalPriceId, currency: currencyUpper, verified: true }
        } else {
          console.warn(`⚠️ Interval price (${intervalField}) currency mismatch: expected ${currencyUpper}, got ${price.currency.toUpperCase()}`)
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not verify interval price currency: ${error.message}`)
        // Still use the price ID if verification fails (fallback)
        return { priceId: intervalPriceId, currency: price?.currency?.toUpperCase() || currencyUpper, verified: false }
      }
    }
  }
  
  // Try currency-specific column
  const currencyField = `stripe_price_${currency.toLowerCase()}_id`
  const currencyPriceId = product[currencyField]
  
  if (currencyPriceId) {
    // If subscription, may need to verify interval via Stripe API
    if (interval && stripe) {
      try {
        const price = await stripe.prices.retrieve(currencyPriceId)
        // Verify it's the correct interval if recurring
        if (price.recurring) {
          const priceInterval = price.recurring.interval === 'month' ? 'monthly' : 'yearly'
          if (priceInterval === interval) {
            return { priceId: currencyPriceId, currency: currencyUpper, verified: true }
          } else {
            console.warn(`⚠️ Currency price interval mismatch: expected ${interval}, got ${priceInterval}`)
          }
        } else {
          // One-time price, use it
          return { priceId: currencyPriceId, currency: currencyUpper, verified: true }
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not verify currency price: ${error.message}`)
      }
    } else {
      // No interval required or Stripe API not available, use currency price
      return { priceId: currencyPriceId, currency: currencyUpper, verified: false }
    }
  }
  
  // Fallback to legacy stripe_price_id (usually CHF)
  if (product.stripe_price_id) {
    if (stripe) {
      try {
        const price = await stripe.prices.retrieve(product.stripe_price_id)
        const priceCurrency = price.currency.toUpperCase()
        if (priceCurrency !== currencyUpper) {
          console.warn(`⚠️ Legacy price currency mismatch: expected ${currencyUpper}, got ${priceCurrency}. Using CHF fallback.`)
        }
        return { priceId: product.stripe_price_id, currency: priceCurrency, verified: true }
      } catch (error: any) {
        console.warn(`⚠️ Could not verify legacy price: ${error.message}`)
      }
    }
    return { priceId: product.stripe_price_id, currency: currencyUpper, verified: false }
  }
  
  return { priceId: null, currency: currencyUpper, verified: false }
}

/**
 * Get Stripe price ID for a service based on currency and interval
 */
function getServicePriceId(
  service: any,
  currency: string,
  interval?: 'monthly' | 'yearly'
): { priceId: string | null; currency: string } {
  const currencyUpper = currency.toUpperCase()
  
  // Access JSONB stripe_prices field
  const stripePrices = service.stripe_prices
  
  if (!stripePrices || typeof stripePrices !== 'object') {
    return { priceId: null, currency: currencyUpper }
  }
  
  // Get price for user's currency
  const currencyPrices = stripePrices[currencyUpper]
  
  if (!currencyPrices || typeof currencyPrices !== 'object') {
    // Fallback to CHF if currency not found
    const chfPrices = stripePrices['CHF']
    if (chfPrices && typeof chfPrices === 'object') {
      console.warn(`⚠️ Price not found for ${currencyUpper}, using CHF fallback`)
      const intervalKey = interval || 'regular'
      const priceId = chfPrices[intervalKey] || chfPrices['regular']
      return { priceId: priceId || null, currency: 'CHF' }
    }
    return { priceId: null, currency: currencyUpper }
  }
  
  // Determine interval key
  let intervalKey = 'regular'
  if (interval === 'monthly') {
    intervalKey = 'monthly'
  } else if (interval === 'yearly') {
    intervalKey = 'yearly'
  } else if (service.pricing_type === 'subscription') {
    // Default to monthly if subscription but no interval specified
    intervalKey = 'monthly'
  }
  
  // Try to get price for the interval, fallback to 'regular' if not found
  const priceId = currencyPrices[intervalKey] || currencyPrices['regular']
  
  return { priceId: priceId || null, currency: currencyUpper }
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
    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header', redirect: '/auth?redirect=/checkout' }),
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token', redirect: '/auth?redirect=/checkout' }),
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

    // Rate limiting: 10 requests/minute, 100 requests/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'create-checkout',
      { requestsPerMinute: 10, requestsPerHour: 100, windowMinutes: 60 }
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

    // Get Stripe secret key based on mode
    const isLiveMode = getStripeMode()
    const stripeSecretKey = getStripeSecretKey()
    if (!stripeSecretKey) {
      console.error(`❌ Stripe secret key not found for ${isLiveMode ? 'LIVE' : 'TEST'} mode`)
      await logError(
        supabaseAdmin,
        'create-checkout',
        'validation',
        `Stripe secret key not configured for ${isLiveMode ? 'LIVE' : 'TEST'} mode`,
        { missing_secret: isLiveMode ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST' },
        user.id,
        {},
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    // Parse request body
    let body: any
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { product_id, service_id, interval, currency } = body

    // Validate exactly one of product_id or service_id is provided
    if (!product_id && !service_id) {
      await logError(
        supabaseAdmin,
        'create-checkout',
        'validation',
        'Either product_id or service_id must be provided',
        { body },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Either product_id or service_id must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (product_id && service_id) {
      await logError(
        supabaseAdmin,
        'create-checkout',
        'validation',
        'Both product_id and service_id provided (only one allowed)',
        { product_id, service_id },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Both product_id and service_id provided. Only one is allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate interval if provided
    if (interval && interval !== 'monthly' && interval !== 'yearly') {
      await logError(
        supabaseAdmin,
        'create-checkout',
        'validation',
        'Invalid interval value',
        { interval },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Interval must be "monthly" or "yearly"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's preferred currency from database (default to CHF)
    let userCurrency = 'CHF'
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('preferred_currency')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profileError) {
        console.warn('⚠️ Could not fetch user preferred currency, using CHF:', profileError)
        // Continue with default CHF if query fails (e.g., column doesn't exist yet)
      } else if (profile?.preferred_currency) {
        userCurrency = profile.preferred_currency
      }
    } catch (error) {
      console.warn('⚠️ Error fetching user preferred currency, using CHF:', error)
      // Continue with default CHF if query fails
    }
    
    // Use provided currency if specified, otherwise use user's preference
    const checkoutCurrency = currency || userCurrency

    // Fetch item from appropriate table
    let item: any = null
    let itemType: 'product' | 'service' = 'product'
    let itemSlug: string | undefined

    if (product_id) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name, slug, pricing_type, subscription_interval, stripe_product_id, stripe_price_id, stripe_price_monthly_id, stripe_price_yearly_id, stripe_price_chf_id, stripe_price_usd_id, stripe_price_eur_id, stripe_price_gbp_id')
        .eq('id', product_id)
        .maybeSingle()
      
      if (productError || !product) {
        await logError(
          supabaseAdmin,
          'create-checkout',
          'validation',
          'Product not found',
          { product_id, error: productError },
          user.id,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      item = product
      itemType = 'product'
    } else if (service_id) {
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('services')
        .select('id, name, slug, pricing_type, subscription_interval, payment_method, stripe_product_id, stripe_price_id, stripe_prices')
        .eq('id', service_id)
        .maybeSingle()
      
      if (serviceError || !service) {
        await logError(
          supabaseAdmin,
          'create-checkout',
          'validation',
          'Service not found',
          { service_id, error: serviceError },
          user.id,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Service not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      item = service
      itemType = 'service'
      itemSlug = service.slug
      
      // Validate payment_method for services
      if (service.payment_method === 'bank_transfer') {
        await logError(
          supabaseAdmin,
          'create-checkout',
          'validation',
          'Service does not support Stripe checkout',
          { service_id, payment_method: service.payment_method },
          user.id,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'This service does not support Stripe checkout. Please use the booking form instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (service.payment_method !== 'stripe' && service.payment_method !== 'both') {
        await logError(
          supabaseAdmin,
          'create-checkout',
          'validation',
          'Invalid payment_method for service',
          { service_id, payment_method: service.payment_method },
          user.id,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'This service does not support Stripe checkout' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get Stripe price ID based on item type
    let priceId: string | null = null
    let priceCurrency = checkoutCurrency
    
    if (itemType === 'product') {
      const priceResult = await getProductPriceId(item, checkoutCurrency, interval, stripe)
      priceId = priceResult.priceId
      priceCurrency = priceResult.currency
      
      // Fallback to CHF if price not found for user's currency
      if (!priceId && checkoutCurrency !== 'CHF') {
        console.warn(`⚠️ Price not found for ${checkoutCurrency}, trying CHF fallback`)
        const chfResult = await getProductPriceId(item, 'CHF', interval, stripe)
        priceId = chfResult.priceId
        priceCurrency = chfResult.currency || 'CHF'
      }
    } else {
      // Service
      const priceResult = getServicePriceId(item, checkoutCurrency, interval)
      priceId = priceResult.priceId
      priceCurrency = priceResult.currency
    }

    if (!priceId) {
      await logError(
        supabaseAdmin,
        'create-checkout',
        'validation',
        'Stripe price not found for item',
        { 
          item_type: itemType,
          item_id: item.id,
          currency: checkoutCurrency,
          interval,
          item_pricing_type: item.pricing_type
        },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Pricing not configured for this item. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify price exists in Stripe and get details
    let priceDetails: Stripe.Price | null = null
    try {
      priceDetails = await stripe.prices.retrieve(priceId)
      if (!priceDetails || priceDetails.active === false) {
        throw new Error('Price is not active')
      }
    } catch (error: any) {
      await logError(
        supabaseAdmin,
        'create-checkout',
        'stripe_api',
        'Failed to retrieve Stripe price',
        { price_id: priceId, error: error.message },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Pricing configuration error. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine checkout mode based on pricing type
    const isSubscription = item.pricing_type === 'subscription' || !!priceDetails.recurring
    const checkoutMode: 'payment' | 'subscription' = isSubscription ? 'subscription' : 'payment'

    // Get user email
    const userEmail = user.email || user.user_metadata?.email || `${user.id}@bitminded.ch`

    // Get or create Stripe customer
    let customerId: string
    try {
      customerId = await getOrCreateStripeCustomer(
        stripe,
        supabaseAdmin,
        user.id,
        userEmail
      )
    } catch (error: any) {
      console.error('❌ Error getting/creating Stripe customer:', error)
      await logError(
        supabaseAdmin,
        'create-checkout',
        'stripe_api',
        'Failed to get or create Stripe customer',
        { error: error.message, stack: error.stack },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to create customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get base URL for success/cancel redirects
    const baseUrl = origin || 'https://bitminded.ch'
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`

    // Create Stripe Checkout session
    let session: Stripe.Checkout.Session
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        mode: checkoutMode,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          item_type: itemType,
          item_id: item.id,
          ...(itemSlug && { item_slug: itemSlug })
        },
        allow_promotion_codes: true
      }

      // If subscription, set subscription_data
      if (checkoutMode === 'subscription') {
        sessionParams.subscription_data = {
          metadata: {
            item_type: itemType,
            item_id: item.id,
            ...(itemSlug && { item_slug: itemSlug })
          }
        }
      }

      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (error: any) {
      console.error('❌ Error creating Stripe Checkout session:', error)
      await logError(
        supabaseAdmin,
        'create-checkout',
        'stripe_api',
        'Failed to create Stripe Checkout session',
        { 
          error: error.message, 
          stack: error.stack, 
          price_id: priceId,
          customer_id: customerId,
          mode: checkoutMode
        },
        user.id,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Stripe Checkout session created: ${session.id} for ${itemType} ${item.id}`)

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        item_type: itemType,
        item_id: item.id,
        currency: priceCurrency
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error in create-checkout:', error)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await logError(
      supabaseAdmin,
      'create-checkout',
      'other',
      error.message || 'Unexpected error',
      { error: String(error), stack: error.stack },
      null,
      {},
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

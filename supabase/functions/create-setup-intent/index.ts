/**
 * Create Setup Intent Edge Function
 * Creates a Stripe Setup Intent for collecting payment methods without charging
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
        // Verify customer belongs to this user by checking database
        const { data: purchase } = await supabaseAdmin
          .from('product_purchases')
          .select('user_id')
          .eq('stripe_customer_id', existingCustomerId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        
        if (purchase) {
          return existingCustomerId
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Could not retrieve existing customer, will create new one:', error.message)
    }
  }

  // Check if user already has a Stripe customer in database
  const { data: existingPurchase } = await supabaseAdmin
    .from('product_purchases')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (existingPurchase?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(existingPurchase.stripe_customer_id)
      if (customer && !customer.deleted) {
        return existingPurchase.stripe_customer_id
      }
    } catch (error: any) {
      console.warn('⚠️ Existing customer not found in Stripe, creating new one:', error.message)
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
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }),
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

    // Rate limiting: 10 requests/minute, 100 requests/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'create-setup-intent',
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
        'create-setup-intent',
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
    const body = await req.json().catch(() => ({}))
    const { customer_id: existingCustomerId } = body

    // Get user email
    const userEmail = user.email || user.user_metadata?.email || `${user.id}@bitminded.ch`

    // Get or create Stripe customer
    let customerId: string
    try {
      customerId = await getOrCreateStripeCustomer(
        stripe,
        supabaseAdmin,
        user.id,
        userEmail,
        existingCustomerId
      )
    } catch (error: any) {
      console.error('❌ Error getting/creating Stripe customer:', error)
      await logError(
        supabaseAdmin,
        'create-setup-intent',
        'stripe_api',
        'Failed to get or create Stripe customer',
        { error: error.message, stack: error.stack },
        user.id,
        { existingCustomerId },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to get or create customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Setup Intent
    let setupIntent: Stripe.SetupIntent
    try {
      setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // For future payments
        metadata: {
          user_id: user.id
        }
      })
    } catch (error: any) {
      console.error('❌ Error creating Setup Intent:', error)
      await logError(
        supabaseAdmin,
        'create-setup-intent',
        'stripe_api',
        'Failed to create Setup Intent',
        { error: error.message, stack: error.stack, customerId },
        user.id,
        { customerId },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to create setup intent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        setup_intent_id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        customer_id: customerId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error in create-setup-intent:', error)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await logError(
      supabaseAdmin,
      'create-setup-intent',
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


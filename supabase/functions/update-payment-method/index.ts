/**
 * Update Payment Method Edge Function
 * Updates the default payment method for a customer's subscriptions
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
 * Verify user owns the customer
 */
async function verifyCustomerOwnership(
  supabaseAdmin: any,
  userId: string,
  customerId: string
): Promise<boolean> {
  // Check product_purchases table
  const { data: productPurchase } = await supabaseAdmin
    .from('product_purchases')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (productPurchase) {
    return true
  }

  // Check service_purchases table
  const { data: servicePurchase } = await supabaseAdmin
    .from('service_purchases')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return !!servicePurchase
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
      'update-payment-method',
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
        'update-payment-method',
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
    const { payment_method_id, customer_id } = body

    // Validate required fields
    if (!payment_method_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: payment_method_id and customer_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns the customer
    const ownsCustomer = await verifyCustomerOwnership(supabaseAdmin, user.id, customer_id)
    if (!ownsCustomer) {
      await logError(
        supabaseAdmin,
        'update-payment-method',
        'auth',
        'User attempted to update payment method for customer they do not own',
        { customer_id, user_id: user.id },
        user.id,
        { customer_id, payment_method_id },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this customer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customer_id
      })
    } catch (error: any) {
      // If already attached, that's okay
      if (error.code !== 'resource_already_exists') {
        console.error('❌ Error attaching payment method:', error)
        await logError(
          supabaseAdmin,
          'update-payment-method',
          'stripe_api',
          'Failed to attach payment method',
          { error: error.message, stack: error.stack, payment_method_id, customer_id },
          user.id,
          { payment_method_id, customer_id },
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Failed to attach payment method' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Set as default payment method for customer
    try {
      await stripe.customers.update(customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      })
    } catch (error: any) {
      console.error('❌ Error setting default payment method:', error)
      await logError(
        supabaseAdmin,
        'update-payment-method',
        'stripe_api',
        'Failed to set default payment method',
        { error: error.message, stack: error.stack, payment_method_id, customer_id },
        user.id,
        { payment_method_id, customer_id },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to set default payment method' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update all active subscriptions to use new payment method
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer_id,
        status: 'active',
        limit: 100
      })

      for (const subscription of subscriptions.data) {
        try {
          await stripe.subscriptions.update(subscription.id, {
            default_payment_method: payment_method_id,
            payment_behavior: 'default_incomplete'
          })
        } catch (error: any) {
          console.warn(`⚠️ Failed to update subscription ${subscription.id}:`, error.message)
          // Continue with other subscriptions
        }
      }
    } catch (error: any) {
      console.error('❌ Error updating subscriptions:', error)
      // Don't fail the request - default payment method was set
      await logError(
        supabaseAdmin,
        'update-payment-method',
        'stripe_api',
        'Failed to update some subscriptions',
        { error: error.message, customer_id },
        user.id,
        { payment_method_id, customer_id },
        ipAddress
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_method_id,
        customer_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error in update-payment-method:', error)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await logError(
      supabaseAdmin,
      'update-payment-method',
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


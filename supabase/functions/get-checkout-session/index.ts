/**
 * Get Checkout Session Edge Function
 * Retrieves Stripe Checkout session details for success/cancel pages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

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
    // Parse query parameters
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'session_id query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe secret key based on mode
    // Check session ID prefix to determine mode (cs_test_ vs cs_live_)
    const isLiveMode = sessionId.startsWith('cs_live_')
    const stripeSecretKey = getStripeSecretKey(isLiveMode)
    
    if (!stripeSecretKey) {
      console.error(`❌ Stripe secret key not found for ${isLiveMode ? 'LIVE' : 'TEST'} mode`)
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    // Retrieve checkout session with expanded line items
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product']
      })
    } catch (error: any) {
      console.error('❌ Error retrieving Stripe Checkout session:', error)
      return new Response(
        JSON.stringify({ error: 'Session not found or invalid' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract relevant data
    const lineItems = session.line_items?.data || []
    const firstLineItem = lineItems[0]
    const price = firstLineItem?.price
    const product = typeof price?.product === 'string' 
      ? await stripe.products.retrieve(price.product)
      : price?.product

    const amountTotal = session.amount_total ? session.amount_total / 100 : 0
    const currency = session.currency?.toUpperCase() || 'CHF'
    const mode = session.mode || 'payment'
    const paymentStatus = session.payment_status || 'unknown'
    const status = session.status || 'open'
    
    // Determine purchase type
    const purchaseType = mode === 'subscription' ? 'subscription' : 'one_time'
    
    // Get interval if subscription
    let interval: string | null = null
    if (mode === 'subscription' && price?.recurring) {
      interval = price.recurring.interval === 'month' ? 'monthly' : 'yearly'
    }

    // Get item name from product or metadata
    let itemName = product?.name || 'Unknown Item'
    if (session.metadata?.item_type === 'service') {
      // Try to get name from services table using metadata
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      
      if (session.metadata.item_id) {
        const { data: service } = await supabaseAdmin
          .from('services')
          .select('name')
          .eq('id', session.metadata.item_id)
          .maybeSingle()
        
        if (service?.name) {
          itemName = service.name
        }
      }
    } else if (session.metadata?.item_type === 'product') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      
      if (session.metadata.item_id) {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('name')
          .eq('id', session.metadata.item_id)
          .maybeSingle()
        
        if (product?.name) {
          itemName = product.name
        }
      }
    }

    return new Response(
      JSON.stringify({
        session_id: session.id,
        item_name: itemName,
        amount: amountTotal,
        currency,
        purchase_type: purchaseType,
        interval,
        payment_status: paymentStatus,
        status,
        mode,
        metadata: session.metadata || {}
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error in get-checkout-session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

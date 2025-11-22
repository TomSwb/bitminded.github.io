/**
 * Stripe Webhook Handler
 * 
 * Handles all Stripe webhook events for product purchases and subscriptions.
 * Processes checkout completions, subscription lifecycle, invoices, refunds, and disputes.
 * 
 * Events handled (29 total):
 * - Core: checkout.session.completed, subscription.*, invoice.*, charge.*
 * - Refunds: refund.created, refund.failed, refund.updated
 * - Disputes: charge.dispute.*
 * - Payment: charge.succeeded, charge.failed, invoice.payment_action_required
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Stripe SDK for webhook verification
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// ============================================================================
// Helper Functions
// ============================================================================

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
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
 * Verify Stripe webhook signature using Stripe SDK
 * This uses Stripe's official verification method which handles all edge cases
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    console.log('🔍 Debug: Signature verification started (using Stripe SDK)')
    console.log('🔍 Debug: Secret length:', secret.length)
    console.log('🔍 Debug: Secret starts with whsec_:', secret.startsWith('whsec_'))
    
    // Initialize Stripe (we only need it for webhook verification)
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_dummy' // Dummy key, we only need it for SDK init
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    // Create crypto provider for Deno
    const cryptoProvider = Stripe.createSubtleCryptoProvider()

    try {
      // Use Stripe SDK's built-in verification
      const event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        secret,
        undefined, // tolerance (optional, defaults to 300 seconds)
        cryptoProvider
      )
      console.log('✅ Debug: Signature verified successfully via Stripe SDK')
      console.log('✅ Debug: Event type:', event.type, 'Event ID:', event.id)
      return true
    } catch (err: any) {
      console.error('❌ Debug: Stripe SDK verification failed:', err.message)
      console.error('❌ Debug: Error type:', err.type)
      // Don't fall back - if Stripe SDK fails, the signature is invalid
      return false
    }
  } catch (error: any) {
    console.error('❌ Error in Stripe SDK verification:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    return false
  }
}

/**
 * Find user by email or Stripe customer ID
 * If customer ID is provided, fetches customer from Stripe to get email
 */
async function findUser(
  supabaseAdmin: any,
  email?: string,
  stripeCustomerId?: string
): Promise<string | null> {
  // First, try to find by email if provided
  if (email) {
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    
    if (userProfile) {
      return userProfile.id
    }
  }

  // If customer ID provided but no email, fetch customer from Stripe
  if (stripeCustomerId && !email) {
    try {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (stripeSecretKey) {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2024-11-20.acacia',
        })
        
        const customer = await stripe.customers.retrieve(stripeCustomerId)
        if (customer && !customer.deleted && customer.email) {
          // Try to find user by email from Stripe customer
          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('email', customer.email.toLowerCase())
            .maybeSingle()
          
          if (userProfile) {
            return userProfile.id
          }
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Error fetching customer from Stripe:', error.message)
    }
  }

  // Try to find user by existing purchase with this customer ID
  if (stripeCustomerId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('user_id')
      .eq('stripe_customer_id', stripeCustomerId)
      .limit(1)
      .maybeSingle()
    
    if (purchase) {
      return purchase.user_id
    }
  }

  return null
}

/**
 * Find product by Stripe product ID and optionally price ID
 * If multiple products have the same stripe_product_id, prefer matching by price_id
 */
async function findProduct(
  supabaseAdmin: any,
  stripeProductId: string,
  stripePriceId?: string
): Promise<string | null> {
  // If price ID provided, try to match by both product and price
  if (stripePriceId) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('stripe_product_id', stripeProductId)
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle()

    if (product) {
      return product.id
    }
  }

  // Fall back to matching by product ID only
  // If multiple matches, prefer active products, then by created_at (newest first)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, status, created_at')
    .eq('stripe_product_id', stripeProductId)
    .order('status', { ascending: false }) // 'active' comes before other statuses alphabetically
    .order('created_at', { ascending: false }) // Newest first
    .limit(1)

  if (products && products.length > 0) {
    return products[0].id
  }

  return null
}

/**
 * Check if purchase already exists (idempotency check)
 */
async function findExistingPurchase(
  supabaseAdmin: any,
  stripeSubscriptionId?: string,
  stripePaymentIntentId?: string,
  stripeInvoiceId?: string
): Promise<string | null> {
  if (stripeSubscriptionId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()
    
    if (purchase) return purchase.id
  }

  if (stripePaymentIntentId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', stripePaymentIntentId)
      .maybeSingle()
    
    if (purchase) return purchase.id
  }

  if (stripeInvoiceId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle()
    
    if (purchase) return purchase.id
  }

  return null
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle checkout.session.completed
 * Creates purchase record when checkout completes
 */
async function handleCheckoutSessionCompleted(
  supabaseAdmin: any,
  session: any
): Promise<void> {
  console.log('🛒 Processing checkout.session.completed:', session.id)

  const customerEmail = session.customer_details?.email || session.customer_email
  const stripeCustomerId = session.customer as string
  const subscriptionId = session.subscription as string | null
  const paymentIntentId = session.payment_intent as string | null

  // Find user
  const userId = await findUser(supabaseAdmin, customerEmail, stripeCustomerId)
  if (!userId) {
    console.warn('⚠️ User not found for checkout session:', { email: customerEmail, customerId: stripeCustomerId })
    await logError(
      supabaseAdmin,
      'stripe-webhook',
      'validation',
      'User not found for checkout session',
      { sessionId: session.id, email: customerEmail, customerId: stripeCustomerId },
      null,
      { event: 'checkout.session.completed', session }
    )
    return
  }

  // Check idempotency
  const existingPurchaseId = await findExistingPurchase(
    supabaseAdmin,
    subscriptionId || undefined,
    paymentIntentId || undefined
  )

  if (existingPurchaseId) {
    console.log('✅ Purchase already exists, skipping:', existingPurchaseId)
    return
  }

  // Fetch line items from Stripe (they're not included in webhook by default)
  let lineItems: any[] = []
  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not found')
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })
    
    // Fetch checkout session with expanded line items
    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price.product']
    })
    
    lineItems = expandedSession.line_items?.data || []
    console.log(`📦 Retrieved ${lineItems.length} line item(s) from Stripe`)
  } catch (error: any) {
    console.error('❌ Error fetching line items from Stripe:', error.message)
    await logError(
      supabaseAdmin,
      'stripe-webhook',
      'stripe_api',
      'Failed to fetch checkout session line items',
      { sessionId: session.id, error: error.message },
      userId,
      { event: 'checkout.session.completed', session }
    )
    return
  }

  // If no line items, try to get product info from payment intent (for payment links)
  if (lineItems.length === 0 && paymentIntentId) {
    console.log('⚠️ No line items in checkout session, trying payment intent...')
    try {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY not found')
      }
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia',
      })
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['invoice', 'invoice.lines.data.price.product']
      })
      
      // Try to get product from payment intent metadata or invoice
      if (paymentIntent.metadata?.product_id) {
        const productId = await findProduct(supabaseAdmin, paymentIntent.metadata.product_id, paymentIntent.metadata.price_id)
        if (productId) {
          // Create a synthetic line item
          lineItems = [{
            price: {
              id: paymentIntent.metadata.price_id || null,
              product: paymentIntent.metadata.product_id,
              recurring: null
            },
            quantity: parseInt(paymentIntent.metadata.quantity || '1', 10)
          }]
          console.log('✅ Found product from payment intent metadata')
        }
      }
      
      // If still no line items, try invoice
      if (lineItems.length === 0 && paymentIntent.invoice) {
        const invoice = typeof paymentIntent.invoice === 'string' 
          ? await stripe.invoices.retrieve(paymentIntent.invoice, { expand: ['lines.data.price.product'] })
          : paymentIntent.invoice
        
        if (invoice.lines?.data && invoice.lines.data.length > 0) {
          lineItems = invoice.lines.data.map((line: any) => ({
            price: line.price,
            quantity: line.quantity || 1
          }))
          console.log(`✅ Found ${lineItems.length} line item(s) from invoice`)
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching payment intent:', error.message)
    }
  }

  if (lineItems.length === 0) {
    console.warn('⚠️ No line items found in checkout session or payment intent')
    await logError(
      supabaseAdmin,
      'stripe-webhook',
      'validation',
      'No line items in checkout session or payment intent',
      { sessionId: session.id, paymentIntentId },
      userId,
      { event: 'checkout.session.completed', session }
    )
    return
  }

  // Process each line item (support for multiple products in one checkout)
  for (const item of lineItems) {
    const stripePriceId = item.price?.id
    // Handle both expanded product object and product ID string
    const stripeProductId = typeof item.price?.product === 'string' 
      ? item.price.product 
      : item.price?.product?.id
    const amountTotal = (session.amount_total || 0) / 100 // Convert from cents
    const currency = (session.currency || 'usd').toUpperCase()
    const quantity = item.quantity || 1

    if (!stripeProductId) {
      console.warn('⚠️ No product ID found in line item')
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'validation',
        'No product ID in line item',
        { sessionId: session.id, lineItem: item },
        userId,
        { event: 'checkout.session.completed', session }
      )
      continue
    }

    // Find product (pass price ID for more precise matching)
    const productId = await findProduct(supabaseAdmin, stripeProductId, stripePriceId)
    if (!productId) {
      console.warn(`⚠️ Product not found in database. Stripe Product ID: ${stripeProductId}, Price ID: ${stripePriceId}`)
      console.warn(`   Please ensure the product exists in your products table with stripe_product_id = '${stripeProductId}' and stripe_price_id = '${stripePriceId}'`)
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'validation',
        'Product not found for checkout session',
        { 
          sessionId: session.id, 
          stripeProductId,
          message: `Product with stripe_product_id '${stripeProductId}' not found in database. Please create the product first.`
        },
        userId,
        { event: 'checkout.session.completed', session }
      )
      continue
    }

    // Determine purchase type
    const isSubscription = !!subscriptionId
    const isTrial = session.subscription_details?.trial_end ? true : false
    const purchaseType = isTrial ? 'trial' : (isSubscription ? 'subscription' : 'one_time')

    // Determine subscription interval
    let subscriptionInterval: string | null = null
    if (isSubscription && item.price?.recurring) {
      subscriptionInterval = item.price.recurring.interval === 'month' ? 'monthly' : 'yearly'
    }

    // Prepare purchase data
    const purchaseData: any = {
      user_id: userId,
      product_id: productId,
      purchase_type: purchaseType,
      amount_paid: amountTotal / quantity, // Per item
      currency: currency,
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_subscription_id: subscriptionId,
      user_type: 'individual', // Default, can be updated later
      status: 'active',
      payment_status: 'succeeded',
      subscription_interval: subscriptionInterval,
      purchased_at: new Date(session.created * 1000).toISOString()
    }

    // Add trial information if applicable
    if (isTrial && session.subscription_details?.trial_end) {
      purchaseData.is_trial = true
      purchaseData.trial_start = new Date(session.created * 1000).toISOString()
      purchaseData.trial_end = new Date(session.subscription_details.trial_end * 1000).toISOString()
    }

    // Create purchase record
    const { data: purchase, error } = await supabaseAdmin
      .from('product_purchases')
      .insert(purchaseData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating purchase:', error)
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'database',
        'Failed to create purchase record',
        { error: error.message, purchaseData },
        userId,
        { event: 'checkout.session.completed', session }
      )
    } else {
      console.log('✅ Purchase created:', purchase.id)
    }
  }
}

/**
 * Handle customer.subscription.created
 * Initialize subscription in database
 */
async function handleSubscriptionCreated(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('📅 Processing subscription.created:', subscription.id)

  const stripeCustomerId = subscription.customer as string
  const userId = await findUser(supabaseAdmin, undefined, stripeCustomerId)

  if (!userId) {
    console.warn('⚠️ User not found for subscription:', stripeCustomerId)
    return
  }

  // Check if purchase already exists
  const existingPurchaseId = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (existingPurchaseId) {
    // Update existing purchase with subscription details
    await updatePurchaseFromSubscription(supabaseAdmin, existingPurchaseId, subscription)
    return
  }

  // If no existing purchase, subscription was likely created outside checkout
  // We'll wait for checkout.session.completed or invoice.paid to create the purchase
  console.log('ℹ️ Subscription created but no purchase record yet, will be created by checkout/invoice event')
}

/**
 * Handle customer.subscription.updated
 * Update subscription status, periods, trial dates
 */
async function handleSubscriptionUpdated(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('🔄 Processing subscription.updated:', subscription.id)

  const purchaseId = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!purchaseId) {
    console.warn('⚠️ Purchase not found for subscription:', subscription.id)
    return
  }

  await updatePurchaseFromSubscription(supabaseAdmin, purchaseId, subscription)
}

/**
 * Handle customer.subscription.deleted
 * Mark subscription as cancelled/expired
 */
async function handleSubscriptionDeleted(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('🗑️ Processing subscription.deleted:', subscription.id)

  const purchaseId = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!purchaseId) {
    console.warn('⚠️ Purchase not found for subscription:', subscription.id)
    return
  }

  const updateData: any = {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // If subscription ended, mark as expired
  if (subscription.ended_at) {
    const endedAt = new Date(subscription.ended_at * 1000)
    const now = new Date()
    if (endedAt < now) {
      updateData.status = 'expired'
    }
  }

  const { error } = await supabaseAdmin
    .from('product_purchases')
    .update(updateData)
    .eq('id', purchaseId)

  if (error) {
    console.error('❌ Error updating purchase:', error)
    await logError(
      supabaseAdmin,
      'stripe-webhook',
      'database',
      'Failed to update purchase on subscription deletion',
      { error: error.message, subscriptionId: subscription.id },
      null,
      { event: 'customer.subscription.deleted', subscription }
    )
  } else {
    console.log('✅ Purchase marked as cancelled/expired:', purchaseId)
  }
}

/**
 * Handle customer.subscription.paused
 * Mark subscription as suspended
 */
async function handleSubscriptionPaused(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('⏸️ Processing subscription.paused:', subscription.id)

  const purchaseId = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!purchaseId) {
    return
  }

  const { error } = await supabaseAdmin
    .from('product_purchases')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', purchaseId)

  if (error) {
    console.error('❌ Error updating purchase:', error)
  } else {
    console.log('✅ Purchase marked as suspended:', purchaseId)
  }
}

/**
 * Handle customer.subscription.resumed
 * Mark subscription as active
 */
async function handleSubscriptionResumed(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('▶️ Processing subscription.resumed:', subscription.id)

  const purchaseId = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!purchaseId) {
    return
  }

  await updatePurchaseFromSubscription(supabaseAdmin, purchaseId, subscription)
}

/**
 * Handle invoice.paid
 * Update payment status and renew subscription periods
 */
async function handleInvoicePaid(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('💰 Processing invoice.paid:', invoice.id)

  // Get subscription ID from invoice or from line items parent structure
  let subscriptionId = invoice.subscription as string | null
  const customerId = invoice.customer as string
  const paymentIntentId = invoice.payment_intent as string | null
  
  // If subscription ID not in invoice, try to get from line items
  if (!subscriptionId && invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) {
    subscriptionId = invoice.lines.data[0].parent.subscription_item_details.subscription
    console.log('🔍 Debug: Found subscription ID from line item parent:', subscriptionId)
  }

  // Find purchase by subscription or invoice ID
  let purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)
  
  if (!purchaseId && subscriptionId) {
    purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId)
  }

  if (!purchaseId) {
    // Try to create purchase from invoice if it doesn't exist
    // Try to get email from invoice first, then fall back to customer lookup
    const customerEmail = invoice.customer_email || invoice.customer_details?.email
    const userId = await findUser(supabaseAdmin, customerEmail, customerId)
    
    if (!userId) {
      console.warn('⚠️ User not found for invoice, cannot create purchase:', { customerEmail, customerId })
      return
    }
    
    // Check if invoice has line items (may need to fetch from Stripe)
    let lineItems = invoice.lines?.data || []
    if (lineItems.length === 0) {
      console.log('⚠️ Invoice has no line items in webhook, fetching from Stripe...')
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-11-20.acacia',
          })
          const expandedInvoice = await stripe.invoices.retrieve(invoice.id, {
            expand: ['lines.data.price.product', 'subscription', 'lines.data.parent']
          })
          // Update invoice object with expanded data
          invoice = expandedInvoice
          // Re-extract subscription ID from expanded invoice
          if (expandedInvoice.subscription) {
            subscriptionId = typeof expandedInvoice.subscription === 'string'
              ? expandedInvoice.subscription
              : expandedInvoice.subscription.id
            console.log('🔍 Debug: Found subscription ID from expanded invoice:', subscriptionId)
          }
          lineItems = expandedInvoice.lines?.data || []
          console.log(`📦 Retrieved ${lineItems.length} line item(s) from Stripe`)
        }
      } catch (error: any) {
        console.error('❌ Error fetching invoice from Stripe:', error.message)
        return
      }
    }
    
    if (lineItems.length > 0) {
      const lineItem = lineItems[0]
      
      // Debug: Log the line item structure
      console.log('🔍 Debug: Line item structure:', JSON.stringify({
        hasPrice: !!lineItem.price,
        hasPricing: !!lineItem.pricing,
        hasParent: !!lineItem.parent,
        priceId: lineItem.price?.id,
        pricingId: lineItem.pricing?.id,
        parentId: lineItem.parent,
        priceProduct: lineItem.price?.product,
        pricingProduct: lineItem.pricing?.product,
        lineItemKeys: Object.keys(lineItem)
      }))
      
      // Try to get price from lineItem.price or lineItem.pricing
      // Newer Stripe API uses 'pricing' field with nested structure
      let stripeProductId: string | undefined
      let stripePriceId: string | undefined
      
      if (lineItem.price) {
        // Old format: direct price object
        stripeProductId = typeof lineItem.price.product === 'string' 
          ? lineItem.price.product 
          : lineItem.price.product?.id
        stripePriceId = lineItem.price.id
      } else if (lineItem.pricing) {
        // New format: nested pricing structure
        if (lineItem.pricing.price_details) {
          stripeProductId = lineItem.pricing.price_details.product
          stripePriceId = lineItem.pricing.price_details.price
        } else if (lineItem.pricing.product) {
          // Alternative nested structure
          stripeProductId = typeof lineItem.pricing.product === 'string'
            ? lineItem.pricing.product
            : lineItem.pricing.product?.id
          stripePriceId = lineItem.pricing.id
        }
      }
      
      // If no price/pricing, try to get from subscription item (parent)
      if (!stripeProductId && lineItem.parent && subscriptionId) {
        console.log('🔍 Debug: No price in line item, fetching from subscription item...')
        try {
          const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
          if (stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey, {
              apiVersion: '2024-11-20.acacia',
            })
            // Fetch subscription to get items
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price.product']
            })
            if (subscription.items?.data?.[0]?.price) {
              const subPrice = subscription.items.data[0].price
              const subProductId = typeof subPrice.product === 'string' 
                ? subPrice.product 
                : subPrice.product?.id
              if (subProductId) {
                console.log('🔍 Debug: Found product from subscription item:', subProductId)
                stripeProductId = subProductId
                stripePriceId = subPrice.id
              }
            }
          }
        } catch (error: any) {
          console.error('❌ Error fetching subscription item:', error.message)
        }
      }
      
      console.log('🔍 Debug: Extracted product ID:', stripeProductId, 'Price ID:', stripePriceId)
      
      if (!stripeProductId) {
        console.warn('⚠️ No product ID found in invoice line item')
        console.warn('⚠️ Line item structure:', JSON.stringify({
          price: lineItem.price,
          pricing: lineItem.pricing,
          parent: lineItem.parent
        }, null, 2))
        return
      }
      
      const productId = await findProduct(supabaseAdmin, stripeProductId, stripePriceId)
      
      if (!productId) {
        console.warn('⚠️ Product not found in database:', stripeProductId, stripePriceId)
        return
      }
      
      // Calculate amount - use amount_due or amount_paid, whichever is available
      // Also check line items for amount if invoice total is 0
      let amountTotal = invoice.amount_paid 
        ? (invoice.amount_paid / 100)
        : invoice.amount_due 
          ? (invoice.amount_due / 100)
          : invoice.total 
            ? (invoice.total / 100)
            : 0
      
      // If amount is 0, try to get from line items
      if (amountTotal === 0 && lineItems.length > 0) {
        const lineItemAmount = lineItems.reduce((sum: number, item: any) => {
          return sum + ((item.amount || 0) / 100)
        }, 0)
        if (lineItemAmount > 0) {
          amountTotal = lineItemAmount
          console.log('🔍 Debug: Using amount from line items:', amountTotal)
        }
      }
      
      // Debug: Log amount calculation
      console.log('🔍 Debug: Invoice amount fields:', {
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        total: invoice.total,
        subtotal: invoice.subtotal,
        calculated_amount: amountTotal
      })
      
      const currency = (invoice.currency || 'usd').toUpperCase()
      
      // Determine purchase type - check if subscription exists
      const isSubscription = !!subscriptionId
      
      const purchaseData: any = {
        user_id: userId,
        product_id: productId,
        purchase_type: isSubscription ? 'subscription' : 'one_time',
        amount_paid: amountTotal,
        currency: currency,
        stripe_customer_id: customerId,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_subscription_id: subscriptionId,
        user_type: 'individual',
        status: 'active',
        payment_status: 'succeeded',
        purchased_at: new Date(invoice.created * 1000).toISOString()
      }

      // Check if this is a trial period invoice
      // Trial invoices typically have amount = 0 and billing_reason = 'subscription_create' or 'subscription_cycle'
      const isTrialInvoice = amountTotal === 0 && (
        invoice.billing_reason === 'subscription_create' ||
        invoice.billing_reason === 'subscription_cycle' ||
        invoice.collection_method === 'send_invoice'
      )
      
      // If subscription exists, fetch it to get accurate period dates and trial info
      let subscription: any = null
      if (isSubscription && subscriptionId) {
        try {
          const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
          if (stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey, {
              apiVersion: '2024-11-20.acacia',
            })
            subscription = await stripe.subscriptions.retrieve(subscriptionId)
            
            // Debug: Log subscription trial info
            console.log('🔍 Debug: Subscription trial info:', {
              has_trial_start: !!subscription.trial_start,
              has_trial_end: !!subscription.trial_end,
              trial_start: subscription.trial_start,
              trial_end: subscription.trial_end,
              status: subscription.status,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end
            })
            
            // Set trial information if available
            if (subscription.trial_start && subscription.trial_end) {
              purchaseData.is_trial = true
              purchaseData.trial_start = new Date(subscription.trial_start * 1000).toISOString()
              purchaseData.trial_end = new Date(subscription.trial_end * 1000).toISOString()
              console.log('🔍 Debug: Found trial period:', {
                trial_start: purchaseData.trial_start,
                trial_end: purchaseData.trial_end
              })
            } else if (isTrialInvoice) {
              // If invoice is $0 and no trial dates, mark as trial anyway
              purchaseData.is_trial = true
              console.log('🔍 Debug: Marking as trial based on $0 invoice')
            } else if (subscription.status === 'trialing') {
              // Check if subscription is currently in trial status
              purchaseData.is_trial = true
              console.log('🔍 Debug: Subscription is in trialing status, marking as trial')
              // Try to calculate trial end from current period if trial dates not set
              if (subscription.current_period_end) {
                purchaseData.trial_end = new Date(subscription.current_period_end * 1000).toISOString()
                if (subscription.current_period_start) {
                  purchaseData.trial_start = new Date(subscription.current_period_start * 1000).toISOString()
                }
              }
            } else {
              console.log('⚠️ No trial dates found in subscription')
            }
            
            // Set subscription interval if available
            if (subscription.items?.data?.[0]?.price?.recurring) {
              const interval = subscription.items.data[0].price.recurring.interval
              purchaseData.subscription_interval = interval === 'month' ? 'monthly' : 'yearly'
            }
          }
        } catch (error: any) {
          console.warn('⚠️ Error fetching subscription for trial info:', error.message)
        }
      }
      
      // Set subscription period dates - ALWAYS prefer subscription dates over invoice dates
      // Invoice period dates might be incorrect or the same, subscription dates are more reliable
      if (subscription && subscription.current_period_start && subscription.current_period_end) {
        purchaseData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
        let periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
        
        // If period start and end are the same (common during trial), use trial_end if available
        if (subscription.current_period_start === subscription.current_period_end && subscription.trial_end) {
          periodEnd = new Date(subscription.trial_end * 1000).toISOString()
          console.log('🔍 Debug: Period dates were same, using trial_end as period_end:', periodEnd)
        }
        
        purchaseData.current_period_end = periodEnd
        console.log('🔍 Debug: Using subscription period dates:', {
          start: purchaseData.current_period_start,
          end: purchaseData.current_period_end
        })
      } else if (subscriptionId && invoice.period_start && invoice.period_end) {
        // Fallback to invoice dates if subscription not fetched or dates missing
        purchaseData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
        let periodEnd = new Date(invoice.period_end * 1000).toISOString()
        
        // If invoice period dates are same and we have trial_end, use trial_end
        if (invoice.period_start === invoice.period_end && purchaseData.trial_end) {
          periodEnd = purchaseData.trial_end
          console.log('🔍 Debug: Invoice period dates were same, using trial_end as period_end:', periodEnd)
        }
        
        purchaseData.current_period_end = periodEnd
        console.log('⚠️ Using invoice period dates (subscription dates not available)')
      } else if (subscriptionId) {
        console.log('⚠️ No period dates available, will be set by subscription.updated event')
      }

      const { data: purchase, error } = await supabaseAdmin
        .from('product_purchases')
        .insert(purchaseData)
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating purchase from invoice:', error)
      } else {
        console.log('✅ Purchase created from invoice:', purchase.id)
        purchaseId = purchase.id
      }
    } else {
      console.warn('⚠️ Invoice has no line items, cannot create purchase')
    }
  }

  if (purchaseId) {
    const updateData: any = {
      payment_status: 'succeeded',
      status: 'active',
      stripe_invoice_id: invoice.id,
      updated_at: new Date().toISOString()
    }

    // Update subscription ID if not set
    if (subscriptionId) {
      updateData.stripe_subscription_id = subscriptionId
      // Also update purchase_type if it was incorrectly set as one_time
      updateData.purchase_type = 'subscription'
    }

    // Update amount if it was 0
    if (invoice.amount_paid || invoice.amount_due || invoice.total) {
      const amountTotal = invoice.amount_paid 
        ? (invoice.amount_paid / 100)
        : invoice.amount_due 
          ? (invoice.amount_due / 100)
          : (invoice.total / 100)
      updateData.amount_paid = amountTotal
    }

    // Update subscription periods if available
    // Prefer fetching subscription for accurate period dates
    if (subscriptionId) {
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-11-20.acacia',
          })
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          if (subscription.current_period_start && subscription.current_period_end) {
            updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
            let periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
            
            // If period dates are same and we have trial_end, use trial_end
            if (subscription.current_period_start === subscription.current_period_end && subscription.trial_end) {
              periodEnd = new Date(subscription.trial_end * 1000).toISOString()
            }
            
            updateData.current_period_end = periodEnd
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Error fetching subscription for period dates in update:', error.message)
        // Fallback to invoice dates
        if (invoice.period_start && invoice.period_end) {
          updateData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
          updateData.current_period_end = new Date(invoice.period_end * 1000).toISOString()
        }
      }
    } else if (invoice.period_start && invoice.period_end) {
      // Fallback to invoice dates if no subscription
      updateData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
      updateData.current_period_end = new Date(invoice.period_end * 1000).toISOString()
    }

    const { error } = await supabaseAdmin
      .from('product_purchases')
      .update(updateData)
      .eq('id', purchaseId)

    if (error) {
      console.error('❌ Error updating purchase:', error)
    } else {
      console.log('✅ Purchase updated with payment success:', purchaseId)
    }
  }
}

/**
 * Handle invoice.payment_failed
 * Handle failed payments, update status, set grace period
 */
async function handleInvoicePaymentFailed(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('❌ Processing invoice.payment_failed:', invoice.id)

  const subscriptionId = invoice.subscription as string | null
  const purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (!purchaseId) {
    return
  }

  // Get current purchase to check failure count
  const { data: purchase } = await supabaseAdmin
    .from('product_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single()

  if (!purchase) {
    return
  }

  const updateData: any = {
    payment_status: 'failed',
    stripe_invoice_id: invoice.id,
    updated_at: new Date().toISOString()
  }

  // Set grace period (7 days) on first failure, keep access during grace period
  if (!purchase.grace_period_ends_at) {
    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
    updateData.grace_period_ends_at = gracePeriodEnd.toISOString()
    updateData.status = 'active' // Keep access during grace period
  } else {
    // Check if grace period has expired
    const gracePeriodEnd = new Date(purchase.grace_period_ends_at)
    const now = new Date()
    if (now > gracePeriodEnd) {
      updateData.status = 'suspended' // Suspend after grace period
    }
  }

  const { error } = await supabaseAdmin
    .from('product_purchases')
    .update(updateData)
    .eq('id', purchaseId)

  if (error) {
    console.error('❌ Error updating purchase:', error)
  } else {
    console.log('✅ Purchase updated with payment failure:', purchaseId)
  }
}

/**
 * Handle invoice.payment_action_required
 * Notify user to complete 3D Secure/SCA authentication
 */
async function handleInvoicePaymentActionRequired(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('🔐 Processing invoice.payment_action_required:', invoice.id)

  const subscriptionId = invoice.subscription as string | null
  const purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (purchaseId) {
    // Update to pending status while waiting for authentication
    await supabaseAdmin
      .from('product_purchases')
      .update({
        payment_status: 'pending',
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
  }

  // Note: User notification should be sent separately via notification system
}

/**
 * Handle invoice.upcoming
 * Reminder before subscription renewal
 */
async function handleInvoiceUpcoming(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('📅 Processing invoice.upcoming:', invoice.id)
  // Note: This is informational, user notification should be sent separately
}

/**
 * Handle invoice.created, invoice.updated, invoice.finalized
 * Track invoice lifecycle
 */
async function handleInvoiceLifecycle(
  supabaseAdmin: any,
  invoice: any,
  eventType: string
): Promise<void> {
  console.log(`📄 Processing ${eventType}:`, invoice.id)

  const subscriptionId = invoice.subscription as string | null
  const purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (purchaseId) {
    const updateData: any = {
      stripe_invoice_id: invoice.id,
      updated_at: new Date().toISOString()
    }

    // Update periods if available
    if (invoice.period_start && invoice.period_end) {
      updateData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
      updateData.current_period_end = new Date(invoice.period_end * 1000).toISOString()
    }

    await supabaseAdmin
      .from('product_purchases')
      .update(updateData)
      .eq('id', purchaseId)
  }
}

/**
 * Handle invoice.voided
 * Mark invoice as voided
 */
async function handleInvoiceVoided(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('🚫 Processing invoice.voided:', invoice.id)
  // Update invoice ID but keep purchase record
  await handleInvoiceLifecycle(supabaseAdmin, invoice, 'invoice.voided')
}

/**
 * Handle invoice.marked_uncollectible
 * Mark invoice as uncollectible after multiple failures
 */
async function handleInvoiceMarkedUncollectible(
  supabaseAdmin: any,
  invoice: any
): Promise<void> {
  console.log('💸 Processing invoice.marked_uncollectible:', invoice.id)

  const subscriptionId = invoice.subscription as string | null
  const purchaseId = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (purchaseId) {
    await supabaseAdmin
      .from('product_purchases')
      .update({
        payment_status: 'failed',
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
  }
}

/**
 * Handle charge.succeeded
 * One-time payment succeeded
 */
async function handleChargeSucceeded(
  supabaseAdmin: any,
  charge: any
): Promise<void> {
  console.log('✅ Processing charge.succeeded:', charge.id)

  const paymentIntentId = charge.payment_intent as string
  const purchaseId = await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)

  if (purchaseId) {
    await supabaseAdmin
      .from('product_purchases')
      .update({
        payment_status: 'succeeded',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
  }
}

/**
 * Handle charge.failed
 * One-time payment failed
 */
async function handleChargeFailed(
  supabaseAdmin: any,
  charge: any
): Promise<void> {
  console.log('❌ Processing charge.failed:', charge.id)

  const paymentIntentId = charge.payment_intent as string
  const purchaseId = await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)

  if (purchaseId) {
    await supabaseAdmin
      .from('product_purchases')
      .update({
        payment_status: 'failed',
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
  }
}

/**
 * Handle charge.refunded
 * Mark purchases as refunded (handle partial/full)
 */
async function handleChargeRefunded(
  supabaseAdmin: any,
  charge: any
): Promise<void> {
  console.log('↩️ Processing charge.refunded:', charge.id)

  const paymentIntentId = charge.payment_intent as string
  const purchaseId = await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)

  if (purchaseId) {
    const amountRefunded = (charge.amount_refunded || 0) / 100
    const amountTotal = (charge.amount || 0) / 100
    const isFullRefund = amountRefunded >= amountTotal

    const updateData: any = {
      payment_status: 'refunded',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If full refund, mark as cancelled
    if (isFullRefund) {
      updateData.status = 'cancelled'
    }

    await supabaseAdmin
      .from('product_purchases')
      .update(updateData)
      .eq('id', purchaseId)
  }
}

/**
 * Handle refund.created
 * Refund initiated
 */
async function handleRefundCreated(
  supabaseAdmin: any,
  refund: any
): Promise<void> {
  console.log('↩️ Processing refund.created:', refund.id)
  // Refund details are handled by charge.refunded, this is informational
}

/**
 * Handle refund.failed
 * Refund attempt failed - needs admin attention
 */
async function handleRefundFailed(
  supabaseAdmin: any,
  refund: any
): Promise<void> {
  console.log('❌ Processing refund.failed:', refund.id)
  
  // Log error for admin attention
  await logError(
    supabaseAdmin,
    'stripe-webhook',
    'stripe_api',
    'Refund failed - requires admin attention',
    { refundId: refund.id, chargeId: refund.charge, amount: refund.amount, reason: refund.failure_reason },
    null,
    { event: 'refund.failed', refund }
  )
}

/**
 * Handle refund.updated
 * Refund status changed
 */
async function handleRefundUpdated(
  supabaseAdmin: any,
  refund: any
): Promise<void> {
  console.log('🔄 Processing refund.updated:', refund.id)
  // Status changes are handled by charge.refunded, this is informational
}

/**
 * Handle charge.dispute.created
 * Customer disputes charge - suspend access immediately
 */
async function handleDisputeCreated(
  supabaseAdmin: any,
  dispute: any
): Promise<void> {
  console.log('⚖️ Processing charge.dispute.created:', dispute.id)

  const chargeId = dispute.charge as string
  // Find purchase by payment intent (charge has payment_intent)
  // We need to get charge details first, but for now update by charge ID pattern
  
  // Log for admin attention
  await logError(
    supabaseAdmin,
    'stripe-webhook',
    'stripe_api',
    'Charge dispute created - requires immediate attention',
    { disputeId: dispute.id, chargeId, amount: dispute.amount, reason: dispute.reason },
    null,
    { event: 'charge.dispute.created', dispute }
  )

  // Note: To suspend access, we'd need to find the purchase by charge/payment_intent
  // This requires fetching charge details from Stripe API
}

/**
 * Handle charge.dispute.updated
 * Dispute status changed
 */
async function handleDisputeUpdated(
  supabaseAdmin: any,
  dispute: any
): Promise<void> {
  console.log('🔄 Processing charge.dispute.updated:', dispute.id)
  // Log for admin attention
}

/**
 * Handle charge.dispute.closed
 * Dispute resolved
 */
async function handleDisputeClosed(
  supabaseAdmin: any,
  dispute: any
): Promise<void> {
  console.log('✅ Processing charge.dispute.closed:', dispute.id)

  // If dispute was won, restore access
  if (dispute.status === 'won' || dispute.status === 'warning_closed') {
    // Find and restore purchase
    // Note: Would need to fetch charge details to find purchase
    console.log('✅ Dispute won, access should be restored')
  }

  await logError(
    supabaseAdmin,
    'stripe-webhook',
    'stripe_api',
    `Dispute closed with status: ${dispute.status}`,
    { disputeId: dispute.id, status: dispute.status, chargeId: dispute.charge },
    null,
    { event: 'charge.dispute.closed', dispute }
  )
}

/**
 * Handle charge.dispute.funds_withdrawn
 * Funds removed due to dispute
 */
async function handleDisputeFundsWithdrawn(
  supabaseAdmin: any,
  dispute: any
): Promise<void> {
  console.log('💸 Processing charge.dispute.funds_withdrawn:', dispute.id)
  // Log for admin attention
}

/**
 * Handle charge.dispute.funds_reinstated
 * Funds returned after dispute resolution
 */
async function handleDisputeFundsReinstated(
  supabaseAdmin: any,
  dispute: any
): Promise<void> {
  console.log('💰 Processing charge.dispute.funds_reinstated:', dispute.id)
  // Funds reinstated, access should be restored if dispute was won
}

/**
 * Handle customer.subscription.trial_will_end
 * Trial ending soon notification
 */
async function handleTrialWillEnd(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('⏰ Processing subscription.trial_will_end:', subscription.id)
  // Note: User notification should be sent separately via notification system
}

/**
 * Handle customer.subscription.pending_update_applied
 * Subscription plan change applied
 */
async function handleSubscriptionPendingUpdateApplied(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('🔄 Processing subscription.pending_update_applied:', subscription.id)
  await updatePurchaseFromSubscription(supabaseAdmin, await findExistingPurchase(supabaseAdmin, subscription.id) || '', subscription)
}

/**
 * Handle customer.subscription.pending_update_expired
 * Subscription plan change expired
 */
async function handleSubscriptionPendingUpdateExpired(
  supabaseAdmin: any,
  subscription: any
): Promise<void> {
  console.log('⏰ Processing subscription.pending_update_expired:', subscription.id)
  // Plan change failed, keep existing subscription
}

/**
 * Helper: Update purchase from subscription object
 */
async function updatePurchaseFromSubscription(
  supabaseAdmin: any,
  purchaseId: string,
  subscription: any
): Promise<void> {
  if (!purchaseId) return

  const updateData: any = {
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  }

  // Update status based on subscription status
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'cancelled',
    'past_due': 'active', // Keep access during past_due
    'unpaid': 'suspended',
    'incomplete': 'pending',
    'incomplete_expired': 'expired',
    'trialing': 'active',
    'paused': 'suspended'
  }

  if (subscription.status && statusMap[subscription.status]) {
    updateData.status = statusMap[subscription.status]
  }

  // Update periods
  if (subscription.current_period_start) {
    updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
  }
  if (subscription.current_period_end) {
    updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString()
    updateData.expires_at = new Date(subscription.current_period_end * 1000).toISOString()
  }

  // Update trial information
  if (subscription.trial_start) {
    updateData.trial_start = new Date(subscription.trial_start * 1000).toISOString()
    updateData.is_trial = true
  }
  if (subscription.trial_end) {
    updateData.trial_end = new Date(subscription.trial_end * 1000).toISOString()
  }

  // Update cancelled_at if cancelled
  if (subscription.status === 'canceled' && subscription.canceled_at) {
    updateData.cancelled_at = new Date(subscription.canceled_at * 1000).toISOString()
  }

  // Update subscription interval
  if (subscription.items?.data?.[0]?.price?.recurring) {
    const interval = subscription.items.data[0].price.recurring.interval
    updateData.subscription_interval = interval === 'month' ? 'monthly' : 'yearly'
  }

  const { error } = await supabaseAdmin
    .from('product_purchases')
    .update(updateData)
    .eq('id', purchaseId)

  if (error) {
    console.error('❌ Error updating purchase from subscription:', error)
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get IP address for logging
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Debug: Verify secret format (first 10 and last 5 chars only for security)
    console.log('🔍 Debug: Webhook secret from env (first 15 chars):', webhookSecret.substring(0, 15))
    console.log('🔍 Debug: Webhook secret from env (last 5 chars):', webhookSecret.substring(Math.max(0, webhookSecret.length - 5)))
    console.log('🔍 Debug: Webhook secret from env (full length):', webhookSecret.length)

    // Get signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('❌ Missing stripe-signature header')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get raw body for signature verification
    // Critical: Must get the exact raw body string that Stripe signed
    const rawBody = await req.text()

    // Verify webhook signature using Stripe SDK (which also parses the event)
    let event: any
    try {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_dummy'
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia',
      })
      const cryptoProvider = Stripe.createSubtleCryptoProvider()

      // This verifies the signature AND parses the event
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider
      )
      console.log('✅ Webhook signature verified successfully')
    } catch (err: any) {
      console.error('❌ Invalid webhook signature:', err.message)
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'auth',
        'Invalid webhook signature',
        { signature: signature.substring(0, 20) + '...', error: err.message },
        null,
        { ipAddress },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📨 Received Stripe event: ${event.type} (${event.id})`)

    // Route to appropriate handler
    try {
      switch (event.type) {
        // Core purchase/subscription events
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.created':
          await handleSubscriptionCreated(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.paused':
          await handleSubscriptionPaused(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.resumed':
          await handleSubscriptionResumed(supabaseAdmin, event.data.object)
          break

        // Invoice events
        case 'invoice.paid':
          await handleInvoicePaid(supabaseAdmin, event.data.object)
          break

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(supabaseAdmin, event.data.object)
          break

        case 'invoice.payment_action_required':
          await handleInvoicePaymentActionRequired(supabaseAdmin, event.data.object)
          break

        case 'invoice.upcoming':
          await handleInvoiceUpcoming(supabaseAdmin, event.data.object)
          break

        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.finalized':
          await handleInvoiceLifecycle(supabaseAdmin, event.data.object, event.type)
          break

        case 'invoice.voided':
          await handleInvoiceVoided(supabaseAdmin, event.data.object)
          break

        case 'invoice.marked_uncollectible':
          await handleInvoiceMarkedUncollectible(supabaseAdmin, event.data.object)
          break

        // Charge events
        case 'charge.succeeded':
          await handleChargeSucceeded(supabaseAdmin, event.data.object)
          break

        case 'charge.failed':
          await handleChargeFailed(supabaseAdmin, event.data.object)
          break

        case 'charge.refunded':
          await handleChargeRefunded(supabaseAdmin, event.data.object)
          break

        // Refund events
        case 'refund.created':
          await handleRefundCreated(supabaseAdmin, event.data.object)
          break

        case 'refund.failed':
          await handleRefundFailed(supabaseAdmin, event.data.object)
          break

        case 'refund.updated':
          await handleRefundUpdated(supabaseAdmin, event.data.object)
          break

        // Dispute events
        case 'charge.dispute.created':
          await handleDisputeCreated(supabaseAdmin, event.data.object)
          break

        case 'charge.dispute.updated':
          await handleDisputeUpdated(supabaseAdmin, event.data.object)
          break

        case 'charge.dispute.closed':
          await handleDisputeClosed(supabaseAdmin, event.data.object)
          break

        case 'charge.dispute.funds_withdrawn':
          await handleDisputeFundsWithdrawn(supabaseAdmin, event.data.object)
          break

        case 'charge.dispute.funds_reinstated':
          await handleDisputeFundsReinstated(supabaseAdmin, event.data.object)
          break

        // Trial and subscription update events
        case 'customer.subscription.trial_will_end':
          await handleTrialWillEnd(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.pending_update_applied':
          await handleSubscriptionPendingUpdateApplied(supabaseAdmin, event.data.object)
          break

        case 'customer.subscription.pending_update_expired':
          await handleSubscriptionPendingUpdateExpired(supabaseAdmin, event.data.object)
          break

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`)
      }
    } catch (handlerError: any) {
      console.error(`❌ Error handling event ${event.type}:`, handlerError)
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'other',
        `Error handling event ${event.type}`,
        { error: handlerError.message, stack: handlerError.stack, eventType: event.type },
        null,
        { event },
        ipAddress
      )
      // Still return 200 to prevent Stripe from retrying
    }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing webhook:', error)
    
    // Try to log error
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await logError(
        supabaseAdmin,
        'stripe-webhook',
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


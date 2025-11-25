/**
 * Stripe Webhook Handler
 * 
 * Handles all Stripe webhook events for product purchases and subscriptions.
 * Processes checkout completions, subscription lifecycle, invoices, refunds, and disputes.
 * 
 * Events handled (31 total):
 * - Core: checkout.session.completed, subscription.*, invoice.*, charge.*
 * - Refunds: refund.created, refund.failed, refund.updated
 * - Disputes: charge.dispute.*
 * - Payment: charge.succeeded, charge.failed, invoice.payment_action_required
 * - Payment Methods: payment_method.attached, payment_method.detached
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
 * Get the correct Stripe secret key based on mode (test or live)
 */
function getStripeSecretKey(isLiveMode: boolean): string {
  if (isLiveMode) {
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
 * Get a Stripe instance configured with the correct secret key for the given mode
 */
function getStripeInstance(isLiveMode: boolean): Stripe {
  const secretKey = getStripeSecretKey(isLiveMode)
  if (!secretKey) {
    throw new Error(`Stripe secret key not configured for ${isLiveMode ? 'LIVE' : 'TEST'} mode`)
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  })
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
  stripeCustomerId?: string,
  isLiveMode: boolean = false
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
      // Use the correct Stripe key based on mode
      const stripe = getStripeInstance(isLiveMode)
        
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
 * Find product or service by Stripe product ID and optionally price ID
 * Returns object with id and type ('product' or 'service')
 * If multiple items have the same stripe_product_id, prefer matching by price_id
 */
async function findProductOrService(
  supabaseAdmin: any,
  stripeProductId: string,
  stripePriceId?: string
): Promise<{ id: string; type: 'product' | 'service' } | null> {
  // First, try to find in products table
  if (stripePriceId) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('stripe_product_id', stripeProductId)
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle()

    if (product) {
      return { id: product.id, type: 'product' }
    }
  }

  // Try products by product ID only
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, status, created_at')
    .eq('stripe_product_id', stripeProductId)
    .order('status', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (products && products.length > 0) {
    return { id: products[0].id, type: 'product' }
  }

  // If not found in products, try services table
  if (stripePriceId) {
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('id')
      .eq('stripe_product_id', stripeProductId)
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle()

    if (service) {
      return { id: service.id, type: 'service' }
    }
  }

  // Try services by product ID only
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('id, status, created_at')
    .eq('stripe_product_id', stripeProductId)
    .order('status', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (services && services.length > 0) {
    return { id: services[0].id, type: 'service' }
  }

  return null
}

/**
 * Find product by Stripe product ID and optionally price ID
 * @deprecated Use findProductOrService instead
 */
async function findProduct(
  supabaseAdmin: any,
  stripeProductId: string,
  stripePriceId?: string
): Promise<string | null> {
  const result = await findProductOrService(supabaseAdmin, stripeProductId, stripePriceId)
  return result && result.type === 'product' ? result.id : null
}

/**
 * Check if purchase already exists (idempotency check)
 * Returns purchase ID and table name ('product_purchases' or 'service_purchases')
 */
async function findExistingPurchase(
  supabaseAdmin: any,
  stripeSubscriptionId?: string,
  stripePaymentIntentId?: string,
  stripeInvoiceId?: string
): Promise<{ id: string; table: 'product_purchases' | 'service_purchases' } | null> {
  // Check product_purchases first
  if (stripeSubscriptionId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'product_purchases' }
  }

  if (stripePaymentIntentId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', stripePaymentIntentId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'product_purchases' }
  }

  if (stripeInvoiceId) {
    const { data: purchase } = await supabaseAdmin
      .from('product_purchases')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'product_purchases' }
  }

  // Check service_purchases
  if (stripeSubscriptionId) {
    const { data: purchase } = await supabaseAdmin
      .from('service_purchases')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'service_purchases' }
  }

  if (stripePaymentIntentId) {
    const { data: purchase } = await supabaseAdmin
      .from('service_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', stripePaymentIntentId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'service_purchases' }
  }

  if (stripeInvoiceId) {
    const { data: purchase } = await supabaseAdmin
      .from('service_purchases')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle()
    
    if (purchase) return { id: purchase.id, table: 'service_purchases' }
  }

  return null
}

/**
 * Find existing active purchase by user_id and product_id or service_id
 * Used to handle cases where a user creates a new subscription for the same product/service
 * Returns purchase ID and table name
 */
async function findExistingPurchaseByUserProduct(
  supabaseAdmin: any,
  userId: string,
  itemId: string,
  type: 'product' | 'service'
): Promise<{ id: string; table: 'product_purchases' | 'service_purchases' } | null> {
  const table = type === 'product' ? 'product_purchases' : 'service_purchases'
  const idColumn = type === 'product' ? 'product_id' : 'service_id'
  
  const { data: purchase } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq(idColumn, itemId)
    .eq('status', 'active')
    .order('purchased_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  return purchase ? { id: purchase.id, table } : null
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
  session: any,
  isLiveMode: boolean = false
): Promise<void> {
  console.log('🛒 Processing checkout.session.completed:', session.id)

  const customerEmail = session.customer_details?.email || session.customer_email
  const stripeCustomerId = session.customer as string
  const subscriptionId = session.subscription as string | null
  const paymentIntentId = session.payment_intent as string | null

  // Find user (pass isLiveMode to use correct Stripe key)
  const userId = await findUser(supabaseAdmin, customerEmail, stripeCustomerId, isLiveMode)
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
  const existingPurchase = await findExistingPurchase(
    supabaseAdmin,
    subscriptionId || undefined,
    paymentIntentId || undefined
  )

  if (existingPurchase) {
    console.log('✅ Purchase already exists, skipping:', existingPurchase.id)
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
    console.warn('⚠️ Could not retrieve checkout session (this is normal for payment links):', error.message)
    // Don't return - continue to fallback logic below for payment links
    // Payment links often don't have retrievable checkout sessions after completion
  }

  // If no line items, try to get product info from payment link or payment intent (for payment links)
  // This fallback is critical for payment links where checkout sessions aren't retrievable
  if (lineItems.length === 0) {
    console.log('⚠️ No line items in checkout session, trying payment link and payment intent...')
    try {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY not found')
      }
      const stripe = getStripeInstance(isLiveMode)
      
      // First, try to get product info from payment link if session has one
      if (session.payment_link) {
        try {
          const paymentLinkId = typeof session.payment_link === 'string' 
            ? session.payment_link 
            : session.payment_link.id || session.payment_link
          
          console.log(`🔍 Retrieving payment link: ${paymentLinkId}`)
          const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId)
          
          console.log('🔍 Payment link retrieved:', {
            id: paymentLink.id,
            hasLineItems: !!paymentLink.line_items,
            lineItemsCount: paymentLink.line_items?.data?.length || 0
          })
          
          // Payment links can have line items with product/price info
          if (paymentLink.line_items?.data && paymentLink.line_items.data.length > 0) {
            lineItems = paymentLink.line_items.data.map((item: any) => ({
              price: item.price,
              quantity: item.quantity || 1
            }))
            console.log(`✅ Found ${lineItems.length} line item(s) from payment link`)
          } else if (paymentLink.line_items) {
            // Payment link might have line_items as a list endpoint - retrieve separately
            try {
              const lineItemsList = await stripe.paymentLinks.listLineItems(paymentLinkId, { limit: 10 })
              if (lineItemsList.data && lineItemsList.data.length > 0) {
                lineItems = lineItemsList.data.map((item: any) => ({
                  price: item.price,
                  quantity: item.quantity || 1
                }))
                console.log(`✅ Found ${lineItems.length} line item(s) from payment link list endpoint`)
              }
            } catch (listError: any) {
              console.warn('⚠️ Could not list payment link line items:', listError.message)
            }
          }
        } catch (plError: any) {
          console.warn('⚠️ Could not retrieve payment link:', plError.message)
        }
      }
      
      // If still no line items and we have a payment intent, try that
      if (lineItems.length === 0 && paymentIntentId) {
        // Retrieve with minimal expand (Stripe only allows 4 levels max)
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['invoice', 'latest_charge']
        })
        
        console.log('🔍 Payment intent retrieved:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          hasMetadata: !!paymentIntent.metadata,
          metadataKeys: paymentIntent.metadata ? Object.keys(paymentIntent.metadata) : [],
          hasInvoice: !!paymentIntent.invoice,
          hasLatestCharge: !!paymentIntent.latest_charge
        })
      
        // Try to get product or service from payment intent metadata or invoice
        if (paymentIntent.metadata?.product_id) {
          const item = await findProductOrService(supabaseAdmin, paymentIntent.metadata.product_id, paymentIntent.metadata.price_id)
          if (item) {
            // Create a synthetic line item
            lineItems = [{
              price: {
                id: paymentIntent.metadata.price_id || null,
                product: paymentIntent.metadata.product_id,
                recurring: null
              },
              quantity: parseInt(paymentIntent.metadata.quantity || '1', 10)
            }]
            console.log(`✅ Found ${item.type} from payment intent metadata`)
          }
        }
        
        // If still no line items, try invoice (retrieve separately to avoid expand depth limit)
        if (lineItems.length === 0 && paymentIntent.invoice) {
          try {
            const invoiceId = typeof paymentIntent.invoice === 'string' 
              ? paymentIntent.invoice 
              : paymentIntent.invoice.id || paymentIntent.invoice
            
            const invoice = await stripe.invoices.retrieve(invoiceId, { 
              expand: ['lines.data.price'] // Only 3 levels: lines -> data -> price
            })
            
            if (invoice.lines?.data && invoice.lines.data.length > 0) {
              // Get product ID from price if expanded, otherwise fetch it
              for (const line of invoice.lines.data) {
                if (line.price) {
                  const priceId = typeof line.price === 'string' ? line.price : line.price.id
                  const priceObj = typeof line.price === 'object' ? line.price : await stripe.prices.retrieve(priceId, { expand: ['product'] })
                  const productId = typeof priceObj.product === 'string' ? priceObj.product : priceObj.product?.id
                  
                  if (productId) {
                    lineItems.push({
                      price: {
                        id: priceId,
                        product: productId,
                        recurring: priceObj.recurring || null
                      },
                      quantity: line.quantity || 1
                    })
                  }
                }
              }
              if (lineItems.length > 0) {
                console.log(`✅ Found ${lineItems.length} line item(s) from invoice`)
              }
            }
          } catch (invoiceError: any) {
            console.warn('⚠️ Error retrieving invoice:', invoiceError.message)
          }
        }
        
        // If still no line items, try to get product from charge (for payment links)
        if (lineItems.length === 0 && paymentIntent.latest_charge) {
          try {
            const chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge.id
            
            // Retrieve charge with minimal expand to avoid depth limit
            const charge = await stripe.charges.retrieve(chargeId, {
              expand: ['payment_intent', 'invoice']
            })
            
            console.log('🔍 Charge retrieved:', {
              id: charge.id,
              payment_intent: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id,
              invoice: typeof charge.invoice === 'string' ? charge.invoice : charge.invoice?.id
            })
            
            // Check if charge has product info in its payment_intent metadata
            if (charge.payment_intent && typeof charge.payment_intent === 'object') {
              const pi = charge.payment_intent as any
              if (pi.metadata?.product_id) {
                const item = await findProductOrService(supabaseAdmin, pi.metadata.product_id, pi.metadata.price_id)
                if (item) {
                  lineItems = [{
                    price: {
                      id: pi.metadata.price_id || null,
                      product: pi.metadata.product_id,
                      recurring: null
                    },
                    quantity: parseInt(pi.metadata.quantity || '1', 10)
                  }]
                  console.log(`✅ Found ${item.type} from charge payment intent metadata`)
                }
              }
            }
            
            // Also check if charge invoice has line items
            if (lineItems.length === 0 && charge.invoice && typeof charge.invoice === 'object') {
              const invoice = charge.invoice as any
              if (invoice.lines?.data && invoice.lines.data.length > 0) {
                lineItems = invoice.lines.data.map((line: any) => ({
                  price: line.price,
                  quantity: line.quantity || 1
                }))
                console.log(`✅ Found ${lineItems.length} line item(s) from charge invoice`)
              }
            }
          } catch (chargeError: any) {
            console.warn('⚠️ Could not retrieve charge details:', chargeError.message)
          }
        }
        
        // Last resort: try to get product from payment intent's price if available
        // For payment links created from prices, the payment intent might have the price ID in metadata
        if (lineItems.length === 0 && paymentIntent.amount && paymentIntent.currency) {
          console.log('⚠️ Attempting to find product from payment intent amount...')
          // Try to find products/services by matching the price amount in our database
          // This is a fallback for payment links where we can't get line items
          try {
            const amountInCents = paymentIntent.amount
            const currency = paymentIntent.currency.toUpperCase()
            
            // Query services table for matching price
            const { data: services } = await supabaseAdmin
              .from('services')
              .select('id, name, stripe_product_id, stripe_price_id')
              .not('stripe_price_id', 'is', null)
              .eq('status', 'available')
              .limit(10)
            
            if (services && services.length > 0) {
              // Try to match by retrieving price from Stripe and comparing amount
              for (const service of services) {
                if (service.stripe_price_id) {
                  try {
                    const price = await stripe.prices.retrieve(service.stripe_price_id)
                    if (price.unit_amount === amountInCents && price.currency === currency.toLowerCase()) {
                      console.log(`✅ Found matching service by price amount: ${service.name}`)
                      lineItems = [{
                        price: {
                          id: service.stripe_price_id,
                          product: service.stripe_product_id,
                          recurring: price.recurring || null
                        },
                        quantity: 1
                      }]
                      break
                    }
                  } catch (priceError) {
                    // Continue to next service
                    continue
                  }
                }
              }
            }
          } catch (amountError: any) {
            console.warn('⚠️ Error trying to match by amount:', amountError.message)
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching payment link or payment intent:', error.message)
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

  // Get amount from session or payment intent (for payment links, session might not have amount_total)
  let amountTotal = (session.amount_total || 0) / 100 // Convert from cents
  const currency = (session.currency || 'usd').toUpperCase()
  
  // If amount is 0 or missing from session, try to get it from payment intent
  if ((!amountTotal || amountTotal === 0) && paymentIntentId) {
    try {
      const stripe = getStripeInstance(isLiveMode)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (paymentIntent.amount) {
        amountTotal = paymentIntent.amount / 100 // Convert from cents
        console.log(`✅ Using amount from payment intent: ${amountTotal} ${paymentIntent.currency.toUpperCase()}`)
      }
    } catch (piError: any) {
      console.warn('⚠️ Could not retrieve payment intent for amount:', piError.message)
    }
  }

  // Process each line item (support for multiple products in one checkout)
  for (const lineItem of lineItems) {
    const stripePriceId = lineItem.price?.id
    // Handle both expanded product object and product ID string
    const stripeProductId = typeof lineItem.price?.product === 'string' 
      ? lineItem.price.product 
      : lineItem.price?.product?.id
    const quantity = lineItem.quantity || 1

    if (!stripeProductId) {
      console.warn('⚠️ No product ID found in line item')
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'validation',
        'No product ID in line item',
        { sessionId: session.id, lineItem: lineItem },
        userId,
        { event: 'checkout.session.completed', session }
      )
      continue
    }

    // Find product or service (pass price ID for more precise matching)
    const item = await findProductOrService(supabaseAdmin, stripeProductId, stripePriceId)
    if (!item) {
      console.warn(`⚠️ Product or service not found in database. Stripe Product ID: ${stripeProductId}, Price ID: ${stripePriceId}`)
      console.warn(`   Please ensure the product/service exists in your products or services table with stripe_product_id = '${stripeProductId}' and stripe_price_id = '${stripePriceId}'`)
      await logError(
        supabaseAdmin,
        'stripe-webhook',
        'validation',
        'Product or service not found for checkout session',
        { 
          sessionId: session.id, 
          stripeProductId,
          message: `Product/service with stripe_product_id '${stripeProductId}' not found in database. Please create the product/service first.`
        },
        userId,
        { event: 'checkout.session.completed', session }
      )
      continue
    }

    const itemId = item.id
    const itemType = item.type
    const purchaseTable = itemType === 'product' ? 'product_purchases' : 'service_purchases'
    const idColumn = itemType === 'product' ? 'product_id' : 'service_id'

    // Determine purchase type
    const isSubscription = !!subscriptionId
    const isTrial = session.subscription_details?.trial_end ? true : false
    const purchaseType = isTrial ? 'trial' : (isSubscription ? 'subscription' : 'one_time')

    // Determine subscription interval
    let subscriptionInterval: string | null = null
    if (isSubscription) {
      // Try to get interval from price object first
      if (lineItem.price?.recurring) {
      subscriptionInterval = lineItem.price.recurring.interval === 'month' ? 'monthly' : 'yearly'
      } else if (subscriptionId) {
        // If price doesn't have recurring info, fetch subscription to get interval
        try {
          const stripe = getStripeInstance(isLiveMode)
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
          })
          if (subscription.items?.data?.[0]?.price?.recurring) {
            subscriptionInterval = subscription.items.data[0].price.recurring.interval === 'month' ? 'monthly' : 'yearly'
            console.log('✅ Fetched subscription interval from subscription object:', subscriptionInterval)
          }
        } catch (error: any) {
          console.warn('⚠️ Error fetching subscription for interval:', error.message)
        }
      }
    }

    // Check for existing purchase first
    const existingPurchase = await findExistingPurchaseByUserProduct(
      supabaseAdmin,
      userId,
      itemId,
      itemType
    )

    // Prepare purchase data
    const purchaseData: any = {
      user_id: userId,
      [idColumn]: itemId, // Use product_id or service_id based on type
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

    // Update existing purchase or create new one
    if (existingPurchase) {
      console.log(`⚠️ Existing active ${itemType} purchase found, updating instead of creating:`, existingPurchase.id)
      const { error: updateError } = await supabaseAdmin
        .from(existingPurchase.table)
        .update(purchaseData)
        .eq('id', existingPurchase.id)

      if (updateError) {
        console.error('❌ Error updating purchase:', updateError)
        await logError(
          supabaseAdmin,
          'stripe-webhook',
          'database',
          'Failed to update purchase record',
          { error: updateError.message, purchaseData, existingPurchase },
          userId,
          { event: 'checkout.session.completed', session }
        )
      } else {
        console.log(`✅ ${itemType} purchase updated:`, existingPurchase.id)
      }
    } else {
      // Create new purchase record
      const { data: purchase, error } = await supabaseAdmin
        .from(purchaseTable)
        .insert(purchaseData)
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating purchase:', error)
        // If duplicate key error, try to find and update existing purchase
        if (error.code === '23505') {
          const existingId = await findExistingPurchaseByUserProduct(
            supabaseAdmin,
            userId,
            itemId,
            itemType
          )
          if (existingId) {
            console.log('✅ Found existing purchase after duplicate error, updating:', existingId.id)
            await supabaseAdmin
              .from(existingId.table)
              .update(purchaseData)
              .eq('id', existingId.id)
          }
        } else {
          await logError(
            supabaseAdmin,
            'stripe-webhook',
            'database',
            'Failed to create purchase record',
            { error: error.message, purchaseData },
            userId,
            { event: 'checkout.session.completed', session }
          )
        }
      } else {
        console.log(`✅ ${itemType} purchase created:`, purchase.id)
      }
    }
  }
}

/**
 * Handle customer.subscription.created
 * Initialize subscription in database
 */
async function handleSubscriptionCreated(
  supabaseAdmin: any,
  subscription: any,
  isLiveMode: boolean = false
): Promise<void> {
  console.log('📅 Processing subscription.created:', subscription.id)

  const stripeCustomerId = subscription.customer as string
  const userId = await findUser(supabaseAdmin, undefined, stripeCustomerId, isLiveMode)

  if (!userId) {
    console.warn('⚠️ User not found for subscription:', stripeCustomerId)
    return
  }

  // Check if purchase already exists
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (existingPurchase) {
    // Update existing purchase with subscription details
    await updatePurchaseFromSubscription(supabaseAdmin, existingPurchase.id, subscription, existingPurchase.table)
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

  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!existingPurchase) {
    console.warn('⚠️ Purchase not found for subscription:', subscription.id)
    return
  }

  await updatePurchaseFromSubscription(supabaseAdmin, existingPurchase.id, subscription, existingPurchase.table)
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

  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!existingPurchase) {
    console.warn('⚠️ Purchase not found for subscription:', subscription.id)
    return
  }

  const purchaseId = existingPurchase.id
  const purchaseTable = existingPurchase.table

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
    .from(purchaseTable)
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

  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!existingPurchase) {
    return
  }

  const { error } = await supabaseAdmin
    .from(existingPurchase.table)
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', existingPurchase.id)

  if (error) {
    console.error('❌ Error updating purchase:', error)
  } else {
    console.log('✅ Purchase marked as suspended:', existingPurchase.id)
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

  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (!existingPurchase) {
    return
  }

  await updatePurchaseFromSubscription(supabaseAdmin, existingPurchase.id, subscription, existingPurchase.table)
}

/**
 * Handle invoice.paid
 * Update payment status and renew subscription periods
 */
async function handleInvoicePaid(
  supabaseAdmin: any,
  invoice: any,
  isLiveMode: boolean = false
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
  let existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)
  
  if (!existingPurchase && subscriptionId) {
    existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId)
  }

  let purchaseId: string | null = existingPurchase ? existingPurchase.id : null
  let purchaseTableToUse: 'product_purchases' | 'service_purchases' | null = existingPurchase ? existingPurchase.table : null

  if (!purchaseId) {
    // Try to create purchase from invoice if it doesn't exist
    // Try to get email from invoice first, then fall back to customer lookup
    const customerEmail = invoice.customer_email || invoice.customer_details?.email
    const userId = await findUser(supabaseAdmin, customerEmail, customerId, isLiveMode)
    
    if (!userId) {
      console.warn('⚠️ User not found for invoice, cannot create purchase:', { customerEmail, customerId })
      return
    }
    
    // Check if invoice has line items (may need to fetch from Stripe)
    let lineItems = invoice.lines?.data || []
    if (lineItems.length === 0) {
      console.log('⚠️ Invoice has no line items in webhook, fetching from Stripe...')
      try {
        const stripe = getStripeInstance(isLiveMode)
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
          const stripe = getStripeInstance(isLiveMode)
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
      
      const item = await findProductOrService(supabaseAdmin, stripeProductId, stripePriceId)
      
      if (!item) {
        console.warn('⚠️ Product or service not found in database:', stripeProductId, stripePriceId)
        return
      }

      const itemId = item.id
      const itemType = item.type
      const purchaseTable = itemType === 'product' ? 'product_purchases' : 'service_purchases'
      const idColumn = itemType === 'product' ? 'product_id' : 'service_id'
      
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
        [idColumn]: itemId, // Use product_id or service_id based on type
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
          const stripe = getStripeInstance(isLiveMode)
          subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
          })
            
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
      }
      
      if (!purchaseData.current_period_start && subscriptionId && invoice.period_start && invoice.period_end) {
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
      }
      
      if (!purchaseData.current_period_start && subscriptionId) {
        console.log('⚠️ No period dates available, will be set by subscription.updated event')
      }

      // Before inserting, check if there's an existing active purchase for this user+item
      // This handles cases where a user creates a new subscription for the same product/service
      const existingPurchase = await findExistingPurchaseByUserProduct(
        supabaseAdmin,
        userId,
        itemId,
        itemType
      )

      let purchaseTableToUse = purchaseTable // Default to the table we determined
      if (existingPurchase) {
        console.log(`⚠️ Existing active ${itemType} purchase found, will update instead of creating new one:`, existingPurchase.id)
        purchaseId = existingPurchase.id
        purchaseTableToUse = existingPurchase.table // Use the table from existing purchase
        // We'll update this purchase below instead of creating a new one
      } else {
        // Try to create new purchase
        const { data: purchase, error } = await supabaseAdmin
          .from(purchaseTable)
          .insert(purchaseData)
          .select()
          .single()

        if (error) {
          // If duplicate key error, try to find and update existing purchase
          if (error.code === '23505' && error.details?.includes('already exists')) {
            console.log('⚠️ Duplicate key error detected, finding existing purchase to update...')
            const existingId = await findExistingPurchaseByUserProduct(
              supabaseAdmin,
              userId,
              itemId,
              itemType
            )
            if (existingId) {
              console.log('✅ Found existing purchase, will update:', existingId.id)
              purchaseId = existingId.id
              purchaseTableToUse = existingId.table
            } else {
              console.error('❌ Error creating purchase from invoice and could not find existing:', error)
            }
          } else {
            console.error('❌ Error creating purchase from invoice:', error)
          }
        } else {
          console.log(`✅ ${itemType} purchase created from invoice:`, purchase.id)
          purchaseId = purchase.id
          purchaseTableToUse = purchaseTable
        }
      }
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
        const stripe = getStripeInstance(isLiveMode)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price']
        })
        
        // Update subscription interval
        if (subscription.items?.data?.[0]?.price?.recurring) {
          const interval = subscription.items.data[0].price.recurring.interval
          updateData.subscription_interval = interval === 'month' ? 'monthly' : 'yearly'
          console.log('✅ Updated subscription_interval from subscription:', updateData.subscription_interval)
        }
          
          if (subscription.current_period_start && subscription.current_period_end) {
            updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
            let periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
            
            // If period dates are same and we have trial_end, use trial_end
            if (subscription.current_period_start === subscription.current_period_end && subscription.trial_end) {
              periodEnd = new Date(subscription.trial_end * 1000).toISOString()
            }
            
            updateData.current_period_end = periodEnd
        }
      } catch (error: any) {
        console.warn('⚠️ Error fetching subscription for period dates in update:', error.message)
        // Fallback to invoice dates
        if (invoice.period_start && invoice.period_end) {
          updateData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
          updateData.current_period_end = new Date(invoice.period_end * 1000).toISOString()
        }
      }
    }
    
    if (!updateData.current_period_start && invoice.period_start && invoice.period_end) {
      // Fallback to invoice dates if no subscription
      updateData.current_period_start = new Date(invoice.period_start * 1000).toISOString()
      updateData.current_period_end = new Date(invoice.period_end * 1000).toISOString()
    }

    // Determine which table to update - check if purchaseId exists in either table
    let tableToUpdate = purchaseTableToUse || 'product_purchases' // Default fallback
    if (!purchaseTableToUse && purchaseId) {
      // Try to find which table contains this purchase
      const existing = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, paymentIntentId || undefined, invoice.id || undefined)
      if (existing) {
        tableToUpdate = existing.table
      }
    }

    const { error } = await supabaseAdmin
      .from(tableToUpdate)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (!existingPurchase) {
    return
  }

  const purchaseId = existingPurchase.id
  const purchaseTable = existingPurchase.table

  // Get current purchase to check failure count
  const { data: purchase } = await supabaseAdmin
    .from(purchaseTable)
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
      .from(purchaseTable)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (existingPurchase) {
    // Update to pending status while waiting for authentication
    await supabaseAdmin
      .from(existingPurchase.table)
      .update({
        payment_status: 'pending',
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPurchase.id)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (existingPurchase) {
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
      .from(existingPurchase.table)
      .update(updateData)
      .eq('id', existingPurchase.id)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId || undefined, undefined, invoice.id)

  if (existingPurchase) {
    await supabaseAdmin
      .from(existingPurchase.table)
      .update({
        payment_status: 'failed',
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPurchase.id)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)

  if (existingPurchase) {
    await supabaseAdmin
      .from(existingPurchase.table)
      .update({
        payment_status: 'succeeded',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPurchase.id)
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)

  if (existingPurchase) {
    await supabaseAdmin
      .from(existingPurchase.table)
      .update({
        payment_status: 'failed',
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPurchase.id)
  }
}

/**
 * Handle charge.refunded
 * Mark purchases as refunded (handle partial/full)
 */
async function handleChargeRefunded(
  supabaseAdmin: any,
  charge: any,
  isLiveMode: boolean
): Promise<void> {
  console.log('↩️ Processing charge.refunded:', charge.id)

  const paymentIntentId = charge.payment_intent as string | null
  let invoiceId = charge.invoice as string | null
  
  // Try to find purchase by payment_intent_id first (for one-time purchases)
  let existingPurchase = paymentIntentId 
    ? await findExistingPurchase(supabaseAdmin, undefined, paymentIntentId)
    : null

  // If not found and we have payment_intent_id, fetch payment intent to get invoice_id
  if (!existingPurchase && paymentIntentId && !invoiceId) {
    try {
      const stripe = getStripeInstance(isLiveMode)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      invoiceId = paymentIntent.invoice as string | null
      console.log('🔍 Fetched invoice_id from payment intent:', invoiceId)
    } catch (error) {
      console.error('❌ Error fetching payment intent for refund:', error)
    }
  }

  // If we have an invoice, try to find by invoice_id
  if (!existingPurchase && invoiceId) {
    existingPurchase = await findExistingPurchase(supabaseAdmin, undefined, undefined, invoiceId)
    console.log('🔍 Searched by invoice_id:', invoiceId, existingPurchase ? '✅ Found' : '❌ Not found')
  }

  // If still not found and we have an invoice, fetch invoice to get subscription_id
  if (!existingPurchase && invoiceId) {
    try {
      const stripe = getStripeInstance(isLiveMode)
      const invoice = await stripe.invoices.retrieve(invoiceId)
      const subscriptionId = invoice.subscription as string | null
      
      if (subscriptionId) {
        existingPurchase = await findExistingPurchase(supabaseAdmin, subscriptionId)
        console.log('🔍 Searched by subscription_id from invoice:', subscriptionId, existingPurchase ? '✅ Found' : '❌ Not found')
      }
    } catch (error) {
      console.error('❌ Error fetching invoice for refund:', error)
    }
  }

  if (existingPurchase) {
    const purchaseId = existingPurchase.id
    const purchaseTable = existingPurchase.table
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
      .from(purchaseTable)
      .update(updateData)
      .eq('id', purchaseId)
    
    console.log(`✅ Updated ${existingPurchase.table === 'product_purchases' ? 'product' : 'service'} purchase ${purchaseId} for refund: ${isFullRefund ? 'full' : 'partial'}`)
  } else {
    console.warn('⚠️ Purchase not found for refunded charge:', {
      chargeId: charge.id,
      paymentIntentId,
      invoiceId,
      chargeInvoice: charge.invoice,
      chargePaymentIntent: charge.payment_intent
    })
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
  const existingPurchase = await findExistingPurchase(supabaseAdmin, subscription.id)
  if (existingPurchase) {
    await updatePurchaseFromSubscription(supabaseAdmin, existingPurchase.id, subscription, existingPurchase.table)
  }
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
 * Handle payment_method.attached
 * Payment method attached to customer
 */
async function handlePaymentMethodAttached(
  supabaseAdmin: any,
  paymentMethod: any
): Promise<void> {
  console.log('💳 Processing payment_method.attached:', paymentMethod.id)
  
  const customerId = paymentMethod.customer as string | null
  if (!customerId) {
    console.warn('⚠️ Payment method attached but no customer ID:', paymentMethod.id)
    return
  }

  // Log for audit trail
  await logError(
    supabaseAdmin,
    'stripe-webhook',
    'other',
    'Payment method attached to customer',
    {
      paymentMethodId: paymentMethod.id,
      customerId,
      type: paymentMethod.type,
      cardLast4: paymentMethod.card?.last4 || null,
      cardBrand: paymentMethod.card?.brand || null
    },
    null,
    { event: 'payment_method.attached', paymentMethod }
  )

  // Note: Payment methods are managed by Stripe, we just log for audit purposes
  // If needed, we could check for subscriptions that might benefit from this update
}

/**
 * Handle payment_method.detached
 * Payment method removed from customer
 */
async function handlePaymentMethodDetached(
  supabaseAdmin: any,
  paymentMethod: any
): Promise<void> {
  console.log('💳 Processing payment_method.detached:', paymentMethod.id)
  
  const customerId = paymentMethod.customer as string | null
  if (!customerId) {
    console.warn('⚠️ Payment method detached but no customer ID:', paymentMethod.id)
    return
  }

  // Log for audit trail and admin visibility
  await logError(
    supabaseAdmin,
    'stripe-webhook',
    'other',
    'Payment method detached from customer - check subscriptions',
    {
      paymentMethodId: paymentMethod.id,
      customerId,
      type: paymentMethod.type,
      cardLast4: paymentMethod.card?.last4 || null,
      cardBrand: paymentMethod.card?.brand || null
    },
    null,
    { event: 'payment_method.detached', paymentMethod }
  )

  // Note: If this was the default payment method, subscriptions may need attention
  // Stripe will handle retrying with other payment methods if available
}

/**
 * Helper: Update purchase from subscription object
 */
async function updatePurchaseFromSubscription(
  supabaseAdmin: any,
  purchaseId: string,
  subscription: any,
  table: 'product_purchases' | 'service_purchases' = 'product_purchases'
): Promise<void> {
  if (!purchaseId) return

  const updateData: any = {
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  }

  // Check if subscription is paused (via pause_collection field)
  // Stripe sets pause_collection when paused, but status may still be 'active'
  const isPaused = subscription.pause_collection && 
                   subscription.pause_collection.behavior && 
                   subscription.status === 'active'

  // Update status based on subscription status
  const statusMap: Record<string, string> = {
    'active': isPaused ? 'suspended' : 'active', // Override if paused
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
    .from(table)
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
  // Log immediately when request arrives
  console.log('🔔 Webhook request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    hasSignature: !!req.headers.get('stripe-signature')
  })

  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request - returning OK')
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ Invalid method: ${req.method} - expected POST`)
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
    
    console.log('🔍 Processing webhook request:', { ipAddress })

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get webhook secrets for both test and live modes, plus CLI secret for testing
    const webhookSecretTest = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST')
    const webhookSecretLive = Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE')
    const webhookSecretLegacy = Deno.env.get('STRIPE_WEBHOOK_SECRET') // Backward compatibility
    const webhookSecretCLI = Deno.env.get('STRIPE_WEBHOOK_SECRET_CLI') // For Stripe CLI testing
    
    if (!webhookSecretTest && !webhookSecretLive && !webhookSecretLegacy && !webhookSecretCLI) {
      console.error('❌ No webhook secrets configured (STRIPE_WEBHOOK_SECRET_TEST, STRIPE_WEBHOOK_SECRET_LIVE, STRIPE_WEBHOOK_SECRET, or STRIPE_WEBHOOK_SECRET_CLI)')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
    console.log('📥 Reading webhook request body...')
    const rawBody = await req.text()
    console.log(`📦 Request body size: ${rawBody.length} characters`)

    // Verify webhook signature using Stripe SDK (which also parses the event)
    console.log('🔐 Starting signature verification...')
    // Try TEST secret first, then LIVE secret if that fails
    let event: any
    let webhookSecretUsed: string | null = null
    let isLiveMode = false
    
    // Initialize Stripe SDK (we'll update the key after we know the mode)
    const stripeSecretKeyTest = Deno.env.get('STRIPE_SECRET_KEY_TEST')
    const stripeSecretKeyLive = Deno.env.get('STRIPE_SECRET_KEY_LIVE')
    const stripeSecretKeyLegacy = Deno.env.get('STRIPE_SECRET_KEY') // Backward compatibility
    
    const stripe = new Stripe(
      stripeSecretKeyTest || stripeSecretKeyLegacy || 'sk_test_dummy',
      { apiVersion: '2024-11-20.acacia' }
    )
      const cryptoProvider = Stripe.createSubtleCryptoProvider()

    // Try TEST secret first (most common case)
    if (webhookSecretTest || webhookSecretLegacy) {
      const testSecret = webhookSecretTest || webhookSecretLegacy
      try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
          testSecret!,
        undefined,
        cryptoProvider
      )
        webhookSecretUsed = 'TEST'
        isLiveMode = event.livemode === true
        
        // Validate: If event is live mode but we used test secret, that's wrong
        if (isLiveMode && webhookSecretTest) {
          console.warn('⚠️ Warning: Live mode event detected but TEST secret was used. Retrying with LIVE secret...')
          throw new Error('Mode mismatch - event is live but test secret was used')
        }
        
        console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode)`)
    } catch (err: any) {
        // If TEST secret failed, try LIVE secret
        if (webhookSecretLive) {
          try {
            event = await stripe.webhooks.constructEventAsync(
              rawBody,
              signature,
              webhookSecretLive,
              undefined,
              cryptoProvider
            )
            webhookSecretUsed = 'LIVE'
            isLiveMode = event.livemode === true
            
            // Validate: If event is test mode but we used live secret, that's wrong
            if (!isLiveMode && webhookSecretTest) {
              console.warn('⚠️ Warning: Test mode event detected but LIVE secret was used. This should not happen.')
            }
            
            console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode)`)
          } catch (liveErr: any) {
            // TEST and LIVE secrets failed, try CLI secret if available
            if (webhookSecretCLI) {
              try {
                event = await stripe.webhooks.constructEventAsync(
                  rawBody,
                  signature,
                  webhookSecretCLI,
                  undefined,
                  cryptoProvider
                )
                webhookSecretUsed = 'CLI'
                isLiveMode = event.livemode === true
                console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Stripe CLI)`)
              } catch (cliErr: any) {
                // TEST, LIVE, and CLI all failed, try legacy secret if available
                if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretTest) {
                  try {
                    event = await stripe.webhooks.constructEventAsync(
                      rawBody,
                      signature,
                      webhookSecretLegacy,
                      undefined,
                      cryptoProvider
                    )
                    webhookSecretUsed = 'LEGACY'
                    isLiveMode = event.livemode === true
                    console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
                  } catch (legacyErr: any) {
                    // All secrets failed
                    console.error('❌ Invalid webhook signature with all secrets (TEST, LIVE, CLI, LEGACY)')
                    console.error('❌ TEST secret error:', err.message)
                    console.error('❌ LIVE secret error:', liveErr.message)
                    console.error('❌ CLI secret error:', cliErr.message)
                    console.error('❌ LEGACY secret error:', legacyErr.message)
                    await logError(
                      supabaseAdmin,
                      'stripe-webhook',
                      'auth',
                      'Invalid webhook signature (all secrets failed)',
                      { 
                        testError: err.message,
                        liveError: liveErr.message,
                        cliError: cliErr.message,
                        legacyError: legacyErr.message,
                        signature: signature.substring(0, 20) + '...'
                      },
                      null,
                      { ipAddress },
                      ipAddress
                    )
                    return new Response(
                      JSON.stringify({ error: 'Invalid signature' }),
                      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                  }
                } else {
                  // All secrets failed (no legacy to try)
                  console.error('❌ Invalid webhook signature with TEST, LIVE, and CLI secrets')
                  console.error('❌ TEST secret error:', err.message)
                  console.error('❌ LIVE secret error:', liveErr.message)
                  console.error('❌ CLI secret error:', cliErr.message)
                  await logError(
                    supabaseAdmin,
                    'stripe-webhook',
                    'auth',
                    'Invalid webhook signature (TEST, LIVE, CLI secrets failed)',
                    { 
                      testError: err.message,
                      liveError: liveErr.message,
                      cliError: cliErr.message,
                      signature: signature.substring(0, 20) + '...'
                    },
                    null,
                    { ipAddress },
                    ipAddress
                  )
                  return new Response(
                    JSON.stringify({ error: 'Invalid signature' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  )
                }
              }
            } else if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretTest) {
              // TEST and LIVE failed, try legacy secret
              try {
                event = await stripe.webhooks.constructEventAsync(
                  rawBody,
                  signature,
                  webhookSecretLegacy,
                  undefined,
                  cryptoProvider
                )
                webhookSecretUsed = 'LEGACY'
                isLiveMode = event.livemode === true
                console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
              } catch (legacyErr: any) {
                // All secrets failed
                console.error('❌ Invalid webhook signature with TEST, LIVE, and LEGACY secrets')
                console.error('❌ TEST secret error:', err.message)
                console.error('❌ LIVE secret error:', liveErr.message)
                console.error('❌ LEGACY secret error:', legacyErr.message)
                await logError(
                  supabaseAdmin,
                  'stripe-webhook',
                  'auth',
                  'Invalid webhook signature (TEST, LIVE, LEGACY secrets failed)',
                  { 
                    testError: err.message,
                    liveError: liveErr.message,
                    legacyError: legacyErr.message,
                    signature: signature.substring(0, 20) + '...'
                  },
                  null,
                  { ipAddress },
                  ipAddress
                )
                return new Response(
                  JSON.stringify({ error: 'Invalid signature' }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }
            } else {
              // Both TEST and LIVE failed, no CLI or LEGACY to try
              console.error('❌ Invalid webhook signature with both TEST and LIVE secrets')
              console.error('❌ TEST secret error:', err.message)
              console.error('❌ LIVE secret error:', liveErr.message)
              await logError(
                supabaseAdmin,
                'stripe-webhook',
                'auth',
                'Invalid webhook signature (both TEST and LIVE secrets failed)',
                { 
                  testError: err.message,
                  liveError: liveErr.message,
                  signature: signature.substring(0, 20) + '...'
                },
                null,
                { ipAddress },
                ipAddress
              )
              return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        } else {
          // Only TEST secret available and it failed, try CLI or LEGACY if available
          if (webhookSecretCLI) {
            try {
              event = await stripe.webhooks.constructEventAsync(
                rawBody,
                signature,
                webhookSecretCLI,
                undefined,
                cryptoProvider
              )
              webhookSecretUsed = 'CLI'
              isLiveMode = event.livemode === true
              console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Stripe CLI)`)
            } catch (cliErr: any) {
              // TEST and CLI failed, try LEGACY if available
              if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretTest) {
                try {
                  event = await stripe.webhooks.constructEventAsync(
                    rawBody,
                    signature,
                    webhookSecretLegacy,
                    undefined,
                    cryptoProvider
                  )
                  webhookSecretUsed = 'LEGACY'
                  isLiveMode = event.livemode === true
                  console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
                } catch (legacyErr: any) {
                  // All secrets failed
                  console.error('❌ Invalid webhook signature with TEST, CLI, and LEGACY secrets')
                  await logError(
                    supabaseAdmin,
                    'stripe-webhook',
                    'auth',
                    'Invalid webhook signature (all available secrets failed)',
                    { 
                      testError: err.message,
                      cliError: cliErr.message,
                      legacyError: legacyErr.message,
                      signature: signature.substring(0, 20) + '...'
                    },
                    null,
                    { ipAddress },
                    ipAddress
                  )
                  return new Response(
                    JSON.stringify({ error: 'Invalid signature' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  )
                }
              } else {
                // TEST and CLI failed, no LEGACY to try
                console.error('❌ Invalid webhook signature with TEST and CLI secrets')
                await logError(
                  supabaseAdmin,
                  'stripe-webhook',
                  'auth',
                  'Invalid webhook signature',
                  { 
                    testError: err.message,
                    cliError: cliErr.message,
                    signature: signature.substring(0, 20) + '...'
                  },
                  null,
                  { ipAddress },
                  ipAddress
                )
                return new Response(
                  JSON.stringify({ error: 'Invalid signature' }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }
            }
          } else if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretTest) {
            // TEST failed, try LEGACY
            try {
              event = await stripe.webhooks.constructEventAsync(
                rawBody,
                signature,
                webhookSecretLegacy,
                undefined,
                cryptoProvider
              )
              webhookSecretUsed = 'LEGACY'
              isLiveMode = event.livemode === true
              console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
            } catch (legacyErr: any) {
              // TEST and LEGACY both failed
              console.error('❌ Invalid webhook signature with TEST and LEGACY secrets')
              await logError(
                supabaseAdmin,
                'stripe-webhook',
                'auth',
                'Invalid webhook signature',
                { 
                  testError: err.message,
                  legacyError: legacyErr.message,
                  signature: signature.substring(0, 20) + '...'
                },
                null,
                { ipAddress },
                ipAddress
              )
              return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            // Only TEST secret available and it failed, no fallback
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
        }
      }
    } else if (webhookSecretLive) {
      // Only LIVE secret available
      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody,
          signature,
          webhookSecretLive,
          undefined,
          cryptoProvider
        )
        webhookSecretUsed = 'LIVE'
        isLiveMode = event.livemode === true
        console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode)`)
      } catch (err: any) {
        // LIVE failed, try CLI or LEGACY if available
        if (webhookSecretCLI) {
          try {
            event = await stripe.webhooks.constructEventAsync(
              rawBody,
              signature,
              webhookSecretCLI,
              undefined,
              cryptoProvider
            )
            webhookSecretUsed = 'CLI'
            isLiveMode = event.livemode === true
            console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Stripe CLI)`)
          } catch (cliErr: any) {
            // LIVE and CLI failed, try LEGACY if available
            if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretLive) {
              try {
                event = await stripe.webhooks.constructEventAsync(
                  rawBody,
                  signature,
                  webhookSecretLegacy,
                  undefined,
                  cryptoProvider
                )
                webhookSecretUsed = 'LEGACY'
                isLiveMode = event.livemode === true
                console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
              } catch (legacyErr: any) {
                // All secrets failed
                console.error('❌ Invalid webhook signature with LIVE, CLI, and LEGACY secrets')
                await logError(
                  supabaseAdmin,
                  'stripe-webhook',
                  'auth',
                  'Invalid webhook signature',
                  { 
                    liveError: err.message,
                    cliError: cliErr.message,
                    legacyError: legacyErr.message,
                    signature: signature.substring(0, 20) + '...'
                  },
                  null,
                  { ipAddress },
                  ipAddress
                )
                return new Response(
                  JSON.stringify({ error: 'Invalid signature' }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }
            } else {
              // LIVE and CLI failed, no LEGACY to try
              console.error('❌ Invalid webhook signature with LIVE and CLI secrets')
              await logError(
                supabaseAdmin,
                'stripe-webhook',
                'auth',
                'Invalid webhook signature',
                { 
                  liveError: err.message,
                  cliError: cliErr.message,
                  signature: signature.substring(0, 20) + '...'
                },
                null,
                { ipAddress },
                ipAddress
              )
              return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        } else if (webhookSecretLegacy && webhookSecretLegacy !== webhookSecretLive) {
          // LIVE failed, try LEGACY
          try {
            event = await stripe.webhooks.constructEventAsync(
              rawBody,
              signature,
              webhookSecretLegacy,
              undefined,
              cryptoProvider
            )
            webhookSecretUsed = 'LEGACY'
            isLiveMode = event.livemode === true
            console.log(`✅ Webhook signature verified successfully (${webhookSecretUsed} mode - Legacy secret)`)
          } catch (legacyErr: any) {
            // LIVE and LEGACY both failed
            console.error('❌ Invalid webhook signature with LIVE and LEGACY secrets')
            await logError(
              supabaseAdmin,
              'stripe-webhook',
              'auth',
              'Invalid webhook signature',
              { 
                liveError: err.message,
                legacyError: legacyErr.message,
                signature: signature.substring(0, 20) + '...'
              },
              null,
              { ipAddress },
              ipAddress
            )
            return new Response(
              JSON.stringify({ error: 'Invalid signature' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Only LIVE secret available and it failed, no fallback
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
      }
    }

    console.log(`📨 Received Stripe event: ${event.type} (${event.id}) [${isLiveMode ? 'LIVE' : 'TEST'} mode]`)

    // Route to appropriate handler
    // Pass isLiveMode to handlers so they can use the correct Stripe key
    try {
      switch (event.type) {
        // Core purchase/subscription events
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(supabaseAdmin, event.data.object, isLiveMode)
          break

        case 'customer.subscription.created':
          await handleSubscriptionCreated(supabaseAdmin, event.data.object, isLiveMode)
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
          await handleChargeRefunded(supabaseAdmin, event.data.object, isLiveMode)
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

        // Payment method events
        case 'payment_method.attached':
          await handlePaymentMethodAttached(supabaseAdmin, event.data.object)
          break

        case 'payment_method.detached':
          await handlePaymentMethodDetached(supabaseAdmin, event.data.object)
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
    console.log('✅ Webhook processed successfully, returning 200 OK')
    return new Response(
      JSON.stringify({ received: true, eventType: event?.type || 'unknown' }),
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


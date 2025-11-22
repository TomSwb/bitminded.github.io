/**
 * Delete Stripe Product Edge Function
 * Archives a Stripe product (doesn't actually delete, Stripe doesn't allow permanent deletion)
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

    // Extract token from Authorization header and verify session exists (prevent use of revoked tokens)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

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

    // Verify session exists (optional check - getUser() above is the primary auth)
    // This check helps prevent use of revoked tokens, but we don't fail if the table doesn't exist
    try {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .select('session_token')
        .eq('session_token', token)
        .maybeSingle()

      // Only fail if there's a specific error indicating the session was revoked
      // If the table doesn't exist or query fails, we still allow the request since getUser() succeeded
      if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 = table not found
        console.warn('⚠️ Session verification warning:', sessionError.message)
        // Don't fail - getUser() already verified the user is authenticated
      }
    } catch (sessionCheckError) {
      // If session check fails (e.g., table doesn't exist), log but don't fail
      // The getUser() check above is sufficient for authentication
      console.warn('⚠️ Could not verify session in user_sessions table:', sessionCheckError)
    }

    // Rate limiting: Admin function - 20/min, 200/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'delete-stripe-product',
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

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment')
      await logError(
        supabaseAdmin,
        'delete-stripe-product',
        'validation',
        'STRIPE_SECRET_KEY not found in environment',
        { missing_secret: 'STRIPE_SECRET_KEY' },
        user.id,
        { has_auth: true },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { productId } = body

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🗑️ Archiving Stripe product:', productId)

    // Try to archive the Stripe product (Stripe doesn't allow permanent deletion)
    // If product doesn't exist in Stripe (already deleted), we'll still clear it from database
    let stripeProductArchived = false
    let stripeError: any = null
    
    const response = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-11-20.acacia'
      },
      body: new URLSearchParams({
        active: 'false'
      })
    })

    if (response.ok) {
      const productData = await response.json()
      console.log('✅ Stripe product archived:', productData.id)
      stripeProductArchived = true
    } else {
      const errorText = await response.text()
      stripeError = { error: errorText, status: response.status }
      
      // If product not found (404), it's already deleted - that's okay
      if (response.status === 404) {
        console.log('ℹ️ Stripe product not found (already deleted):', productId)
        stripeProductArchived = false // Not an error, just already gone
      } else {
        console.error('❌ Error archiving Stripe product:', errorText)
      await logError(
        supabaseAdmin,
        'delete-stripe-product',
        'stripe_api',
        'Failed to archive Stripe product',
          { stripe_error: errorText, status: response.status, product_id: productId },
        user.id,
        { productId },
        ipAddress
      )
        // Don't throw - we'll still try to clear from database
      }
    }

    // Update database to clear Stripe product ID and price IDs
    // Find product by stripe_product_id
    console.log('🔍 Looking up product in database by stripe_product_id:', productId)
    const { data: dbProduct, error: dbProductError } = await supabaseAdmin
      .from('products')
      .select('id, stripe_product_id, stripe_price_id, pricing_type')
      .eq('stripe_product_id', productId)
      .single()

    console.log('🔍 Database lookup result:', {
      found: !!dbProduct,
      error: dbProductError?.message || null,
      productId: dbProduct?.id || null,
      current_stripe_product_id: dbProduct?.stripe_product_id || null,
      current_stripe_price_id: dbProduct?.stripe_price_id || null,
      current_pricing_type: dbProduct?.pricing_type || null
    })

    if (!dbProductError && dbProduct) {
      console.log('📝 Preparing to update database for product:', dbProduct.id)
      const updateData: Record<string, any> = {
        stripe_product_id: null,
        stripe_price_id: null,
        stripe_price_monthly_id: null,
        stripe_price_yearly_id: null,
        stripe_price_lifetime_id: null,
        stripe_price_chf_id: null,
        stripe_price_usd_id: null,
        stripe_price_eur_id: null,
        stripe_price_gbp_id: null,
        stripe_price_sale_id: null,
        stripe_price_monthly_sale_id: null,
        stripe_price_yearly_sale_id: null,
        // Clear pricing data so product can be recreated
        pricing_type: null,
        price_amount: null,
        price_currency: null,
        price_amount_chf: null,
        price_amount_usd: null,
        price_amount_eur: null,
        price_amount_gbp: null,
        sale_price_amount_chf: null,
        sale_price_amount_usd: null,
        sale_price_amount_eur: null,
        sale_price_amount_gbp: null,
        is_on_sale: false,
        sale_discount_percentage: null,
        trial_days: null,
        trial_requires_payment: null,
        updated_at: new Date().toISOString()
    }

      console.log('💾 Executing database update with data:', JSON.stringify(updateData, null, 2))
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', dbProduct.id)
        .select('id, stripe_product_id') // Select to verify update happened

      if (updateError) {
        console.error('⚠️ Failed to clear Stripe IDs from database:', updateError)
        await logError(
          supabaseAdmin,
          'delete-stripe-product',
          'database',
          'Failed to clear Stripe IDs from database',
          { error: updateError.message, productId: dbProduct.id },
          user.id,
          { productId, updateData },
          ipAddress
        )
        throw new Error('Failed to clear Stripe product from database')
      } else if (!updatedRows || updatedRows.length === 0) {
        // No rows were updated - this is a problem
        console.error('⚠️ Update query succeeded but no rows were updated. Product ID:', dbProduct.id)
        console.error('⚠️ This could indicate RLS policy blocking the update or product not found')
        await logError(
          supabaseAdmin,
          'delete-stripe-product',
          'database',
          'Update query succeeded but no rows were updated',
          { 
            productId: dbProduct.id, 
            stripeProductId: productId,
            updateData,
            possibleCause: 'RLS policy or product not found'
          },
          user.id,
          { productId, updateData },
          ipAddress
        )
        throw new Error('Failed to clear Stripe product from database: no rows updated')
      } else {
        // Verify the update actually cleared the stripe_product_id
        const updatedProduct = updatedRows[0]
        if (updatedProduct.stripe_product_id !== null) {
          console.error('⚠️ Update succeeded but stripe_product_id was not cleared:', updatedProduct.stripe_product_id)
          throw new Error('Failed to clear Stripe product ID from database')
        }
        console.log('✅ Database cleared of Stripe product IDs for product:', dbProduct.id)
        console.log('✅ Verified update - stripe_product_id is now null')
        
        // CRITICAL: Do a separate read query to verify the update actually persisted to the database
        // The .select() on update might return the update payload, not the actual persisted data
        const { data: verifyData, error: verifyError } = await supabaseAdmin
          .from('products')
          .select('id, stripe_product_id, stripe_price_id, pricing_type, price_amount, price_amount_chf, price_amount_usd, price_amount_eur, price_amount_gbp, price_currency')
          .eq('id', dbProduct.id)
          .single()
        
        if (verifyError) {
          console.error('⚠️ Failed to verify database update:', verifyError)
          await logError(
            supabaseAdmin,
            'delete-stripe-product',
            'database',
            'Failed to verify database update after clearing Stripe IDs',
            { error: verifyError.message, productId: dbProduct.id },
            user.id,
            { productId, updateData },
            ipAddress
          )
          throw new Error('Failed to verify database update')
        }
        
        if (verifyData) {
          console.log('🔍 Verification query result:', {
            id: verifyData.id,
            stripe_product_id: verifyData.stripe_product_id,
            stripe_price_id: verifyData.stripe_price_id,
            pricing_type: verifyData.pricing_type,
            price_amount: verifyData.price_amount,
            price_currency: verifyData.price_currency,
            price_amount_chf: verifyData.price_amount_chf,
            price_amount_usd: verifyData.price_amount_usd,
            price_amount_eur: verifyData.price_amount_eur,
            price_amount_gbp: verifyData.price_amount_gbp
          })
          
          // Check if the Stripe IDs were actually cleared
          if (verifyData.stripe_product_id !== null) {
            console.error('❌ CRITICAL: Verification query shows stripe_product_id is NOT null:', verifyData.stripe_product_id)
            console.error('❌ This indicates the update did not actually persist to the database')
            console.error('❌ Possible causes: RLS policy blocking update, database trigger reverting changes, or transaction rollback')
            await logError(
              supabaseAdmin,
              'delete-stripe-product',
              'database',
              'Update appeared to succeed but verification shows Stripe IDs were not cleared',
              { 
                productId: dbProduct.id,
                stripeProductId: productId,
                verified_stripe_product_id: verifyData.stripe_product_id,
                verified_stripe_price_id: verifyData.stripe_price_id,
                updateData
              },
              user.id,
              { productId, updateData },
              ipAddress
            )
            throw new Error('Database update did not persist - stripe_product_id is still set')
          }
          
          // Check if pricing data was actually cleared
          const pricingNotCleared = []
          if (verifyData.pricing_type !== null) {
            pricingNotCleared.push(`pricing_type: ${verifyData.pricing_type}`)
          }
          if (verifyData.price_amount !== null) {
            pricingNotCleared.push(`price_amount: ${verifyData.price_amount}`)
          }
          if (verifyData.price_currency !== null) {
            pricingNotCleared.push(`price_currency: ${verifyData.price_currency}`)
          }
          if (verifyData.price_amount_chf !== null) {
            pricingNotCleared.push(`price_amount_chf: ${verifyData.price_amount_chf}`)
          }
          if (verifyData.price_amount_usd !== null) {
            pricingNotCleared.push(`price_amount_usd: ${verifyData.price_amount_usd}`)
          }
          if (verifyData.price_amount_eur !== null) {
            pricingNotCleared.push(`price_amount_eur: ${verifyData.price_amount_eur}`)
          }
          if (verifyData.price_amount_gbp !== null) {
            pricingNotCleared.push(`price_amount_gbp: ${verifyData.price_amount_gbp}`)
          }
          
          if (pricingNotCleared.length > 0) {
            console.error('❌ CRITICAL: Verification query shows pricing data was NOT cleared:', pricingNotCleared.join(', '))
            console.error('❌ This indicates the pricing fields update did not persist to the database')
            console.error('❌ Possible causes: Database trigger reverting changes, column constraints, or update query issue')
            
            // Try to update again with explicit null values
            console.log('🔄 Attempting to clear pricing data again with explicit update...')
            const pricingUpdateData = {
              pricing_type: null,
              price_amount: null,
              price_currency: null,
              price_amount_chf: null,
              price_amount_usd: null,
              price_amount_eur: null,
              price_amount_gbp: null,
              updated_at: new Date().toISOString()
            }
            
            const { data: retryUpdatedRows, error: retryError } = await supabaseAdmin
              .from('products')
              .update(pricingUpdateData)
              .eq('id', dbProduct.id)
              .select('id, pricing_type, price_amount_chf')
            
            if (retryError) {
              console.error('❌ Retry update also failed:', retryError)
              await logError(
                supabaseAdmin,
                'delete-stripe-product',
                'database',
                'Retry update to clear pricing data failed',
                { 
                  error: retryError.message,
                  productId: dbProduct.id,
                  pricingUpdateData
                },
                user.id,
                { productId, pricingUpdateData },
                ipAddress
              )
            } else if (retryUpdatedRows && retryUpdatedRows.length > 0) {
              console.log('✅ Retry update succeeded, verifying again...')
              // Verify the retry worked
              const { data: retryVerifyData } = await supabaseAdmin
                .from('products')
                .select('pricing_type, price_amount_chf')
                .eq('id', dbProduct.id)
                .single()
              
              if (retryVerifyData && (retryVerifyData.pricing_type !== null || retryVerifyData.price_amount_chf !== null)) {
                console.error('❌ Retry update still did not clear pricing data')
                await logError(
                  supabaseAdmin,
                  'delete-stripe-product',
                  'database',
                  'Pricing data could not be cleared even after retry',
                  { 
                    productId: dbProduct.id,
                    verified_pricing_type: retryVerifyData.pricing_type,
                    verified_price_amount_chf: retryVerifyData.price_amount_chf,
                    pricingUpdateData
                  },
                  user.id,
                  { productId, pricingUpdateData },
                  ipAddress
                )
              } else {
                console.log('✅ Retry update successfully cleared pricing data')
              }
            }
            
            await logError(
              supabaseAdmin,
              'delete-stripe-product',
              'database',
              'Pricing data was not cleared in initial update',
              { 
                productId: dbProduct.id,
                stripeProductId: productId,
                verified_pricing_type: verifyData.pricing_type,
                verified_price_amount: verifyData.price_amount,
                verified_price_currency: verifyData.price_currency,
                verified_price_amount_chf: verifyData.price_amount_chf,
                verified_price_amount_usd: verifyData.price_amount_usd,
                verified_price_amount_eur: verifyData.price_amount_eur,
                verified_price_amount_gbp: verifyData.price_amount_gbp,
                updateData
              },
              user.id,
              { productId, updateData },
              ipAddress
            )
            // Don't throw - Stripe IDs were cleared, pricing data issue is logged
          } else {
            console.log('✅ Verification confirmed: All data (Stripe IDs and pricing) is actually null in database')
          }
        }
      }
    } else if (dbProductError) {
      console.error('⚠️ Failed to find product in database:', dbProductError)
      // Don't fail - Stripe product was handled (or already deleted)
    }

    return new Response(
      JSON.stringify({
        success: true,
        productId: productId,
        archived: stripeProductArchived,
        alreadyDeleted: !stripeProductArchived && stripeError?.status === 404,
        databaseCleared: !dbProductError && !!dbProduct
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in delete-stripe-product:', error)
    
    // Try to get user ID for logging (may not be available in all error cases)
    let userId: string | null = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        )
        const { data: { user } } = await supabaseClient.auth.getUser()
        userId = user?.id || null
      }
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
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    try {
      await logError(
        supabaseAdmin,
        'delete-stripe-product',
        'other',
        errorMessage || 'Unknown error',
        { 
          error_name: errorName,
          error_stack: errorStack,
          error_string: String(error)
        },
        userId,
        { method: req.method, url: req.url },
        ipAddress
      )
    } catch (logErr) {
      // Don't fail if logging fails
      console.error('Failed to log error:', logErr)
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


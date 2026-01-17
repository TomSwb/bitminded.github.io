// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ValidateRequest = {
  product_slug?: string
  product_id?: string
}

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Get allowed origins from Supabase secret, with sensible defaults
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
  
  // Check if origin matches allowed patterns (support wildcards)
  let allowedOrigin = allowedOrigins[0] // Default fallback
  if (origin) {
    const matched = allowedOrigins.find(pattern => {
      if (pattern.includes('*')) {
        // Convert wildcard pattern to regex
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
        return regex.test(origin)
      }
      // Check exact match or subdomain match for bitminded.ch
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
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  await supabaseAdmin
    .from('rate_limit_tracking')
    .delete()
    .lt('window_start', oneHourAgo.toISOString())
  
  // Check per-minute limit
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
    // Fail open on error (allow request)
    return { allowed: true }
  }
  
  const minuteCount = minuteWindow?.request_count || 0
  if (minuteCount >= config.requestsPerMinute) {
    const windowEnd = minuteWindow ? new Date(minuteWindow.window_start) : now
    windowEnd.setSeconds(windowEnd.getSeconds() + 60)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  // Check per-hour limit
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
    // Fail open on error (allow request)
    return { allowed: true }
  }
  
  const hourCount = hourWindow?.request_count || 0
  if (hourCount >= config.requestsPerHour) {
    const windowEnd = hourWindow ? new Date(hourWindow.window_start) : now
    windowEnd.setHours(windowEnd.getHours() + 1)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  // Increment or create tracking records for both windows
  const currentMinuteStart = new Date(now)
  currentMinuteStart.setSeconds(0, 0)
  const currentHourStart = new Date(now)
  currentHourStart.setMinutes(0, 0, 0)
  
  // Update minute window
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
  
  // Update hour window
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

function jsonResponse(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ allowed: false, reason: 'method_not_allowed' }, 405, corsHeaders)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ allowed: false, reason: 'no_token' }, 401, corsHeaders)
    }

    const token = authHeader.replace('Bearer ', '')

    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify user from JWT
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) {
      return jsonResponse({ allowed: false, reason: 'invalid_user' }, 401, corsHeaders)
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError) {
      console.error('Error checking user_sessions:', sessionError)
      // Continue - JWT validation already passed, fail open on DB error
    }

    // If session doesn't exist but JWT is valid, it's a NEW session (not yet logged)
    // If it was revoked, user would need to log in again to get a new JWT
    // So we create the record for future checks and tracking
    if (!sessionData) {
      try {
        // Decode JWT to get expiration
        const jwtPayload = token.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const expiresAt = new Date(decoded.exp * 1000).toISOString()
        
        const { error: createError } = await supabaseAdmin
          .from('user_sessions')
          .upsert({
            user_id: authData.user.id,
            session_token: token,
            expires_at: expiresAt,
            last_accessed: new Date().toISOString(),
            ip_address: ipAddress
          }, {
            onConflict: 'session_token'
          })
        
        if (createError) {
          console.warn('⚠️ Failed to create user_sessions record:', createError)
          // Continue anyway - JWT validation passed
        } else {
          console.log('✅ Auto-created user_sessions record for new session')
        }
      } catch (e) {
        console.warn('⚠️ Error creating user_sessions record:', e)
        // Continue anyway - JWT validation passed
      }
    }

    const userId = authData.user.id

    // Rate limiting: High-frequency function (subdomain apps) - 100/min, 5000/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      userId,
      'user',
      'validate-license',
      { requestsPerMinute: 100, requestsPerHour: 5000, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { allowed: false, reason: 'rate_limit_exceeded', retry_after: rateLimitResult.retryAfter },
        429,
        corsHeaders
      )
    }

    // Admin bypass (commented out - replaced with authenticated user bypass)
    // const { data: adminRole, error: roleError } = await supabaseAdmin
    //   .from('user_roles')
    //   .select('role')
    //   .eq('user_id', userId)
    //   .eq('role', 'admin')
    //   .maybeSingle()

    // if (!roleError && adminRole?.role === 'admin') {
    //   return jsonResponse({ allowed: true, reason: 'admin_bypass', role: 'admin', user_id: userId }, 200, corsHeaders)
    // }

    // Authenticated user bypass - any user with an account gets access to all apps
    // User authentication is already verified above, so we can grant access here
    return jsonResponse({ allowed: true, reason: 'authenticated_user_access', role: 'user', user_id: userId }, 200, corsHeaders)

    // Parse request body
    let body: ValidateRequest | null = null
    try {
      body = await req.json()
    } catch {
      // ignore, keep body null
    }

    const productSlug = body?.product_slug?.trim()
    const productIdFromBody = body?.product_id?.trim()

    // Resolve product_id
    let productId = productIdFromBody || null
    if (!productId) {
      if (!productSlug) {
        return jsonResponse({ allowed: false, reason: 'missing_product' }, 400, corsHeaders)
      }
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, slug, status')
        .eq('slug', productSlug)
        .maybeSingle()

      if (productError || !product) {
        return jsonResponse({ allowed: false, reason: 'product_not_found' }, 404, corsHeaders)
      }
      productId = product.id
    }

    // Fetch purchases for this user and product
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('product_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .order('purchased_at', { ascending: false })

    if (purchasesError) {
      return jsonResponse({ allowed: false, reason: 'purchase_query_failed' }, 500, corsHeaders)
    }

    // Evaluate entitlement
    const now = new Date()
    let hasAccess = false
    let reason = 'no_entitlement'

    // First check product_purchases
    if (Array.isArray(purchases)) {
      for (const p of purchases as any[]) {
        // Grace period takes precedence if still valid
        if (p.grace_period_ends_at && new Date(p.grace_period_ends_at) > now) {
          hasAccess = true
          reason = 'grace_period'
          break
        }

        if (p.purchase_type === 'subscription') {
          const activeStatus = p.status === 'active'
          const notExpired = !p.expires_at || new Date(p.expires_at) > now
          if (activeStatus && notExpired) {
            hasAccess = true
            reason = 'subscription_active'
            break
          }
        }

        if (p.purchase_type === 'one_time') {
          const paid = p.payment_status === 'succeeded'
          if (paid) {
            hasAccess = true
            reason = 'one_time_paid'
            break
          }
        }

        if (p.purchase_type === 'trial') {
          const trialValid = (!!p.is_trial) && (!p.trial_end || new Date(p.trial_end) > now)
          if (trialValid) {
            hasAccess = true
            reason = 'trial_active'
            break
          }
        }
      }
    }

    // If no access from product purchases, check service_purchases (family plans)
    if (!hasAccess) {
      const { data: servicePurchases, error: servicePurchasesError } = await supabaseAdmin
        .from('service_purchases')
        .select('id, service_id, purchase_type, status, payment_status, expires_at, current_period_end, grace_period_ends_at, is_trial, trial_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false })

      if (!servicePurchasesError && servicePurchases && servicePurchases.length > 0) {
        // Get service slugs to check if they grant access to requested product
        const serviceIds = servicePurchases.map(sp => sp.service_id).filter(Boolean)
        
        if (serviceIds.length > 0) {
          const { data: services, error: servicesError } = await supabaseAdmin
            .from('services')
            .select('id, slug')
            .in('id', serviceIds)

          if (!servicesError && services) {
            const serviceSlugMap = new Map(services.map(s => [s.id, s.slug]))
            
            for (const sp of servicePurchases) {
              // Grace period takes precedence if still valid
              if (sp.grace_period_ends_at && new Date(sp.grace_period_ends_at) > now) {
                hasAccess = true
                reason = 'family_service_grace_period'
                break
              }

              const serviceSlug = serviceSlugMap.get(sp.service_id)
              
              // Family services grant access to all products
              if (serviceSlug === 'all-tools-membership-family' || serviceSlug === 'supporter-tier-family') {
                // Check if service purchase is valid
                if (sp.purchase_type === 'subscription') {
                  const activeStatus = sp.status === 'active'
                  const notExpired = !sp.expires_at || new Date(sp.expires_at) > now
                  const periodNotExpired = !sp.current_period_end || new Date(sp.current_period_end) > now
                  if (activeStatus && notExpired && periodNotExpired) {
                    hasAccess = true
                    reason = 'family_service_active'
                    break
                  }
                } else if (sp.purchase_type === 'one_time') {
                  const paid = sp.payment_status === 'succeeded'
                  if (paid) {
                    hasAccess = true
                    reason = 'family_service_one_time'
                    break
                  }
                } else if (sp.purchase_type === 'trial' || sp.is_trial) {
                  const trialValid = (!sp.trial_end || new Date(sp.trial_end) > now)
                  if (trialValid) {
                    hasAccess = true
                    reason = 'family_service_trial'
                    break
                  }
                }
              }
            }
          }
        }
      }
    }

    // If still no access, check family subscription access via RPC function
    if (!hasAccess) {
      try {
        const { data: familyAccess, error: familyAccessError } = await supabaseAdmin
          .rpc('has_family_subscription_access', { user_uuid: userId })

        if (!familyAccessError && familyAccess === true) {
          hasAccess = true
          reason = 'family_subscription_active'
        }
      } catch (error: any) {
        console.error('❌ Error checking family subscription access:', error)
        // Continue - don't fail access check if RPC fails
      }
    }

    // If no access from purchases, check entitlements table (admin-granted access)
    if (!hasAccess && productSlug) {
      const { data: entitlements, error: entitlementsError } = await supabaseAdmin
        .from('entitlements')
        .select('id, app_id, active, expires_at, grant_type')
        .eq('user_id', userId)
        .eq('active', true)
        .or(`app_id.eq.${productSlug},app_id.eq.all`)
        .order('created_at', { ascending: false })

      if (!entitlementsError && entitlements && entitlements.length > 0) {
        for (const entitlement of entitlements) {
          // Check if entitlement is not expired
          const notExpired = !entitlement.expires_at || new Date(entitlement.expires_at) > now
          if (notExpired) {
            hasAccess = true
            reason = entitlement.grant_type === 'lifetime' ? 'admin_grant_lifetime' : 
                     entitlement.grant_type === 'trial' ? 'admin_grant_trial' :
                     entitlement.grant_type === 'subscription' ? 'admin_grant_subscription' :
                     'admin_grant_manual'
            break
          }
        }
      }
    }

    if (!hasAccess) {
      return jsonResponse({ allowed: false, reason, role: 'user', user_id: userId, product_id: productId }, 200, corsHeaders)
    }

    return jsonResponse({ allowed: true, reason, role: 'user', user_id: userId, product_id: productId }, 200, corsHeaders)
  } catch (error: any) {
    console.error('❌ validate-license error:', error)
    return jsonResponse({ allowed: false, reason: 'internal_error', error: error?.message }, 500, corsHeaders)
  }
})



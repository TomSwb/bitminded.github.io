// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ValidateRequest = {
  product_slug?: string
  product_id?: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ allowed: false, reason: 'method_not_allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ allowed: false, reason: 'no_token' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')

    // Parse request body
    let body: ValidateRequest | null = null
    try {
      body = await req.json()
    } catch {
      // ignore, keep body null
    }

    const productSlug = body?.product_slug?.trim()
    const productIdFromBody = body?.product_id?.trim()

    // Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify user from JWT
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) {
      return jsonResponse({ allowed: false, reason: 'invalid_user' }, 401)
    }

    const userId = authData.user.id

    // Admin bypass
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleError && adminRole?.role === 'admin') {
      return jsonResponse({ allowed: true, reason: 'admin_bypass', role: 'admin', user_id: userId })
    }

    // Resolve product_id
    let productId = productIdFromBody || null
    if (!productId) {
      if (!productSlug) {
        return jsonResponse({ allowed: false, reason: 'missing_product' }, 400)
      }
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, slug, status')
        .eq('slug', productSlug)
        .maybeSingle()

      if (productError || !product) {
        return jsonResponse({ allowed: false, reason: 'product_not_found' }, 404)
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
      return jsonResponse({ allowed: false, reason: 'purchase_query_failed' }, 500)
    }

    // Evaluate entitlement
    const now = new Date()
    let hasAccess = false
    let reason = 'no_entitlement'

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

    if (!hasAccess) {
      return jsonResponse({ allowed: false, reason, role: 'user', user_id: userId, product_id: productId }, 200)
    }

    return jsonResponse({ allowed: true, reason, role: 'user', user_id: userId, product_id: productId }, 200)
  } catch (error: any) {
    console.error('❌ validate-license error:', error)
    return jsonResponse({ allowed: false, reason: 'internal_error', error: error?.message }, 500)
  }
})



/**
 * Family Management API Edge Function
 * 
 * Provides REST API endpoints for managing family members with immediate access granting.
 * Enables family admins to add/remove members and grant immediate access (not just on renewal).
 * 
 * Endpoints:
 * - POST /add-member - Add new family member and grant immediate access
 * - POST /remove-member - Remove family member and revoke access
 * - POST /update-member-role - Update member role (admin only)
 * - GET /family-status - Get family group status, members, and subscription details
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

interface AddMemberRequest {
  family_group_id: string
  user_id: string
  role?: string
  relationship?: string
}

interface RemoveMemberRequest {
  family_group_id: string
  user_id: string
}

interface UpdateMemberRoleRequest {
  family_group_id: string
  user_id: string
  new_role: string
}

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
 * Get a Stripe instance configured with the correct secret key for the given mode
 */
function getStripeInstance(isLiveMode?: boolean): Stripe {
  const secretKey = getStripeSecretKey(isLiveMode)
  if (!secretKey) {
    throw new Error(`Stripe secret key not configured for ${isLiveMode !== undefined && isLiveMode ? 'LIVE' : 'TEST'} mode`)
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  })
}

/**
 * Map service slug to plan name
 */
function mapServiceSlugToPlanName(serviceSlug: string): string | null {
  const mapping: Record<string, string> = {
    'all-tools-membership-family': 'family_all_tools',
    'supporter-tier-family': 'family_supporter'
  }
  
  return mapping[serviceSlug] || null
}

/**
 * Map plan name to service slug
 */
function mapPlanNameToServiceSlug(planName: string): string | null {
  const mapping: Record<string, string> = {
    'family_all_tools': 'all-tools-membership-family',
    'family_supporter': 'supporter-tier-family'
  }
  
  return mapping[planName] || null
}

/**
 * Check if user is family admin
 */
async function isFamilyAdmin(
  supabaseAdmin: any,
  userId: string,
  familyGroupId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('family_groups')
    .select('admin_user_id')
    .eq('id', familyGroupId)
    .eq('admin_user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('❌ Error checking family admin:', error)
    return false
  }
  
  return !!data
}

/**
 * Check if user is family member (active)
 */
async function isFamilyMember(
  supabaseAdmin: any,
  userId: string,
  familyGroupId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('family_members')
    .select('id')
    .eq('family_group_id', familyGroupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  
  if (error) {
    console.error('❌ Error checking family member:', error)
    return false
  }
  
  return !!data
}

/**
 * Get family subscription details
 */
async function getFamilySubscriptionDetails(
  supabaseAdmin: any,
  familyGroupId: string
): Promise<{
  familySubscription: any
  service: any
  serviceSlug: string
} | null> {
  // Get family subscription
  const { data: familySubscription, error: subError } = await supabaseAdmin
    .from('family_subscriptions')
    .select('*')
    .eq('family_group_id', familyGroupId)
    .eq('status', 'active')
    .maybeSingle()
  
  if (subError || !familySubscription) {
    console.error('❌ Error fetching family subscription:', subError)
    return null
  }
  
  // Map plan name to service slug
  const serviceSlug = mapPlanNameToServiceSlug(familySubscription.plan_name)
  if (!serviceSlug) {
    console.error('❌ Invalid plan name:', familySubscription.plan_name)
    return null
  }
  
  // Get service
  const { data: service, error: serviceError } = await supabaseAdmin
    .from('services')
    .select('id, slug')
    .eq('slug', serviceSlug)
    .maybeSingle()
  
  if (serviceError || !service) {
    console.error('❌ Error fetching service:', serviceError)
    return null
  }
  
  return {
    familySubscription,
    service,
    serviceSlug
  }
}

/**
 * Grant access to all active family members
 * Creates service_purchases records for each member and updates family_subscriptions
 * (Copied from stripe-webhook/index.ts)
 */
async function grantFamilyAccess(
  supabaseAdmin: any,
  familyGroupId: string,
  serviceId: string,
  serviceSlug: string,
  subscriptionId: string | null,
  stripeCustomerId: string,
  amountTotal: number,
  currency: string,
  subscriptionInterval: string | null,
  currentPeriodStart: string,
  currentPeriodEnd: string | null
): Promise<void> {
  // Get all active family members using database function
  const { data: members, error: membersError } = await supabaseAdmin
    .rpc('get_active_family_members', { family_group_uuid: familyGroupId })
  
  if (membersError) {
    console.error('❌ Error fetching active family members:', membersError)
    throw membersError
  }
  
  if (!members || members.length === 0) {
    console.warn('⚠️ No active family members found for family group:', familyGroupId)
    return
  }
  
  console.log(`✅ Found ${members.length} active family member(s)`)
  
  const perMemberAmount = amountTotal / members.length
  
  // Create or update purchase records for each member
  let createdCount = 0
  let updatedCount = 0
  
  for (const member of members) {
    // Check if member already has an active purchase for this service
    const { data: existingPurchase } = await supabaseAdmin
      .from('service_purchases')
      .select('id')
      .eq('user_id', member.user_id)
      .eq('service_id', serviceId)
      .eq('status', 'active')
      .maybeSingle()

    const purchaseData = {
      user_id: member.user_id,
      service_id: serviceId,
      purchase_type: subscriptionId ? 'subscription' : 'one_time',
      amount_paid: perMemberAmount,
      currency: currency,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
      user_type: 'individual', // Family members are still individuals
      subscription_interval: subscriptionInterval,
      status: 'active',
      payment_status: 'succeeded',
      purchased_at: currentPeriodStart
    }

    if (existingPurchase) {
      // Update existing purchase
      const { error: updateError } = await supabaseAdmin
        .from('service_purchases')
        .update(purchaseData)
        .eq('id', existingPurchase.id)
      
      if (updateError) {
        console.error(`❌ Error updating purchase for member ${member.user_id}:`, updateError)
      } else {
        updatedCount++
      }
    } else {
      // Create new purchase
      const { error: insertError } = await supabaseAdmin
        .from('service_purchases')
        .insert(purchaseData)
      
      if (insertError) {
        console.error(`❌ Error creating purchase for member ${member.user_id}:`, insertError)
      } else {
        createdCount++
      }
    }
  }
  
  console.log(`✅ Processed ${members.length} member(s): ${createdCount} created, ${updatedCount} updated`)
}

// ============================================================================
// Endpoint Handlers
// ============================================================================

/**
 * POST /add-member - Add new family member and grant immediate access
 */
async function handleAddMember(
  supabaseAdmin: any,
  userId: string,
  body: AddMemberRequest,
  ipAddress: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(null)
  
  try {
    // Validate input
    if (!body.family_group_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: family_group_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verify user is family admin
    const isAdmin = await isFamilyAdmin(supabaseAdmin, userId, body.family_group_id)
    if (!isAdmin) {
      await logError(
        supabaseAdmin,
        'family-management',
        'auth',
        'User is not family admin',
        { userId, familyGroupId: body.family_group_id },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only family admin can add members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family subscription details
    const subscriptionDetails = await getFamilySubscriptionDetails(supabaseAdmin, body.family_group_id)
    if (!subscriptionDetails) {
      return new Response(
        JSON.stringify({ error: 'Family subscription not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { familySubscription, service, serviceSlug } = subscriptionDetails
    
    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('family_members')
      .select('id, status')
      .eq('family_group_id', body.family_group_id)
      .eq('user_id', body.user_id)
      .maybeSingle()
    
    if (existingMember && existingMember.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'User is already an active member of this family' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get current active member count
    const { data: activeMembers, error: membersError } = await supabaseAdmin
      .rpc('get_active_family_members', { family_group_uuid: body.family_group_id })
    
    if (membersError) {
      console.error('❌ Error fetching active members:', membersError)
      await logError(
        supabaseAdmin,
        'family-management',
        'database',
        'Failed to fetch active members',
        { error: membersError.message },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to fetch family members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const currentMemberCount = activeMembers?.length || 0
    const newMemberCount = currentMemberCount + 1
    
    // Get Stripe subscription details
    if (!familySubscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Family subscription has no Stripe subscription ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Determine Stripe mode from environment variable
    const isLiveMode = getStripeMode()
    const stripe = getStripeInstance(isLiveMode)
    
    let stripeSubscription: Stripe.Subscription
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(familySubscription.stripe_subscription_id, {
        expand: ['items.data.price']
      })
    } catch (error: any) {
      console.error('❌ Error retrieving Stripe subscription:', error)
      await logError(
        supabaseAdmin,
        'family-management',
        'stripe_api',
        'Failed to retrieve Stripe subscription',
        { error: error.message, subscriptionId: familySubscription.stripe_subscription_id },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve subscription details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const subscriptionQuantity = stripeSubscription.items?.data?.[0]?.quantity || 1
    const subscriptionItemId = stripeSubscription.items?.data?.[0]?.id
    
    // Check if we need to update Stripe subscription quantity
    let updatedQuantity = subscriptionQuantity
    if (subscriptionQuantity < newMemberCount) {
      console.log(`ℹ️ Updating Stripe subscription quantity from ${subscriptionQuantity} to ${newMemberCount}`)
      
      try {
        const updatedSubscription = await stripe.subscriptions.update(familySubscription.stripe_subscription_id, {
          items: [{
            id: subscriptionItemId,
            quantity: newMemberCount
          }],
          proration_behavior: 'create_prorations'
        })
        
        updatedQuantity = updatedSubscription.items?.data?.[0]?.quantity || newMemberCount
        console.log(`✅ Updated Stripe subscription quantity to ${updatedQuantity}`)
      } catch (error: any) {
        console.error('❌ Error updating Stripe subscription:', error)
        await logError(
          supabaseAdmin,
          'family-management',
          'stripe_api',
          'Failed to update Stripe subscription quantity',
          { error: error.message, subscriptionId: familySubscription.stripe_subscription_id },
          userId,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Failed to update subscription quantity' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Add or update family member
    const memberData: any = {
      family_group_id: body.family_group_id,
      user_id: body.user_id,
      role: body.role || 'member',
      relationship: body.relationship || null,
      status: 'active',
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    let memberId: string
    if (existingMember) {
      // Update existing member
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('family_members')
        .update(memberData)
        .eq('id', existingMember.id)
        .select('id')
        .single()
      
      if (updateError) {
        console.error('❌ Error updating family member:', updateError)
        await logError(
          supabaseAdmin,
          'family-management',
          'database',
          'Failed to update family member',
          { error: updateError.message },
          userId,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Failed to update family member' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      memberId = updated.id
    } else {
      // Create new member
      const { data: created, error: createError } = await supabaseAdmin
        .from('family_members')
        .insert(memberData)
        .select('id')
        .single()
      
      if (createError) {
        console.error('❌ Error creating family member:', createError)
        await logError(
          supabaseAdmin,
          'family-management',
          'database',
          'Failed to create family member',
          { error: createError.message },
          userId,
          body,
          ipAddress
        )
        return new Response(
          JSON.stringify({ error: 'Failed to create family member' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      memberId = created.id
    }
    
    // Get subscription details for grantFamilyAccess
    const currentPeriodStart = stripeSubscription.current_period_start
      ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
      : new Date().toISOString()
    const currentPeriodEnd = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : null
    
    // Get amount from Stripe subscription
    const price = stripeSubscription.items?.data?.[0]?.price
    const amountTotal = price?.unit_amount ? (price.unit_amount / 100) : 0
    const currency = (price?.currency || 'chf').toUpperCase()
    const subscriptionInterval = price?.recurring?.interval || null
    
    // Grant immediate access to all active members (including the new one)
    try {
      await grantFamilyAccess(
        supabaseAdmin,
        body.family_group_id,
        service.id,
        serviceSlug,
        familySubscription.stripe_subscription_id,
        familySubscription.stripe_customer_id || '',
        amountTotal,
        currency,
        subscriptionInterval,
        currentPeriodStart,
        currentPeriodEnd
      )
      console.log('✅ Granted immediate access to all active family members')
    } catch (error: any) {
      console.error('❌ Error granting family access:', error)
      await logError(
        supabaseAdmin,
        'family-management',
        'database',
        'Failed to grant family access',
        { error: error.message },
        userId,
        body,
        ipAddress
      )
      // Don't fail the request - member is already added, access will be granted on next renewal
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        member_id: memberId,
        access_granted: true,
        subscription_quantity_updated: updatedQuantity !== subscriptionQuantity
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in handleAddMember:', error)
    await logError(
      supabaseAdmin,
      'family-management',
      'other',
      'Unexpected error in handleAddMember',
      { error: error.message, stack: error.stack },
      userId,
      body,
      ipAddress
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * POST /remove-member - Remove family member and revoke access
 */
async function handleRemoveMember(
  supabaseAdmin: any,
  userId: string,
  body: RemoveMemberRequest,
  ipAddress: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(null)
  
  try {
    // Validate input
    if (!body.family_group_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: family_group_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verify user is family admin
    const isAdmin = await isFamilyAdmin(supabaseAdmin, userId, body.family_group_id)
    if (!isAdmin) {
      await logError(
        supabaseAdmin,
        'family-management',
        'auth',
        'User is not family admin',
        { userId, familyGroupId: body.family_group_id },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only family admin can remove members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('family_members')
      .select('id, user_id, role, status')
      .eq('family_group_id', body.family_group_id)
      .eq('user_id', body.user_id)
      .maybeSingle()
    
    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Family member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if trying to remove admin
    const { data: familyGroup } = await supabaseAdmin
      .from('family_groups')
      .select('admin_user_id')
      .eq('id', body.family_group_id)
      .single()
    
    if (familyGroup?.admin_user_id === body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove family admin. Transfer admin role first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family subscription details
    const subscriptionDetails = await getFamilySubscriptionDetails(supabaseAdmin, body.family_group_id)
    if (!subscriptionDetails) {
      return new Response(
        JSON.stringify({ error: 'Family subscription not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { familySubscription, service } = subscriptionDetails
    
    // Revoke access (update service_purchases status to cancelled)
    const { error: revokeError } = await supabaseAdmin
      .from('service_purchases')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', body.user_id)
      .eq('service_id', service.id)
      .eq('status', 'active')
    
    if (revokeError) {
      console.error('❌ Error revoking access:', revokeError)
      // Don't fail - continue with member removal
    } else {
      console.log('✅ Revoked access for member:', body.user_id)
    }
    
    // Get current active member count (before removal)
    const { data: activeMembers, error: membersError } = await supabaseAdmin
      .rpc('get_active_family_members', { family_group_uuid: body.family_group_id })
    
    if (membersError) {
      console.error('❌ Error fetching active members:', membersError)
    }
    
    const currentMemberCount = activeMembers?.length || 0
    const newMemberCount = Math.max(1, currentMemberCount - 1) // At least 1 member (admin)
    
    // Update Stripe subscription quantity (decrease, with proration)
    if (familySubscription.stripe_subscription_id) {
      const isLiveMode = getStripeMode()
      const stripe = getStripeInstance(isLiveMode)
      
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(familySubscription.stripe_subscription_id)
        const subscriptionItemId = stripeSubscription.items?.data?.[0]?.id
        
        if (subscriptionItemId && stripeSubscription.items?.data?.[0]?.quantity && stripeSubscription.items.data[0].quantity > newMemberCount) {
          await stripe.subscriptions.update(familySubscription.stripe_subscription_id, {
            items: [{
              id: subscriptionItemId,
              quantity: newMemberCount
            }],
            proration_behavior: 'create_prorations'
          })
          console.log(`✅ Updated Stripe subscription quantity to ${newMemberCount}`)
        }
      } catch (error: any) {
        console.error('❌ Error updating Stripe subscription:', error)
        await logError(
          supabaseAdmin,
          'family-management',
          'stripe_api',
          'Failed to update Stripe subscription quantity on member removal',
          { error: error.message, subscriptionId: familySubscription.stripe_subscription_id },
          userId,
          body,
          ipAddress
        )
        // Don't fail - member removal continues
      }
    }
    
    // Update family member status to 'removed'
    const { error: updateError } = await supabaseAdmin
      .from('family_members')
      .update({
        status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', member.id)
    
    if (updateError) {
      console.error('❌ Error updating family member status:', updateError)
      await logError(
        supabaseAdmin,
        'family-management',
        'database',
        'Failed to update family member status',
        { error: updateError.message },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to remove family member' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        access_revoked: true,
        member_removed: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in handleRemoveMember:', error)
    await logError(
      supabaseAdmin,
      'family-management',
      'other',
      'Unexpected error in handleRemoveMember',
      { error: error.message, stack: error.stack },
      userId,
      body,
      ipAddress
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * POST /update-member-role - Update member role (admin only)
 */
async function handleUpdateMemberRole(
  supabaseAdmin: any,
  userId: string,
  body: UpdateMemberRoleRequest,
  ipAddress: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(null)
  
  try {
    // Validate input
    if (!body.family_group_id || !body.user_id || !body.new_role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: family_group_id, user_id, new_role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate role
    const validRoles = ['admin', 'parent', 'guardian', 'member', 'child']
    if (!validRoles.includes(body.new_role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verify user is family admin
    const isAdmin = await isFamilyAdmin(supabaseAdmin, userId, body.family_group_id)
    if (!isAdmin) {
      await logError(
        supabaseAdmin,
        'family-management',
        'auth',
        'User is not family admin',
        { userId, familyGroupId: body.family_group_id },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only family admin can update member roles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('family_members')
      .select('id, user_id, role')
      .eq('family_group_id', body.family_group_id)
      .eq('user_id', body.user_id)
      .maybeSingle()
    
    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Family member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Update role
    const { error: updateError } = await supabaseAdmin
      .from('family_members')
      .update({
        role: body.new_role,
        updated_at: new Date().toISOString()
      })
      .eq('id', member.id)
    
    if (updateError) {
      console.error('❌ Error updating member role:', updateError)
      await logError(
        supabaseAdmin,
        'family-management',
        'database',
        'Failed to update member role',
        { error: updateError.message },
        userId,
        body,
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to update member role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        role_updated: true,
        new_role: body.new_role
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in handleUpdateMemberRole:', error)
    await logError(
      supabaseAdmin,
      'family-management',
      'other',
      'Unexpected error in handleUpdateMemberRole',
      { error: error.message, stack: error.stack },
      userId,
      body,
      ipAddress
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET /family-status - Get family group status, members, and subscription details
 */
async function handleFamilyStatus(
  supabaseAdmin: any,
  userId: string,
  familyGroupId: string,
  ipAddress: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(null)
  
  try {
    if (!familyGroupId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: family_group_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verify user is family member (not just admin)
    const isMember = await isFamilyMember(supabaseAdmin, userId, familyGroupId)
    if (!isMember) {
      await logError(
        supabaseAdmin,
        'family-management',
        'auth',
        'User is not family member',
        { userId, familyGroupId },
        userId,
        { family_group_id: familyGroupId },
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only family members can view family status' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family group details
    const { data: familyGroup, error: groupError } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('id', familyGroupId)
      .single()
    
    if (groupError || !familyGroup) {
      return new Response(
        JSON.stringify({ error: 'Family group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get all active members
    const { data: members, error: membersError } = await supabaseAdmin
      .rpc('get_active_family_members', { family_group_uuid: familyGroupId })
    
    if (membersError) {
      console.error('❌ Error fetching active members:', membersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch family members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get subscription details
    const subscriptionDetails = await getFamilySubscriptionDetails(supabaseAdmin, familyGroupId)
    
    let stripeSubscription: any = null
    let availableSlots = 0
    
    if (subscriptionDetails && subscriptionDetails.familySubscription.stripe_subscription_id) {
      // Get Stripe subscription details
      const isLiveMode = getStripeMode()
      const stripe = getStripeInstance(isLiveMode)
      
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          subscriptionDetails.familySubscription.stripe_subscription_id,
          {
            expand: ['items.data.price']
          }
        )
        
        const subscriptionQuantity = stripeSubscription.items?.data?.[0]?.quantity || 0
        const activeMemberCount = members?.length || 0
        availableSlots = Math.max(0, subscriptionQuantity - activeMemberCount)
      } catch (error: any) {
        console.error('❌ Error retrieving Stripe subscription:', error)
        // Don't fail - return what we have
      }
    }
    
    return new Response(
      JSON.stringify({
        family_group: familyGroup,
        members: members || [],
        subscription: subscriptionDetails?.familySubscription || null,
        stripe_subscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          quantity: stripeSubscription.items?.data?.[0]?.quantity || 0,
          current_period_start: stripeSubscription.current_period_start
            ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: stripeSubscription.current_period_end
            ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
            : null
        } : null,
        available_slots: availableSlots
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in handleFamilyStatus:', error)
    await logError(
      supabaseAdmin,
      'family-management',
      'other',
      'Unexpected error in handleFamilyStatus',
      { error: error.message, stack: error.stack },
      userId,
      { family_group_id: familyGroupId },
      ipAddress
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET /my-family-group - Get current user's family group information
 * Returns family_group_id and basic info if user is a member, null otherwise
 */
async function handleMyFamilyGroup(
  supabaseAdmin: any,
  userId: string,
  ipAddress: string,
  origin: string | null
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin)
  
  try {
    // Query family_members to find user's active family group
    // Using supabaseAdmin bypasses RLS, so no recursion issues
    const { data: member, error: memberError } = await supabaseAdmin
      .from('family_members')
      .select('family_group_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    
    if (memberError) {
      console.error('❌ Error fetching user family membership:', memberError)
      await logError(
        supabaseAdmin,
        'family-management',
        'database',
        'Failed to fetch user family membership',
        { error: memberError.message },
        userId,
        {},
        ipAddress
      )
      return new Response(
        JSON.stringify({ error: 'Failed to fetch family membership' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!member) {
      // User is not in any family group
      return new Response(
        JSON.stringify({
          is_member: false,
          family_group_id: null,
          role: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get family group basic info
    const { data: familyGroup, error: groupError } = await supabaseAdmin
      .from('family_groups')
      .select('id, family_name, admin_user_id')
      .eq('id', member.family_group_id)
      .single()
    
    if (groupError || !familyGroup) {
      console.error('❌ Error fetching family group:', groupError)
      // Return member info even if group fetch fails
      return new Response(
        JSON.stringify({
          is_member: true,
          family_group_id: member.family_group_id,
          role: member.role,
          family_name: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        is_member: true,
        family_group_id: member.family_group_id,
        role: member.role,
        family_name: familyGroup.family_name,
        is_admin: familyGroup.admin_user_id === userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in handleMyFamilyGroup:', error)
    await logError(
      supabaseAdmin,
      'family-management',
      'other',
      'Unexpected error in handleMyFamilyGroup',
      { error: error.message, stack: error.stack },
      userId,
      {},
      ipAddress
    )
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Rate limiting: 20 requests/minute, 100 requests/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'family-management',
      { requestsPerMinute: 20, requestsPerHour: 100, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter
        }),
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

    // Route to appropriate handler
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    if (method === 'POST' && path.endsWith('/add-member')) {
      const body = await req.json() as AddMemberRequest
      return await handleAddMember(supabaseAdmin, user.id, body, ipAddress)
    } else if (method === 'POST' && path.endsWith('/remove-member')) {
      const body = await req.json() as RemoveMemberRequest
      return await handleRemoveMember(supabaseAdmin, user.id, body, ipAddress)
    } else if (method === 'POST' && path.endsWith('/update-member-role')) {
      const body = await req.json() as UpdateMemberRoleRequest
      return await handleUpdateMemberRole(supabaseAdmin, user.id, body, ipAddress)
    } else if (method === 'GET' && path.endsWith('/my-family-group')) {
      return await handleMyFamilyGroup(supabaseAdmin, user.id, ipAddress, origin)
    } else if (method === 'GET' && path.endsWith('/family-status')) {
      const familyGroupId = url.searchParams.get('family_group_id')
      return await handleFamilyStatus(supabaseAdmin, user.id, familyGroupId || '', ipAddress)
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error: any) {
    console.error('❌ Error in family-management handler:', error)
    const origin = req.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


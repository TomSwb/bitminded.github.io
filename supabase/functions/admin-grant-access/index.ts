// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification templates for access grants
const NOTIFICATION_TEMPLATES = {
  en: {
    title: 'Access Granted',
    message_template: 'You now have access to {{product}}',
    icon: '🎉'
  },
  es: {
    title: 'Acceso Otorgado',
    message_template: 'Ahora tienes acceso a {{product}}',
    icon: '🎉'
  },
  fr: {
    title: 'Accès Accordé',
    message_template: 'Vous avez maintenant accès à {{product}}',
    icon: '🎉'
  },
  de: {
    title: 'Zugriff Gewährt',
    message_template: 'Sie haben jetzt Zugriff auf {{product}}',
    icon: '🎉'
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with service role key (admin access)
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

    // Verify the requesting user is an admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Authenticated user:', user.id)

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.error('❌ Not an admin:', user.id)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { userId, productId, accessType = 'manual', expiration = null, reason = '', sendNotification = true } = await req.json()

    // Validate required fields
    if (!userId || !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and productId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate accessType
    const validAccessTypes = ['manual', 'trial', 'subscription', 'lifetime']
    if (!validAccessTypes.includes(accessType)) {
      return new Response(
        JSON.stringify({ error: `Invalid accessType. Must be one of: ${validAccessTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate reason for manual grants
    if (accessType === 'manual' && !reason) {
      return new Response(
        JSON.stringify({ error: 'Reason is required for manual access grants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, language')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare expiration date
    let expiresAt = null
    if (expiration) {
      expiresAt = new Date(expiration).toISOString()
    } else if (accessType === 'lifetime') {
      expiresAt = null // Never expires
    }

    console.log('🔍 Checking for existing entitlement with:', { userId, productId, app_id: productId })
    
    // Check if entitlement already exists
    const { data: existingEntitlement } = await supabaseAdmin
      .from('entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('app_id', productId)
      .maybeSingle()

    console.log('🔍 Existing entitlement check result:', existingEntitlement ? 'Found' : 'Not found')

    let entitlement
    if (existingEntitlement) {
      // Update existing entitlement
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('entitlements')
        .update({
          active: true,
          expires_at: expiresAt,
          granted_by: user.id,
          grant_type: accessType,
          grant_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntitlement.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating entitlement:', updateError)
        return new Response(
          JSON.stringify({ error: `Failed to update entitlement: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      entitlement = updated
      console.log('✅ Updated existing entitlement:', { id: entitlement.id, app_id: entitlement.app_id, user_id: entitlement.user_id })
    } else {
      // Create new entitlement
      console.log('📝 Creating new entitlement with app_id:', productId)
      const { data: created, error: createError } = await supabaseAdmin
        .from('entitlements')
        .insert({
          user_id: userId,
          app_id: productId,
          active: true,
          expires_at: expiresAt,
          granted_by: user.id,
          grant_type: accessType,
          grant_reason: reason || null
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating entitlement:', createError)
        return new Response(
          JSON.stringify({ error: `Failed to create entitlement: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      entitlement = created
      console.log('✅ Created new entitlement:', { id: entitlement.id, app_id: entitlement.app_id, user_id: entitlement.user_id, active: entitlement.active })
    }

    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        user_id: userId,
        action: 'grant_access',
        details: {
          userId,
          productId,
          accessType,
          expiration: expiresAt,
          reason,
          entitlementId: entitlement.id
        },
        ip_address: (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null) as string | null
      })

    if (logError) {
      console.error('⚠️ Failed to log admin action:', logError)
      // Don't fail the request if logging fails
    }

    // Send in-app notification if requested
    if (sendNotification) {
      const userLanguage = targetUser.language || 'en'
      const template = NOTIFICATION_TEMPLATES[userLanguage as keyof typeof NOTIFICATION_TEMPLATES] || NOTIFICATION_TEMPLATES.en
      
      // Replace product placeholder
      const message = template.message_template.replace('{{product}}', productId)

      // Create in-app notification
      const { error: notificationError } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'product',
          title: template.title,
          message: message,
          icon: template.icon,
          link: '/account?section=subscriptions',
          read: false
        })

      if (notificationError) {
        console.error('⚠️ Failed to create notification:', notificationError)
        // Don't fail the request if notification fails
      } else {
        console.log('✅ Created in-app notification')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: entitlement,
        message: 'Access granted successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

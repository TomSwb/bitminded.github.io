// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification templates for access regrant
const NOTIFICATION_TEMPLATES = {
  en: {
    title: 'Access Restored',
    message_template: 'Your access to {{product}} has been restored',
    icon: '✅'
  },
  es: {
    title: 'Acceso Restaurado',
    message_template: 'Tu acceso a {{product}} ha sido restaurado',
    icon: '✅'
  },
  fr: {
    title: 'Accès Restauré',
    message_template: 'Votre accès à {{product}} a été restauré',
    icon: '✅'
  },
  de: {
    title: 'Zugriff Wiederhergestellt',
    message_template: 'Ihr Zugriff auf {{product}} wurde wiederhergestellt',
    icon: '✅'
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
    const { entitlementId, reason = '', sendNotification = true } = await req.json()

    // Validate required fields
    if (!entitlementId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: entitlementId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get entitlement
    const { data: entitlement, error: entitlementError } = await supabaseAdmin
      .from('entitlements')
      .select('id, user_id, app_id, active')
      .eq('id', entitlementId)
      .single()

    if (entitlementError || !entitlement) {
      return new Response(
        JSON.stringify({ error: 'Entitlement not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already active
    if (entitlement.active) {
      return new Response(
        JSON.stringify({ error: 'Access is already active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user info for notification
    let targetUser = null
    if (sendNotification) {
      const { data: userData } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, language')
        .eq('id', entitlement.user_id)
        .single()
      
      targetUser = userData
    }

    // Regrant access (set active to true)
    const { data: updatedEntitlement, error: updateError } = await supabaseAdmin
      .from('entitlements')
      .update({
        active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', entitlementId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error regranting entitlement:', updateError)
      return new Response(
        JSON.stringify({ error: `Failed to regrant access: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Regranted access')

    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        user_id: entitlement.user_id,
        action: 'regrant_access',
        details: {
          entitlementId,
          userId: entitlement.user_id,
          productId: entitlement.app_id,
          reason
        },
        ip_address: (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null) as string | null
      })

    if (logError) {
      console.error('⚠️ Failed to log admin action:', logError)
    }

    // Send in-app notification if requested and user found
    if (sendNotification && targetUser) {
      const userLanguage = targetUser.language || 'en'
      const template = NOTIFICATION_TEMPLATES[userLanguage as keyof typeof NOTIFICATION_TEMPLATES] || NOTIFICATION_TEMPLATES.en
      
      // Replace product placeholder
      const message = template.message_template.replace('{{product}}', entitlement.app_id)

      // Create in-app notification
      const { error: notificationError } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: entitlement.user_id,
          type: 'product',
          title: template.title,
          message: message,
          icon: template.icon,
          link: '/account?section=subscriptions',
          read: false
        })

      if (notificationError) {
        console.error('⚠️ Failed to create notification:', notificationError)
      } else {
        console.log('✅ Created in-app notification')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedEntitlement,
        message: 'Access regranted successfully'
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


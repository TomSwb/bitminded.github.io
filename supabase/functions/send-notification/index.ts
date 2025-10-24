import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is admin
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { target_user_id, subject, body, signature_used, language_used } = await req.json()

    // Validate required fields
    if (!target_user_id || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id and body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabaseClient
      .from('user_profiles')
      .select('id, username, language')
      .eq('id', target_user_id)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification record in database
    const { data: communication, error: communicationError } = await supabaseClient
      .from('user_communications')
      .insert({
        user_id: target_user_id,
        admin_id: user.id,
        type: 'notification',
        subject: subject || null,
        body: body,
        signature_used: signature_used || null,
        language_used: language_used || targetUser.language || 'en',
        status: 'delivered' // Notifications are delivered instantly
      })
      .select()
      .single()

    if (communicationError) {
      console.error('Database error:', communicationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create notification record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification in user_notifications table for the notification center
    const { error: notificationError } = await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: target_user_id,
        type: 'announcement',
        title: subject || 'Message from BitMinded',
        message: body,
        icon: '📧',
        read: false
      })

    if (notificationError) {
      console.error('Failed to create user notification:', notificationError)
    }

    // Log admin action
    const { error: logError } = await supabaseClient
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        action: 'notification_sent',
        details: `Sent notification to user: ${targetUser.username}`,
        user_id: target_user_id
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        communication_id: communication.id,
        message: 'Notification sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

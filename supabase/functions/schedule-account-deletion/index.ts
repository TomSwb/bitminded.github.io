import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Schedule Account Deletion Edge Function
 * 
 * Creates a deletion request with 30-day grace period
 * Sends confirmation email and in-app notification
 * 
 * Frontend already verifies password before calling this
 */

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      throw new Error('Unauthorized: Session revoked')
    }

    console.log(`🗑️ Processing deletion request for user: ${user.id}`)

    // Parse request body (optional reason)
    const body = await req.json().catch(() => ({}))
    const { reason, requestIp } = body

    // Check if user already has a pending deletion
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .single()

    if (existingRequest) {
      // User already has a pending deletion
      const daysRemaining = Math.ceil(
        (new Date(existingRequest.scheduled_for).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Deletion already scheduled',
          scheduledFor: existingRequest.scheduled_for,
          daysRemaining
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Delete any old cancelled/completed requests for this user (to avoid unique constraint violation)
    await supabase
      .from('account_deletion_requests')
      .delete()
      .eq('user_id', user.id)
      .in('status', ['cancelled', 'completed'])

    // Calculate scheduled deletion date (30 days from now)
    const requestedAt = new Date()
    const scheduledFor = new Date(requestedAt)
    scheduledFor.setDate(scheduledFor.getDate() + 30)

    console.log(`📅 Scheduled deletion for: ${scheduledFor.toISOString()}`)

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        requested_at: requestedAt.toISOString(),
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
        reason: reason || null,
        requested_from_ip: requestIp || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating deletion request:', insertError)
      throw new Error(`Failed to create deletion request: ${insertError.message}`)
    }

    console.log('✅ Deletion request created:', deletionRequest.id)

    // Generate cancellation URL with token
    const cancelUrl = `https://bitminded.github.io/account?action=cancel-deletion&token=${deletionRequest.cancellation_token}`

    // Format scheduled date for email
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('language')
      .eq('user_id', user.id)
      .single()

    const userLanguage = userPrefs?.language || 'en'
    const scheduledDateFormatted = scheduledFor.toLocaleDateString(userLanguage, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send deletion scheduled email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-deletion-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        type: 'deletion_scheduled',
        data: {
          scheduledDate: scheduledDateFormatted,
          cancelUrl
        }
      })
    })

    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('⚠️ Email send failed:', emailResult)
      // Don't fail the whole request if email fails
    } else {
      console.log('✅ Deletion scheduled email sent')
    }

    // Create in-app notification
    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.id,
        type: 'account',
        title: 'Account Deletion Scheduled',
        message: `Your account will be deleted on ${scheduledDateFormatted}. You can cancel anytime before then.`,
        link: '/account?section=delete',
        icon: '🗑️'
      })
    })

    if (!notificationResponse.ok) {
      console.error('⚠️ Notification creation failed')
      // Don't fail the whole request
    } else {
      console.log('✅ In-app notification created')
    }

    // Calculate days remaining
    const daysRemaining = 30

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion scheduled successfully',
        deletionRequest: {
          id: deletionRequest.id,
          requestedAt: requestedAt.toISOString(),
          scheduledFor: scheduledFor.toISOString(),
          daysRemaining,
          cancellationToken: deletionRequest.cancellation_token
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error scheduling account deletion:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})


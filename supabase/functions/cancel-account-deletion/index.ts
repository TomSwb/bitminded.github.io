import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Cancel Account Deletion Edge Function
 * 
 * Cancels a scheduled account deletion
 * Can be called via:
 * 1. Authenticated user from account page
 * 2. Cancellation token from email link
 * 
 * Sends confirmation email and in-app notification
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body = await req.json()
    const { cancellationToken, cancelIp } = body

    let userId: string | null = null
    let deletionRequest: any = null

    // Method 1: Cancel via token (from email link)
    if (cancellationToken) {
      console.log(`🔑 Cancelling via token: ${cancellationToken}`)

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('cancellation_token', cancellationToken)
        .eq('status', 'scheduled')
        .single()

      if (error || !data) {
        throw new Error('Invalid or expired cancellation token')
      }

      deletionRequest = data
      userId = data.user_id
    } 
    // Method 2: Cancel via auth token (from account page)
    else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Missing authorization or cancellation token')
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        throw new Error('Unauthorized: Invalid token')
      }

      userId = user.id

      // Get user's deletion request
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .single()

      if (error || !data) {
        throw new Error('No pending deletion request found')
      }

      deletionRequest = data
    }

    console.log(`🗑️ Cancelling deletion request for user: ${userId}`)

    // Check if deletion is already past scheduled date
    const scheduledFor = new Date(deletionRequest.scheduled_for)
    if (scheduledFor < new Date()) {
      throw new Error('Deletion request has already been processed')
    }

    // Update deletion request to cancelled
    const { error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_from_ip: cancelIp || null
      })
      .eq('id', deletionRequest.id)

    if (updateError) {
      console.error('❌ Error cancelling deletion request:', updateError)
      throw new Error(`Failed to cancel deletion: ${updateError.message}`)
    }

    console.log('✅ Deletion request cancelled:', deletionRequest.id)

    // Send deletion cancelled email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-deletion-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        type: 'deletion_cancelled',
        data: {}
      })
    })

    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('⚠️ Email send failed:', emailResult)
      // Don't fail the whole request if email fails
    } else {
      console.log('✅ Deletion cancelled email sent')
    }

    // Create in-app notification
    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        type: 'account',
        title: 'Account Deletion Cancelled',
        message: 'Your account deletion has been cancelled. Your account remains active.',
        link: '/account',
        icon: '✅'
      })
    })

    if (!notificationResponse.ok) {
      console.error('⚠️ Notification creation failed')
      // Don't fail the whole request
    } else {
      console.log('✅ In-app notification created')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion cancelled successfully',
        cancelledAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error cancelling account deletion:', error)

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


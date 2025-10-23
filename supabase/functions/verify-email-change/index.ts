import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('🔍 Verify email change function called')
    console.log('🔍 Request method:', req.method)
    console.log('🔍 Request headers:', Object.fromEntries(req.headers.entries()))

    // Parse request body
    const body = await req.json()
    console.log('🔍 Request body:', body)
    
    const { token } = body

    if (!token) {
      console.error('❌ Missing token parameter')
      throw new Error('Missing required parameter: token')
    }

    console.log(`🔍 Verifying email change token: ${token}`)

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the verification record
    const { data: verification, error: verificationError } = await supabase
      .from('email_change_verifications')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (verificationError || !verification) {
      console.error('❌ Invalid or expired token:', verificationError)
      throw new Error('Invalid or expired verification token')
    }

    console.log(`✅ Found valid verification for user: ${verification.user_id}`)
    console.log(`📧 Changing email to: ${verification.new_email}`)

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(verification.user_id)
    
    if (userError || !user) {
      console.error('❌ User not found:', userError)
      throw new Error('User not found')
    }

    // Update the user's email using Supabase Admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      verification.user_id,
      { email: verification.new_email }
    )

    if (updateError) {
      console.error('❌ Failed to update user email:', updateError)
      throw new Error(`Failed to update email: ${updateError.message}`)
    }

    console.log('✅ User email updated successfully')

    // Update email in user_profiles table to keep in sync
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ email: verification.new_email })
      .eq('id', verification.user_id)

    if (profileError) {
      console.warn('⚠️ Failed to update email in user_profiles:', profileError)
    } else {
      console.log('✅ Email updated in user_profiles')
    }

    // Delete the verification record (single use)
    const { error: deleteError } = await supabase
      .from('email_change_verifications')
      .delete()
      .eq('id', verification.id)

    if (deleteError) {
      console.warn('⚠️ Failed to delete verification record:', deleteError)
    } else {
      console.log('✅ Verification record deleted')
    }

    // Log the email change action (optional - don't fail if this doesn't work)
    try {
      await supabase
        .from('admin_activity')
        .insert({
          admin_id: verification.admin_id,
          user_id: verification.user_id,
          action: 'email_changed',
          details: {
            old_email: user.email,
            new_email: verification.new_email,
            timestamp: new Date().toISOString()
          }
        })
      console.log('✅ Email change logged')
    } catch (logError) {
      console.warn('⚠️ Failed to log email change:', logError.message)
      // Don't throw error - admin logging is not critical
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email changed successfully',
        newEmail: verification.new_email,
        oldEmail: user.email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Email change verification failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Email change verification failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

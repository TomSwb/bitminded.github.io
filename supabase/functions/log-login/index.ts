// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogLoginRequest {
  user_id: string
  success: boolean
  failure_reason?: string | null
  user_agent: string
  device_type: string
  browser: string
  os: string
  used_2fa: boolean
  session_id?: string | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase admin client with service role access
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

    // Parse request body
    const body: LogLoginRequest = await req.json()
    
    // Get IP address from headers
    // Priority: x-forwarded-for (most common), cf-connecting-ip (Cloudflare), x-real-ip
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      null

    console.log(`📊 Logging login attempt for user ${body.user_id}`)
    console.log(`   IP: ${ipAddress}`)
    console.log(`   Device: ${body.device_type} • ${body.browser} • ${body.os}`)
    console.log(`   Success: ${body.success}`)
    console.log(`   2FA: ${body.used_2fa}`)
    console.log(`   Session ID: ${body.session_id ? 'captured' : 'none'}`)

    // Insert login activity record
    const { data, error } = await supabaseAdmin
      .from('user_login_activity')
      .insert({
        user_id: body.user_id,
        success: body.success,
        failure_reason: body.failure_reason,
        ip_address: ipAddress,
        user_agent: body.user_agent,
        device_type: body.device_type,
        browser: body.browser,
        os: body.os,
        used_2fa: body.used_2fa,
        session_id: body.session_id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error logging login attempt:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log login attempt' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Login attempt logged successfully')
    
    // If login was successful and has session_id, also create/update user_sessions record
    if (body.success && body.session_id) {
      try {
        console.log('📝 Creating user_sessions record...')
        
        // Decode JWT to get expiration
        const jwtPayload = body.session_id.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const expiresAt = new Date(decoded.exp * 1000).toISOString()
        
        const { error: sessionError } = await supabaseAdmin
          .from('user_sessions')
          .upsert({
            user_id: body.user_id,
            session_token: body.session_id,
            expires_at: expiresAt,
            last_accessed: new Date().toISOString(),
            user_agent: body.user_agent,
            ip_address: ipAddress,
            location: null, // TODO: Add geolocation lookup if needed
            device_type: body.device_type,
            browser: body.browser,
            os: body.os
          }, {
            onConflict: 'session_token'
          })
        
        if (sessionError) {
          console.warn('⚠️ Failed to create user_sessions record:', sessionError)
          // Don't fail the whole request if this fails
        } else {
          console.log('✅ User session record created')
        }
      } catch (e) {
        console.warn('⚠️ Error creating user_sessions record:', e)
        // Don't fail the whole request
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Login attempt logged',
        ip_address: ipAddress 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in log-login function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/log-login' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "user_id": "user-uuid-here",
      "success": true,
      "user_agent": "Mozilla/5.0...",
      "device_type": "Desktop",
      "browser": "Chrome",
      "os": "Linux",
      "used_2fa": false,
      "session_id": "session-token-here"
    }'

*/


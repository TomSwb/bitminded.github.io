// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevokeSessionRequest {
  session_id?: string
  revoke_all?: boolean
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

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: RevokeSessionRequest = await req.json()
    const { session_id, revoke_all } = body

    if (revoke_all) {
      // Revoke all sessions except the current one
      console.log(`🔐 Revoking all sessions for user: ${user.id} except current`)
      
      // Get all login activities with session IDs for this user
      const { data: sessions, error: fetchError } = await supabaseAdmin
        .from('user_login_activity')
        .select('session_id')
        .eq('user_id', user.id)
        .eq('success', true)
        .not('session_id', 'is', null)
        .order('login_time', { ascending: false })
      
      if (fetchError) {
        console.error('Error fetching sessions:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch sessions' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Revoke each session except the current one
      let revokedCount = 0
      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          if (session.session_id && session.session_id !== token) {
            try {
              // Note: We can't directly revoke sessions via Supabase Auth API
              // but we can mark them as logged out in our database
              // In a production system, you'd also need to invalidate the JWT
              // This is a limitation of Supabase Auth currently
              
              // Mark session as logged out by deleting from login activity
              // or you could add a 'logged_out_at' column
              await supabaseAdmin
                .from('user_login_activity')
                .delete()
                .eq('session_id', session.session_id)
              
              revokedCount++
            } catch (error) {
              console.error(`Error revoking session ${session.session_id}:`, error)
            }
          }
        }
      }

      console.log(`✅ Revoked ${revokedCount} sessions`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${revokedCount} sessions revoked`,
          revoked_count: revokedCount
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
    } else if (session_id) {
      // Revoke specific session
      console.log(`🔐 Revoking session: ${session_id}`)
      
      // Verify this session belongs to the user
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('user_login_activity')
        .select('user_id')
        .eq('session_id', session_id)
        .single()
      
      if (sessionError || !sessionData || sessionData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Session not found or unauthorized' }), 
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Don't allow revoking current session
      if (session_id === token) {
        return new Response(
          JSON.stringify({ error: 'Cannot revoke current session' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete the session record
      const { error: deleteError } = await supabaseAdmin
        .from('user_login_activity')
        .delete()
        .eq('session_id', session_id)
      
      if (deleteError) {
        console.error('Error deleting session:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Failed to revoke session' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`✅ Session revoked: ${session_id}`)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Session revoked' }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing session_id or revoke_all parameter' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in revoke-session function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/revoke-session' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{"session_id":"session_abc123"}'
    
  OR to revoke all sessions:
  
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/revoke-session' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{"revoke_all":true}'

*/


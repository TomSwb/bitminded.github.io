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
  target_user_id?: string  // For admin to revoke other user's sessions
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

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
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
    const { session_id, revoke_all, target_user_id } = body
    
    // Determine which user's sessions to revoke
    let targetUserId = user.id
    let isAdminAction = false
    
    // If target_user_id is provided, verify the requester is an admin
    if (target_user_id && target_user_id !== user.id) {
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
      
      if (roleError || !roleData) {
        return new Response(
          JSON.stringify({ error: 'Admin access required to revoke other users sessions' }), 
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      targetUserId = target_user_id
      isAdminAction = true
      console.log(`👑 Admin ${user.id} revoking sessions for user: ${targetUserId}`)
    }

    if (revoke_all) {
      // Revoke all sessions except the current one (unless admin is doing it)
      console.log(`🔐 Revoking all sessions for user: ${targetUserId}`)
      
      // Get all active sessions for this user
      const { data: sessions, error: fetchError } = await supabaseAdmin
        .from('user_sessions')
        .select('session_token')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
      
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

      // Revoke each session except the current one (unless admin is revoking for another user)
      let revokedCount = 0
      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          // If admin is revoking for another user, revoke all their sessions
          // If user is revoking their own, skip current session
          const shouldRevoke = isAdminAction || session.session_token !== token
          
          if (session.session_token && shouldRevoke) {
            try {
              // Delete from user_sessions
              await supabaseAdmin
                .from('user_sessions')
                .delete()
                .eq('session_token', session.session_token)
              
              // Mark as revoked in user_login_activity for history
              await supabaseAdmin
                .from('user_login_activity')
                .update({ revoked_at: new Date().toISOString() })
                .eq('session_id', session.session_token)
                .is('revoked_at', null)
              
              revokedCount++
            } catch (error) {
              console.error(`Error revoking session ${session.session_token}:`, error)
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
      
      // Verify this session belongs to the user or admin is doing it
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('user_login_activity')
        .select('user_id')
        .eq('session_id', session_id)
        .single()
      
      if (sessionError || !sessionData) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // Check if this is an admin action for another user
      if (sessionData.user_id !== user.id) {
        // Verify requester is admin
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
        
        if (roleError || !roleData) {
          return new Response(
            JSON.stringify({ error: 'Admin access required to revoke other users sessions' }), 
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        isAdminAction = true
        console.log(`👑 Admin ${user.id} revoking session for user: ${sessionData.user_id}`)
      }

      // Don't allow user revoking their current session (but admin can revoke any)
      if (!isAdminAction && session_id === token) {
        return new Response(
          JSON.stringify({ error: 'Cannot revoke current session' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete the session from user_sessions table
      const { error: deleteError } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('session_token', session_id)
      
      // Also mark as revoked in user_login_activity for history
      const { error: updateError } = await supabaseAdmin
        .from('user_login_activity')
        .update({ revoked_at: new Date().toISOString() })
        .eq('session_id', session_id)
        .is('revoked_at', null)
      
      if (deleteError) {
        console.error('Error deleting session from user_sessions:', deleteError)
      }
      
      if (updateError) {
        console.error('Error marking session as revoked in login_activity:', updateError)
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


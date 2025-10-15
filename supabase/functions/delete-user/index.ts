// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  user_id: string
  username: string
  reason?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role for privileged operations
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token and get user
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError) {
      console.error('❌ Auth error:', userError)
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${userError.message}` }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!currentUser) {
      console.error('❌ No user found in token')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Authenticated user:', currentUser.id)

    // Verify the current user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.error('❌ User is not an admin:', currentUser.id)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: DeleteUserRequest = await req.json()
    
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent admins from deleting themselves
    if (body.user_id === currentUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🗑️ Admin ${currentUser.id} is deleting user ${body.user_id}`)
    console.log(`   Username: ${body.username}`)
    console.log(`   Reason: ${body.reason || 'Not specified'}`)

    // Get user info before deletion for logging
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, email')
      .eq('id', body.user_id)
      .single()

    // Log the admin action BEFORE deletion (so user_id reference is still valid)
    try {
      await supabaseAdmin
        .from('admin_activity')
        .insert({
          admin_id: currentUser.id,
          user_id: body.user_id,
          action: `Permanently deleted user: ${body.username}`,
          details: {
            username: body.username,
            email: userProfile?.email,
            reason: body.reason,
            deleted_at: new Date().toISOString()
          }
        })
      console.log('✅ Admin action logged')
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError)
      // Continue with deletion even if logging fails
    }

    // Delete the user using admin client
    console.log('🗑️ Calling deleteUser API...')
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(body.user_id)

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError)
      console.error('❌ Delete error details:', JSON.stringify(deleteError, null, 2))
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User deleted successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User "${body.username}" has been permanently deleted`,
        deleted_user_id: body.user_id
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in delete-user function:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }), 
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-user' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "user_id": "user-uuid-here",
      "username": "username-here",
      "reason": "Violation of terms"
    }'

*/


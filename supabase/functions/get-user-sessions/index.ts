// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
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
    const { user_id } = await req.json()
    
    if (!user_id) {
      throw new Error('user_id is required')
    }

    console.log('🔍 Getting sessions for user:', user_id)

    // Get active sessions from user_sessions table (now includes user_agent, ip, etc.)
    const { data: userSessions, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (sessionError) {
      throw sessionError
    }

    // Get active auth.sessions using database function (has proper permissions)
    const { data: authSessions, error: authError } = await supabaseAdmin
      .rpc('get_active_auth_sessions', { user_uuid: user_id })

    if (authError) {
      console.error('❌ Could not query auth.sessions:', authError)
      console.warn('⚠️ Returning all non-revoked sessions without auth.sessions filtering')
      
      // Return all user_sessions without filtering (fallback)
      return new Response(
        JSON.stringify({ 
          sessions: userSessions || [],
          auth_sessions_available: false,
          error_message: authError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 User sessions:', userSessions?.length || 0)
    console.log('📊 Auth sessions:', authSessions?.length || 0)

    // Filter login sessions to only include those with active auth.sessions
    const activeAuthSessions = authSessions?.filter(s => 
      !s.not_after || new Date(s.not_after) > new Date()
    ) || []

    console.log('📊 Active auth sessions:', activeAuthSessions.length)
    console.log('📊 Auth sessions data:', authSessions)

    // Create a Set of active auth session IDs for quick lookup
    const activeAuthSessionIds = new Set(activeAuthSessions.map(s => s.session_id))
    
    console.log('🔍 Active auth session IDs:', Array.from(activeAuthSessionIds))
    
    // Match user_sessions with active auth sessions
    // user_sessions.session_token is the JWT that contains a session_id field
    const activeSessions: any[] = []
    
    if (userSessions) {
      for (const userSession of userSessions) {
        try {
          // Decode JWT to get the actual session_id
          const jwtPayload = userSession.session_token.split('.')[1]
          const decoded = JSON.parse(atob(jwtPayload))
          const actualSessionId = decoded.session_id
          
          console.log('🔍 Checking user_session:', {
            created: userSession.created_at,
            expires: userSession.expires_at,
            decoded_session_id: actualSessionId
          })
          
          // Check if this session exists in active auth.sessions and hasn't expired
          const isExpired = new Date(userSession.expires_at) < new Date()
          
          if (actualSessionId && activeAuthSessionIds.has(actualSessionId) && !isExpired) {
            activeSessions.push(userSession)
            console.log('✅ Active session matched:', actualSessionId)
          } else {
            if (isExpired) {
              console.log('❌ Session expired:', actualSessionId)
            } else {
              console.log('❌ Session not in auth.sessions:', actualSessionId)
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not process user_session:', e)
        }
      }
    }

    console.log('✅ Returning active sessions:', activeSessions.length)
    
    // Clean up stale sessions - delete any user_sessions that don't match auth.sessions
    const staleSessions = userSessions?.filter(us => {
      try {
        const jwtPayload = us.session_token.split('.')[1]
        const decoded = JSON.parse(atob(jwtPayload))
        const actualSessionId = decoded.session_id
        return !activeAuthSessionIds.has(actualSessionId)
      } catch {
        return true // If can't decode, it's stale
      }
    }) || []
    
    if (staleSessions.length > 0) {
      console.log('🧹 Cleaning up', staleSessions.length, 'stale sessions')
      
      for (const staleSession of staleSessions) {
        await supabaseAdmin
          .from('user_sessions')
          .delete()
          .eq('session_token', staleSession.session_token)
      }
    }

    return new Response(
      JSON.stringify({ 
        sessions: activeSessions,
        auth_sessions_available: true,
        total_auth_sessions: activeAuthSessions.length,
        cleaned_stale_sessions: staleSessions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


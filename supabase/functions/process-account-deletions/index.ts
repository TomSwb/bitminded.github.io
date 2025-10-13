import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Process Account Deletions Edge Function
 * 
 * Runs daily via cron job to process scheduled deletions
 * 
 * Flow:
 * 1. Find all deletions past grace period (scheduled_for < NOW)
 * 2. For each account:
 *    - Soft delete user data (set deleted_at timestamps)
 *    - PRESERVE entitlements table (ethical commitment)
 *    - Delete auth.users (cascades automatically)
 *    - Send final email
 *    - Log completion
 * 3. Return count of processed deletions
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
    // Verify this is being called by cron or service role
    const authHeader = req.headers.get('Authorization')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!authHeader || !authHeader.includes(supabaseServiceKey)) {
      throw new Error('Unauthorized: Service role required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🕐 Starting daily account deletion processing...')

    // Find all deletions past grace period
    const now = new Date().toISOString()
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('status', 'scheduled')
      .lt('scheduled_for', now)
      .order('scheduled_for', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch pending deletions: ${fetchError.message}`)
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log('✅ No accounts to delete today')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No deletions to process',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`📋 Found ${pendingDeletions.length} accounts to delete`)

    const results = []

    // Process each deletion
    for (const deletion of pendingDeletions) {
      try {
        console.log(`🗑️ Processing deletion for user: ${deletion.user_id}`)

        // Mark as processing
        await supabase
          .from('account_deletion_requests')
          .update({ status: 'processing' })
          .eq('id', deletion.id)

        // Get user email before deletion
        const { data: { user } } = await supabase.auth.admin.getUserById(deletion.user_id)
        const userEmail = user?.email

        // Get user language for final email
        const { data: userPrefs } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', deletion.user_id)
          .single()

        const userLanguage = userPrefs?.language || 'en'

        // Soft delete user data (set deleted_at timestamp)
        const deletedAt = new Date().toISOString()

        // 1. Soft delete user_preferences
        await supabase
          .from('user_preferences')
          .update({ deleted_at: deletedAt })
          .eq('user_id', deletion.user_id)

        // 2. Soft delete user_notifications
        await supabase
          .from('user_notifications')
          .update({ deleted_at: deletedAt })
          .eq('user_id', deletion.user_id)

        // 3. Soft delete login_activity
        await supabase
          .from('login_activity')
          .update({ deleted_at: deletedAt })
          .eq('user_id', deletion.user_id)

        // 4. Soft delete user_2fa
        await supabase
          .from('user_2fa')
          .update({ deleted_at: deletedAt })
          .eq('user_id', deletion.user_id)

        // 5. Soft delete user_sessions
        await supabase
          .from('user_sessions')
          .update({ deleted_at: deletedAt })
          .eq('user_id', deletion.user_id)

        // 6. Soft delete user_profiles
        await supabase
          .from('user_profiles')
          .update({ deleted_at: deletedAt })
          .eq('id', deletion.user_id)

        console.log('✅ User data soft-deleted')

        // NOTE: entitlements table is NEVER deleted (ethical commitment)
        console.log('🛡️ Entitlements preserved (ethical commitment)')

        // Delete auth.users (this will cascade to tables with ON DELETE CASCADE)
        // But our soft-deleted data is already marked, so we have audit trail
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(deletion.user_id)

        if (deleteAuthError) {
          console.error('⚠️ Error deleting auth user:', deleteAuthError)
          throw deleteAuthError
        }

        console.log('✅ Auth user deleted')

        // Mark deletion request as completed
        await supabase
          .from('account_deletion_requests')
          .update({ 
            status: 'completed',
            processed_at: deletedAt
          })
          .eq('id', deletion.id)

        // Send final deletion completed email (if user email is available)
        if (userEmail) {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-deletion-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: deletion.user_id,
                type: 'deletion_completed',
                data: {
                  userEmail // Send directly since user is deleted
                }
              })
            })

            if (emailResponse.ok) {
              console.log('✅ Final deletion email sent to:', userEmail)
            } else {
              console.error('⚠️ Failed to send final email')
            }
          } catch (emailError) {
            console.error('⚠️ Email error:', emailError)
            // Don't fail the deletion if email fails
          }
        }

        results.push({
          userId: deletion.user_id,
          success: true,
          deletedAt
        })

        console.log(`✅ Successfully deleted account: ${deletion.user_id}`)

      } catch (error) {
        console.error(`❌ Error deleting account ${deletion.user_id}:`, error)
        
        // Mark as failed (keep as scheduled to retry)
        await supabase
          .from('account_deletion_requests')
          .update({ 
            status: 'scheduled',
            notes: `Processing failed: ${error.message}`
          })
          .eq('id', deletion.id)

        results.push({
          userId: deletion.user_id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`✅ Processing complete: ${successCount} succeeded, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deletion processing complete',
        processed: successCount,
        failed: failCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error processing deletions:', error)

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


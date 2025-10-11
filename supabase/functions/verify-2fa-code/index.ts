import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as OTPAuth from "https://esm.sh/otpauth@9.2.3"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  try {
    // Parse request body
    const { userId, code, type = 'totp' } = await req.json()
    
    // Validate required fields
    if (!userId || !code) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'userId and code are required' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Validate code format based on type
    if (type === 'totp' && !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'TOTP code must be 6 digits' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    if (type === 'backup' && !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid backup code format' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's 2FA data from database
    const { data: twoFAData, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret_key, is_enabled, backup_codes')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError || !twoFAData) {
      console.error('Failed to fetch 2FA data:', fetchError)
      
      // Log failed attempt
      await supabase.from('user_2fa_attempts').insert({
        user_id: userId,
        success: false,
        failure_reason: 'No 2FA setup found',
        attempt_type: type,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
      })

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No 2FA setup found for this user' 
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    let isValid = false

    // Verify based on type
    if (type === 'backup') {
      // Verify backup code
      const hashedCode = btoa(code) // Use same encoding as when saving
      const backupCodes = twoFAData.backup_codes || []
      
      // Check if code exists in backup codes
      const codeIndex = backupCodes.indexOf(hashedCode)
      isValid = codeIndex !== -1

      if (isValid) {
        // Remove used backup code from array
        const updatedCodes = backupCodes.filter((_, index) => index !== codeIndex)
        
        await supabase
          .from('user_2fa')
          .update({ 
            backup_codes: updatedCodes,
            last_verified_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        console.log(`Backup code used. Remaining codes: ${updatedCodes.length}`)
      }
    } else {
      // Verify TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: 'BitMinded',
        label: 'BitMinded',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: twoFAData.secret_key
      })

      // Verify the code (allow 1 time window before/after for clock skew)
      const delta = totp.validate({ 
        token: code, 
        window: 1  // Allow ±30 seconds clock skew
      })
      
      isValid = delta !== null

      // If valid, update last_verified_at timestamp
      if (isValid) {
        await supabase
          .from('user_2fa')
          .update({ last_verified_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
    }

    // Log the attempt
    await supabase.from('user_2fa_attempts').insert({
      user_id: userId,
      success: isValid,
      failure_reason: isValid ? null : 'Invalid code',
      attempt_type: type,
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
    })

    // Log verification result (for debugging)
    console.log('2FA verification:', {
      userId,
      success: isValid,
      timestamp: new Date().toISOString()
    })

    // Return verification result
    return new Response(JSON.stringify({ 
      success: isValid,
      message: isValid ? 'Code verified successfully' : 'Invalid code'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error('2FA verification error:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse request body
    const { token } = await req.json()
    
    // Validate token exists
    if (!token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get secret key from environment
    const secret = Deno.env.get('TURNSTILE_SECRET')
    if (!secret) {
      console.error('TURNSTILE_SECRET environment variable not set')
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Server configuration error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify token with Cloudflare Turnstile
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`
    })
    
    const result = await response.json()
    
    // Log verification attempt (for debugging)
    console.log('CAPTCHA verification result:', {
      success: result.success,
      errorCodes: result['error-codes'] || [],
      timestamp: new Date().toISOString()
    })
    
    // Return verification result
    return new Response(JSON.stringify({ 
      success: result.success,
      errorCodes: result['error-codes'] || []
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error('CAPTCHA verification error:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

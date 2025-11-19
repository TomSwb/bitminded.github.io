import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS')
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [
        'https://bitminded.ch',
        'https://www.bitminded.ch',
        'http://localhost',
        'http://127.0.0.1:5501',
        'https://*.github.io'
      ]
  
  let allowedOrigin = allowedOrigins[0]
  if (origin) {
    const matched = allowedOrigins.find(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
        return regex.test(origin)
      }
      if (pattern === 'https://bitminded.ch' || pattern === 'https://www.bitminded.ch') {
        return origin === pattern || origin.endsWith('.bitminded.ch')
      }
      return origin === pattern || origin.startsWith(pattern)
    })
    if (matched) {
      allowedOrigin = origin
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  identifierType: 'user' | 'ip',
  functionName: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  await supabaseAdmin
    .from('rate_limit_tracking')
    .delete()
    .lt('window_start', oneHourAgo.toISOString())
  
  const minuteWindowStart = new Date(now.getTime() - 60 * 1000)
  const { data: minuteWindow, error: minuteError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', minuteWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (minuteError) {
    console.error('Rate limit check error (minute):', minuteError)
    return { allowed: true }
  }
  
  const minuteCount = minuteWindow?.request_count || 0
  if (minuteCount >= config.requestsPerMinute) {
    const windowEnd = minuteWindow ? new Date(minuteWindow.window_start) : now
    windowEnd.setSeconds(windowEnd.getSeconds() + 60)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const hourWindowStart = new Date(now.getTime() - 60 * 60 * 1000)
  const { data: hourWindow, error: hourError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', hourWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (hourError) {
    console.error('Rate limit check error (hour):', hourError)
    return { allowed: true }
  }
  
  const hourCount = hourWindow?.request_count || 0
  if (hourCount >= config.requestsPerHour) {
    const windowEnd = hourWindow ? new Date(hourWindow.window_start) : now
    windowEnd.setHours(windowEnd.getHours() + 1)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const currentMinuteStart = new Date(now)
  currentMinuteStart.setSeconds(0, 0)
  const currentHourStart = new Date(now)
  currentHourStart.setMinutes(0, 0, 0)
  
  if (minuteWindow && minuteWindow.window_start === currentMinuteStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: minuteCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', minuteWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentMinuteStart.toISOString()
      })
  }
  
  if (hourWindow && hourWindow.window_start === currentHourStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: hourCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', hourWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentHourStart.toISOString()
      })
  }
  
  return { allowed: true }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token from Authorization header and verify session exists (prevent use of revoked tokens)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Get IP address for rate limiting fallback
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Create admin client for user_sessions query
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify session exists in user_sessions table (prevent use of revoked tokens)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: Admin email function - 20/min, 500/hour per user
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      'user',
      'send-reactivation-email',
      { requestsPerMinute: 20, requestsPerHour: 500, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      )
    }

    // Parse request body
    const { user_id, reactivation_reason } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target user data
    const { data: targetUser, error: userError } = await supabaseClient
      .from('user_profiles')
      .select('id, username, email, language')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin user data
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('user_profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Translation functions
    function getGreeting(language: string): string {
      const greetings = {
        'en': 'Hello',
        'es': 'Hola',
        'fr': 'Bonjour',
        'de': 'Hallo'
      }
      return greetings[language as keyof typeof greetings] || 'Hello'
    }

    function translateContent(content: string, language: string): string {
      const translations = {
        'en': {
          'account_reactivated': 'Account Reactivated',
          'reactivation_notice': 'Your BitMinded account has been reactivated and you can now access it again.',
          'reason': 'Reason',
          'welcome_back': 'Welcome back to BitMinded!',
          'contact_info': 'If you have any questions, please contact us:',
          'email': 'Email',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Best regards',
          'bitminded_team': 'The BitMinded Team'
        },
        'es': {
          'account_reactivated': 'Cuenta Reactivada',
          'reactivation_notice': 'Su cuenta de BitMinded ha sido reactivada y ahora puede acceder a ella nuevamente.',
          'reason': 'Razón',
          'welcome_back': '¡Bienvenido de vuelta a BitMinded!',
          'contact_info': 'Si tiene alguna pregunta, por favor contáctenos:',
          'email': 'Correo electrónico',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Saludos cordiales',
          'bitminded_team': 'El Equipo de BitMinded'
        },
        'fr': {
          'account_reactivated': 'Compte Réactivé',
          'reactivation_notice': 'Votre compte BitMinded a été réactivé et vous pouvez maintenant y accéder à nouveau.',
          'reason': 'Raison',
          'welcome_back': 'Bon retour sur BitMinded !',
          'contact_info': 'Si vous avez des questions, veuillez nous contacter:',
          'email': 'E-mail',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Cordialement',
          'bitminded_team': "L'Équipe BitMinded"
        },
        'de': {
          'account_reactivated': 'Konto Reaktiviert',
          'reactivation_notice': 'Ihr BitMinded-Konto wurde reaktiviert und Sie können jetzt wieder darauf zugreifen.',
          'reason': 'Grund',
          'welcome_back': 'Willkommen zurück bei BitMinded!',
          'contact_info': 'Falls Sie Fragen haben, kontaktieren Sie uns bitte:',
          'email': 'E-Mail',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Mit freundlichen Grüßen',
          'bitminded_team': 'Das BitMinded Team'
        }
      }

      const langTranslations = translations[language as keyof typeof translations] || translations.en
      return langTranslations[content as keyof typeof langTranslations] || content
    }

    // Get user's language for translation
    const userLanguage = targetUser.language || 'en'
    const greeting = getGreeting(userLanguage)

    // Create email content
    const subject = translateContent('account_reactivated', userLanguage)
    const messageBody = `${greeting} ${targetUser.username},

${translateContent('reactivation_notice', userLanguage)}

${reactivation_reason ? `${translateContent('reason', userLanguage)}: ${reactivation_reason}` : ''}

${translateContent('welcome_back', userLanguage)}

${translateContent('contact_info', userLanguage)}
${translateContent('email', userLanguage)}: ${translateContent('support_email', userLanguage)} / ${translateContent('contact_email', userLanguage)}

${translateContent('regards', userLanguage)},
${translateContent('bitminded_team', userLanguage)}`

    // Send email using Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BitMinded <noreply@bitminded.ch>',
        to: [targetUser.email],
        subject: subject,
        text: messageBody,
        html: `
          <!DOCTYPE html>
          <html lang="${userLanguage}">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 8px;
                  padding: 40px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  font-size: 28px;
                  font-weight: bold;
                  color: #cfde67;
                  margin-bottom: 10px;
                }
                .tagline {
                  color: #666;
                  font-size: 14px;
                }
                .content {
                  margin-bottom: 30px;
                }
                .message-body {
                  font-size: 16px;
                  line-height: 1.7;
                  margin-bottom: 30px;
                  white-space: pre-wrap;
                }
                .success {
                  background: #d1ecf1;
                  border: 1px solid #bee5eb;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .contact-info {
                  background: #e9ecef;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .signature {
                  border-top: 1px solid #eee;
                  padding-top: 20px;
                  font-size: 14px;
                  color: #666;
                  font-style: italic;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  font-size: 12px;
                  color: #666;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">BitMinded</div>
                  <div class="tagline">Professional Digital Solutions</div>
                </div>
                <div class="content">
                  <div class="message-body">
                    <p>${greeting} ${targetUser.username},</p>
                    <p>${translateContent('reactivation_notice', userLanguage)}</p>
                    ${reactivation_reason ? `<div class="success"><strong>${translateContent('reason', userLanguage)}:</strong> ${reactivation_reason}</div>` : ''}
                    <p><strong>${translateContent('welcome_back', userLanguage)}</strong></p>
                    <div class="contact-info">
                      <p><strong>${translateContent('contact_info', userLanguage)}</strong></p>
                      <p><strong>${translateContent('email', userLanguage)}:</strong> ${translateContent('support_email', userLanguage)} / ${translateContent('contact_email', userLanguage)}</p>
                    </div>
                  </div>
                  <div class="signature">${translateContent('bitminded_team', userLanguage)}</div>
                </div>
                <div class="footer">
                  <p>© 2025 BitMinded AG. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendData = await resendResponse.json()

    // Log the action in admin_activity
    const { error: logError } = await supabaseClient
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        action_type: 'reactivate_user_email_sent',
        target_user_id: user_id,
        details: {
          username: targetUser.username,
          email: targetUser.email,
          reactivation_reason: reactivation_reason || 'No reason provided',
          email_id: resendData.id
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reactivation email sent successfully',
        email_id: resendData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in reactivation email function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

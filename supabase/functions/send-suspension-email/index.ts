import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // Parse request body
    const { user_id, suspension_reason } = await req.json()

    if (!user_id || !suspension_reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, suspension_reason' }),
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
          'account_suspended': 'Account Suspended',
          'suspension_notice': 'Your BitMinded account has been suspended.',
          'reason': 'Reason',
          'contact_us': 'Please contact us within the next 7 days to resolve this issue.',
          'deletion_warning': 'Failure to contact us may result in permanent account deletion.',
          'contact_info': 'You can reach us at:',
          'email': 'Email',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Best regards',
          'bitminded_team': 'The BitMinded Team'
        },
        'es': {
          'account_suspended': 'Cuenta Suspendida',
          'suspension_notice': 'Su cuenta de BitMinded ha sido suspendida.',
          'reason': 'Razón',
          'contact_us': 'Por favor contáctenos dentro de los próximos 7 días para resolver este problema.',
          'deletion_warning': 'Si no nos contacta, su cuenta puede ser eliminada permanentemente.',
          'contact_info': 'Puede contactarnos en:',
          'email': 'Correo electrónico',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Saludos cordiales',
          'bitminded_team': 'El Equipo de BitMinded'
        },
        'fr': {
          'account_suspended': 'Compte Suspendu',
          'suspension_notice': 'Votre compte BitMinded a été suspendu.',
          'reason': 'Raison',
          'contact_us': 'Veuillez nous contacter dans les 7 prochains jours pour résoudre ce problème.',
          'deletion_warning': 'Si vous ne nous contactez pas, votre compte pourrait être supprimé définitivement.',
          'contact_info': 'Vous pouvez nous contacter à:',
          'email': 'E-mail',
          'support_email': 'support@bitminded.ch',
          'contact_email': 'contact@bitminded.ch',
          'regards': 'Cordialement',
          'bitminded_team': "L'Équipe BitMinded"
        },
        'de': {
          'account_suspended': 'Konto Gesperrt',
          'suspension_notice': 'Ihr BitMinded-Konto wurde gesperrt.',
          'reason': 'Grund',
          'contact_us': 'Bitte kontaktieren Sie uns innerhalb der nächsten 7 Tage, um dieses Problem zu lösen.',
          'deletion_warning': 'Wenn Sie uns nicht kontaktieren, kann Ihr Konto dauerhaft gelöscht werden.',
          'contact_info': 'Sie können uns erreichen unter:',
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
    const subject = translateContent('account_suspended', userLanguage)
    const messageBody = `${greeting} ${targetUser.username},

${translateContent('suspension_notice', userLanguage)}

${translateContent('reason', userLanguage)}: ${suspension_reason}

${translateContent('contact_us', userLanguage)} ${translateContent('deletion_warning', userLanguage)}

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
                .warning {
                  background: #fff3cd;
                  border: 1px solid #ffeaa7;
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
                    <p>${translateContent('suspension_notice', userLanguage)}</p>
                    <div class="warning">
                      <strong>${translateContent('reason', userLanguage)}:</strong> ${suspension_reason}
                    </div>
                    <p>${translateContent('contact_us', userLanguage)}</p>
                    <p><strong>${translateContent('deletion_warning', userLanguage)}</strong></p>
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
        action_type: 'suspend_user_email_sent',
        target_user_id: user_id,
        details: {
          username: targetUser.username,
          email: targetUser.email,
          suspension_reason: suspension_reason,
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
        message: 'Suspension email sent successfully',
        email_id: resendData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in suspension email function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

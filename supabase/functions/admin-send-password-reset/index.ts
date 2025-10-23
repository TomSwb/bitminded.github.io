import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Admin Send Password Reset Edge Function
 * 
 * Allows admins to send password reset emails to users
 * Uses Resend for email delivery with custom templates
 * Supports: EN, ES, FR, DE
 */

// Email translations for all supported languages
const EMAIL_TRANSLATIONS = {
  en: {
    tagline: 'Professional Digital Solutions',
    footer_notification: 'This is a notification from BitMinded',
    manage_preferences: 'Manage notification preferences',
    copyright: '© 2024 BitMinded. All rights reserved.',
    
    password_reset_request: {
      subject: 'Password Reset Request - BitMinded',
      title: '🔒 Password Reset Request',
      intro: 'An administrator has requested a password reset for your account.',
      details_title: 'Account Details:',
      email: 'Email address:',
      admin_note: 'This request was initiated by an administrator.',
      warning_title: 'Security Notice:',
      warning_text: 'If you did not request this password reset, please contact our support team immediately and do not click the reset link.',
      button: 'Reset Password',
      expires: 'This link expires in 1 hour.',
      instructions: 'Click the button below to reset your password. You will be redirected to a secure page where you can set a new password.'
    }
  },
  
  es: {
    tagline: 'Soluciones Digitales Profesionales',
    footer_notification: 'Esta es una notificación de BitMinded',
    manage_preferences: 'Administrar preferencias de notificación',
    copyright: '© 2024 BitMinded. Todos los derechos reservados.',
    
    password_reset_request: {
      subject: 'Solicitud de Restablecimiento de Contraseña - BitMinded',
      title: '🔒 Solicitud de Restablecimiento de Contraseña',
      intro: 'Un administrador ha solicitado un restablecimiento de contraseña para tu cuenta.',
      details_title: 'Detalles de la Cuenta:',
      email: 'Dirección de correo:',
      admin_note: 'Esta solicitud fue iniciada por un administrador.',
      warning_title: 'Aviso de Seguridad:',
      warning_text: 'Si no solicitaste este restablecimiento de contraseña, contacta a nuestro equipo de soporte inmediatamente y no hagas clic en el enlace.',
      button: 'Restablecer Contraseña',
      expires: 'Este enlace expira en 1 hora.',
      instructions: 'Haz clic en el botón de abajo para restablecer tu contraseña. Serás redirigido a una página segura donde puedes establecer una nueva contraseña.'
    }
  },
  
  fr: {
    tagline: 'Solutions Numériques Professionnelles',
    footer_notification: 'Ceci est une notification de BitMinded',
    manage_preferences: 'Gérer les préférences de notification',
    copyright: '© 2024 BitMinded. Tous droits réservés.',
    
    password_reset_request: {
      subject: 'Demande de Réinitialisation de Mot de Passe - BitMinded',
      title: '🔒 Demande de Réinitialisation de Mot de Passe',
      intro: 'Un administrateur a demandé une réinitialisation de mot de passe pour votre compte.',
      details_title: 'Détails du Compte:',
      email: 'Adresse email:',
      admin_note: 'Cette demande a été initiée par un administrateur.',
      warning_title: 'Avis de Sécurité:',
      warning_text: 'Si vous n\'avez pas demandé cette réinitialisation de mot de passe, contactez notre équipe de support immédiatement et ne cliquez pas sur le lien.',
      button: 'Réinitialiser le Mot de Passe',
      expires: 'Ce lien expire dans 1 heure.',
      instructions: 'Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe. Vous serez redirigé vers une page sécurisée où vous pourrez définir un nouveau mot de passe.'
    }
  },
  
  de: {
    tagline: 'Professionelle Digitale Lösungen',
    footer_notification: 'Dies ist eine Benachrichtigung von BitMinded',
    manage_preferences: 'Benachrichtigungseinstellungen verwalten',
    copyright: '© 2024 BitMinded. Alle Rechte vorbehalten.',
    
    password_reset_request: {
      subject: 'Passwort-Reset-Anfrage - BitMinded',
      title: '🔒 Passwort-Reset-Anfrage',
      intro: 'Ein Administrator hat einen Passwort-Reset für Ihr Konto beantragt.',
      details_title: 'Kontodetails:',
      email: 'E-Mail-Adresse:',
      admin_note: 'Diese Anfrage wurde von einem Administrator initiiert.',
      warning_title: 'Sicherheitshinweis:',
      warning_text: 'Wenn Sie diesen Passwort-Reset nicht beantragt haben, kontaktieren Sie bitte sofort unser Support-Team und klicken Sie nicht auf den Link.',
      button: 'Passwort Zurücksetzen',
      expires: 'Dieser Link läuft in 1 Stunde ab.',
      instructions: 'Klicken Sie auf die Schaltfläche unten, um Ihr Passwort zurückzusetzen. Sie werden zu einer sicheren Seite weitergeleitet, wo Sie ein neues Passwort festlegen können.'
    }
  }
}

// Shared email styles
const EMAIL_STYLES = `
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f8f9fa;
  }
  .container {
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
  .button-container {
    text-align: center;
    margin: 20px 0;
  }
  .button {
    display: inline-block;
    background: #cfde67;
    color: #272b2e;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
  }
  .button:hover {
    background: #d286bd;
    color: white;
  }
  .highlight {
    background: #fff3cd;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #ffc107;
    margin: 20px 0;
  }
  .info-box {
    background: #f0f8ff;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #cfde67;
    margin: 20px 0;
  }
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    font-size: 12px;
    color: #666;
    text-align: center;
  }
`

// Generate password reset email
const generatePasswordResetEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].password_reset_request
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BitMinded</div>
            <div class="tagline">${common.tagline}</div>
          </div>
          <div class="content">
            <h2>${t.title}</h2>
            <p>${t.intro}</p>
            <div class="info-box">
              <strong>${t.details_title}</strong><br>
              📧 ${t.email} ${data.userEmail}
            </div>
            <p><em>${t.admin_note}</em></p>
            <p>${t.instructions}</p>
            <div class="button-container">
              <a href="${data.resetUrl}" class="button">${t.button}</a>
            </div>
            <div class="highlight">
              <strong>${t.warning_title}</strong> ${t.warning_text}
            </div>
            <p style="font-size: 12px; color: #666; text-align: center;">${t.expires}</p>
          </div>
          <div class="footer">
            <p>${common.footer_notification}<br>
            <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">${common.manage_preferences}</a></p>
            <p>${common.copyright}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

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
    // Parse request body
    const { userId, adminId } = await req.json()

    if (!userId || !adminId) {
      throw new Error('Missing required parameters: userId and adminId')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get target user info
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    // Get admin user info
    const { data: { user: adminUser }, error: adminError } = await supabase.auth.admin.getUserById(adminId)
    
    if (adminError || !adminUser) {
      throw new Error(`Admin user not found: ${adminError?.message}`)
    }

    // Get user's language preference
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('language')
      .eq('user_id', userId)
      .single()

    const userLanguage = prefs?.language || 'en'

    // Generate password reset link using Supabase Admin API
    // Use SITE_URL for dynamic redirect (works for both localhost and production)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://bitminded.ch'
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: `${siteUrl}/auth/?action=reset-password`
      }
    })

    if (resetError || !resetData.properties?.action_link) {
      console.error('❌ Failed to generate password reset link:', resetError)
      throw new Error('Failed to generate password reset link')
    }

    // Prepare email data
    const emailData = {
      to: user.email,
      subject: EMAIL_TRANSLATIONS[userLanguage as keyof typeof EMAIL_TRANSLATIONS].password_reset_request.subject,
      html: generatePasswordResetEmail({
        userEmail: user.email,
        resetUrl: resetData.properties.action_link,
        preferencesUrl: 'https://bitminded.ch/account?section=notifications'
      }, userLanguage)
    }

    console.log(`📧 Sending password reset to: ${user.email}`)
    console.log(`📝 Subject: ${emailData.subject}`)
    console.log(`🌐 Language: ${userLanguage}`)
    console.log(`🔗 Reset URL: ${resetData.properties.action_link}`)

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not set')
      throw new Error('Email service not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BitMinded <notifications@bitminded.ch>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      })
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', emailResult)
      throw new Error(`Failed to send email: ${emailResult.message || 'Unknown error'}`)
    }

    console.log('✅ Password reset email sent successfully')
    console.log('📬 Email ID:', emailResult.id)

    // Log admin action
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        user_id: userId,
        action: 'password_reset_sent',
        details: {
          target_user: user.email,
          admin_user: adminUser.email,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset email sent',
        sentTo: user.email,
        language: userLanguage,
        emailId: emailResult.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    
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

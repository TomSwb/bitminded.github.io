import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Admin Send Email Change Edge Function
 * 
 * Allows admins to send email change verification to users
 * Uses Resend for email delivery with custom templates
 * Supports: EN, ES, FR, DE
 */

// Email translations for all supported languages
const EMAIL_TRANSLATIONS = {
  en: {
    tagline: 'Professional Digital Solutions',
    footer_notification: 'This is a notification from BitMinded',
    manage_preferences: 'Manage notification preferences',
    copyright: '© 2025 BitMinded. All rights reserved.',
    
    email_change_request: {
      subject: 'Email Change Request - BitMinded',
      title: '📧 Email Change Request',
      intro: 'An administrator has requested to change your email address.',
      details_title: 'Change Details:',
      current_email: 'Current email:',
      new_email: 'New email:',
      admin_note: 'This request was initiated by an administrator.',
      warning_title: 'Security Notice:',
      warning_text: 'If you did not request this change, please contact our support team immediately.',
      button: 'Verify Email Change',
      expires: 'This link expires in 24 hours.'
    }
  },
  
  es: {
    tagline: 'Soluciones Digitales Profesionales',
    footer_notification: 'Esta es una notificación de BitMinded',
    manage_preferences: 'Administrar preferencias de notificación',
    copyright: '© 2024 BitMinded. Todos los derechos reservados.',
    
    email_change_request: {
      subject: 'Solicitud de Cambio de Email - BitMinded',
      title: '📧 Solicitud de Cambio de Email',
      intro: 'Un administrador ha solicitado cambiar tu dirección de correo electrónico.',
      details_title: 'Detalles del Cambio:',
      current_email: 'Email actual:',
      new_email: 'Nuevo email:',
      admin_note: 'Esta solicitud fue iniciada por un administrador.',
      warning_title: 'Aviso de Seguridad:',
      warning_text: 'Si no solicitaste este cambio, contacta a nuestro equipo de soporte inmediatamente.',
      button: 'Verificar Cambio de Email',
      expires: 'Este enlace expira en 24 horas.'
    }
  },
  
  fr: {
    tagline: 'Solutions Numériques Professionnelles',
    footer_notification: 'Ceci est une notification de BitMinded',
    manage_preferences: 'Gérer les préférences de notification',
    copyright: '© 2024 BitMinded. Tous droits réservés.',
    
    email_change_request: {
      subject: 'Demande de Changement d\'Email - BitMinded',
      title: '📧 Demande de Changement d\'Email',
      intro: 'Un administrateur a demandé de changer votre adresse email.',
      details_title: 'Détails du Changement:',
      current_email: 'Email actuel:',
      new_email: 'Nouvel email:',
      admin_note: 'Cette demande a été initiée par un administrateur.',
      warning_title: 'Avis de Sécurité:',
      warning_text: 'Si vous n\'avez pas demandé ce changement, contactez notre équipe de support immédiatement.',
      button: 'Vérifier le Changement d\'Email',
      expires: 'Ce lien expire dans 24 heures.'
    }
  },
  
  de: {
    tagline: 'Professionelle Digitale Lösungen',
    footer_notification: 'Dies ist eine Benachrichtigung von BitMinded',
    manage_preferences: 'Benachrichtigungseinstellungen verwalten',
    copyright: '© 2024 BitMinded. Alle Rechte vorbehalten.',
    
    email_change_request: {
      subject: 'E-Mail-Änderungsanfrage - BitMinded',
      title: '📧 E-Mail-Änderungsanfrage',
      intro: 'Ein Administrator hat beantragt, Ihre E-Mail-Adresse zu ändern.',
      details_title: 'Änderungsdetails:',
      current_email: 'Aktuelle E-Mail:',
      new_email: 'Neue E-Mail:',
      admin_note: 'Diese Anfrage wurde von einem Administrator initiiert.',
      warning_title: 'Sicherheitshinweis:',
      warning_text: 'Wenn Sie diese Änderung nicht beantragt haben, kontaktieren Sie bitte sofort unser Support-Team.',
      button: 'E-Mail-Änderung Verifizieren',
      expires: 'Dieser Link läuft in 24 Stunden ab.'
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

// Generate email change verification email
const generateEmailChangeEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].email_change_request
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
              📧 ${t.current_email} ${data.currentEmail}<br>
              📧 ${t.new_email} ${data.newEmail}
            </div>
            <p><em>${t.admin_note}</em></p>
            <div class="highlight">
              <strong>${t.warning_title}</strong> ${t.warning_text}
            </div>
            <div class="button-container">
              <a href="${data.verificationUrl}" class="button">${t.button}</a>
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
    const { userId, newEmail, adminId } = await req.json()

    console.log(`📧 Admin email change request for user: ${userId}`)
    console.log(`📧 New email: ${newEmail}`)
    console.log(`📧 Admin ID: ${adminId}`)
    console.log(`📧 Admin ID type: ${typeof adminId}`)
    console.log(`📧 Admin ID length: ${adminId?.length}`)

    if (!userId || !newEmail || !adminId) {
      throw new Error('Missing required parameters: userId, newEmail, and adminId')
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

    // Admin user lookup removed - not needed since admin is already authenticated
    console.log(`✅ Processing email change request from admin: ${adminId}`)

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      throw new Error('Invalid email format')
    }

    // Check if new email is different from current
    if (newEmail === user.email) {
      throw new Error('New email must be different from current email')
    }

    // Check if new email is already in use
    console.log(`🔍 Checking if email ${newEmail} is already in use...`)
    const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: { email: newEmail }
    })

    console.log(`🔍 List users result:`, { existingUser, listError })
    console.log(`🔍 Found ${existingUser?.users?.length || 0} users with email ${newEmail}`)

    if (existingUser && existingUser.users.length > 0) {
      // Check if the email is used by a different user (not the current user)
      const conflictingUser = existingUser.users.find(u => u.id !== userId)
      if (conflictingUser) {
        console.log(`❌ Email ${newEmail} is already used by different user:`, conflictingUser)
        throw new Error('Email address is already in use')
      } else {
        console.log(`✅ Email ${newEmail} is used by the same user (${userId}), allowing change`)
      }
    }

    // Get user's language preference
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('language')
      .eq('user_id', userId)
      .single()

    const userLanguage = prefs?.language || 'en'

    // Generate verification token
    const verificationToken = crypto.randomUUID()
    
    // Store verification token in database
    const { error: tokenError } = await supabase
      .from('email_change_verifications')
      .insert({
        user_id: userId,
        new_email: newEmail,
        token: verificationToken,
        admin_id: adminId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error('❌ Failed to store verification token:', tokenError)
      throw new Error('Failed to create verification token')
    }

    // Create verification URL
    // Use SITE_URL for dynamic redirect (works for both localhost and production)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://bitminded.ch'
    const verificationUrl = `${siteUrl}/auth/verify/?token=${verificationToken}&type=email_change`

    // Prepare email data
    const emailData = {
      to: user.email,
      subject: EMAIL_TRANSLATIONS[userLanguage as keyof typeof EMAIL_TRANSLATIONS].email_change_request.subject,
      html: generateEmailChangeEmail({
        currentEmail: user.email,
        newEmail: newEmail,
        verificationUrl: verificationUrl,
        preferencesUrl: 'https://bitminded.ch/account?section=notifications'
      }, userLanguage)
    }

    console.log(`📧 Sending email change verification to: ${user.email}`)
    console.log(`📝 Subject: ${emailData.subject}`)
    console.log(`🌐 Language: ${userLanguage}`)
    console.log(`🔗 Verification URL: ${verificationUrl}`)

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

    console.log('✅ Email change verification sent successfully')
    console.log('📬 Email ID:', emailResult.id)

    // Log admin action (optional - don't fail if this doesn't work)
    try {
      console.log('🔍 Attempting to log admin action...')
      const { error: logError } = await supabase
        .from('admin_activity')
        .insert({
          admin_id: adminId,
          user_id: userId,
          action: 'email_change_request_sent',
          details: {
            target_user: user.email,
            new_email: newEmail,
            admin_id: adminId,
            timestamp: new Date().toISOString()
          }
        })
      
      if (logError) {
        console.warn('⚠️ Failed to log admin action:', logError)
      } else {
        console.log('✅ Admin action logged successfully')
      }
    } catch (logError) {
      console.warn('⚠️ Exception during admin logging:', logError.message)
      // Don't throw error - admin logging is not critical
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email change verification sent',
        sentTo: user.email,
        newEmail: newEmail,
        language: userLanguage,
        emailId: emailResult.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending email change verification:', error)
    
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Send Deletion Email Edge Function
 * 
 * Independent email service for account deletion notifications
 * Uses same styling as existing emails but completely separate
 * Supports: EN, ES, FR, DE
 */

// Email translations for deletion notifications
const DELETION_EMAIL_TRANSLATIONS = {
  en: {
    tagline: 'Professional Digital Solutions',
    footer_notification: 'This is a notification from BitMinded',
    manage_preferences: 'Manage notification preferences',
    copyright: '© 2025 BitMinded. All rights reserved.',
    
    deletion_scheduled: {
      subject: 'Account Deletion Scheduled - BitMinded',
      title: '🗑️ Account Deletion Scheduled',
      intro: 'Your account deletion has been scheduled for',
      grace_period_title: 'What happens next:',
      grace_period_items: [
        'You have 30 days to change your mind',
        'Your data will remain accessible until then',
        'Your purchased app access will be preserved forever'
      ],
      cancel_prompt: 'To cancel this deletion:',
      cancel_button: 'Cancel Deletion',
      what_deleted_title: 'What will be deleted:',
      what_deleted_items: [
        'Profile information',
        'Preferences and settings',
        'Notification history',
        'Login activity'
      ],
      what_preserved_title: 'What will be preserved:',
      what_preserved_items: [
        'Your purchased app access (our ethical commitment)'
      ],
      support_text: 'Need help?',
      support_email: 'support@bitminded.com'
    },
    
    deletion_reminder: {
      subject: 'Reminder: Account Deletion in 7 Days - BitMinded',
      title: '⏰ Final Reminder: 7 Days Until Deletion',
      intro: 'Your account is scheduled for deletion on',
      warning_text: 'This is your final reminder. After this date, your account and data will be permanently removed.',
      cancel_prompt: 'To keep your account:',
      cancel_button: 'Cancel Deletion',
      changed_mind: 'Already changed your mind? You can cancel anytime before'
    },
    
    deletion_cancelled: {
      subject: 'Account Deletion Cancelled - BitMinded',
      title: '✅ Welcome Back!',
      intro: 'Your account deletion has been cancelled. Your account remains active.',
      what_next_title: 'What\'s next:',
      what_next_items: [
        'All your data is safe',
        'Your preferences are unchanged',
        'Your purchased apps remain accessible'
      ],
      thank_you: 'Thank you for staying with BitMinded!'
    },
    
    deletion_completed: {
      subject: 'Account Deleted - BitMinded',
      title: '✅ Account Successfully Deleted',
      intro: 'Your BitMinded account has been permanently deleted.',
      what_removed_title: 'What was removed:',
      what_removed_items: [
        'Profile information',
        'Preferences and settings',
        'Notification history',
        'Login records'
      ],
      what_preserved_title: 'What was preserved:',
      what_preserved_items: [
        'Your purchased app access',
        'You can still access any apps you bought'
      ],
      thank_you: 'Thank you for being part of BitMinded.',
      questions: 'Have questions?',
      support_email: 'support@bitminded.com'
    }
  },
  
  es: {
    tagline: 'Soluciones Digitales Profesionales',
    footer_notification: 'Esta es una notificación de BitMinded',
    manage_preferences: 'Administrar preferencias de notificación',
    copyright: '© 2025 BitMinded. Todos los derechos reservados.',
    
    deletion_scheduled: {
      subject: 'Eliminación de Cuenta Programada - BitMinded',
      title: '🗑️ Eliminación de Cuenta Programada',
      intro: 'La eliminación de su cuenta ha sido programada para',
      grace_period_title: 'Qué sucede ahora:',
      grace_period_items: [
        'Tiene 30 días para cambiar de opinión',
        'Sus datos permanecerán accesibles hasta entonces',
        'Su acceso a aplicaciones compradas se preservará para siempre'
      ],
      cancel_prompt: 'Para cancelar esta eliminación:',
      cancel_button: 'Cancelar Eliminación',
      what_deleted_title: 'Qué se eliminará:',
      what_deleted_items: [
        'Información de perfil',
        'Preferencias y configuraciones',
        'Historial de notificaciones',
        'Actividad de inicio de sesión'
      ],
      what_preserved_title: 'Qué se preservará:',
      what_preserved_items: [
        'Su acceso a aplicaciones compradas (nuestro compromiso ético)'
      ],
      support_text: '¿Necesita ayuda?',
      support_email: 'support@bitminded.com'
    },
    
    deletion_reminder: {
      subject: 'Recordatorio: Eliminación de Cuenta en 7 Días - BitMinded',
      title: '⏰ Recordatorio Final: 7 Días Hasta la Eliminación',
      intro: 'Su cuenta está programada para eliminación el',
      warning_text: 'Este es su recordatorio final. Después de esta fecha, su cuenta y datos serán eliminados permanentemente.',
      cancel_prompt: 'Para mantener su cuenta:',
      cancel_button: 'Cancelar Eliminación',
      changed_mind: '¿Ya cambió de opinión? Puede cancelar en cualquier momento antes del'
    },
    
    deletion_cancelled: {
      subject: 'Eliminación de Cuenta Cancelada - BitMinded',
      title: '✅ ¡Bienvenido de Vuelta!',
      intro: 'La eliminación de su cuenta ha sido cancelada. Su cuenta permanece activa.',
      what_next_title: 'Qué sigue:',
      what_next_items: [
        'Todos sus datos están seguros',
        'Sus preferencias no han cambiado',
        'Sus aplicaciones compradas permanecen accesibles'
      ],
      thank_you: '¡Gracias por quedarse con BitMinded!'
    },
    
    deletion_completed: {
      subject: 'Cuenta Eliminada - BitMinded',
      title: '✅ Cuenta Eliminada Exitosamente',
      intro: 'Su cuenta de BitMinded ha sido eliminada permanentemente.',
      what_removed_title: 'Qué se eliminó:',
      what_removed_items: [
        'Información de perfil',
        'Preferencias y configuraciones',
        'Historial de notificaciones',
        'Registros de inicio de sesión'
      ],
      what_preserved_title: 'Qué se preservó:',
      what_preserved_items: [
        'Su acceso a aplicaciones compradas',
        'Todavía puede acceder a cualquier aplicación que haya comprado'
      ],
      thank_you: 'Gracias por ser parte de BitMinded.',
      questions: '¿Tiene preguntas?',
      support_email: 'support@bitminded.com'
    }
  },
  
  fr: {
    tagline: 'Solutions Numériques Professionnelles',
    footer_notification: 'Ceci est une notification de BitMinded',
    manage_preferences: 'Gérer les préférences de notification',
    copyright: '© 2025 BitMinded. Tous droits réservés.',
    
    deletion_scheduled: {
      subject: 'Suppression de Compte Programmée - BitMinded',
      title: '🗑️ Suppression de Compte Programmée',
      intro: 'La suppression de votre compte a été programmée pour',
      grace_period_title: 'Ce qui se passe ensuite:',
      grace_period_items: [
        'Vous avez 30 jours pour changer d\'avis',
        'Vos données resteront accessibles jusque-là',
        'Votre accès aux applications achetées sera préservé pour toujours'
      ],
      cancel_prompt: 'Pour annuler cette suppression:',
      cancel_button: 'Annuler la Suppression',
      what_deleted_title: 'Ce qui sera supprimé:',
      what_deleted_items: [
        'Informations de profil',
        'Préférences et paramètres',
        'Historique des notifications',
        'Activité de connexion'
      ],
      what_preserved_title: 'Ce qui sera préservé:',
      what_preserved_items: [
        'Votre accès aux applications achetées (notre engagement éthique)'
      ],
      support_text: 'Besoin d\'aide?',
      support_email: 'support@bitminded.com'
    },
    
    deletion_reminder: {
      subject: 'Rappel: Suppression de Compte dans 7 Jours - BitMinded',
      title: '⏰ Rappel Final: 7 Jours Avant la Suppression',
      intro: 'Votre compte est programmé pour suppression le',
      warning_text: 'Ceci est votre rappel final. Après cette date, votre compte et vos données seront supprimés de manière permanente.',
      cancel_prompt: 'Pour conserver votre compte:',
      cancel_button: 'Annuler la Suppression',
      changed_mind: 'Vous avez déjà changé d\'avis? Vous pouvez annuler à tout moment avant le'
    },
    
    deletion_cancelled: {
      subject: 'Suppression de Compte Annulée - BitMinded',
      title: '✅ Bienvenue de Retour!',
      intro: 'La suppression de votre compte a été annulée. Votre compte reste actif.',
      what_next_title: 'Ce qui suit:',
      what_next_items: [
        'Toutes vos données sont en sécurité',
        'Vos préférences sont inchangées',
        'Vos applications achetées restent accessibles'
      ],
      thank_you: 'Merci de rester avec BitMinded!'
    },
    
    deletion_completed: {
      subject: 'Compte Supprimé - BitMinded',
      title: '✅ Compte Supprimé avec Succès',
      intro: 'Votre compte BitMinded a été supprimé de manière permanente.',
      what_removed_title: 'Ce qui a été supprimé:',
      what_removed_items: [
        'Informations de profil',
        'Préférences et paramètres',
        'Historique des notifications',
        'Enregistrements de connexion'
      ],
      what_preserved_title: 'Ce qui a été préservé:',
      what_preserved_items: [
        'Votre accès aux applications achetées',
        'Vous pouvez toujours accéder aux applications que vous avez achetées'
      ],
      thank_you: 'Merci d\'avoir fait partie de BitMinded.',
      questions: 'Vous avez des questions?',
      support_email: 'support@bitminded.com'
    }
  },
  
  de: {
    tagline: 'Professionelle Digitale Lösungen',
    footer_notification: 'Dies ist eine Benachrichtigung von BitMinded',
    manage_preferences: 'Benachrichtigungseinstellungen verwalten',
    copyright: '© 2025 BitMinded. Alle Rechte vorbehalten.',
    
    deletion_scheduled: {
      subject: 'Kontolöschung Geplant - BitMinded',
      title: '🗑️ Kontolöschung Geplant',
      intro: 'Ihre Kontolöschung wurde geplant für',
      grace_period_title: 'Was passiert als Nächstes:',
      grace_period_items: [
        'Sie haben 30 Tage, um Ihre Meinung zu ändern',
        'Ihre Daten bleiben bis dahin zugänglich',
        'Ihr Zugang zu gekauften Apps wird für immer erhalten bleiben'
      ],
      cancel_prompt: 'Um diese Löschung abzubrechen:',
      cancel_button: 'Löschung Abbrechen',
      what_deleted_title: 'Was gelöscht wird:',
      what_deleted_items: [
        'Profilinformationen',
        'Einstellungen und Präferenzen',
        'Benachrichtigungsverlauf',
        'Anmeldeaktivität'
      ],
      what_preserved_title: 'Was erhalten bleibt:',
      what_preserved_items: [
        'Ihr Zugang zu gekauften Apps (unser ethisches Engagement)'
      ],
      support_text: 'Benötigen Sie Hilfe?',
      support_email: 'support@bitminded.com'
    },
    
    deletion_reminder: {
      subject: 'Erinnerung: Kontolöschung in 7 Tagen - BitMinded',
      title: '⏰ Letzte Erinnerung: 7 Tage bis zur Löschung',
      intro: 'Ihr Konto ist zur Löschung geplant am',
      warning_text: 'Dies ist Ihre letzte Erinnerung. Nach diesem Datum werden Ihr Konto und Ihre Daten dauerhaft entfernt.',
      cancel_prompt: 'Um Ihr Konto zu behalten:',
      cancel_button: 'Löschung Abbrechen',
      changed_mind: 'Haben Sie Ihre Meinung schon geändert? Sie können jederzeit vor dem abbrechen'
    },
    
    deletion_cancelled: {
      subject: 'Kontolöschung Abgebrochen - BitMinded',
      title: '✅ Willkommen zurück!',
      intro: 'Ihre Kontolöschung wurde abgebrochen. Ihr Konto bleibt aktiv.',
      what_next_title: 'Was kommt als Nächstes:',
      what_next_items: [
        'Alle Ihre Daten sind sicher',
        'Ihre Einstellungen sind unverändert',
        'Ihre gekauften Apps bleiben zugänglich'
      ],
      thank_you: 'Vielen Dank, dass Sie bei BitMinded bleiben!'
    },
    
    deletion_completed: {
      subject: 'Konto Gelöscht - BitMinded',
      title: '✅ Konto Erfolgreich Gelöscht',
      intro: 'Ihr BitMinded-Konto wurde dauerhaft gelöscht.',
      what_removed_title: 'Was entfernt wurde:',
      what_removed_items: [
        'Profilinformationen',
        'Einstellungen und Präferenzen',
        'Benachrichtigungsverlauf',
        'Anmeldeprotokolle'
      ],
      what_preserved_title: 'Was erhalten bleibt:',
      what_preserved_items: [
        'Ihr Zugang zu gekauften Apps',
        'Sie können weiterhin auf alle Apps zugreifen, die Sie gekauft haben'
      ],
      thank_you: 'Vielen Dank, dass Sie Teil von BitMinded waren.',
      questions: 'Haben Sie Fragen?',
      support_email: 'support@bitminded.com'
    }
  }
}

// Shared email styles (same as existing emails)
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
  .success-box {
    background: #d1fae5;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #10b981;
    margin: 20px 0;
  }
  .warning-box {
    background: #fee;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #ef4444;
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
  ul {
    margin: 10px 0;
    padding-left: 20px;
  }
  ul li {
    margin: 5px 0;
  }
`

// Email template generators
const generateDeletionScheduledEmail = (data: any, lang: string = 'en') => {
  const t = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_scheduled
  const common = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS]
  
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
            <p>${t.intro} <strong>${data.scheduledDate || 'unknown'}</strong>.</p>
            
            <div class="info-box">
              <strong>${t.grace_period_title}</strong>
              <ul>
                ${t.grace_period_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <p><strong>${t.cancel_prompt}</strong></p>
            <div class="button-container">
              <a href="${data.cancelUrl}" class="button">${t.cancel_button}</a>
            </div>

            <div class="highlight">
              <strong>${t.what_deleted_title}</strong>
              <ul>
                ${t.what_deleted_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <div class="success-box">
              <strong>${t.what_preserved_title}</strong>
              <ul>
                ${t.what_preserved_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              ${t.support_text} <a href="mailto:${t.support_email}">${t.support_email}</a>
            </p>
          </div>
          <div class="footer">
            <p>${common.footer_notification}<br>
            <a href="https://bitminded.github.io/account?section=notifications">${common.manage_preferences}</a></p>
            <p>${common.copyright}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

const generateDeletionReminderEmail = (data: any, lang: string = 'en') => {
  const t = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_reminder
  const common = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS]
  
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
            <p>${t.intro} <strong>${data.scheduledDate || 'unknown'}</strong>.</p>
            
            <div class="warning-box">
              ${t.warning_text}
            </div>

            <p><strong>${t.cancel_prompt}</strong></p>
            <div class="button-container">
              <a href="${data.cancelUrl}" class="button">${t.cancel_button}</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              ${t.changed_mind} <strong>${data.scheduledDate}</strong>.
            </p>
          </div>
          <div class="footer">
            <p>${common.footer_notification}<br>
            <a href="https://bitminded.github.io/account?section=notifications">${common.manage_preferences}</a></p>
            <p>${common.copyright}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

const generateDeletionCancelledEmail = (data: any, lang: string = 'en') => {
  const t = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_cancelled
  const common = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS]
  
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
            <div class="success-box">
              <p style="margin: 0;">${t.intro}</p>
            </div>
            
            <div class="info-box">
              <strong>${t.what_next_title}</strong>
              <ul>
                ${t.what_next_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <p style="margin-top: 20px; font-size: 16px;">
              <strong>${t.thank_you}</strong>
            </p>
          </div>
          <div class="footer">
            <p>${common.footer_notification}<br>
            <a href="https://bitminded.github.io/account?section=notifications">${common.manage_preferences}</a></p>
            <p>${common.copyright}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

const generateDeletionCompletedEmail = (data: any, lang: string = 'en') => {
  const t = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_completed
  const common = DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS]
  
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
            
            <div class="highlight">
              <strong>${t.what_removed_title}</strong>
              <ul>
                ${t.what_removed_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <div class="success-box">
              <strong>${t.what_preserved_title}</strong>
              <ul>
                ${t.what_preserved_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <p style="margin-top: 20px;">${t.thank_you}</p>
            <p style="font-size: 14px; color: #666;">
              ${t.questions} <a href="mailto:${t.support_email}">${t.support_email}</a>
            </p>
          </div>
          <div class="footer">
            <p>${common.footer_notification}</p>
            <p>${common.copyright}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Email template map
const DELETION_EMAIL_TEMPLATES: Record<string, { 
  subject: (lang: string) => string, 
  html: (data: any, lang: string) => string 
}> = {
  deletion_scheduled: {
    subject: (lang: string) => DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_scheduled.subject,
    html: generateDeletionScheduledEmail
  },
  deletion_reminder: {
    subject: (lang: string) => DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_reminder.subject,
    html: generateDeletionReminderEmail
  },
  deletion_cancelled: {
    subject: (lang: string) => DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_cancelled.subject,
    html: generateDeletionCancelledEmail
  },
  deletion_completed: {
    subject: (lang: string) => DELETION_EMAIL_TRANSLATIONS[lang as keyof typeof DELETION_EMAIL_TRANSLATIONS].deletion_completed.subject,
    html: generateDeletionCompletedEmail
  }
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
    const { userId, type, data = {} } = await req.json()

    if (!userId || !type) {
      throw new Error('Missing required parameters: userId and type')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    // Get user's language preference
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('language')
      .eq('user_id', userId)
      .single()

    const userLanguage = prefs?.language || 'en'
    console.log(`🌐 User language: ${userLanguage}`)

    // Get email template
    const template = DELETION_EMAIL_TEMPLATES[type]
    
    if (!template) {
      throw new Error(`No email template found for type: ${type}`)
    }

    // Prepare email data with user's language
    const emailData = {
      to: user.email,
      subject: template.subject(userLanguage),
      html: template.html(data, userLanguage)
    }

    console.log(`📧 Sending deletion email to: ${user.email}`)
    console.log(`📝 Subject: ${emailData.subject}`)
    console.log(`🌐 Language: ${userLanguage}`)
    console.log(`✅ Type: ${type}`)

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

    console.log('✅ Deletion email sent successfully via Resend')
    console.log('📬 Email ID:', emailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Deletion email sent',
        type,
        sentTo: user.email,
        language: userLanguage,
        emailId: emailResult.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending deletion email:', error)
    
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


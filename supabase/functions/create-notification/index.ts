import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Create Notification Edge Function
 * 
 * Creates in-app notifications in the database
 * Checks user's in-app notification preferences
 */

// Notification templates
const NOTIFICATION_TEMPLATES = {
  password_changed: {
    en: {
      title: 'Password Changed',
      message: 'Your password was successfully changed.',
      icon: '🔒'
    },
    es: {
      title: 'Contraseña Cambiada',
      message: 'Tu contraseña fue cambiada exitosamente.',
      icon: '🔒'
    },
    fr: {
      title: 'Mot de Passe Modifié',
      message: 'Votre mot de passe a été changé avec succès.',
      icon: '🔒'
    },
    de: {
      title: 'Passwort Geändert',
      message: 'Ihr Passwort wurde erfolgreich geändert.',
      icon: '🔒'
    }
  },
  
  two_fa_enabled: {
    en: {
      title: '2FA Enabled',
      message: 'Two-factor authentication is now active on your account.',
      icon: '🛡️'
    },
    es: {
      title: '2FA Activado',
      message: 'La autenticación de dos factores está ahora activa en tu cuenta.',
      icon: '🛡️'
    },
    fr: {
      title: '2FA Activé',
      message: 'L\'authentification à deux facteurs est maintenant active sur votre compte.',
      icon: '🛡️'
    },
    de: {
      title: '2FA Aktiviert',
      message: 'Die Zwei-Faktor-Authentifizierung ist jetzt auf Ihrem Konto aktiv.',
      icon: '🛡️'
    }
  },
  
  two_fa_disabled: {
    en: {
      title: '2FA Disabled',
      message: 'Two-factor authentication has been disabled.',
      icon: '⚠️'
    },
    es: {
      title: '2FA Desactivado',
      message: 'La autenticación de dos factores ha sido desactivada.',
      icon: '⚠️'
    },
    fr: {
      title: '2FA Désactivé',
      message: 'L\'authentification à deux facteurs a été désactivée.',
      icon: '⚠️'
    },
    de: {
      title: '2FA Deaktiviert',
      message: 'Die Zwei-Faktor-Authentifizierung wurde deaktiviert.',
      icon: '⚠️'
    }
  },
  
  new_login: {
    en: {
      title: 'New Login Detected',
      message: 'A new login to your account was detected.',
      icon: '🔐'
    },
    es: {
      title: 'Nuevo Inicio de Sesión',
      message: 'Se detectó un nuevo inicio de sesión en tu cuenta.',
      icon: '🔐'
    },
    fr: {
      title: 'Nouvelle Connexion',
      message: 'Une nouvelle connexion à votre compte a été détectée.',
      icon: '🔐'
    },
    de: {
      title: 'Neue Anmeldung',
      message: 'Eine neue Anmeldung bei Ihrem Konto wurde erkannt.',
      icon: '🔐'
    }
  },
  
  username_changed: {
    en: {
      title: 'Username Updated',
      message: 'Your username was successfully changed.',
      icon: '👤'
    },
    es: {
      title: 'Nombre de Usuario Actualizado',
      message: 'Tu nombre de usuario fue cambiado exitosamente.',
      icon: '👤'
    },
    fr: {
      title: 'Nom d\'Utilisateur Mis à Jour',
      message: 'Votre nom d\'utilisateur a été changé avec succès.',
      icon: '👤'
    },
    de: {
      title: 'Benutzername Aktualisiert',
      message: 'Ihr Benutzername wurde erfolgreich geändert.',
      icon: '👤'
    }
  }
}

// Map notification types to categories
const NOTIFICATION_TYPE_CATEGORY: Record<string, 'security' | 'account'> = {
  password_changed: 'security',
  two_fa_enabled: 'security',
  two_fa_disabled: 'security',
  new_login: 'security',
  username_changed: 'account'
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
    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { userId, type, data = {} } = body

    if (!userId || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId and type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's language preference and in-app notification preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('language, notification_preferences')
      .eq('user_id', userId)
      .single()

    const userLanguage = prefs?.language || 'en'
    
    // Check if user wants in-app notifications for this type
    const inappPrefs = prefs?.notification_preferences?.inapp || {}
    
    // Map notification type to preference key
    const preferenceKey = type.replace('two_fa_enabled', 'two_fa').replace('two_fa_disabled', 'two_fa')
    const shouldCreate = inappPrefs[preferenceKey] !== false
    
    if (!shouldCreate) {
      console.log(`⏭️ User disabled ${preferenceKey} in-app notifications, skipping`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: `User disabled ${preferenceKey} in-app notifications` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get notification template
    const template = NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES]
    
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    const langTemplate = template[userLanguage as keyof typeof template] || template.en

    // Determine notification category
    const category = NOTIFICATION_TYPE_CATEGORY[type] || 'account'

    // Create link based on notification type
    let link = '/account'
    if (category === 'security') {
      link = '/account?section=security'
    }
    if (data.link) {
      link = data.link
    }

    // Insert notification into database
    const { data: notification, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: category,
        title: langTemplate.title,
        message: langTemplate.message,
        icon: langTemplate.icon,
        link: link
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    console.log(`✅ In-app notification created: ${type} (${userLanguage})`)

    return new Response(
      JSON.stringify({ 
        success: true,
        notification: notification
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error creating notification:', error)
    
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


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Create Notification Edge Function
 * 
 * Creates in-app notifications in the database
 * Checks user's in-app notification preferences
 */

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
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
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

    // Rate limiting: User-based - 60/min, 2000/hour per user
    const rateLimitResult = await checkRateLimit(
      supabase,
      userId,
      'user',
      'create-notification',
      { requestsPerMinute: 60, requestsPerHour: 2000, windowMinutes: 60 }
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

  } catch (error: any) {
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


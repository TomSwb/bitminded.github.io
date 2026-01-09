import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Send Notification Email Edge Function
 * 
 * Checks user preferences and sends email notifications in user's language
 * Supports: EN, ES, FR, DE
 */

// Email translations for all supported languages
const EMAIL_TRANSLATIONS = {
  en: {
    tagline: 'Professional Digital Solutions',
    footer_notification: 'This is a notification from BitMinded',
    manage_preferences: 'Manage notification preferences',
    copyright: '© 2025 BitMinded. All rights reserved.',
    
    // Device types
    devices: {
      mobile: 'Mobile',
      tablet: 'Tablet',
      desktop: 'Desktop',
      unknown: 'Unknown'
    },
    
    password_changed: {
      subject: 'Password Changed - BitMinded',
      title: '🔒 Password Changed',
      intro: 'Your password was successfully changed on',
      details_title: 'Change Details:',
      device: 'Device:',
      warning_title: 'Security Notice:',
      warning_text: 'If you didn\'t make this change, please reset your password immediately and contact our support team.',
      button: 'Reset Password'
    },
    
    two_fa_enabled: {
      subject: 'Two-Factor Authentication Enabled - BitMinded',
      title: '🛡️ Two-Factor Authentication Enabled',
      success_title: 'Great job!',
      success_text: 'Your account is now more secure with two-factor authentication enabled.',
      intro: 'Two-factor authentication was enabled on',
      next_text: 'From now on, you\'ll need your authentication app to log in. Make sure to keep your backup codes safe!',
      info_title: 'What this means:',
      info_items: [
        'Your account is significantly more secure',
        'You\'ll need your authenticator app to sign in',
        'Keep your backup codes in a safe place'
      ]
    },
    
    two_fa_disabled: {
      subject: 'Two-Factor Authentication Disabled - BitMinded',
      title: '⚠️ Two-Factor Authentication Disabled',
      warning_title: 'Security Alert:',
      warning_text: 'Two-factor authentication was disabled on your account.',
      intro: '2FA was disabled on',
      recommendation: 'Your account is now less secure. We strongly recommend re-enabling 2FA to protect your account from unauthorized access.',
      button: 'Re-enable 2FA'
    },
    
    new_login: {
      subject: 'New Login Detected - BitMinded',
      title: '🔐 New Login Detected',
      intro: 'We detected a new login to your account on',
      details_title: 'Login Details:',
      device: 'Device:',
      browser: 'Browser:',
      safe_text: 'If this was you, you can safely ignore this email.',
      warning_title: 'If you don\'t recognize this activity,',
      warning_text: 'please secure your account immediately.',
      button: 'Secure My Account'
    },
    
    username_changed: {
      subject: 'Username Updated - BitMinded',
      title: '👤 Username Updated',
      intro: 'Your username was successfully changed on',
      details_title: 'Change Details:',
      previous: 'Previous username:',
      new: 'New username:',
      warning: 'If you didn\'t make this change, please contact our support team immediately.'
    },
    
    family_member_added: {
      subject: 'Added to Family Group - BitMinded',
      title: '👨‍👩‍👧‍👦 Added to Family Group',
      intro: 'You\'ve been added to a family group on',
      family_name: 'Family Name:',
      admin_name: 'Family Admin:',
      welcome_text: 'Welcome to the family! You now have access to shared family benefits.',
      access_info: 'What this means:',
      access_items: [
        'You can access family plan benefits',
        'The family admin manages your membership',
        'You can view family details in your account'
      ],
      button: 'View Family Group'
    },
    
    family_member_removed: {
      subject: 'Removed from Family Group - BitMinded',
      title: '⚠️ Removed from Family Group',
      intro: 'You\'ve been removed from a family group on',
      family_name: 'Family Name:',
      access_revoked: 'Access Revoked:',
      access_text: 'Your access to family plan benefits has been revoked.',
      button: 'View Account'
    },
    
    family_deleted: {
      subject: 'Family Group Deleted - BitMinded',
      title: '🗑️ Family Group Deleted',
      intro: 'Your family group has been deleted on',
      family_name: 'Family Name:',
      subscription_cancelled: 'Subscription Cancelled:',
      subscription_text: 'The family subscription has been cancelled and all access has been revoked.',
      impact: 'What this means:',
      impact_items: [
        'All family members have been removed',
        'Family plan benefits are no longer available',
        'You can create a new family group anytime'
      ],
      button: 'View Account'
    },
    
    family_member_left: {
      subject: 'Member Left Family Group - BitMinded',
      title: '👋 Member Left Family Group',
      intro: 'A member has left your family group on',
      family_name: 'Family Name:',
      member_name: 'Member:',
      impact: 'Impact:',
      impact_text: 'The member\'s access to family benefits has been revoked.',
      button: 'Manage Family Group'
    },
    
    family_role_changed: {
      subject: 'Role Changed in Family Group - BitMinded',
      title: '👤 Role Changed in Family Group',
      intro: 'Your role in a family group has been changed on',
      family_name: 'Family Name:',
      new_role: 'New Role:',
      role_info: 'Role Details:',
      admin_permissions: 'As an admin, you can:',
      admin_items: [
        'Add and remove family members',
        'Change member roles',
        'Manage family subscription',
        'Delete the family group'
      ],
      member_permissions: 'As a member, you can:',
      member_items: [
        'Access family plan benefits',
        'View family details',
        'Leave the family group'
      ],
      button: 'View Family Group'
    }
  },
  
  es: {
    tagline: 'Soluciones Digitales Profesionales',
    footer_notification: 'Esta es una notificación de BitMinded',
    manage_preferences: 'Administrar preferencias de notificación',
    copyright: '© 2024 BitMinded. Todos los derechos reservados.',
    
    // Device types
    devices: {
      mobile: 'Móvil',
      tablet: 'Tableta',
      desktop: 'Ordenador',
      unknown: 'Desconocido'
    },
    
    password_changed: {
      subject: 'Contraseña Cambiada - BitMinded',
      title: '🔒 Contraseña Cambiada',
      intro: 'Tu contraseña fue cambiada exitosamente el',
      details_title: 'Detalles del Cambio:',
      device: 'Dispositivo:',
      warning_title: 'Aviso de Seguridad:',
      warning_text: 'Si no realizaste este cambio, restablece tu contraseña inmediatamente y contacta a nuestro equipo de soporte.',
      button: 'Restablecer Contraseña'
    },
    
    two_fa_enabled: {
      subject: 'Autenticación de Dos Factores Activada - BitMinded',
      title: '🛡️ Autenticación de Dos Factores Activada',
      success_title: '¡Buen trabajo!',
      success_text: 'Tu cuenta ahora es más segura con la autenticación de dos factores activada.',
      intro: 'La autenticación de dos factores fue activada el',
      next_text: 'De ahora en adelante, necesitarás tu aplicación de autenticación para iniciar sesión. ¡Asegúrate de mantener tus códigos de respaldo seguros!',
      info_title: 'Qué significa esto:',
      info_items: [
        'Tu cuenta es significativamente más segura',
        'Necesitarás tu aplicación de autenticación para iniciar sesión',
        'Mantén tus códigos de respaldo en un lugar seguro'
      ]
    },
    
    two_fa_disabled: {
      subject: 'Autenticación de Dos Factores Desactivada - BitMinded',
      title: '⚠️ Autenticación de Dos Factores Desactivada',
      warning_title: 'Alerta de Seguridad:',
      warning_text: 'La autenticación de dos factores fue desactivada en tu cuenta.',
      intro: '2FA fue desactivada el',
      recommendation: 'Tu cuenta ahora es menos segura. Recomendamos encarecidamente reactivar 2FA para proteger tu cuenta del acceso no autorizado.',
      button: 'Reactivar 2FA'
    },
    
    new_login: {
      subject: 'Nuevo Inicio de Sesión Detectado - BitMinded',
      title: '🔐 Nuevo Inicio de Sesión Detectado',
      intro: 'Detectamos un nuevo inicio de sesión en tu cuenta el',
      details_title: 'Detalles del Inicio de Sesión:',
      device: 'Dispositivo:',
      browser: 'Navegador:',
      safe_text: 'Si fuiste tú, puedes ignorar este correo de forma segura.',
      warning_title: 'Si no reconoces esta actividad,',
      warning_text: 'asegura tu cuenta inmediatamente.',
      button: 'Asegurar Mi Cuenta'
    },
    
    username_changed: {
      subject: 'Nombre de Usuario Actualizado - BitMinded',
      title: '👤 Nombre de Usuario Actualizado',
      intro: 'Tu nombre de usuario fue cambiado exitosamente el',
      details_title: 'Detalles del Cambio:',
      previous: 'Nombre de usuario anterior:',
      new: 'Nuevo nombre de usuario:',
      warning: 'Si no realizaste este cambio, contacta a nuestro equipo de soporte inmediatamente.'
    },
    
    family_member_added: {
      subject: 'Agregado a Grupo Familiar - BitMinded',
      title: '👨‍👩‍👧‍👦 Agregado a Grupo Familiar',
      intro: 'Has sido agregado a un grupo familiar el',
      family_name: 'Nombre del Grupo:',
      admin_name: 'Administrador del Grupo:',
      welcome_text: '¡Bienvenido a la familia! Ahora tienes acceso a los beneficios compartidos del plan familiar.',
      access_info: 'Qué significa esto:',
      access_items: [
        'Puedes acceder a los beneficios del plan familiar',
        'El administrador del grupo gestiona tu membresía',
        'Puedes ver los detalles de la familia en tu cuenta'
      ],
      button: 'Ver Grupo Familiar'
    },
    
    family_member_removed: {
      subject: 'Removido de Grupo Familiar - BitMinded',
      title: '⚠️ Removido de Grupo Familiar',
      intro: 'Has sido removido de un grupo familiar el',
      family_name: 'Nombre del Grupo:',
      access_revoked: 'Acceso Revocado:',
      access_text: 'Tu acceso a los beneficios del plan familiar ha sido revocado.',
      button: 'Ver Cuenta'
    },
    
    family_deleted: {
      subject: 'Grupo Familiar Eliminado - BitMinded',
      title: '🗑️ Grupo Familiar Eliminado',
      intro: 'Tu grupo familiar ha sido eliminado el',
      family_name: 'Nombre del Grupo:',
      subscription_cancelled: 'Suscripción Cancelada:',
      subscription_text: 'La suscripción familiar ha sido cancelada y todo el acceso ha sido revocado.',
      impact: 'Qué significa esto:',
      impact_items: [
        'Todos los miembros de la familia han sido removidos',
        'Los beneficios del plan familiar ya no están disponibles',
        'Puedes crear un nuevo grupo familiar en cualquier momento'
      ],
      button: 'Ver Cuenta'
    },
    
    family_member_left: {
      subject: 'Miembro Dejó Grupo Familiar - BitMinded',
      title: '👋 Miembro Dejó Grupo Familiar',
      intro: 'Un miembro ha dejado tu grupo familiar el',
      family_name: 'Nombre del Grupo:',
      member_name: 'Miembro:',
      impact: 'Impacto:',
      impact_text: 'El acceso del miembro a los beneficios familiares ha sido revocado.',
      button: 'Gestionar Grupo Familiar'
    },
    
    family_role_changed: {
      subject: 'Rol Cambiado en Grupo Familiar - BitMinded',
      title: '👤 Rol Cambiado en Grupo Familiar',
      intro: 'Tu rol en un grupo familiar ha sido cambiado el',
      family_name: 'Nombre del Grupo:',
      new_role: 'Nuevo Rol:',
      role_info: 'Detalles del Rol:',
      admin_permissions: 'Como administrador, puedes:',
      admin_items: [
        'Agregar y remover miembros de la familia',
        'Cambiar roles de miembros',
        'Gestionar la suscripción familiar',
        'Eliminar el grupo familiar'
      ],
      member_permissions: 'Como miembro, puedes:',
      member_items: [
        'Acceder a los beneficios del plan familiar',
        'Ver detalles de la familia',
        'Dejar el grupo familiar'
      ],
      button: 'Ver Grupo Familiar'
    }
  },
  
  fr: {
    tagline: 'Solutions Numériques Professionnelles',
    footer_notification: 'Ceci est une notification de BitMinded',
    manage_preferences: 'Gérer les préférences de notification',
    copyright: '© 2024 BitMinded. Tous droits réservés.',
    
    // Device types
    devices: {
      mobile: 'Mobile',
      tablet: 'Tablette',
      desktop: 'Ordinateur',
      unknown: 'Inconnu'
    },
    
    password_changed: {
      subject: 'Mot de Passe Modifié - BitMinded',
      title: '🔒 Mot de Passe Modifié',
      intro: 'Votre mot de passe a été changé avec succès le',
      details_title: 'Détails du Changement:',
      device: 'Appareil:',
      warning_title: 'Avis de Sécurité:',
      warning_text: 'Si vous n\'avez pas effectué ce changement, veuillez réinitialiser votre mot de passe immédiatement et contacter notre équipe de support.',
      button: 'Réinitialiser le Mot de Passe'
    },
    
    two_fa_enabled: {
      subject: 'Authentification à Deux Facteurs Activée - BitMinded',
      title: '🛡️ Authentification à Deux Facteurs Activée',
      success_title: 'Excellent travail!',
      success_text: 'Votre compte est maintenant plus sécurisé avec l\'authentification à deux facteurs activée.',
      intro: 'L\'authentification à deux facteurs a été activée le',
      next_text: 'Dorénavant, vous aurez besoin de votre application d\'authentification pour vous connecter. Assurez-vous de conserver vos codes de sauvegarde en sécurité!',
      info_title: 'Ce que cela signifie:',
      info_items: [
        'Votre compte est nettement plus sécurisé',
        'Vous aurez besoin de votre application d\'authentification pour vous connecter',
        'Conservez vos codes de sauvegarde dans un endroit sûr'
      ]
    },
    
    two_fa_disabled: {
      subject: 'Authentification à Deux Facteurs Désactivée - BitMinded',
      title: '⚠️ Authentification à Deux Facteurs Désactivée',
      warning_title: 'Alerte de Sécurité:',
      warning_text: 'L\'authentification à deux facteurs a été désactivée sur votre compte.',
      intro: '2FA a été désactivée le',
      recommendation: 'Votre compte est maintenant moins sécurisé. Nous recommandons fortement de réactiver 2FA pour protéger votre compte contre l\'accès non autorisé.',
      button: 'Réactiver 2FA'
    },
    
    new_login: {
      subject: 'Nouvelle Connexion Détectée - BitMinded',
      title: '🔐 Nouvelle Connexion Détectée',
      intro: 'Nous avons détecté une nouvelle connexion à votre compte le',
      details_title: 'Détails de la Connexion:',
      device: 'Appareil:',
      browser: 'Navigateur:',
      safe_text: 'Si c\'était vous, vous pouvez ignorer cet e-mail en toute sécurité.',
      warning_title: 'Si vous ne reconnaissez pas cette activité,',
      warning_text: 'sécurisez votre compte immédiatement.',
      button: 'Sécuriser Mon Compte'
    },
    
    username_changed: {
      subject: 'Nom d\'Utilisateur Mis à Jour - BitMinded',
      title: '👤 Nom d\'Utilisateur Mis à Jour',
      intro: 'Votre nom d\'utilisateur a été changé avec succès le',
      details_title: 'Détails du Changement:',
      previous: 'Nom d\'utilisateur précédent:',
      new: 'Nouveau nom d\'utilisateur:',
      warning: 'Si vous n\'avez pas effectué ce changement, veuillez contacter notre équipe de support immédiatement.'
    },
    
    family_member_added: {
      subject: 'Ajouté au Groupe Familial - BitMinded',
      title: '👨‍👩‍👧‍👦 Ajouté au Groupe Familial',
      intro: 'Vous avez été ajouté à un groupe familial le',
      family_name: 'Nom du Groupe:',
      admin_name: 'Administrateur du Groupe:',
      welcome_text: 'Bienvenue dans la famille! Vous avez maintenant accès aux avantages partagés du plan familial.',
      access_info: 'Ce que cela signifie:',
      access_items: [
        'Vous pouvez accéder aux avantages du plan familial',
        'L\'administrateur du groupe gère votre adhésion',
        'Vous pouvez voir les détails de la famille dans votre compte'
      ],
      button: 'Voir le Groupe Familial'
    },
    
    family_member_removed: {
      subject: 'Retiré du Groupe Familial - BitMinded',
      title: '⚠️ Retiré du Groupe Familial',
      intro: 'Vous avez été retiré d\'un groupe familial le',
      family_name: 'Nom du Groupe:',
      access_revoked: 'Accès Révoqué:',
      access_text: 'Votre accès aux avantages du plan familial a été révoqué.',
      button: 'Voir le Compte'
    },
    
    family_deleted: {
      subject: 'Groupe Familial Supprimé - BitMinded',
      title: '🗑️ Groupe Familial Supprimé',
      intro: 'Votre groupe familial a été supprimé le',
      family_name: 'Nom du Groupe:',
      subscription_cancelled: 'Abonnement Annulé:',
      subscription_text: 'L\'abonnement familial a été annulé et tout accès a été révoqué.',
      impact: 'Ce que cela signifie:',
      impact_items: [
        'Tous les membres de la famille ont été retirés',
        'Les avantages du plan familial ne sont plus disponibles',
        'Vous pouvez créer un nouveau groupe familial à tout moment'
      ],
      button: 'Voir le Compte'
    },
    
    family_member_left: {
      subject: 'Membre a Quitté le Groupe Familial - BitMinded',
      title: '👋 Membre a Quitté le Groupe Familial',
      intro: 'Un membre a quitté votre groupe familial le',
      family_name: 'Nom du Groupe:',
      member_name: 'Membre:',
      impact: 'Impact:',
      impact_text: 'L\'accès du membre aux avantages familiaux a été révoqué.',
      button: 'Gérer le Groupe Familial'
    },
    
    family_role_changed: {
      subject: 'Rôle Modifié dans le Groupe Familial - BitMinded',
      title: '👤 Rôle Modifié dans le Groupe Familial',
      intro: 'Votre rôle dans un groupe familial a été modifié le',
      family_name: 'Nom du Groupe:',
      new_role: 'Nouveau Rôle:',
      role_info: 'Détails du Rôle:',
      admin_permissions: 'En tant qu\'administrateur, vous pouvez:',
      admin_items: [
        'Ajouter et retirer des membres de la famille',
        'Modifier les rôles des membres',
        'Gérer l\'abonnement familial',
        'Supprimer le groupe familial'
      ],
      member_permissions: 'En tant que membre, vous pouvez:',
      member_items: [
        'Accéder aux avantages du plan familial',
        'Voir les détails de la famille',
        'Quitter le groupe familial'
      ],
      button: 'Voir le Groupe Familial'
    }
  },
  
  de: {
    tagline: 'Professionelle Digitale Lösungen',
    footer_notification: 'Dies ist eine Benachrichtigung von BitMinded',
    manage_preferences: 'Benachrichtigungseinstellungen verwalten',
    copyright: '© 2024 BitMinded. Alle Rechte vorbehalten.',
    
    // Device types
    devices: {
      mobile: 'Mobil',
      tablet: 'Tablet',
      desktop: 'Desktop',
      unknown: 'Unbekannt'
    },
    
    password_changed: {
      subject: 'Passwort Geändert - BitMinded',
      title: '🔒 Passwort Geändert',
      intro: 'Ihr Passwort wurde erfolgreich geändert am',
      details_title: 'Änderungsdetails:',
      device: 'Gerät:',
      warning_title: 'Sicherheitshinweis:',
      warning_text: 'Wenn Sie diese Änderung nicht vorgenommen haben, setzen Sie bitte sofort Ihr Passwort zurück und kontaktieren Sie unser Support-Team.',
      button: 'Passwort Zurücksetzen'
    },
    
    two_fa_enabled: {
      subject: 'Zwei-Faktor-Authentifizierung Aktiviert - BitMinded',
      title: '🛡️ Zwei-Faktor-Authentifizierung Aktiviert',
      success_title: 'Großartige Arbeit!',
      success_text: 'Ihr Konto ist jetzt sicherer mit aktivierter Zwei-Faktor-Authentifizierung.',
      intro: 'Die Zwei-Faktor-Authentifizierung wurde aktiviert am',
      next_text: 'Von nun an benötigen Sie Ihre Authentifizierungs-App zum Anmelden. Bewahren Sie Ihre Backup-Codes sicher auf!',
      info_title: 'Was das bedeutet:',
      info_items: [
        'Ihr Konto ist deutlich sicherer',
        'Sie benötigen Ihre Authentifizierungs-App zum Anmelden',
        'Bewahren Sie Ihre Backup-Codes an einem sicheren Ort auf'
      ]
    },
    
    two_fa_disabled: {
      subject: 'Zwei-Faktor-Authentifizierung Deaktiviert - BitMinded',
      title: '⚠️ Zwei-Faktor-Authentifizierung Deaktiviert',
      warning_title: 'Sicherheitswarnung:',
      warning_text: 'Die Zwei-Faktor-Authentifizierung wurde auf Ihrem Konto deaktiviert.',
      intro: '2FA wurde deaktiviert am',
      recommendation: 'Ihr Konto ist jetzt weniger sicher. Wir empfehlen dringend, 2FA wieder zu aktivieren, um Ihr Konto vor unbefugtem Zugriff zu schützen.',
      button: '2FA Wieder Aktivieren'
    },
    
    new_login: {
      subject: 'Neue Anmeldung Erkannt - BitMinded',
      title: '🔐 Neue Anmeldung Erkannt',
      intro: 'Wir haben eine neue Anmeldung bei Ihrem Konto festgestellt am',
      details_title: 'Anmeldedetails:',
      device: 'Gerät:',
      browser: 'Browser:',
      safe_text: 'Wenn Sie das waren, können Sie diese E-Mail sicher ignorieren.',
      warning_title: 'Wenn Sie diese Aktivität nicht erkennen,',
      warning_text: 'sichern Sie Ihr Konto sofort.',
      button: 'Mein Konto Sichern'
    },
    
    username_changed: {
      subject: 'Benutzername Aktualisiert - BitMinded',
      title: '👤 Benutzername Aktualisiert',
      intro: 'Ihr Benutzername wurde erfolgreich geändert am',
      details_title: 'Änderungsdetails:',
      previous: 'Vorheriger Benutzername:',
      new: 'Neuer Benutzername:',
      warning: 'Wenn Sie diese Änderung nicht vorgenommen haben, kontaktieren Sie bitte sofort unser Support-Team.'
    },
    
    family_member_added: {
      subject: 'Zu Familiengruppe Hinzugefügt - BitMinded',
      title: '👨‍👩‍👧‍👦 Zu Familiengruppe Hinzugefügt',
      intro: 'Sie wurden zu einer Familiengruppe hinzugefügt am',
      family_name: 'Gruppenname:',
      admin_name: 'Gruppenadministrator:',
      welcome_text: 'Willkommen in der Familie! Sie haben jetzt Zugang zu den gemeinsamen Familienvorteilen.',
      access_info: 'Was das bedeutet:',
      access_items: [
        'Sie können auf Familienplan-Vorteile zugreifen',
        'Der Gruppenadministrator verwaltet Ihre Mitgliedschaft',
        'Sie können Familiendetails in Ihrem Konto einsehen'
      ],
      button: 'Familiengruppe Anzeigen'
    },
    
    family_member_removed: {
      subject: 'Aus Familiengruppe Entfernt - BitMinded',
      title: '⚠️ Aus Familiengruppe Entfernt',
      intro: 'Sie wurden aus einer Familiengruppe entfernt am',
      family_name: 'Gruppenname:',
      access_revoked: 'Zugang Widerrufen:',
      access_text: 'Ihr Zugang zu den Familienplan-Vorteilen wurde widerrufen.',
      button: 'Konto Anzeigen'
    },
    
    family_deleted: {
      subject: 'Familiengruppe Gelöscht - BitMinded',
      title: '🗑️ Familiengruppe Gelöscht',
      intro: 'Ihre Familiengruppe wurde gelöscht am',
      family_name: 'Gruppenname:',
      subscription_cancelled: 'Abonnement Gekündigt:',
      subscription_text: 'Das Familienabonnement wurde gekündigt und der gesamte Zugang wurde widerrufen.',
      impact: 'Was das bedeutet:',
      impact_items: [
        'Alle Familienmitglieder wurden entfernt',
        'Familienplan-Vorteile sind nicht mehr verfügbar',
        'Sie können jederzeit eine neue Familiengruppe erstellen'
      ],
      button: 'Konto Anzeigen'
    },
    
    family_member_left: {
      subject: 'Mitglied Verlässt Familiengruppe - BitMinded',
      title: '👋 Mitglied Verlässt Familiengruppe',
      intro: 'Ein Mitglied hat Ihre Familiengruppe verlassen am',
      family_name: 'Gruppenname:',
      member_name: 'Mitglied:',
      impact: 'Auswirkung:',
      impact_text: 'Der Zugang des Mitglieds zu den Familienvorteilen wurde widerrufen.',
      button: 'Familiengruppe Verwalten'
    },
    
    family_role_changed: {
      subject: 'Rolle in Familiengruppe Geändert - BitMinded',
      title: '👤 Rolle in Familiengruppe Geändert',
      intro: 'Ihre Rolle in einer Familiengruppe wurde geändert am',
      family_name: 'Gruppenname:',
      new_role: 'Neue Rolle:',
      role_info: 'Rollendetails:',
      admin_permissions: 'Als Administrator können Sie:',
      admin_items: [
        'Familienmitglieder hinzufügen und entfernen',
        'Mitgliedsrollen ändern',
        'Familienabonnement verwalten',
        'Die Familiengruppe löschen'
      ],
      member_permissions: 'Als Mitglied können Sie:',
      member_items: [
        'Auf Familienplan-Vorteile zugreifen',
        'Familiendetails einsehen',
        'Die Familiengruppe verlassen'
      ],
      button: 'Familiengruppe Anzeigen'
    }
  }
}

// Helper function to translate device type
const translateDevice = (device: string, lang: string): string => {
  const deviceLower = device.toLowerCase()
  const translations = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].devices
  
  if (deviceLower.includes('mobile') || deviceLower.includes('iphone') || deviceLower.includes('android')) {
    return translations.mobile
  } else if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
    return translations.tablet
  } else if (deviceLower.includes('desktop') || deviceLower.includes('computer')) {
    return translations.desktop
  } else {
    return device // Return original if no match
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
  .success-box {
    background: #d1fae5;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #10b981;
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

// Email template generators (language-aware)
const generatePasswordChangedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].password_changed
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  const translatedDevice = translateDevice(data.device || 'Unknown', lang)
  
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.details_title}</strong><br>
              📱 ${t.device} ${translatedDevice}
            </div>
            <div class="highlight">
              <strong>${t.warning_title}</strong> ${t.warning_text}
            </div>
            <div class="button-container">
              <a href="${data.resetUrl || 'https://bitminded.github.io/auth'}" class="button">${t.button}</a>
            </div>
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

const generateTwoFAEnabledEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].two_fa_enabled
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <strong>${t.success_title}</strong> ${t.success_text}
            </div>
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <p>${t.next_text}</p>
            <div class="info-box">
              <strong>${t.info_title}</strong>
              <ul style="margin: 10px 0;">
                ${t.info_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
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

const generateTwoFADisabledEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].two_fa_disabled
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <div class="highlight">
              <strong>${t.warning_title}</strong> ${t.warning_text}
            </div>
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <p>${t.recommendation}</p>
            <div class="button-container">
              <a href="${data.securityUrl || 'https://bitminded.github.io/account?section=security'}" class="button">${t.button}</a>
            </div>
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

const generateNewLoginEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].new_login
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  const translatedDevice = translateDevice(data.device || 'Unknown', lang)
  
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.details_title}</strong><br>
              📱 ${t.device} ${translatedDevice}<br>
              🖥️ ${t.browser} ${data.browser || 'Unknown'}
            </div>
            <p>${t.safe_text}</p>
            <div class="highlight">
              <strong>${t.warning_title}</strong> ${t.warning_text}
            </div>
            <div class="button-container">
              <a href="${data.securityUrl || 'https://bitminded.github.io/account?section=security'}" class="button">${t.button}</a>
            </div>
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

const generateUsernameChangedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].username_changed
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.details_title}</strong><br>
              ${t.previous} ${data.oldUsername || 'N/A'}<br>
              ${t.new} ${data.newUsername || 'N/A'}
            </div>
            <p>${t.warning}</p>
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

const generateFamilyMemberAddedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_added
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="success-box">
              <strong>${t.welcome_text}</strong>
            </div>
            <div class="info-box">
              <strong>${t.family_name}</strong> ${data.familyName || 'N/A'}<br>
              ${t.admin_name} ${data.adminName || 'N/A'}
            </div>
            <div class="info-box">
              <strong>${t.access_info}</strong>
              <ul style="margin: 10px 0;">
                ${t.access_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="button-container">
              <a href="${data.familyUrl || 'https://bitminded.github.io/account?section=family'}" class="button">${t.button}</a>
            </div>
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

const generateFamilyMemberRemovedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_removed
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.family_name}</strong> ${data.familyName || 'N/A'}
            </div>
            <div class="highlight">
              <strong>${t.access_revoked}</strong> ${t.access_text}
            </div>
            <div class="button-container">
              <a href="${data.accountUrl || 'https://bitminded.github.io/account'}" class="button">${t.button}</a>
            </div>
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

const generateFamilyDeletedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_deleted
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.family_name}</strong> ${data.familyName || 'N/A'}
            </div>
            <div class="highlight">
              <strong>${t.subscription_cancelled}</strong> ${t.subscription_text}
            </div>
            <div class="info-box">
              <strong>${t.impact}</strong>
              <ul style="margin: 10px 0;">
                ${t.impact_items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="button-container">
              <a href="${data.accountUrl || 'https://bitminded.github.io/account'}" class="button">${t.button}</a>
            </div>
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

const generateFamilyMemberLeftEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_left
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.family_name}</strong> ${data.familyName || 'N/A'}<br>
              <strong>${t.member_name}</strong> ${data.memberName || 'N/A'}
            </div>
            <div class="info-box">
              <strong>${t.impact}</strong> ${t.impact_text}
            </div>
            <div class="button-container">
              <a href="${data.familyUrl || 'https://bitminded.github.io/account?section=family'}" class="button">${t.button}</a>
            </div>
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

const generateFamilyRoleChangedEmail = (data: any, lang: string = 'en') => {
  const t = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_role_changed
  const common = EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS]
  
  const isAdmin = data.newRole === 'admin'
  const permissions = isAdmin ? t.admin_permissions : t.member_permissions
  const items = isAdmin ? t.admin_items : t.member_items
  
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
            <p>${t.intro} <strong>${data.timestamp || new Date().toLocaleDateString(lang)}</strong>.</p>
            <div class="info-box">
              <strong>${t.family_name}</strong> ${data.familyName || 'N/A'}<br>
              <strong>${t.new_role}</strong> ${data.newRole || 'N/A'}
            </div>
            <div class="success-box">
              <strong>${t.role_info}</strong><br>
              <strong>${permissions}</strong>
              <ul style="margin: 10px 0;">
                ${items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="button-container">
              <a href="${data.familyUrl || 'https://bitminded.github.io/account?section=family'}" class="button">${t.button}</a>
            </div>
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

// Email template map
const EMAIL_TEMPLATES: Record<string, { subject: (lang: string) => string, html: (data: any, lang: string) => string }> = {
  password_changed: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].password_changed.subject,
    html: generatePasswordChangedEmail
  },
  two_fa_enabled: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].two_fa_enabled.subject,
    html: generateTwoFAEnabledEmail
  },
  two_fa_disabled: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].two_fa_disabled.subject,
    html: generateTwoFADisabledEmail
  },
  new_login: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].new_login.subject,
    html: generateNewLoginEmail
  },
  username_changed: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].username_changed.subject,
    html: generateUsernameChangedEmail
  },
  family_member_added: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_added.subject,
    html: generateFamilyMemberAddedEmail
  },
  family_member_removed: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_removed.subject,
    html: generateFamilyMemberRemovedEmail
  },
  family_deleted: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_deleted.subject,
    html: generateFamilyDeletedEmail
  },
  family_member_left: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_member_left.subject,
    html: generateFamilyMemberLeftEmail
  },
  family_role_changed: {
    subject: (lang: string) => EMAIL_TRANSLATIONS[lang as keyof typeof EMAIL_TRANSLATIONS].family_role_changed.subject,
    html: generateFamilyRoleChangedEmail
  }
}

// Map notification types to specific preference keys
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  password_changed: 'password_changed',
  two_fa_enabled: 'two_fa',
  two_fa_disabled: 'two_fa',
  new_login: 'new_login',
  username_changed: 'username_changed',
  family_member_added: 'family_member_added',
  family_member_removed: 'family_member_removed',
  family_deleted: 'family_deleted',
  family_member_left: 'family_member_left',
  family_role_changed: 'family_role_changed',
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

    // Get user's notification preferences AND language preference
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('notification_preferences, language')
      .eq('user_id', userId)
      .single()

    if (prefsError) {
      console.log('⚠️ No preferences found, using defaults')
    }

    // Get user's language (default to 'en' if not set)
    const userLanguage = prefs?.language || 'en'
    console.log(`🌐 User language: ${userLanguage}`)

    // Check if this notification type should be sent
    const preferenceKey = NOTIFICATION_TYPE_MAP[type]
    
    if (!preferenceKey) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    const emailPrefs = prefs?.notification_preferences?.email || {}
    const shouldSend = emailPrefs[preferenceKey] !== false

    if (!shouldSend) {
      console.log(`⏭️ User disabled ${preferenceKey} notifications, skipping email`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: `User disabled ${preferenceKey} notifications` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get email template
    const template = EMAIL_TEMPLATES[type]
    
    if (!template) {
      throw new Error(`No email template found for type: ${type}`)
    }

    // Prepare email data with user's language
    const emailData = {
      to: user.email,
      subject: template.subject(userLanguage),
      html: template.html(data, userLanguage)
    }

    console.log(`📧 Sending email to: ${user.email}`)
    console.log(`📝 Subject: ${emailData.subject}`)
    console.log(`🌐 Language: ${userLanguage}`)
    console.log(`✅ Notification type: ${type}`)

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

    console.log('✅ Email sent successfully via Resend')
    console.log('📬 Email ID:', emailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email notification sent',
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
    console.error('❌ Error sending notification:', error)
    
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

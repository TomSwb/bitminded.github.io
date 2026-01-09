/**
 * Notification Helper
 * Easy-to-use helper for sending notification emails via Edge Function
 * 
 * Usage:
 * import { sendNotification } from '/js/notification-helper.js'
 * await sendNotification('password_changed', { device: 'Chrome', location: 'New York' })
 */

class NotificationHelper {
    constructor() {
        this.functionUrl = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the notification helper
     */
    async init() {
        if (this.isInitialized) return;

        // Get Supabase URL from config
        if (typeof supabase !== 'undefined') {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Construct Edge Function URL
                const supabaseUrl = supabase.supabaseUrl || window.SUPABASE_URL;
                this.functionUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
                this.isInitialized = true;
            }
        }
    }

    /**
     * Create in-app notification directly in database
     * @private
     */
    async createInAppNotification(userId, type, data, language, preferences) {
        // Notification templates with translations
        const templates = {
            password_changed: {
                en: { title: 'Password Changed', message: 'Your password was successfully changed.', icon: '🔒' },
                es: { title: 'Contraseña Cambiada', message: 'Tu contraseña ha sido cambiada exitosamente.', icon: '🔒' },
                fr: { title: 'Mot de passe modifié', message: 'Votre mot de passe a été modifié avec succès.', icon: '🔒' },
                de: { title: 'Passwort geändert', message: 'Ihr Passwort wurde erfolgreich geändert.', icon: '🔒' }
            },
            two_fa_enabled: {
                en: { title: '2FA Enabled', message: 'Two-factor authentication has been enabled on your account.', icon: '🔐' },
                es: { title: '2FA Activado', message: 'La autenticación de dos factores ha sido activada en tu cuenta.', icon: '🔐' },
                fr: { title: '2FA activé', message: 'L\'authentification à deux facteurs a été activée sur votre compte.', icon: '🔐' },
                de: { title: '2FA aktiviert', message: 'Die Zwei-Faktor-Authentifizierung wurde für Ihr Konto aktiviert.', icon: '🔐' }
            },
            two_fa_disabled: {
                en: { title: '2FA Disabled', message: 'Two-factor authentication has been disabled on your account.', icon: '🔓' },
                es: { title: '2FA Desactivado', message: 'La autenticación de dos factores ha sido desactivada en tu cuenta.', icon: '🔓' },
                fr: { title: '2FA désactivé', message: 'L\'authentification à deux facteurs a été désactivée sur votre compte.', icon: '🔓' },
                de: { title: '2FA deaktiviert', message: 'Die Zwei-Faktor-Authentifizierung wurde für Ihr Konto deaktiviert.', icon: '🔓' }
            },
            new_login: {
                en: { title: 'New Login', message: 'A new login was detected on your account.', icon: '🔑' },
                es: { title: 'Nuevo Inicio de Sesión', message: 'Se detectó un nuevo inicio de sesión en tu cuenta.', icon: '🔑' },
                fr: { title: 'Nouvelle connexion', message: 'Une nouvelle connexion a été détectée sur votre compte.', icon: '🔑' },
                de: { title: 'Neue Anmeldung', message: 'Eine neue Anmeldung wurde in Ihrem Konto erkannt.', icon: '🔑' }
            },
            username_changed: {
                en: { title: 'Username Changed', message: 'Your username was successfully updated.', icon: '👤' },
                es: { title: 'Nombre de Usuario Cambiado', message: 'Tu nombre de usuario ha sido actualizado exitosamente.', icon: '👤' },
                fr: { title: 'Nom d\'utilisateur modifié', message: 'Votre nom d\'utilisateur a été mis à jour avec succès.', icon: '👤' },
                de: { title: 'Benutzername geändert', message: 'Ihr Benutzername wurde erfolgreich aktualisiert.', icon: '👤' }
            },
            family_member_added: {
                en: { title: 'Added to Family', message: `You've been added to ${data.familyName || 'a family group'}.`, icon: '👨‍👩‍👧‍👦' },
                es: { title: 'Agregado a Familia', message: `Has sido agregado a ${data.familyName || 'un grupo familiar'}.`, icon: '👨‍👩‍👧‍👦' },
                fr: { title: 'Ajouté à la famille', message: `Vous avez été ajouté à ${data.familyName || 'un groupe familial'}.`, icon: '👨‍👩‍👧‍👦' },
                de: { title: 'Zur Familie hinzugefügt', message: `Sie wurden zu ${data.familyName || 'einer Familiengruppe'} hinzugefügt.`, icon: '👨‍👩‍👧‍👦' }
            },
            family_member_removed: {
                en: { title: 'Removed from Family', message: `You've been removed from ${data.familyName || 'a family group'}.`, icon: '⚠️' },
                es: { title: 'Removido de Familia', message: `Has sido removido de ${data.familyName || 'un grupo familiar'}.`, icon: '⚠️' },
                fr: { title: 'Retiré de la famille', message: `Vous avez été retiré de ${data.familyName || 'un groupe familial'}.`, icon: '⚠️' },
                de: { title: 'Aus Familie entfernt', message: `Sie wurden aus ${data.familyName || 'einer Familiengruppe'} entfernt.`, icon: '⚠️' }
            },
            family_deleted: {
                en: { title: 'Family Deleted', message: `Your family group "${data.familyName || 'Family'}" has been deleted.`, icon: '🗑️' },
                es: { title: 'Familia Eliminada', message: `Tu grupo familiar "${data.familyName || 'Familia'}" ha sido eliminado.`, icon: '🗑️' },
                fr: { title: 'Famille supprimée', message: `Votre groupe familial "${data.familyName || 'Famille'}" a été supprimé.`, icon: '🗑️' },
                de: { title: 'Familie gelöscht', message: `Ihre Familiengruppe "${data.familyName || 'Familie'}" wurde gelöscht.`, icon: '🗑️' }
            },
            family_member_left: {
                en: { title: 'Member Left', message: `${data.memberName || 'A member'} left your family group "${data.familyName || 'Family'}".`, icon: '👋' },
                es: { title: 'Miembro Salió', message: `${data.memberName || 'Un miembro'} dejó tu grupo familiar "${data.familyName || 'Familia'}".`, icon: '👋' },
                fr: { title: 'Membre parti', message: `${data.memberName || 'Un membre'} a quitté votre groupe familial "${data.familyName || 'Famille'}".`, icon: '👋' },
                de: { title: 'Mitglied verlassen', message: `${data.memberName || 'Ein Mitglied'} hat Ihre Familiengruppe "${data.familyName || 'Familie'}" verlassen.`, icon: '👋' }
            },
            family_role_changed: {
                en: { title: 'Role Changed', message: `Your role in "${data.familyName || 'Family'}" has been changed to ${data.newRole || 'member'}.`, icon: '👤' },
                es: { title: 'Rol Cambiado', message: `Tu rol en "${data.familyName || 'Familia'}" ha sido cambiado a ${data.newRole || 'miembro'}.`, icon: '👤' },
                fr: { title: 'Rôle modifié', message: `Votre rôle dans "${data.familyName || 'Famille'}" a été modifié en ${data.newRole || 'membre'}.`, icon: '👤' },
                de: { title: 'Rolle geändert', message: `Ihre Rolle in "${data.familyName || 'Familie'}" wurde zu ${data.newRole || 'Mitglied'} geändert.`, icon: '👤' }
            }
        };

        const typeCategories = {
            password_changed: 'security',
            two_fa_enabled: 'security',
            two_fa_disabled: 'security',
            new_login: 'security',
            username_changed: 'account',
            family_member_added: 'account',
            family_member_removed: 'account',
            family_deleted: 'account',
            family_member_left: 'account',
            family_role_changed: 'account'
        };

        // Check if user wants in-app notifications for this type
        let preferenceKey = type.replace('two_fa_enabled', 'two_fa').replace('two_fa_disabled', 'two_fa');
        // Family notifications use the same key as the type
        if (type.startsWith('family_')) {
            preferenceKey = type;
        }
        const isEnabled = preferences[preferenceKey] !== false;

        if (!isEnabled) {
            return { skipped: true, reason: `User disabled ${preferenceKey} in-app notifications` };
        }

        // Get template
        const template = templates[type];
        if (!template) {
            return { error: new Error(`Unknown notification type: ${type}`) };
        }

        const translation = template[language] || template.en;
        const notificationType = typeCategories[type] || 'account';

        // Use the basic message - details will be shown separately in the details box
        try {
            const { data: result, error } = await supabase
                .from('user_notifications')
                .insert({
                    user_id: userId,
                    type: notificationType,
                    title: translation.title,
                    message: translation.message,
                    icon: translation.icon,
                    link: '/account?section=notifications',
                    data: data || {}
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: result };
        } catch (error) {
            return { error };
        }
    }

    /**
     * Send a notification (both email and in-app)
     * @param {string} type - Notification type (password_changed, email_changed, etc.)
     * @param {object} data - Additional data for the email template
     * @returns {Promise<object>} Result of the notification
     */
    async send(type, data = {}) {
        try {
            // Ensure initialized
            await this.init();

            if (!this.isInitialized) {
                window.logger?.warn('⚠️ Notification helper not initialized, skipping notification');
                return { success: false, error: 'Not initialized' };
            }

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                window.logger?.warn('⚠️ No user found, skipping notification');
                return { success: false, error: 'No user' };
            }

            window.logger?.log(`📧 Sending ${type} notification to user ${user.id}`);

            // Format timestamp in user's timezone and language
            const userLanguage = (typeof i18next !== 'undefined' && i18next.language) || 'en';
            const formattedTimestamp = new Date().toLocaleString(userLanguage, {
                dateStyle: 'long',
                timeStyle: 'short'
            });

            // Get user's preferences
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('notification_preferences')
                .eq('user_id', user.id)
                .single();

            const inappPrefs = preferences?.notification_preferences?.inapp || {};

            // Send both email and in-app notification in parallel
            const [emailResult, inAppResult] = await Promise.all([
                // Send email notification
                window.invokeEdgeFunction('send-notification-email', {
                    body: {
                        userId: user.id,
                        type: type,
                        data: {
                            ...data,
                            timestamp: formattedTimestamp
                        }
                    }
                }).catch(error => ({ error })),
                
                // Create in-app notification directly in database
                this.createInAppNotification(user.id, type, data, userLanguage, inappPrefs)
            ]);

            // Check email result
            if (emailResult && emailResult.error) {
                window.logger?.error('❌ Failed to send email:', emailResult.error);
            } else if (emailResult?.skipped) {
                window.logger?.log(`⏭️ Email skipped: ${emailResult.reason}`);
            } else if (emailResult) {
                window.logger?.log(`✅ Email sent: ${type}`);
            }

            // Check in-app result
            if (inAppResult.error) {
                window.logger?.error('❌ Failed to create in-app notification:', inAppResult.error);
            } else if (inAppResult.skipped) {
                window.logger?.log(`⏭️ In-app notification skipped: ${inAppResult.reason}`);
            } else {
                window.logger?.log(`✅ In-app notification created: ${type}`);
                
                // Refresh notification center if it exists
                if (typeof window.notificationCenter !== 'undefined' && window.notificationCenter.refresh) {
                    window.notificationCenter.refresh();
                }
            }

            return { 
                success: true, 
                email: emailResult.data,
                inApp: inAppResult.data
            };

        } catch (error) {
            window.logger?.error('❌ Error sending notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send password changed notification
     * @param {object} options - { device, resetUrl }
     */
    async passwordChanged(options = {}) {
        return this.send('password_changed', {
            device: options.device || this.getDeviceInfo(),
            resetUrl: options.resetUrl || `${window.location.origin}/auth`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send email changed notification
     * @param {string} oldEmail - Previous email address
     * @param {string} newEmail - New email address
     */
    async emailChanged(oldEmail, newEmail) {
        return this.send('email_changed', {
            oldEmail,
            newEmail,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send 2FA enabled notification
     */
    async twoFAEnabled() {
        return this.send('two_fa_enabled', {
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send 2FA disabled notification
     */
    async twoFADisabled() {
        return this.send('two_fa_disabled', {
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send new login notification
     * @param {object} options - { device, browser }
     */
    async newLogin(options = {}) {
        return this.send('new_login', {
            device: options.device || this.getDeviceInfo(),
            browser: options.browser || this.getBrowserInfo(),
            securityUrl: `${window.location.origin}/account?section=security`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send username changed notification
     * @param {string} oldUsername - Previous username
     * @param {string} newUsername - New username
     */
    async usernameChanged(oldUsername, newUsername) {
        return this.send('username_changed', {
            oldUsername,
            newUsername,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send family member added notification
     * @param {string} familyName - Family group name
     * @param {string} adminName - Admin name
     */
    async familyMemberAdded(familyName, adminName) {
        return this.send('family_member_added', {
            familyName,
            adminName,
            familyUrl: `${window.location.origin}/account?section=family`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send family member removed notification
     * @param {string} familyName - Family group name
     */
    async familyMemberRemoved(familyName) {
        return this.send('family_member_removed', {
            familyName,
            accountUrl: `${window.location.origin}/account`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send family deleted notification
     * @param {string} familyName - Family group name
     */
    async familyDeleted(familyName) {
        return this.send('family_deleted', {
            familyName,
            accountUrl: `${window.location.origin}/account`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send family member left notification
     * @param {string} memberName - Name of the member who left
     * @param {string} familyName - Family group name
     */
    async familyMemberLeft(memberName, familyName) {
        return this.send('family_member_left', {
            memberName,
            familyName,
            familyUrl: `${window.location.origin}/account?section=family`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Send family role changed notification
     * @param {string} familyName - Family group name
     * @param {string} newRole - New role (admin or member)
     */
    async familyRoleChanged(familyName, newRole) {
        return this.send('family_role_changed', {
            familyName,
            newRole,
            familyUrl: `${window.location.origin}/account?section=family`,
            preferencesUrl: `${window.location.origin}/account?section=notifications`
        });
    }

    /**
     * Get device information
     * @returns {string} Device info
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        
        if (/mobile/i.test(ua)) {
            return 'Mobile Device';
        } else if (/tablet/i.test(ua)) {
            return 'Tablet';
        } else {
            return 'Desktop Computer';
        }
    }

    /**
     * Get browser information
     * @returns {string} Browser name
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown Browser';
        
        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
        } else if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
        }
        
        return browser;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.notificationHelper = new NotificationHelper();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationHelper;
}


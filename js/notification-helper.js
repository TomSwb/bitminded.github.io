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
     * Send a notification email
     * @param {string} type - Notification type (password_changed, email_changed, etc.)
     * @param {object} data - Additional data for the email template
     * @returns {Promise<object>} Result of the notification
     */
    async send(type, data = {}) {
        try {
            // Ensure initialized
            await this.init();

            if (!this.isInitialized) {
                console.warn('⚠️ Notification helper not initialized, skipping notification');
                return { success: false, error: 'Not initialized' };
            }

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.warn('⚠️ No user found, skipping notification');
                return { success: false, error: 'No user' };
            }

            console.log(`📧 Sending ${type} notification to user ${user.id}`);

            // Call Edge Function
            const { data: result, error } = await supabase.functions.invoke('send-notification-email', {
                body: {
                    userId: user.id,
                    type: type,
                    data: data
                }
            });

            if (error) {
                console.error('❌ Failed to send notification:', error);
                return { success: false, error: error.message };
            }

            if (result.skipped) {
                console.log(`⏭️ Notification skipped: ${result.reason}`);
            } else {
                console.log(`✅ Notification sent: ${type}`);
            }

            return { success: true, ...result };

        } catch (error) {
            console.error('❌ Error sending notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send password changed notification
     * @param {object} options - { device, location, resetUrl }
     */
    async passwordChanged(options = {}) {
        return this.send('password_changed', {
            device: options.device || this.getDeviceInfo(),
            location: options.location || 'Unknown',
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
     * @param {object} options - { device, location, ip, browser }
     */
    async newLogin(options = {}) {
        return this.send('new_login', {
            device: options.device || this.getDeviceInfo(),
            location: options.location || 'Unknown',
            ip: options.ip || 'Unknown',
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


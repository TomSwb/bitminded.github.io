/**
 * Two-Factor Authentication Verification
 * Handles 2FA code verification during login
 */

class TwoFactorVerify {
    constructor() {
        this.isInitialized = false;
        this.userId = null;
        this.isUsingBackupCode = false;
        this.codeInput = null;
        this.backupCodeInput = null;
        this.verifyButton = null;
        this.errorContainer = null;
        this.errorText = null;
        this.loadingOverlay = null;
        this.totpSection = null;
        this.backupSection = null;
    }

    /**
     * Initialize the verification page
     */
    async init() {
        try {
            console.log('🔐 2FA Verify: Initializing...');

            // Apply saved theme
            this.applySavedTheme();

            // Initialize translations first
            await this.initializeTranslations();

            // Check for pending 2FA session
            this.userId = sessionStorage.getItem('pending_2fa_user');
            
            if (!this.userId) {
                // No pending 2FA verification - redirect to login
                this.showError('No pending 2FA verification found. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/auth/';
                }, 2000);
                return;
            }

            // Check session expiry (5 minutes)
            const sessionTime = sessionStorage.getItem('pending_2fa_time');
            if (sessionTime) {
                const elapsed = Date.now() - parseInt(sessionTime);
                if (elapsed > 5 * 60 * 1000) { // 5 minutes
                    sessionStorage.removeItem('pending_2fa_user');
                    sessionStorage.removeItem('pending_2fa_time');
                    this.showError('Session expired. Please log in again.');
                    setTimeout(() => {
                        window.location.href = '/auth/';
                    }, 2000);
                    return;
                }
            }

            // Get UI elements
            this.setupElements();

            // Setup event listeners
            this.setupEventListeners();

            // Focus on input
            if (this.codeInput) {
                this.codeInput.focus();
            }

            this.isInitialized = true;
            console.log('✅ 2FA Verify: Initialized successfully');

        } catch (error) {
            console.error('❌ 2FA Verify: Failed to initialize:', error);
            this.showError('Failed to initialize verification. Please try again.');
        }
    }

    /**
     * Setup UI elements
     */
    setupElements() {
        this.codeInput = document.getElementById('code-input');
        this.backupCodeInput = document.getElementById('backup-code-input');
        this.verifyButton = document.getElementById('btn-verify');
        this.errorContainer = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.totpSection = document.getElementById('totp-input-section');
        this.backupSection = document.getElementById('backup-input-section');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // TOTP code input
        if (this.codeInput) {
            this.codeInput.addEventListener('input', (e) => this.handleCodeInput(e));
            this.codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.verifyButton.disabled) {
                    this.handleVerify();
                }
            });
        }

        // Backup code input
        if (this.backupCodeInput) {
            this.backupCodeInput.addEventListener('input', (e) => this.handleBackupCodeInput(e));
            this.backupCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.verifyButton.disabled) {
                    this.handleVerify();
                }
            });
        }

        // Toggle backup code
        const toggleBtn = document.getElementById('toggle-backup');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleBackupCodeMode());
        }

        // Verify button
        if (this.verifyButton) {
            this.verifyButton.addEventListener('click', () => this.handleVerify());
        }

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Toggle between TOTP and backup code mode
     */
    toggleBackupCodeMode() {
        this.isUsingBackupCode = !this.isUsingBackupCode;
        
        const toggleBtn = document.getElementById('toggle-backup');
        const toggleText = toggleBtn.querySelector('.translatable-content');
        const translations = this.getTranslations();

        if (this.isUsingBackupCode) {
            // Show backup code input
            this.totpSection.style.display = 'none';
            this.backupSection.style.display = 'block';
            this.backupCodeInput.focus();
            
            // Update toggle button text
            const text = translations['Use authenticator app code'] || 'Use authenticator app code';
            if (toggleText) {
                toggleText.textContent = text;
                toggleText.setAttribute('data-translation-key', 'Use authenticator app code');
            }
        } else {
            // Show TOTP input
            this.backupSection.style.display = 'none';
            this.totpSection.style.display = 'block';
            this.codeInput.focus();
            
            // Update toggle button text
            const text = translations['Lost your phone? Use a backup code'] || 'Lost your phone? Use a backup code';
            if (toggleText) {
                toggleText.textContent = text;
                toggleText.setAttribute('data-translation-key', 'Lost your phone? Use a backup code');
            }
        }

        // Reset inputs
        this.codeInput.value = '';
        this.backupCodeInput.value = '';
        this.verifyButton.disabled = true;
        this.hideError();
    }

    /**
     * Handle TOTP code input
     */
    handleCodeInput(e) {
        const input = e.target;
        const code = input.value.replace(/\D/g, ''); // Only digits
        input.value = code;

        // Enable verify button when 6 digits entered
        this.verifyButton.disabled = code.length !== 6;

        // Remove error styling
        input.classList.remove('error');
        this.hideError();
    }

    /**
     * Handle backup code input
     */
    handleBackupCodeInput(e) {
        const input = e.target;
        let code = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
        // Auto-insert dashes at positions 4 and 8
        if (code.length > 4 && code[4] !== '-') {
            code = code.slice(0, 4) + '-' + code.slice(4);
        }
        if (code.length > 9 && code[9] !== '-') {
            code = code.slice(0, 9) + '-' + code.slice(9);
        }
        
        input.value = code;

        // Enable verify button when complete (XXXX-XXXX-XXXX = 14 chars)
        this.verifyButton.disabled = code.length !== 14;

        // Remove error styling
        input.classList.remove('error');
        this.hideError();
    }

    /**
     * Handle verification
     */
    async handleVerify() {
        const code = this.isUsingBackupCode 
            ? this.backupCodeInput.value 
            : this.codeInput.value;
        
        const expectedLength = this.isUsingBackupCode ? 14 : 6;
        
        if (code.length !== expectedLength) {
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            console.log(`🔧 2FA Verify: Verifying ${this.isUsingBackupCode ? 'backup code' : 'TOTP code'}...`);

            // Get current session token
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            // Get Supabase URL for Edge Function
            const supabaseUrl = supabase.supabaseUrl || window.location.origin;
            const functionUrl = `${supabaseUrl}/functions/v1/verify-2fa-code`;

            // Call Edge Function with authorization
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    userId: this.userId,
                    code: code,
                    type: this.isUsingBackupCode ? 'backup' : 'totp'
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ 2FA Verify: Code verified successfully');
                
                // Log successful 2FA verification
                await this.logLoginAttempt(this.userId, true, null, true);
                
                // Clear pending session
                sessionStorage.removeItem('pending_2fa_user');
                sessionStorage.removeItem('pending_2fa_time');

                // Redirect to account page
                window.location.href = '/account/';
            } else {
                console.log('❌ 2FA Verify: Invalid code');
                
                // Log failed 2FA verification
                const failureReason = this.isUsingBackupCode ? 'invalid_backup_code' : 'invalid_2fa';
                await this.logLoginAttempt(this.userId, false, failureReason, false);
                
                const errorMsg = this.isUsingBackupCode 
                    ? 'Invalid backup code. Please try again.'
                    : 'Invalid code. Please try again.';
                this.showVerifyError(errorMsg);
            }

        } catch (error) {
            console.error('❌ 2FA Verify: Verification error:', error);
            this.showVerifyError('Failed to verify code. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show verification error
     */
    showVerifyError(messageKey) {
        const translations = this.getTranslations();
        const message = translations[messageKey] || messageKey;

        this.codeInput.classList.add('error');
        this.errorText.textContent = message;
        this.errorContainer.style.display = 'flex';

        // Clear input
        this.codeInput.value = '';
        this.codeInput.focus();
        this.verifyButton.disabled = true;
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.errorContainer && this.errorText) {
            this.errorText.textContent = message;
            this.errorContainer.style.display = 'flex';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Apply saved theme from localStorage
     */
    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        console.log(`🎨 Theme applied: ${savedTheme}`);
    }

    /**
     * Get current translations
     */
    getTranslations() {
        const currentLanguage = localStorage.getItem('language') || 'en';
        if (window.twoFactorVerifyTranslations && window.twoFactorVerifyTranslations.translations) {
            return window.twoFactorVerifyTranslations.translations[currentLanguage] || window.twoFactorVerifyTranslations.translations['en'] || {};
        }
        return {};
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        if (window.twoFactorVerifyTranslations) {
            await window.twoFactorVerifyTranslations.init();
            this.updateTranslations();
        }
    }

    /**
     * Update all translations
     */
    updateTranslations() {
        if (window.twoFactorVerifyTranslations && window.twoFactorVerifyTranslations.isReady()) {
            window.twoFactorVerifyTranslations.updateTranslations();
        }
    }

    /**
     * Log login attempt to database
     */
    async logLoginAttempt(userId, success, failureReason = null, used2FA = false) {
        try {
            const userAgent = navigator.userAgent;
            const deviceInfo = this.parseUserAgent(userAgent);

            const logData = {
                user_id: userId,
                success: success,
                failure_reason: failureReason,
                user_agent: userAgent,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                used_2fa: used2FA
            };

            await supabase
                .from('user_login_activity')
                .insert(logData);

            console.log(`📊 Login attempt logged: ${success ? 'Success with 2FA' : 'Failed 2FA'}`);

            // Send new login notification if login was successful
            if (success && typeof window.notificationHelper !== 'undefined') {
                await window.notificationHelper.newLogin({
                    device: deviceInfo.deviceType || 'Unknown',
                    browser: deviceInfo.browser || 'Unknown'
                });
            }

        } catch (error) {
            console.error('Failed to log login attempt:', error);
        }
    }

    /**
     * Parse user agent to extract device info
     */
    parseUserAgent(userAgent) {
        const ua = userAgent.toLowerCase();
        
        let deviceType = 'desktop';
        if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
            deviceType = 'mobile';
        } else if (/ipad|tablet|playbook|silk/.test(ua)) {
            deviceType = 'tablet';
        }

        let browser = 'Unknown';
        if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('edge')) browser = 'Edge';
        else if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('opera')) browser = 'Opera';

        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

        return { deviceType, browser, os };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const verify = new TwoFactorVerify();
        verify.init();
    });
} else {
    const verify = new TwoFactorVerify();
    verify.init();
}


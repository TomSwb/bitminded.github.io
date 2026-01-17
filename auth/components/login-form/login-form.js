/**
 * Login Form Component
 * Handles user login with Supabase authentication
 */
class LoginForm {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.isSubmitting = false;
        this.failedAttempts = 0;
        this.maxAttempts = 3;
        
        this.init();
    }

    /**
     * Initialize the login form component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            // Security: If user navigated back from 2FA without completing, sign them out
            if (sessionStorage.getItem('pending_2fa_user')) {
                window.logger?.log('🔒 Pending 2FA detected on login page - signing out incomplete session');
                await window.supabase.auth.signOut();
                sessionStorage.removeItem('pending_2fa_user');
                sessionStorage.removeItem('pending_2fa_time');
            }
            
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.loadFailedAttempts();
            this.checkSuspensionError();
            this.isInitialized = true;
            
            // Login Form initialized silently
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Login Form:', error);
            this.showError('Failed to initialize login form');
        }
    }

    /**
     * Re-initialize the component after HTML injection
     */
    async reinit() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.updateTranslations();
            this.loadFailedAttempts();
            window.logger?.log('✅ Login Form re-initialized successfully');
        } catch (error) {
            window.logger?.error('❌ Failed to re-initialize Login Form:', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            form: document.getElementById('login-form'),
            email: document.getElementById('login-email'),
            password: document.getElementById('login-password'),
            
            // Error elements
            emailError: document.getElementById('login-email-error'),
            passwordError: document.getElementById('login-password-error'),
            
            // Forgot password link
            forgotPassword: document.getElementById('login-forgot-password')
        };
        
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form) return;

        // Form submission is now handled by universal submit button

        // Real-time validation
        this.elements.email.addEventListener('blur', () => this.validateEmail());
        this.elements.password.addEventListener('blur', () => this.validatePassword());

        // Forgot password link
        if (this.elements.forgotPassword) {
            this.elements.forgotPassword.addEventListener('click', (e) => this.handleForgotPassword(e));
        }

        // Listen for language changes
        window.addEventListener('languageChanged', async (e) => {
            // If translations aren't loaded yet, load them first
            if (!this.translations) {
                await this.loadTranslations();
            }
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('components/login-form/locales/login-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
            } else {
                window.logger?.warn('Failed to load login form translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load login form translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update all translatable elements
            const translatableElements = this.elements.form.querySelectorAll('[data-translate]');
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });
        }

        // Show translatable content
        this.showTranslatableContent();
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = this.elements.form.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Get current language from language switcher or localStorage
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        if (window.languageSwitcher) {
            return window.languageSwitcher.getCurrentLanguage();
        }
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isSubmitting) return;

        // Check if CAPTCHA is required and verify it
        if (this.requiresCaptcha() && !this.isCaptchaVerified()) {
            this.showError('Please complete the security verification');
            return;
        }

        // Validate all fields
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            // Field-specific errors are already displayed inline
            return;
        }

        this.setSubmitting(true);

        try {
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Sign in user
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: this.elements.email.value.trim(),
                password: this.elements.password.value
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                // Reset failed attempts on successful login
                this.resetFailedAttempts();
                
                // Check if user is suspended
                const { data: userProfile, error: profileError } = await window.supabase
                    .from('user_profiles')
                    .select('status, suspension_reason')
                    .eq('id', data.user.id)
                    .single();

                if (!profileError && userProfile && userProfile.status === 'suspended') {
                    // User is suspended - sign them out and show error
                    await window.supabase.auth.signOut();
                    this.showError(`Your account has been suspended. Reason: ${userProfile.suspension_reason || 'No reason provided'}. You should have received an email explaining this suspension. Please contact support@bitminded.ch for assistance.`);
                    return;
                }
                
                // Check if user has 2FA enabled
                const { data: twoFAData, error: twoFAError } = await window.supabase
                    .from('user_2fa')
                    .select('is_enabled')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                const has2FA = !twoFAError && twoFAData?.is_enabled;

                if (has2FA) {
                    // User has 2FA enabled - DON'T log yet, wait for 2FA verification
                    window.logger?.log('🔐 2FA enabled for user - redirecting to verification');
                    sessionStorage.setItem('pending_2fa_user', data.user.id);
                    sessionStorage.setItem('pending_2fa_time', Date.now().toString());
                    window.location.href = '/auth/2fa-verify/';
                } else {
                    // No 2FA - log successful login and redirect with session ID
                    const sessionId = data.session?.access_token || null;
                    await this.logLoginAttempt(data.user.id, true, null, false, sessionId);
                    window.location.href = '/';
                }
            }

        } catch (error) {
            window.logger?.error('Login error:', error);
            await this.handleLoginError(error);
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Wait for Supabase to be available
     */
    async waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabase) {
            throw new Error('Supabase client not available');
        }
    }

    /**
     * Handle login errors
     * @param {Error} error - Supabase error
     */
    async handleLoginError(error) {
        let errorMessage = 'An error occurred during login';
        let failureReason = 'unknown_error';

        switch (error.message) {
            case 'Invalid login credentials':
                errorMessage = 'Invalid email or password';
                this.showFieldError('password', errorMessage);
                await this.incrementFailedAttempts();
                break;
            case 'Email not confirmed':
                errorMessage = 'Please verify your email address before signing in';
                this.showFieldError('email', errorMessage);
                break;
            case 'Invalid email':
                errorMessage = 'Please enter a valid email address';
                this.showFieldError('email', errorMessage);
                break;
            default:
                this.showError(error.message || errorMessage);
                await this.incrementFailedAttempts();
        }
        
        // Note: We don't log failed password attempts because we don't know the user_id
        // Only successful logins and failed 2FA attempts (where we know the user) are logged
    }

    /**
     * Validate email field
     * @returns {boolean} True if valid
     */
    validateEmail() {
        const email = this.elements.email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showFieldError('email', 'Email is required');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        }

        this.clearFieldError('email');
        return true;
    }

    /**
     * Validate password field
     * @returns {boolean} True if valid
     */
    validatePassword() {
        const password = this.elements.password.value;

        if (!password) {
            this.showFieldError('password', 'Password is required');
            return false;
        }

        this.clearFieldError('password');
        return true;
    }

    /**
     * Show field-specific error
     * @param {string} fieldName - Field name
     * @param {string} message - Error message
     */
    showFieldError(fieldName, message) {
        const field = this.elements[fieldName];
        const errorElement = this.elements[`${fieldName}Error`];

        if (field && errorElement) {
            field.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    /**
     * Clear field-specific error
     * @param {string} fieldName - Field name
     */
    clearFieldError(fieldName) {
        const field = this.elements[fieldName];
        const errorElement = this.elements[`${fieldName}Error`];

        if (field && errorElement) {
            field.classList.remove('error');
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    /**
     * Show general error message
     * @param {string} message - Error message
     */
    showError(message) {
        // You could implement a toast notification system here
        window.logger?.error('Login Form Error:', message);
        alert(message); // Temporary - replace with better UX
    }

    /**
     * Set submitting state
     * @param {boolean} isSubmitting - Whether form is submitting
     */
    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        
        // Disable form inputs during submission
        if (this.elements.email) {
            this.elements.email.disabled = isSubmitting;
        }
        if (this.elements.password) {
            this.elements.password.disabled = isSubmitting;
        }
    }

    /**
     * Handle forgot password link click
     * @param {Event} e - Click event
     */
    handleForgotPassword(e) {
        e.preventDefault();
        
        // Dispatch custom event to switch to forgot password form
        window.dispatchEvent(new CustomEvent('authFormSwitch', {
            detail: { form: 'forgot-password' }
        }));
    }

    /**
     * Check for suspension error from 2FA redirect
     */
    checkSuspensionError() {
        const suspensionError = sessionStorage.getItem('suspension_error');
        if (suspensionError) {
            this.showError(suspensionError);
            sessionStorage.removeItem('suspension_error');
        }
    }

    /**
     * Load failed attempts from localStorage
     */
    loadFailedAttempts() {
        try {
            const stored = localStorage.getItem('login_failed_attempts');
            this.failedAttempts = stored ? parseInt(stored, 10) : 0;
        } catch (error) {
            window.logger?.warn('Failed to load failed attempts:', error);
            this.failedAttempts = 0;
        }
    }

    /**
     * Save failed attempts to localStorage
     */
    saveFailedAttempts() {
        try {
            localStorage.setItem('login_failed_attempts', this.failedAttempts.toString());
        } catch (error) {
            window.logger?.warn('Failed to save failed attempts:', error);
        }
    }

    /**
     * Increment failed attempts counter
     */
    async incrementFailedAttempts() {
        this.failedAttempts++;
        this.saveFailedAttempts();
        
        
        // Show CAPTCHA if threshold reached
        if (this.failedAttempts >= this.maxAttempts) {
            await this.showCaptcha();
        }
    }

    /**
     * Reset failed attempts counter
     */
    resetFailedAttempts() {
        this.failedAttempts = 0;
        this.saveFailedAttempts();
        this.hideCaptcha();
        window.logger?.log('✅ Reset failed attempts counter');
    }

    /**
     * Check if CAPTCHA is required
     * @returns {boolean} True if CAPTCHA is required
     */
    requiresCaptcha() {
        const required = this.failedAttempts >= this.maxAttempts;
        window.logger?.log(`🔍 CAPTCHA check: ${this.failedAttempts}/${this.maxAttempts} = ${required}`);
        return required;
    }

    /**
     * Check if CAPTCHA is verified
     * @returns {boolean} True if CAPTCHA is verified
     */
    isCaptchaVerified() {
        return window.captcha?.isCaptchaVerified();
    }

    /**
     * Show CAPTCHA widget
     */
    async showCaptcha() {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.classList.remove('hidden');
            window.logger?.log('🔒 CAPTCHA required - showing widget');
            
            // Wait a bit for the container to be visible, then initialize CAPTCHA
            setTimeout(async () => {
                await this.ensureCaptchaInitialized();
            }, 100);
        }
    }

    /**
     * Ensure CAPTCHA is initialized
     */
    async ensureCaptchaInitialized() {
        try {
            // Check if CAPTCHA component exists
            if (!window.CaptchaComponent) {
                window.logger?.error('❌ CAPTCHA component not loaded');
                return;
            }

            // Check if container is visible
            const captchaContainer = document.getElementById('captcha-container');
            if (!captchaContainer) {
                window.logger?.error('❌ CAPTCHA container not found');
                return;
            }

            window.logger?.log('🔍 CAPTCHA container found:', captchaContainer);

            // Ensure container is visible
            captchaContainer.classList.remove('hidden');

            // Initialize if not already done
            if (!window.captcha) {
                window.logger?.log('🔄 Initializing CAPTCHA for login...');
                window.captcha = new window.CaptchaComponent({
                    siteKey: '0x4AAAAAAB3ePnQXAhy39NwT',
                    theme: 'auto',
                    size: 'normal',
                    callback: (token) => {
                        window.logger?.log('✅ CAPTCHA verified for login:', token);
                    },
                    errorCallback: (error) => {
                        window.logger?.error('❌ CAPTCHA error for login:', error);
                    }
                });
            }

            // Initialize the component if needed
            if (window.captcha && !window.captcha.isInitialized) {
                await window.captcha.init();
                window.logger?.log('✅ CAPTCHA initialized for login');
            }

            // Wait a bit for the container to be visible in the DOM
            await new Promise(resolve => setTimeout(resolve, 100));

            // Render the widget - renderWidget() will handle if already rendered
            if (window.captcha && window.captcha.isInitialized) {
                window.logger?.log('🔄 Ensuring CAPTCHA widget is rendered...');
                // Check if widget element exists and is empty (needs rendering)
                const widgetElement = document.getElementById('captcha-widget');
                if (widgetElement && (!window.captcha.widgetId || widgetElement.children.length === 0)) {
                    await window.captcha.renderWidget();
                } else if (window.captcha.widgetId) {
                    // Widget already rendered, just ensure it's visible
                    window.logger?.log('✅ CAPTCHA widget already rendered');
                }
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize CAPTCHA for login:', error);
        }
    }

    /**
     * Hide CAPTCHA widget
     */
    hideCaptcha() {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.classList.add('hidden');
            window.logger?.log('🔓 CAPTCHA no longer required - hiding widget');
        }
    }

    /**
     * Clear failed attempts (for testing/debugging)
     */
    clearFailedAttempts() {
        this.failedAttempts = 0;
        this.saveFailedAttempts();
        this.hideCaptcha();
        window.logger?.log('🧹 Cleared failed attempts counter');
    }

    /**
     * Log login attempt to database via Edge Function (captures IP address)
     * @param {string} userId - User ID (null for failed attempts with unknown user)
     * @param {boolean} success - Whether login was successful
     * @param {string} failureReason - Reason for failure if unsuccessful
     * @param {boolean} used2FA - Whether 2FA was used
     * @param {string} sessionId - Session ID/access token (optional)
     */
    async logLoginAttempt(userId, success, failureReason = null, used2FA = false, sessionId = null) {
        try {
            // Parse user agent for device info
            const userAgent = navigator.userAgent;
            const deviceInfo = this.parseUserAgent(userAgent);

            // Call Edge Function to log (captures IP address server-side)
            try {
                await window.invokeEdgeFunction('log-login', {
                    body: {
                        user_id: userId,
                        success: success,
                        failure_reason: failureReason,
                        user_agent: userAgent,
                        device_type: deviceInfo.deviceType,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        used_2fa: used2FA,
                        session_id: sessionId
                    }
                });
            } catch (error) {
                window.logger?.error('❌ Error logging login attempt:', error);
                return;
            }

            window.logger?.log(`📊 Login attempt logged: ${success ? 'Success' : 'Failed'}${sessionId ? ' (session tracked)' : ''}`);

            // Send new login notification ONLY if login was successful AND 2FA was NOT used
            // (If 2FA is enabled, notification will be sent from 2fa-verify.js instead)
            // COMMENTED OUT: Login notifications disabled by default
            // if (success && !used2FA && typeof window.notificationHelper !== 'undefined') {
            //     await window.notificationHelper.newLogin({
            //         device: deviceInfo.deviceType || 'Unknown',
            //         browser: deviceInfo.browser || 'Unknown'
            //     });
            // }

        } catch (error) {
            // Don't fail login if logging fails
            window.logger?.error('Failed to log login attempt:', error);
        }
    }

    /**
     * Parse user agent to extract device info
     */
    parseUserAgent(userAgent) {
        const ua = userAgent.toLowerCase();
        
        // Detect device type
        let deviceType = 'desktop';
        if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
            deviceType = 'mobile';
        } else if (/ipad|tablet|playbook|silk/.test(ua)) {
            deviceType = 'tablet';
        }

        // Detect browser
        let browser = 'Unknown';
        if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('edge')) browser = 'Edge';
        else if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('opera')) browser = 'Opera';

        // Detect OS
        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

        return { deviceType, browser, os };
    }
}

// Create global instance
window.loginForm = new LoginForm();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.loginForm && !window.loginForm.isInitialized) {
            window.loginForm.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginForm;
}

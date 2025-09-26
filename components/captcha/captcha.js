/**
 * CAPTCHA Component
 * Reusable Cloudflare Turnstile CAPTCHA component
 */
class CaptchaComponent {
    constructor(options = {}) {
        this.options = {
            siteKey: options.siteKey || '0x4AAAAAAB3ePnQXAhy39NwT',
            theme: options.theme || 'auto', // 'light', 'dark', 'auto'
            size: options.size || 'normal', // 'normal', 'compact'
            language: options.language || 'auto',
            callback: options.callback || null,
            'error-callback': options.errorCallback || null,
            'expired-callback': options.expiredCallback || null,
            'timeout-callback': options.timeoutCallback || null,
            ...options
        };
        
        this.isInitialized = false;
        this.isVerified = false;
        this.token = null;
        this.elements = {};
        this.widgetId = null;
        this.translations = null;
        
        this.init();
    }

    /**
     * Initialize the CAPTCHA component
     */
    async init() {
        try {
            this.cacheElements();
            await this.loadTranslations();
            this.bindLanguageEvents();
            this.loadTurnstileScript();
            this.isInitialized = true;
            console.log('✅ CAPTCHA Component initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize CAPTCHA Component:', error);
            this.showError('Failed to initialize security verification');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('captcha-container'),
            widget: document.getElementById('captcha-widget'),
            error: document.getElementById('captcha-error'),
            loading: document.getElementById('captcha-loading'),
            loadingText: document.querySelector('#captcha-loading .captcha-loading-text')
        };

        if (!this.elements.container) {
            throw new Error('CAPTCHA container element not found');
        }
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            // Try different possible paths for the locales file
            const possiblePaths = [
                '../components/captcha/locales/captcha-locales.json',
                'components/captcha/locales/captcha-locales.json',
                '/components/captcha/locales/captcha-locales.json'
            ];
            
            let response = null;
            for (const path of possiblePaths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (response && response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ CAPTCHA translations loaded');
            } else {
                console.warn('Failed to load CAPTCHA translations from any path');
                // Use fallback translations
                this.translations = {
                    en: {
                        translation: {
                            'captcha.loading': 'Loading security verification...',
                            'captcha.error': 'Security verification failed. Please try again.',
                            'captcha.required': 'Please complete the security verification',
                            'captcha.expired': 'Security verification expired. Please try again.',
                            'captcha.timeout': 'Security verification timed out. Please try again.'
                        }
                    },
                    fr: {
                        translation: {
                            'captcha.loading': 'Chargement de la vérification de sécurité...',
                            'captcha.error': 'La vérification de sécurité a échoué. Veuillez réessayer.',
                            'captcha.required': 'Veuillez compléter la vérification de sécurité',
                            'captcha.expired': 'La vérification de sécurité a expiré. Veuillez réessayer.',
                            'captcha.timeout': 'La vérification de sécurité a expiré. Veuillez réessayer.'
                        }
                    }
                };
                this.updateTranslations(this.getCurrentLanguage());
            }
        } catch (error) {
            console.warn('Failed to load CAPTCHA translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update loading text
            if (this.elements.loadingText) {
                this.elements.loadingText.textContent = t['captcha.loading'] || 'Loading security verification...';
            }
        }
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
     * Load Turnstile script if not already loaded
     */
    loadTurnstileScript() {
        if (window.turnstile) {
            this.renderWidget();
            return;
        }

        this.showLoading();

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            this.renderWidget();
        };
        
        script.onerror = () => {
            this.hideLoading();
            this.showError('Failed to load security verification service');
        };

        document.head.appendChild(script);
    }

    /**
     * Render the Turnstile widget
     */
    renderWidget() {
        if (!window.turnstile) {
            this.hideLoading();
            this.showError('Security verification service not available');
            return;
        }

        // Check if widget is already rendered
        if (this.widgetId !== null) {
            console.log('🔄 CAPTCHA widget already rendered, skipping...');
            return;
        }

        try {
            this.hideLoading();
            
            this.widgetId = window.turnstile.render(this.elements.widget, {
                sitekey: this.options.siteKey,
                theme: this.options.theme,
                size: this.options.size,
                language: this.options.language,
                callback: (token) => this.onSuccess(token),
                'error-callback': (error) => this.onError(error),
                'expired-callback': () => this.onExpired(),
                'timeout-callback': () => this.onTimeout()
            });

            console.log('✅ Turnstile widget rendered successfully');
        } catch (error) {
            console.error('❌ Failed to render Turnstile widget:', error);
            this.showError('Failed to initialize security verification');
        }
    }

    /**
     * Render a mock CAPTCHA for development
     */
    renderMockCaptcha() {
        if (!this.elements.widget) {
            console.error('❌ CAPTCHA widget element not found');
            return;
        }
        
        // Hide loading state first
        this.hideLoading();
        
        // Create a mock CAPTCHA widget
        this.elements.widget.innerHTML = `
            <div class="captcha-mock-widget" onclick="window.captcha && window.captcha.simulateCaptchaSuccess()">
                <div class="captcha-mock-content">
                    <div class="captcha-mock-title">🔒 Mock CAPTCHA</div>
                    <div class="captcha-mock-subtitle">Click to simulate verification</div>
                </div>
            </div>
        `;
        
        // Ensure widget is visible
        this.elements.widget.style.display = 'flex';
        
        console.log('✅ Mock CAPTCHA rendered for development');
    }

    /**
     * Simulate CAPTCHA success (for development)
     */
    simulateCaptchaSuccess() {
        const mockToken = 'mock-token-' + Date.now();
        this.onSuccess(mockToken);
    }

    /**
     * Handle successful CAPTCHA verification
     * @param {string} token - Turnstile token
     */
    onSuccess(token) {
        this.isVerified = true;
        this.token = token;
        this.clearError();
        this.elements.widget.classList.add('success');
        
        console.log('✅ CAPTCHA verified successfully');
        
        // Call custom callback if provided
        if (this.options.callback && typeof this.options.callback === 'function') {
            this.options.callback(token);
        }

        // Dispatch custom event
        this.dispatchEvent('captchaSuccess', { token });
    }

    /**
     * Handle CAPTCHA error
     * @param {string} error - Error message
     */
    onError(error) {
        this.isVerified = false;
        this.token = null;
        this.elements.widget.classList.add('error');
        
        console.error('❌ CAPTCHA error:', error);
        this.showError(this.getTranslation('captcha.error') || 'Security verification failed. Please try again.');
        
        // Call custom error callback if provided
        if (this.options.errorCallback && typeof this.options.errorCallback === 'function') {
            this.options.errorCallback(error);
        }

        // Dispatch custom event
        this.dispatchEvent('captchaError', { error });
    }

    /**
     * Handle CAPTCHA expiration
     */
    onExpired() {
        this.isVerified = false;
        this.token = null;
        this.elements.widget.classList.remove('success');
        
        console.log('⚠️ CAPTCHA expired');
        this.showError(this.getTranslation('captcha.expired') || 'Security verification expired. Please try again.');
        
        // Call custom expired callback if provided
        if (this.options.expiredCallback && typeof this.options.expiredCallback === 'function') {
            this.options.expiredCallback();
        }

        // Dispatch custom event
        this.dispatchEvent('captchaExpired');
    }

    /**
     * Handle CAPTCHA timeout
     */
    onTimeout() {
        this.isVerified = false;
        this.token = null;
        this.elements.widget.classList.remove('success');
        
        console.log('⚠️ CAPTCHA timeout');
        this.showError(this.getTranslation('captcha.timeout') || 'Security verification timed out. Please try again.');
        
        // Call custom timeout callback if provided
        if (this.options.timeoutCallback && typeof this.options.timeoutCallback === 'function') {
            this.options.timeoutCallback();
        }

        // Dispatch custom event
        this.dispatchEvent('captchaTimeout');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.elements.error) {
            // Try to get translated message
            const translatedMessage = this.getTranslation('captcha.error') || message;
            this.elements.error.textContent = translatedMessage;
            this.elements.error.classList.add('show');
        }
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key
     * @returns {string} Translated text or key if not found
     */
    getTranslation(key) {
        if (this.translations?.[this.getCurrentLanguage()]) {
            return this.translations[this.getCurrentLanguage()].translation[key];
        }
        return null;
    }

    /**
     * Clear error message
     */
    clearError() {
        if (this.elements.error) {
            this.elements.error.textContent = '';
            this.elements.error.classList.remove('show');
        }
        this.elements.widget.classList.remove('error');
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.add('show');
        }
        if (this.elements.widget) {
            this.elements.widget.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.remove('show');
        }
        if (this.elements.widget) {
            this.elements.widget.style.display = 'flex';
        }
    }

    /**
     * Reset the CAPTCHA widget
     */
    reset() {
        if (window.turnstile && this.widgetId !== null) {
            window.turnstile.reset(this.widgetId);
        }
        
        this.isVerified = false;
        this.token = null;
        this.clearError();
        this.elements.widget.classList.remove('success');
        
        console.log('🔄 CAPTCHA reset');
    }

    /**
     * Get the current verification token
     * @returns {string|null} The verification token or null if not verified
     */
    getToken() {
        return this.isVerified ? this.token : null;
    }

    /**
     * Check if CAPTCHA is verified
     * @returns {boolean} True if verified
     */
    isCaptchaVerified() {
        return this.isVerified;
    }

    /**
     * Verify the CAPTCHA token on the server
     * @param {string} token - The CAPTCHA token to verify
     * @returns {Promise<boolean>} True if verification succeeds
     */
    async verifyToken(token = this.token) {
        if (!token) {
            return false;
        }

        try {
            // Use Supabase Edge Function for verification
            const supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co';
            const response = await fetch(`${supabaseUrl}/functions/v1/verify-captcha`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('❌ Failed to verify CAPTCHA token:', error);
            return false;
        }
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        this.elements.container.dispatchEvent(event);
    }

    /**
     * Listen for language changes
     */
    bindLanguageEvents() {
        window.addEventListener('languageChanged', async (e) => {
            // If translations aren't loaded yet, load them first
            if (!this.translations) {
                await this.loadTranslations();
            }
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Destroy the CAPTCHA component
     */
    destroy() {
        if (window.turnstile && this.widgetId !== null) {
            window.turnstile.remove(this.widgetId);
        }
        
        this.isInitialized = false;
        this.isVerified = false;
        this.token = null;
        this.widgetId = null;
        
        console.log('🗑️ CAPTCHA component destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaptchaComponent;
}

// Make available globally
window.CaptchaComponent = CaptchaComponent;

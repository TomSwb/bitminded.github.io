/**
 * Two-Factor Authentication Verification
 * Handles 2FA code verification during login
 */

class TwoFactorVerify {
    constructor() {
        this.isInitialized = false;
        this.userId = null;
        this.codeInput = null;
        this.verifyButton = null;
        this.errorContainer = null;
        this.errorText = null;
        this.loadingOverlay = null;
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
        this.verifyButton = document.getElementById('btn-verify');
        this.errorContainer = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Code input
        if (this.codeInput) {
            this.codeInput.addEventListener('input', (e) => this.handleCodeInput(e));
            this.codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.verifyButton.disabled) {
                    this.handleVerify();
                }
            });
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
     * Handle code input
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
     * Handle verification
     */
    async handleVerify() {
        const code = this.codeInput.value;
        
        if (code.length !== 6) {
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            console.log('🔧 2FA Verify: Verifying code...');

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
                    code: code
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ 2FA Verify: Code verified successfully');
                
                // Clear pending session
                sessionStorage.removeItem('pending_2fa_user');
                sessionStorage.removeItem('pending_2fa_time');

                // Redirect to account page
                window.location.href = '/account/';
            } else {
                console.log('❌ 2FA Verify: Invalid code');
                this.showVerifyError('Invalid code. Please try again.');
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


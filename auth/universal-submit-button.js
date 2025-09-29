/**
 * Universal Submit Button Controller
 * Handles form submission for both login and signup forms
 */
class UniversalSubmitButton {
    constructor() {
        this.isInitialized = false;
        this.currentMode = 'login'; // 'login', 'signup', or 'forgot-password'
        this.isSubmitting = false;
        this.elements = {};
        
        this.init();
    }

    /**
     * Initialize the universal submit button
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.updateButtonText();
            this.isInitialized = true;
            
            console.log('✅ Universal Submit Button initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Universal Submit Button:', error);
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            button: document.getElementById('auth-submit-button'),
            text: document.getElementById('auth-submit-text'),
            loading: document.getElementById('auth-submit-loading'),
            loadingText: document.getElementById('auth-submit-loading-text')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.button) return;

        // Button click handler
        this.elements.button.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Listen for auth mode changes
        window.addEventListener('authModeChanged', (e) => {
            this.setMode(e.detail.mode);
        });

        // Listen for language changes
        window.addEventListener('languageChanged', async (e) => {
            if (!this.translations) {
                await this.loadTranslations();
            }
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('locales/auth-locales.json');
            
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
            } else {
                console.warn('Failed to load universal submit button translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load universal submit button translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update translatable elements
            const translatableElements = document.querySelectorAll('.auth-submit-container [data-translate]');
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });
        }
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        if (window.languageSwitcher) {
            return window.languageSwitcher.getCurrentLanguage();
        }
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Set the current auth mode
     * @param {string} mode - 'login' or 'signup'
     */
    setMode(mode) {
        this.currentMode = mode;
        this.updateButtonText();
    }

    /**
     * Update button text based on current mode
     */
    updateButtonText() {
        if (!this.elements.text || !this.elements.loadingText) return;

        if (this.currentMode === 'login') {
            this.elements.text.setAttribute('data-translate', 'auth.submit');
            this.elements.loadingText.setAttribute('data-translate', 'auth.submitting');
            this.elements.text.textContent = 'Sign In';
            this.elements.loadingText.textContent = 'Signing in...';
        } else if (this.currentMode === 'forgot-password') {
            this.elements.text.setAttribute('data-translate', 'forgotPassword.submit');
            this.elements.loadingText.setAttribute('data-translate', 'forgotPassword.submitting');
            this.elements.text.textContent = 'Send Reset Link';
            this.elements.loadingText.textContent = 'Sending...';
        } else {
            this.elements.text.setAttribute('data-translate', 'auth.submitSignup');
            this.elements.loadingText.setAttribute('data-translate', 'auth.submittingSignup');
            this.elements.text.textContent = 'Create Account';
            this.elements.loadingText.textContent = 'Creating account...';
        }

        // Update translations if available
        if (this.translations) {
            this.updateTranslations();
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isSubmitting) return;

        this.setSubmitting(true);

        try {
            if (this.currentMode === 'login') {
                await this.handleLogin();
            } else if (this.currentMode === 'forgot-password') {
                await this.handleForgotPassword();
            } else {
                await this.handleSignup();
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message || 'An error occurred');
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        // Use the login form's validation and submission logic
        if (window.loginForm?.handleSubmit) {
            await window.loginForm.handleSubmit();
        } else {
            throw new Error('Login form not available');
        }
    }

    /**
     * Handle signup form submission
     */
    async handleSignup() {
        // Check terms checkbox first
        if (window.termsCheckbox && !window.termsCheckbox.isChecked()) {
            if (window.termsCheckbox.validate) {
                window.termsCheckbox.validate();
            }
            throw new Error('You must agree to the terms and conditions');
        }

        // Check CAPTCHA verification
        if (window.captcha && !window.captcha.isCaptchaVerified()) {
            throw new Error('Please complete the security verification');
        }

        // Use the signup form's validation and submission logic
        if (window.signupForm?.handleSubmit) {
            await window.signupForm.handleSubmit();
        } else {
            throw new Error('Signup form not available');
        }
    }

    /**
     * Handle forgot password form submission
     */
    async handleForgotPassword() {
        // Use the forgot password form's validation and submission logic
        if (window.forgotPasswordForm?.handleSubmit) {
            await window.forgotPasswordForm.handleSubmit();
        } else {
            throw new Error('Forgot password form not available');
        }
    }

    /**
     * Wait for Supabase to be available
     */
    async waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 50;

        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabase) {
            throw new Error('Authentication service not available');
        }
    }

    /**
     * Set submitting state
     * @param {boolean} isSubmitting - Whether form is submitting
     */
    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        this.elements.button.disabled = isSubmitting;
        
        if (isSubmitting) {
            this.elements.text.style.display = 'none';
            this.elements.loading.style.display = 'flex';
        } else {
            this.elements.text.style.display = 'block';
            this.elements.loading.style.display = 'none';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // You could implement a toast notification system here
        console.error('Form Error:', message);
        alert(message); // Temporary - replace with better UX
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Form Success:', message);
        alert(message); // Temporary - replace with better UX
    }
}

// Create global instance
window.universalSubmitButton = new UniversalSubmitButton();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.universalSubmitButton && !window.universalSubmitButton.isInitialized) {
            window.universalSubmitButton.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalSubmitButton;
}

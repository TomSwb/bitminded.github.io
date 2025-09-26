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
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.loadFailedAttempts();
            this.isInitialized = true;
            
            console.log('✅ Login Form initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Login Form:', error);
            this.showError('Failed to initialize login form');
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
            
            // Password toggle button
            togglePassword: document.getElementById('login-toggle-password')
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

        // Password visibility toggle
        this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());

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
                console.log('✅ Login form translations loaded');
            } else {
                console.warn('Failed to load login form translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load login form translations:', error);
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
                // Redirect to home page
                window.location.href = '/';
            }

        } catch (error) {
            console.error('Login error:', error);
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
        console.error('Login Form Error:', message);
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
        if (this.elements.togglePassword) {
            this.elements.togglePassword.disabled = isSubmitting;
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const field = this.elements.password;
        const toggleButton = this.elements.togglePassword;
        
        if (field && toggleButton) {
            const isPassword = field.type === 'password';
            field.type = isPassword ? 'text' : 'password';
            
            // Update button aria-label
            const action = isPassword ? 'Hide' : 'Show';
            toggleButton.setAttribute('aria-label', `${action} password visibility`);
        }
    }

    /**
     * Load failed attempts from localStorage
     */
    loadFailedAttempts() {
        try {
            const stored = localStorage.getItem('login_failed_attempts');
            this.failedAttempts = stored ? parseInt(stored, 10) : 0;
            console.log(`🔍 Loaded failed attempts: ${this.failedAttempts}`);
        } catch (error) {
            console.warn('Failed to load failed attempts:', error);
            this.failedAttempts = 0;
        }
    }

    /**
     * Save failed attempts to localStorage
     */
    saveFailedAttempts() {
        try {
            localStorage.setItem('login_failed_attempts', this.failedAttempts.toString());
            console.log(`💾 Saved failed attempts: ${this.failedAttempts}`);
        } catch (error) {
            console.warn('Failed to save failed attempts:', error);
        }
    }

    /**
     * Increment failed attempts counter
     */
    async incrementFailedAttempts() {
        this.failedAttempts++;
        this.saveFailedAttempts();
        
        console.log(`❌ Failed attempt ${this.failedAttempts}/${this.maxAttempts}`);
        
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
        console.log('✅ Reset failed attempts counter');
    }

    /**
     * Check if CAPTCHA is required
     * @returns {boolean} True if CAPTCHA is required
     */
    requiresCaptcha() {
        const required = this.failedAttempts >= this.maxAttempts;
        console.log(`🔍 CAPTCHA check: ${this.failedAttempts}/${this.maxAttempts} = ${required}`);
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
            console.log('🔒 CAPTCHA required - showing widget');
            
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
                console.error('❌ CAPTCHA component not loaded');
                return;
            }

            // Check if container is visible
            const captchaContainer = document.getElementById('captcha-container');
            if (!captchaContainer) {
                console.error('❌ CAPTCHA container not found');
                return;
            }

            console.log('🔍 CAPTCHA container found:', captchaContainer);

            // Initialize if not already done
            if (!window.captcha) {
                console.log('🔄 Initializing CAPTCHA for login...');
                window.captcha = new window.CaptchaComponent({
                    siteKey: '0x4AAAAAAB3ePnQXAhy39NwT',
                    theme: 'auto',
                    size: 'normal',
                    callback: (token) => {
                        console.log('✅ CAPTCHA verified for login:', token);
                    },
                    errorCallback: (error) => {
                        console.error('❌ CAPTCHA error for login:', error);
                    }
                });
            }

            // Initialize the component if needed
            if (window.captcha && !window.captcha.isInitialized) {
                await window.captcha.init();
                console.log('✅ CAPTCHA initialized for login');
            }

            // Force render the widget if it's not visible
            if (window.captcha && window.captcha.isInitialized) {
                console.log('🔄 Forcing CAPTCHA widget render...');
                await window.captcha.renderWidget();
            }
        } catch (error) {
            console.error('❌ Failed to initialize CAPTCHA for login:', error);
        }
    }

    /**
     * Hide CAPTCHA widget
     */
    hideCaptcha() {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.classList.add('hidden');
            console.log('🔓 CAPTCHA no longer required - hiding widget');
        }
    }

    /**
     * Clear failed attempts (for testing/debugging)
     */
    clearFailedAttempts() {
        this.failedAttempts = 0;
        this.saveFailedAttempts();
        this.hideCaptcha();
        console.log('🧹 Cleared failed attempts counter');
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

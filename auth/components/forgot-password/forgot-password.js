/**
 * Forgot Password Form Component
 * Handles password reset requests with Supabase authentication
 */
class ForgotPasswordForm {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.isSubmitting = false;
        
        this.init();
    }

    /**
     * Initialize the forgot password form component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            console.log('✅ Forgot Password Form initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Forgot Password Form:', error);
            this.showError('Failed to initialize forgot password form');
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
            console.log('✅ Forgot Password Form re-initialized successfully');
        } catch (error) {
            console.error('❌ Failed to re-initialize Forgot Password Form:', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            form: document.getElementById('forgot-password-form'),
            email: document.getElementById('forgot-password-email'),
            
            // Error elements
            emailError: document.getElementById('forgot-password-email-error'),
            
            // Success message
            successMessage: document.getElementById('forgot-password-success'),
            
            // Back link
            backLink: document.getElementById('forgot-password-back')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form) return;

        // Form submission
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        this.elements.email.addEventListener('blur', () => this.validateEmail());

        // Back to login link
        if (this.elements.backLink) {
            this.elements.backLink.addEventListener('click', (e) => this.handleBackToLogin(e));
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
            const response = await fetch('components/forgot-password/locales/forgot-password-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Forgot password form translations loaded');
            } else {
                console.warn('Failed to load forgot password form translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load forgot password form translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (!this.translations || !this.translations[language]) return;

        const translations = this.translations[language].translation;
        const elements = document.querySelectorAll('.forgot-password-form [data-translate]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });

        // Show translatable content
        this.showTranslatableContent();
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.forgot-password-form .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Get current language from document or default to 'en'
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return document.documentElement.lang || 'en';
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        this.setSubmitting(true);
        
        try {
            const email = this.elements.email.value.trim();
            
            // Send password reset email via Supabase
            await this.sendPasswordResetEmail(email);
            
            this.showSuccess();
            this.elements.form.reset();
            
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            this.showError('Failed to send password reset email. Please try again.');
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Send password reset email via Supabase
     * @param {string} email - User email
     */
    async sendPasswordResetEmail(email) {
        console.log('🔐 Password reset requested for:', email);
        
        // Wait for Supabase to be available
        if (!window.supabase) {
            throw new Error('Supabase client not available');
        }
        
        const redirectUrl = `${window.location.origin}/auth/index.html?action=reset-password`;
        console.log('🔗 Redirect URL being sent to Supabase:', redirectUrl);
        
        // Send password reset email
        const { data, error } = await window.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });
        
        console.log('📧 Password reset response:', { data, error });
        
        if (error) {
            console.error('❌ Supabase password reset error:', error);
            throw new Error(error.message || 'Failed to send password reset email');
        }
        
        console.log('✅ Password reset email sent successfully');
        console.log('⚠️ Make sure this URL is in your Supabase Redirect URLs:', redirectUrl);
    }

    /**
     * Handle back to login link click
     * @param {Event} e - Click event
     */
    handleBackToLogin(e) {
        e.preventDefault();
        
        // Dispatch custom event to switch back to login form
        window.dispatchEvent(new CustomEvent('authFormSwitch', {
            detail: { form: 'login' }
        }));
    }

    /**
     * Validate the entire form
     * @returns {boolean} True if valid
     */
    validateForm() {
        let isValid = true;
        
        // Validate email
        if (!this.validateEmail()) {
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Validate email field
     * @returns {boolean} True if valid
     */
    validateEmail() {
        const email = this.elements.email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        this.clearFieldError('email');
        
        if (!email) {
            this.showFieldError('email', 'Email address is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        }
        
        return true;
    }

    /**
     * Show field error
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
     * Clear field error
     * @param {string} fieldName - Field name
     */
    clearFieldError(fieldName) {
        const field = this.elements[fieldName];
        const errorElement = this.elements[`${fieldName}Error`];
        
        if (field && errorElement) {
            field.classList.remove('error');
            errorElement.classList.remove('show');
        }
    }

    /**
     * Show success message
     */
    showSuccess() {
        if (this.elements.successMessage) {
            this.elements.successMessage.classList.add('show');
        }
        
        // Hide the email field
        if (this.elements.email) {
            const emailFieldContainer = this.elements.email.closest('.forgot-password-form__field');
            if (emailFieldContainer) {
                emailFieldContainer.style.display = 'none';
            }
        }
        
        // Hide the submit button
        const submitButton = document.querySelector('.auth-submit-container');
        if (submitButton) {
            submitButton.style.display = 'none';
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        if (this.elements.successMessage) {
            this.elements.successMessage.classList.remove('show');
        }
    }

    /**
     * Show general error message
     * @param {string} message - Error message
     */
    showError(message) {
        // For now, show in email field error
        this.showFieldError('email', message);
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
    }
}

// Create global instance only if it doesn't exist
if (!window.forgotPasswordForm) {
    window.forgotPasswordForm = new ForgotPasswordForm();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.forgotPasswordForm && !window.forgotPasswordForm.isInitialized) {
            window.forgotPasswordForm.init();
        }
    }, 200);
});

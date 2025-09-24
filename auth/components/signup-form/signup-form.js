/**
 * Signup Form Component
 * Handles user registration with Supabase authentication
 */
class SignupForm {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.isSubmitting = false;
        
        this.init();
    }

    /**
     * Initialize the signup form component
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            console.log('✅ Signup Form initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Signup Form:', error);
            this.showError('Failed to initialize signup form');
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            form: document.getElementById('signup-form'),
            username: document.getElementById('signup-username'),
            email: document.getElementById('signup-email'),
            password: document.getElementById('signup-password'),
            confirmPassword: document.getElementById('signup-confirm-password'),
            terms: document.getElementById('signup-terms'),
            submit: document.getElementById('signup-submit'),
            loading: document.getElementById('signup-loading'),
            success: document.getElementById('signup-success'),
            
            // Error elements
            usernameError: document.getElementById('signup-username-error'),
            emailError: document.getElementById('signup-email-error'),
            passwordError: document.getElementById('signup-password-error'),
            confirmPasswordError: document.getElementById('signup-confirm-password-error'),
            termsError: document.getElementById('signup-terms-error'),
            
            // Password toggle buttons
            togglePassword: document.getElementById('signup-toggle-password'),
            toggleConfirmPassword: document.getElementById('signup-toggle-confirm-password')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form) return;

        // Form submission
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Real-time validation
        this.elements.username.addEventListener('blur', () => this.validateUsername());
        this.elements.email.addEventListener('blur', () => this.validateEmail());
        this.elements.password.addEventListener('blur', () => this.validatePassword());
        this.elements.confirmPassword.addEventListener('blur', () => this.validateConfirmPassword());
        this.elements.terms.addEventListener('change', () => this.validateTerms());

        // Password visibility toggles
        this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility('password'));
        this.elements.toggleConfirmPassword.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));

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
            console.log('🔄 Loading signup form translations...');
            const response = await fetch('components/signup-form/locales/signup-locales.json');
            console.log('📁 Signup translations response:', response.status, response.ok);
            
            if (response.ok) {
                this.translations = await response.json();
                console.log('📚 Signup translations loaded:', this.translations);
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Signup form translations loaded');
            } else {
                console.warn('Failed to load signup form translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load signup form translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        console.log('🔄 Updating signup form translations for language:', language);
        console.log('📚 Available translations:', this.translations);
        
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            console.log('🎯 Translation object for', language, ':', t);
            
            // Update all translatable elements
            const translatableElements = this.elements.form.querySelectorAll('[data-translate]');
            console.log('🔍 Found translatable elements:', translatableElements.length);
            
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                console.log(`🔤 Updating ${key}: "${translatedText}"`);
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });
        } else {
            console.warn('❌ No translations found for language:', language);
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

        // Validate all fields
        const isUsernameValid = this.validateUsername();
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        const isTermsValid = this.validateTerms();

        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid) {
            this.showError('Please fix the errors above');
            return;
        }

        this.setSubmitting(true);

        try {
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Create user account
            const { data, error } = await window.supabase.auth.signUp({
                email: this.elements.email.value.trim(),
                password: this.elements.password.value,
                options: {
                    data: {
                        username: this.elements.username.value.trim()
                    },
                    emailRedirectTo: `${window.location.origin}/auth/verify`
                }
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                this.showSuccess();
                this.resetForm();
            }

        } catch (error) {
            console.error('Signup error:', error);
            this.handleSignupError(error);
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
     * Handle signup errors
     * @param {Error} error - Supabase error
     */
    handleSignupError(error) {
        let errorMessage = 'An error occurred during signup';

        switch (error.message) {
            case 'User already registered':
                errorMessage = 'An account with this email already exists';
                this.showFieldError('email', errorMessage);
                break;
            case 'Password should be at least 6 characters':
                errorMessage = 'Password must be at least 6 characters long';
                this.showFieldError('password', errorMessage);
                break;
            case 'Invalid email':
                errorMessage = 'Please enter a valid email address';
                this.showFieldError('email', errorMessage);
                break;
            default:
                this.showError(error.message || errorMessage);
        }
    }

    /**
     * Validate username field
     * @returns {boolean} True if valid
     */
    validateUsername() {
        const username = this.elements.username.value.trim();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

        if (!username) {
            this.showFieldError('username', 'Username is required');
            return false;
        }

        if (username.length < 3) {
            this.showFieldError('username', 'Username must be at least 3 characters long');
            return false;
        }

        if (username.length > 20) {
            this.showFieldError('username', 'Username must be no more than 20 characters long');
            return false;
        }

        if (!usernameRegex.test(username)) {
            this.showFieldError('username', 'Username can only contain letters, numbers, and underscores');
            return false;
        }

        this.clearFieldError('username');
        return true;
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

        if (password.length < 6) {
            this.showFieldError('password', 'Password must be at least 6 characters long');
            return false;
        }

        this.clearFieldError('password');
        return true;
    }

    /**
     * Validate confirm password field
     * @returns {boolean} True if valid
     */
    validateConfirmPassword() {
        const password = this.elements.password.value;
        const confirmPassword = this.elements.confirmPassword.value;

        if (!confirmPassword) {
            this.showFieldError('confirmPassword', 'Please confirm your password');
            return false;
        }

        if (password !== confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwords do not match');
            return false;
        }

        this.clearFieldError('confirmPassword');
        return true;
    }

    /**
     * Validate terms checkbox
     * @returns {boolean} True if valid
     */
    validateTerms() {
        if (!this.elements.terms.checked) {
            this.showFieldError('terms', 'You must agree to the terms and conditions');
            return false;
        }

        this.clearFieldError('terms');
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
        console.error('Signup Form Error:', message);
        alert(message); // Temporary - replace with better UX
    }

    /**
     * Show success message
     */
    showSuccess() {
        this.elements.form.style.display = 'none';
        this.elements.success.style.display = 'flex';
    }

    /**
     * Set submitting state
     * @param {boolean} isSubmitting - Whether form is submitting
     */
    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        this.elements.submit.disabled = isSubmitting;
        
        if (isSubmitting) {
            this.elements.submit.querySelector('.signup-form__submit-text').style.display = 'none';
            this.elements.loading.style.display = 'flex';
        } else {
            this.elements.submit.querySelector('.signup-form__submit-text').style.display = 'block';
            this.elements.loading.style.display = 'none';
        }
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        this.elements.form.reset();
        this.clearAllErrors();
    }

    /**
     * Clear all error messages
     */
    clearAllErrors() {
        const fields = ['username', 'email', 'password', 'confirmPassword', 'terms'];
        fields.forEach(field => this.clearFieldError(field));
    }

    /**
     * Toggle password visibility
     * @param {string} fieldName - Field name ('password' or 'confirmPassword')
     */
    togglePasswordVisibility(fieldName) {
        const field = this.elements[fieldName];
        const toggleButton = this.elements[`toggle${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`];
        
        if (field && toggleButton) {
            const isPassword = field.type === 'password';
            field.type = isPassword ? 'text' : 'password';
            
            // Update button aria-label
            const action = isPassword ? 'Hide' : 'Show';
            toggleButton.setAttribute('aria-label', `${action} password visibility`);
        }
    }
}

// Create global instance
window.signupForm = new SignupForm();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.signupForm && !window.signupForm.isInitialized) {
            window.signupForm.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignupForm;
}

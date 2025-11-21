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
    }

    /**
     * Initialize the signup form component
     */
    async init() {
        try {
            // Ensure DOM is ready before caching elements
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                });
            }
            
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            // Signup Form initialized silently
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Signup Form:', error);
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
            success: document.getElementById('signup-success'),
            
            // Error elements
            usernameError: document.getElementById('signup-username-error'),
            emailError: document.getElementById('signup-email-error'),
            passwordError: document.getElementById('signup-password-error'),
            confirmPasswordError: document.getElementById('signup-confirm-password-error'),
            
            // Password toggle buttons
            togglePassword: document.getElementById('signup-toggle-password'),
            toggleConfirmPassword: document.getElementById('signup-toggle-confirm-password')
        };

        // Some elements are optional (success, confirmPasswordError)
        // No need to warn about missing optional elements
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form) return;

        // Form submission is now handled by universal submit button

        // Real-time validation - only bind if elements exist
        if (this.elements.username) this.elements.username.addEventListener('blur', () => this.validateUsername());
        if (this.elements.email) this.elements.email.addEventListener('blur', () => this.validateEmail());
        if (this.elements.password) {
            this.elements.password.addEventListener('blur', () => this.validatePassword());
            this.elements.password.addEventListener('input', () => this.updatePasswordRequirements());
        }
        if (this.elements.confirmPassword) this.elements.confirmPassword.addEventListener('blur', () => this.validateConfirmPassword());

        // Password visibility toggles - only bind if elements exist
        if (this.elements.togglePassword) this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility('password'));
        if (this.elements.toggleConfirmPassword) this.elements.toggleConfirmPassword.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));

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
            const response = await fetch('components/signup-form/locales/signup-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                // Translations loaded silently
            } else {
                window.logger?.warn('Failed to load signup form translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load signup form translations:', error);
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
     * Get translation for a given key
     * @param {string} key - Translation key
     * @returns {string|null} Translated text or null if not found
     */
    getTranslation(key) {
        if (!this.translations) return null;
        
        const language = this.getCurrentLanguage();
        const translation = this.translations[language]?.translation?.[key];
        return translation || null;
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isSubmitting) return;

        // Ensure elements are cached
        if (!this.elements?.username || !this.elements?.email || !this.elements?.password || !this.elements?.confirmPassword) {
            window.logger?.error('❌ Form elements not found. Cannot validate.');
            this.showError('Form not properly initialized. Please refresh the page.');
            return;
        }

        // Validate all fields
        const isUsernameValid = this.validateUsername();
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();

        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.showError('Please fix the errors above');
            return;
        }

        this.setSubmitting(true);

        try {
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Create user account first
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
                // Record consents via Edge Function (IP captured server-side)
                await this.recordConsentsViaEdgeFunction(data.user.id);
                
                this.showSuccess();
                this.resetForm();
            }

        } catch (error) {
            window.logger?.error('Signup error:', error);
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
        let showFieldError = false;
        let fieldName = '';

        // Handle different types of errors
        if (error.message) {
            if (error.message.includes('Email address') && error.message.includes('is invalid')) {
                errorMessage = this.getTranslation('signup.errorInvalidEmail') || 'Please enter a valid email address. Check for typos in your email.';
                showFieldError = true;
                fieldName = 'email';
            } else if (error.message.includes('User already registered')) {
                errorMessage = this.getTranslation('signup.errorUserExists') || 'An account with this email already exists. Try signing in instead.';
                showFieldError = true;
                fieldName = 'email';
            } else if (error.message.includes('Password should be at least 6 characters')) {
                errorMessage = this.getTranslation('signup.errorPasswordLength') || 'Password must be at least 6 characters long.';
                showFieldError = true;
                fieldName = 'password';
            } else if (error.message.includes('Password must contain at least one lowercase letter')) {
                errorMessage = this.getTranslation('signup.errorPasswordLowercase') || 'Password must contain at least one lowercase letter.';
                showFieldError = true;
                fieldName = 'password';
            } else if (error.message.includes('Password must contain at least one uppercase letter')) {
                errorMessage = this.getTranslation('signup.errorPasswordUppercase') || 'Password must contain at least one uppercase letter.';
                showFieldError = true;
                fieldName = 'password';
            } else if (error.message.includes('Password must contain at least one digit')) {
                errorMessage = this.getTranslation('signup.errorPasswordDigit') || 'Password must contain at least one digit.';
                showFieldError = true;
                fieldName = 'password';
            } else if (error.message.includes('Password must contain at least one symbol')) {
                errorMessage = this.getTranslation('signup.errorPasswordSymbol') || 'Password must contain at least one symbol.';
                showFieldError = true;
                fieldName = 'password';
            } else if (error.message.includes('Invalid email')) {
                errorMessage = this.getTranslation('signup.errorInvalidEmail') || 'Please enter a valid email address.';
                showFieldError = true;
                fieldName = 'email';
            } else if (error.message.includes('Username')) {
                errorMessage = this.getTranslation('signup.errorUsername') || 'Please choose a different username.';
                showFieldError = true;
                fieldName = 'username';
            } else {
                // For other errors, show the actual error message
                errorMessage = error.message;
            }
        } else {
            // Fallback for errors without message
            errorMessage = this.getTranslation('signup.errorGeneral') || 'An error occurred during signup. Please try again.';
        }

        // Show field-specific error or general error
        if (showFieldError && fieldName) {
            this.showFieldError(fieldName, errorMessage);
        } else {
            this.showError(errorMessage);
        }
    }

    /**
     * Validate username field
     * @returns {boolean} True if valid
     */
    validateUsername() {
        const username = this.elements.username.value.trim();
        const usernameRegex = /^\w{3,20}$/;

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
            this.showFieldError('password', this.getTranslation('signup.errorPasswordLength') || 'Password must be at least 6 characters long');
            return false;
        }

        // Check for required character types
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

        if (!hasLowercase) {
            this.showFieldError('password', this.getTranslation('signup.errorPasswordLowercase') || 'Password must contain at least one lowercase letter');
            return false;
        }

        if (!hasUppercase) {
            this.showFieldError('password', this.getTranslation('signup.errorPasswordUppercase') || 'Password must contain at least one uppercase letter');
            return false;
        }

        if (!hasDigit) {
            this.showFieldError('password', this.getTranslation('signup.errorPasswordDigit') || 'Password must contain at least one digit');
            return false;
        }

        if (!hasSymbol) {
            this.showFieldError('password', this.getTranslation('signup.errorPasswordSymbol') || 'Password must contain at least one symbol');
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
        window.logger?.error('Signup Form Error:', message);
        
        // Use translated message if available, otherwise use the provided message
        const translatedMessage = this.getTranslation('signup.error') || message;
        alert(translatedMessage); // Temporary - replace with better UX
    }

    /**
     * Show success message
     */
    showSuccess() {
        // Hide the signup form
        if (this.elements.form) {
            this.elements.form.style.display = 'none';
        }
        
        // Hide the terms checkbox container
        const termsContainer = document.getElementById('terms-checkbox-container');
        if (termsContainer) {
            termsContainer.style.display = 'none';
        }
        
        // Hide the submit button container
        const submitContainer = document.querySelector('.auth-submit-container');
        if (submitContainer) {
            submitContainer.style.display = 'none';
        }
        
        // Show the success message
        if (this.elements.success) {
            this.elements.success.classList.add('active');
        } else {
            window.logger?.warn('Success element not found, showing fallback message');
            // Use translated success message
            const successMessage = this.getTranslation('signup.successMessage') || 'Account created successfully! Please check your email to verify your account.';
            alert(successMessage);
            
            // Show thank you message after popup is dismissed
            setTimeout(() => {
                this.showThankYouMessage();
            }, 100);
        }
    }

    /**
     * Show thank you message after popup is dismissed
     */
    showThankYouMessage() {
        // Create thank you container if it doesn't exist
        let thankYouContainer = document.getElementById('signup-thank-you');
        if (!thankYouContainer) {
            thankYouContainer = document.createElement('div');
            thankYouContainer.id = 'signup-thank-you';
            thankYouContainer.className = 'signup-thank-you';
            
            // Add to auth container
            const authContainer = document.querySelector('.auth-container');
            if (authContainer) {
                authContainer.appendChild(thankYouContainer);
            }
        }
        
        // Get translated messages
        const title = this.getTranslation('signup.thankYouTitle') || 'Thank You for Signing Up!';
        const message = this.getTranslation('signup.thankYouMessage') || 'We\'ve sent a verification email to your inbox. Please check your email and click the verification link to activate your account.';
        const reminder = this.getTranslation('signup.checkEmailReminder') || 'Don\'t forget to check your spam folder if you don\'t see the email in your inbox.';
        
        // Set content
        thankYouContainer.innerHTML = `
            <div class="thank-you-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <h2 class="thank-you-title">${title}</h2>
            <p class="thank-you-message">${message}</p>
            <p class="thank-you-reminder">${reminder}</p>
            <button id="signup-resend-verification-btn" class="resend-verification-btn">
                ${this.getTranslation('signup.resendEmail') || 'Resend Verification Email'}
            </button>
        `;
        
        // Show the thank you message
        thankYouContainer.style.display = 'flex';
        
        // Bind resend button event
        const resendButton = document.getElementById('signup-resend-verification-btn');
        if (resendButton) {
            resendButton.addEventListener('click', () => {
                this.handleResendVerification();
            });
        }
    }

    /**
     * Handle resend verification email from signup form
     */
    async handleResendVerification() {
        const resendButton = document.getElementById('signup-resend-verification-btn');
        if (!resendButton) return;

        try {
            // Disable button and show loading state
            resendButton.disabled = true;
            resendButton.textContent = this.getTranslation('signup.resending') || 'Sending...';

            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Get user email from form
            const userEmail = this.elements.email?.value?.trim();
            if (!userEmail) {
                throw new Error('No email address found');
            }

            window.logger?.log('🔄 Resending verification email to:', userEmail);

            // Resend verification email
            const { error } = await window.supabase.auth.resend({
                type: 'signup',
                email: userEmail
            });

            if (error) {
                throw error;
            }

            // Show success message
            const successMessage = this.getTranslation('signup.resendSuccess') || 'Verification email sent! Please check your inbox.';
            alert(successMessage);

            window.logger?.log('✅ Verification email resent successfully');

        } catch (error) {
            window.logger?.error('❌ Failed to resend verification email:', error);
            const errorMessage = this.getTranslation('signup.resendError') || 'Failed to resend email. Please try again.';
            alert(errorMessage);
        } finally {
            // Re-enable button and restore original text
            resendButton.disabled = false;
            resendButton.textContent = this.getTranslation('signup.resendEmail') || 'Resend Verification Email';
        }
    }

    /**
     * Set submitting state
     * @param {boolean} isSubmitting - Whether form is submitting
     */
    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        
        // Update universal submit button state
        if (window.universalSubmitButton) {
            window.universalSubmitButton.setSubmitting(isSubmitting);
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
        const fields = ['username', 'email', 'password', 'confirmPassword'];
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

    /**
     * Update password requirements display in real-time
     */
    updatePasswordRequirements() {
        const password = this.elements.password.value;
        const requirementsContainer = document.getElementById('signup-password-requirements');
        
        if (!requirementsContainer) return;

        // Check each requirement
        const requirements = {
            length: password.length >= 6,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            digit: /\d/.test(password),
            symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
        };

        // Update each requirement display
        Object.entries(requirements).forEach(([requirement, isValid]) => {
            const requirementElement = requirementsContainer.querySelector(`[data-requirement="${requirement}"]`);
            if (requirementElement) {
                const icon = requirementElement.querySelector('.signup-form__requirement-icon');
                if (icon) {
                    icon.textContent = isValid ? '✅' : '❌';
                }
                
                // Update classes for styling
                requirementElement.classList.remove('valid', 'invalid');
                requirementElement.classList.add(isValid ? 'valid' : 'invalid');
            }
        });
    }

    /**
     * Record user consents via Edge Function (IP captured server-side)
     * @param {string} userId - The newly created user ID
     */
    async recordConsentsViaEdgeFunction(userId) {
        try {
            window.logger?.log('🔄 Recording user consents via Edge Function...');
            
            const userAgent = navigator.userAgent;
            
            // Record required consents (terms and privacy) via Edge Function
            // IP address is captured server-side from request headers (more reliable)
            const consents = [
                { type: 'terms', version: '1.0' },
                { type: 'privacy', version: '1.0' }
            ];
            
            for (const consent of consents) {
                const { error } = await window.supabase.functions.invoke('record-signup-consent', {
                    body: {
                        user_id: userId,
                        consent_type: consent.type,
                        version: consent.version,
                        user_agent: userAgent
                        // IP address is captured server-side from request headers
                    }
                });
                
                if (error) {
                    window.logger?.error(`❌ Failed to record ${consent.type} consent:`, error);
                    // Continue with other consents even if one fails
                    continue;
                }
                
                window.logger?.log(`✅ Consent recorded: ${consent.type} v${consent.version}`);
            }
            
            window.logger?.log('✅ User consents recorded successfully');
        } catch (error) {
            window.logger?.error('❌ Failed to record consents:', error);
            // Don't throw error here as account is already created
            // Consent recording failure shouldn't block signup success
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

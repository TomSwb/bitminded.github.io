/**
 * Reset Password Form Component
 * Handles password reset with Supabase authentication
 */
class ResetPasswordForm {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.isSubmitting = false;
        
        this.init();
    }

    /**
     * Initialize the reset password form component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            this.cacheElements();
            this.bindEvents();
            this.showTranslatableContent(); // Show content immediately
            this.initializePasswordRequirements(); // Initialize requirements display
            await this.loadTranslations();
            
            // Verify user has a valid session from the reset link
            await this.verifyResetSession();
            
            this.isInitialized = true;
            
            console.log('✅ Reset Password Form initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Reset Password Form:', error);
            this.showError('Failed to initialize reset password form');
        }
    }

    /**
     * Re-initialize the component after HTML injection
     */
    async reinit() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.showTranslatableContent(); // Show content immediately
            this.initializePasswordRequirements(); // Initialize requirements display
            this.updateTranslations();
            console.log('✅ Reset Password Form re-initialized successfully');
        } catch (error) {
            console.error('❌ Failed to re-initialize Reset Password Form:', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            form: document.getElementById('reset-password-form'),
            email: document.getElementById('reset-password-email'),
            newPassword: document.getElementById('reset-password-new'),
            confirmPassword: document.getElementById('reset-password-confirm'),
            // Password toggle elements (commented out)
            // toggleNewPassword: document.getElementById('reset-password-toggle-new'),
            // toggleConfirmPassword: document.getElementById('reset-password-toggle-confirm'),
            
            // Error elements
            emailError: document.getElementById('reset-password-email-error'),
            newPasswordError: document.getElementById('reset-password-new-error'),
            confirmPasswordError: document.getElementById('reset-password-confirm-error'),
            
            // Success element
            success: document.getElementById('reset-password-success'),
            
            // Back to login link
            backToLogin: document.getElementById('reset-password-back-to-login'),
            
            // Password requirements elements
            requirementsContainer: document.getElementById('reset-password-requirements')
        };

        // Debug: Log missing elements (only for non-critical elements)
        const criticalElements = ['form', 'newPassword', 'confirmPassword'];
        const missingCritical = [];
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                missingCritical.push(key);
            }
        });
        
        if (missingCritical.length > 0) {
            console.warn('Reset password form missing critical elements:', missingCritical);
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form) return;

        // Form submission
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Password visibility toggles (commented out)
        /*
        if (this.elements.toggleNewPassword) {
            this.elements.toggleNewPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility('new');
            });
        }
        if (this.elements.toggleConfirmPassword) {
            this.elements.toggleConfirmPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility('confirm');
            });
        }
        */

        // Back to login link
        if (this.elements.backToLogin) {
            this.elements.backToLogin.addEventListener('click', (e) => this.handleBackToLogin(e));
        }

        // Password strength checking
        if (this.elements.newPassword) {
            this.elements.newPassword.addEventListener('input', () => {
                this.updatePasswordStrength();
                this.validatePasswordMatch(); // Also check match when new password changes
            });
        }

        // Password match validation
        if (this.elements.confirmPassword) {
            this.elements.confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('components/reset-password/locales/reset-password-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Reset password form translations loaded');
            } else {
                console.warn('Failed to load reset password form translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load reset password form translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (!this.translations || !this.translations[language]) return;

        const translations = this.translations[language].translation;
        const elements = document.querySelectorAll('.reset-password-form [data-translate]');
        
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
        const translatableElements = document.querySelectorAll('.reset-password-form .translatable-content');
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
     * Verify that user has a valid session from the reset link
     */
    async verifyResetSession() {
        try {
            // Wait for Supabase to be available
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            // Check URL parameters for password reset type
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const urlType = hashParams.get('type');
            
            console.log('🔍 Checking reset link type:', urlType);
            console.log('🔍 URL hash params:', Array.from(hashParams.entries()));

            // Small delay to ensure Supabase has processed the URL tokens
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get current session
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Session verification error:', error);
                throw new Error('Unable to verify reset session');
            }

            if (!session) {
                console.error('❌ No active session found for password reset');
                this.showError('Invalid or expired reset link. Please request a new password reset link from the forgot password page.');
                // Disable the form
                if (this.elements.email) this.elements.email.disabled = true;
                if (this.elements.newPassword) this.elements.newPassword.disabled = true;
                if (this.elements.confirmPassword) this.elements.confirmPassword.disabled = true;
                throw new Error('No active session');
            }

            console.log('✅ Valid reset session found for user:', session.user.email);
            
            // Populate email field for password manager detection
            if (this.elements.email && session.user.email) {
                this.elements.email.value = session.user.email;
            }
        } catch (error) {
            console.error('❌ Session verification failed:', error);
            throw error;
        }
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Clear previous errors
        this.clearErrors();
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        this.setSubmitting(true);
        
        try {
            const newPassword = this.elements.newPassword.value;
            
            // Update password via Supabase
            await this.updatePassword(newPassword);
            
            this.showSuccess();
            this.elements.form.reset();
            
        } catch (error) {
            console.error('❌ Password update failed:', error);
            this.showError('Failed to update password. Please try again.');
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Update password via Supabase
     * @param {string} newPassword - New password
     */
    async updatePassword(newPassword) {
        console.log('🔐 Updating password...');
        
        // Wait for Supabase to be available
        if (!window.supabase) {
            throw new Error('Supabase client not available');
        }
        
        // Check if we have a session
        const { data: { session } } = await window.supabase.auth.getSession();
        
        if (!session) {
            console.error('❌ No active session found');
            throw new Error('You must access this page through the password reset link sent to your email. The link contains authentication tokens required to update your password.');
        }
        
        console.log('✅ Active session found, updating password...');
        
        // Update password
        const { error } = await window.supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('❌ Supabase password update error:', error);
            throw new Error(error.message || 'Failed to update password');
        }
        
        console.log('✅ Password updated successfully');
    }

    /**
     * Toggle password visibility (commented out - not used)
     * @param {string} field - Field to toggle ('new' or 'confirm')
     */
    /*
    togglePasswordVisibility(field) {
        const input = field === 'new' ? this.elements.newPassword : this.elements.confirmPassword;
        const toggle = field === 'new' ? this.elements.toggleNewPassword : this.elements.toggleConfirmPassword;
        
        if (input && toggle) {
            const isPassword = input.type === 'password';
            
            // Force browser to re-render the input
            input.style.webkitTextSecurity = isPassword ? 'disc' : 'none';
            input.style.textSecurity = isPassword ? 'disc' : 'none';
            
            // Change input type
            input.type = isPassword ? 'text' : 'password';
            
            // Force re-render by blurring and focusing
            input.blur();
            setTimeout(() => {
                input.focus();
            }, 10);
            
            // Update button aria-label
            const action = isPassword ? 'Hide' : 'Show';
            toggle.setAttribute('aria-label', `${action} password visibility`);
        }
    }
    */

    /**
     * Validate form
     * @returns {boolean} True if valid
     */
    validateForm() {
        let isValid = true;
        
        const newPassword = this.elements.newPassword.value.trim();
        const confirmPassword = this.elements.confirmPassword.value.trim();
        
        // Validate new password
        if (!newPassword) {
            this.showFieldError('new', 'New password is required');
            isValid = false;
        } else if (newPassword.length < 8) {
            this.showFieldError('new', 'Password must be at least 8 characters long');
            isValid = false;
        }
        
        // Validate confirm password
        if (!confirmPassword) {
            this.showFieldError('confirm', 'Please confirm your password');
            isValid = false;
        } else if (newPassword !== confirmPassword) {
            this.showFieldError('confirm', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Show field error
     * @param {string} field - Field name ('new' or 'confirm')
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        const errorElement = field === 'new' ? this.elements.newPasswordError : this.elements.confirmPasswordError;
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        if (this.elements.newPasswordError) {
            this.elements.newPasswordError.textContent = '';
            this.elements.newPasswordError.style.display = 'none';
        }
        if (this.elements.confirmPasswordError) {
            this.elements.confirmPasswordError.textContent = '';
            this.elements.confirmPasswordError.style.display = 'none';
        }
    }

    /**
     * Show success message and redirect to login
     */
    showSuccess() {
        if (this.elements.success) {
            this.elements.success.classList.remove('hidden');
            
            // Ensure translatable content in success message is visible
            const successTranslatables = this.elements.success.querySelectorAll('.translatable-content');
            successTranslatables.forEach(el => {
                el.classList.add('loaded');
                el.style.opacity = '1';
            });
        }
        
        // Hide the form fields
        if (this.elements.form) {
            // Hide password fields
            const passwordFields = this.elements.form.querySelectorAll('.reset-password-form__field');
            passwordFields.forEach(field => {
                field.style.display = 'none';
            });
        }
        
        // Hide the back to login link
        if (this.elements.backToLogin) {
            const backToLoginContainer = this.elements.backToLogin.parentElement;
            if (backToLoginContainer) {
                backToLoginContainer.style.display = 'none';
            }
        }
        
        // Hide the universal submit button
        const submitButton = document.querySelector('.auth-submit-container');
        if (submitButton) {
            submitButton.style.display = 'none';
        }
        
        // Redirect to login after 5 seconds
        console.log('✅ Password updated successfully, redirecting to login...');
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('authFormSwitch', {
                detail: { form: 'login' }
            }));
        }, 5000);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // For now, show in new password field error
        this.showFieldError('new', message);
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength() {
        const password = this.elements.newPassword.value;

        // Calculate password requirements
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        // Update requirements indicators
        this.updatePasswordRequirements(requirements);
    }

    /**
     * Initialize password requirements display with all invalid
     */
    initializePasswordRequirements() {
        const requirements = {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
        };
        this.updatePasswordRequirements(requirements);
    }

    /**
     * Update password requirements display
     * @param {Object} requirements - Requirements object
     */
    updatePasswordRequirements(requirements) {
        if (!this.elements.requirementsContainer) return;

        Object.entries(requirements).forEach(([requirement, met]) => {
            const requirementElement = this.elements.requirementsContainer.querySelector(`[data-requirement="${requirement}"]`);
            if (requirementElement) {
                const icon = requirementElement.querySelector('.reset-password-form__requirement-icon');
                if (icon) {
                    icon.textContent = met ? '✅' : '❌';
                }
                requirementElement.className = `reset-password-form__requirement ${met ? 'valid' : 'invalid'}`;
            }
        });
    }

    /**
     * Validate that passwords match
     */
    validatePasswordMatch() {
        const newPassword = this.elements.newPassword?.value || '';
        const confirmPassword = this.elements.confirmPassword?.value || '';
        
        // Only show error if user has started typing in confirm field
        if (confirmPassword.length > 0) {
            if (newPassword !== confirmPassword) {
                this.showFieldError('confirm', 'Passwords do not match');
                // Add error styling to input field
                if (this.elements.confirmPassword) {
                    this.elements.confirmPassword.classList.add('error');
                }
            } else {
                // Clear error if passwords match
                if (this.elements.confirmPasswordError) {
                    this.elements.confirmPasswordError.textContent = '';
                    this.elements.confirmPasswordError.style.display = 'none';
                }
                // Remove error styling from input field
                if (this.elements.confirmPassword) {
                    this.elements.confirmPassword.classList.remove('error');
                }
            }
        } else {
            // Clear error styling if field is empty
            if (this.elements.confirmPassword) {
                this.elements.confirmPassword.classList.remove('error');
            }
        }
    }

    /**
     * Handle back to login link click
     * @param {Event} e - Click event
     */
    handleBackToLogin(e) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('authFormSwitch', {
            detail: { form: 'login' }
        }));
    }

    /**
     * Set submitting state
     * @param {boolean} isSubmitting - Whether form is submitting
     */
    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        
        // Disable form inputs during submission
        if (this.elements.newPassword) {
            this.elements.newPassword.disabled = isSubmitting;
        }
        if (this.elements.confirmPassword) {
            this.elements.confirmPassword.disabled = isSubmitting;
        }
    }
}

// Create global instance only if it doesn't exist
if (!window.resetPasswordForm) {
    window.resetPasswordForm = new ResetPasswordForm();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (!window.resetPasswordForm) {
            window.resetPasswordForm = new ResetPasswordForm();
        } else if (!window.resetPasswordForm.isInitialized) {
            window.resetPasswordForm.init();
        }
    }, 200);
});

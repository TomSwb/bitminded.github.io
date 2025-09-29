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
            await this.loadTranslations();
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
            newPassword: document.getElementById('reset-password-new'),
            confirmPassword: document.getElementById('reset-password-confirm'),
            toggleNewPassword: document.getElementById('reset-password-toggle-new'),
            toggleConfirmPassword: document.getElementById('reset-password-toggle-confirm'),
            
            // Error elements
            newPasswordError: document.getElementById('reset-password-new-error'),
            confirmPasswordError: document.getElementById('reset-password-confirm-error'),
            
            // Success element
            success: document.getElementById('reset-password-success'),
            
            // Back to login link
            backToLogin: document.getElementById('reset-password-back-to-login'),
            
            // Password strength elements
            strengthFill: document.getElementById('reset-password-strength-fill'),
            strengthText: document.getElementById('reset-password-strength-text'),
            requirementsContainer: document.getElementById('reset-password-requirements')
        };

        // Debug: Log missing elements (only for non-critical elements)
        const criticalElements = ['form', 'newPassword', 'confirmPassword', 'toggleNewPassword', 'toggleConfirmPassword'];
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

        // Password visibility toggles
        if (this.elements.toggleNewPassword) {
            console.log('Binding toggle for new password');
            this.elements.toggleNewPassword.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('New password toggle clicked');
                this.togglePasswordVisibility('new');
            });
        } else {
            console.log('Toggle button for new password not found');
        }
        if (this.elements.toggleConfirmPassword) {
            console.log('Binding toggle for confirm password');
            this.elements.toggleConfirmPassword.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Confirm password toggle clicked');
                this.togglePasswordVisibility('confirm');
            });
        } else {
            console.log('Toggle button for confirm password not found');
        }

        // Back to login link
        if (this.elements.backToLogin) {
            this.elements.backToLogin.addEventListener('click', (e) => this.handleBackToLogin(e));
        }

        // Password strength checking
        if (this.elements.newPassword) {
            this.elements.newPassword.addEventListener('input', () => this.updatePasswordStrength());
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
     * Toggle password visibility
     * @param {string} field - Field to toggle ('new' or 'confirm')
     */
    togglePasswordVisibility(field) {
        console.log('Toggling password visibility for:', field);
        const input = field === 'new' ? this.elements.newPassword : this.elements.confirmPassword;
        const toggle = field === 'new' ? this.elements.toggleNewPassword : this.elements.toggleConfirmPassword;
        
        console.log('Input element:', input);
        console.log('Toggle element:', toggle);
        
        if (input && toggle) {
            const isPassword = input.type === 'password';
            console.log('Current type:', input.type, 'Switching to:', isPassword ? 'text' : 'password');
            
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
            console.log('Password visibility toggled successfully');
        } else {
            console.error('Missing input or toggle element:', { input, toggle });
        }
    }

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
        }
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        if (this.elements.newPasswordError) {
            this.elements.newPasswordError.textContent = '';
        }
        if (this.elements.confirmPasswordError) {
            this.elements.confirmPasswordError.textContent = '';
        }
    }

    /**
     * Show success message
     */
    showSuccess() {
        if (this.elements.success) {
            this.elements.success.classList.remove('hidden');
        }
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
        const strengthFill = this.elements.strengthFill;
        const strengthText = this.elements.strengthText;
        
        if (!strengthFill || !strengthText) return;

        // Calculate password strength
        let score = 0;
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        // Count fulfilled requirements
        Object.values(requirements).forEach(met => {
            if (met) score++;
        });

        // Update strength bar
        strengthFill.className = 'reset-password-form__strength-fill';
        if (score <= 1) {
            strengthFill.classList.add('weak');
            strengthText.textContent = 'Weak';
        } else if (score <= 2) {
            strengthFill.classList.add('fair');
            strengthText.textContent = 'Fair';
        } else if (score <= 3) {
            strengthFill.classList.add('good');
            strengthText.textContent = 'Good';
        } else if (score <= 4) {
            strengthFill.classList.add('strong');
            strengthText.textContent = 'Strong';
        } else {
            strengthFill.classList.add('very-strong');
            strengthText.textContent = 'Very Strong';
        }

        // Update requirements indicators
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

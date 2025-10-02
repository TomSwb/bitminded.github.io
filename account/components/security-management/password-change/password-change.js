/**
 * Password Change Component
 * Handles secure password change functionality with validation and Supabase integration
 */
if (typeof window.PasswordChange === 'undefined') {
class PasswordChange {
    constructor() {
        this.isInitialized = false;
        this.form = null;
        this.currentPasswordInput = null;
        this.newPasswordInput = null;
        this.confirmPasswordInput = null;
        this.submitButton = null;
        this.cancelButton = null;
        this.isSubmitting = false;
        
        // Live verification state
        this.currentPasswordVerified = false;
        this.verificationInProgress = false;
        this.verificationTimeout = null;
        this.verificationDelay = 500; // 500ms delay after user stops typing
        
        // Password strength requirements
        this.requirements = {
            length: { min: 8, regex: /.{8,}/ },
            uppercase: { regex: /[A-Z]/ },
            lowercase: { regex: /[a-z]/ },
            number: { regex: /\d/ },
            special: { regex: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/ }
        };
    }

    /**
     * Initialize the password change component
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.log('Password Change: Already initialized');
                return;
            }

            console.log('🔐 Password Change: Initializing...');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            this.isInitialized = true;
            console.log('✅ Password Change: Initialized successfully');

        } catch (error) {
            console.error('❌ Password Change: Failed to initialize:', error);
            this.showError('Failed to initialize password change component');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    setupComponent() {
        // Get form elements
        this.form = document.getElementById('password-change-form');
        this.currentPasswordInput = document.getElementById('current-password');
        this.newPasswordInput = document.getElementById('new-password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.submitButton = document.getElementById('submit-password-change');
        this.cancelButton = document.getElementById('cancel-password-change');

        if (!this.form || !this.currentPasswordInput || !this.newPasswordInput || !this.confirmPasswordInput) {
            console.error('❌ Password Change: Required form elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Initial validation
        this.validateForm();
        
        // Make translatable content visible
        this.showTranslatableContent();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Input validation on change with live verification
        this.currentPasswordInput.addEventListener('input', () => this.handleCurrentPasswordInput());
        this.newPasswordInput.addEventListener('input', () => this.validateNewPassword());
        this.confirmPasswordInput.addEventListener('input', () => this.validateConfirmPassword());

        // Password visibility toggles
        const toggleButtons = document.querySelectorAll('.password-change__toggle-visibility');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.handleCancel());
        }

        // Real-time password strength checking
        this.newPasswordInput.addEventListener('input', () => this.updatePasswordStrength());
    }

    /**
     * Handle form submission
     * @param {Event} e - Form submit event
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) {
            return;
        }

        try {
            // Validate form before submission
            if (!this.validateForm()) {
                return;
            }

            this.isSubmitting = true;
            this.setSubmitButtonLoading(true);
            this.hideMessages();

            console.log('🔐 Password Change: Submitting password change...');

            // Get form data
            const currentPassword = this.currentPasswordInput.value;
            const newPassword = this.newPasswordInput.value;

            // Change password using Supabase
            await this.changePassword(currentPassword, newPassword);

            // Show success message
            this.showSuccess('Password changed successfully!');
            
            // Reset form
            this.resetForm();

            console.log('✅ Password Change: Password changed successfully');

        } catch (error) {
            console.error('❌ Password Change: Failed to change password:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.isSubmitting = false;
            this.setSubmitButtonLoading(false);
        }
    }

    /**
     * Change password using Supabase Auth
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     */
    async changePassword(currentPassword, newPassword) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        // First, verify the current password by attempting to re-authenticate
        await this.verifyCurrentPassword(currentPassword);

        // If verification succeeds, update to the new password
        const { error } = await window.supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }
    }

    /**
     * Verify current password by attempting to re-authenticate
     * @param {string} currentPassword - Current password to verify
     */
    async verifyCurrentPassword(currentPassword) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        // Get current user
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('Unable to verify current password. Please try again.');
        }

        // Attempt to sign in with current credentials to verify password
        const { error } = await window.supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (error) {
            // Check for specific authentication errors
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Current password is incorrect');
            }
            throw new Error('Unable to verify current password. Please try again.');
        }

        // Re-authentication successful, password is correct
        console.log('✅ Password verification successful');
        
        // Note: The user is now re-authenticated with the same session
        // This is expected behavior for password verification
    }

    /**
     * Handle current password input with live verification
     */
    handleCurrentPasswordInput() {
        const value = this.currentPasswordInput.value;
        
        // Clear previous timeout
        if (this.verificationTimeout) {
            clearTimeout(this.verificationTimeout);
        }
        
        // Reset verification state
        this.currentPasswordVerified = false;
        this.updateCurrentPasswordUI('typing');
        
        // If empty, show required message
        if (!value) {
            this.showFieldError('current-password-error', 'Current password is required');
            this.disableNewPasswordFields();
            return;
        }
        
        // Hide error message while typing
        this.hideFieldError('current-password-error');
        
        // Set timeout for verification after user stops typing
        this.verificationTimeout = setTimeout(() => {
            this.verifyCurrentPasswordLive(value);
        }, this.verificationDelay);
    }

    /**
     * Live verification of current password
     * @param {string} password - Password to verify
     */
    async verifyCurrentPasswordLive(password) {
        if (this.verificationInProgress) {
            return; // Prevent multiple simultaneous verifications
        }
        
        try {
            this.verificationInProgress = true;
            this.updateCurrentPasswordUI('verifying');
            
            await this.verifyCurrentPassword(password);
            
            // Verification successful
            this.currentPasswordVerified = true;
            this.updateCurrentPasswordUI('verified');
            this.enableNewPasswordFields();
            
        } catch (error) {
            // Verification failed
            this.currentPasswordVerified = false;
            this.updateCurrentPasswordUI('error');
            this.disableNewPasswordFields();
            
            // Show specific error message
            if (error.message.includes('Current password is incorrect')) {
                this.showFieldError('current-password-error', 'Current password is incorrect');
            } else {
                this.showFieldError('current-password-error', 'Unable to verify current password');
            }
        } finally {
            this.verificationInProgress = false;
        }
    }

    /**
     * Update current password field UI based on verification state
     * @param {string} state - 'typing', 'verifying', 'verified', 'error'
     */
    updateCurrentPasswordUI(state) {
        const input = this.currentPasswordInput;
        
        // Remove all state classes
        input.classList.remove('verifying', 'verified', 'error', 'typing');
        
        switch (state) {
            case 'typing':
                input.classList.add('typing');
                break;
            case 'verifying':
                input.classList.add('verifying');
                break;
            case 'verified':
                input.classList.add('verified');
                break;
            case 'error':
                input.classList.add('error');
                break;
        }
    }

    /**
     * Enable new password fields
     */
    enableNewPasswordFields() {
        this.newPasswordInput.disabled = false;
        this.confirmPasswordInput.disabled = false;
        
        // Remove disabled styling
        this.newPasswordInput.classList.remove('disabled');
        this.confirmPasswordInput.classList.remove('disabled');
        
        // Add enabled styling
        this.newPasswordInput.classList.add('enabled');
        this.confirmPasswordInput.classList.add('enabled');
    }

    /**
     * Disable new password fields
     */
    disableNewPasswordFields() {
        this.newPasswordInput.disabled = true;
        this.confirmPasswordInput.disabled = true;
        
        // Remove enabled styling
        this.newPasswordInput.classList.remove('enabled');
        this.confirmPasswordInput.classList.remove('enabled');
        
        // Add disabled styling
        this.newPasswordInput.classList.add('disabled');
        this.confirmPasswordInput.classList.add('disabled');
        
        // Clear new password fields
        this.newPasswordInput.value = '';
        this.confirmPasswordInput.value = '';
        this.updatePasswordStrength();
    }

    /**
     * Validate current password field (legacy method for form submission)
     */
    validateCurrentPassword() {
        const value = this.currentPasswordInput.value;
        
        if (!value) {
            this.showFieldError('current-password-error', 'Current password is required');
            return false;
        }

        if (!this.currentPasswordVerified) {
            this.showFieldError('current-password-error', 'Please verify your current password first');
            return false;
        }

        this.hideFieldError('current-password-error');
        return true;
    }

    /**
     * Validate new password field
     */
    validateNewPassword() {
        const value = this.newPasswordInput.value;
        
        if (!value) {
            this.showFieldError('new-password-error', 'New password is required');
            return false;
        }

        // Check password requirements
        const validation = this.validatePasswordRequirements(value);
        if (!validation.isValid) {
            this.showFieldError('new-password-error', validation.message);
            return false;
        }

        this.hideFieldError('new-password-error');
        return true;
    }

    /**
     * Validate confirm password field
     */
    validateConfirmPassword() {
        const value = this.confirmPasswordInput.value;
        const newPassword = this.newPasswordInput.value;
        
        if (!value) {
            this.showFieldError('confirm-password-error', 'Please confirm your new password');
            return false;
        }

        if (value !== newPassword) {
            this.showFieldError('confirm-password-error', 'Passwords do not match');
            return false;
        }

        this.hideFieldError('confirm-password-error');
        return true;
    }

    /**
     * Validate password requirements
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    validatePasswordRequirements(password) {
        const errors = [];

        if (!this.requirements.length.regex.test(password)) {
            errors.push('At least 8 characters');
        }
        if (!this.requirements.uppercase.regex.test(password)) {
            errors.push('One uppercase letter');
        }
        if (!this.requirements.lowercase.regex.test(password)) {
            errors.push('One lowercase letter');
        }
        if (!this.requirements.number.regex.test(password)) {
            errors.push('One number');
        }
        if (!this.requirements.special.regex.test(password)) {
            errors.push('One special character');
        }

        return {
            isValid: errors.length === 0,
            message: errors.length > 0 ? `Password must contain: ${errors.join(', ')}` : ''
        };
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength() {
        const password = this.newPasswordInput.value;
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');

        if (!password) {
            strengthFill.className = 'password-change__strength-fill';
            strengthText.className = 'password-change__strength-text';
            strengthText.textContent = '';
            return;
        }

        // Calculate strength score
        let score = 0;
        const requirements = this.requirements;

        if (requirements.length.regex.test(password)) score++;
        if (requirements.uppercase.regex.test(password)) score++;
        if (requirements.lowercase.regex.test(password)) score++;
        if (requirements.number.regex.test(password)) score++;
        if (requirements.special.regex.test(password)) score++;

        // Update strength display
        let strengthClass, strengthLabel;
        if (score < 2) {
            strengthClass = 'weak';
            strengthLabel = 'Weak';
        } else if (score < 3) {
            strengthClass = 'fair';
            strengthLabel = 'Fair';
        } else if (score < 5) {
            strengthClass = 'good';
            strengthLabel = 'Good';
        } else {
            strengthClass = 'strong';
            strengthLabel = 'Strong';
        }

        strengthFill.className = `password-change__strength-fill ${strengthClass}`;
        strengthText.className = `password-change__strength-text ${strengthClass}`;
        strengthText.textContent = strengthLabel;

        // Update requirements display
        this.updateRequirementsDisplay(password);
    }

    /**
     * Update password requirements display
     * @param {string} password - Password to check
     */
    updateRequirementsDisplay(password) {
        const requirements = this.requirements;
        
        Object.keys(requirements).forEach(requirement => {
            const element = document.querySelector(`[data-requirement="${requirement}"]`);
            if (element) {
                const isValid = requirements[requirement].regex.test(password);
                element.className = `password-change__requirement ${isValid ? 'valid' : 'invalid'}`;
            }
        });
    }

    /**
     * Toggle password visibility
     * @param {Event} e - Click event
     */
    togglePasswordVisibility(e) {
        const button = e.target.closest('.password-change__toggle-visibility');
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        
        if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            
            // Update button text/icon
            const icon = button.querySelector('.password-change__eye-icon');
            if (icon) {
                icon.textContent = isPassword ? '🙈' : '👁️';
            }
        }
    }

    /**
     * Validate entire form
     * @returns {boolean} Whether form is valid
     */
    validateForm() {
        const currentValid = this.validateCurrentPassword();
        const newValid = this.currentPasswordVerified ? this.validateNewPassword() : false;
        const confirmValid = this.currentPasswordVerified ? this.validateConfirmPassword() : false;

        const isValid = currentValid && newValid && confirmValid;
        
        if (this.submitButton) {
            this.submitButton.disabled = !isValid;
        }

        return isValid;
    }

    /**
     * Handle cancel button click
     */
    handleCancel() {
        this.resetForm();
        this.hideMessages();
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }
        
        // Clear verification timeout
        if (this.verificationTimeout) {
            clearTimeout(this.verificationTimeout);
        }
        
        // Reset verification state
        this.currentPasswordVerified = false;
        this.verificationInProgress = false;
        
        // Reset UI state
        this.updateCurrentPasswordUI('typing');
        this.disableNewPasswordFields();
        
        // Reset password strength
        this.updatePasswordStrength();
        
        // Reset validation
        this.validateForm();
        
        // Hide all error messages
        this.hideAllFieldErrors();
    }

    /**
     * Set submit button loading state
     * @param {boolean} loading - Whether button should show loading state
     */
    setSubmitButtonLoading(loading) {
        if (this.submitButton) {
            if (loading) {
                this.submitButton.classList.add('loading');
                this.submitButton.disabled = true;
            } else {
                this.submitButton.classList.remove('loading');
                this.submitButton.disabled = false;
            }
        }
    }

    /**
     * Show field error message
     * @param {string} errorId - Error element ID
     * @param {string} message - Error message
     */
    showFieldError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    /**
     * Hide field error message
     * @param {string} errorId - Error element ID
     */
    hideFieldError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    /**
     * Hide all field error messages
     */
    hideAllFieldErrors() {
        const errorElements = document.querySelectorAll('.password-change__error');
        errorElements.forEach(element => {
            element.classList.remove('show');
        });
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        const successElement = document.getElementById('password-change-success');
        const messageElement = successElement?.querySelector('.password-change__success-message');
        
        if (successElement && messageElement) {
            messageElement.textContent = message;
            successElement.style.display = 'flex';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorElement = document.getElementById('password-change-error');
        const messageElement = errorElement?.querySelector('.password-change__error-text');
        
        if (errorElement && messageElement) {
            messageElement.textContent = message;
            errorElement.style.display = 'flex';
        }
    }

    /**
     * Hide all messages
     */
    hideMessages() {
        const successElement = document.getElementById('password-change-success');
        const errorElement = document.getElementById('password-change-error');
        
        if (successElement) {
            successElement.style.display = 'none';
        }
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        if (error.message) {
            // Current password verification errors
            if (error.message.includes('Current password is incorrect')) {
                return 'Current password is incorrect';
            }
            if (error.message.includes('Unable to verify current password')) {
                return 'Unable to verify current password. Please try again.';
            }
            // Supabase Auth error messages
            if (error.message.includes('Invalid login credentials')) {
                return 'Current password is incorrect';
            }
            if (error.message.includes('Password should be at least')) {
                return 'Password does not meet minimum requirements';
            }
            if (error.message.includes('Unable to validate email address')) {
                return 'Unable to update password. Please try again.';
            }
            return error.message;
        }
        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Show translatable content (make it visible)
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.password-change .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
            element.style.opacity = '1';
        });
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            return;
        }

        const translatableElements = document.querySelectorAll('.password-change .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && i18next.exists(key)) {
                element.textContent = i18next.t(key);
            }
            element.classList.add('loaded');
        });
    }

    /**
     * Show the password change form
     */
    show() {
        const container = document.getElementById('password-change');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Hide the password change form
     */
    hide() {
        const container = document.getElementById('password-change');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Check if component is initialized
     * @returns {boolean} Whether component is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export for use in other scripts
window.PasswordChange = PasswordChange;
} // End of if statement to prevent duplicate class declaration

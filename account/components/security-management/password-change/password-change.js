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

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;
            console.log('✅ Password Change: Initialized successfully');
            
            // Final translation update to ensure everything is translated
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

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
        
        // Update translations after component is set up
        this.updateTranslations();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Input validation on change with live verification
        this.currentPasswordInput.addEventListener('input', () => {
            this.handleCurrentPasswordInput();
            this.validateForm();
        });
        this.newPasswordInput.addEventListener('input', () => {
            this.validateNewPassword();
            this.updateRequirementsDisplay(this.newPasswordInput.value);
            this.validateForm();
        });
        this.confirmPasswordInput.addEventListener('input', () => {
            this.validateConfirmPassword();
            this.validateForm();
        });

        // Password visibility toggles
        const toggleButtons = document.querySelectorAll('.password-change__toggle-visibility');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.handleCancel());
        }

        // Close success message button
        const closeSuccessButton = document.getElementById('close-password-change-success');
        if (closeSuccessButton) {
            closeSuccessButton.addEventListener('click', () => this.handleCloseSuccess());
        }

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });

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

            // Hide form and show success message
            this.showSuccessState();

            // Update password status in security management
            this.updatePasswordStatus();

            console.log('✅ Password Change: Password changed successfully');

            // Send notification email
            if (typeof window.notificationHelper !== 'undefined') {
                await window.notificationHelper.passwordChanged();
            }

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
            const message = this.getTranslation('Current password is required');
            this.showFieldError('current-password-error', message);
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
            this.validateForm();
            
        } catch (error) {
            // Verification failed
            this.currentPasswordVerified = false;
            this.updateCurrentPasswordUI('error');
            this.disableNewPasswordFields();
            this.validateForm();
            
            // Show specific error message
            if (error.message.includes('Current password is incorrect')) {
                const message = this.getTranslation('Current password is incorrect');
                this.showFieldError('current-password-error', message);
            } else {
                const message = this.getTranslation('Unable to verify current password. Please try again.');
                this.showFieldError('current-password-error', message);
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
        // Use readOnly instead of disabled to allow autofill
        this.newPasswordInput.readOnly = false;
        this.confirmPasswordInput.readOnly = false;
        
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
        // Use readOnly instead of disabled to allow autofill
        this.newPasswordInput.readOnly = true;
        this.confirmPasswordInput.readOnly = true;
        
        // Remove enabled styling
        this.newPasswordInput.classList.remove('enabled');
        this.confirmPasswordInput.classList.remove('enabled');
        
        // Add disabled styling
        this.newPasswordInput.classList.add('disabled');
        this.confirmPasswordInput.classList.add('disabled');
        
        // Clear new password fields
        this.newPasswordInput.value = '';
        this.confirmPasswordInput.value = '';
        
        // Reset requirements display
        this.updateRequirementsDisplay('');
    }

    /**
     * Validate current password field (legacy method for form submission)
     */
    validateCurrentPassword() {
        const value = this.currentPasswordInput.value;
        
        if (!value) {
            const message = this.getTranslation('Current password is required');
            this.showFieldError('current-password-error', message);
            return false;
        }

        if (!this.currentPasswordVerified) {
            const message = this.getTranslation('Please verify your current password first');
            this.showFieldError('current-password-error', message);
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
            const message = this.getTranslation('New password is required');
            this.showFieldError('new-password-error', message);
            return false;
        }

        // Check if new password is different from current password
        const currentPassword = this.currentPasswordInput.value;
        if (currentPassword && value === currentPassword) {
            const message = this.getTranslation('New password must be different from current password');
            this.showFieldError('new-password-error', message);
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
            const message = this.getTranslation('Please confirm your new password');
            this.showFieldError('confirm-password-error', message);
            return false;
        }

        if (value !== newPassword) {
            const message = this.getTranslation('Passwords do not match');
            this.showFieldError('confirm-password-error', message);
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
     * Update password requirements display
     * @param {string} password - Password to check
     */
    updateRequirementsDisplay(password) {
        const requirements = this.requirements;
        
        Object.keys(requirements).forEach(requirement => {
            const element = document.querySelector(`[data-requirement="${requirement}"]`);
            if (element) {
                const isValid = requirements[requirement].regex.test(password);
                const iconElement = element.querySelector('.password-change__requirement-icon');
                
                // Update element class
                element.className = `password-change__requirement ${isValid ? 'valid' : 'invalid'}`;
                
                // Update icon text
                if (iconElement) {
                    iconElement.textContent = isValid ? '✅' : '❌';
                }
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
     * Handle close success message button click
     */
    handleCloseSuccess() {
        this.resetForm();
        this.hideMessages();
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        // Show the form again (in case it was hidden after success)
        if (this.form) {
            this.form.style.display = 'block';
            this.form.reset();
        }
        
        // Hide success message
        const successElement = document.getElementById('password-change-success');
        if (successElement) {
            successElement.style.display = 'none';
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
     * Show field error message (disabled - no error elements)
     * @param {string} errorId - Error element ID
     * @param {string} message - Error message
     */
    showFieldError(errorId, message) {
        // Error elements removed - no-op
        console.log(`Field error (${errorId}): ${message}`);
    }

    /**
     * Hide field error message (disabled - no error elements)
     * @param {string} errorId - Error element ID
     */
    hideFieldError(errorId) {
        // Error elements removed - no-op
    }

    /**
     * Hide all field error messages (disabled - no error elements)
     */
    hideAllFieldErrors() {
        // Error elements removed - no-op
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
                return this.getTranslation('Current password is incorrect');
            }
            if (error.message.includes('Unable to verify current password')) {
                return this.getTranslation('Unable to verify current password. Please try again.');
            }
            // Supabase Auth error messages
            if (error.message.includes('Invalid login credentials')) {
                return this.getTranslation('Current password is incorrect');
            }
            if (error.message.includes('Password should be at least')) {
                return this.getTranslation('Password does not meet minimum requirements');
            }
            if (error.message.includes('Unable to validate email address')) {
                return this.getTranslation('Unable to update password. Please try again.');
            }
            return error.message;
        }
        return this.getTranslation('An unexpected error occurred. Please try again.');
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
     * Initialize translations for the component
     */
    async initializeTranslations() {
        try {
            if (window.passwordChangeTranslations) {
                await window.passwordChangeTranslations.init();
                // Update translations immediately after initialization
                this.updateTranslations();
            }
        } catch (error) {
            console.error('❌ Failed to initialize password change translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.passwordChangeTranslations && window.passwordChangeTranslations.isReady()) {
            window.passwordChangeTranslations.updateTranslations();
        } else {
            // If translations aren't ready yet, try to initialize them
            if (window.passwordChangeTranslations) {
                window.passwordChangeTranslations.init().then(() => {
                    window.passwordChangeTranslations.updateTranslations();
                });
            }
        }
    }

    /**
     * Get translation for a specific key
     * @param {string} key - Translation key
     * @returns {string} Translated text
     */
    getTranslation(key) {
        // Try to get translation from password change translations
        if (window.passwordChangeTranslations && window.passwordChangeTranslations.isReady()) {
            return window.passwordChangeTranslations.getTranslation(key);
        }
        
        // Fallback: try to get translation from global translation system
        if (window.profileManagementTranslations && window.profileManagementTranslations.isInitialized) {
            return window.profileManagementTranslations.getTranslation(key);
        }
        
        // Fallback: try to get translation even if not ready (more robust)
        if (window.passwordChangeTranslations) {
            const translation = window.passwordChangeTranslations.getTranslation(key);
            if (translation !== key) {
                return translation;
            }
        }
        
        // Final fallback: return the key
        return key;
    }

    /**
     * Show success state (hide form, show success message)
     */
    showSuccessState() {
        // Hide the form
        if (this.form) {
            this.form.style.display = 'none';
        }
        
        // Show success message
        const successElement = document.getElementById('password-change-success');
        if (successElement) {
            successElement.style.display = 'block';
        }
        
        // Update success message text
        const messageElement = successElement?.querySelector('.password-change__success-message');
        if (messageElement) {
            messageElement.textContent = this.getTranslation('Password changed successfully!');
        }
    }

    /**
     * Update password status in security management
     */
    async updatePasswordStatus() {
        try {
            console.log('🔧 Password Change: Starting password status update...');
            
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error('❌ Password Change: Failed to get user:', userError);
                return;
            }
            
            if (!user) {
                console.error('❌ Password Change: No user found');
                return;
            }
            
            console.log('🔧 Password Change: User found:', user.id, user.email);
            
            // First, check if user profile exists
            const { data: existingProfile, error: selectError } = await supabase
                .from('user_profiles')
                .select('id, username, password_last_changed')
                .eq('id', user.id)
                .single();
            
            if (selectError) {
                console.error('❌ Password Change: Failed to check existing profile:', selectError);
                return;
            }
            
            console.log('🔧 Password Change: Existing profile:', existingProfile);
            
            // Update password_last_changed in database
            const { data: updateData, error: updateError } = await supabase
                .from('user_profiles')
                .update({ password_last_changed: new Date().toISOString() })
                .eq('id', user.id)
                .select();
            
            if (updateError) {
                console.error('❌ Password Change: Failed to update password status in database:', updateError);
            } else {
                console.log('✅ Password Change: Password status updated in database:', updateData);
            }
            
            // Update security management status if available
            if (window.securityManagement && window.securityManagement.updatePasswordStatus) {
                window.securityManagement.updatePasswordStatus(new Date());
            }
            
        } catch (error) {
            console.error('❌ Password Change: Failed to update password status:', error);
        }
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

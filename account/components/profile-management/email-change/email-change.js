/**
 * Email Change Component
 * Handles email change functionality with verification
 */
if (typeof window.EmailChange === 'undefined') {
class EmailChange {
    constructor() {
        this.isInitialized = false;
        this.currentEmail = '';
        this.isEmailVerified = true;
        this.isEditing = false;
        
        // Bind methods
        this.handleChangeClick = this.handleChangeClick.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleResendVerification = this.handleResendVerification.bind(this);
    }

    /**
     * Initialize the email change component
     */
    async init() {
        if (this.isInitialized) {
            console.log('Email change component already initialized');
            return;
        }

        try {
            // Initializing silently
            
            // Load user data
            await this.loadUserData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI with current data
            this.updateUI();
            
            this.isInitialized = true;
            // Initialized silently
            
        } catch (error) {
            console.error('❌ Failed to initialize email change component:', error);
            this.showError('Failed to load email information');
        }
    }

    /**
     * Load user data from Supabase
     */
    async loadUserData() {
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase client not available');
            }

            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError) {
                throw new Error('Failed to get user data');
            }

            if (!user) {
                throw new Error('User not authenticated');
            }

            this.currentEmail = user.email;
            this.isEmailVerified = user.email_confirmed_at !== null;
            
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const changeBtn = document.getElementById('change-email-btn');
        const cancelBtn = document.getElementById('cancel-email-btn');
        const form = document.getElementById('email-change-form');
        const resendBtn = document.getElementById('resend-verification-btn');
        const emailInput = document.getElementById('new-email');
        const passwordInput = document.getElementById('confirm-password');

        // Setting up event listeners

        if (changeBtn) {
            changeBtn.addEventListener('click', this.handleChangeClick);
            // Event listener added silently
        } else {
            console.error('❌ Email change button not found for event listener');
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelClick);
        }

        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', this.handleResendVerification);
        }

        if (emailInput) {
            emailInput.addEventListener('input', this.handleInputChange);
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', this.handleInputChange);
        }
    }

    /**
     * Update UI with current data
     */
    updateUI() {
        // Update current email display
        const currentEmailEl = document.getElementById('current-email');
        if (currentEmailEl) {
            currentEmailEl.textContent = this.currentEmail;
        }

        // Update verification status
        const statusEl = document.getElementById('email-verification-status');
        const resendBtn = document.getElementById('resend-verification-btn');
        
        if (statusEl) {
            if (this.isEmailVerified) {
                statusEl.textContent = 'Verified';
                statusEl.className = 'email-change__status-badge verified';
            } else {
                statusEl.textContent = 'Unverified';
                statusEl.className = 'email-change__status-badge unverified';
            }
        }

        if (resendBtn) {
            resendBtn.classList.toggle('hidden', this.isEmailVerified);
        }
    }

    /**
     * Handle change email button click
     */
    handleChangeClick() {
        // Change email button clicked
        this.isEditing = true;
        this.showEditForm();
    }

    /**
     * Handle cancel button click
     */
    handleCancelClick() {
        this.isEditing = false;
        this.hideEditForm();
        this.clearForm();
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const newEmail = formData.get('email').trim();
        const password = formData.get('password');

        if (newEmail === this.currentEmail) {
            this.hideEditForm();
            return;
        }

        if (!this.validateEmail(newEmail)) {
            this.showError('Invalid email format');
            return;
        }

        try {
            this.showLoading(true, 'Sending verification email...');
            this.hideError();

            await this.sendEmailChangeVerification(newEmail, password);
            
            this.hideEditForm();
            this.clearForm();
            this.showVerificationInfo();
            this.showSuccess('Verification email sent to your new email address');
            
        } catch (error) {
            console.error('❌ Failed to send email change verification:', error);
            this.showError(error.message || 'Failed to send verification email');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle input change for form validation
     */
    handleInputChange() {
        const emailInput = document.getElementById('new-email');
        const passwordInput = document.getElementById('confirm-password');
        const saveBtn = document.getElementById('save-email-btn');
        
        const email = emailInput?.value.trim() || '';
        const password = passwordInput?.value || '';
        
        const isValidEmail = this.validateEmail(email);
        const hasPassword = password.length > 0;
        const isDifferent = email !== this.currentEmail;
        
        if (saveBtn) {
            saveBtn.disabled = !isValidEmail || !hasPassword || !isDifferent;
        }
    }

    /**
     * Handle resend verification
     */
    async handleResendVerification() {
        try {
            this.showLoading(true, 'Resending verification email...');
            this.hideError();

            await this.resendEmailVerification();
            
            this.showSuccess('Verification email sent successfully');
            
        } catch (error) {
            console.error('❌ Failed to resend verification email:', error);
            this.showError(error.message || 'Failed to resend verification email');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Send email change verification
     */
    async sendEmailChangeVerification(newEmail, password) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        // First, verify the current password by attempting to sign in
        const { data: { user }, error: signInError } = await window.supabase.auth.signInWithPassword({
            email: this.currentEmail,
            password: password
        });

        if (signInError || !user) {
            throw new Error('Invalid password');
        }

        // Send email change verification
        console.log('🔧 Sending email change verification for:', newEmail);
        const redirectUrl = `${window.location.origin}/auth/verify/index.html`;
        console.log('🔧 Redirect URL being sent:', redirectUrl);
        
        const { data, error } = await window.supabase.auth.updateUser({
            email: newEmail,
            options: {
                emailRedirectTo: redirectUrl
            }
        });

        console.log('📧 Email update response:', { data, error });
        console.log('📧 User data after email update:', data.user);
        console.log('📧 User email before update:', this.userProfile?.email);
        console.log('📧 New email requested:', newEmail);

        if (error) {
            throw new Error(error.message || 'Failed to send verification email');
        }
    }

    /**
     * Resend email verification
     */
    async resendEmailVerification() {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { error } = await window.supabase.auth.resend({
            type: 'signup',
            email: this.currentEmail
        });

        if (error) {
            throw new Error(error.message || 'Failed to resend verification email');
        }
    }

    /**
     * Show edit form
     */
    showEditForm() {
        const form = document.getElementById('email-change-form');
        const changeBtn = document.getElementById('change-email-btn');
        
        if (form) {
            form.classList.remove('hidden');
        }
        
        if (changeBtn) {
            changeBtn.classList.add('hidden');
        }

        // Focus on email input
        const emailInput = document.getElementById('new-email');
        if (emailInput) {
            emailInput.value = this.currentEmail;
            setTimeout(() => emailInput.focus(), 100);
        }
    }

    /**
     * Hide edit form
     */
    hideEditForm() {
        const form = document.getElementById('email-change-form');
        const changeBtn = document.getElementById('change-email-btn');
        
        if (form) {
            form.classList.add('hidden');
        }
        
        if (changeBtn) {
            changeBtn.classList.remove('hidden');
        }
    }

    /**
     * Show verification info
     */
    showVerificationInfo() {
        const infoEl = document.getElementById('email-verification-info');
        if (infoEl) {
            infoEl.classList.remove('hidden');
        }
    }

    /**
     * Hide verification info
     */
    hideVerificationInfo() {
        const infoEl = document.getElementById('email-verification-info');
        if (infoEl) {
            infoEl.classList.add('hidden');
        }
    }

    /**
     * Clear form
     */
    clearForm() {
        const emailInput = document.getElementById('new-email');
        const passwordInput = document.getElementById('confirm-password');
        const saveBtn = document.getElementById('save-email-btn');
        
        if (emailInput) {
            emailInput.value = '';
        }
        
        if (passwordInput) {
            passwordInput.value = '';
        }
        
        if (saveBtn) {
            saveBtn.disabled = true;
        }
    }

    /**
     * Show loading state
     */
    showLoading(show, text = 'Processing...') {
        const loading = document.getElementById('email-loading');
        const loadingText = document.getElementById('email-loading-text');
        const saveBtn = document.getElementById('save-email-btn');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (saveBtn) {
            saveBtn.disabled = show;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('email-error');
        const messageEl = document.getElementById('email-error-message');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successEl = document.getElementById('email-success');
        const messageEl = document.getElementById('email-success-message');
        
        if (successEl && messageEl) {
            messageEl.textContent = message;
            successEl.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideSuccess();
            }, 3000);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorEl = document.getElementById('email-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        const successEl = document.getElementById('email-success');
        if (successEl) {
            successEl.classList.add('hidden');
        }
    }

    /**
     * Get current email
     */
    getCurrentEmail() {
        return this.currentEmail;
    }

    /**
     * Check if email is verified
     */
    isEmailVerified() {
        return this.isEmailVerified;
    }

    /**
     * Check if currently editing
     */
    isCurrentlyEditing() {
        return this.isEditing;
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        this.isInitialized = false;
        this.isEditing = false;
    }
}

// Export for use in other scripts
window.EmailChange = EmailChange;
} // End of if statement to prevent duplicate class declaration

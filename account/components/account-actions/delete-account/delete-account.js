/**
 * Delete Account Component
 * Handles account deletion with password confirmation and grace period
 */
if (typeof window.DeleteAccount === 'undefined') {
class DeleteAccount {
    constructor() {
        this.deleteBtn = null;
        this.formContainer = null;
        this.form = null;
        this.passwordInput = null;
        this.cancelBtn = null;
        this.confirmBtn = null;
        this.processingDiv = null;
        this.successDiv = null;
        this.errorDiv = null;
        this.errorMessage = null;
        this.isInitialized = false;
        
        // Cancellation UI elements
        this.cancellationContainer = null;
        this.cancelDeletionBtn = null;
        this.daysRemainingSpan = null;
        this.scheduledDateSpan = null;
        
        // Deletion request data
        this.deletionRequest = null;
    }

    /**
     * Initialize the Delete Account component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Delete Account: Already initialized');
                return;
            }

            // Initializing

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;
            // Initialized
            
            // Final translation update to ensure everything is translated
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

        } catch (error) {
            window.logger?.error('❌ Delete Account: Failed to initialize:', error);
            this.showError('Failed to initialize delete account component');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    setupComponent() {
        // Get DOM elements
        this.deleteBtn = document.getElementById('delete-account-btn');
        this.formContainer = document.getElementById('delete-account-form-container');
        this.form = document.getElementById('delete-account-form');
        this.passwordInput = document.getElementById('delete-password');
        this.cancelBtn = document.getElementById('cancel-delete-btn');
        this.confirmBtn = document.getElementById('confirm-delete-btn');
        this.processingDiv = document.getElementById('delete-account-processing');
        this.successDiv = document.getElementById('delete-account-success');
        this.errorDiv = document.getElementById('delete-account-error');
        this.errorMessage = document.getElementById('delete-account-error-message');
        
        // Cancellation UI elements (will be created if deletion is pending)
        this.cancellationContainer = document.getElementById('deletion-cancellation-container');

        if (!this.deleteBtn) {
            window.logger?.error('Delete Account elements not found');
            return;
        }

        // Attach event listeners
        this.attachEventListeners();
        
        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations after component is set up
        this.updateTranslations();
        
        // Check for pending deletion
        this.checkPendingDeletion();
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.deleteAccountTranslations) {
                await window.deleteAccountTranslations.init();
                // Update translations immediately after initialization
                this.updateTranslations();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize delete account translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.deleteAccountTranslations) {
            window.deleteAccountTranslations.updateTranslations();
        }
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.delete-account .translatable-content');
        translatableElements.forEach(element => {
            element.style.opacity = '1';
            element.classList.add('loaded');
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Delete button - show confirmation form
        this.deleteBtn.addEventListener('click', () => this.showConfirmationForm());
        
        // Cancel button - hide confirmation form
        this.cancelBtn.addEventListener('click', () => this.hideConfirmationForm());
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleDeleteSubmit(e));
        
        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Show confirmation form
     */
    showConfirmationForm() {
        this.deleteBtn.classList.add('hidden');
        this.formContainer.classList.remove('hidden');
        this.passwordInput.focus();
        this.hideMessages();
    }

    /**
     * Hide confirmation form
     */
    hideConfirmationForm() {
        this.formContainer.classList.add('hidden');
        this.deleteBtn.classList.remove('hidden');
        this.form.reset();
        this.hideMessages();
    }

    /**
     * Handle delete form submission
     */
    async handleDeleteSubmit(e) {
        e.preventDefault();
        
        const password = this.passwordInput.value.trim();
        
        if (!password) {
            this.showError('Please enter your password');
            return;
        }

        this.showProcessing();
        this.hideMessages();
        this.confirmBtn.disabled = true;

        try {
            // 1. Verify password
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Not authenticated');
            }

            // Verify password by attempting to sign in
            const { error: signInError } = await window.supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (signInError) {
                throw new Error('Incorrect password. Please try again.');
            }

            // 2. Call edge function to schedule account deletion
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(
                `${window.supabase.supabaseUrl}/functions/v1/schedule-account-deletion`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: 'User requested',
                        requestIp: null
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to schedule deletion');
            }

            window.logger?.log('✅ Account deletion scheduled:', result);
            
            this.deletionRequest = result.deletionRequest;
            this.hideProcessing();
            this.showSuccess();
            this.form.reset();
            
            // Reload to show cancellation UI
            setTimeout(() => {
                this.checkPendingDeletion();
            }, 2000);
            
        } catch (error) {
            window.logger?.error('Error deleting account:', error);
            this.hideProcessing();
            this.confirmBtn.disabled = false;
            this.showError(error.message || 'Failed to delete account. Please try again.');
        }
    }

    /**
     * Show processing state
     */
    showProcessing() {
        if (this.processingDiv) {
            this.processingDiv.classList.remove('hidden');
        }
        if (this.formContainer) {
            this.formContainer.style.opacity = '0.5';
        }
    }

    /**
     * Hide processing state
     */
    hideProcessing() {
        if (this.processingDiv) {
            this.processingDiv.classList.add('hidden');
        }
        if (this.formContainer) {
            this.formContainer.style.opacity = '1';
        }
    }

    /**
     * Show success message
     */
    showSuccess() {
        if (this.successDiv) {
            this.successDiv.classList.remove('hidden');
            
            // Hide form after showing success
            if (this.formContainer) {
                this.formContainer.classList.add('hidden');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.errorDiv && this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.errorDiv.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Hide all messages
     */
    hideMessages() {
        if (this.successDiv) this.successDiv.classList.add('hidden');
        if (this.errorDiv) this.errorDiv.classList.add('hidden');
    }

    /**
     * Check for pending deletion request
     */
    async checkPendingDeletion() {
        try {
            // Check URL parameters first (for email cancellation links)
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const token = urlParams.get('token');

            if (action === 'cancel-deletion' && token) {
                await this.handleCancellationFromEmail(token);
                return;
            }

            // Check database for pending deletion
            const { data: { user } } = await window.supabase.auth.getUser();
            
            if (!user) return;

            const { data, error } = await window.supabase
                .from('account_deletion_requests')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'scheduled')
                .maybeSingle();

            if (error || !data) {
                // No pending deletion
                return;
            }

            this.deletionRequest = data;
            this.showCancellationUI(data);

        } catch (error) {
            window.logger?.error('Error checking pending deletion:', error);
        }
    }

    /**
     * Show cancellation UI when deletion is pending
     */
    showCancellationUI(deletionRequest) {
        // Hide the delete button, form, and success message
        if (this.deleteBtn) this.deleteBtn.classList.add('hidden');
        if (this.formContainer) this.formContainer.classList.add('hidden');
        if (this.successDiv) this.successDiv.classList.add('hidden');

        // Calculate days remaining
        const scheduledFor = new Date(deletionRequest.scheduled_for);
        const now = new Date();
        const daysRemaining = Math.ceil((scheduledFor - now) / (1000 * 60 * 60 * 24));

        // Get or create cancellation container
        let container = this.cancellationContainer;
        if (!container) {
            container = document.createElement('div');
            container.id = 'deletion-cancellation-container';
            container.className = 'deletion-cancellation';
            
            const card = this.deleteBtn?.closest('.delete-account__card');
            if (card) {
                card.appendChild(container);
            }
        }

        // Format date for display
        const scheduledDateFormatted = scheduledFor.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Build cancellation UI
        container.innerHTML = `
            <div class="deletion-cancellation__warning">
                <div class="deletion-cancellation__icon">⚠️</div>
                <div class="deletion-cancellation__content">
                    <h5 class="deletion-cancellation__title">Account Deletion Scheduled</h5>
                    <p class="deletion-cancellation__message">
                        Your account is scheduled to be deleted on <strong>${scheduledDateFormatted}</strong>
                        (<strong>${daysRemaining} days remaining</strong>).
                    </p>
                </div>
            </div>
            <div class="deletion-cancellation__info">
                <p>Changed your mind? You can cancel the deletion anytime before the scheduled date.</p>
            </div>
            <button type="button" id="cancel-deletion-btn" class="deletion-cancellation__button">
                <span class="deletion-cancellation__button-icon">✅</span>
                <span>Cancel Deletion & Keep Account</span>
            </button>
            <div id="cancel-deletion-processing" class="deletion-cancellation__processing hidden">
                <div class="deletion-cancellation__spinner"></div>
                <span>Cancelling deletion...</span>
            </div>
        `;

        // Attach cancellation event listener
        const cancelButton = container.querySelector('#cancel-deletion-btn');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.handleCancellation());
        }

        container.classList.remove('hidden');
    }

    /**
     * Handle cancellation from user action
     */
    async handleCancellation() {
        try {
            const cancelButton = document.getElementById('cancel-deletion-btn');
            const processingDiv = document.getElementById('cancel-deletion-processing');

            if (cancelButton) cancelButton.disabled = true;
            if (processingDiv) processingDiv.classList.remove('hidden');

            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(
                `${window.supabase.supabaseUrl}/functions/v1/cancel-account-deletion`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to cancel deletion');
            }

            window.logger?.log('✅ Account deletion cancelled:', result);

            // Hide cancellation UI
            if (this.cancellationContainer) {
                this.cancellationContainer.classList.add('hidden');
            }

            // Show success message
            this.showSuccessCancellation();

            // Reload after delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            window.logger?.error('Error cancelling deletion:', error);
            this.showError(error.message || 'Failed to cancel deletion. Please try again.');
            
            const cancelButton = document.getElementById('cancel-deletion-btn');
            const processingDiv = document.getElementById('cancel-deletion-processing');
            
            if (cancelButton) cancelButton.disabled = false;
            if (processingDiv) processingDiv.classList.add('hidden');
        }
    }

    /**
     * Handle cancellation from email link
     */
    async handleCancellationFromEmail(token) {
        try {
            window.logger?.log('Cancelling deletion via email token');

            const response = await fetch(
                `${window.supabase.supabaseUrl}/functions/v1/cancel-account-deletion`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cancellationToken: token
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to cancel deletion');
            }

            window.logger?.log('✅ Account deletion cancelled via email:', result);

            // Show success and remove URL parameters
            this.showSuccessCancellation();
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Reload after delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            window.logger?.error('Error cancelling deletion from email:', error);
            this.showError(error.message || 'Failed to cancel deletion. Please try again.');
        }
    }

    /**
     * Show success message for cancellation
     */
    showSuccessCancellation() {
        const container = this.cancellationContainer || document.querySelector('.delete-account__card');
        
        if (container) {
            const successMessage = document.createElement('div');
            successMessage.className = 'deletion-cancellation__success';
            successMessage.innerHTML = `
                <span class="deletion-cancellation__success-icon">✅</span>
                <div>
                    <h5>Deletion Cancelled!</h5>
                    <p>Your account will remain active. Redirecting...</p>
                </div>
            `;
            container.insertBefore(successMessage, container.firstChild);
        }
    }
}

// Export to window
window.DeleteAccount = DeleteAccount;
}

// Note: Initialization is handled by the parent component (account-actions)
// which loads translations first, then initializes this component

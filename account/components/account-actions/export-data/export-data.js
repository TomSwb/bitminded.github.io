/**
 * Export Data Component
 * Allows users to download all their data in JSON format (GDPR compliance)
 */
if (typeof window.ExportData === 'undefined') {
class ExportData {
    constructor() {
        this.btn = null;
        this.progressDiv = null;
        this.successDiv = null;
        this.errorDiv = null;
        this.errorMessage = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Export Data component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Export Data: Already initialized');
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
            window.logger?.error('❌ Export Data: Failed to initialize:', error);
            this.showError('Failed to initialize export data component');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    setupComponent() {
        // Get DOM elements
        this.btn = document.getElementById('export-data-btn');
        this.progressDiv = document.getElementById('export-data-progress');
        this.successDiv = document.getElementById('export-data-success');
        this.errorDiv = document.getElementById('export-data-error');
        this.errorMessage = document.getElementById('export-data-error-message');

        if (!this.btn) {
            window.logger?.error('Export Data button not found');
            return;
        }

        // Attach event listeners
        this.attachEventListeners();
        
        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations after component is set up
        this.updateTranslations();
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.exportDataTranslations) {
                await window.exportDataTranslations.init();
                // Update translations immediately after initialization
                this.updateTranslations();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize export data translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.exportDataTranslations) {
            window.exportDataTranslations.updateTranslations();
        }
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.export-data .translatable-content');
        translatableElements.forEach(element => {
            element.style.opacity = '1';
            element.classList.add('loaded');
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.btn.addEventListener('click', () => this.handleExport());
        
        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Handle export button click
     */
    async handleExport() {
        // Hide previous messages
        this.hideMessages();

        // Show progress
        this.showProgress();

        // Disable button
        this.btn.disabled = true;

        try {
            // Check if user is authenticated
            const { data: { user }, error: authError } = await window.supabase.auth.getUser();
            
            if (authError || !user) {
                throw new Error('You must be logged in to export data');
            }

            // Collect all user data
            const userData = await this.collectUserData(user.id);

            // Generate and download JSON file
            this.downloadJSON(userData);

            // Show success message
            this.showSuccess();

        } catch (error) {
            window.logger?.error('Error exporting data:', error);
            this.showError(error.message || 'Failed to export data. Please try again.');
        } finally {
            // Re-enable button
            this.btn.disabled = false;
            // Hide progress
            this.hideProgress();
        }
    }

    /**
     * Collect all user data from database
     */
    async collectUserData(userId) {
        const exportData = {
            export_date: new Date().toISOString(),
            export_version: '1.0',
            user_id: userId,
            data: {}
        };

        try {
            // 1. Get user profile from auth.users
            const { data: authUser } = await window.supabase.auth.getUser();
            if (authUser?.user) {
                exportData.data.profile = {
                    email: authUser.user.email,
                    created_at: authUser.user.created_at,
                    email_confirmed_at: authUser.user.email_confirmed_at,
                    last_sign_in_at: authUser.user.last_sign_in_at
                };
            }

            // 2. Get user profile data
            const { data: userProfile } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (userProfile) {
                exportData.data.user_profile = userProfile;
            }

            // 3. Get user preferences
            const { data: preferences } = await window.supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (preferences) {
                exportData.data.preferences = preferences;
            }

            // 4. Get user roles
            const { data: roles } = await window.supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId);
            
            if (roles) {
                exportData.data.roles = roles;
            }

            // 5. Get notifications
            const { data: notifications } = await window.supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (notifications) {
                exportData.data.notifications = notifications;
            }

            // 6. Get login activity
            const { data: loginActivity } = await window.supabase
                .from('login_activity')
                .select('*')
                .eq('user_id', userId)
                .order('login_time', { ascending: false })
                .limit(100); // Last 100 login attempts
            
            if (loginActivity) {
                exportData.data.login_activity = loginActivity;
            }

            // 7. Get entitlements (app purchases)
            const { data: entitlements } = await window.supabase
                .from('entitlements')
                .select('*')
                .eq('user_id', userId);
            
            if (entitlements) {
                exportData.data.entitlements = entitlements;
            }

            // 8. Get 2FA status (without secret key for security)
            const { data: twoFAData } = await window.supabase
                .from('user_2fa')
                .select('is_enabled, created_at, updated_at')
                .eq('user_id', userId)
                .single();
            
            if (twoFAData) {
                exportData.data.two_factor_auth = twoFAData;
            }

            // 9. Get active sessions count
            const { data: sessions } = await window.supabase
                .from('user_sessions')
                .select('created_at, last_accessed, expires_at')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString());
            
            if (sessions) {
                exportData.data.active_sessions = sessions;
            }

        } catch (error) {
            window.logger?.error('Error collecting user data:', error);
            // Continue with partial data rather than failing completely
        }

        return exportData;
    }

    /**
     * Generate and download JSON file
     */
    downloadJSON(data) {
        // Convert to JSON with pretty formatting
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.href = url;
        link.download = `bitminded-data-export-${timestamp}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Show progress indicator
     */
    showProgress() {
        if (this.progressDiv) {
            this.progressDiv.classList.remove('hidden');
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        if (this.progressDiv) {
            this.progressDiv.classList.add('hidden');
        }
    }

    /**
     * Show success message
     */
    showSuccess() {
        if (this.successDiv) {
            this.successDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.successDiv.classList.add('hidden');
            }, 5000);
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
}

// Export to window
window.ExportData = ExportData;
}

// Note: Initialization is handled by the parent component (account-actions)
// which loads translations first, then initializes this component

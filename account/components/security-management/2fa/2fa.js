/**
 * Two-Factor Authentication Status Component
 * Displays current 2FA status and provides setup/management options
 */
if (typeof window.TwoFactorAuth === 'undefined') {
class TwoFactorAuth {
    constructor() {
        this.isInitialized = false;
        this.is2FAEnabled = false;
        this.lastVerifiedAt = null;
        this.setupWindow = null;
        
        // UI elements
        this.statusBadge = null;
        this.statusText = null;
        this.actionButton = null;
        this.lastVerifiedContainer = null;
        this.lastVerifiedDate = null;
        this.loadingContainer = null;
        this.errorContainer = null;
        this.errorText = null;
    }

    /**
     * Initialize the 2FA component
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.log('2FA: Already initialized');
                return;
            }

            console.log('🔐 2FA: Initializing...');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;
            console.log('✅ 2FA: Initialized successfully');
            
            // Final translation update to ensure everything is translated
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

        } catch (error) {
            console.error('❌ 2FA: Failed to initialize:', error);
            this.showError('Failed to initialize 2FA component');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    async setupComponent() {
        // Get UI elements
        this.statusBadge = document.getElementById('2fa-status-badge');
        this.statusText = document.getElementById('2fa-status-text');
        this.actionButton = document.getElementById('2fa-action-btn');
        this.lastVerifiedContainer = document.getElementById('2fa-last-verified');
        this.lastVerifiedDate = document.getElementById('2fa-verified-date');
        this.loadingContainer = document.getElementById('2fa-loading');
        this.errorContainer = document.getElementById('2fa-error');
        this.errorText = document.getElementById('2fa-error-text');

        if (!this.statusBadge || !this.statusText || !this.actionButton) {
            console.error('❌ 2FA: Required elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Load 2FA status from database
        await this.load2FAStatus();
        
        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations after component is set up
        this.updateTranslations();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Action button click
        if (this.actionButton) {
            this.actionButton.addEventListener('click', () => this.handleActionClick());
        }

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });

        // Listen for messages from setup window
        this.setupMessageListener();
    }

    /**
     * Setup message listener for setup window communication
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (event.origin !== window.location.origin) {
                return;
            }

            // Handle 2FA setup completion
            if (event.data && event.data.type === '2fa-setup-complete') {
                console.log('✅ 2FA: Setup completed, refreshing status...');
                this.refresh2FAStatus();
            }
        });
    }

    /**
     * Load 2FA status from database
     */
    async load2FAStatus() {
        try {
            console.log('🔧 2FA: Loading status...');
            this.showLoading(true);
            this.hideError();

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.error('❌ 2FA: Failed to get user:', userError);
                this.update2FAStatus(false, null);
                this.showLoading(false);
                return;
            }

            console.log('🔧 2FA: User found:', user.id);

            // Query user_2fa table
            const { data: twoFAData, error } = await supabase
                .from('user_2fa')
                .select('is_enabled, last_verified_at')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.error('❌ 2FA: Failed to load status:', error);
                this.update2FAStatus(false, null);
                this.showError('Failed to load 2FA status');
                this.showLoading(false);
                return;
            }

            // Update UI based on status
            const isEnabled = twoFAData?.is_enabled || false;
            const lastVerified = twoFAData?.last_verified_at || null;
            
            console.log('✅ 2FA: Status loaded - Enabled:', isEnabled, 'Last verified:', lastVerified);
            this.update2FAStatus(isEnabled, lastVerified);
            this.showLoading(false);

        } catch (error) {
            console.error('❌ 2FA: Failed to load status:', error);
            this.update2FAStatus(false, null);
            this.showError('Failed to load 2FA status');
            this.showLoading(false);
        }
    }

    /**
     * Refresh 2FA status after setup completion
     */
    async refresh2FAStatus() {
        await this.load2FAStatus();
    }

    /**
     * Update UI based on 2FA status
     * @param {boolean} isEnabled - Whether 2FA is enabled
     * @param {string|null} lastVerified - Last verification timestamp
     */
    update2FAStatus(isEnabled, lastVerified) {
        this.is2FAEnabled = isEnabled;
        this.lastVerifiedAt = lastVerified;

        // Update status badge
        if (this.statusBadge) {
            this.statusBadge.className = 'two-factor-auth__status-badge';
            this.statusBadge.classList.add(isEnabled ? 'active' : 'inactive');
            
            const badgeText = this.statusBadge.querySelector('.translatable-content');
            if (badgeText) {
                badgeText.setAttribute('data-translation-key', isEnabled ? 'Active' : 'Inactive');
                badgeText.textContent = isEnabled ? 'Active' : 'Inactive';
            }
        }

        // Update status text
        if (this.statusText) {
            this.statusText.className = 'two-factor-auth__status-text';
            this.statusText.classList.add(isEnabled ? 'enabled' : 'disabled');
            
            const statusTextContent = this.statusText.querySelector('.translatable-content');
            if (statusTextContent) {
                const key = isEnabled 
                    ? '2FA is enabled and protecting your account' 
                    : '2FA is not enabled';
                statusTextContent.setAttribute('data-translation-key', key);
                statusTextContent.textContent = key;
            }
        }

        // Update last verified timestamp
        if (this.lastVerifiedContainer && this.lastVerifiedDate) {
            if (isEnabled && lastVerified) {
                this.lastVerifiedContainer.style.display = 'flex';
                const formattedDate = this.formatEuropeanDateTime(new Date(lastVerified));
                const dateContent = this.lastVerifiedDate.querySelector('.translatable-content');
                if (dateContent) {
                    // Remove translation for dynamic date
                    dateContent.classList.remove('translatable-content');
                    dateContent.removeAttribute('data-translation-key');
                }
                this.lastVerifiedDate.textContent = formattedDate;
            } else {
                this.lastVerifiedContainer.style.display = 'none';
            }
        }

        // Update action button
        if (this.actionButton) {
            this.actionButton.className = 'two-factor-auth__action-btn';
            
            if (isEnabled) {
                this.actionButton.classList.add('secondary');
                const buttonText = this.actionButton.querySelector('.translatable-content');
                if (buttonText) {
                    buttonText.setAttribute('data-translation-key', 'Manage 2FA');
                    buttonText.textContent = 'Manage 2FA';
                }
            } else {
                const buttonText = this.actionButton.querySelector('.translatable-content');
                if (buttonText) {
                    buttonText.setAttribute('data-translation-key', 'Enable 2FA');
                    buttonText.textContent = 'Enable 2FA';
                }
            }
        }

        // Trigger translation update
        this.updateTranslations();

        console.log('✅ 2FA: UI updated - Enabled:', isEnabled);
    }

    /**
     * Handle action button click
     */
    handleActionClick() {
        if (this.is2FAEnabled) {
            // TODO: Open management page (disable, regenerate codes, etc.)
            console.log('🔧 2FA: Manage clicked (not yet implemented)');
            alert('2FA management features coming soon!\n\nThis will allow you to:\n- Disable 2FA\n- Regenerate backup codes\n- View 2FA history');
        } else {
            // Open setup page in new window
            this.openSetupWindow();
        }
    }

    /**
     * Open 2FA setup in new window
     */
    openSetupWindow() {
        try {
            const setupUrl = '/account/components/security-management/2fa/2fa-setup.html';
            const windowFeatures = 'width=600,height=800,scrollbars=yes,resizable=yes';
            
            console.log('🔧 2FA: Opening setup window...');
            
            this.setupWindow = window.open(setupUrl, '2fa-setup', windowFeatures);
            
            if (!this.setupWindow || this.setupWindow.closed || typeof this.setupWindow.closed === 'undefined') {
                // Pop-up was blocked
                console.warn('⚠️ 2FA: Setup window blocked by browser');
                this.showError('Please enable pop-ups for this site to set up 2FA');
            } else {
                console.log('✅ 2FA: Setup window opened');
            }
        } catch (error) {
            console.error('❌ 2FA: Failed to open setup window:', error);
            this.showError('Failed to open setup window. Please check your browser settings.');
        }
    }

    /**
     * Show/hide loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        if (this.errorContainer && this.errorText) {
            this.errorText.textContent = message;
            this.errorContainer.style.display = 'flex';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Format date and time in European format (dd.mm.yyyy HH:mm)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatEuropeanDateTime(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        if (!window.twoFactorAuthTranslations) {
            console.warn('⚠️ 2FA: Translations not loaded yet');
            return;
        }

        try {
            await window.twoFactorAuthTranslations.init();
        } catch (error) {
            console.error('❌ 2FA: Failed to initialize translations:', error);
        }
    }

    /**
     * Update all translations
     */
    updateTranslations() {
        if (window.twoFactorAuthTranslations && window.twoFactorAuthTranslations.isReady()) {
            window.twoFactorAuthTranslations.updateTranslations();
        }
    }

    /**
     * Make translatable content visible
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.two-factor-auth .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
            element.style.opacity = '1';
        });
    }
}

// Register globally
window.TwoFactorAuth = TwoFactorAuth;
}

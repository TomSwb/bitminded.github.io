/**
 * Two-Factor Authentication Status Component
 * Displays current 2FA status and provides setup/management options
 */
if (typeof window.TwoFactorAuth === 'undefined') {
class TwoFactorAuth {
    constructor() {
        this.isInitialized = false;
        this.is2FAEnabled = false;
        this.setupWindow = null;
        this.regeneratedCodes = [];
        
        // UI elements
        this.statusBadge = null;
        this.actionButton = null;
        this.regenerateButton = null;
        this.backupCodesModal = null;
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
        // Check if we're returning from 2FA setup on mobile PWA
        const setupComplete = sessionStorage.getItem('2fa_setup_complete');
        if (setupComplete === 'true') {
            console.log('📨 Detected 2FA setup completion (mobile mode)');
            sessionStorage.removeItem('2fa_setup_complete');
            sessionStorage.removeItem('2fa_setup_timestamp');
        }
        
        // Get UI elements
        this.statusBadge = document.getElementById('2fa-status-badge');
        this.actionButton = document.getElementById('2fa-component-action-btn');
        this.regenerateButton = document.getElementById('2fa-regenerate-codes-btn');
        this.backupCodesModal = document.getElementById('backup-codes-modal');
        this.loadingContainer = document.getElementById('2fa-loading');
        this.errorContainer = document.getElementById('2fa-error');
        this.errorText = document.getElementById('2fa-error-text');

        if (!this.statusBadge || !this.actionButton) {
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

        // Regenerate codes button
        if (this.regenerateButton) {
            this.regenerateButton.addEventListener('click', () => this.handleRegenerateCodes());
        }

        // Modal close button
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        // Modal overlay click
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }

        // Download regenerated codes
        const downloadBtn = document.getElementById('btn-download-regenerated');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadBackupCodes());
        }

        // Print regenerated codes
        const printBtn = document.getElementById('btn-print-regenerated');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printBackupCodes());
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
                
                // Send notification email for 2FA enabled
                if (typeof window.notificationHelper !== 'undefined') {
                    window.notificationHelper.twoFAEnabled();
                }
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
     * @param {string|null} lastVerified - Last verification timestamp (not used currently)
     */
    update2FAStatus(isEnabled, lastVerified) {
        this.is2FAEnabled = isEnabled;

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

        // Update action button
        if (this.actionButton) {
            this.actionButton.className = 'two-factor-auth__action-btn';
            
            if (isEnabled) {
                this.actionButton.classList.add('danger');
                const buttonText = this.actionButton.querySelector('.translatable-content');
                if (buttonText) {
                    buttonText.setAttribute('data-translation-key', 'Disable 2FA');
                    buttonText.textContent = 'Disable 2FA';
                }
            } else {
                const buttonText = this.actionButton.querySelector('.translatable-content');
                if (buttonText) {
                    buttonText.setAttribute('data-translation-key', 'Enable 2FA');
                    buttonText.textContent = 'Enable 2FA';
                }
            }
        }

        // Show/hide regenerate backup codes button
        if (this.regenerateButton) {
            this.regenerateButton.style.display = isEnabled ? 'inline-block' : 'none';
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
            // Disable 2FA
            this.disable2FA();
        } else {
            // Open setup page in new window
            this.openSetupWindow();
        }
    }

    /**
     * Disable 2FA
     */
    async disable2FA() {
        // Confirm with user
        const confirmed = confirm(
            'Are you sure you want to disable Two-Factor Authentication?\n\n' +
            'This will reduce the security of your account.\n\n' +
            'You can enable it again at any time.'
        );

        if (!confirmed) {
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            console.log('🔧 2FA: Disabling...');

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Failed to get user');
            }

            // Update database - set is_enabled to false
            const { error } = await supabase
                .from('user_2fa')
                .update({ 
                    is_enabled: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) {
                throw error;
            }

            console.log('✅ 2FA: Disabled successfully');

            // Refresh status
            await this.load2FAStatus();

            // Send notification email
            if (typeof window.notificationHelper !== 'undefined') {
                await window.notificationHelper.twoFADisabled();
            }

            // Show success message (optional)
            alert('Two-Factor Authentication has been disabled.');

        } catch (error) {
            console.error('❌ 2FA: Failed to disable:', error);
            this.showError('Failed to disable 2FA. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Open 2FA setup in new window
     */
    openSetupWindow() {
        try {
            const setupUrl = '/account/components/security-management/2fa/2fa-setup.html';
            
            // Detect if we're on mobile/tablet or in PWA mode
            const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            
            console.log('🔧 2FA: Opening setup window...', {isMobile, isPWA});
            
            if (isMobile || isPWA) {
                // On mobile/PWA, navigate to the setup page directly
                window.location.href = setupUrl;
            } else {
                // On desktop, use popup window
                const windowFeatures = 'width=600,height=800,scrollbars=yes,resizable=yes';
                this.setupWindow = window.open(setupUrl, '2fa-setup', windowFeatures);
                
                if (!this.setupWindow || this.setupWindow.closed || typeof this.setupWindow.closed === 'undefined') {
                    // Fallback to full page navigation if popup blocked
                    window.location.href = setupUrl;
                } else {
                    console.log('✅ 2FA: Setup window opened');
                }
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
     * Handle regenerate backup codes
     */
    async handleRegenerateCodes() {
        const confirmed = confirm(
            'Regenerate backup codes?\n\n' +
            'This will create new backup codes and invalidate your old ones.\n\n' +
            'Make sure to save the new codes!'
        );

        if (!confirmed) {
            return;
        }

        this.showLoading(true);

        try {
            // Generate new codes
            this.regeneratedCodes = [];
            for (let i = 0; i < 10; i++) {
                this.regeneratedCodes.push(this.generateBackupCode());
            }

            // Hash codes before storing
            const hashedCodes = this.regeneratedCodes.map(code => btoa(code));

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Failed to get user');
            }

            // Update database with new codes
            const { error } = await supabase
                .from('user_2fa')
                .update({ 
                    backup_codes: hashedCodes,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) {
                throw error;
            }

            console.log('✅ Backup codes regenerated successfully');

            // Show codes in modal
            this.showBackupCodesModal();

        } catch (error) {
            console.error('❌ Failed to regenerate backup codes:', error);
            this.showError('Failed to regenerate backup codes. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Generate a single backup code
     */
    generateBackupCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i === 3 || i === 7) {
                code += '-';
            }
        }
        
        return code;
    }

    /**
     * Show backup codes modal
     */
    showBackupCodesModal() {
        const grid = document.getElementById('regenerated-codes-grid');
        if (grid) {
            grid.innerHTML = '';
            this.regeneratedCodes.forEach(code => {
                const codeDiv = document.createElement('div');
                codeDiv.className = 'backup-code';
                codeDiv.textContent = code;
                grid.appendChild(codeDiv);
            });
        }

        if (this.backupCodesModal) {
            this.backupCodesModal.style.display = 'flex';
        }
    }

    /**
     * Close backup codes modal
     */
    closeModal() {
        if (this.backupCodesModal) {
            this.backupCodesModal.style.display = 'none';
        }
    }

    /**
     * Download backup codes
     */
    async downloadBackupCodes() {
        const { data: { user } } = await supabase.auth.getUser();
        
        const content = `BitMinded - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}
Account: ${user?.email || 'Unknown'}

IMPORTANT: Store these codes safely. Each code can only be used once.
Your old backup codes are no longer valid.

${this.regeneratedCodes.join('\n')}

If you lose access to your authenticator app, you can use these codes to log in.
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitminded-2fa-backup-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Backup codes downloaded');
    }

    /**
     * Print backup codes
     */
    async printBackupCodes() {
        const { data: { user } } = await supabase.auth.getUser();
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>BitMinded - 2FA Backup Codes</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 2rem; }
                    h1 { color: #333; }
                    .code { font-family: 'Courier New', monospace; font-size: 1.2rem; margin: 0.5rem 0; }
                    .warning { color: #d9534f; font-weight: bold; margin: 1rem 0; }
                </style>
            </head>
            <body>
                <h1>BitMinded - 2FA Backup Codes</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Account: ${user?.email || 'Unknown'}</p>
                <p class="warning">⚠️ Store these codes safely. Your old backup codes are no longer valid.</p>
                ${this.regeneratedCodes.map(code => `<div class="code">${code}</div>`).join('')}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();

        console.log('✅ Backup codes printed');
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

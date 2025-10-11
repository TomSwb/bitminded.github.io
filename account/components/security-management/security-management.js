/**
 * Security Management Container Component
 * Orchestrates all security-related components and provides navigation between them
 */
if (typeof window.SecurityManagement === 'undefined') {
class SecurityManagement {
    constructor() {
        this.isInitialized = false;
        this.currentSection = 'overview';
        this.loadedComponents = new Set();
        this.sections = ['overview', 'password', '2fa', 'activity'];
        this.lastPasswordChangedDate = null; // Store for language change updates
    }

    /**
     * Initialize the security management component
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.log('Security Management: Already initialized');
                return;
            }

            console.log('🛡️ Security Management: Initializing...');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            this.isInitialized = true;
            console.log('✅ Security Management: Initialized successfully');

        } catch (error) {
            console.error('❌ Security Management: Failed to initialize:', error);
            this.showError('Failed to initialize security management');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    async setupComponent() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize translations
        await this.initializeTranslations();
        
        // Load security status
        await this.loadSecurityStatus();
        
        // Update translations after UI is ready
        this.updateTranslations();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Action buttons for each security feature
        const actionButtons = document.querySelectorAll('.security-management__action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                if (action) {
                    this.showSection(action);
                }
            });
        });

        // Back buttons
        const backButtons = document.querySelectorAll('.security-management__back-btn');
        backButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const backTo = button.dataset.back;
                if (backTo) {
                    this.showSection(backTo);
                }
            });
        });

        // Handle language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
            // Re-update password status with new language
            if (this.lastPasswordChangedDate !== undefined) {
                this.updatePasswordStatus(this.lastPasswordChangedDate);
            }
        });
    }

    /**
     * Show a specific security section
     * @param {string} sectionName - Section to show
     */
    async showSection(sectionName) {
        try {
            if (!this.sections.includes(sectionName)) {
                console.error('❌ Security Management: Invalid section:', sectionName);
                return;
            }

            if (sectionName === this.currentSection) {
                return; // Already on this section
            }

            console.log(`🔄 Security Management: Switching to section: ${sectionName}`);

            // Hide current section
            this.hideCurrentSection();

            // Show new section
            this.showSectionElement(sectionName);

            // Load section content if not already loaded
            if (sectionName !== 'overview' && !this.loadedComponents.has(sectionName)) {
                await this.loadSectionContent(sectionName);
            }

            // Update current section
            this.currentSection = sectionName;

            console.log(`✅ Security Management: Switched to section: ${sectionName}`);

        } catch (error) {
            console.error('❌ Security Management: Failed to switch section:', error);
            this.showError('Failed to switch section');
        }
    }

    /**
     * Get element ID for a section (handles special cases like 2fa)
     * @param {string} sectionName - Section name
     * @returns {string} Valid element ID
     */
    getSectionId(sectionName) {
        // Handle sections that start with numbers (invalid CSS selectors)
        if (sectionName === '2fa') {
            return 'twofa';
        }
        return sectionName;
    }

    /**
     * Hide the current section
     */
    hideCurrentSection() {
        const sectionId = this.getSectionId(this.currentSection);
        const currentSectionElement = document.getElementById(`${sectionId}-section`);
        if (currentSectionElement) {
            currentSectionElement.classList.remove('active');
            currentSectionElement.style.display = 'none';
        }
    }

    /**
     * Show a section element
     * @param {string} sectionName - Section to show
     */
    showSectionElement(sectionName) {
        const sectionId = this.getSectionId(sectionName);
        const sectionElement = document.getElementById(`${sectionId}-section`);
        if (sectionElement) {
            sectionElement.style.display = 'block';
            sectionElement.classList.add('active');
        }
    }

    /**
     * Load content for a specific section
     * @param {string} sectionName - Section to load content for
     */
    async loadSectionContent(sectionName) {
        try {
            console.log(`📦 Security Management: Loading content for section: ${sectionName}`);

            const componentMap = {
                'password': 'password-change',
                '2fa': '2fa',
                'activity': 'login-activity'
            };

            const componentName = componentMap[sectionName];
            if (!componentName) {
                console.warn(`⚠️ Security Management: No component mapped for section: ${sectionName}`);
                return;
            }

            // Check if component exists
            const componentExists = await this.componentExists(componentName);
            if (!componentExists) {
                console.log(`📝 Security Management: Component ${componentName} not yet implemented`);
                this.loadedComponents.add(sectionName);
                return;
            }

            // Load component using the component loader
            if (window.componentLoader) {
                const sectionId = this.getSectionId(sectionName);
                const containerId = `#${sectionId}-content`;
                await window.componentLoader.load(componentName, {
                    container: containerId,
                    basePath: 'account/components/security-management'
                });
                
                // Mark as loaded
                this.loadedComponents.add(sectionName);
                console.log(`✅ Security Management: Loaded component: ${componentName}`);
                
                // Update translations after component is loaded
                this.updateTranslations();
            } else {
                console.warn('⚠️ Security Management: componentLoader not available');
            }

        } catch (error) {
            console.error(`❌ Security Management: Failed to load content for section ${sectionName}:`, error);
        }
    }

    /**
     * Check if a component exists
     * @param {string} componentName - Component name to check
     * @returns {boolean} Whether the component exists
     */
    async componentExists(componentName) {
        try {
            const componentPath = `account/components/security-management/${componentName}`;
            const htmlPath = `/${componentPath}/${componentName}.html`;
            
            const response = await fetch(htmlPath, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load security status information
     */
    async loadSecurityStatus() {
        try {
            // Load 2FA status
            await this.load2FAStatus();
            
            // Load password status
            await this.loadPasswordStatus();
            
            // Load login activity status
            await this.loadLoginActivityStatus();

        } catch (error) {
            console.error('❌ Security Management: Failed to load security status:', error);
        }
    }

    /**
     * Load 2FA status
     */
    async load2FAStatus() {
        try {
            console.log('🔧 Security Management: Loading 2FA status...');
            
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.error('❌ Security Management: Failed to get user for 2FA status');
                this.update2FAStatus(false);
                return;
            }

            // Query user_2fa table
            const { data: twoFAData, error } = await supabase
                .from('user_2fa')
                .select('is_enabled')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.error('❌ Security Management: Failed to load 2FA status:', error);
                this.update2FAStatus(false);
                return;
            }

            // Update UI based on status
            const isEnabled = twoFAData?.is_enabled || false;
            console.log('✅ Security Management: 2FA status loaded - Enabled:', isEnabled);
            this.update2FAStatus(isEnabled);

        } catch (error) {
            console.error('❌ Security Management: Failed to load 2FA status:', error);
            this.update2FAStatus(false);
        }
    }

    /**
     * Load password status
     */
    async loadPasswordStatus() {
        try {
            console.log('🔧 Security Management: Loading password status...');
            
            // Get password last changed date from database
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error('❌ Security Management: Failed to get user:', userError);
                this.updatePasswordStatus(null);
                return;
            }
            
            if (!user) {
                console.error('❌ Security Management: No user found');
                this.updatePasswordStatus(null);
                return;
            }
            
            console.log('🔧 Security Management: User found:', user.id, user.email);
            
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('password_last_changed')
                .eq('id', user.id)
                .single();
            
            if (error) {
                console.error('❌ Security Management: Failed to load password status:', error);
                this.lastPasswordChangedDate = null;
                this.updatePasswordStatus(null);
            } else if (profile && profile.password_last_changed) {
                console.log('🔧 Security Management: Password last changed found:', profile.password_last_changed);
                this.lastPasswordChangedDate = new Date(profile.password_last_changed);
                this.updatePasswordStatus(this.lastPasswordChangedDate);
            } else {
                console.log('🔧 Security Management: No password_last_changed date found, showing "Recently"');
                // If no date stored, show "Recently" as fallback
                this.lastPasswordChangedDate = null;
                this.updatePasswordStatus(null);
            }

            console.log('📝 Security Management: Password status loaded');

        } catch (error) {
            console.error('❌ Security Management: Failed to load password status:', error);
            this.lastPasswordChangedDate = null;
            this.updatePasswordStatus(null);
        }
    }

    /**
     * Update password status display
     * @param {Date|null} lastChangedDate - Date when password was last changed
     */
    updatePasswordStatus(lastChangedDate) {
        const statusElement = document.querySelector('#security-status .security-management__status-description');
        
        if (statusElement) {
            if (lastChangedDate) {
                const formattedDate = this.formatEuropeanDateTime(lastChangedDate);
                
                // Get translation for "Last changed: " (note: key has trailing space)
                let lastChangedText = 'Last changed: ';
                if (window.securityManagementTranslations) {
                    lastChangedText = window.securityManagementTranslations.getTranslation('Last changed: ');
                }
                
                // Remove the translatable-content class and data-translation-key to prevent translation override
                statusElement.classList.remove('translatable-content');
                statusElement.removeAttribute('data-translation-key');
                statusElement.textContent = `${lastChangedText}${formattedDate}`;
                console.log('🔧 Security Management: Updated password status display:', `${lastChangedText}${formattedDate}`);
            } else {
                // Restore translatable content for "Recently"
                statusElement.classList.add('translatable-content');
                statusElement.setAttribute('data-translation-key', 'Last changed: Recently');
                
                let recentlyText = 'Last changed: Recently';
                if (window.securityManagementTranslations) {
                    recentlyText = window.securityManagementTranslations.getTranslation('Last changed: Recently');
                }
                statusElement.textContent = recentlyText;
                console.log('🔧 Security Management: Updated password status display: Recently');
            }
        } else {
            console.error('❌ Security Management: Status element not found');
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
     * Load login activity status
     */
    async loadLoginActivityStatus() {
        try {
            // TODO: Implement login activity status check when login activity component is ready
            console.log('📝 Security Management: Login activity status loaded (placeholder)');

        } catch (error) {
            console.error('❌ Security Management: Failed to load login activity status:', error);
        }
    }

    /**
     * Update 2FA status display
     * @param {boolean} isEnabled - Whether 2FA is enabled
     */
    update2FAStatus(isEnabled) {
        const statusElement = document.getElementById('2fa-status-description');
        const statusItem = document.getElementById('2fa-action-btn')?.closest('.security-management__status-item');
        
        if (statusElement) {
            if (isEnabled) {
                statusElement.innerHTML = '<span class="translatable-content" data-translation-key="Enabled">Enabled</span>';
                statusItem?.classList.add('enabled');
                statusItem?.classList.remove('disabled');
            } else {
                statusElement.innerHTML = '<span class="translatable-content" data-translation-key="Not enabled">Not enabled</span>';
                statusItem?.classList.add('disabled');
                statusItem?.classList.remove('enabled');
            }
        }
        // Note: Button text stays as "Setup" - not changed based on status
    }


    /**
     * Update login activity status display
     * @param {Object} activityData - Login activity data
     */
    updateLoginActivityStatus(activityData) {
        // TODO: Implement login activity status update
        console.log('📝 Security Management: Login activity status updated:', activityData);
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.securityManagementTranslations) {
                await window.securityManagementTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize security management translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.securityManagementTranslations) {
            window.securityManagementTranslations.updateTranslations();
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('Security Management Error:', message);
        // TODO: Implement error display UI
    }

    /**
     * Get current section
     * @returns {string} Current section name
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Check if a section is loaded
     * @param {string} sectionName - Section to check
     * @returns {boolean} Whether the section is loaded
     */
    isSectionLoaded(sectionName) {
        return this.loadedComponents.has(sectionName);
    }

    /**
     * Reload a section
     * @param {string} sectionName - Section to reload
     */
    async reloadSection(sectionName) {
        this.loadedComponents.delete(sectionName);
        await this.loadSectionContent(sectionName);
    }

    /**
     * Show the security management component
     */
    show() {
        const container = document.getElementById('security-management');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Hide the security management component
     */
    hide() {
        const container = document.getElementById('security-management');
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
window.SecurityManagement = SecurityManagement;
} // End of if statement to prevent duplicate class declaration

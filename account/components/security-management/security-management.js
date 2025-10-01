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
        
        // Load initial state
        this.loadSecurityStatus();
        
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
     * Hide the current section
     */
    hideCurrentSection() {
        const currentSectionElement = document.getElementById(`${this.currentSection}-section`);
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
        const sectionElement = document.getElementById(`${sectionName}-section`);
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
                const containerId = `#${sectionName}-content`;
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
            // TODO: Implement 2FA status check when 2FA component is ready
            const statusElement = document.getElementById('2fa-status-description');
            const actionButton = document.getElementById('2fa-action-btn');
            
            if (statusElement && actionButton) {
                // For now, show "Not enabled" - will be updated when 2FA is implemented
                statusElement.innerHTML = '<span class="translatable-content" data-translation-key="Not enabled">Not enabled</span>';
                actionButton.innerHTML = '<span class="translatable-content" data-translation-key="Setup">Setup</span>';
            }

        } catch (error) {
            console.error('❌ Security Management: Failed to load 2FA status:', error);
        }
    }

    /**
     * Load password status
     */
    async loadPasswordStatus() {
        try {
            // TODO: Implement password status check
            // For now, show "Recently" - will be updated when we have password change tracking
            console.log('📝 Security Management: Password status loaded (placeholder)');

        } catch (error) {
            console.error('❌ Security Management: Failed to load password status:', error);
        }
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
        const actionButton = document.getElementById('2fa-action-btn');
        const statusItem = actionButton?.closest('.security-management__status-item');
        
        if (statusElement && actionButton) {
            if (isEnabled) {
                statusElement.innerHTML = '<span class="translatable-content" data-translation-key="Enabled">Enabled</span>';
                actionButton.innerHTML = '<span class="translatable-content" data-translation-key="Manage">Manage</span>';
                statusItem?.classList.add('enabled');
                statusItem?.classList.remove('disabled');
            } else {
                statusElement.innerHTML = '<span class="translatable-content" data-translation-key="Not enabled">Not enabled</span>';
                actionButton.innerHTML = '<span class="translatable-content" data-translation-key="Setup">Setup</span>';
                statusItem?.classList.add('disabled');
                statusItem?.classList.remove('enabled');
            }
        }
    }

    /**
     * Update password status display
     * @param {string} lastChanged - When password was last changed
     */
    updatePasswordStatus(lastChanged) {
        // TODO: Implement password status update
        console.log('📝 Security Management: Password status updated:', lastChanged);
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

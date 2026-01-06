/**
 * Account Layout Component
 * Manages the account page layout, section navigation, and component loading
 */

class AccountLayout {
    constructor() {
        this.currentSection = 'profile';
        this.isInitialized = false;
        this.sections = ['profile', 'security', 'payment', 'apps', 'support', 'notifications', 'family', 'actions'];
        this.loadedComponents = new Set();
    }

    /**
     * Initialize the account layout component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Account Layout already initialized');
                return;
            }
            
            // Account Layout: Initializing
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
            } else {
                this.setupEventListeners();
            }
            
            // Check URL for initial section
            const urlParams = new URLSearchParams(window.location.search);
            const sectionParam = urlParams.get('section');
            if (sectionParam && this.sections.includes(sectionParam)) {
                this.currentSection = sectionParam;
            }
            
            // Ensure the current section is properly shown and others are hidden
            this.initializeSectionVisibility();
            
            // Initialize navigation state
            this.updateNavigationState(this.currentSection);
            
            // Note: Section loading is handled by AccountPageLoader
            // to prevent duplicate component loading
            
            this.isInitialized = true;
            // Account Layout: Initialized successfully
            
            // Make sure all translatable content is visible
            this.showTranslatableContent();
            
            // Wait for i18next to be ready, then update translations
            this.waitForTranslationsAndUpdate();
            
        } catch (error) {
            window.logger?.error('❌ Account Layout: Failed to initialize:', error);
            this.showError('Failed to initialize account layout');
        }
    }

    /**
     * Initialize section visibility - ensure only current section is visible
     */
    initializeSectionVisibility() {
        // Hide all sections first
        this.sections.forEach(sectionName => {
            const sectionElement = document.getElementById(`section-${sectionName}`);
            if (sectionElement) {
                sectionElement.classList.remove('active');
            }
        });
        
        // Show only the current section
        const currentSectionElement = document.getElementById(`section-${this.currentSection}`);
        if (currentSectionElement) {
            currentSectionElement.classList.add('active');
        }
    }

    /**
     * Setup event listeners for navigation
     */
    setupEventListeners() {
        // Navigation button clicks
        const navButtons = document.querySelectorAll('.account-layout__nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const section = button.dataset.section;
                if (section) {
                    this.switchSection(section);
                }
            });
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            if (e.state?.section) {
                this.switchSection(e.state.section, false);
            }
        });

        // Handle language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });
    }

    /**
     * Switch to a different section
     * @param {string} sectionName - The section to switch to
     * @param {boolean} updateHistory - Whether to update browser history
     */
    async switchSection(sectionName, updateHistory = true) {
        try {
            if (!this.sections.includes(sectionName)) {
                window.logger?.error('❌ Account Layout: Invalid section:', sectionName);
                return;
            }

            if (sectionName === this.currentSection) {
                return; // Already on this section
            }

            window.logger?.log(`🔄 Account Layout: Switching to section: ${sectionName}`);

            // Update navigation state
            this.updateNavigationState(sectionName);

            // Hide current section
            this.hideCurrentSection();

            // Show new section
            this.showSection(sectionName);

            // Load section content using AccountPageLoader to prevent duplicates
            if (window.accountPageLoader) {
                await window.accountPageLoader.switchSection(sectionName);
            } else {
                // Fallback to local loading if AccountPageLoader not available
                await this.loadSection(sectionName);
            }

            // Update current section
            this.currentSection = sectionName;

            // Update browser history
            if (updateHistory) {
                const url = new URL(window.location);
                url.searchParams.set('section', sectionName);
                history.pushState({ section: sectionName }, '', url);
            }

            window.logger?.log(`✅ Account Layout: Switched to section: ${sectionName}`);

        } catch (error) {
            window.logger?.error('❌ Account Layout: Failed to switch section:', error);
            this.showError('Failed to switch section');
        }
    }

    /**
     * Update navigation button states
     * @param {string} activeSection - The currently active section
     */
    updateNavigationState(activeSection) {
        const navButtons = document.querySelectorAll('.account-layout__nav-button');
        navButtons.forEach(button => {
            const section = button.dataset.section;
            if (section === activeSection) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Hide the current section
     */
    hideCurrentSection() {
        const currentSectionElement = document.getElementById(`section-${this.currentSection}`);
        if (currentSectionElement) {
            currentSectionElement.classList.remove('active');
        }
    }

    /**
     * Show a section
     * @param {string} sectionName - The section to show
     */
    showSection(sectionName) {
        const sectionElement = document.getElementById(`section-${sectionName}`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
    }

    /**
     * Load section content and components
     * @param {string} sectionName - The section to load
     */
    async loadSection(sectionName) {
        try {
            if (this.loadedComponents.has(sectionName)) {
                return; // Already loaded
            }

            // Account Layout: Loading section

            // Add loading state
            const sectionElement = document.getElementById(`section-${sectionName}`);
            if (sectionElement) {
                sectionElement.classList.add('loading');
            }

            // Load section-specific component
            await this.loadSectionComponent(sectionName);

            // Mark as loaded
            this.loadedComponents.add(sectionName);

            // Remove loading state
            if (sectionElement) {
                sectionElement.classList.remove('loading');
            }

            // Account Layout: Section loaded

        } catch (error) {
            window.logger?.error(`❌ Account Layout: Failed to load section ${sectionName}:`, error);
            this.showError(`Failed to load ${sectionName} section`);
        }
    }

    /**
     * Load section-specific component
     * @param {string} sectionName - The section to load component for
     */
    async loadSectionComponent(sectionName) {
        const componentMap = {
            'profile': 'profile-management',
            'security': 'password-change', // Will load multiple security components
            'payment': 'payment-management',
            'apps': 'app-entitlements',
            'support': 'support-tickets',
            'notifications': 'notifications-preferences',
            'family': 'family-management',
            'actions': 'account-actions'
        };

        const componentName = componentMap[sectionName];
        if (!componentName) {
            window.logger?.warn(`⚠️ Account Layout: No component mapped for section: ${sectionName}`);
            return;
        }

        // Check if component exists before trying to load
        const componentExists = await this.componentExists(componentName);
        if (!componentExists) {
            // Component not yet implemented, showing placeholder
            this.showPlaceholder(sectionName);
            return;
        }

        // Load component using the component loader
        if (window.componentLoader) {
            const containerId = `#${sectionName}-content`;
            await window.componentLoader.load(componentName, {
                container: containerId,
                basePath: 'account/components'
            });
        } else {
            window.logger?.warn('⚠️ Account Layout: componentLoader not available');
            this.showPlaceholder(sectionName);
        }
    }

    /**
     * Check if a component exists
     * @param {string} componentName - Component name to check
     * @returns {boolean} Whether the component exists
     */
    async componentExists(componentName) {
        try {
            // All account page components are in account/components/
            const componentPath = `account/components/${componentName}`;
            const htmlPath = `/${componentPath}/${componentName}.html`;
            
            // Use a more robust check that doesn't log 404s to console
            const response = await fetch(htmlPath, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                window.logger?.log(`✅ Component exists: ${componentName}`);
                return true;
            } else {
                // Component not found
                return false;
            }
        } catch (error) {
            // Network errors or other issues
            window.logger?.log(`📝 Component check failed: ${componentName} (${error.message})`);
            return false;
        }
    }

    /**
     * Show placeholder content for unimplemented sections
     * @param {string} sectionName - Section name
     */
    showPlaceholder(sectionName) {
        const container = document.getElementById(`${sectionName}-content`);
        if (container) {
            const placeholder = container.querySelector('.account-layout__placeholder');
            if (placeholder) {
                // Clear existing content
                placeholder.innerHTML = '';
                
                // Create translatable placeholder content
                const placeholderDiv = document.createElement('div');
                placeholderDiv.style.cssText = 'text-align: center; padding: 2rem;';
                
                const title = document.createElement('h3');
                title.style.cssText = 'color: var(--color-text-primary); margin-bottom: 1rem;';
                title.className = 'translatable-content';
                title.setAttribute('data-translation-key', `${this.getSectionTitle(sectionName)} - Coming Soon`);
                title.textContent = `🚧 ${this.getSectionTitle(sectionName)} - Coming Soon`;
                
                const description = document.createElement('p');
                description.style.cssText = 'color: var(--color-text-primary);';
                description.className = 'translatable-content';
                description.setAttribute('data-translation-key', 'This section is currently under development.');
                description.textContent = 'This section is currently under development.';
                
                placeholderDiv.appendChild(title);
                placeholderDiv.appendChild(description);
                placeholder.appendChild(placeholderDiv);
                
                // Make content visible
                title.classList.add('loaded');
                description.classList.add('loaded');
            }
        }
    }

    /**
     * Get section title for placeholder
     * @param {string} sectionName - Section name
     * @returns {string} Section title
     */
    getSectionTitle(sectionName) {
        const titles = {
            'profile': 'Profile Management',
            'security': 'Security Settings',
            'payment': 'Payments & Billing',
            'apps': 'App Entitlements',
            'support': 'Support',
            'notifications': 'Notifications & Preferences',
            'family': 'Family Management',
            'actions': 'Account Actions'
        };
        return titles[sectionName] || sectionName;
    }


    /**
     * Wait for translations to be ready and then update
     */
    waitForTranslationsAndUpdate() {
        const checkTranslations = () => {
            if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                this.updateTranslations();
            } else if (window.translationReady) {
                this.updateTranslations();
            } else {
                setTimeout(checkTranslations, 100);
            }
        };
        
        // Start checking immediately
        checkTranslations();
    }

    /**
     * Update translations for the layout
     */
    updateTranslations() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            return;
        }

        const translatableElements = document.querySelectorAll('.account-layout .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && i18next.exists(key)) {
                element.textContent = i18next.t(key);
            }
            // Make translatable content visible
            element.classList.add('loaded');
        });
    }

    /**
     * Show translatable content (make it visible)
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.account-layout .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
            // Force visibility as fallback
            element.style.opacity = '1';
        });
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        if (window.accountPage?.showError) {
            window.accountPage.showError(message);
        } else {
            window.logger?.error('Account Layout Error:', message);
        }
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
        await this.loadSection(sectionName);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/account')) {
        // Only initialize if not already initialized by the component loader
        if (!window.accountLayout) {
            window.accountLayout = new AccountLayout();
            window.accountLayout.init();
        }
    }
});

// Export for use in other scripts
window.AccountLayout = AccountLayout;

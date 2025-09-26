/**
 * Account Layout Component
 * Manages the account page layout, section navigation, and component loading
 */

class AccountLayout {
    constructor() {
        this.currentSection = 'profile';
        this.isInitialized = false;
        this.sections = ['profile', 'security', 'subscription', 'apps', 'notifications', 'actions'];
        this.loadedComponents = new Set();
    }

    /**
     * Initialize the account layout component
     */
    async init() {
        try {
            console.log('🔄 Account Layout: Initializing...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
            } else {
                this.setupEventListeners();
            }
            
            // Load initial section
            await this.loadSection(this.currentSection);
            
            this.isInitialized = true;
            console.log('✅ Account Layout: Initialized successfully');
            
        } catch (error) {
            console.error('❌ Account Layout: Failed to initialize:', error);
            this.showError('Failed to initialize account layout');
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
            if (e.state && e.state.section) {
                this.switchSection(e.state.section, false);
            }
        });

        // Handle language changes
        window.addEventListener('languageChanged', () => {
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
                console.error('❌ Account Layout: Invalid section:', sectionName);
                return;
            }

            if (sectionName === this.currentSection) {
                return; // Already on this section
            }

            console.log(`🔄 Account Layout: Switching to section: ${sectionName}`);

            // Update navigation state
            this.updateNavigationState(sectionName);

            // Hide current section
            this.hideCurrentSection();

            // Show new section
            this.showSection(sectionName);

            // Load section content if not already loaded
            await this.loadSection(sectionName);

            // Update current section
            this.currentSection = sectionName;

            // Update browser history
            if (updateHistory) {
                const url = new URL(window.location);
                url.searchParams.set('section', sectionName);
                history.pushState({ section: sectionName }, '', url);
            }

            console.log(`✅ Account Layout: Switched to section: ${sectionName}`);

        } catch (error) {
            console.error('❌ Account Layout: Failed to switch section:', error);
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

            console.log(`🔄 Account Layout: Loading section: ${sectionName}`);

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

            console.log(`✅ Account Layout: Section loaded: ${sectionName}`);

        } catch (error) {
            console.error(`❌ Account Layout: Failed to load section ${sectionName}:`, error);
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
            'subscription': 'subscription-management',
            'apps': 'app-entitlements',
            'notifications': 'notifications-preferences',
            'actions': 'account-actions'
        };

        const componentName = componentMap[sectionName];
        if (!componentName) {
            console.warn(`⚠️ Account Layout: No component mapped for section: ${sectionName}`);
            return;
        }

        // Load component using the component loader
        if (window.componentLoader) {
            const containerId = `#${sectionName}-content`;
            await window.componentLoader.load(componentName, {
                container: containerId
            });
        } else {
            console.warn('⚠️ Account Layout: componentLoader not available');
        }
    }

    /**
     * Update translations for the layout
     */
    updateTranslations() {
        if (typeof i18next === 'undefined') {
            return;
        }

        const translatableElements = document.querySelectorAll('.account-layout .translatable-content');
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && i18next.exists(key)) {
                element.textContent = i18next.t(key);
            }
        });
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        if (window.accountPage && window.accountPage.showError) {
            window.accountPage.showError(message);
        } else {
            console.error('Account Layout Error:', message);
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
        window.accountLayout = new AccountLayout();
        window.accountLayout.init();
    }
});

// Export for use in other scripts
window.AccountLayout = AccountLayout;

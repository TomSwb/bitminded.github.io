/**
 * Account Page Component Loader
 * Handles loading account components on the account page
 */

class AccountPageLoader {
    constructor() {
        this.isInitialized = false;
        this.loadedComponents = new Map();
        this.currentSection = 'profile';
        this.sections = ['profile', 'family', 'security', 'payment', 'apps', 'support', 'notifications', 'actions'];
    }

    /**
     * Initialize the account page loader
     */
    async init() {
        if (this.isInitialized) {
            window.logger?.log('Account page loader already initialized');
            return;
        }

        // Initializing account page loader

        try {
            // Check authentication first
            await this.checkAuthentication();
            
            // Load account layout component
            await this.loadAccountLayout();
            
            // Check URL for initial section
            const urlParams = new URLSearchParams(window.location.search);
            const sectionParam = urlParams.get('section');
            const initialSection = sectionParam && this.sections.includes(sectionParam) ? sectionParam : 'profile';
            
            // Load initial section
            await this.loadSection(initialSection);
            
            // Update current section
            this.currentSection = initialSection;
            
            this.isInitialized = true;
            // Account page loader initialized successfully
            
            // Trigger language change event for loaded components
            this.triggerLanguageChange();
        } catch (error) {
            window.logger?.error('❌ Failed to initialize account page loader:', error);
            this.showError('Failed to initialize account page');
        }
    }

    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase client not available');
            }

            const { data: { user }, error } = await window.supabase.auth.getUser();
            
            if (error) {
                throw new Error('Authentication check failed');
            }

            if (!user) {
                window.logger?.log('🔄 User not authenticated, redirecting to auth page...');
                window.location.href = '/auth/';
                return;
            }

            // User authenticated
            return user;

        } catch (error) {
            window.logger?.error('❌ Authentication check failed:', error);
            this.showError('Authentication check failed');
            throw error;
        }
    }

    /**
     * Load the account layout component
     */
    async loadAccountLayout() {
        try {
            // Loading account layout component
            
            if (window.componentLoader) {
                await window.componentLoader.load('account-layout', {
                    container: '#account-layout-container'
                });
                // Account layout component loaded successfully
            } else {
                throw new Error('ComponentLoader not available');
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to load account layout:', error);
            this.showError('Failed to load account layout');
            throw error;
        }
    }

    /**
     * Load a specific section component
     * @param {string} sectionName - The section to load
     */
    async loadSection(sectionName) {
        try {
            if (this.loadedComponents.has(sectionName)) {
                window.logger?.log(`Section ${sectionName} already loaded`);
                return;
            }

            // Loading section

            const componentMap = {
                'profile': 'profile-management',
                'security': 'security-management', // Security management container
                'payment': 'payment-management',
                'apps': 'app-entitlements',
                'support': 'support-tickets',
                'notifications': 'notifications-preferences',
                'family': 'family-management',
                'actions': 'account-actions'
            };

            const componentName = componentMap[sectionName];
            if (!componentName) {
                window.logger?.warn(`⚠️ No component mapped for section: ${sectionName}`);
                return;
            }

            // Check if component exists before trying to load
            const componentExists = await this.componentExists(componentName);
            if (!componentExists) {
                // Component not yet implemented, showing placeholder
                this.showPlaceholder(sectionName);
                this.loadedComponents.set(sectionName, true);
                return;
            }

            // Load component using the component loader
            if (window.componentLoader) {
                const containerId = `#${sectionName}-content`;
                await window.componentLoader.load(componentName, {
                    container: containerId,
                    basePath: 'account/components'
                });
                
                // Mark as loaded
                this.loadedComponents.set(sectionName, true);
                // Section loaded
            } else {
                throw new Error('ComponentLoader not available');
            }
            
        } catch (error) {
            window.logger?.error(`❌ Failed to load section ${sectionName}:`, error);
            this.showPlaceholder(sectionName);
            this.loadedComponents.set(sectionName, true);
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
                // Component exists
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
     * Switch to a different section
     * @param {string} sectionName - The section to switch to
     */
    async switchSection(sectionName) {
        try {
            if (sectionName === this.currentSection) {
                return; // Already on this section
            }

            // Switching section

            // Load section if not already loaded
            await this.loadSection(sectionName);

            // Update current section
            this.currentSection = sectionName;
            
            // Update account layout current section if available
            if (window.accountLayout) {
                window.accountLayout.currentSection = sectionName;
            }

            // Switched section

        } catch (error) {
            window.logger?.error(`❌ Failed to switch to section ${sectionName}:`, error);
            this.showError(`Failed to switch to ${sectionName} section`);
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

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        if (window.accountPage?.showError) {
            window.accountPage.showError(message);
        } else {
            window.logger?.error('Account Page Loader Error:', message);
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess(message) {
        if (window.accountPage?.showSuccess) {
            window.accountPage.showSuccess(message);
        } else {
            window.logger?.log('Account Page Loader Success:', message);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (window.accountPage?.hideError) {
            window.accountPage.hideError();
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        if (window.accountPage?.hideSuccess) {
            window.accountPage.hideSuccess();
        }
    }

    /**
     * Trigger language change event for loaded components
     */
    triggerLanguageChange() {
        const currentLanguage = localStorage.getItem('language') || 'en';
        const languageChangedEvent = new CustomEvent('languageChanged', {
            detail: { language: currentLanguage }
        });
        window.dispatchEvent(languageChangedEvent);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/account')) {
        window.accountPageLoader = new AccountPageLoader();
        window.accountPageLoader.init();
    }
});

// Export for use in other scripts
window.AccountPageLoader = AccountPageLoader;

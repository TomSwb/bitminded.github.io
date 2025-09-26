/**
 * Account Page Component Loader
 * Handles loading account components on the account page
 */

class AccountPageLoader {
    constructor() {
        this.isInitialized = false;
        this.loadedComponents = new Map();
        this.currentSection = 'profile';
    }

    /**
     * Initialize the account page loader
     */
    async init() {
        if (this.isInitialized) {
            console.log('Account page loader already initialized');
            return;
        }

        console.log('🔄 Initializing account page loader...');

        try {
            // Check authentication first
            await this.checkAuthentication();
            
            // Load account layout component
            await this.loadAccountLayout();
            
            // Load initial section (profile)
            await this.loadSection('profile');
            
            this.isInitialized = true;
            console.log('✅ Account page loader initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize account page loader:', error);
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
                console.log('🔄 User not authenticated, redirecting to auth page...');
                window.location.href = '/auth/';
                return;
            }

            console.log('✅ User authenticated:', user.email);
            return user;

        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            this.showError('Authentication check failed');
            throw error;
        }
    }

    /**
     * Load the account layout component
     */
    async loadAccountLayout() {
        try {
            console.log('🔄 Loading account layout component...');
            
            if (window.componentLoader) {
                await window.componentLoader.load('account-layout', {
                    container: '#account-layout-container'
                });
                console.log('✅ Account layout component loaded successfully');
            } else {
                throw new Error('ComponentLoader not available');
            }
            
        } catch (error) {
            console.error('❌ Failed to load account layout:', error);
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
                console.log(`Section ${sectionName} already loaded`);
                return;
            }

            console.log(`🔄 Loading section: ${sectionName}`);

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
                console.warn(`⚠️ No component mapped for section: ${sectionName}`);
                return;
            }

            // Check if component exists before trying to load
            if (!await this.componentExists(componentName)) {
                console.log(`📝 Component ${componentName} not yet implemented, showing placeholder`);
                this.showPlaceholder(sectionName);
                this.loadedComponents.set(sectionName, true);
                return;
            }

            // Load component using the component loader
            if (window.componentLoader) {
                const containerId = `#${sectionName}-content`;
                await window.componentLoader.load(componentName, {
                    container: containerId
                });
                
                // Mark as loaded
                this.loadedComponents.set(sectionName, true);
                console.log(`✅ Section loaded: ${sectionName}`);
            } else {
                throw new Error('ComponentLoader not available');
            }
            
        } catch (error) {
            console.error(`❌ Failed to load section ${sectionName}:`, error);
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
                console.log(`✅ Component exists: ${componentName}`);
                return true;
            } else {
                console.log(`📝 Component not found: ${componentName} (${response.status})`);
                return false;
            }
        } catch (error) {
            // Network errors or other issues
            console.log(`📝 Component check failed: ${componentName} (${error.message})`);
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
                placeholder.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h3 style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                            🚧 ${this.getSectionTitle(sectionName)} - Coming Soon
                        </h3>
                        <p style="color: var(--color-text-secondary);">
                            This section is currently under development.
                        </p>
                    </div>
                `;
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
            'subscription': 'Subscription & Billing',
            'apps': 'App Entitlements',
            'notifications': 'Notifications & Preferences',
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

            console.log(`🔄 Switching to section: ${sectionName}`);

            // Load section if not already loaded
            await this.loadSection(sectionName);

            // Update current section
            this.currentSection = sectionName;

            console.log(`✅ Switched to section: ${sectionName}`);

        } catch (error) {
            console.error(`❌ Failed to switch to section ${sectionName}:`, error);
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
        if (window.accountPage && window.accountPage.showError) {
            window.accountPage.showError(message);
        } else {
            console.error('Account Page Loader Error:', message);
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess(message) {
        if (window.accountPage && window.accountPage.showSuccess) {
            window.accountPage.showSuccess(message);
        } else {
            console.log('Account Page Loader Success:', message);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (window.accountPage && window.accountPage.hideError) {
            window.accountPage.hideError();
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        if (window.accountPage && window.accountPage.hideSuccess) {
            window.accountPage.hideSuccess();
        }
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

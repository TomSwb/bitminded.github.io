/**
 * Account Actions Component
 * Main component for managing account-level actions
 */
if (typeof window.AccountActions === 'undefined') {
class AccountActions {
    constructor() {
        this.container = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Account Actions component
     */
    async init() {
        if (this.isInitialized) {
            console.log('Account Actions: Already initialized');
            return;
        }

        try {
            // Initializing

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            this.isInitialized = true;
            // Initialized

        } catch (error) {
            console.error('❌ Account Actions: Failed to initialize:', error);
            this.showError('Failed to initialize account actions');
        }
    }

    /**
     * Setup component elements and event listeners
     */
    async setupComponent() {
        this.container = document.getElementById('account-actions');
        if (!this.container) {
            console.error('Account Actions container not found');
            return;
        }

        // Initialize translations
        await this.initializeTranslations();

        // Load sub-components
        await this.loadSubComponents();

        // Update translations after UI is ready
        this.updateTranslations();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.accountActionsTranslations) {
                await window.accountActionsTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize account actions translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.accountActionsTranslations) {
            window.accountActionsTranslations.updateTranslations();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });
    }

    /**
     * Load all sub-components
     */
    async loadSubComponents() {
        const components = [
            { name: 'export-data', container: 'export-data-container' },
            { name: 'delete-account', container: 'delete-account-container' },
            { name: 'active-sessions', container: 'active-sessions-container' }
        ];

        for (const component of components) {
            await this.loadComponent(component.name, component.container);
        }
    }

    /**
     * Load a single sub-component
     */
    async loadComponent(componentName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        try {
            // Load component HTML
            const response = await fetch(`/account/components/account-actions/${componentName}/${componentName}.html`);
            if (!response.ok) throw new Error(`Failed to load ${componentName} component`);
            
            const html = await response.text();
            container.innerHTML = html;

            // Load component CSS
            if (!document.querySelector(`link[href*="${componentName}.css"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = `/account/components/account-actions/${componentName}/${componentName}.css`;
                document.head.appendChild(link);
            }

            // Load component based on type
            if (componentName === 'export-data' || componentName === 'delete-account' || componentName === 'active-sessions') {
                // These components have their own translation system
                this.loadComponentWithTranslations(componentName);
            } else {
                // Other components don't have translations yet
                this.loadComponentScript(componentName);
            }

        } catch (error) {
            console.error(`Error loading ${componentName} component:`, error);
            container.innerHTML = `<p class="component-error">Failed to load ${componentName} component</p>`;
        }
    }

    /**
     * Load component with translations
     */
    loadComponentWithTranslations(componentName) {
        // Load translations first
        const translationScript = document.createElement('script');
        translationScript.src = `/account/components/account-actions/${componentName}/${componentName}-translations.js`;
        translationScript.onload = () => {
            // Then load component script
            const componentScript = document.createElement('script');
            componentScript.src = `/account/components/account-actions/${componentName}/${componentName}.js`;
            componentScript.onload = () => {
                // Initialize component
                setTimeout(() => {
                    const className = this.toPascalCase(componentName);
                    const instanceName = this.toCamelCase(componentName);
                    
                    if (window[className] && !window[instanceName]) {
                        window[instanceName] = new window[className]();
                    }
                    if (window[instanceName]) {
                        window[instanceName].init();
                    }
                }, 50);
            };
            document.body.appendChild(componentScript);
        };
        document.head.appendChild(translationScript);
    }

    /**
     * Load component script without translations
     */
    loadComponentScript(componentName) {
        const script = document.createElement('script');
        script.src = `/account/components/account-actions/${componentName}/${componentName}.js`;
        script.onload = () => {
            // Initialize component if it has an init function
            const initFunctionName = this.toCamelCase(`init-${componentName}`);
            if (typeof window[initFunctionName] === 'function') {
                window[initFunctionName]();
            }
        };
        document.body.appendChild(script);
    }

    /**
     * Convert kebab-case to camelCase
     */
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * Convert kebab-case to PascalCase
     */
    toPascalCase(str) {
        const camelCase = this.toCamelCase(str);
        return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('account-actions-error');
        const errorMessage = document.getElementById('account-actions-error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successDiv = document.getElementById('account-actions-success');
        const successMessage = document.getElementById('account-actions-success-message');
        
        if (successDiv && successMessage) {
            successMessage.textContent = message;
            successDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                successDiv.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingDiv = document.getElementById('account-actions-loading');
        if (loadingDiv) {
            loadingDiv.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingDiv = document.getElementById('account-actions-loading');
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }
}

// Export to window
window.AccountActions = AccountActions;
}

// Note: Initialization is handled by the component loader
// which loads translations first, then initializes the component

/**
 * Component Loader Utility
 * Handles loading and managing components across the website
 */
class ComponentLoader {
    constructor() {
        this.loadedComponents = new Map();
        this.componentStyles = new Set();
    }

    /**
     * Load a component into the page
     * @param {string} componentName - Name of the component to load
     * @param {Object} options - Loading options
     * @param {string} options.container - Container selector
     * @param {string} options.priority - Loading priority (critical, high, medium, low)
     * @param {Object} options.config - Component-specific configuration
     */
    async load(componentName, options = {}) {
        const defaultOptions = {
            container: 'body',
            priority: 'medium',
            config: {}
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            // Check if component is already loaded
            if (this.loadedComponents.has(componentName)) {
                console.log(`Component ${componentName} already loaded`);
                return this.loadedComponents.get(componentName);
            }

            console.log(`🔄 Loading component: ${componentName}`);

            // Load component files
            const component = await this.loadComponentFiles(componentName, finalOptions);

            // Store loaded component
            this.loadedComponents.set(componentName, component);

            console.log(`✅ Component ${componentName} loaded successfully`);
            return component;

        } catch (error) {
            console.error(`❌ Failed to load component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Load component files (HTML, CSS, JS)
     * @param {string} componentName - Component name
     * @param {Object} options - Loading options
     */
    async loadComponentFiles(componentName, options) {
        // Use absolute path from root, not relative to current page
        const componentPath = `components/${componentName}`;
        
        // Load CSS
        await this.loadComponentCSS(componentPath, componentName);
        
        // Load HTML and inject
        const htmlContent = await this.loadComponentHTML(componentPath);
        const container = document.querySelector(options.container);
        
        if (!container) {
            throw new Error(`Container not found: ${options.container}`);
        }

        // Create temporary element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const componentElement = tempDiv.firstElementChild;

        // Inject into container
        container.appendChild(componentElement);

        // Load and execute JavaScript
        await this.loadComponentJS(componentPath, componentName, options.config);

        return {
            element: componentElement,
            name: componentName,
            options: options
        };
    }

    /**
     * Load component CSS
     * @param {string} componentPath - Path to component
     * @param {string} componentName - Component name
     */
    async loadComponentCSS(componentPath, componentName) {
        // Use absolute path from root
        const cssPath = `/${componentPath}/${componentName}.css`;
        
        // Check if styles already loaded
        if (this.componentStyles.has(cssPath)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.onload = () => {
                this.componentStyles.add(cssPath);
                resolve();
            };
            link.onerror = () => {
                console.warn(`CSS not found for component: ${cssPath}`);
                resolve(); // Don't fail if CSS is missing
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Load component HTML
     * @param {string} componentPath - Path to component
     */
    async loadComponentHTML(componentPath) {
        // Use absolute path from root
        const htmlPath = `/${componentPath}/${componentPath.split('/').pop()}.html`;
        
        try {
            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Failed to load HTML for ${componentPath}:`, error);
            throw error;
        }
    }

    /**
     * Load component JavaScript
     * @param {string} componentPath - Path to component
     * @param {string} componentName - Component name
     * @param {Object} config - Component configuration
     */
    async loadComponentJS(componentPath, componentName, config) {
        // Use absolute path from root
        const jsPath = `/${componentPath}/${componentName}.js`;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = jsPath;
            script.onload = () => {
                // Initialize component if it has an init method
                if (window[componentName] && typeof window[componentName].init === 'function') {
                    window[componentName].init(config);
                } else if (componentName === 'loading-screen' && window.loadingScreen) {
                    // Special handling for loading-screen component
                    window.loadingScreen.init(config);
                } else if (componentName === 'language-switcher' && window.languageSwitcher) {
                    // Special handling for language-switcher component
                    window.languageSwitcher.init(config);
                }
                resolve();
            };
            script.onerror = () => {
                console.warn(`JavaScript not found for component: ${jsPath}`);
                resolve(); // Don't fail if JS is missing
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Unload a component
     * @param {string} componentName - Component name to unload
     */
    unload(componentName) {
        const component = this.loadedComponents.get(componentName);
        if (component) {
            // Remove element from DOM
            if (component.element && component.element.parentNode) {
                component.element.parentNode.removeChild(component.element);
            }

            // Call destroy method if available
            if (window[componentName]?.destroy) {
                window[componentName].destroy();
            }

            // Remove from loaded components
            this.loadedComponents.delete(componentName);
            console.log(`🗑️ Component ${componentName} unloaded`);
        }
    }

    /**
     * Get loaded component
     * @param {string} componentName - Component name
     */
    getComponent(componentName) {
        return this.loadedComponents.get(componentName);
    }

    /**
     * Check if component is loaded
     * @param {string} componentName - Component name
     */
    isLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }

    /**
     * Get all loaded components
     */
    getLoadedComponents() {
        return Array.from(this.loadedComponents.keys());
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

// Auto-load critical components when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Auto-load loading screen component (critical for all pages)
    try {
        await componentLoader.load('loading-screen', {
            container: 'body',
            priority: 'critical'
        });
        console.log('✅ Critical components auto-loaded');
    } catch (error) {
        console.error('❌ Failed to auto-load critical components:', error);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}

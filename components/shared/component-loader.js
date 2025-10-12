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

            // Component loading in progress

            // Load component files
            const component = await this.loadComponentFiles(componentName, finalOptions);

            // Store loaded component
            this.loadedComponents.set(componentName, component);

            // Component loaded successfully
            return component;

        } catch (error) {
            console.error(`❌ ComponentLoader: Failed to load component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Load profile management sub-components
     */
    async loadProfileManagementSubComponents() {
        const subComponents = [
            'avatar-upload',
            'username-edit', 
            'email-change'
        ];

        const loadPromises = subComponents.map(componentName => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = `/account/components/profile-management/${componentName}/${componentName}.js`;
                script.onload = () => {
                    console.log(`✅ Loaded sub-component: ${componentName}`);
                    resolve();
                };
                script.onerror = () => {
                    console.warn(`⚠️ Failed to load sub-component: ${componentName}`);
                    resolve(); // Don't fail if one sub-component is missing
                };
                document.head.appendChild(script);
            });
        });

        await Promise.all(loadPromises);
        console.log('✅ All profile management sub-components loaded');
    }

    /**
     * Load component files (HTML, CSS, JS)
     * @param {string} componentName - Component name
     * @param {Object} options - Loading options
     */
    async loadComponentFiles(componentName, options) {
        // Determine component path based on component name and options
        let componentPath;
        
        // Check if basePath is specified in options (for account components)
        if (options.basePath) {
            componentPath = `${options.basePath}/${componentName}`;
        } else if (componentName.startsWith('account-')) {
            // Account-specific components
            componentPath = `account/components/${componentName}`;
        } else {
            // Regular components
            componentPath = `components/${componentName}`;
        }
        
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
                } else if (componentName === 'navigation-menu' && window.navigationMenu) {
                    // Special handling for navigation-menu component
                    window.navigationMenu.init(config);
                } else if (componentName === 'theme-switcher' && window.themeSwitcher) {
                    // Special handling for theme-switcher component
                    window.themeSwitcher.init(config);
                } else if (componentName === 'account-layout') {
                    // Special handling for account-layout component
                    if (window.AccountLayout && !window.accountLayout) {
                        window.accountLayout = new window.AccountLayout();
                    }
                    if (window.accountLayout) {
                        window.accountLayout.init(config);
                    }
                } else if (componentName === 'profile-management') {
                    // Load profile management translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/profile-management/profile-management-translations.js';
                    translationScript.onload = () => {
                        // Load sub-components for profile management
                        this.loadProfileManagementSubComponents().then(() => {
                            // Initialize profile management component after translations and sub-components are loaded
                            if (window.ProfileManagement && !window.profileManagement) {
                                window.profileManagement = new window.ProfileManagement();
                            }
                            if (window.profileManagement) {
                                window.profileManagement.init(config);
                            }
                        });
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === 'security-management') {
                    // Load security management translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/security-management/security-management-translations.js';
                    translationScript.onload = () => {
                        // Initialize security management component after translations are loaded
                        if (window.SecurityManagement && !window.securityManagement) {
                            window.securityManagement = new window.SecurityManagement();
                        }
                        if (window.securityManagement) {
                            window.securityManagement.init(config);
                        }
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === 'password-change') {
                    // Load password change translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/security-management/password-change/password-change-translations.js';
                    translationScript.onload = () => {
                        // Wait for DOM to be ready before initializing password change component
                        const initPasswordChange = () => {
                            if (window.PasswordChange && !window.passwordChange) {
                                window.passwordChange = new window.PasswordChange();
                            }
                            if (window.passwordChange) {
                                window.passwordChange.init(config);
                            }
                        };
                        
                        // Use setTimeout to ensure HTML is fully parsed
                        setTimeout(initPasswordChange, 50);
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === '2fa') {
                    // Load 2FA translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/security-management/2fa/2fa-translations.js';
                    translationScript.onload = () => {
                        // Wait for DOM to be ready before initializing 2FA component
                        const init2FA = () => {
                            if (window.TwoFactorAuth && !window.twoFactorAuth) {
                                window.twoFactorAuth = new window.TwoFactorAuth();
                            }
                            if (window.twoFactorAuth) {
                                window.twoFactorAuth.init(config);
                            }
                        };
                        
                        // Use setTimeout to ensure HTML is fully parsed
                        setTimeout(init2FA, 50);
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === 'login-activity') {
                    // Load login activity translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/security-management/login-activity/login-activity-translations.js';
                    translationScript.onload = () => {
                        // Wait for DOM to be ready before initializing login activity component
                        const initLoginActivity = () => {
                            if (window.LoginActivity && !window.loginActivity) {
                                window.loginActivity = new window.LoginActivity();
                            }
                            if (window.loginActivity) {
                                window.loginActivity.init(config);
                            }
                        };
                        
                        // Use setTimeout to ensure HTML is fully parsed
                        setTimeout(initLoginActivity, 50);
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === 'notifications-preferences') {
                    // Load notifications preferences translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/account/components/notifications-preferences/notifications-preferences-translations.js';
                    translationScript.onload = () => {
                        // Wait for DOM to be ready before initializing notifications preferences component
                        const initNotificationsPreferences = () => {
                            if (window.NotificationsPreferences && !window.notificationsPreferences) {
                                window.notificationsPreferences = new window.NotificationsPreferences();
                            }
                            if (window.notificationsPreferences) {
                                window.notificationsPreferences.init(config);
                            }
                        };
                        
                        // Use setTimeout to ensure HTML is fully parsed
                        setTimeout(initNotificationsPreferences, 50);
                    };
                    document.head.appendChild(translationScript);
                } else if (componentName === 'notification-center') {
                    // Load notification center translations first
                    const translationScript = document.createElement('script');
                    translationScript.src = '/components/notification-center/notification-center-translations.js';
                    translationScript.onload = () => {
                        // Wait for DOM to be ready before initializing notification center
                        const initNotificationCenter = () => {
                            if (window.NotificationCenter && window.notificationCenter) {
                                window.notificationCenter.init(config);
                            }
                        };
                        
                        // Use setTimeout to ensure HTML is fully parsed
                        setTimeout(initNotificationCenter, 50);
                    };
                    document.head.appendChild(translationScript);
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
        // Critical components auto-loaded
    } catch (error) {
        console.error('❌ Failed to auto-load critical components:', error);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}

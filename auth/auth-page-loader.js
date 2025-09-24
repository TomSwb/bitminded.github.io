/**
 * Auth Page Component Loader
 * Handles loading authentication components on the auth page
 */

class AuthPageLoader {
    constructor() {
        this.isInitialized = false;
        this.loadedComponents = new Map();
    }

    /**
     * Initialize the auth page loader
     */
    async init() {
        if (this.isInitialized) {
            console.log('Auth page loader already initialized');
            return;
        }

        console.log('🔄 Initializing auth page loader...');

        try {
            // Load auth toggle first
            await this.loadAuthToggle();
            
            // Determine which form to show based on URL parameters or referrer
            const authAction = this.detectAuthAction();
            
            if (authAction === 'login') {
                await this.loadLoginForm();
            } else {
                // Default to signup form
                await this.loadSignupForm();
            }
            
            // Auth toggle will now handle its own initialization based on URL parameters
            // No need to manually sync since it reads the URL during initialization
            
            this.isInitialized = true;
            console.log('✅ Auth page loader initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize auth page loader:', error);
        }
    }

    /**
     * Detect which auth action was clicked
     * @returns {string} 'login' or 'signup'
     */
    detectAuthAction() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        console.log(`🔍 Detecting auth action. URL params: ${window.location.search}, action: ${action}`);
        
        if (action === 'login' || action === 'signup') {
            console.log(`✅ Auth action detected from URL: ${action}`);
            return action;
        }

        // Check if we can detect from referrer (less reliable)
        if (document.referrer) {
            const referrer = new URL(document.referrer);
            if (referrer.pathname === '/' || referrer.pathname === '/index.html') {
                // If coming from home page, default to signup
                console.log('Auth action: defaulting to signup (from home page)');
                return 'signup';
            }
        }

        // Default to signup
        console.log('Auth action: defaulting to signup');
        return 'signup';
    }

    /**
     * Load auth toggle component
     */
    async loadAuthToggle() {
        try {
            console.log('🔄 Loading auth toggle component...');

            // Load HTML
            const htmlResponse = await fetch('components/auth-toggle/auth-toggle.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load auth toggle HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/auth-toggle/auth-toggle.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load auth toggle CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'auth-toggle');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('auth-toggle-container');
            if (container) {
                container.innerHTML = htmlContent;
                console.log('✅ Auth toggle HTML loaded');
            } else {
                throw new Error('Auth toggle container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/auth-toggle/auth-toggle.js';
            scriptElement.setAttribute('data-component', 'auth-toggle');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            this.loadedComponents.set('auth-toggle', true);
            console.log('✅ Auth toggle component loaded successfully');
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load auth toggle component:', error);
            throw error;
        }
    }

    /**
     * Load signup form component
     */
    async loadSignupForm() {
        try {
            console.log('🔄 Loading signup form component...');

            // Load HTML
            const htmlResponse = await fetch('components/signup-form/signup-form.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load signup form HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/signup-form/signup-form.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load signup form CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'signup-form');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('signup-form-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
                console.log('✅ Signup form HTML loaded');
            } else {
                throw new Error('Signup form container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/signup-form/signup-form.js';
            scriptElement.setAttribute('data-component', 'signup-form');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            this.loadedComponents.set('signup-form', true);
            console.log('✅ Signup form component loaded successfully');
            
            // Trigger language change event for the loaded component
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load signup form component:', error);
            throw error;
        }
    }

    /**
     * Load login form component
     */
    async loadLoginForm() {
        try {
            console.log('🔄 Loading login form component...');

            // Load HTML
            const htmlResponse = await fetch('components/login-form/login-form.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load login form HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/login-form/login-form.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load login form CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'login-form');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('login-form-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
                console.log('✅ Login form HTML loaded');
            } else {
                throw new Error('Login form container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/login-form/login-form.js';
            scriptElement.setAttribute('data-component', 'login-form');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            this.loadedComponents.set('login-form', true);
            console.log('✅ Login form component loaded successfully');
            
            // Trigger language change event for the loaded component
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load login form component:', error);
            throw error;
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
        console.log(`🔄 Triggered language change event for: ${currentLanguage}`);
    }

    /**
     * Switch to signup form
     */
    async showSignupForm() {
        // Hide login form
        const loginContainer = document.getElementById('login-form-container');
        if (loginContainer) {
            loginContainer.classList.add('hidden');
        }

        // Show signup form
        const signupContainer = document.getElementById('signup-form-container');
        if (signupContainer) {
            signupContainer.classList.remove('hidden');
            
            // Load signup form if not already loaded
            if (!this.loadedComponents.has('signup-form')) {
                await this.loadSignupForm();
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('signup');
            console.log('🔄 Auth toggle updated to signup mode');
        }
    }

    /**
     * Switch to login form
     */
    async showLoginForm() {
        // Hide signup form
        const signupContainer = document.getElementById('signup-form-container');
        if (signupContainer) {
            signupContainer.classList.add('hidden');
        }

        // Show login form
        const loginContainer = document.getElementById('login-form-container');
        if (loginContainer) {
            loginContainer.classList.remove('hidden');
            
            // Load login form if not already loaded
            if (!this.loadedComponents.has('login-form')) {
                await this.loadLoginForm();
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('login');
            console.log('🔄 Auth toggle updated to login mode');
        }
    }
}

// Create global instance
window.authPageLoader = new AuthPageLoader();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.authPageLoader && !window.authPageLoader.isInitialized) {
            window.authPageLoader.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthPageLoader;
}

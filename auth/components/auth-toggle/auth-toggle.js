/**
 * Auth Toggle Component
 * Handles switching between login and signup forms
 */
class AuthToggle {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.currentMode = null; // Will be determined based on URL or page state
        
        this.init();
    }

    /**
     * Initialize the auth toggle component
     */
    async init() {
        try {
            this.cacheElements();
            this.determineInitialMode();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            // Auth Toggle initialized silently
        } catch (error) {
            console.error('❌ Failed to initialize Auth Toggle:', error);
        }
    }

    /**
     * Determine the initial mode based on URL parameters
     */
    determineInitialMode() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'login' || action === 'signup' || action === 'forgot-password' || action === 'reset-password') {
            this.currentMode = action;
        } else {
            // Default to signup if no action specified
            this.currentMode = 'signup';
        }
        
        // Update button states immediately based on determined mode
        this.updateButtonStates();
    }

    /**
     * Update button states based on current mode
     */
    updateButtonStates() {
        if (!this.elements.loginButton || !this.elements.signupButton) {
            console.warn('Auth toggle buttons not found, cannot update states');
            return;
        }
        
        this.elements.loginButton.classList.toggle('auth-toggle__button--active', this.currentMode === 'login');
        this.elements.signupButton.classList.toggle('auth-toggle__button--active', this.currentMode === 'signup');
        
        // Hide toggle buttons when in forgot-password or reset-password mode
        const toggleContainer = document.querySelector('.auth-toggle');
        if (toggleContainer) {
            toggleContainer.style.display = (this.currentMode === 'forgot-password' || this.currentMode === 'reset-password') ? 'none' : 'block';
        }
        
        // Notify universal submit button of mode change
        const modeChangedEvent = new CustomEvent('authModeChanged', {
            detail: { mode: this.currentMode }
        });
        window.dispatchEvent(modeChangedEvent);
        
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('auth-toggle'),
            loginButton: document.getElementById('auth-toggle-login'),
            signupButton: document.getElementById('auth-toggle-signup')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.container) return;

        // Login button click
        this.elements.loginButton.addEventListener('click', () => {
            this.setMode('login');
        });

        // Signup button click
        this.elements.signupButton.addEventListener('click', () => {
            this.setMode('signup');
        });

        // Listen for language changes
        window.addEventListener('languageChanged', async (e) => {
            // If translations aren't loaded yet, load them first
            if (!this.translations) {
                await this.loadTranslations();
            }
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('components/auth-toggle/locales/auth-toggle-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
            } else {
                console.warn('Failed to load auth toggle translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load auth toggle translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update all translatable elements
            const translatableElements = this.elements.container.querySelectorAll('[data-translate]');
            
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });
        } else {
            console.warn('❌ No translations found for language:', language);
        }

        // Show translatable content
        this.showTranslatableContent();
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = this.elements.container.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Get current language from language switcher or localStorage
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        if (window.languageSwitcher) {
            return window.languageSwitcher.getCurrentLanguage();
        }
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Set the current mode (login, signup, or forgot-password)
     * @param {string} mode - 'login', 'signup', 'forgot-password', or 'reset-password'
     */
    setMode(mode) {
        if (mode === this.currentMode) {
            return;
        }

        // Update current mode
        this.currentMode = mode;
        
        // Update button states using the centralized method
        this.updateButtonStates();

        // Switch forms using auth page loader
        if (window.authPageLoader) {
            if (mode === 'login') {
                window.authPageLoader.showLoginForm();
            } else if (mode === 'signup') {
                window.authPageLoader.showSignupForm();
            }
            // Don't switch forms for forgot-password or reset-password mode - they're handled by authFormSwitch event
        }

        // Dispatch custom event for other components
        const modeChangedEvent = new CustomEvent('authModeChanged', {
            detail: { mode: mode }
        });
        window.dispatchEvent(modeChangedEvent);

    }

    /**
     * Get current mode
     * @returns {string} Current mode ('login', 'signup', 'forgot-password', or 'reset-password')
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Initialize with a specific mode
     * @param {string} mode - 'login', 'signup', 'forgot-password', or 'reset-password'
     */
    initializeWithMode(mode) {
        this.setMode(mode);
    }

    /**
     * Sync toggle state with the currently displayed form
     * This should be called by the auth page loader after it determines which form to show
     */
    syncWithDisplayedForm() {
        // Check which form container is currently visible
        const loginContainer = document.getElementById('login-form-container');
        const signupContainer = document.getElementById('signup-form-container');
        
        if (loginContainer && !loginContainer.classList.contains('hidden')) {
            // Login form is visible
            this.setMode('login');
        } else if (signupContainer && !signupContainer.classList.contains('hidden')) {
            // Signup form is visible
            this.setMode('signup');
        }
        // If neither is visible or both are hidden, keep current mode
    }
}

// Create global instance
window.authToggle = new AuthToggle();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.authToggle && !window.authToggle.isInitialized) {
            window.authToggle.init();
        }
    }, 200);
});

// Also try to initialize when the script loads (in case DOM is already ready)
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already ready, initialize immediately
    setTimeout(() => {
        if (window.authToggle && !window.authToggle.isInitialized) {
            window.authToggle.init();
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthToggle;
}

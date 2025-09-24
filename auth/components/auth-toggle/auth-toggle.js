/**
 * Auth Toggle Component
 * Handles switching between login and signup forms
 */
class AuthToggle {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        this.currentMode = 'login'; // Default to login
        
        this.init();
    }

    /**
     * Initialize the auth toggle component
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            console.log('✅ Auth Toggle initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Auth Toggle:', error);
        }
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
            console.log('🔄 Loading auth toggle translations...');
            const response = await fetch('components/auth-toggle/locales/auth-toggle-locales.json');
            console.log('📁 Auth toggle translations response:', response.status, response.ok);
            
            if (response.ok) {
                this.translations = await response.json();
                console.log('📚 Auth toggle translations loaded:', this.translations);
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Auth toggle translations loaded');
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
        console.log('🔄 Updating auth toggle translations for language:', language);
        console.log('📚 Available translations:', this.translations);
        
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            console.log('🎯 Translation object for', language, ':', t);
            
            // Update all translatable elements
            const translatableElements = this.elements.container.querySelectorAll('[data-translate]');
            console.log('🔍 Found translatable elements:', translatableElements.length);
            
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                console.log(`🔤 Updating ${key}: "${translatedText}"`);
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
     * Set the current mode (login or signup)
     * @param {string} mode - 'login' or 'signup'
     */
    setMode(mode) {
        if (mode === this.currentMode) return;

        console.log(`🔄 Switching auth mode from ${this.currentMode} to ${mode}`);

        // Update button states
        this.elements.loginButton.classList.toggle('auth-toggle__button--active', mode === 'login');
        this.elements.signupButton.classList.toggle('auth-toggle__button--active', mode === 'signup');

        // Update current mode
        this.currentMode = mode;

        // Switch forms using auth page loader
        if (window.authPageLoader) {
            if (mode === 'login') {
                window.authPageLoader.showLoginForm();
            } else {
                window.authPageLoader.showSignupForm();
            }
        }

        // Dispatch custom event for other components
        const modeChangedEvent = new CustomEvent('authModeChanged', {
            detail: { mode: mode }
        });
        window.dispatchEvent(modeChangedEvent);

        console.log(`✅ Auth mode switched to: ${mode}`);
    }

    /**
     * Get current mode
     * @returns {string} Current mode ('login' or 'signup')
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Initialize with a specific mode
     * @param {string} mode - 'login' or 'signup'
     */
    initializeWithMode(mode) {
        this.setMode(mode);
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

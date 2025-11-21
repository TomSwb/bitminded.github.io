/**
 * Login Activity Translation System
 * Handles loading and updating translations for login activity component
 */
class LoginActivityTranslations {
    constructor() {
        this.isInitialized = false;
        this.translations = {};
    }

    /**
     * Initialize the translation system
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initializing translations
            
            // Load translation files
            await this.loadTranslations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            // Translations initialized
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize login activity translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/account/components/security-management/login-activity/locales/login-activity-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            // Translations loaded
            
        } catch (error) {
            window.logger?.error('❌ Failed to load login activity translations:', error);
            // Fallback to empty translations
            this.translations = {};
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for language changes
        window.addEventListener('languageChanged', (event) => {
            this.updateTranslations();
        });
    }

    /**
     * Update translations for all translatable content
     */
    updateTranslations() {
        if (!this.isInitialized) {
            return;
        }

        const currentLanguage = localStorage.getItem('language') || 'en';
        const languageTranslations = this.translations[currentLanguage] || this.translations['en'] || {};

        // Update all translatable content in login activity component
        const translatableElements = document.querySelectorAll('.login-activity .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey;
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            // Make content visible
            element.classList.add('loaded');
            element.style.opacity = '1';
        });

        // Translations updated
    }

    /**
     * Get translation for a specific key
     * @param {string} key - Translation key
     * @param {string} language - Language code (optional)
     * @returns {string} Translated text
     */
    getTranslation(key, language = null) {
        const currentLanguage = language || localStorage.getItem('language') || 'en';
        const languageTranslations = this.translations[currentLanguage] || this.translations['en'] || {};
        return languageTranslations[key] || key;
    }

    /**
     * Check if translations are initialized
     * @returns {boolean} Whether translations are initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create global instance
window.loginActivityTranslations = new LoginActivityTranslations();


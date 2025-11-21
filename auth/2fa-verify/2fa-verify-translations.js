/**
 * 2FA Verification Translation System
 * Handles loading and updating translations for 2FA verification page
 */
class TwoFactorVerifyTranslations {
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
            window.logger?.log('🔧 Initializing 2FA verification translations...');
            
            // Load translation files
            await this.loadTranslations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            window.logger?.log('✅ 2FA verification translations initialized successfully');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize 2FA verification translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/auth/2fa-verify/locales/2fa-verify-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            window.logger?.log('✅ 2FA verification translations loaded');
            
        } catch (error) {
            window.logger?.error('❌ Failed to load 2FA verification translations:', error);
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

        // Update all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey;
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            // Make content visible
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        });

        window.logger?.log(`✅ 2FA verification translations updated for language: ${currentLanguage}`);
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
window.twoFactorVerifyTranslations = new TwoFactorVerifyTranslations();


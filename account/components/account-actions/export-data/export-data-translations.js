/**
 * Export Data Translation System
 * Handles loading and updating translations for export data component
 */
class ExportDataTranslations {
    constructor() {
        this.isInitialized = false;
        this.translations = {};
        this.loadedLanguages = new Set();
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
            console.error('❌ Failed to initialize export data translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/account/components/account-actions/export-data/locales/export-data-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            // Translations loaded
            
        } catch (error) {
            console.error('❌ Failed to load export data translations:', error);
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

        // Update all translatable content in export data component
        const translatableElements = document.querySelectorAll('.export-data .translatable-content');
        
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
     * Check if a translation key exists
     * @param {string} key - Translation key
     * @param {string} language - Language code (optional)
     * @returns {boolean} Whether the key exists
     */
    hasTranslation(key, language = null) {
        const currentLanguage = language || localStorage.getItem('language') || 'en';
        const languageTranslations = this.translations[currentLanguage] || this.translations['en'] || {};
        return key in languageTranslations;
    }

    /**
     * Get all available languages
     * @returns {string[]} Array of language codes
     */
    getAvailableLanguages() {
        return Object.keys(this.translations);
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
window.exportDataTranslations = new ExportDataTranslations();


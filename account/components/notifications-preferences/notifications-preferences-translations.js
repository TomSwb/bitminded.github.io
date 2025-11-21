/**
 * Notifications Preferences Translation System
 * Handles loading and updating translations for notifications preferences component
 */
class NotificationsPreferencesTranslations {
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
            window.logger?.error('❌ Failed to initialize notifications preferences translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/account/components/notifications-preferences/locales/notifications-preferences-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            // Translations loaded
            
        } catch (error) {
            window.logger?.error('❌ Failed to load notifications preferences translations:', error);
            throw error;
        }
    }

    /**
     * Add translations to i18next
     */
    async addToI18next() {
        if (typeof i18next === 'undefined') {
            window.logger?.warn('⚠️ i18next not available, waiting...');
            await this.waitForI18next();
        }

        try {
            // Add translations for all languages
            Object.keys(this.translations).forEach(lang => {
                if (i18next.hasResourceBundle(lang, 'translation')) {
                    // Add to existing resources
                    i18next.addResources(lang, 'translation', this.translations[lang]);
                } else {
                    // Create new resource bundle
                    i18next.addResourceBundle(lang, 'translation', this.translations[lang], true, true);
                }
                this.loadedLanguages.add(lang);
            });

            // Translations added
        } catch (error) {
            window.logger?.error('❌ Failed to add notifications preferences translations to i18next:', error);
        }
    }

    /**
     * Wait for i18next to be available
     */
    async waitForI18next() {
        return new Promise((resolve) => {
            const checkI18next = () => {
                if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkI18next, 100);
                }
            };
            checkI18next();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for language change events
        window.addEventListener('languageChanged', async (e) => {
            window.logger?.log('🌐 Language changed, reloading notifications preferences translations...');
            await this.addToI18next();
        });

        // Listen for i18next initialization
        if (typeof i18next !== 'undefined') {
            i18next.on('initialized', async () => {
                await this.addToI18next();
            });
        }
    }

    /**
     * Get translation for a key
     */
    getTranslation(key, lang = null) {
        const language = lang || (typeof i18next !== 'undefined' ? i18next.language : 'en');
        
        if (this.translations[language] && this.translations[language][key]) {
            return this.translations[language][key];
        }
        
        // Fallback to English
        if (this.translations['en'] && this.translations['en'][key]) {
            return this.translations['en'][key];
        }
        
        return key;
    }
}

// Create global instance
if (typeof window.notificationsPreferencesTranslations === 'undefined') {
    window.notificationsPreferencesTranslations = new NotificationsPreferencesTranslations();
}

// Auto-initialize
(async () => {
    await window.notificationsPreferencesTranslations.init();
    await window.notificationsPreferencesTranslations.addToI18next();
})();


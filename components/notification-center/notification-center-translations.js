/**
 * Notification Center Translation System
 */
class NotificationCenterTranslations {
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
            console.log('🔧 Initializing notification center translations...');
            
            await this.loadTranslations();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Notification center translations initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize notification center translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/components/notification-center/locales/notification-center-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            console.log('✅ Notification center translations loaded');
            
        } catch (error) {
            console.error('❌ Failed to load notification center translations:', error);
            throw error;
        }
    }

    /**
     * Add translations to i18next
     */
    async addToI18next() {
        if (typeof i18next === 'undefined') {
            console.warn('⚠️ i18next not available, waiting...');
            await this.waitForI18next();
        }

        try {
            // Check if i18next methods are available
            if (typeof i18next.addResourceBundle !== 'function') {
                console.log('ℹ️ i18next methods not ready, using standalone translations');
                return;
            }
            
            Object.keys(this.translations).forEach(lang => {
                if (typeof i18next.hasResourceBundle === 'function' && i18next.hasResourceBundle(lang, 'translation')) {
                    if (typeof i18next.addResources === 'function') {
                        i18next.addResources(lang, 'translation', this.translations[lang]);
                    }
                } else {
                    i18next.addResourceBundle(lang, 'translation', this.translations[lang], true, true);
                }
                this.loadedLanguages.add(lang);
            });

            console.log('✅ Notification center translations added to i18next');
        } catch (error) {
            console.warn('⚠️ Could not add to i18next (using standalone):', error);
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
        window.addEventListener('languageChanged', async () => {
            console.log('🌐 Language changed, reloading notification center translations...');
            await this.addToI18next();
        });

        if (typeof i18next !== 'undefined') {
            i18next.on('initialized', async () => {
                await this.addToI18next();
            });
        }
    }
}

// Create global instance
if (typeof window.notificationCenterTranslations === 'undefined') {
    window.notificationCenterTranslations = new NotificationCenterTranslations();
}

// Auto-initialize
(async () => {
    await window.notificationCenterTranslations.init();
    await window.notificationCenterTranslations.addToI18next();
})();



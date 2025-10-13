/**
 * Account Actions Translation System
 * Handles loading and updating translations for account actions components
 */
class AccountActionsTranslations {
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
            console.log('🔧 Initializing account actions translations...');
            
            // Load translation files
            await this.loadTranslations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Account actions translations initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize account actions translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/account/components/account-actions/locales/account-actions-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            console.log('✅ Account actions translations loaded');
            
        } catch (error) {
            console.error('❌ Failed to load account actions translations:', error);
            // Use fallback translations
            this.translations = this.getFallbackTranslations();
        }
    }

    /**
     * Get fallback translations if loading fails
     */
    getFallbackTranslations() {
        return {
            en: {
                "Account Actions": "Account Actions",
                "Manage your data, sessions, and account lifecycle": "Manage your data, sessions, and account lifecycle",
                "Loading account actions...": "Loading account actions..."
            },
            fr: {
                "Account Actions": "Actions du compte",
                "Manage your data, sessions, and account lifecycle": "Gérez vos données, sessions et cycle de vie du compte",
                "Loading account actions...": "Chargement des actions du compte..."
            },
            de: {
                "Account Actions": "Kontoaktionen",
                "Manage your data, sessions, and account lifecycle": "Verwalten Sie Ihre Daten, Sitzungen und Kontolebenszyklus",
                "Loading account actions...": "Kontoaktionen werden geladen..."
            },
            es: {
                "Account Actions": "Acciones de cuenta",
                "Manage your data, sessions, and account lifecycle": "Administre sus datos, sesiones y ciclo de vida de la cuenta",
                "Loading account actions...": "Cargando acciones de cuenta..."
            }
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for language change events
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });
    }

    /**
     * Update all translatable content
     */
    updateTranslations() {
        try {
            const currentLanguage = this.getCurrentLanguage();
            const langTranslations = this.translations[currentLanguage] || this.translations['en'];
            
            if (!langTranslations) {
                console.warn('No translations available for language:', currentLanguage);
                return;
            }

            // Find all elements with translatable-content class in account-actions
            const accountActionsContainer = document.getElementById('account-actions');
            if (!accountActionsContainer) {
                return;
            }

            const translatableElements = accountActionsContainer.querySelectorAll('.translatable-content[data-translation-key]');
            
            translatableElements.forEach(element => {
                const key = element.dataset.translationKey;
                if (langTranslations[key]) {
                    element.textContent = langTranslations[key];
                }
            });

            console.log(`✅ Account actions translations updated to ${currentLanguage}`);
            
        } catch (error) {
            console.error('❌ Failed to update account actions translations:', error);
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        // Check if i18next is available
        if (typeof i18next !== 'undefined' && i18next.language) {
            return i18next.language;
        }
        
        // Fallback to localStorage
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            return savedLanguage;
        }
        
        // Fallback to browser language
        const browserLanguage = navigator.language.split('-')[0];
        return ['en', 'fr', 'de', 'es'].includes(browserLanguage) ? browserLanguage : 'en';
    }

    /**
     * Get translation for a specific key
     */
    getTranslation(key) {
        const currentLanguage = this.getCurrentLanguage();
        const langTranslations = this.translations[currentLanguage] || this.translations['en'];
        return langTranslations[key] || key;
    }
}

// Initialize and expose globally
if (typeof window !== 'undefined') {
    window.accountActionsTranslations = new AccountActionsTranslations();
}


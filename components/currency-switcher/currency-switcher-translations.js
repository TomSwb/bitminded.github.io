/**
 * Currency Switcher Translations
 * Handles translations for the currency switcher component
 */

if (typeof window.CurrencySwitcherTranslations === 'undefined') {
    window.CurrencySwitcherTranslations = {
        translations: null,
        isInitialized: false,

        /**
         * Initialize translations
         */
        async init() {
            try {
                const response = await fetch('/components/currency-switcher/locales/currency-switcher-locales.json');
                
                if (!response.ok) {
                    throw new Error(`Failed to load translations: ${response.status}`);
                }

                this.translations = await response.json();
                this.isInitialized = true;

                // Add translations to i18next if available
                if (window.i18next && typeof window.i18next.addResourceBundle === 'function') {
                    try {
                        Object.keys(this.translations).forEach(lang => {
                            window.i18next.addResourceBundle(
                                lang,
                                'translation',
                                this.translations[lang].translation,
                                true,
                                true
                            );
                        });
                    } catch (i18nextError) {
                        window.logger?.warn('⚠️ Could not add to i18next (fallback mode):', i18nextError);
                    }
                }

                return true;

            } catch (error) {
                window.logger?.error('❌ Failed to initialize currency switcher translations:', error);
                return false;
            }
        },

        /**
         * Get translation for a key
         */
        getTranslation(key, language = null) {
            const currentLanguage = language || this.getCurrentLanguage();
            
            if (this.translations && this.translations[currentLanguage]) {
                return this.translations[currentLanguage].translation[key] || key;
            }
            
            return key;
        },

        /**
         * Get current language
         */
        getCurrentLanguage() {
            if (window.i18next && window.i18next.language) {
                return window.i18next.language;
            }
            return localStorage.getItem('language') || 'en';
        },

        /**
         * Update all translatable content
         */
        updateTranslations() {
            if (!this.isInitialized) {
                return;
            }

            const currentLanguage = this.getCurrentLanguage();

            // Update all translatable elements
            const elements = document.querySelectorAll('#currency-switcher .translatable-content[data-translation-key]');
            
            elements.forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key) {
                    const translation = this.getTranslation(key, currentLanguage);
                    
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            });
        }
    };
}


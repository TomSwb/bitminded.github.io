/**
 * Product Wizard Translations
 * Handles translations for the product creation wizard
 */

if (typeof window.productWizardTranslations === 'undefined') {
    window.productWizardTranslations = {
        translations: null,
        isInitialized: false,

        /**
         * Initialize translations
         */
        async init() {
            try {
                // Initializing translations
                
                const response = await fetch('/admin/components/product-wizard/locales/product-wizard-locales.json');
                
                if (!response.ok) {
                    throw new Error(`Failed to load translations: ${response.status}`);
                }

                this.translations = await response.json();
                // Translations loaded

                this.isInitialized = true;
                // Translations initialized

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
                        // Translations added
                    } catch (i18nextError) {
                        console.warn('⚠️ Could not add to i18next (fallback mode):', i18nextError);
                    }
                }

                return true;

            } catch (error) {
                console.error('❌ Failed to initialize product wizard translations:', error);
                return false;
            }
        },

        /**
         * Get translation for a key
         * @param {string} key - Translation key
         * @param {string} language - Language code (optional)
         * @returns {string} Translated text
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
         * @returns {string} Current language code
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
                console.warn('⚠️ Product wizard translations not initialized');
                return;
            }

            const currentLanguage = this.getCurrentLanguage();
            console.log('🔄 Updating product wizard translations to:', currentLanguage);

            // Update all translatable elements
            const elements = document.querySelectorAll('#product-wizard .translatable-content[data-translation-key]');
            
            elements.forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key) {
                    const translation = this.getTranslation(key, currentLanguage);
                    
                    // Update text content or placeholder
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            });

            console.log('✅ Product wizard translations updated');
        }
    };
}

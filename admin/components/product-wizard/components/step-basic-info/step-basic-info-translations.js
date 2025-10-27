/**
 * Step 1: Basic Information Translations
 * Handles translations for the basic information step
 */

if (typeof window.stepBasicInfoTranslations === 'undefined') {
    window.stepBasicInfoTranslations = {
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
                console.error('❌ Step 1 Translations: Failed to initialize:', error);
                return false;
            }
        },

        /**
         * Update translations when language changes
         */
        updateTranslations() {
            if (!this.isInitialized) {
                console.warn('⚠️ Step 1 Translations: Not initialized, cannot update');
                return;
            }

            // Update translatable content
            this.updateTranslatableContent();
        },

        /**
         * Update translatable content
         */
        updateTranslatableContent() {
            const elements = document.querySelectorAll('#step-1 .translatable-content');
            elements.forEach(el => {
                const key = el.getAttribute('data-translation-key');
                if (key && window.i18next) {
                    el.textContent = window.i18next.t(key);
                }
            });
        },

        /**
         * Get translation for a key
         */
        t(key, options = {}) {
            if (window.i18next && this.isInitialized) {
                return window.i18next.t(key, options);
            }
            
            // Fallback to English
            if (this.translations && this.translations.en && this.translations.en.translation) {
                return this.translations.en.translation[key] || key;
            }
            
            return key;
        }
    };
}

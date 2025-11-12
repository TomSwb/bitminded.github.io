/**
 * Bulk Operations Translations
 * Handles translations for the bulk operations component
 */

if (typeof window.bulkOperationsTranslations === 'undefined') {
    window.bulkOperationsTranslations = {
        translations: null,
        isInitialized: false,

        async init() {
            try {
                const response = await fetch('/admin/components/bulk-operations/locales/bulk-operations-locales.json');
                if (!response.ok) {
                    throw new Error(`Failed to load translations: ${response.statusText}`);
                }

                this.translations = await response.json();
                this.isInitialized = true;

                if (window.i18next && typeof window.i18next.addResourceBundle === 'function') {
                    Object.keys(this.translations).forEach((lang) => {
                        window.i18next.addResourceBundle(
                            lang,
                            'translation',
                            this.translations[lang].translation,
                            true,
                            true
                        );
                    });
                }

                return true;
            } catch (error) {
                console.error('❌ Failed to initialize bulk operations translations:', error);
                return false;
            }
        },

        getTranslation(key, language = null) {
            const currentLanguage = language || this.getCurrentLanguage();
            if (this.translations && this.translations[currentLanguage]) {
                return this.translations[currentLanguage].translation[key] || key;
            }
            return key;
        },

        getCurrentLanguage() {
            if (window.i18next && window.i18next.language) {
                return window.i18next.language;
            }
            return localStorage.getItem('language') || 'en';
        },

        updateTranslations() {
            if (!this.isInitialized) {
                return;
            }

            const currentLanguage = this.getCurrentLanguage();
            const elements = document.querySelectorAll('#bulk-operations .translatable-content[data-translation-key]');

            elements.forEach((element) => {
                const key = element.getAttribute('data-translation-key');
                if (!key) {
                    return;
                }

                const translation = this.getTranslation(key, currentLanguage);
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            });
        }
    };
}


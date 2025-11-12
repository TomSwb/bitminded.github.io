/**
 * Maintenance Mode Translations
 */

if (typeof window.maintenanceModeTranslations === 'undefined') {
    window.maintenanceModeTranslations = {
        translations: null,
        isInitialized: false,

        async init() {
            try {
                const response = await fetch('/admin/components/maintenance-mode/locales/maintenance-mode-locales.json');
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
                console.error('❌ Failed to initialize maintenance mode translations:', error);
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

        updateTranslations(root = document) {
            if (!this.isInitialized) {
                return;
            }

            const currentLanguage = this.getCurrentLanguage();
            const elements = root.querySelectorAll('.translatable-content[data-translation-key]');

            elements.forEach((element) => {
                const key = element.getAttribute('data-translation-key');
                if (!key) {
                    return;
                }

                const translation = this.getTranslation(key, currentLanguage);
                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                    element.placeholder = translation;
                } else if (element.dataset.allowHtml === 'true') {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            });
        }
    };
}

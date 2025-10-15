/**
 * Admin Layout Translations
 * Handles translations for the admin layout component
 */

if (typeof window.adminLayoutTranslations === 'undefined') {
    window.adminLayoutTranslations = {
        translations: null,
        isInitialized: false,

        /**
         * Initialize translations
         */
        async init() {
            try {
                console.log('🔧 Initializing admin layout translations...');
                
                const response = await fetch('/admin/components/admin-layout/locales/admin-layout-locales.json');
                
                if (!response.ok) {
                    throw new Error(`Failed to load translations: ${response.status}`);
                }

                this.translations = await response.json();
                console.log('✅ Admin layout translations loaded');

                this.isInitialized = true;
                console.log('✅ Admin layout translations initialized successfully');

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
                        console.log('✅ Admin layout translations added to i18next');
                    } catch (i18nextError) {
                        console.warn('⚠️ Could not add to i18next (fallback mode):', i18nextError);
                    }
                } else {
                    console.log('ℹ️ i18next not ready, using standalone translations');
                }

                return true;

            } catch (error) {
                console.error('❌ Failed to initialize admin layout translations:', error);
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
                // Silently return if not initialized yet
                return;
            }

            const currentLanguage = this.getCurrentLanguage();

            // Update all translatable elements
            const elements = document.querySelectorAll('#admin-layout .translatable-content[data-translation-key]');
            
            elements.forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key) {
                    const translation = this.getTranslation(key, currentLanguage);
                    
                    // Update text content
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            });

            console.log('✅ Admin layout translations updated');
        }
    };
}


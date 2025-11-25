/**
 * User Management Translations
 * Handles translations for the user management component
 */

if (typeof window.accessControlTranslations === 'undefined') {
    window.accessControlTranslations = {
        translations: null,
        isInitialized: false,

        /**
         * Initialize translations
         */
        async init() {
            try {
                // Initializing translations
                
                const response = await fetch('/admin/components/access-control/locales/access-control-locales.json');
                
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
                        window.logger?.warn('⚠️ Could not add to i18next (fallback mode):', i18nextError);
                    }
                } else {
                    window.logger?.log('ℹ️ i18next not ready, using standalone translations');
                }

                return true;

            } catch (error) {
                window.logger?.error('❌ Failed to initialize user management translations:', error);
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
         * Prioritize localStorage as source of truth to avoid race conditions
         * @returns {string} Current language code
         */
        getCurrentLanguage() {
            // Always check localStorage first (source of truth, updated synchronously)
            const storedLang = localStorage.getItem('language');
            if (storedLang) {
                return storedLang;
            }
            // Fallback to i18next if localStorage not set
            if (window.i18next && window.i18next.language) {
                return window.i18next.language;
            }
            return 'en';
        },

        /**
         * Update all translatable content
         */
        updateTranslations() {
            // Add small delay to ensure language is fully synced across all systems
            setTimeout(() => {
                if (!this.isInitialized) {
                    window.logger?.warn('⚠️ Access control translations not initialized');
                    return;
                }

                const currentLanguage = this.getCurrentLanguage();
                window.logger?.log('🔄 Updating access control translations to:', currentLanguage);

                // Update all translatable elements
                const elements = document.querySelectorAll('#access-control .translatable-content[data-translation-key]');
                
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

                window.logger?.log('✅ Access control translations updated');
            }, 50);
        }
    };
}


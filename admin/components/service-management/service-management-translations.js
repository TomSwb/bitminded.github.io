/**
 * Service Management Translations
 * Handles translations for the service management component
 */

if (typeof window.ServiceManagementTranslations === 'undefined') {
    window.ServiceManagementTranslations = {
        translations: null,
        isInitialized: false,

        /**
         * Initialize translations
         */
        async init() {
            try {
                const response = await fetch('/admin/components/service-management/locales/service-management-locales.json');
                
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
                window.logger?.error('❌ Failed to initialize service management translations:', error);
                return false;
            }
        },

        /**
         * Get translation for a key
         */
        getTranslation(key, language = null) {
            const currentLanguage = language || this.getCurrentLanguage();
            
            if (this.translations && this.translations[currentLanguage]) {
                const translation = this.translations[currentLanguage].translation[key];
                // Return translation if it exists and is not empty, otherwise return key
                return (translation && translation.trim() !== '') ? translation : key;
            }
            
            return key;
        },

        /**
         * Get current language
         * Prioritize localStorage as source of truth to avoid race conditions
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
                this._doUpdateTranslations();
            }, 50);
        },

        /**
         * Internal method to actually update translations
         */
        _doUpdateTranslations() {
            // If not initialized, just use fallback text (don't fail silently)
            if (!this.isInitialized) {
                // Try to initialize if not done yet
                if (!this.translations) {
                    // Don't block - just use fallback text from data-original-text or key
                    const elements = document.querySelectorAll('[data-translation-key]');
                    elements.forEach(element => {
                        const key = element.getAttribute('data-translation-key');
                        const originalText = element.getAttribute('data-original-text') || key;
                        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
                            if (!element.textContent.trim() && originalText) {
                                element.textContent = originalText;
                            }
                        }
                    });
                }
                return;
            }

            const currentLanguage = this.getCurrentLanguage();

            // Update all translatable elements (including those in modals)
            // Try multiple selectors to catch all elements
            const selectors = [
                '#service-management .translatable-content[data-translation-key]',
                '.service-management__modal .translatable-content[data-translation-key]',
                '#service-modal .translatable-content[data-translation-key]',
                '[data-translation-key="Create Stripe Product"]' // Specific fallback for this button
            ];
            
            const elements = new Set();
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => elements.add(el));
            });
            
            elements.forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key) {
                    // Store original text if not already stored (first time we see this element)
                    // Check both textContent and the data-original-text attribute from HTML
                    if (!element.hasAttribute('data-original-text')) {
                        const htmlOriginal = element.getAttribute('data-original-text'); // From HTML
                        const textOriginal = element.textContent.trim();
                        const htmlInner = element.innerHTML.trim();
                        const originalText = htmlOriginal || textOriginal || htmlInner || key;
                        if (originalText && originalText !== key) {
                            element.setAttribute('data-original-text', originalText);
                        } else {
                            element.setAttribute('data-original-text', key);
                        }
                    }
                    
                    // Get fallback text: stored original, current text, or key
                    const originalText = element.getAttribute('data-original-text') || key;
                    const currentText = element.textContent.trim();
                    const fallbackText = originalText || currentText || key;
                    
                    // Get translation
                    let translation = this.getTranslation(key, currentLanguage);
                    
                    // If translation is the key itself or empty, use fallback
                    // But make sure we always have something to display
                    if (!translation || translation.trim() === '' || (translation === key && fallbackText && fallbackText !== key)) {
                        translation = fallbackText || key;
                    }
                    
                    // Ensure we have something to display
                    if (!translation || translation.trim() === '') {
                        translation = key;
                    }
                    
                    // Update text content or placeholder
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        // For span elements inside buttons, update the span, not the button
                        if (element.parentElement && element.parentElement.tagName === 'BUTTON') {
                            element.textContent = translation;
                        } else {
                            element.textContent = translation;
                        }
                    }
                }
            });
        }
    };
}


/**
 * App Entitlements Translations
 * Handles translations for the app-entitlements component
 */

if (typeof window.appEntitlementsTranslations === 'undefined') {
    (function() {
        'use strict';

        // Load translations when i18next is ready
        function loadTranslations() {
            if (typeof window.i18next === 'undefined') {
                console.warn('⚠️ i18next not available, app-entitlements translations will use fallback');
                return;
            }

            // Check if translations are already loaded
            if (window.i18next.hasResourceBundle('en', 'translation', 'app-entitlements')) {
                return;
            }

            // Fetch and add translations
            fetch('/account/components/app-entitlements/locales/app-entitlements-locales.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load app-entitlements translations: ${response.status}`);
                    }
                    return response.json();
                })
                .then(translations => {
                    // Add translations to i18next
                    Object.keys(translations).forEach(lang => {
                        if (translations[lang] && translations[lang].translation) {
                            window.i18next.addResourceBundle(
                                lang,
                                'translation',
                                translations[lang].translation,
                                true,
                                true
                            );
                        }
                    });
                    console.log('✅ App Entitlements translations loaded');
                })
                .catch(error => {
                    console.warn('⚠️ Failed to load app-entitlements translations:', error);
                });
        }

        // Load translations when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadTranslations);
        } else {
            loadTranslations();
        }

        // Also load when i18next is ready (if not already)
        if (typeof window.i18next !== 'undefined') {
            if (window.i18next.isInitialized) {
                loadTranslations();
            } else {
                window.i18next.on('initialized', loadTranslations);
            }
        }

        window.appEntitlementsTranslations = {
            load: loadTranslations
        };
    })();
}















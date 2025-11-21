(function initCatalogTranslations() {
    const TRANSLATIONS_PATH = '/catalog/lang-catalog/locales-catalog.json';
    const DEFAULT_LANGUAGE = localStorage.getItem('language') || 'en';
    let translationsLoaded = false;

    function safeGetTranslation(key, options = {}) {
        if (typeof i18next === 'undefined' || typeof i18next.t !== 'function') {
            return key;
        }
        return i18next.t(key, options);
    }

    function interpolateFallback(template, replacements = {}) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
            return Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : '';
        });
    }

    function applyTranslations() {
        if (!translationsLoaded || typeof i18next === 'undefined') {
            return;
        }

        const textNodes = document.querySelectorAll('[data-i18n]');
        textNodes.forEach((element) => {
            const key = element.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            const translation = safeGetTranslation(key);
            if (translation && translation !== key) {
                if (element.dataset.i18nHtml === 'true') {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderNodes.forEach((element) => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (!key) {
                return;
            }
            const translation = safeGetTranslation(key);
            if (translation && translation !== key) {
                element.setAttribute('placeholder', translation);
            }
        });

        document.querySelectorAll('.translatable-content').forEach((element) => {
            element.classList.add('loaded');
        });

        document.documentElement.classList.remove('hide-translatable');
        window.translationReady = true;

        if (window.loadingScreen && typeof window.loadingScreen.setReadyFlag === 'function') {
            window.loadingScreen.setReadyFlag('translation', true);
        }

        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }

        window.dispatchEvent(new CustomEvent('catalogTranslationsApplied', {
            detail: {
                language: i18next.language
            }
        }));
    }

    function revealContentOnFailure() {
        document.querySelectorAll('.translatable-content').forEach((element) => {
            element.classList.add('loaded');
        });
        document.documentElement.classList.remove('hide-translatable');
        if (window.loadingScreen && typeof window.loadingScreen.setReadyFlag === 'function') {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    }

    function initializeTranslations(language) {
        document.documentElement.classList.add('hide-translatable');

        fetch(TRANSLATIONS_PATH)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((resources) => {
                return i18next.init({
                    lng: language,
                    debug: false,
                    resources
                });
            })
            .then(() => {
                translationsLoaded = true;
                applyTranslations();
            })
            .catch((error) => {
                window.logger?.error('Failed to load catalog translations:', error);
                revealContentOnFailure();
            });
    }

    function changeLanguage(lng) {
        if (window.loadingScreen && typeof window.loadingScreen.show === 'function') {
            window.loadingScreen.show();
        }
        if (window.loadingScreen && typeof window.loadingScreen.setReadyFlag === 'function') {
            window.loadingScreen.setReadyFlag('translation', false);
        }

        localStorage.setItem('language', lng);

        if (!translationsLoaded) {
            initializeTranslations(lng);
            return;
        }

        i18next.changeLanguage(lng)
            .then(() => {
                applyTranslations();
            })
            .catch((error) => {
                window.logger?.error('Failed to change catalog language:', error);
                applyTranslations();
            });
    }

    window.catalogApplyTranslations = applyTranslations;

    window.changeLanguage = function catalogChangeLanguage(lng) {
        changeLanguage(lng);
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof i18next === 'undefined') {
            window.logger?.error('i18next is required for catalog translations.');
            revealContentOnFailure();
            return;
        }
        initializeTranslations(DEFAULT_LANGUAGE);
    });
})();


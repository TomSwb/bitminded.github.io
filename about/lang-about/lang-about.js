document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Hide content until translations load
    document.documentElement.classList.add('hide-translatable');
    
    fetch('/about/lang-about/locales-about.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(resources => {
            return i18next.init({
                lng: savedLang,
                debug: false,
                resources,
                fallbackLng: 'en'
            });
        })
        .then(() => {
            // Ensure i18next is fully initialized before applying translations
            return new Promise(resolve => {
                if (i18next.isInitialized) {
                    resolve();
                } else {
                    const checkInterval = setInterval(() => {
                        if (i18next.isInitialized) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 2000);
                }
            });
        })
        .then(applyTranslations)
        .catch(error => {
            window.logger?.error('Failed to load about translations:', error);
            revealContent();
        });

    function applyTranslations() {
        // Wait for i18next to be ready
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            setTimeout(applyTranslations, 100);
            return;
        }

        const currentLang = i18next.language || localStorage.getItem('language') || 'en';
        const translatableElements = document.querySelectorAll('[data-i18n]');

        translatableElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            let translation = i18next.t(key);
            
            // If translation is the same as key, it means translation wasn't found
            if (!translation || translation === key) {
                // Try with fallback language (English)
                translation = i18next.t(key, { lng: 'en' });
            }
            
            // If still not found, log warning and skip
            if (!translation || translation === key) {
                if (element.textContent.trim() === '' && element.innerHTML.trim() === '') {
                    window.logger?.warn('Translation not found for key:', key, 'language:', currentLang);
                }
                element.classList.add('loaded');
                return;
            }

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.setAttribute('placeholder', translation);
                return;
            }

            if (element.tagName === 'SELECT' || element.tagName === 'OPTION') {
                element.textContent = translation;
            } else {
                // Use innerHTML if translation contains HTML tags (like <p>), otherwise use textContent
                if (translation.includes('<') && translation.includes('>')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            }
            
            // Mark as loaded after translation is applied
            element.classList.add('loaded');
        });

        revealContent();
        document.dispatchEvent(new CustomEvent('aboutTranslationsApplied', {
            detail: {
                language: i18next.language
            }
        }));
    }

    function revealContent() {
        document.querySelectorAll('.translatable-content').forEach(element => {
            element.classList.add('loaded');
        });
        
        document.documentElement.classList.remove('hide-translatable');
        window.translationReady = true;
        
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    }

    window.changeLanguage = function(lng) {
        if (window.loadingScreen) {
            window.loadingScreen.show();
            window.loadingScreen.setReadyFlag('translation', false);
        }
        
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng).then(applyTranslations);
    };
});


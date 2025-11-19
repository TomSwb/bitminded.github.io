document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Hide content until translations load
    document.documentElement.classList.add('hide-translatable');
    
    fetch('lang-services/locales-services.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(resources => i18next.init({
                lng: savedLang,
                debug: false,
                resources
        }))
        .then(applyTranslations)
        .catch(error => {
            console.error('Failed to load services translations:', error);
            revealContent();
        });

    function applyTranslations() {
        const translatableElements = document.querySelectorAll('[data-i18n]');

        translatableElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            const translation = i18next.t(key);
            if (!translation || translation === key) {
                return;
            }

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.setAttribute('placeholder', translation);
                return;
            }

            if (element.tagName === 'SELECT' || element.tagName === 'OPTION') {
                element.textContent = translation;
            } else {
                // Use innerHTML if translation contains HTML tags (like <br>), otherwise use textContent
                if (translation.includes('<') && translation.includes('>')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        revealContent();
        document.dispatchEvent(new CustomEvent('servicesTranslationsApplied', {
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


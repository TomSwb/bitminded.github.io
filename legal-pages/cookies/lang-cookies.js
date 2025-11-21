document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';

    document.documentElement.classList.add('hide-translatable');

    fetch('locales/cookies-locales.json')
        .then(response => response.json())
        .then(resources => {
            i18next.init({
                lng: savedLang,
                debug: false,
                resources
            }, function() {
                updateContent();
            });
        })
        .catch(error => {
            window.logger?.error('Failed to load cookie translations:', error);
            showContent();
        });

    function updateContent() {
        const translatableElements = document.querySelectorAll('[data-translate]');
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });

        const allTranslatable = document.querySelectorAll('.translatable-content');
        allTranslatable.forEach(element => {
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

    function showContent() {
        const allTranslatable = document.querySelectorAll('.translatable-content');
        allTranslatable.forEach(element => {
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
        i18next.changeLanguage(lng, updateContent);
    };
});


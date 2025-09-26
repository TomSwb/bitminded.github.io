document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    fetch('../locales/auth-locales.json')
        .then(response => response.json())
        .then(resources => {
            i18next.init({
                lng: savedLang,
                debug: false,
                resources
            }, function(err, t) {
                updateContent();
            });
        });

    function updateContent() {
        // Auth page specific translations
        if (document.getElementById('auth-title')) {
            document.getElementById('auth-title').textContent = i18next.t('auth-title');
        }
        if (document.getElementById('auth-error-message')) {
            document.getElementById('auth-error-message').textContent = i18next.t('auth-error-message');
        }
        
        // Show all translatable content after translation is complete
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Remove the hide-translatable class from document
        document.documentElement.classList.remove('hide-translatable');
        
        // Signal that translation is ready
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
        
        // Dispatch languageChanged event for form components
        const languageChangedEvent = new CustomEvent('languageChanged', {
            detail: { language: i18next.language }
        });
        window.dispatchEvent(languageChangedEvent);
    }

    window.changeLanguage = function(lng) {
        // Show loading screen during language change
        if (window.loadingScreen) {
            window.loadingScreen.show();
            window.loadingScreen.setReadyFlag('translation', false);
        }
        
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
        
        // Dispatch languageChanged event for form components
        const languageChangedEvent = new CustomEvent('languageChanged', {
            detail: { language: lng }
        });
        window.dispatchEvent(languageChangedEvent);
    };
});

document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    fetch('locales/account-locales.json')
        .then(response => response.json())
        .then(resources => {
            i18next.init({
                lng: savedLang,
                debug: false,
                resources
            }, function(err, t) {
                updateContent();
            });
        })
        .catch(error => {
            console.error('Failed to load account translations:', error);
            // Still show content even if translation fails
            showContent();
        });

    function updateContent() {
        // Account page specific translations
        if (document.getElementById('account-title')) {
            document.getElementById('account-title').textContent = i18next.t('account-title');
        }
        if (document.getElementById('account-error-message')) {
            document.getElementById('account-error-message').textContent = i18next.t('account-error-message');
        }
        if (document.getElementById('account-success-message')) {
            document.getElementById('account-success-message').textContent = i18next.t('account-success-message');
        }
        
        // Show all translatable content after translation is complete
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Signal that translation is ready
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
        
        // Note: Don't dispatch languageChanged event here to avoid infinite recursion
        // The language-switcher component will handle this
    }

    function showContent() {
        // Show all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Signal that translation is ready (even if failed)
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    }

    window.changeLanguage = function(lng) {
        // Show loading screen during language change
        if (window.loadingScreen) {
            window.loadingScreen.show();
            window.loadingScreen.setReadyFlag('translation', false);
        }
        
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
    };
});

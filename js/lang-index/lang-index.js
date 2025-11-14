document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    fetch('js/lang-index/locales-index.json')
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
        // Update all translatable content by data attribute or id
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            // Prefer data-translate over id for translation keys
            const translationKey = element.getAttribute('data-translate') || element.id;
            if (translationKey && i18next.exists(translationKey)) {
                element.textContent = i18next.t(translationKey);
            }
        });
        
        // Show all translatable content after translation is complete
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

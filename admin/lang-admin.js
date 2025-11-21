document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Load admin layout translations
    fetch('components/admin-layout/locales/admin-layout-locales.json')
    .then(response => response.json())
    .then(adminLayoutResources => {
        i18next.init({
            lng: savedLang,
            debug: false,
            resources: adminLayoutResources
        }, function(err, t) {
            updateContent();
        });
    })
    .catch(error => {
        window.logger?.error('Failed to load admin translations:', error);
        // Still show content even if translation fails
        showContent();
    });

    function updateContent() {
        // Show all translatable content after translation is complete
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Update admin-layout translations if component is loaded
        setTimeout(() => {
            if (window.adminLayout?.updateTranslations) {
                window.adminLayout.updateTranslations();
            }
        }, 100);
        
        // Signal that translation is ready
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
        
        // Dispatch languageChanged event
        const languageChangedEvent = new CustomEvent('languageChanged', {
            detail: { language: i18next.language }
        });
        window.dispatchEvent(languageChangedEvent);
    }

    function showContent() {
        // Show all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Update admin-layout translations if component is loaded
        setTimeout(() => {
            if (window.adminLayout?.updateTranslations) {
                window.adminLayout.updateTranslations();
            }
        }, 100);
        
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
        i18next.changeLanguage(lng, function() {
            updateContent();
            // Update admin-layout translations after language change
            setTimeout(() => {
                if (window.adminLayout && window.adminLayout.updateTranslations) {
                    window.adminLayout.updateTranslations();
                }
            }, 100);
            
            // Dispatch languageChanged event
            const languageChangedEvent = new CustomEvent('languageChanged', {
                detail: { language: lng }
            });
            window.dispatchEvent(languageChangedEvent);
        });
    };
});


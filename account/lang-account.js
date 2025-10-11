document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Load both account page and account-layout translations
    Promise.all([
        fetch('locales/account-locales.json'),
        fetch('components/account-layout/locales/account-layout-locales.json')
    ])
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(([accountResources, layoutResources]) => {
        // Dynamically merge both resource sets for all available languages
        const mergedResources = {};
        
        // Get all available languages from both resource sets
        const allLanguages = new Set([
            ...Object.keys(accountResources),
            ...Object.keys(layoutResources)
        ]);
        
        // Merge translations for each language
        allLanguages.forEach(lang => {
            mergedResources[lang] = {
                translation: {
                    ...(accountResources[lang]?.translation || {}),
                    ...(layoutResources[lang]?.translation || {})
                }
            };
        });
        
        i18next.init({
            lng: savedLang,
            debug: false,
            resources: mergedResources
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
        
        // Update account-layout translations if component is loaded
        // Use setTimeout to ensure component is fully loaded
        setTimeout(() => {
            if (window.accountLayout?.updateTranslations) {
                window.accountLayout.updateTranslations();
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
        
        // Dispatch languageChanged event for form components
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
        
        // Update account-layout translations if component is loaded
        // Use setTimeout to ensure component is fully loaded
        setTimeout(() => {
            if (window.accountLayout?.updateTranslations) {
                window.accountLayout.updateTranslations();
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
            // Update account-layout translations after language change
            setTimeout(() => {
                if (window.accountLayout && window.accountLayout.updateTranslations) {
                    window.accountLayout.updateTranslations();
                }
            }, 100);
            
            // Dispatch languageChanged event for form components
            const languageChangedEvent = new CustomEvent('languageChanged', {
                detail: { language: lng }
            });
            window.dispatchEvent(languageChangedEvent);
        });
    };
});

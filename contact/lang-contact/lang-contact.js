document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Ensure content is hidden until translation is ready
    document.documentElement.classList.add('hide-translatable');
    
    fetch('lang-contact/locales-contact.json')
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
            console.error('Failed to load contact translations:', error);
            // Still show content even if translation fails
            showContent();
        });

    function updateContent() {
        // Contact form translations
        if (document.querySelector('label[for="name"]')) {
            document.querySelector('label[for="name"]').textContent = i18next.t('contact-name');
        }
        if (document.querySelector('label[for="email"]')) {
            document.querySelector('label[for="email"]').textContent = i18next.t('contact-email-label');
        }
        if (document.querySelector('label[for="message"]')) {
            document.querySelector('label[for="message"]').textContent = i18next.t('contact-message');
        }
        if (document.querySelector('button.contact')) {
            document.querySelector('button.contact').textContent = i18next.t('contact-send');
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
    }

    function showContent() {
        // Show all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Remove the hide-translatable class from document
        document.documentElement.classList.remove('hide-translatable');
        
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

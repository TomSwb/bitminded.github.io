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
        // Login/Sign Up button translations (always visible, translate immediately)
        if (document.querySelector('.auth-buttons button:nth-child(1)') && !document.querySelector('.auth-buttons .username-btn')) {
            document.querySelector('.auth-buttons button:nth-child(1)').textContent = i18next.t('login-btn');
        }
        if (document.querySelector('.auth-buttons button:nth-child(2)') && !document.querySelector('.auth-buttons .username-btn')) {
            document.querySelector('.auth-buttons button:nth-child(2)').textContent = i18next.t('signup-btn');
        }
        // Sign Out button translation (preserve admin badge if present)
        if (document.getElementById('signout-btn')) {
            document.getElementById('signout-btn').textContent = i18next.t('signout-btn');
        }
        
        // Update auth buttons translation if function exists
        if (typeof window.updateAuthButtonsTranslation === 'function') {
            window.updateAuthButtonsTranslation();
        }
        // Nav menu translations
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
            document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }

        if (document.getElementById('main-title')) {
            document.getElementById('main-title').textContent = i18next.t('main-title');
        }
        if (document.getElementById('subtitle')) {
            document.getElementById('subtitle').textContent = i18next.t('subtitle');
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
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    }

    window.changeLanguage = function(lng) {
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
    };
});

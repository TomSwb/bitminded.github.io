// lang-account.js
// Language switcher for Account page

document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    fetch('lang-account/locales-account.json')
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
        // Account page translations
        if (document.getElementById('account-title')) {
            document.getElementById('account-title').textContent = i18next.t('account-title');
        }
        if (document.getElementById('account-subtitle')) {
            document.getElementById('account-subtitle').textContent = i18next.t('account-subtitle');
        }
        // Nav menu translations
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
            document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }
        // Auth buttons (always visible, translate immediately)
        if (document.querySelector('.auth-buttons button:nth-child(1)') && !document.querySelector('.auth-buttons .username-btn')) {
            document.querySelector('.auth-buttons button:nth-child(1)').textContent = i18next.t('login-btn');
        }
        if (document.querySelector('.auth-buttons button:nth-child(2)') && !document.querySelector('.auth-buttons .username-btn')) {
            document.querySelector('.auth-buttons button:nth-child(2)').textContent = i18next.t('signup-btn');
        }
        if (document.getElementById('signout-btn')) {
            document.getElementById('signout-btn').textContent = i18next.t('signout-btn');
        }
        // Show all translatable content after translation is complete
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
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

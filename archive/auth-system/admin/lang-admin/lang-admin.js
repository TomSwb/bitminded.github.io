// lang-admin.js
// Language switcher for Admin page

document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    fetch('lang-admin/locales-admin.json')
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
        // Admin page translations
        if (document.getElementById('admin-title')) {
            document.getElementById('admin-title').textContent = i18next.t('admin-title');
        }
        if (document.getElementById('admin-subtitle')) {
            document.getElementById('admin-subtitle').textContent = i18next.t('admin-subtitle');
        }
        if (document.getElementById('admin-welcome-text')) {
            document.getElementById('admin-welcome-text').textContent = i18next.t('admin-welcome-text');
        }
        
        // Admin navigation translations
        if (document.getElementById('admin-nav-users')) {
            document.getElementById('admin-nav-users').textContent = i18next.t('admin-nav-users');
        }
        if (document.getElementById('admin-nav-payments')) {
            document.getElementById('admin-nav-payments').textContent = i18next.t('admin-nav-payments');
        }
        if (document.getElementById('admin-nav-entitlements')) {
            document.getElementById('admin-nav-entitlements').textContent = i18next.t('admin-nav-entitlements');
        }
        if (document.getElementById('admin-nav-settings')) {
            document.getElementById('admin-nav-settings').textContent = i18next.t('admin-nav-settings');
        }
        
        // Nav menu translations
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
            document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }
        if (document.getElementById('nav-admin')) {
            document.getElementById('nav-admin').textContent = i18next.t('nav-admin');
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
        
        // Update auth buttons translation if function exists
        if (typeof window.updateAuthButtonsTranslation === 'function') {
            window.updateAuthButtonsTranslation();
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

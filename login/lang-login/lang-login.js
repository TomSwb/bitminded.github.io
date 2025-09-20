document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    fetch('lang-login/locales-login.json')
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
        if (document.getElementById('contact-linkedin')) {
            document.getElementById('contact-linkedin').textContent = i18next.t('contact-linkedin');
        }
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
            document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }

        // Login & Sign Up translations
        if (document.getElementById('login-username-label')) {
            document.getElementById('login-username-label').textContent = i18next.t('login-username-label');
        }
        if (document.getElementById('login-email-label')) {
            document.getElementById('login-email-label').textContent = i18next.t('login-email-label');
        }
        if (document.getElementById('login-password-label')) {
            document.getElementById('login-password-label').textContent = i18next.t('login-password-label');
        }
        if (document.getElementById('login-submit')) {
            document.getElementById('login-submit').textContent = i18next.t('login-submit');
        }
        if (document.getElementById('signup-username-label')) {
            document.getElementById('signup-username-label').textContent = i18next.t('signup-username-label');
        }
        if (document.getElementById('signup-email-label')) {
            document.getElementById('signup-email-label').textContent = i18next.t('signup-email-label');
        }
        if (document.getElementById('signup-password-label')) {
            document.getElementById('signup-password-label').textContent = i18next.t('signup-password-label');
        }
        if (document.getElementById('signup-confirm-label')) {
            document.getElementById('signup-confirm-label').textContent = i18next.t('signup-confirm-label');
        }
        if (document.getElementById('signup-submit')) {
            document.getElementById('signup-submit').textContent = i18next.t('signup-submit');
        }
        if (document.getElementById('show-login')) {
            document.getElementById('show-login').textContent = i18next.t('show-login');
        }
        if (document.getElementById('show-signup')) {
            document.getElementById('show-signup').textContent = i18next.t('show-signup');
        }

        // Show all translatable content after translation is complete
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Remove the hide-translatable class from document
        document.documentElement.classList.remove('hide-translatable');
    }

    window.changeLanguage = function(lng) {
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
    };
});

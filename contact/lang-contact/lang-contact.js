document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
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
        });

    function updateContent() {
        // Login/Sign Up button translations
        if (document.querySelector('.auth-buttons button:nth-child(1)')) {
            document.querySelector('.auth-buttons button:nth-child(1)').textContent = i18next.t('login-btn');
        }
        if (document.querySelector('.auth-buttons button:nth-child(2)')) {
            document.querySelector('.auth-buttons button:nth-child(2)').textContent = i18next.t('signup-btn');
        }
        // Sign Out button translation
        if (document.getElementById('signout-btn')) {
            document.getElementById('signout-btn').textContent = i18next.t('signout-btn');
        }
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
            document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }

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
    }

    window.changeLanguage = function(lng) {
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
    };
});

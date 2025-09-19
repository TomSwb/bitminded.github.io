fetch('js/lang-contact/locales-contact.json')
    .then(response => response.json())
    .then(resources => {
        i18next.init({
            lng: 'en',
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
    if (document.getElementById('contact-email')) {
        document.getElementById('contact-email').textContent = i18next.t('contact-email');
    }
    if (document.getElementById('nav-home')) {
        document.getElementById('nav-home').textContent = i18next.t('nav-home');
    }
    if (document.getElementById('nav-contact')) {
        document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
    }
}

function changeLanguage(lng) {
    i18next.changeLanguage(lng, updateContent);
}

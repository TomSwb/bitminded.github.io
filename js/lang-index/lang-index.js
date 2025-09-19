document.addEventListener('DOMContentLoaded', function() {
    fetch('js/lang-index/locales-index.json')
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
        if (document.getElementById('main-title')) {
            document.getElementById('main-title').textContent = i18next.t('main-title');
        }
        if (document.getElementById('subtitle')) {
            document.getElementById('subtitle').textContent = i18next.t('subtitle');
        }
        if (document.getElementById('nav-home')) {
            document.getElementById('nav-home').textContent = i18next.t('nav-home');
        }
        if (document.getElementById('nav-contact')) {
        document.getElementById('nav-contact').textContent = i18next.t('nav-contact');
        }
    }

    window.changeLanguage = function(lng) {
        i18next.changeLanguage(lng, updateContent);
    };
});

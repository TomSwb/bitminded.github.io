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

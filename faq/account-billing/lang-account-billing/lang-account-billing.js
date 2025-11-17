document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en';
    
    document.documentElement.classList.add('hide-translatable');
    
    fetch('lang-account-billing/locales-account-billing.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(resources => {
            if (window.i18next && window.i18next.store) {
                Object.keys(resources).forEach(lng => {
                    Object.keys(resources[lng].translation).forEach(key => {
                        window.i18next.addResource(lng, 'translation', key, resources[lng].translation[key]);
                    });
                });
                applyTranslations();
            } else {
                return i18next.init({
                    lng: savedLang,
                    debug: false,
                    resources
                }).then(applyTranslations);
            }
        })
        .catch(error => {
            console.error('Failed to load Account & Billing FAQ translations:', error);
            revealContent();
        });

    function applyTranslations() {
        const translatableElements = document.querySelectorAll('[data-i18n]');

        translatableElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            const translation = i18next.t(key);
            if (!translation || translation === key) {
                return;
            }

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.setAttribute('placeholder', translation);
                return;
            }

            if (element.tagName === 'SELECT' || element.tagName === 'OPTION') {
                element.textContent = translation;
            } else if (element.tagName === 'A' && translation.includes('<a')) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });

        revealContent();
    }

    function revealContent() {
        document.querySelectorAll('.translatable-content').forEach(element => {
            element.classList.add('loaded');
        });
        
        document.documentElement.classList.remove('hide-translatable');
    }
});


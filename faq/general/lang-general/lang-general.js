document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const translationPath = currentPath.includes('/faq/general/') 
        ? 'lang-general/locales-general.json'
        : 'general/lang-general/locales-general.json';
    
    // Function to load and merge translations
    const loadGeneralTranslations = () => {
        fetch(translationPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(resources => {
                // Wait for i18next to be available
                const waitForI18next = () => {
                    if (window.i18next && window.i18next.store) {
                        // Merge with existing i18next instance
                        Object.keys(resources).forEach(lng => {
                            Object.keys(resources[lng].translation).forEach(key => {
                                window.i18next.addResource(lng, 'translation', key, resources[lng].translation[key]);
                            });
                        });
                        applyTranslations();
                    } else {
                        // Wait a bit and try again, or initialize if i18next is not available
                        setTimeout(() => {
                            if (window.i18next && window.i18next.store) {
                                Object.keys(resources).forEach(lng => {
                                    Object.keys(resources[lng].translation).forEach(key => {
                                        window.i18next.addResource(lng, 'translation', key, resources[lng].translation[key]);
                                    });
                                });
                                applyTranslations();
                            } else {
                                // Initialize i18next if it doesn't exist
                                i18next.init({
                                    lng: savedLang,
                                    debug: false,
                                    resources
                                }).then(applyTranslations);
                            }
                        }, 100);
                    }
                };
                
                waitForI18next();
            })
            .catch(error => {
                window.logger?.error('Failed to load General FAQ translations:', error);
                revealContent();
            });
    };
    
    // Start loading translations
    loadGeneralTranslations();

    function applyTranslations() {
        if (!window.i18next) {
            return;
        }

        const translatableElements = document.querySelectorAll('[data-i18n]');

        translatableElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            // Only translate keys that start with 'faq-general' or 'faq-category-general'
            if (!key.startsWith('faq-general') && !key.startsWith('faq-category-general')) {
                return;
            }

            const translation = window.i18next.t(key);
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
            } else if (element.tagName === 'P' && translation.includes('<a')) {
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

    // Listen for language changes and FAQ translations being applied
    window.addEventListener('languageChanged', () => {
        if (window.i18next) {
            applyTranslations();
        }
    });
    
    // Listen for when main FAQ translations are applied (to ensure we merge after they're loaded)
    window.addEventListener('faqTranslationsApplied', () => {
        // Reload general translations to merge with the now-initialized i18next
        loadGeneralTranslations();
    });
});


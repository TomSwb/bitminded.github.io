/**
 * Contact User Translations
 * Initializes i18next for the contact user page and loads translations
 */

document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Load contact user translations
    fetch('/admin/components/user-detail/components/user-communication/locales/contact-user-locales.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(resources => {
            if (typeof i18next === 'undefined') {
                throw new Error('i18next is not available');
            }
            
            i18next.init({
                lng: savedLang,
                debug: false,
                resources: resources
            }, function(err, t) {
                if (err) {
                    window.logger?.error('❌ i18next init error:', err);
                    showContent();
                } else {
                    updateContent();
                }
            });
        })
        .catch(error => {
            window.logger?.error('❌ Failed to load Contact User translations:', error);
            showContent();
        });
    
    function updateContent() {
        // Update all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translation-key');
            
            if (key) {
                element.textContent = i18next.t(key);
            }
            
            // Add the 'loaded' class to make the element visible
            element.classList.add('loaded');
        });
        
        // Signal that translation is ready
        window.translationReady = true;
        
        showContent();
    }
    
    function showContent() {
        // Show the content once translations are loaded (or failed)
        document.body.style.opacity = '1';
    }

    // Global language change function
    window.changeLanguage = function(lng) {
        if (typeof i18next !== 'undefined' && i18next.changeLanguage) {
            i18next.changeLanguage(lng, function(err, t) {
                if (err) {
                    window.logger?.error('❌ Language change error:', err);
                } else {
                    updateContent();
                    
                    // Dispatch languageChanged event only when language actually changes
                    const languageChangedEvent = new CustomEvent('languageChanged', {
                        detail: { language: i18next.language }
                    });
                    window.dispatchEvent(languageChangedEvent);
                }
            });
        }
    };
});

/**
 * User Detail Translations
 * Initializes i18next for the user detail page and loads translations
 */

document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    
    // Loading translations
    
    // Load user detail translations
    fetch('/admin/components/user-detail/locales/user-detail-locales.json')
        .then(response => response.json())
        .then(resources => {
            // Translations loaded
            
            i18next.init({
                lng: savedLang,
                debug: false,
                resources: resources
            }, function(err, t) {
                if (err) {
                    window.logger?.error('❌ i18next init error:', err);
                    showContent();
                } else {
                    // i18next initialized
                    updateContent();
                }
            });
        })
        .catch(error => {
            window.logger?.error('❌ Failed to load user detail translations:', error);
            showContent();
        });

    function updateContent() {
        // Updating translations
        
        // Apply translations to all translatable elements
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translation-key');
            if (key) {
                // Try with the key as-is first, then try with snake_case conversion
                let translation = i18next.t(key);
                
                // If translation not found, try converting to snake_case
                if (translation === key) {
                    const snakeCaseKey = key
                        .replace(/\s+/g, '_')  // Replace spaces with underscores
                        .replace(/-/g, '_')     // Replace hyphens with underscores
                        .toLowerCase();         // Convert to lowercase
                    translation = i18next.t(snakeCaseKey);
                }
                
                if (translation && translation !== key) {
                    element.textContent = translation;
                }
            }
            // Add loaded class to show content
            element.classList.add('loaded');
        });
        
        // Content updated
        
        // Signal that translation is ready
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
    }

    function showContent() {
        window.logger?.log('⚠️ Showing content without translations');
        
        // Show all translatable content
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Signal that translation is ready (even if failed)
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
    }

    // Global function for language switching
    window.changeLanguage = function(lng) {
        window.logger?.log('🌐 Changing language to:', lng);
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, function() {
            updateContent();
        });
    };
});


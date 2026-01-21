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
        // Update all translatable content by data attribute or id
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            // Prefer data-i18n, then data-translate, then id for translation keys
            const translationKey = element.getAttribute('data-i18n') || 
                                   element.getAttribute('data-translate') || 
                                   element.id;
            if (translationKey && i18next.exists(translationKey)) {
                const translation = i18next.t(translationKey);
                
                // Handle elements with child elements (like links with spans)
                if (element.children.length > 0) {
                    // Try to update the last span's text content that is not aria-hidden
                    const spans = element.querySelectorAll('span');
                    if (spans.length > 0) {
                        // Find the last span that is not aria-hidden
                        const textSpans = Array.from(spans).filter(span => 
                            !span.hasAttribute('aria-hidden')
                        );
                        if (textSpans.length > 0) {
                            // Update the last non-aria-hidden span
                            textSpans[textSpans.length - 1].textContent = translation;
                        } else {
                            // All spans are aria-hidden, update the last one anyway
                            spans[spans.length - 1].textContent = translation;
                        }
                    } else {
                        // No spans, update text content directly (this will replace children)
                        element.textContent = translation;
                    }
                } else {
                    // No children, simple text update
                    element.textContent = translation;
                }
            }
        });
        
        // Show all translatable content after translation is complete
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
        
        // Remove the hide-translatable class from document
        document.documentElement.classList.remove('hide-translatable');
        
        // Signal that translation is ready
        window.translationReady = true;
        
        // Notify loading screen component
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('translation', true);
        }
        
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    }

    window.changeLanguage = function(lng) {
        // Show loading screen during language change
        if (window.loadingScreen) {
            window.loadingScreen.show();
            window.loadingScreen.setReadyFlag('translation', false);
        }
        
        localStorage.setItem('language', lng);
        i18next.changeLanguage(lng, updateContent);
    };
});

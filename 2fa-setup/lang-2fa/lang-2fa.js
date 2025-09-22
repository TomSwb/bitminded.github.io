// lang-2fa.js - BitMinded 2FA Translation Logic

// Initialize immediately since script is loaded dynamically
    i18next.init({
        lng: localStorage.getItem('language') || 'en',
        fallbackLng: 'en',
        resources: {
            en: {
                translation: locales2FA.en
            },
            fr: {
                translation: locales2FA.fr
            }
        }
    }, function(err, t) {
        if (err) {
            console.error('❌ Translation failed:', err.message);
            return;
        }
        
        // Update content after initialization
        updateContent();
        
        // Set up language change handlers
        setupLanguageHandlers();
        
        // Signal that translation is ready
        window.translationReady = true;
        if (typeof checkPageReady === 'function') {
            checkPageReady();
        }
    });
    
    // Fallback: if i18next fails, still set translation ready after a timeout
    setTimeout(() => {
        if (!window.translationReady) {
            window.translationReady = true;
            if (typeof checkPageReady === 'function') {
                checkPageReady();
            }
        }
    }, 5000);

function updateContent() {
    // Update all translatable content
    const elements = document.querySelectorAll('.translatable-content');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            try {
                const translation = i18next.t(key);
                element.textContent = translation;
            } catch (error) {
                console.error(`❌ Translation error for "${key}":`, error.message);
            }
        }
    });
    
    // Update page title
    document.title = i18next.t('page-title');
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', i18next.t('meta-description'));
    }
    
    // Also update elements with data-i18n that might not have translatable-content class
    const allTranslatableElements = document.querySelectorAll('[data-i18n]');
    allTranslatableElements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            try {
                const translation = i18next.t(key);
                element.textContent = translation;
            } catch (error) {
                console.error(`❌ Translation error for "${key}":`, error.message);
            }
        }
    });
    
    // Update auth buttons translation if they exist
    if (typeof window.updateAuthButtonsTranslation === 'function') {
        window.updateAuthButtonsTranslation();
    }
    
    // Remove the hide-translatable class to show all translated content
    document.documentElement.classList.remove('hide-translatable');
    
    // Force elements to be visible
    const visibleElements = document.querySelectorAll('.translatable-content');
    visibleElements.forEach(element => {
        element.style.opacity = '1';
        element.style.visibility = 'visible';
    });
    
    // Force specific elements to be visible with !important
    const navHome = document.getElementById('nav-home');
    const navContact = document.getElementById('nav-contact');
    const navAccount = document.getElementById('nav-account');
    const title = document.getElementById('2fa-title');
    const subtitle = document.getElementById('2fa-subtitle');
    
    if (navHome) {
        navHome.style.setProperty('opacity', '1', 'important');
        navHome.style.setProperty('visibility', 'visible', 'important');
    }
    if (navContact) {
        navContact.style.setProperty('opacity', '1', 'important');
        navContact.style.setProperty('visibility', 'visible', 'important');
    }
    if (navAccount) {
        navAccount.style.setProperty('opacity', '1', 'important');
        navAccount.style.setProperty('visibility', 'visible', 'important');
    }
    if (title) {
        title.style.setProperty('opacity', '1', 'important');
        title.style.setProperty('visibility', 'visible', 'important');
    }
    if (subtitle) {
        subtitle.style.setProperty('opacity', '1', 'important');
        subtitle.style.setProperty('visibility', 'visible', 'important');
    }
}

function setupLanguageHandlers() {
    // English button
    const enBtn = document.getElementById('lang-en');
    if (enBtn) {
        enBtn.addEventListener('click', function() {
            changeLanguage('en');
        });
    }
    
    // French button
    const frBtn = document.getElementById('lang-fr');
    if (frBtn) {
        frBtn.addEventListener('click', function() {
            changeLanguage('fr');
        });
    }
}

function changeLanguage(language) {
    i18next.changeLanguage(language, function(err, t) {
        if (err) {
            console.error('Language change failed:', err);
            return;
        }
        
        // Save language preference
        localStorage.setItem('language', language);
        
        // Update content
        updateContent();
        
        // Update language buttons
        updateLanguageButtons(language);
    });
}

function updateLanguageButtons(activeLanguage) {
    const enBtn = document.getElementById('lang-en');
    const frBtn = document.getElementById('lang-fr');
    
    if (enBtn && frBtn) {
        // Remove active class from all buttons
        enBtn.classList.remove('active');
        frBtn.classList.remove('active');
        
        // Add active class to current language
        if (activeLanguage === 'en') {
            enBtn.classList.add('active');
        } else if (activeLanguage === 'fr') {
            frBtn.classList.add('active');
        }
    }
}

// Make updateContent globally accessible for dynamic content
window.updateContent = updateContent;

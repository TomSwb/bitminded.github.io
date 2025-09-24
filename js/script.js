// script.js
// Consolidated JavaScript for BitMinded website
// Handles component loading and other interactive features


// ===== PAGE READY CHECK =====

function checkPageReady() {
    console.log('🔍 checkPageReady called - translationReady:', window.translationReady);
    // Check if translation is ready
    if (window.translationReady) {
        console.log('✅ Translation ready, hiding loading screen');
        // Use the loading screen component if available
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('page', true);
        } else {
            // Fallback to old method
            document.documentElement.classList.add('page-loaded');
        }
    } else {
        console.log('⏳ Still waiting for ready flags...');
    }
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('BitMinded website initialized');
    
    // Load Navigation Menu Component
    loadNavigationMenu();
    
    // Load Language Switcher Component
    loadLanguageSwitcher();
    
    // Load Theme Switcher Component
    loadThemeSwitcher();
    
    // Load Auth Buttons Component
    loadAuthButtons();
    
    // Any additional initialization code can go here
});

// ===== COMPONENT LOADING FUNCTIONS =====

async function loadNavigationMenu() {
    try {
        await componentLoader.load('navigation-menu', {
            container: 'header',
            priority: 'high'
        });
        console.log('✅ Navigation menu component loaded');
    } catch (error) {
        console.error('❌ Failed to load navigation menu component:', error);
    }
}

async function loadLanguageSwitcher() {
    try {
        await componentLoader.load('language-switcher', {
            container: 'header',
            priority: 'high'
        });
        console.log('✅ Language switcher component loaded');
    } catch (error) {
        console.error('❌ Failed to load language switcher component:', error);
    }
}

async function loadThemeSwitcher() {
    try {
        await componentLoader.load('theme-switcher', {
            container: 'footer',
            priority: 'medium'
        });
        console.log('✅ Theme switcher component loaded');
    } catch (error) {
        console.error('❌ Failed to load theme switcher component:', error);
    }
}

async function loadAuthButtons() {
    console.log('🔄 Script: Loading auth buttons component...');
    try {
        // Load auth buttons into header (for desktop positioning)
        await componentLoader.load('auth-buttons', {
            container: 'header',
            priority: 'high'
        });
        console.log('✅ Script: Auth buttons component loaded');
        
    } catch (error) {
        console.error('❌ Script: Failed to load auth buttons component:', error);
    }
}

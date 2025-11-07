// script.js
// Consolidated JavaScript for BitMinded website
// Handles component loading and other interactive features


// ===== PAGE READY CHECK =====

function checkPageReady() {
    // Check if translation is ready
    if (window.translationReady) {
        // Use the loading screen component if available
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('page', true);
        } else {
            // Fallback to old method
            document.documentElement.classList.add('page-loaded');
        }
    }
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    // BitMinded website initialized
    
    // Load Navigation Menu Component
    loadNavigationMenu();
    
    // Load Language Switcher Component
    loadLanguageSwitcher();
    
    // Load Site Footer and then Theme Switcher
    loadSiteFooter()
        .then(() => {
            return loadThemeSwitcher();
        })
        .catch(() => {
            // Even if footer fails, attempt to load theme switcher into fallback container
            return loadThemeSwitcher();
        });
    
    // Load Auth Buttons Component
    loadAuthButtons();
    
    // Defer Notification Center loading to ensure main content is indexed first
    // This helps search engines prioritize the main content over UI components
    setTimeout(() => {
        loadNotificationCenter();
    }, 500);
    
    // Account page specific initialization is now handled by account-page-loader.js
    
    // Any additional initialization code can go here
});

// ===== COMPONENT LOADING FUNCTIONS =====

async function loadNavigationMenu() {
    try {
        await componentLoader.load('navigation-menu', {
            container: 'header',
            priority: 'high'
        });
        // Navigation menu component loaded
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
        // Language switcher component loaded
    } catch (error) {
        console.error('❌ Failed to load language switcher component:', error);
    }
}

async function loadThemeSwitcher() {
    try {
        const footerThemeContainer = document.querySelector('#footer-theme-switcher') ? '#footer-theme-switcher' : 'footer';
        await componentLoader.load('theme-switcher', {
            container: footerThemeContainer,
            priority: 'medium'
        });
        // Theme switcher component loaded
    } catch (error) {
        console.error('❌ Failed to load theme switcher component:', error);
    }
}

async function loadNotificationCenter() {
    // Don't load notification center on auth page
    if (window.location.pathname.includes('/auth')) {
        return;
    }
    
    try {
        // Always load the notification center component
        // It will check auth internally and hide itself if not authenticated
        // This prevents duplicate getUser() calls that trigger token refreshes
        await componentLoader.load('notification-center', {
            container: 'header',
            priority: 'high'
        });
        // Notification center loaded silently
    } catch (error) {
        console.error('❌ Failed to load notification center component:', error);
    }
}

async function loadAuthButtons() {
    // Don't load auth buttons on auth page
    if (window.location.pathname.includes('/auth')) {
        // Skipping auth buttons on auth page
        return;
    }
    
        // Loading auth buttons component
    try {
        // Load auth buttons into header (for desktop positioning)
        await componentLoader.load('auth-buttons', {
            container: 'header',
            priority: 'high'
        });
        // Auth buttons component loaded
        
    } catch (error) {
        console.error('❌ Script: Failed to load auth buttons component:', error);
    }
}

async function loadSiteFooter() {
    try {
        await componentLoader.load('site-footer', {
            container: 'footer',
            priority: 'medium'
        });
        // Site footer component loaded
    } catch (error) {
        console.error('❌ Failed to load site footer component:', error);
        throw error;
    }
}

// ===== ACCOUNT PAGE FUNCTIONS =====
// These functions are used by account-page-loader.js

/**
 * Show error message on account page
 * @param {string} message - Error message to display
 */
function showAccountError(message) {
    const errorElement = document.getElementById('account-error');
    const errorMessageElement = document.getElementById('account-error-message');
    
    if (errorElement && errorMessageElement) {
        errorMessageElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

/**
 * Show success message on account page
 * @param {string} message - Success message to display
 */
function showAccountSuccess(message) {
    const successElement = document.getElementById('account-success');
    const successMessageElement = document.getElementById('account-success-message');
    
    if (successElement && successMessageElement) {
        successMessageElement.textContent = message;
        successElement.classList.remove('hidden');
    }
}

/**
 * Hide error message on account page
 */
function hideAccountError() {
    const errorElement = document.getElementById('account-error');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

/**
 * Hide success message on account page
 */
function hideAccountSuccess() {
    const successElement = document.getElementById('account-success');
    if (successElement) {
        successElement.classList.add('hidden');
    }
}

// Export account page functions for use by account-page-loader.js

window.accountPage = {
    showError: showAccountError,
    showSuccess: showAccountSuccess,
    hideError: hideAccountError,
    hideSuccess: hideAccountSuccess
};

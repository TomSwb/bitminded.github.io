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
    
    // Load Theme Switcher Component
    loadThemeSwitcher();
    
    // Load Notification Center Component (for authenticated users)
    loadNotificationCenter();
    
    // Load Auth Buttons Component
    loadAuthButtons();
    
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
        await componentLoader.load('theme-switcher', {
            container: 'footer',
            priority: 'medium'
        });
        // Theme switcher component loaded
    } catch (error) {
        console.error('❌ Failed to load theme switcher component:', error);
    }
}

async function loadNotificationCenter() {
    try {
        // Check if user is authenticated
        if (typeof supabase === 'undefined') {
            console.log('🔔 Supabase not ready, waiting...');
            setTimeout(loadNotificationCenter, 500);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('🔔 User not authenticated, skipping notification center');
            return;
        }

        await componentLoader.load('notification-center', {
            container: 'header',
            priority: 'high'
        });
        console.log('✅ Notification center component loaded');
    } catch (error) {
        console.error('❌ Failed to load notification center component:', error);
    }
}

async function loadAuthButtons() {
    // Don't load auth buttons on auth page
    if (window.location.pathname.includes('/auth')) {
        console.log('🔒 Skipping auth buttons load on auth page');
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

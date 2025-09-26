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
    
    // Account page specific initialization
    if (window.location.pathname.includes('/account')) {
        initializeAccountPage();
    }
    
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
    // Don't load auth buttons on auth page
    if (window.location.pathname.includes('/auth')) {
        console.log('🔒 Skipping auth buttons load on auth page');
        return;
    }
    
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

// ===== ACCOUNT PAGE INITIALIZATION =====

async function initializeAccountPage() {
    console.log('🔄 Script: Initializing account page...');
    
    try {
        // Check if user is authenticated
        await checkAuthenticationStatus();
        
        console.log('✅ Script: Account page initialized successfully');
        
    } catch (error) {
        console.error('❌ Script: Failed to initialize account page:', error);
    }
}

/**
 * Check if user is authenticated and redirect if not
 */
async function checkAuthenticationStatus() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase client not available');
            return;
        }

        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error) {
            console.error('❌ Error checking authentication:', error);
            showAccountError('Authentication check failed');
            return;
        }

        if (!user) {
            console.log('🔄 User not authenticated, redirecting to auth page...');
            window.location.href = '/auth/';
            return;
        }

        console.log('✅ User authenticated:', user.email);
        
        // TODO: Load user data and initialize account components
        // initializeAccountComponents(user);

    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        showAccountError('Authentication check failed');
    }
}

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

// Export account page functions for use by other scripts
window.accountPage = {
    showError: showAccountError,
    showSuccess: showAccountSuccess,
    hideError: hideAccountError,
    hideSuccess: hideAccountSuccess
};

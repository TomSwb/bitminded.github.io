/**
 * Auth Buttons Component
 * Handles authentication state and user interactions
 */

class AuthButtons {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.elements = {};
        this.translations = null;
        
        this.init();
    }

    /**
     * Initialize the auth buttons component
     */
    async init() {
        try {
            // Check if we're on the auth page and hide if so
            if (this.isOnAuthPage()) {
                this.hideOnAuthPage();
                return;
            }
            
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            await this.checkAuthState();
            
            // Add a delayed check to ensure auth state is properly detected after page load
            setTimeout(() => {
                this.checkAuthState();
            }, 1000);
            
            this.isInitialized = true;
            
            console.log('✅ Auth Buttons initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Auth Buttons:', error);
            this.showError('Failed to initialize authentication');
        }
    }

    /**
     * Check if we're currently on the authentication page
     * @returns {boolean} True if on auth page
     */
    isOnAuthPage() {
        const path = window.location.pathname;
        return path.includes('/auth/') || path.includes('/auth');
    }

    /**
     * Hide the auth buttons component when on auth page
     */
    hideOnAuthPage() {
        // Find the auth buttons container and hide it
        const authContainer = document.getElementById('auth-buttons');
        if (authContainer) {
            authContainer.style.display = 'none';
            console.log('🔒 Auth buttons hidden on auth page');
        }
        
        // Also hide any mobile auth buttons in navigation
        const mobileAuthContainer = document.querySelector('#mobile-auth-buttons');
        if (mobileAuthContainer) {
            mobileAuthContainer.style.display = 'none';
            console.log('🔒 Mobile auth buttons hidden on auth page');
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('auth-buttons'),
            loggedOut: document.getElementById('auth-buttons-logged-out'),
            loggedIn: document.getElementById('auth-buttons-logged-in'),
            userName: document.getElementById('auth-user-name'),
            logoutButton: document.getElementById('auth-logout-button'),
            loginButton: document.querySelector('[data-auth-action="login"]'),
            signupButton: document.querySelector('[data-auth-action="signup"]')
        };

        // Validate required elements
        const requiredElements = ['container', 'loggedOut', 'loggedIn'];
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                throw new Error(`Required element not found: ${elementName}`);
            }
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Logout button
        if (this.elements.logoutButton) {
            this.elements.logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Login/Signup buttons - add action parameter to URL
        if (this.elements.loginButton) {
            this.elements.loginButton.addEventListener('click', (e) => {
                this.elements.loginButton.href = '/auth/?action=login';
            });
        }

        if (this.elements.signupButton) {
            this.elements.signupButton.addEventListener('click', (e) => {
                this.elements.signupButton.href = '/auth/?action=signup';
            });
        }

        // Listen for auth state changes (defer until Supabase is available)
        this.setupSupabaseListener();

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            console.log('Auth buttons received language change event:', e.detail.language);
            
            // Don't refresh translations if we're on the auth page
            if (this.isOnAuthPage()) {
                console.log('🔒 Skipping auth buttons translation refresh on auth page');
                return;
            }
            
            this.refreshTranslations(e.detail.language);
        });
    }

    /**
     * Setup Supabase listener (with retry if not available)
     */
    setupSupabaseListener() {
        if (window.supabase && window.supabase.auth) {
            console.log('🔐 Setting up Supabase auth state listener');
            window.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state changed:', event, session?.user?.email);
                this.handleAuthStateChange(event, session);
            });
        } else {
            console.log('⏳ Supabase not ready, retrying in 100ms...');
            setTimeout(() => {
                this.setupSupabaseListener();
            }, 100);
        }
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('/components/auth-buttons/locales/auth-locales.json');
            
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Auth buttons translations loaded');
            } else {
                console.warn('Failed to load auth buttons translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load auth buttons translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update original auth-buttons elements
            const originalElementsToTranslate = this.elements.container?.querySelectorAll('[data-translate]');
            
            originalElementsToTranslate?.forEach(element => {
                const translationKey = element.getAttribute('data-translate');
                const translatedText = t[translationKey];
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });

            // No need to update cloned elements since we're using the same element
        }

        // Always show translatable content after translation attempt (even if no translations found)
        this.showTranslatableContent();
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        // Handle auth-buttons (same element, different containers)
        const originalElements = this.elements.container?.querySelectorAll('.translatable-content');
        originalElements?.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Get current language from language switcher or localStorage
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        if (window.languageSwitcher) {
            return window.languageSwitcher.getCurrentLanguage();
        }
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Check current authentication state
     */
    async checkAuthState() {
        try {
            console.log('🔐 Checking authentication state...');
            
            // Show loading screen if available
            if (window.loadingScreen) {
                window.loadingScreen.updateText('Checking authentication...');
            }

            if (!window.supabase || !window.supabase.auth) {
                console.log('❌ Supabase not available, showing logged out state');
                this.showLoggedOutState();
                return;
            }

            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Error getting session:', error);
                throw error;
            }

            if (session && session.user) {
                console.log('✅ User is logged in:', session.user.email);
                this.currentUser = session.user;
                this.showLoggedInState();
            } else {
                console.log('❌ No active session, showing logged out state');
                this.currentUser = null;
                this.showLoggedOutState();
            }
        } catch (error) {
            console.error('❌ Error checking auth state:', error);
            this.showLoggedOutState();
        }
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(event, session) {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
            console.log('✅ User signed in, updating UI');
            this.currentUser = session.user;
            this.showLoggedInState();
        } else if (event === 'SIGNED_OUT') {
            console.log('❌ User signed out, updating UI');
            this.currentUser = null;
            this.showLoggedOutState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, updating UI');
            this.currentUser = session.user;
            this.showLoggedInState();
        }
    }

    /**
     * Show logged out state
     */
    showLoggedOutState() {
        console.log('🔓 Showing logged out state');
        this.hideAllStates();
        if (this.elements.loggedOut) {
            this.elements.loggedOut.style.display = 'flex';
        }
    }

    /**
     * Show logged in state
     */
    showLoggedInState() {
        console.log('🔒 Showing logged in state');
        this.hideAllStates();
        if (this.elements.loggedIn) {
            // Ensure flex layout to match CSS and preserve spacing/gap
            this.elements.loggedIn.style.display = 'flex';
            this.elements.loggedIn.classList.remove('auth-buttons__logged-in--hidden');
            this.updateUserInfo();
        }
    }

    /**
     * Hide all states
     */
    hideAllStates() {
        if (this.elements.loggedOut) {
            this.elements.loggedOut.style.display = 'none';
        }
        if (this.elements.loggedIn) {
            this.elements.loggedIn.style.display = 'none';
            this.elements.loggedIn.classList.add('auth-buttons__logged-in--hidden');
        }
    }

    /**
     * Update user information display
     */
    updateUserInfo() {
        if (!this.currentUser) return;

        // Get translated "User" text
        const defaultUserName = this.translations?.[this.getCurrentLanguage()]?.translation?.['auth.user'] || 'User';

        // Update user name - only use username from user_metadata or email prefix as fallback
        if (this.elements.userName) {
            const displayName = this.currentUser.user_metadata?.username || 
                               this.currentUser.email?.split('@')[0] || 
                               defaultUserName;
            this.elements.userName.textContent = displayName;
        }
    }


    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            // Show loading screen if available
            if (window.loadingScreen) {
                window.loadingScreen.updateText('Logging out...');
            }

            if (!window.supabase || !window.supabase.auth) {
                this.showLoggedOutState();
                return;
            }

            const { error } = await window.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            // State change will be handled by the auth state change listener
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Error during logout:', error);
            this.showError('Failed to logout. Please try again.');
            this.showLoggedInState();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Auth Buttons Error:', message);
        // You could implement a toast notification system here
        // For now, we'll just log to console
    }

    /**
     * Refresh translations (called when language changes)
     * @param {string} language - Language code from event
     */
    refreshTranslations(language) {
        // Safety check: don't refresh if we're on auth page
        if (this.isOnAuthPage()) {
            console.log('🔒 Skipping auth buttons translation refresh on auth page (safety check)');
            return;
        }
        
        this.updateTranslations(language);
        // Update user info with new translations
        if (this.currentUser) {
            this.updateUserInfo();
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Remove event listeners
        if (this.elements.logoutButton) {
            this.elements.logoutButton.removeEventListener('click', this.handleLogout);
        }

        // Reset state
        this.isInitialized = false;
        this.currentUser = null;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Auth Buttons: DOM Content Loaded, checking for auth-buttons element...');
    // Only initialize if the auth-buttons element exists
    if (document.getElementById('auth-buttons')) {
        console.log('✅ Auth Buttons: Element found, initializing...');
        window.authButtons = new AuthButtons();
    } else {
        console.log('❌ Auth Buttons: Element not found, skipping initialization');
    }
});

// Component Loader Integration
// Expose the component for the component loader
window['auth-buttons'] = {
    init: function(config = {}) {
        // Find the auth-buttons element that was just loaded
        const element = document.getElementById('auth-buttons');
        if (element) {
            window.authButtons = new AuthButtons();
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthButtons;
}

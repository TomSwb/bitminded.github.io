/**
 * Auth Buttons Component
 * Handles authentication state and user interactions
 */

class AuthButtons {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.elements = {};
        this.dropdownOpen = false;
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
            userButton: document.getElementById('auth-user-button'),
            userDropdown: document.getElementById('auth-user-dropdown'),
            userName: document.getElementById('auth-user-name'),
            avatarText: document.getElementById('auth-avatar-text'),
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
        // User dropdown toggle
        if (this.elements.userButton) {
            this.elements.userButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDropdown();
            });
        }

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

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.dropdownOpen && !this.elements.userButton.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dropdownOpen) {
                this.closeDropdown();
            }
        });

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
            window.supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });
        } else {
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
            // Show loading screen if available
            if (window.loadingScreen) {
                window.loadingScreen.updateText('Checking authentication...');
            }

            if (!window.supabase || !window.supabase.auth) {
                this.showLoggedOutState();
                return;
            }

            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                throw error;
            }

            if (session && session.user) {
                this.currentUser = session.user;
                this.showLoggedInState();
            } else {
                this.currentUser = null;
                this.showLoggedOutState();
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.showLoggedOutState();
        }
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(event, session) {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
            this.currentUser = session.user;
            this.showLoggedInState();
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.showLoggedOutState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
            this.currentUser = session.user;
            this.showLoggedInState();
        }
    }

    /**
     * Show logged out state
     */
    showLoggedOutState() {
        this.hideAllStates();
        if (this.elements.loggedOut) {
            this.elements.loggedOut.style.display = 'flex';
        }
    }

    /**
     * Show logged in state
     */
    showLoggedInState() {
        this.hideAllStates();
        if (this.elements.loggedIn) {
            this.elements.loggedIn.style.display = 'block';
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

        // Update user name
        if (this.elements.userName) {
            const displayName = this.currentUser.user_metadata?.full_name || 
                               this.currentUser.user_metadata?.name || 
                               this.currentUser.email?.split('@')[0] || 
                               defaultUserName;
            this.elements.userName.textContent = displayName;
        }

        // Update avatar
        if (this.elements.avatarText) {
            const displayName = this.currentUser.user_metadata?.full_name || 
                               this.currentUser.user_metadata?.name || 
                               this.currentUser.email?.split('@')[0] || 
                               defaultUserName;
            this.elements.avatarText.textContent = displayName.charAt(0).toUpperCase();
        }
    }

    /**
     * Toggle user dropdown menu
     */
    toggleDropdown() {
        if (this.dropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open user dropdown menu
     */
    openDropdown() {
        if (this.elements.userDropdown && this.elements.userButton) {
            this.elements.userDropdown.style.display = 'block';
            this.elements.userDropdown.classList.remove('auth-buttons__dropdown--hidden');
            this.elements.userDropdown.classList.add('show');
            this.elements.userButton.setAttribute('aria-expanded', 'true');
            this.dropdownOpen = true;
        }
    }

    /**
     * Close user dropdown menu
     */
    closeDropdown() {
        if (this.elements.userDropdown && this.elements.userButton) {
            this.elements.userDropdown.classList.remove('show');
            this.elements.userButton.setAttribute('aria-expanded', 'false');
            this.dropdownOpen = false;
            
            // Hide after animation
            setTimeout(() => {
                if (this.elements.userDropdown) {
                    this.elements.userDropdown.style.display = 'none';
                    this.elements.userDropdown.classList.add('auth-buttons__dropdown--hidden');
                }
            }, 200);
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
        if (this.elements.userButton) {
            this.elements.userButton.removeEventListener('click', this.toggleDropdown);
        }
        
        if (this.elements.logoutButton) {
            this.elements.logoutButton.removeEventListener('click', this.handleLogout);
        }

        // Reset state
        this.isInitialized = false;
        this.currentUser = null;
        this.dropdownOpen = false;
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

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
        
        // Bind methods
        this.handleProfileUpdate = this.handleProfileUpdate.bind(this);
        
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
            
            // Don't call checkAuthState() manually - the auth state listener will handle it
            // This prevents duplicate getSession() calls that trigger token refreshes
            // The onAuthStateChange listener will fire INITIAL_SESSION or SIGNED_IN events
            
            this.isInitialized = true;
            
            // Set active state for account button if on account page
            this.updateAccountButtonActiveState();
            
            // Set active state for admin button if on admin page
            this.updateAdminButtonActiveState();
            
            // Auth Buttons initialized successfully
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Auth Buttons:', error);
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
            window.logger?.log('🔒 Auth buttons hidden on auth page');
        }
        
        // Also hide any mobile auth buttons in navigation
        const mobileAuthContainer = document.querySelector('#mobile-auth-buttons');
        if (mobileAuthContainer) {
            mobileAuthContainer.style.display = 'none';
            window.logger?.log('🔒 Mobile auth buttons hidden on auth page');
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
            adminButton: document.getElementById('auth-admin-button'),
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
        window.addEventListener('languageChanged', async (e) => {
            // Auth buttons received language change event
            
            // Don't refresh translations if we're on the auth page
            if (this.isOnAuthPage()) {
                window.logger?.log('🔒 Skipping auth buttons translation refresh on auth page');
                return;
            }
            
            await this.refreshTranslations(e.detail.language);
        });

        // Listen for profile updates (like username changes)
        window.addEventListener('profileUpdated', (e) => {
            window.logger?.log('🔄 Profile updated event received:', e.detail);
            this.handleProfileUpdate(e.detail);
        });
    }

    /**
     * Setup Supabase listener (with retry if not available)
     */
    setupSupabaseListener() {
        // Prevent duplicate listeners
        if (this.authStateSubscription) {
            window.logger?.log('⚠️ Auth listener already set up, skipping');
            return;
        }

        if (window.supabase && window.supabase.auth) {
            // Setting up Supabase auth state listener
            const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
                // Auth state changed
                this.handleAuthStateChange(event, session);
            });
            // Store subscription for cleanup
            this.authStateSubscription = subscription;
        } else {
            window.logger?.log('⏳ Supabase not ready, retrying in 100ms...');
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
                // Auth buttons translations loaded
            } else {
                window.logger?.warn('Failed to load auth buttons translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load auth buttons translations:', error);
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
            // Checking authentication state
            
            // Show loading screen if available
            if (window.loadingScreen) {
                window.loadingScreen.updateText('Checking authentication...');
            }

            if (!window.supabase || !window.supabase.auth) {
                window.logger?.log('❌ Supabase not available, showing logged out state');
                this.showLoggedOutState();
                return;
            }

            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                window.logger?.error('❌ Error getting session:', error);
                throw error;
            }

            if (session && session.user) {
                // User is logged in
                this.currentUser = session.user;
                await this.showLoggedInState();
            } else {
                window.logger?.log('❌ No active session, showing logged out state');
                this.currentUser = null;
                this.showLoggedOutState();
            }
        } catch (error) {
            window.logger?.error('❌ Error checking auth state:', error);
            this.showLoggedOutState();
        }
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(event, session) {
        // Check for expired tokens and force logout if needed
        if (session?.expires_at) {
            const expiresIn = session.expires_at - Math.floor(Date.now() / 1000);
            
            // If token is expired and this is INITIAL_SESSION, force logout
            if (event === 'INITIAL_SESSION' && expiresIn < 0) {
                window.logger?.warn('⚠️ Token is expired, forcing logout...');
                // Clear the stale session
                if (window.supabase) {
                    await window.supabase.auth.signOut();
                }
                this.currentUser = null;
                this.showLoggedOutState();
                return;
            }
        }
        
        if (event === 'SIGNED_IN' && session) {
            // User signed in, updating UI
            this.currentUser = session.user;
            await this.showLoggedInState();
        } else if (event === 'SIGNED_OUT') {
            window.logger?.log('❌ User signed out, updating UI');
            this.currentUser = null;
            this.showLoggedOutState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token refreshed silently (no UI update needed)
            // Just update the currentUser reference, don't trigger expensive UI updates
            this.currentUser = session.user;
            // NOTE: We don't call showLoggedInState() here because:
            // 1. Token refresh is a background operation
            // 2. showLoggedInState() -> updateUserInfo() -> DB query -> getSession() -> triggers another refresh
            // 3. This creates an infinite loop causing rate limit (429 errors)
        } else if (event === 'INITIAL_SESSION' && session) {
            // Initial session loaded, updating UI
            this.currentUser = session.user;
            await this.showLoggedInState();
        } else if (event === 'INITIAL_SESSION' && !session) {
            // No initial session - showing logged out state silently
            this.currentUser = null;
            this.showLoggedOutState();
        }
    }

    /**
     * Show logged out state
     */
    showLoggedOutState() {
        try {
            // Showing logged out state silently
            this.hideAllStates();
            if (this.elements.loggedOut) {
                this.elements.loggedOut.style.display = 'flex';
            } else {
                window.logger?.error('❌ Logged out element not found');
            }
        } catch (error) {
            window.logger?.error('❌ Error showing logged out state:', error);
        }
    }

    /**
     * Show logged in state
     */
    async showLoggedInState() {
        try {
            // Showing logged in state
            this.hideAllStates();
            if (this.elements.loggedIn) {
                // Ensure flex layout to match CSS and preserve spacing/gap
                this.elements.loggedIn.style.display = 'flex';
                this.elements.loggedIn.classList.remove('auth-buttons__logged-in--hidden');
                await this.updateUserInfo();
            } else {
                window.logger?.error('❌ Logged in element not found');
            }
        } catch (error) {
            window.logger?.error('❌ Error showing logged in state:', error);
            // Fallback: try to show logged out state
            this.showLoggedOutState();
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
     * Handle profile update events
     */
    async handleProfileUpdate(eventDetail) {
        try {
            window.logger?.log('🔄 Handling profile update in auth-buttons:', eventDetail);
            
            // If username was updated, refresh user data to get the new username
            if (eventDetail.component === 'username' && eventDetail.username) {
                // Update the current user's metadata with the new username
                if (this.currentUser) {
                    if (!this.currentUser.user_metadata) {
                        this.currentUser.user_metadata = {};
                    }
                    this.currentUser.user_metadata.username = eventDetail.username;
                }
                
                // Update the UI immediately with the new username
                await this.updateUserInfo();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to handle profile update in auth-buttons:', error);
        }
    }

    /**
     * Update user information display
     */
    async updateUserInfo() {
        try {
            if (!this.currentUser) return;

            // Get translated "User" text
            const defaultUserName = this.translations?.[this.getCurrentLanguage()]?.translation?.['auth.user'] || 'User';

            // Try to get username from user_metadata first
            let displayName = this.currentUser.user_metadata?.username;
            
            // Fallback to email prefix or default
            if (!displayName) {
                displayName = this.currentUser.email?.split('@')[0] || defaultUserName;
            }

            // Update the UI immediately with available data
            if (this.elements.userName) {
                this.elements.userName.textContent = displayName;
            }

            // Defer expensive DB queries to avoid blocking and triggering token refreshes
            // Use setTimeout to batch these queries and prevent them from blocking INITIAL_SESSION
            setTimeout(async () => {
                // Fetch username from DB if not in metadata (non-blocking)
                if (!this.currentUser?.user_metadata?.username && window.supabase) {
                    try {
                        const { data: profile, error } = await window.supabase
                            .from('user_profiles')
                            .select('username')
                            .eq('id', this.currentUser.id)
                            .single();
                        
                        if (!error && profile?.username) {
                            // Update user_metadata for future use
                            if (!this.currentUser.user_metadata) {
                                this.currentUser.user_metadata = {};
                            }
                            this.currentUser.user_metadata.username = profile.username;
                            
                            // Update UI with fetched username
                            if (this.elements.userName) {
                                this.elements.userName.textContent = profile.username;
                            }
                        }
                    } catch (error) {
                        window.logger?.warn('Failed to fetch username from profile:', error);
                    }
                }
                
                // Check admin role (non-blocking)
                await this.updateAdminButton();
            }, 100);
            
        } catch (error) {
            window.logger?.error('Error updating user info:', error);
            // Fallback to basic display
            if (this.elements.userName && this.currentUser) {
                const displayName = this.currentUser.email?.split('@')[0] || 'User';
                this.elements.userName.textContent = displayName;
            }
        }
    }

    /**
     * Check if current user has admin role
     * @returns {boolean} True if user is admin
     */
    async checkAdminRole() {
        try {
            if (!this.currentUser || !window.supabase) {
                window.logger?.log('🔍 Admin check: No user or Supabase');
                return false;
            }


            const { data, error } = await window.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', this.currentUser.id)
                .eq('role', 'admin')
                .maybeSingle(); // Use maybeSingle instead of single to avoid error when no row
            
            if (error) {
                window.logger?.error('❌ Error checking admin role:', error);
                return false;
            }

            const isAdmin = !!(data && data.role === 'admin');
            
            return isAdmin;
        } catch (error) {
            window.logger?.error('❌ Failed to check admin role:', error);
            return false;
        }
    }

    /**
     * Update admin button visibility based on user role
     */
    async updateAdminButton() {
        try {
            const isAdmin = await this.checkAdminRole();
            
            // Update ALL admin buttons (original + mobile clone)
            const allAdminButtons = document.querySelectorAll('#auth-admin-button');
            
            allAdminButtons.forEach((button) => {
                if (isAdmin === true) {
                    button.classList.remove('auth-buttons__button--hidden');
                } else {
                    button.classList.add('auth-buttons__button--hidden');
                }
            });

            // Update active state if on admin page (only if showing)
            if (isAdmin) {
                this.updateAdminButtonActiveState();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to update admin button:', error);
            // Ensure all buttons are hidden on error
            const allAdminButtons = document.querySelectorAll('#auth-admin-button');
            allAdminButtons.forEach(button => {
                button.classList.add('auth-buttons__button--hidden');
            });
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
                // Redirect to home page even if Supabase is not available
                window.location.href = '/';
                return;
            }

            // Get current session before signing out (to clean up user_sessions)
            const { data: { session } } = await window.supabase.auth.getSession();
            const sessionToken = session?.access_token;

            // Clean up user_sessions table BEFORE signing out (need auth context)
            if (sessionToken) {
                try {
                    await window.supabase.functions.invoke('revoke-session', {
                        body: { 
                            session_id: sessionToken,
                            allow_current_session: true  // Allow revoking current session during logout
                        }
                    });
                    window.logger?.log('✅ Session cleaned up from user_sessions');
                } catch (cleanupError) {
                    window.logger?.warn('⚠️ Could not clean up session:', cleanupError);
                    // Don't fail logout if cleanup fails
                }
            }

            // Sign out from Supabase (do this AFTER cleanup)
            const { error } = await window.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            // State change will be handled by the auth state change listener
            window.logger?.log('User logged out successfully');
            
            // Redirect to home page after successful logout
            window.location.href = '/';
        } catch (error) {
            window.logger?.error('Error during logout:', error);
            this.showError('Failed to logout. Please try again.');
            this.showLoggedInState();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        window.logger?.error('Auth Buttons Error:', message);
        // You could implement a toast notification system here
        // For now, we'll just log to console
    }

    /**
     * Refresh translations (called when language changes)
     * @param {string} language - Language code from event
     */
    async refreshTranslations(language) {
        // Safety check: don't refresh if we're on auth page
        if (this.isOnAuthPage()) {
            window.logger?.log('🔒 Skipping auth buttons translation refresh on auth page (safety check)');
            return;
        }
        
        this.updateTranslations(language);
        // Update user info with new translations
        if (this.currentUser) {
            await this.updateUserInfo();
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
     * Update active state for account button based on current page
     */
    updateAccountButtonActiveState() {
        const accountButton = document.getElementById('auth-account-button');
        if (!accountButton) {
            return;
        }

        const isOnAccountPage = window.location.pathname.includes('/account');
        accountButton.classList.toggle('active', isOnAccountPage);
        
        if (isOnAccountPage) {
            // Account button set to active state
        }
    }

    /**
     * Update active state for admin button based on current page
     */
    updateAdminButtonActiveState() {
        const adminButton = document.getElementById('auth-admin-button');
        if (!adminButton) {
            return;
        }

        const isOnAdminPage = window.location.pathname.includes('/admin');
        adminButton.classList.toggle('active', isOnAdminPage);
        
        if (isOnAdminPage) {
        }
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Remove event listeners
        if (this.elements.logoutButton) {
            this.elements.logoutButton.removeEventListener('click', this.handleLogout);
        }

        // Remove profile update event listener
        window.removeEventListener('profileUpdated', this.handleProfileUpdate);

        // Unsubscribe from auth state changes
        if (this.authStateSubscription) {
            this.authStateSubscription.unsubscribe();
            this.authStateSubscription = null;
        }

        // Reset state
        this.isInitialized = false;
        this.currentUser = null;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.logger?.log('🔄 Auth Buttons: DOM Content Loaded, checking for auth-buttons element...');
    
    // Prevent duplicate initialization
    if (window.authButtons) {
        window.logger?.log('⚠️ Auth Buttons already initialized, skipping DOMContentLoaded init');
        return;
    }
    
    // Only initialize if the auth-buttons element exists
    if (document.getElementById('auth-buttons')) {
        window.logger?.log('✅ Auth Buttons: Element found, initializing...');
        window.authButtons = new AuthButtons();
    } else {
        window.logger?.log('❌ Auth Buttons: Element not found, skipping initialization');
    }
});

// Component Loader Integration
// Expose the component for the component loader
window['auth-buttons'] = {
    init: function(config = {}) {
        // Prevent duplicate initialization
        if (window.authButtons) {
            window.logger?.log('⚠️ Auth Buttons already initialized, skipping component loader init');
            return;
        }
        
        // Find the auth-buttons element that was just loaded
        const element = document.getElementById('auth-buttons');
        if (element) {
            // Auth buttons initializing silently
            window.authButtons = new AuthButtons();
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthButtons;
}

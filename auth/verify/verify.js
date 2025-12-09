/**
 * Email Verification Page
 * Handles email verification from Supabase auth links
 */
class EmailVerification {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
    }

    /**
     * Initialize the email verification page
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            await this.handleVerification();
            this.isInitialized = true;
            
            window.logger?.log('✅ Email Verification initialized successfully');
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Email Verification:', error);
            this.showError('Failed to initialize verification');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            loading: document.getElementById('verify-loading'),
            success: document.getElementById('verify-success'),
            error: document.getElementById('verify-error'),
            errorMessage: document.getElementById('verify-error-message'),
            resendButton: document.getElementById('resend-verification-btn')
        };
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('locales/verify-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                window.logger?.log('✅ Verify page translations loaded');
            } else {
                window.logger?.warn('Failed to load verify page translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load verify page translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (this.translations?.[language]) {
            const t = this.translations[language].translation;
            
            // Update all translatable elements
            const translatableElements = document.querySelectorAll('[data-translate]');
            translatableElements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translatedText = t[key];
                if (translatedText) {
                    element.textContent = translatedText;
                }
            });
        }

        // Show translatable content
        this.showTranslatableContent();
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
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
     * Get translation for a given key
     * @param {string} key - Translation key
     * @returns {string|null} Translated text or null if not found
     */
    getTranslation(key) {
        if (!this.translations) return null;
        
        const language = this.getCurrentLanguage();
        const translation = this.translations[language]?.translation?.[key];
        return translation || null;
    }

    /**
     * Handle email verification process
     */
    async handleVerification() {
        try {
            window.logger?.log('🔧 Verify page loaded, starting verification process...');
            window.logger?.log('🔧 Current URL:', window.location.href);
            
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Parse URL parameters
            const urlParams = this.parseUrlParameters();
            
            window.logger?.log('🔍 URL parameters found:', urlParams);
            window.logger?.log('🔍 Full URL:', window.location.href);
            window.logger?.log('🔍 Hash:', window.location.hash);
            window.logger?.log('🔍 Search:', window.location.search);
            
            // Handle custom email change verification
            if (urlParams.type === 'email_change' && urlParams.token) {
                window.logger?.log('🔄 Processing custom email change verification...');
                window.logger?.log('🔄 Token:', urlParams.token);
                window.logger?.log('🔄 Type:', urlParams.type);
                
                // Verify the custom token with our Edge Function
                const data = await window.invokeEdgeFunction('verify-email-change', {
                    body: {
                        token: urlParams.token
                    }
                });
                
                window.logger?.log('📧 Email change verification response:', { data });
                
                if (!data.success) {
                    throw new Error(data.error || 'Email change verification failed');
                }
                
                window.logger?.log('✅ Email change verification successful');
                window.logger?.log('✅ New email:', data.newEmail);
                
                this.showSuccess();
                // Redirect to account profile after 3 seconds
                setTimeout(() => {
                    window.location.href = '/account/?section=profile';
                }, 3000);
                return;
            }
            
            // Handle regular signup verification
            if (!urlParams.access_token) {
                // Check if we can get the session from Supabase directly
                const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
                
                if (sessionError) {
                    window.logger?.error('Session error:', sessionError);
                }
                
                if (sessionData?.session?.user) {
                    window.logger?.log('✅ Found existing session, user already verified');
                    
                    // Log the login activity if this is their first verified session
                    try {
                        await window.invokeEdgeFunction('log-login', {
                            body: { user_id: sessionData.session.user.id }
                        });
                        window.logger?.log('✅ Login activity logged');
                    } catch (logError) {
                        window.logger?.warn('⚠️ Failed to log login activity:', logError);
                    }
                    
                    this.showSuccess();
                    return;
                }
                
                throw new Error('No access token found in URL and no existing session');
            }

            window.logger?.log('🔄 Processing email verification...');

            // Set the session using the access token
            const { data, error } = await window.supabase.auth.setSession({
                access_token: urlParams.access_token,
                refresh_token: urlParams.refresh_token
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                window.logger?.log('✅ Email verification successful');
                
                // Log the login activity for first-time login after email verification
                try {
                    await window.invokeEdgeFunction('log-login', {
                        body: { user_id: data.user.id }
                    });
                    window.logger?.log('✅ Login activity logged');
                } catch (logErr) {
                    window.logger?.warn('⚠️ Error logging login activity:', logErr);
                    // Continue anyway - this is not critical
                }
                
                this.showSuccess();
            } else {
                throw new Error('No user data received');
            }

        } catch (error) {
            window.logger?.error('❌ Email verification failed:', error);
            this.showError(error.message);
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Bind resend button click event
        if (this.elements.resendButton) {
            this.elements.resendButton.addEventListener('click', () => {
                this.handleResendVerification();
            });
        }
    }

    /**
     * Wait for Supabase to be available
     */
    async waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabase) {
            throw new Error('Supabase client not available');
        }
    }

    /**
     * Parse URL parameters from hash and search
     * @returns {Object} Parsed parameters
     */
    parseUrlParameters() {
        const params = {};
        
        window.logger?.log('🔍 Parsing URL parameters...');
        window.logger?.log('Full URL:', window.location.href);
        window.logger?.log('Hash:', window.location.hash);
        window.logger?.log('Search:', window.location.search);
        
        // Parse search parameters first (production)
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.size > 0) {
            window.logger?.log('Search params:', Object.fromEntries(searchParams.entries()));
            
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        
        // Parse hash parameters (Supabase auth uses hash, and live server fallback)
        const hash = window.location.hash.substring(1);
        if (hash) {
            const hashParams = new URLSearchParams(hash);
            window.logger?.log('Hash params:', Object.fromEntries(hashParams.entries()));
            
            hashParams.forEach((value, key) => {
                // Only use hash params if search params don't have this key (live server fallback)
                if (!params[key]) {
                    params[key] = value;
                }
            });
        }
        
        window.logger?.log('Final parsed params:', params);
        return params;
    }

    /**
     * Show success state
     */
    showSuccess() {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.success.classList.remove('hidden');
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        this.elements.loading.classList.add('hidden');
        this.elements.success.classList.add('hidden');
        this.elements.error.classList.remove('hidden');
        
        // Update error message
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
    }

    /**
     * Handle resend verification email
     */
    async handleResendVerification() {
        if (!this.elements.resendButton) return;

        try {
            // Disable button and show loading state
            this.elements.resendButton.disabled = true;
            const originalText = this.elements.resendButton.textContent;
            this.elements.resendButton.textContent = this.getTranslation('verify.resending') || 'Sending...';

            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Get user email from URL parameters or session
            const urlParams = this.parseUrlParameters();
            let userEmail = null;

            // Try to get email from URL parameters first
            if (urlParams.email) {
                userEmail = urlParams.email;
            } else {
                // Try to get from current session
                const { data: sessionData } = await window.supabase.auth.getSession();
                if (sessionData?.session?.user?.email) {
                    userEmail = sessionData.session.user.email;
                }
            }

            if (!userEmail) {
                throw new Error('No email address found for resending verification');
            }

            window.logger?.log('🔄 Resending verification email to:', userEmail);

            // Resend verification email
            const { error } = await window.supabase.auth.resend({
                type: 'signup',
                email: userEmail
            });

            if (error) {
                throw error;
            }

            // Show success message
            const successMessage = this.getTranslation('verify.resendSuccess') || 'Verification email sent! Please check your inbox.';
            alert(successMessage);

            window.logger?.log('✅ Verification email resent successfully');

        } catch (error) {
            window.logger?.error('❌ Failed to resend verification email:', error);
            const errorMessage = this.getTranslation('verify.resendError') || 'Failed to resend email. Please try again.';
            alert(errorMessage);
        } finally {
            // Re-enable button and restore original text
            this.elements.resendButton.disabled = false;
            this.elements.resendButton.textContent = this.getTranslation('verify.resendEmail') || 'Resend Verification Email';
        }
    }
}

// Create global instance
window.emailVerification = new EmailVerification();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.emailVerification && !window.emailVerification.isInitialized) {
            window.emailVerification.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailVerification;
}

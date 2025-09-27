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
            
            console.log('✅ Email Verification initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Email Verification:', error);
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
                console.log('✅ Verify page translations loaded');
            } else {
                console.warn('Failed to load verify page translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load verify page translations:', error);
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
            console.log('🔧 Verify page loaded, starting verification process...');
            console.log('🔧 Current URL:', window.location.href);
            
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Parse URL parameters
            const urlParams = this.parseUrlParameters();
            
            console.log('🔍 URL parameters found:', urlParams);
            console.log('🔍 Full URL:', window.location.href);
            console.log('🔍 Hash:', window.location.hash);
            console.log('🔍 Search:', window.location.search);
            
            // Handle email change verification
            if (urlParams.type === 'email_change' && urlParams.token) {
                console.log('🔄 Processing email change verification...');
                console.log('🔄 Token:', urlParams.token);
                console.log('🔄 Type:', urlParams.type);
                
                const { data, error } = await window.supabase.auth.verifyOtp({
                    token_hash: urlParams.token,
                    type: 'email_change'
                });
                
                console.log('📧 Email change verification response:', { data, error });
                
                if (error) {
                    throw error;
                }
                
                if (data.user) {
                    console.log('✅ Email change verification successful');
                    console.log('✅ User after email change:', data.user);
                    console.log('✅ User email after change:', data.user.email);
                    this.showSuccess();
                    // Redirect to account profile after 3 seconds
                    setTimeout(() => {
                        window.location.href = '/account/?section=profile';
                    }, 3000);
                    return;
                } else {
                    throw new Error('No user data received from email change verification');
                }
            }
            
            // Handle regular signup verification
            if (!urlParams.access_token) {
                // Check if we can get the session from Supabase directly
                const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Session error:', sessionError);
                }
                
                if (sessionData?.session?.user) {
                    console.log('✅ Found existing session, user already verified');
                    this.showSuccess();
                    return;
                }
                
                throw new Error('No access token found in URL and no existing session');
            }

            console.log('🔄 Processing email verification...');

            // Set the session using the access token
            const { data, error } = await window.supabase.auth.setSession({
                access_token: urlParams.access_token,
                refresh_token: urlParams.refresh_token
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                console.log('✅ Email verification successful');
                this.showSuccess();
            } else {
                throw new Error('No user data received');
            }

        } catch (error) {
            console.error('❌ Email verification failed:', error);
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
        
        console.log('🔍 Parsing URL parameters...');
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
        // Parse hash parameters (Supabase auth uses hash)
        const hash = window.location.hash.substring(1);
        if (hash) {
            const hashParams = new URLSearchParams(hash);
            console.log('Hash params:', Object.fromEntries(hashParams.entries()));
            
            hashParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        
        // Parse search parameters
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.size > 0) {
            console.log('Search params:', Object.fromEntries(searchParams.entries()));
            
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        
        console.log('Final parsed params:', params);
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

            console.log('🔄 Resending verification email to:', userEmail);

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

            console.log('✅ Verification email resent successfully');

        } catch (error) {
            console.error('❌ Failed to resend verification email:', error);
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

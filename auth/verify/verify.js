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
            errorMessage: document.getElementById('verify-error-message')
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
            // Wait for Supabase to be available
            await this.waitForSupabase();

            // Parse URL parameters
            const urlParams = this.parseUrlParameters();
            
            console.log('🔍 URL parameters found:', urlParams);
            
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

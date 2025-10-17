/**
 * Language Switcher Component
 * Handles language switching functionality with event system
 */
class LanguageSwitcher {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.element = null;
        this.buttons = [];
        this.isInitialized = false;
        this.eventListeners = new Map();
    }

    /**
     * Initialize the language switcher component
     * @param {Object} config - Configuration options
     */
    init(config = {}) {
        if (this.isInitialized) {
            console.log('Language switcher already initialized');
            return;
        }

        // Initializing language switcher

        this.config = {
            compact: false,
            showFlags: true,
            showText: true,
            ...config
        };

        this.element = document.getElementById('language-switcher');
        if (!this.element) {
            console.error('❌ Language switcher element not found');
            return;
        }

        // Language switcher element found

        this.toggleButton = document.getElementById('language-switcher-toggle');
        this.dropdown = document.getElementById('language-switcher-dropdown');
        this.isOpen = false;

        // Sync with i18next instance if available
        this.syncWithI18next();

        this.setupComponent();
        this.bindEvents();
        this.updateActiveLanguage();
        this.setAccessibilityAttributes();
        
        this.isInitialized = true;
        // Language switcher initialized successfully
    }

    /**
     * Sync with i18next instance to get current language
     */
    syncWithI18next() {
        // Syncing with i18next
        
        if (typeof i18next !== 'undefined' && i18next.language) {
            this.currentLanguage = i18next.language;
        } else {
            this.currentLanguage = localStorage.getItem('language') || 'en';
        }
    }

    /**
     * Setup component based on configuration
     */
    setupComponent() {
        // Apply compact mode if configured
        if (this.config.compact) {
            this.element.classList.add('compact');
        }

        // Hide flags if not wanted
        if (!this.config.showFlags) {
            const flags = this.element.querySelectorAll('.language-switcher__flag');
            flags.forEach(flag => flag.style.display = 'none');
        }

        // Hide text if not wanted
        if (!this.config.showText) {
            const texts = this.element.querySelectorAll('.language-switcher__text');
            texts.forEach(text => text.style.display = 'none');
        }

        // Get all language buttons
        this.buttons = this.element.querySelectorAll('.language-switcher__button');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle button click
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Language button clicks
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.changeLanguage(lang);
                this.closeDropdown();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.element.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close dropdown on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
                this.toggleButton?.focus();
            }
        });

        // Listen for language changes from other sources
        window.addEventListener('languageChanged', (e) => {
            if (e.detail.language !== this.currentLanguage) {
                this.updateActiveLanguage(e.detail.language);
            }
        });
    }

    /**
     * Set accessibility attributes for language buttons
     */
    setAccessibilityAttributes() {
        this.buttons.forEach(button => {
            const lang = button.dataset.lang;
            const languageNames = {
                'en': 'English',
                'es': 'Español',
                'fr': 'Français',
                'de': 'Deutsch'
            };
            
            const languageName = languageNames[lang] || lang;
            button.setAttribute('aria-label', `Switch to ${languageName}`);
            button.setAttribute('title', languageName);
        });
    }

    /**
     * Toggle dropdown open/closed
     */
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open dropdown
     */
    openDropdown() {
        this.isOpen = true;
        this.dropdown?.classList.add('open');
        this.toggleButton?.setAttribute('aria-expanded', 'true');
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        this.isOpen = false;
        this.dropdown?.classList.remove('open');
        this.toggleButton?.setAttribute('aria-expanded', 'false');
    }

    /**
     * Change language and emit event
     * @param {string} language - Language code to switch to
     */
    changeLanguage(language) {
        if (language === this.currentLanguage) {
            console.log('Language already set to:', language);
            this.closeDropdown();
            return;
        }

        // Changing language silently

        // Show loading animation
        this.showLoadingAnimation();

        // Update current language
        this.currentLanguage = language;
        localStorage.setItem('language', language);

        // Update active button immediately
        this.updateActiveLanguage(language);

        // Save to database if user is authenticated
        this.saveLanguageToDatabase(language);

        // Emit language change event
        this.emitLanguageChangeEvent(language);

        // Call global changeLanguage function if it exists
        if (typeof window.changeLanguage === 'function') {
            // Calling changeLanguage silently
            window.changeLanguage(language);
        } else {
            console.warn('Global changeLanguage function not found');
        }

        // Update i18next directly if available
        if (typeof i18next !== 'undefined' && i18next.changeLanguage) {
            // Updating i18next silently
            i18next.changeLanguage(language);
        }
        
        // Language change completed silently
    }

    /**
     * Save language preference to database for authenticated users
     * @param {string} language - Language to save
     */
    async saveLanguageToDatabase(language) {
        try {
            // Check if Supabase is available
            if (typeof window.supabase === 'undefined') {
                console.log('Supabase not available, skipping database save');
                return;
            }

            // Check if user is authenticated
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                // Language saved to localStorage silently
                return;
            }

            // Update language in database
            const { error } = await window.supabase
                .from('user_preferences')
                .update({ language: language })
                .eq('user_id', user.id);

            if (error) {
                console.error('Failed to save language to database:', error);
            } else {
                console.log(`✅ Language saved to database: ${language}`);
            }

        } catch (error) {
            console.error('Error saving language to database:', error);
            // Don't fail the language change if database save fails
        }
    }

    /**
     * Update active language button
     * @param {string} language - Language to set as active
     */
    updateActiveLanguage(language = this.currentLanguage) {
        this.buttons.forEach(button => {
            const isActive = button.dataset.lang === language;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Show loading animation on buttons
     */
    showLoadingAnimation() {
        this.buttons.forEach(button => {
            button.classList.add('changing');
            setTimeout(() => {
                button.classList.remove('changing');
            }, 300);
        });
    }

    /**
     * Emit language change event
     * @param {string} language - New language
     */
    emitLanguageChangeEvent(language) {
        const event = new CustomEvent('languageChanged', {
            detail: {
                language: language,
                previousLanguage: this.currentLanguage,
                source: 'language-switcher'
            },
            bubbles: true
        });
        
        window.dispatchEvent(event);
        // Language change event emitted silently
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set compact mode
     * @param {boolean} compact - Whether to enable compact mode
     */
    setCompactMode(compact) {
        this.element.classList.toggle('compact', compact);
        this.config.compact = compact;
    }

    /**
     * Add event listener for language changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        window.addEventListener(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        window.removeEventListener(event, callback);
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach((listeners, event) => {
            listeners.forEach(callback => {
                window.removeEventListener(event, callback);
            });
        });
        this.eventListeners.clear();

        // Remove button event listeners
        this.buttons.forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });

        this.isInitialized = false;
        console.log('🗑️ Language switcher destroyed');
    }
}

// Create global instance
window.languageSwitcher = new LanguageSwitcher();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.languageSwitcher && !window.languageSwitcher.isInitialized) {
            window.languageSwitcher.init();
        }
    }, 200);
});

// Also try to initialize when the component is loaded
window.addEventListener('load', () => {
    if (window.languageSwitcher && !window.languageSwitcher.isInitialized) {
        window.languageSwitcher.init();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageSwitcher;
}

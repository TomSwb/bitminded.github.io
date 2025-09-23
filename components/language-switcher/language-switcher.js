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

        console.log('🔄 Initializing language switcher...');

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

        console.log('✅ Language switcher element found:', this.element);

        // Sync with i18next instance if available
        this.syncWithI18next();

        this.setupComponent();
        this.bindEvents();
        this.updateActiveLanguage();
        this.loadTranslations();
        
        this.isInitialized = true;
        console.log('✅ Language switcher initialized successfully');
    }

    /**
     * Sync with i18next instance to get current language
     */
    syncWithI18next() {
        console.log('🔄 Syncing with i18next...');
        
        // Debug logging
        console.log('Browser language:', navigator.language);
        console.log('Stored language:', localStorage.getItem('language'));
        console.log('i18next available:', typeof i18next !== 'undefined');
        
        if (typeof i18next !== 'undefined') {
            console.log('i18next language:', i18next.language);
            console.log('i18next isInitialized:', i18next.isInitialized);
            
            // Use i18next's current language if available
            if (i18next.language) {
                this.currentLanguage = i18next.language;
                console.log('✅ Synced with i18next language:', this.currentLanguage);
            }
        }
        
        // Fallback to localStorage if i18next not ready
        if (!this.currentLanguage) {
            this.currentLanguage = localStorage.getItem('language') || 'en';
            console.log('📦 Using localStorage language:', this.currentLanguage);
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
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.changeLanguage(lang);
            });
        });

        // Listen for language changes from other sources
        window.addEventListener('languageChanged', (e) => {
            if (e.detail.language !== this.currentLanguage) {
                this.updateActiveLanguage(e.detail.language);
            }
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            // Use absolute path from root to avoid subdirectory issues
            const response = await fetch('/components/language-switcher/locales/language-switcher-locales.json');
            if (response.ok) {
                const translations = await response.json();
                this.translations = translations;
                this.updateComponentTranslations();
                console.log('✅ Language switcher translations loaded');
            } else {
                console.warn('Failed to load language switcher translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load language switcher translations:', error);
        }
    }

    /**
     * Update component translations based on current language
     */
    updateComponentTranslations() {
        if (!this.translations?.[this.currentLanguage]) {
            return;
        }

        const t = this.translations[this.currentLanguage].translation;
        
        // Update button labels
        this.buttons.forEach(button => {
            const lang = button.dataset.lang;
            const ariaLabel = t[`lang-${lang}-label`];
            const title = t[`lang-${lang}-title`];
            
            if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
            if (title) button.setAttribute('title', title);
        });
    }

    /**
     * Change language and emit event
     * @param {string} language - Language code to switch to
     */
    changeLanguage(language) {
        if (language === this.currentLanguage) {
            console.log('Language already set to:', language);
            return;
        }

        console.log(`🔄 Changing language from ${this.currentLanguage} to: ${language}`);

        // Show loading animation
        this.showLoadingAnimation();

        // Update current language
        this.currentLanguage = language;
        localStorage.setItem('language', language);

        // Update active button immediately
        this.updateActiveLanguage(language);

        // Emit language change event
        this.emitLanguageChangeEvent(language);

        // Call global changeLanguage function if it exists
        if (typeof window.changeLanguage === 'function') {
            console.log('Calling global changeLanguage function');
            window.changeLanguage(language);
        } else {
            console.warn('Global changeLanguage function not found');
        }

        // Update i18next directly if available
        if (typeof i18next !== 'undefined' && i18next.changeLanguage) {
            console.log('Updating i18next language');
            i18next.changeLanguage(language);
        }

        // Update component translations
        this.updateComponentTranslations();
        
        console.log('✅ Language change completed');
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
        console.log(`📢 Language change event emitted: ${language}`);
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

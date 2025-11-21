/**
 * Terms Checkbox Component
 * Handles the terms and conditions checkbox for signup
 */
class TermsCheckbox {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.translations = null;
        
        this.init();
    }

    /**
     * Initialize the terms checkbox component
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadTranslations();
            this.isInitialized = true;
            
            // Terms Checkbox initialized silently
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Terms Checkbox:', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('terms-checkbox'),
            input: document.getElementById('terms-checkbox-input'),
            error: document.getElementById('terms-checkbox-error')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.input) return;

        // Real-time validation
        this.elements.input.addEventListener('change', () => this.validate());

        // Listen for language changes
        window.addEventListener('languageChanged', async (e) => {
            // If translations aren't loaded yet, load them first
            if (!this.translations) {
                await this.loadTranslations();
            }
            this.updateTranslations(e.detail.language);
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('components/signup-form/locales/signup-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                // Translations loaded silently
            } else {
                window.logger?.warn('Failed to load terms checkbox translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load terms checkbox translations:', error);
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
            const translatableElements = this.elements.container.querySelectorAll('[data-translate]');
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
        const translatableElements = this.elements.container.querySelectorAll('.translatable-content');
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
     * Validate the checkbox
     * @returns {boolean} True if valid
     */
    validate() {
        if (!this.elements.input.checked) {
            this.showError('You must agree to the terms and conditions');
            return false;
        }

        this.clearError();
        return true;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.elements.error) {
            this.elements.error.textContent = message;
            this.elements.error.classList.add('show');
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        if (this.elements.error) {
            this.elements.error.textContent = '';
            this.elements.error.classList.remove('show');
        }
    }

    /**
     * Check if the checkbox is checked
     * @returns {boolean} True if checked
     */
    isChecked() {
        return this.elements.input ? this.elements.input.checked : false;
    }

    /**
     * Reset the checkbox to unchecked state
     */
    reset() {
        if (this.elements.input) {
            this.elements.input.checked = false;
        }
        this.clearError();
    }
}

// Create global instance
window.termsCheckbox = new TermsCheckbox();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.termsCheckbox && !window.termsCheckbox.isInitialized) {
            window.termsCheckbox.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsCheckbox;
}

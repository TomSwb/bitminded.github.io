/**
 * Login Activity Filters Translations
 * Handles translation loading and updates for the login activity filters component
 */
class LoginActivityFiltersTranslations {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
        this.isLoaded = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadTranslations();
            this.isLoaded = true;
            window.logger?.log('✅ Login Activity Filters translations loaded');
            
            // Initialize translations
            this.updateTranslations();
            window.logger?.log('✅ Login Activity Filters translations initialized');
            
            // Listen for language changes
            window.addEventListener('languageChanged', () => {
                this.updateTranslations();
            });
            
        } catch (error) {
            window.logger?.error('❌ Failed to load Login Activity Filters translations:', error);
        }
    }

    /**
     * Load translations from JSON file
     */
    async loadTranslations() {
        try {
            const response = await fetch('/admin/components/user-detail/components/login-activity-filters/locales/login-activity-filters-locales.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();
            window.logger?.log('✅ Login Activity Filters translations loaded');
        } catch (error) {
            window.logger?.error('❌ Failed to load Login Activity Filters translations:', error);
            // Fallback to English
            this.translations = {
                en: {
                    "date_range": "Date Range",
                    "last_24_hours": "Last 24 Hours",
                    "last_7_days": "Last 7 Days",
                    "last_30_days": "Last 30 Days",
                    "last_90_days": "Last 90 Days",
                    "all_time": "All Time",
                    "status": "Status",
                    "select_status": "Select Status",
                    "device_type": "Device Type",
                    "select_device_type": "Select Device Type",
                    "browser": "Browser",
                    "select_browser": "Select Browser",
                    "location": "Location",
                    "select_location": "Select Location",
                    "two_factor_auth": "2FA",
                    "select_2fa": "Select 2FA",
                    "used_2fa": "Used 2FA",
                    "no_2fa": "No 2FA",
                    "showing_all_activities": "Showing all activities",
                    "clear_all_filters": "Clear All Filters",
                    "select_all": "Select All",
                    "deselect_all": "Deselect All"
                }
            };
        }
    }

    /**
     * Update translations for current language
     */
    updateTranslations() {
        // Get current language from global i18next or default to 'en'
        if (window.i18next && window.i18next.language) {
            this.currentLanguage = window.i18next.language.split('-')[0]; // Get language code without country
        }

        const currentTranslations = this.translations[this.currentLanguage] || this.translations['en'];
        
        // Update all elements with data-translation-key
        const elements = document.querySelectorAll('[data-translation-key]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translation-key');
            if (currentTranslations[key]) {
                element.textContent = currentTranslations[key];
            }
        });

        window.logger?.log('✅ Login Activity Filters translations updated');
    }

    /**
     * Get translation for a specific key
     */
    t(key) {
        const currentTranslations = this.translations[this.currentLanguage] || this.translations['en'];
        return currentTranslations[key] || key;
    }
}

// Initialize translations
window.loginActivityFiltersTranslations = new LoginActivityFiltersTranslations();

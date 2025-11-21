/**
 * Admin Activity Filters Translation System
 * Handles loading and updating translations for the admin activity filters component
 * Integrates with the existing i18next system used by user-detail page
 */
class AdminActivityFiltersTranslations {
    constructor() {
        this.isInitialized = false;
        this.translations = {};
    }

    /**
     * Initialize the translation system
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Load translation files
            await this.loadTranslations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            window.logger?.log('✅ Admin Activity Filters translations initialized');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize admin activity filters translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/admin/components/user-detail/components/admin-activity-filters/locales/admin-activity-filters-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            window.logger?.log('✅ Admin Activity Filters translations loaded');
            
        } catch (error) {
            window.logger?.error('❌ Failed to load admin activity filters translations:', error);
            // Use fallback translations
            this.translations = {
                en: {
                    translation: {
                        filter_admin_activity: "Filter Admin Activity",
                        clear_all_filters: "Clear All Filters",
                        date_range: "Date Range",
                        all_time: "All Time",
                        last_7_days: "Last 7 days",
                        last_30_days: "Last 30 days",
                        last_3_months: "Last 3 months",
                        last_6_months: "Last 6 months",
                        last_year: "Last year",
                        action_types: "Action Types",
                        all_actions: "All Actions",
                        target_users: "Target Users",
                        all_users: "All Users",
                        search_actions: "Search actions...",
                        search_users: "Search users...",
                        select_all: "Select All",
                        deselect_all: "Deselect All",
                        showing_all_activities: "Showing all activities",
                        showing_filtered_activities: "Showing {filteredCount} of {totalCount} activities",
                        action_names: {
                            user_detail_viewed: "View User Detail",
                            user_field_updated: "Update User Field",
                            email_change_sent: "Send Email Change",
                            password_reset_sent: "Send Password Reset",
                            all_sessions_revoked: "Revoke All Sessions",
                            session_revoked: "Revoke Session",
                            admin_panel_access: "Admin Panel Access",
                            section_navigation: "Section Navigation",
                            user_list_viewed: "View User List"
                        },
                        admin_actions: "Admin Actions"
                    }
                }
            };
        }
    }

    /**
     * Set up event listeners for language changes
     */
    setupEventListeners() {
        // Listen for language change events from the main translation system
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Update translations based on current language
     */
    updateTranslations() {
        try {
            const currentLanguage = localStorage.getItem('language') || 'en';
            const langTranslations = this.translations[currentLanguage] || this.translations.en;
            
            // Update all translatable elements
            this.updateElementText('admin-activity-filters__title', langTranslations.translation.filter_admin_activity);
            this.updateElementText('clear-filters-btn', langTranslations.translation.clear_all_filters);
            this.updateElementText('date-range-filter', langTranslations.translation.date_range, 'label');
            this.updateElementText('action-type-multiselect', langTranslations.translation.action_types, 'label');
            this.updateElementText('target-user-multiselect', langTranslations.translation.target_users, 'label');
            
            // Update select options
            this.updateSelectOptions('date-range-filter', [
                { value: 'all', text: langTranslations.translation.all_time },
                { value: '7d', text: langTranslations.translation.last_7_days },
                { value: '30d', text: langTranslations.translation.last_30_days },
                { value: '3m', text: langTranslations.translation.last_3_months },
                { value: '6m', text: langTranslations.translation.last_6_months },
                { value: '1y', text: langTranslations.translation.last_year }
            ]);
            
            // Update search placeholders
            this.updateElementAttribute('action-type-search', 'placeholder', langTranslations.translation.search_actions);
            this.updateElementAttribute('target-user-search', 'placeholder', langTranslations.translation.search_users);
            
            // Update multiselect buttons
            this.updateElementText('action-type-select-all', langTranslations.translation.select_all);
            this.updateElementText('action-type-deselect-all', langTranslations.translation.deselect_all);
            this.updateElementText('target-user-select-all', langTranslations.translation.select_all);
            this.updateElementText('target-user-deselect-all', langTranslations.translation.deselect_all);
            
            // Store current language translations for use by the main component
            window.adminActivityFiltersTranslations = langTranslations.translation;
            
            window.logger?.log('✅ Admin Activity Filters translations updated');
            
        } catch (error) {
            window.logger?.error('❌ Failed to update admin activity filters translations:', error);
        }
    }

    /**
     * Update element text content
     */
    updateElementText(elementId, text, elementType = 'text') {
        const element = document.getElementById(elementId);
        if (element) {
            if (elementType === 'label') {
                const label = element.previousElementSibling;
                if (label && label.classList.contains('admin-activity-filters__label')) {
                    label.textContent = text;
                }
            } else {
                element.textContent = text;
            }
        }
    }

    /**
     * Update element attribute
     */
    updateElementAttribute(elementId, attribute, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    /**
     * Update select options
     */
    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (select) {
            // Clear existing options
            select.innerHTML = '';
            
            // Add new options
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                select.appendChild(optionElement);
            });
        }
    }

    /**
     * Get translated text for a key
     */
    t(key, params = {}) {
        const currentLanguage = localStorage.getItem('language') || 'en';
        const langTranslations = this.translations[currentLanguage] || this.translations.en;
        
        let text = langTranslations.translation[key];
        
        if (!text) {
            window.logger?.warn(`Translation key "${key}" not found for language "${currentLanguage}"`);
            return key;
        }
        
        // Replace parameters in the text
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    }

    /**
     * Get action name translation
     */
    getActionName(actionKey) {
        const currentLanguage = localStorage.getItem('language') || 'en';
        const langTranslations = this.translations[currentLanguage] || this.translations.en;
        
        return langTranslations.translation.action_names?.[actionKey] || 
               actionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get filter summary text
     */
    getFilterSummaryText(filteredCount, totalCount) {
        if (filteredCount === totalCount) {
            return this.t('showing_all_activities');
        } else {
            return this.t('showing_filtered_activities', { filteredCount, totalCount });
        }
    }
}

// Initialize translations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminActivityFiltersTranslations = new AdminActivityFiltersTranslations();
    window.adminActivityFiltersTranslations.init();
});

// Export for use in other components
window.AdminActivityFiltersTranslations = AdminActivityFiltersTranslations;

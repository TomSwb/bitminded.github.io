/**
 * Edit User Component Translation System
 * Handles loading and updating translations for the edit user component
 * Integrates with the existing i18next system used by user-detail page
 */
class EditUserTranslations {
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
            window.logger?.log('✅ Edit User translations initialized');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize edit user translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/admin/components/user-detail/locales/user-detail-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            window.logger?.log('✅ Edit User translations loaded');
            
        } catch (error) {
            window.logger?.error('❌ Failed to load edit user translations:', error);
            // Use fallback translations
            this.translations = this.getFallbackTranslations();
        }
    }

    /**
     * Get fallback translations if loading fails
     */
    getFallbackTranslations() {
        return {
            en: {
                translation: {
                    "edit_user_profile": "Edit User Profile",
                    "close": "Close",
                    "basic_information": "Basic Information",
                    "username": "Username",
                    "username_requirements": "Username requirements: 3-30 characters, letters, numbers, and underscores only",
                    "checking_availability": "Checking availability...",
                    "username_available": "Username is available",
                    "username_taken": "Username is already taken",
                    "avatar": "Avatar",
                    "reset_avatar": "Reset Avatar",
                    "reset_avatar_description": "Remove the current avatar and use the default one",
                    "email_settings": "Email Settings",
                    "send_email_change": "Send Email Change",
                    "send_email_change_description": "Send an email to the user to change their email address",
                    "send_password_reset": "Send Password Reset",
                    "send_password_reset_description": "Send an email to the user to reset their password",
                    "personal_information": "Personal Information",
                    "date_of_birth": "Date of Birth",
                    "gender": "Gender",
                    "country": "Country",
                    "male": "Male",
                    "female": "Other",
                    "cancel": "Cancel",
                    "save_changes": "Save Changes",
                    "processing": "Processing...",
                    "user_updated_successfully": "User updated successfully",
                    "failed_to_update_user": "Failed to update user",
                    "email_sent_successfully": "Email sent successfully",
                    "failed_to_send_email": "Failed to send email"
                }
            }
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });

        // Listen for edit user component initialization
        window.addEventListener('editUserInitialized', () => {
            this.updateTranslations();
        });
    }

    /**
     * Update translations for the edit user component
     */
    updateTranslations() {
        const currentLanguage = this.getCurrentLanguage();
        
        if (!this.translations[currentLanguage]) {
            window.logger?.warn(`⚠️ No translations found for language: ${currentLanguage}`);
            return;
        }

        const languageTranslations = this.translations[currentLanguage].translation;
        
        // Update all translatable elements in edit user component
        const translatableElements = document.querySelectorAll('.edit-user .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            
            // Make translatable content visible
            element.classList.add('loaded');
        });

        window.logger?.log('✅ Edit User translations updated');
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Get translation for a specific key
     */
    getTranslation(key, language = null) {
        const lang = language || this.getCurrentLanguage();
        const translations = this.translations[lang];
        
        if (translations && translations.translation && translations.translation[key]) {
            return translations.translation[key];
        }
        
        // Fallback to English
        if (lang !== 'en' && this.translations.en && this.translations.en.translation && this.translations.en.translation[key]) {
            return this.translations.en.translation[key];
        }
        
        return key; // Return key if no translation found
    }

    /**
     * Wait for translations to be ready and then update
     */
    waitForTranslationsAndUpdate() {
        const checkTranslations = () => {
            if (this.isInitialized) {
                this.updateTranslations();
            } else {
                setTimeout(checkTranslations, 100);
            }
        };
        
        checkTranslations();
    }

    /**
     * Show translatable content (make it visible)
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.edit-user .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
            // Force visibility as fallback
            element.style.opacity = '1';
        });
    }

    /**
     * Destroy translation system
     */
    destroy() {
        this.isInitialized = false;
        this.translations = {};
    }
}

// Create global instance
window.editUserTranslations = new EditUserTranslations();

// Export for use in other scripts
window.EditUserTranslations = EditUserTranslations;

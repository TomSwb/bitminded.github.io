/**
 * Profile Management Translation System
 * Handles loading and updating translations for profile management components
 */
class ProfileManagementTranslations {
    constructor() {
        this.isInitialized = false;
        this.translations = {};
        this.loadedLanguages = new Set();
    }

    /**
     * Initialize the translation system
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initializing silently
            
            // Load translation files
            await this.loadTranslations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            // Initialized silently
            
        } catch (error) {
            console.error('❌ Failed to initialize profile management translations:', error);
        }
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch('/account/components/profile-management/locales/profile-management-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            // Translations loaded silently
            
        } catch (error) {
            console.error('❌ Failed to load profile management translations:', error);
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
                "Profile Information": "Profile Information",
                "Manage your personal information and profile settings": "Manage your personal information and profile settings",
                "Profile Avatar": "Profile Photo",
                "Change Avatar": "Change Photo",
                "Member since": "Member since",
                "Loading profile information...": "Loading profile information...",
                "Edit Username": "Edit Username",
                "New Username": "New Username",
                "Username requirements: 3-30 characters, letters, numbers, and underscores only": "Username requirements: 3-30 characters, letters, numbers, and underscores only",
                "Cancel": "Cancel",
                "Save Username": "Save Username",
                "Checking availability...": "Checking availability...",
                "Change Email": "Change Email",
                "Resend Verification": "Resend Verification",
                "New Email Address": "New Email Address",
                "We'll send a verification link to your new email address": "We'll send a verification link to your new email address",
                "Confirm Password": "Confirm Password",
                "Enter your current password to confirm this change": "Enter your current password to confirm this change",
                "Send Verification": "Send Verification",
                "Verification Email Sent": "Verification Email Sent",
                "Check your new email address and click the verification link to complete the change": "Check your new email address and click the verification link to complete the change",
                "Processing...": "Processing...",
                "Uploading...": "Uploading...",
                "Avatar updated successfully": "Avatar updated successfully",
                "Username updated successfully": "Username updated successfully",
                "Verification email sent to your new email address": "Verification email sent to your new email address",
                "Verification email sent successfully": "Verification email sent successfully"
            },
            fr: {
                "Profile Information": "Informations du Profil",
                "Manage your personal information and profile settings": "Gérez vos informations personnelles et paramètres de profil",
                "Profile Avatar": "Photo de Profil",
                "Change Avatar": "Changer la Photo",
                "Member since": "Membre depuis",
                "Loading profile information...": "Chargement des informations du profil...",
                "Edit Username": "Modifier le Nom d'Utilisateur",
                "New Username": "Nouveau Nom d'Utilisateur",
                "Username requirements: 3-30 characters, letters, numbers, and underscores only": "Exigences du nom d'utilisateur: 3-30 caractères, seulement des lettres, chiffres et tirets bas",
                "Cancel": "Annuler",
                "Save Username": "Sauvegarder le Nom d'Utilisateur",
                "Checking availability...": "Vérification de la disponibilité...",
                "Change Email": "Changer l'Email",
                "Resend Verification": "Renvoyer la Vérification",
                "New Email Address": "Nouvelle Adresse Email",
                "We'll send a verification link to your new email address": "Nous enverrons un lien de vérification à votre nouvelle adresse email",
                "Confirm Password": "Confirmer le Mot de Passe",
                "Enter your current password to confirm this change": "Entrez votre mot de passe actuel pour confirmer ce changement",
                "Send Verification": "Envoyer la Vérification",
                "Verification Email Sent": "Email de Vérification Envoyé",
                "Check your new email address and click the verification link to complete the change": "Vérifiez votre nouvelle adresse email et cliquez sur le lien de vérification pour terminer le changement",
                "Processing...": "Traitement...",
                "Uploading...": "Téléchargement...",
                "Avatar updated successfully": "Avatar mis à jour avec succès",
                "Username updated successfully": "Nom d'utilisateur mis à jour avec succès",
                "Verification email sent to your new email address": "Email de vérification envoyé à votre nouvelle adresse email",
                "Verification email sent successfully": "Email de vérification envoyé avec succès"
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

        // Listen for profile management component initialization
        window.addEventListener('profileManagementInitialized', () => {
            this.updateTranslations();
        });
    }

    /**
     * Update translations for all profile management components
     */
    updateTranslations() {
        const currentLanguage = this.getCurrentLanguage();
        
        if (!this.translations[currentLanguage]) {
            console.warn(`⚠️ No translations found for language: ${currentLanguage}`);
            return;
        }

        const languageTranslations = this.translations[currentLanguage];
        
        // Update all translatable elements in profile management
        const translatableElements = document.querySelectorAll('.profile-management .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            
            // Make translatable content visible
            element.classList.add('loaded');
        });

        // Update sub-components
        this.updateSubComponentTranslations(languageTranslations);

        // Translations updated
    }

    /**
     * Update translations for sub-components
     */
    updateSubComponentTranslations(languageTranslations) {
        // Update username edit component
        const usernameElements = document.querySelectorAll('.username-edit .translatable-content');
        usernameElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            element.classList.add('loaded');
        });

        // Update email change component
        const emailElements = document.querySelectorAll('.email-change .translatable-content');
        emailElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            element.classList.add('loaded');
        });

        // Update avatar upload component
        const avatarElements = document.querySelectorAll('.avatar-upload .translatable-content');
        avatarElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && languageTranslations[key]) {
                element.textContent = languageTranslations[key];
            }
            element.classList.add('loaded');
        });
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
        
        if (translations && translations[key]) {
            return translations[key];
        }
        
        // Fallback to English
        if (lang !== 'en' && this.translations.en && this.translations.en[key]) {
            return this.translations.en[key];
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
        const translatableElements = document.querySelectorAll('.profile-management .translatable-content');
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
        this.loadedLanguages.clear();
    }
}

// Create global instance
window.profileManagementTranslations = new ProfileManagementTranslations();

// Export for use in other scripts
window.ProfileManagementTranslations = ProfileManagementTranslations;

/**
 * Notifications & Preferences Component
 * Handles notification preferences and settings management
 */
if (typeof window.NotificationsPreferences === 'undefined') {
class NotificationsPreferences {
    constructor() {
        this.isInitialized = false;
        this.form = null;
        this.saveButton = null;
        this.messageContainer = null;
        this.isSubmitting = false;
        
        // Individual notification type checkboxes - Email
        this.passwordChangedCheckbox = null;
        this.twoFACheckbox = null;
        this.newLoginCheckbox = null;
        this.usernameChangedCheckbox = null;
        this.familyMemberAddedCheckbox = null;
        this.familyMemberRemovedCheckbox = null;
        this.familyDeletedCheckbox = null;
        this.familyMemberLeftCheckbox = null;
        this.familyRoleChangedCheckbox = null;
        
        // Individual notification type checkboxes - In-App
        this.inappPasswordChangedCheckbox = null;
        this.inappTwoFACheckbox = null;
        this.inappNewLoginCheckbox = null;
        this.inappUsernameChangedCheckbox = null;
        this.inappFamilyMemberAddedCheckbox = null;
        this.inappFamilyMemberRemovedCheckbox = null;
        this.inappFamilyDeletedCheckbox = null;
        this.inappFamilyMemberLeftCheckbox = null;
        this.inappFamilyRoleChangedCheckbox = null;
        
        // Current user
        this.user = null;
        this.preferences = null;
    }

    /**
     * Initialize the notifications preferences component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Notifications Preferences: Already initialized');
                return;
            }

            // Initializing

            // Wait for Supabase to be ready
            await this.waitForSupabase();

            // Get current user
            await this.loadUser();

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;
            // Initialized
            
            // Final translation update
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

        } catch (error) {
            window.logger?.error('❌ Notifications Preferences: Failed to initialize:', error);
            this.showError('Failed to initialize notifications preferences');
        }
    }

    /**
     * Wait for Supabase to be available
     */
    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (typeof supabase !== 'undefined' && supabase) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    /**
     * Load current user
     */
    async loadUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;
            
            if (!user) {
                throw new Error('No user logged in');
            }
            
            this.user = user;
            // User loaded
            
            // Load user preferences
            await this.loadPreferences();
            
        } catch (error) {
            window.logger?.error('❌ Notifications Preferences: Failed to load user:', error);
            throw error;
        }
    }

    /**
     * Load user preferences from database
     */
    async loadPreferences() {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('email_notifications, notification_preferences')
                .eq('user_id', this.user.id)
                .single();
            
            if (error) {
                window.logger?.error('Error loading preferences:', error);
                
                // If no record exists (PGRST116), create one
                if (error.code === 'PGRST116') {
                    window.logger?.log('📝 Creating new user preferences record...');
                    await this.createUserPreferences();
                    return;
                }
                
                // Use defaults if other error
                this.preferences = {
                    email_notifications: true,
                    notification_preferences: {
                        email: {
                            password_changed: true,
                            two_fa: true,
                            new_login: true,
                            username_changed: true,
                            product_updates: false,
                            marketing: false
                        },
                        inapp: {
                            password_changed: true,
                            two_fa: true,
                            new_login: true,
                            username_changed: true,
                            product_updates: false,
                            marketing: false
                        }
                    }
                };
            } else {
                this.preferences = data;
                // Ensure notification_preferences has the expected structure
                if (!this.preferences.notification_preferences) {
                    this.preferences.notification_preferences = {
                        email: {
                            password_changed: true,
                            two_fa: true,
                            new_login: true,
                            username_changed: true,
                            product_updates: false,
                            marketing: false
                        },
                        inapp: {
                            password_changed: true,
                            two_fa: true,
                            new_login: true,
                            username_changed: true,
                            product_updates: false,
                            marketing: false
                        }
                    };
                }
            }
            
            window.logger?.log('✅ Preferences loaded:', this.preferences);
            
        } catch (error) {
            window.logger?.error('❌ Notifications Preferences: Failed to load preferences:', error);
            // Use defaults on error
            this.preferences = {
                email_notifications: true,
                notification_preferences: {
                    email: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    },
                    inapp: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    }
                }
            };
        }
    }

    /**
     * Create user preferences record if it doesn't exist
     */
    async createUserPreferences() {
        try {
            const defaultPreferences = {
                email_notifications: true,
                language: 'en',
                theme: 'dark',
                notification_preferences: {
                    email: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    },
                    inapp: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    }
                }
            };

            const { data, error } = await supabase
                .from('user_preferences')
                .insert({
                    user_id: this.user.id,
                    ...defaultPreferences
                })
                .select()
                .single();

            if (error) throw error;

            this.preferences = data;
            window.logger?.log('✅ User preferences record created successfully');
            
        } catch (error) {
            window.logger?.error('❌ Failed to create user preferences:', error);
            // Fall back to defaults
            this.preferences = {
                email_notifications: true,
                notification_preferences: {
                    email: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    },
                    inapp: {
                        password_changed: true,
                        two_fa: true,
                        new_login: true,
                        username_changed: true,
                        product_updates: false,
                        marketing: false
                    }
                }
            };
        }
    }

    /**
     * Setup component elements and event listeners
     */
    setupComponent() {
        // Get form elements
        this.form = document.getElementById('notifications-preferences-form');
        this.saveButton = document.getElementById('save-preferences-btn');
        this.messageContainer = document.getElementById('notifications-preferences-message');
        
        // Get checkbox inputs for individual notification types - Email
        this.passwordChangedCheckbox = document.getElementById('email-password-changed');
        this.twoFACheckbox = document.getElementById('email-two-fa');
        this.newLoginCheckbox = document.getElementById('email-new-login');
        this.usernameChangedCheckbox = document.getElementById('email-username-changed');
        this.familyMemberAddedCheckbox = document.getElementById('email-family-member-added');
        this.familyMemberRemovedCheckbox = document.getElementById('email-family-member-removed');
        this.familyDeletedCheckbox = document.getElementById('email-family-deleted');
        this.familyMemberLeftCheckbox = document.getElementById('email-family-member-left');
        this.familyRoleChangedCheckbox = document.getElementById('email-family-role-changed');
        
        // Get checkbox inputs for individual notification types - In-App
        this.inappPasswordChangedCheckbox = document.getElementById('inapp-password-changed');
        this.inappTwoFACheckbox = document.getElementById('inapp-two-fa');
        this.inappNewLoginCheckbox = document.getElementById('inapp-new-login');
        this.inappUsernameChangedCheckbox = document.getElementById('inapp-username-changed');
        this.inappFamilyMemberAddedCheckbox = document.getElementById('inapp-family-member-added');
        this.inappFamilyMemberRemovedCheckbox = document.getElementById('inapp-family-member-removed');
        this.inappFamilyDeletedCheckbox = document.getElementById('inapp-family-deleted');
        this.inappFamilyMemberLeftCheckbox = document.getElementById('inapp-family-member-left');
        this.inappFamilyRoleChangedCheckbox = document.getElementById('inapp-family-role-changed');

        if (!this.form) {
            window.logger?.error('❌ Notifications Preferences: Form not found');
            return;
        }

        // Apply saved preferences to checkboxes
        this.applyPreferences();

        // Setup event listeners
        this.setupEventListeners();
        
        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations after component is set up
        this.updateTranslations();
    }

    /**
     * Apply loaded preferences to form
     */
    applyPreferences() {
        if (!this.preferences) return;

        const emailPrefs = this.preferences.notification_preferences?.email || {};
        const inappPrefs = this.preferences.notification_preferences?.inapp || {};

        // Apply email notification preferences
        if (this.passwordChangedCheckbox) {
            this.passwordChangedCheckbox.checked = emailPrefs.password_changed !== false;
        }

        if (this.twoFACheckbox) {
            this.twoFACheckbox.checked = emailPrefs.two_fa !== false;
        }

        if (this.newLoginCheckbox) {
            this.newLoginCheckbox.checked = emailPrefs.new_login !== false;
        }

        if (this.usernameChangedCheckbox) {
            this.usernameChangedCheckbox.checked = emailPrefs.username_changed !== false;
        }

        if (this.familyMemberAddedCheckbox) {
            this.familyMemberAddedCheckbox.checked = emailPrefs.family_member_added !== false;
        }

        if (this.familyMemberRemovedCheckbox) {
            this.familyMemberRemovedCheckbox.checked = emailPrefs.family_member_removed !== false;
        }

        if (this.familyDeletedCheckbox) {
            this.familyDeletedCheckbox.checked = emailPrefs.family_deleted !== false;
        }

        if (this.familyMemberLeftCheckbox) {
            this.familyMemberLeftCheckbox.checked = emailPrefs.family_member_left !== false;
        }

        if (this.familyRoleChangedCheckbox) {
            this.familyRoleChangedCheckbox.checked = emailPrefs.family_role_changed !== false;
        }

        // Apply in-app notification preferences
        if (this.inappPasswordChangedCheckbox) {
            this.inappPasswordChangedCheckbox.checked = inappPrefs.password_changed !== false;
        }

        if (this.inappTwoFACheckbox) {
            this.inappTwoFACheckbox.checked = inappPrefs.two_fa !== false;
        }

        if (this.inappNewLoginCheckbox) {
            this.inappNewLoginCheckbox.checked = inappPrefs.new_login !== false;
        }

        if (this.inappUsernameChangedCheckbox) {
            this.inappUsernameChangedCheckbox.checked = inappPrefs.username_changed !== false;
        }

        if (this.inappFamilyMemberAddedCheckbox) {
            this.inappFamilyMemberAddedCheckbox.checked = inappPrefs.family_member_added !== false;
        }

        if (this.inappFamilyMemberRemovedCheckbox) {
            this.inappFamilyMemberRemovedCheckbox.checked = inappPrefs.family_member_removed !== false;
        }

        if (this.inappFamilyDeletedCheckbox) {
            this.inappFamilyDeletedCheckbox.checked = inappPrefs.family_deleted !== false;
        }

        if (this.inappFamilyMemberLeftCheckbox) {
            this.inappFamilyMemberLeftCheckbox.checked = inappPrefs.family_member_left !== false;
        }

        if (this.inappFamilyRoleChangedCheckbox) {
            this.inappFamilyRoleChangedCheckbox.checked = inappPrefs.family_role_changed !== false;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSave();
            });
        }

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Handle save preferences
     */
    async handleSave() {
        if (this.isSubmitting) return;

        try {
            this.isSubmitting = true;
            this.setLoading(true);

            // Gather form data with individual notification types
            const preferences = {
                notification_preferences: {
                    email: {
                        password_changed: this.passwordChangedCheckbox?.checked ?? true,
                        two_fa: this.twoFACheckbox?.checked ?? true,
                        new_login: this.newLoginCheckbox?.checked ?? true,
                        username_changed: this.usernameChangedCheckbox?.checked ?? true,
                        family_member_added: this.familyMemberAddedCheckbox?.checked ?? true,
                        family_member_removed: this.familyMemberRemovedCheckbox?.checked ?? true,
                        family_deleted: this.familyDeletedCheckbox?.checked ?? true,
                        family_member_left: this.familyMemberLeftCheckbox?.checked ?? true,
                        family_role_changed: this.familyRoleChangedCheckbox?.checked ?? true,
                        product_updates: false, // Not yet implemented
                        marketing: false // Not yet implemented
                    },
                    inapp: {
                        password_changed: this.inappPasswordChangedCheckbox?.checked ?? true,
                        two_fa: this.inappTwoFACheckbox?.checked ?? true,
                        new_login: this.inappNewLoginCheckbox?.checked ?? true,
                        username_changed: this.inappUsernameChangedCheckbox?.checked ?? true,
                        family_member_added: this.inappFamilyMemberAddedCheckbox?.checked ?? true,
                        family_member_removed: this.inappFamilyMemberRemovedCheckbox?.checked ?? true,
                        family_deleted: this.inappFamilyDeletedCheckbox?.checked ?? true,
                        family_member_left: this.inappFamilyMemberLeftCheckbox?.checked ?? true,
                        family_role_changed: this.inappFamilyRoleChangedCheckbox?.checked ?? true,
                        product_updates: false, // Not yet implemented
                        marketing: false // Not yet implemented
                    }
                }
            };

            // Update in database
            const { error } = await supabase
                .from('user_preferences')
                .update(preferences)
                .eq('user_id', this.user.id);

            if (error) {
                // If update fails because record doesn't exist, try to create it
                if (error.code === 'PGRST116') {
                    window.logger?.log('📝 Record not found, creating new preferences...');
                    await this.createUserPreferences();
                    // Try update again with the new record
                    const { error: updateError } = await supabase
                        .from('user_preferences')
                        .update(preferences)
                        .eq('user_id', this.user.id);
                    if (updateError) throw updateError;
                } else {
                    throw error;
                }
            }

            // Update local preferences
            this.preferences = { ...this.preferences, ...preferences };

            window.logger?.log('✅ Notifications Preferences: Preferences saved');
            this.showSuccess(this.getTranslation('Preferences saved successfully'));

        } catch (error) {
            window.logger?.error('❌ Notifications Preferences: Failed to save:', error);
            this.showError(this.getTranslation('Failed to save preferences'));
        } finally {
            this.isSubmitting = false;
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        const component = document.getElementById('notifications-preferences-component');
        
        if (loading) {
            component?.classList.add('notifications-preferences--loading');
            if (this.saveButton) {
                this.saveButton.disabled = true;
            }
        } else {
            component?.classList.remove('notifications-preferences--loading');
            if (this.saveButton) {
                this.saveButton.disabled = false;
            }
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message
     */
    showMessage(message, type) {
        if (!this.messageContainer) return;

        this.messageContainer.textContent = message;
        this.messageContainer.className = `notifications-preferences__message notifications-preferences__message--${type}`;
        this.messageContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.messageContainer.style.display = 'none';
        }, 5000);
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        return new Promise((resolve) => {
            const checkTranslations = () => {
                if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                    this.updateTranslations();
                    resolve();
                } else {
                    setTimeout(checkTranslations, 100);
                }
            };
            checkTranslations();
        });
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            return;
        }

        const translatableElements = document.querySelectorAll('.notifications-preferences .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey;
            if (key && i18next.exists(key)) {
                // Preserve the element type (button, span, etc.)
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = i18next.t(key);
                } else {
                    element.textContent = i18next.t(key);
                }
            }
            // Make translatable content visible
            element.classList.add('loaded');
        });
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.notifications-preferences .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Get translation
     */
    getTranslation(key) {
        if (typeof i18next !== 'undefined' && i18next.isInitialized && i18next.exists(key)) {
            return i18next.t(key);
        }
        return key;
    }

    /**
     * Destroy component
     */
    destroy() {
        this.isInitialized = false;
        // Clean up event listeners if needed
    }
}

// Export
window.NotificationsPreferences = NotificationsPreferences;
}


/**
 * Profile Management Component
 * Main component that manages user profile information
 */
if (typeof window.ProfileManagement === 'undefined') {
class ProfileManagement {
    constructor() {
        this.isInitialized = false;
        this.userProfile = null;
        this.components = new Map();
        
        // Bind methods
        this.handleProfileUpdate = this.handleProfileUpdate.bind(this);
    }

    /**
     * Initialize the profile management component
     */
    async init() {
        if (this.isInitialized) {
            window.logger?.log('Profile management component already initialized');
            return;
        }

        try {
            // Initializing silently
            
            // Load user profile data
            await this.loadUserProfile();
            
            // Initialize sub-components
            await this.initializeSubComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize translations
            await this.initializeTranslations();
            
            // Update UI with current data
            this.updateUI();
            
            this.isInitialized = true;
            // Initialized silently
            
            // Dispatch initialization event for translations
            window.dispatchEvent(new CustomEvent('profileManagementInitialized'));
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize profile management component:', error);
            this.showError('Failed to load profile information');
        }
    }

    /**
     * Load user profile data from Supabase
     */
    async loadUserProfile() {
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase client not available');
            }

            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError) {
                throw new Error('Failed to get user data');
            }

            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get user profile data
            const { data: profile, error: profileError } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                throw new Error('Failed to load profile data');
            }

            this.userProfile = {
                ...profile,
                email: user.email,
                created_at: user.created_at
            };
            
        } catch (error) {
            window.logger?.error('❌ Failed to load user profile:', error);
            throw error;
        }
    }

    /**
     * Initialize sub-components
     */
    async initializeSubComponents() {
        try {
            // Initialize username edit component
            if (window.UsernameEdit) {
                // Load username component HTML first
                await this.loadComponent('username-edit', '#username-component-container');
                
                // Then initialize the component (after HTML is loaded)
                const usernameComponent = new window.UsernameEdit();
                await usernameComponent.init();
                this.components.set('username', usernameComponent);
            }

            // Initialize avatar upload component
            if (window.AvatarUpload) {
                const avatarComponent = new window.AvatarUpload();
                await avatarComponent.init();
                this.components.set('avatar', avatarComponent);
                
                // Set current avatar if exists
                if (this.userProfile?.avatar_url) {
                    avatarComponent.setAvatarUrl(this.userProfile.avatar_url, this.userProfile.username);
                } else {
                    // Set initial letter if no avatar
                    avatarComponent.setAvatarUrl('', this.userProfile.username);
                }
            }

            // Load email change component
            await this.loadComponent('email-change', '#email-component-container');
            
            // Initialize email change component after HTML is loaded
            if (window.EmailChange) {
                const emailComponent = new window.EmailChange();
                await emailComponent.init();
                this.components.set('email', emailComponent);
            }

            // Load personal info component
            await this.loadComponent('personal-info', '#personal-info-component-container');
            
            // Initialize personal info component after HTML is loaded
            if (window.PersonalInfo) {
                const personalInfoComponent = new window.PersonalInfo();
                await personalInfoComponent.init();
                this.components.set('personalInfo', personalInfoComponent);
            }

        } catch (error) {
            window.logger?.error('❌ Failed to initialize sub-components:', error);
            throw error;
        }
    }

    /**
     * Load a component into a container
     */
    async loadComponent(componentName, containerSelector) {
        try {
            if (window.componentLoader) {
                await window.componentLoader.load(componentName, {
                    container: containerSelector,
                    basePath: 'account/components/profile-management'
                });
            }
        } catch (error) {
            window.logger?.error(`❌ Failed to load component ${componentName}:`, error);
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.profileManagementTranslations) {
                await window.profileManagementTranslations.init();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for profile update events from sub-components
        window.addEventListener('profileUpdated', this.handleProfileUpdate);
        
        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });
        
        // Set up mobile layout management
        this.setupMobileLayout();
    }

    /**
     * Set up mobile layout management
     */
    setupMobileLayout() {
        const actionsContainer = document.querySelector('.profile-management__actions');
        if (!actionsContainer) return;

        // Function to update mobile layout
        const updateMobileLayout = () => {
            if (window.innerWidth <= 768) {
                // Check if any forms are open
                const usernameForm = document.querySelector('.username-edit__form');
                const emailForm = document.querySelector('.email-change__form');
                
                const usernameFormOpen = usernameForm && !usernameForm.classList.contains('hidden');
                const emailFormOpen = emailForm && !emailForm.classList.contains('hidden');
                
                if (usernameFormOpen || emailFormOpen) {
                    actionsContainer.classList.add('mobile-stack');
                } else {
                    actionsContainer.classList.remove('mobile-stack');
                }
            } else {
                actionsContainer.classList.remove('mobile-stack');
            }
        };

        // Update layout on window resize
        window.addEventListener('resize', updateMobileLayout);
        
        // Update layout when forms are shown/hidden
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateMobileLayout();
                }
            });
        });

        // Observe form visibility changes
        const usernameForm = document.querySelector('.username-edit__form');
        const emailForm = document.querySelector('.email-change__form');
        
        if (usernameForm) observer.observe(usernameForm, { attributes: true });
        if (emailForm) observer.observe(emailForm, { attributes: true });
        
        // Initial update
        updateMobileLayout();
    }

    /**
     * Handle profile update events
     */
    async handleProfileUpdate(event) {
        try {
            window.logger?.log('🔄 Profile updated:', event.detail);
            
            // Reload profile data
            await this.loadUserProfile();
            
            // Update UI
            this.updateUI();
            
            // Update sub-components if needed
            if (event.detail.component === 'username') {
                const usernameComponent = this.components.get('username');
                if (usernameComponent) {
                    usernameComponent.currentUsername = event.detail.username;
                    usernameComponent.updateUI();
                }
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to handle profile update:', error);
        }
    }

    /**
     * Update UI with current data
     */
    updateUI() {
        if (!this.userProfile) {
            return;
        }

        // Update username display
        const usernameEl = document.getElementById('profile-username');
        if (usernameEl) {
            usernameEl.textContent = this.userProfile.username;
        }

        // Update email display
        const emailEl = document.getElementById('profile-email');
        if (emailEl) {
            emailEl.textContent = this.userProfile.email;
        }

        // Update created date
        const createdDateEl = document.getElementById('profile-created-date');
        if (createdDateEl && this.userProfile.created_at) {
            const date = new Date(this.userProfile.created_at);
            createdDateEl.textContent = date.toLocaleDateString('en-GB');
        }

        // Update avatar
        const avatarComponent = this.components.get('avatar');
        if (avatarComponent) {
            if (this.userProfile.avatar_url) {
                avatarComponent.setAvatarUrl(this.userProfile.avatar_url, this.userProfile.username);
            } else {
                avatarComponent.setAvatarUrl('', this.userProfile.username);
            }
        }

        // Update translations after UI update
        this.updateTranslations();
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.profileManagementTranslations) {
            window.profileManagementTranslations.updateTranslations();
        }
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loading = document.getElementById('profile-loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('profile-error');
        const messageEl = document.getElementById('profile-error-message');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successEl = document.getElementById('profile-success');
        const messageEl = document.getElementById('profile-success-message');
        
        if (successEl && messageEl) {
            messageEl.textContent = message;
            successEl.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideSuccess();
            }, 3000);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorEl = document.getElementById('profile-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        const successEl = document.getElementById('profile-success');
        if (successEl) {
            successEl.classList.add('hidden');
        }
    }

    /**
     * Get user profile data
     */
    getUserProfile() {
        return this.userProfile;
    }

    /**
     * Get a specific component
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        // Destroy sub-components
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        // Remove event listeners
        window.removeEventListener('profileUpdated', this.handleProfileUpdate);
        
        this.isInitialized = false;
        this.userProfile = null;
        this.components.clear();
    }
}

// Export for use in other scripts
window.ProfileManagement = ProfileManagement;
} // End of if statement to prevent duplicate class declaration

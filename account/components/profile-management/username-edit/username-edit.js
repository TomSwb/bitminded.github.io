/**
 * Username Edit Component
 * Handles username editing functionality
 */
if (typeof window.UsernameEdit === 'undefined') {
class UsernameEdit {
    constructor() {
        this.isInitialized = false;
        this.currentUsername = '';
        this.isEditing = false;
        this.availabilityCheckTimeout = null;
        
        // Bind methods
        this.handleEditClick = this.handleEditClick.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.checkUsernameAvailability = this.checkUsernameAvailability.bind(this);
    }

    /**
     * Initialize the username edit component
     */
    async init() {
        if (this.isInitialized) {
            console.log('Username edit component already initialized');
            return;
        }

        try {
            console.log('🔧 Initializing username edit component...');
            
            // Load user profile data
            await this.loadUserProfile();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI with current data
            this.updateUI();
            
            this.isInitialized = true;
            console.log('✅ Username edit component initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize username edit component:', error);
            this.showError('Failed to load username information');
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
                .select('username, created_at')
                .eq('id', user.id)
                .single();

            if (profileError) {
                throw new Error('Failed to load profile data');
            }

            this.currentUsername = profile.username;
            this.createdAt = profile.created_at;
            
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const editBtn = document.getElementById('edit-username-btn');
        const cancelBtn = document.getElementById('cancel-username-btn');
        const form = document.getElementById('username-edit-form');
        const input = document.getElementById('new-username');

        console.log('🔧 Setting up event listeners:', { editBtn, cancelBtn, form, input });

        if (editBtn) {
            editBtn.addEventListener('click', this.handleEditClick);
            console.log('✅ Edit button event listener added');
        } else {
            console.error('❌ Edit button not found for event listener');
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelClick);
        }

        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }

        if (input) {
            input.addEventListener('input', this.handleInputChange);
        }
    }

    /**
     * Update UI with current data
     */
    updateUI() {
        const currentUsernameEl = document.getElementById('current-username');
        if (currentUsernameEl) {
            currentUsernameEl.textContent = this.currentUsername;
        }
    }

    /**
     * Handle edit button click
     */
    handleEditClick() {
        console.log('🔧 Edit username button clicked');
        this.isEditing = true;
        this.showEditForm();
    }

    /**
     * Handle cancel button click
     */
    handleCancelClick() {
        this.isEditing = false;
        this.hideEditForm();
        this.clearForm();
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const newUsername = formData.get('username').trim();

        if (newUsername === this.currentUsername) {
            this.hideEditForm();
            return;
        }

        if (!this.validateUsername(newUsername)) {
            this.showError('Invalid username format');
            return;
        }

        try {
            this.showLoading(true);
            this.hideError();

            await this.updateUsername(newUsername);
            
            this.currentUsername = newUsername;
            this.updateUI();
            this.hideEditForm();
            this.clearForm();
            
            this.showSuccess('Username updated successfully');
            
            // Trigger profile update event
            this.triggerProfileUpdate();
            
        } catch (error) {
            console.error('❌ Failed to update username:', error);
            this.showError(error.message || 'Failed to update username');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle input change for real-time validation
     */
    handleInputChange(event) {
        const username = event.target.value.trim();
        const saveBtn = document.getElementById('save-username-btn');
        
        // Basic validation
        const isValid = this.validateUsername(username);
        const isDifferent = username !== this.currentUsername;
        
        if (saveBtn) {
            saveBtn.disabled = !isValid || !isDifferent;
        }

        // Check availability after user stops typing
        if (this.availabilityCheckTimeout) {
            clearTimeout(this.availabilityCheckTimeout);
        }

        if (username && isValid && isDifferent) {
            this.availabilityCheckTimeout = setTimeout(() => {
                this.checkUsernameAvailability(username);
            }, 500);
        } else {
            this.hideAvailabilityIndicator();
        }
    }

    /**
     * Validate username format
     */
    validateUsername(username) {
        if (!username) return false;
        if (username.length < 3 || username.length > 30) return false;
        return /^[a-zA-Z0-9_]+$/.test(username);
    }

    /**
     * Check username availability
     */
    async checkUsernameAvailability(username) {
        try {
            this.showAvailabilityIndicator('checking', 'Checking availability...');

            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('username')
                .eq('username', username);

            if (error) {
                throw new Error('Failed to check username availability');
            }

            if (data && data.length > 0) {
                this.showAvailabilityIndicator('unavailable', 'Username is already taken');
            } else {
                this.showAvailabilityIndicator('available', 'Username is available');
            }

        } catch (error) {
            console.error('❌ Failed to check username availability:', error);
            this.showAvailabilityIndicator('unavailable', 'Error checking availability');
        }
    }

    /**
     * Update username in database
     */
    async updateUsername(newUsername) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User not authenticated');
        }

        const { error } = await window.supabase
            .from('user_profiles')
            .update({ 
                username: newUsername,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Username is already taken');
            }
            throw new Error('Failed to update username');
        }
    }

    /**
     * Show edit form
     */
    showEditForm() {
        const form = document.getElementById('username-edit-form');
        const editBtn = document.getElementById('edit-username-btn');
        
        console.log('🔧 Showing edit form:', { form, editBtn });
        
        if (form) {
            form.classList.remove('hidden');
            console.log('✅ Form shown');
        } else {
            console.error('❌ Form not found');
        }
        
        if (editBtn) {
            editBtn.classList.add('hidden');
            console.log('✅ Edit button hidden');
        } else {
            console.error('❌ Edit button not found');
        }

        // Focus on input
        const input = document.getElementById('new-username');
        if (input) {
            input.value = this.currentUsername;
            setTimeout(() => input.focus(), 100);
        }
    }

    /**
     * Hide edit form
     */
    hideEditForm() {
        const form = document.getElementById('username-edit-form');
        const editBtn = document.getElementById('edit-username-btn');
        
        if (form) {
            form.classList.add('hidden');
        }
        
        if (editBtn) {
            editBtn.classList.remove('hidden');
        }

        this.hideAvailabilityIndicator();
    }

    /**
     * Clear form
     */
    clearForm() {
        const input = document.getElementById('new-username');
        const saveBtn = document.getElementById('save-username-btn');
        
        if (input) {
            input.value = '';
        }
        
        if (saveBtn) {
            saveBtn.disabled = true;
        }

        this.hideAvailabilityIndicator();
    }

    /**
     * Show availability indicator
     */
    showAvailabilityIndicator(type, message) {
        const indicator = document.getElementById('username-availability');
        const messageEl = document.getElementById('username-availability-message');
        
        if (indicator && messageEl) {
            indicator.className = `username-edit__availability ${type}`;
            indicator.classList.remove('hidden');
            messageEl.textContent = message;
        }
    }

    /**
     * Hide availability indicator
     */
    hideAvailabilityIndicator() {
        const indicator = document.getElementById('username-availability');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loading = document.getElementById('username-loading');
        const saveBtn = document.getElementById('save-username-btn');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        
        if (saveBtn) {
            saveBtn.disabled = show;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.profileManagement?.showError) {
            window.profileManagement.showError(message);
        } else {
            console.error('Username Edit Error:', message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.profileManagement?.showSuccess) {
            window.profileManagement.showSuccess(message);
        } else {
            console.log('Username Edit Success:', message);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (window.profileManagement?.hideError) {
            window.profileManagement.hideError();
        }
    }

    /**
     * Trigger profile update event
     */
    triggerProfileUpdate() {
        const event = new CustomEvent('profileUpdated', {
            detail: { component: 'username', username: this.currentUsername }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get current username
     */
    getCurrentUsername() {
        return this.currentUsername;
    }

    /**
     * Check if currently editing
     */
    isCurrentlyEditing() {
        return this.isEditing;
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        if (this.availabilityCheckTimeout) {
            clearTimeout(this.availabilityCheckTimeout);
        }
        
        this.isInitialized = false;
        this.isEditing = false;
    }
}

// Export for use in other scripts
window.UsernameEdit = UsernameEdit;
} // End of if statement to prevent duplicate class declaration

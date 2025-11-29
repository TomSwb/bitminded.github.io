/**
 * Edit User Component
 * Handles admin user editing functionality
 * Follows profile management component patterns
 */
if (typeof window.EditUser === 'undefined') {
class EditUser {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.isEditing = false;
        this.originalData = {};
        this.availabilityCheckTimeout = null;
        this.countries = this.getCountryList();
        
        // Bind methods
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.handleSaveClick = this.handleSaveClick.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleUsernameChange = this.handleUsernameChange.bind(this);
        this.handleResetAvatar = this.handleResetAvatar.bind(this);
        this.handleSendEmailChange = this.handleSendEmailChange.bind(this);
        this.handleSendPasswordReset = this.handleSendPasswordReset.bind(this);
        this.checkUsernameAvailability = this.checkUsernameAvailability.bind(this);
    }

    /**
     * Initialize the edit user component
     */
    async init(userData) {
        if (this.isInitialized) {
            window.logger?.log('Edit User component already initialized');
            return;
        }

        try {
            // Store user data
            this.currentUser = userData;
            this.originalData = { ...userData };
            
            // Initialize translations first
            if (window.editUserTranslations) {
                await window.editUserTranslations.init();
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Populate form with current data
            this.populateForm();
            
            // Populate country dropdown
            this.populateCountryDropdown();
            
            // Update translations
            this.updateTranslations();
            
            this.isInitialized = true;
            window.logger?.log('✅ Edit User component initialized');
            
            // Dispatch initialization event
            window.dispatchEvent(new CustomEvent('editUserInitialized'));
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Edit User component:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-edit-user-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.handleCancelClick);
        }

        // Save button
        const saveBtn = document.getElementById('save-user-changes-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', this.handleSaveClick);
        }

        // Username input
        const usernameInput = document.getElementById('edit-username');
        if (usernameInput) {
            usernameInput.addEventListener('input', this.handleUsernameChange);
        }

        // Form inputs for validation
        const formInputs = document.querySelectorAll('#edit-user-form input, #edit-user-form select');
        formInputs.forEach(input => {
            input.addEventListener('input', this.handleInputChange);
            input.addEventListener('change', this.handleInputChange);
        });

        // Avatar reset button
        const resetAvatarBtn = document.getElementById('reset-avatar-btn');
        if (resetAvatarBtn) {
            resetAvatarBtn.addEventListener('click', this.handleResetAvatar);
        }

        // Email change button
        const emailChangeBtn = document.getElementById('send-email-change-btn');
        if (emailChangeBtn) {
            emailChangeBtn.addEventListener('click', this.handleSendEmailChange);
        }

        // Password reset button
        const passwordResetBtn = document.getElementById('send-password-reset-btn');
        if (passwordResetBtn) {
            passwordResetBtn.addEventListener('click', this.handleSendPasswordReset);
        }
    }

    /**
     * Populate form with current user data
     */
    populateForm() {
        if (!this.currentUser) return;

        // Username
        const usernameInput = document.getElementById('edit-username');
        if (usernameInput) {
            usernameInput.value = this.currentUser.username || '';
        }

        // Current email display
        const emailDisplay = document.getElementById('current-email-display');
        if (emailDisplay) {
            emailDisplay.textContent = this.currentUser.email || 'No email';
        }

        // Avatar preview
        this.updateAvatarPreview();

        // Personal info
        const dobInput = document.getElementById('edit-dob');
        if (dobInput && this.currentUser.date_of_birth) {
            dobInput.value = this.currentUser.date_of_birth;
        }

        const genderSelect = document.getElementById('edit-gender');
        if (genderSelect && this.currentUser.gender) {
            genderSelect.value = this.currentUser.gender;
        }

        const countrySelect = document.getElementById('edit-country');
        if (countrySelect && this.currentUser.country) {
            countrySelect.value = this.currentUser.country;
        }
    }

    /**
     * Update avatar preview
     */
    updateAvatarPreview() {
        const avatarPreview = document.getElementById('current-avatar-preview');
        const avatarFallback = document.getElementById('current-avatar-fallback');
        
        if (this.currentUser.avatar_url) {
            avatarPreview.src = this.currentUser.avatar_url;
            avatarPreview.style.display = 'block';
            avatarFallback.style.display = 'none';
        } else {
            avatarPreview.style.display = 'none';
            avatarFallback.style.display = 'flex';
            avatarFallback.textContent = this.currentUser.username?.charAt(0).toUpperCase() || '?';
        }
    }

    /**
     * Populate country dropdown
     */
    populateCountryDropdown() {
        const countrySelect = document.getElementById('edit-country');
        if (!countrySelect) return;

        // Clear existing options except the first (placeholder)
        while (countrySelect.options.length > 1) {
            countrySelect.remove(1);
        }

        // Add all countries
        this.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

    /**
     * Handle cancel button click
     */
    handleCancelClick() {
        this.isEditing = false;
        this.hideEditForm();
        this.resetForm();
        
        // Dispatch close event
        const event = new CustomEvent('editUserClosed');
        window.dispatchEvent(event);
    }

    /**
     * Handle save button click
     */
    async handleSaveClick() {
        try {
            this.showLoading(true, 'Saving changes...');
            this.hideError();

            // Collect form data
            const formData = this.collectFormData();
            
            // Validate form data
            if (!this.validateFormData(formData)) {
                return;
            }

            // Update user data
            await this.updateUserData(formData);
            
            // Update local data
            this.currentUser = { ...this.currentUser, ...formData };
            this.originalData = { ...this.currentUser };
            
            // Hide form and show success
            this.hideEditForm();
            this.showSuccess('User updated successfully');
            
            // Trigger user update event
            this.triggerUserUpdate();
            
            // Dispatch close event
            const event = new CustomEvent('editUserClosed');
            window.dispatchEvent(event);
            
        } catch (error) {
            window.logger?.error('❌ Failed to save user changes:', error);
            this.showError(error.message || 'Failed to save user changes');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle input changes for form validation
     */
    handleInputChange() {
        this.validateForm();
    }

    /**
     * Handle username input change
     */
    handleUsernameChange(event) {
        const username = event.target.value.trim();
        const saveBtn = document.getElementById('save-user-changes-btn');
        
        // Basic validation
        const isValid = this.validateUsername(username);
        const isDifferent = username !== this.currentUser.username;
        
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
     * Handle reset avatar button click
     */
    async handleResetAvatar() {
        if (!confirm('Are you sure you want to remove this user\'s avatar?')) {
            return;
        }

        try {
            this.showLoading(true, 'Resetting avatar...');
            this.hideError();

            // Store old avatar URL for logging
            const oldAvatarUrl = this.currentUser.avatar_url;

            await this.resetAvatar();
            
            // Update local data
            this.currentUser.avatar_url = null;
            this.updateAvatarPreview();
            
            this.showSuccess('Avatar reset successfully');
            
            // Log admin action (non-blocking)
            try {
                await this.logAdminAction(
                    'user_field_updated',
                    `Updated user Avatar: "${oldAvatarUrl || '(no avatar)'}" → "(removed)"`,
                    this.currentUser.id
                );
            } catch (error) {
                window.logger?.warn('⚠️ Failed to log avatar reset action:', error);
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to reset avatar:', error);
            this.showError(error.message || 'Failed to reset avatar');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle send email change button click
     */
    async handleSendEmailChange() {
        const emailInput = document.getElementById('new-email');
        const newEmail = emailInput?.value.trim();
        
        if (!newEmail) {
            this.showError('Please enter a new email address');
            return;
        }

        if (!this.validateEmail(newEmail)) {
            this.showError('Invalid email format');
            return;
        }

        if (newEmail === this.currentUser.email) {
            this.showError('New email must be different from current email');
            return;
        }

        try {
            this.showLoading(true, 'Sending email change request...');
            this.hideError();

            await this.sendEmailChangeRequest(newEmail);
            
            // Clear email input
            emailInput.value = '';
            
            this.showSuccess('Email change request sent successfully');
            
            // Log admin action
            try {
                await this.logAdminAction('email_change_sent', `Sent email change request to: ${newEmail}`);
            } catch (error) {
                window.logger?.warn('⚠️ Failed to log email change action:', error);
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to send email change request:', error);
            this.showError(error.message || 'Failed to send email change request');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle send password reset button click
     */
    async handleSendPasswordReset() {
        if (!confirm(`Send password reset email to ${this.currentUser.email}?`)) {
            return;
        }

        try {
            this.showLoading(true, 'Sending password reset email...');
            this.hideError();

            await this.sendPasswordResetRequest();
            
            this.showSuccess('Password reset email sent successfully');
            
            // Log admin action
            try {
                await this.logAdminAction('password_reset_sent', 'Sent password reset email');
            } catch (error) {
                window.logger?.warn('⚠️ Failed to log password reset action:', error);
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to send password reset email:', error);
            this.showError(error.message || 'Failed to send password reset email');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show edit form
     */
    showEditForm() {
        // Focus on first input
        const firstInput = document.getElementById('edit-username');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Hide edit form
     */
    hideEditForm() {
        this.hideAvailabilityIndicator();
    }

    /**
     * Reset form to original values
     */
    resetForm() {
        this.populateForm();
        this.hideAvailabilityIndicator();
        this.validateForm();
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const formData = {
            username: document.getElementById('edit-username')?.value.trim() || '',
            date_of_birth: document.getElementById('edit-dob')?.value || null,
            gender: document.getElementById('edit-gender')?.value || null,
            country: document.getElementById('edit-country')?.value || null
        };
        
        window.logger?.log('📝 Collected form data:', formData);
        return formData;
    }

    /**
     * Validate form data
     */
    validateFormData(data) {
        // Username validation
        if (data.username && !this.validateUsername(data.username)) {
            this.showError('Invalid username format');
            return false;
        }

        return true;
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
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
            window.logger?.error('❌ Failed to check username availability:', error);
            this.showAvailabilityIndicator('unavailable', 'Error checking availability');
        }
    }

    /**
     * Show availability indicator
     */
    showAvailabilityIndicator(type, message) {
        const indicator = document.getElementById('username-availability');
        const messageEl = document.getElementById('username-availability-message');
        
        if (indicator && messageEl) {
            indicator.className = `edit-user__availability ${type}`;
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
     * Validate form and enable/disable save button
     */
    validateForm() {
        const formData = this.collectFormData();
        const saveBtn = document.getElementById('save-user-changes-btn');
        
        // Check if any data has changed
        const hasChanges = 
            formData.username !== (this.currentUser.username || '') ||
            formData.date_of_birth !== (this.currentUser.date_of_birth || '') ||
            formData.gender !== (this.currentUser.gender || '') ||
            formData.country !== (this.currentUser.country || '');
        
        // Check username validity if changed
        const usernameValid = !formData.username || this.validateUsername(formData.username);
        
        if (saveBtn) {
            saveBtn.disabled = !hasChanges || !usernameValid;
        }
    }

    /**
     * Update user data in database
     */
    async updateUserData(formData) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        window.logger?.log('🔄 Updating user data:', formData);
        window.logger?.log('🔄 Target user ID:', this.currentUser.id);

        // Track what fields have changed
        const changes = this.trackFieldChanges(formData);
        
        if (changes.length === 0) {
            window.logger?.log('ℹ️ No changes detected, skipping update');
            return;
        }

        window.logger?.log('📝 Detected changes:', changes);

        // Update user profile
        const { data, error } = await window.supabase
            .from('user_profiles')
            .update({
                username: formData.username,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender,
                country: formData.country,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.currentUser.id);

        if (error) {
            window.logger?.error('❌ Database update error:', error);
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Username is already taken');
            }
            throw new Error('Failed to update user profile');
        }

        window.logger?.log('✅ User profile updated successfully');
        window.logger?.log('📊 Update result data:', data);
        
        // Check if any rows were actually updated
        if (data && data.length === 0) {
            window.logger?.warn('⚠️ No rows were updated - this might indicate a permission issue or the user doesn\'t exist');
        }

        // Log each individual change
        for (const change of changes) {
            try {
                await this.logAdminAction(
                    'user_field_updated',
                    `Updated user ${change.field}: "${change.oldValue}" → "${change.newValue}"`,
                    this.currentUser.id
                );
            } catch (error) {
                window.logger?.warn(`⚠️ Failed to log ${change.field} update:`, error);
            }
        }
    }

    /**
     * Track what fields have changed between original and new data
     * @param {Object} formData - New form data
     * @returns {Array} Array of change objects
     */
    trackFieldChanges(formData) {
        const changes = [];
        
        // Define field mappings with human-readable names
        const fieldMappings = {
            username: 'Username',
            date_of_birth: 'Date of Birth',
            gender: 'Gender',
            country: 'Country'
        };
        
        // Check each field for changes
        Object.keys(fieldMappings).forEach(field => {
            const oldValue = this.originalData[field] || '';
            const newValue = formData[field] || '';
            
            // Normalize values for comparison (handle null/undefined)
            const normalizedOld = oldValue === null || oldValue === undefined ? '' : String(oldValue);
            const normalizedNew = newValue === null || newValue === undefined ? '' : String(newValue);
            
            if (normalizedOld !== normalizedNew) {
                changes.push({
                    field: fieldMappings[field],
                    fieldKey: field,
                    oldValue: normalizedOld || '(empty)',
                    newValue: normalizedNew || '(empty)'
                });
            }
        });
        
        return changes;
    }

    /**
     * Reset user avatar
     */
    async resetAvatar() {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { error } = await window.supabase
            .from('user_profiles')
            .update({ avatar_url: null })
            .eq('id', this.currentUser.id);

        if (error) {
            throw new Error('Failed to reset avatar');
        }
    }

    /**
     * Send email change request
     */
    async sendEmailChangeRequest(newEmail) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        // Get current admin user
        const { data: { user: adminUser } } = await window.supabase.auth.getUser();
        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        // Call Edge Function to send email change verification
        const data = await window.invokeEdgeFunction('admin-send-email-change', {
            body: {
                userId: this.currentUser.id,
                newEmail: newEmail,
                adminId: adminUser.id
            }
        });

        if (!data.success) {
            throw new Error(data.error || 'Failed to send email change verification');
        }
    }

    /**
     * Send password reset request
     */
    async sendPasswordResetRequest() {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        // Get current admin user
        const { data: { user: adminUser } } = await window.supabase.auth.getUser();
        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        // Call Edge Function to send password reset
        const data = await window.invokeEdgeFunction('admin-send-password-reset', {
            body: {
                userId: this.currentUser.id,
                adminId: adminUser.id
            }
        });

        if (!data.success) {
            throw new Error(data.error || 'Failed to send password reset email');
        }
    }

    /**
     * Log admin action
     */
    async logAdminAction(actionType, details) {
        try {
            if (typeof window.supabase === 'undefined') return;

            // Get current admin user
            const { data: { user: adminUser } } = await window.supabase.auth.getUser();
            if (!adminUser) return;

            // Log to admin_activity table (optional - don't fail if this doesn't work)
            try {
                await window.supabase
                    .from('admin_activity')
                    .insert({
                        admin_id: adminUser.id,
                        user_id: this.currentUser.id,
                        action: actionType,
                        details: {
                            target_user: this.currentUser.username,
                            target_email: this.currentUser.email,
                            details: details,
                            timestamp: new Date().toISOString()
                        }
                    });
                window.logger?.log('✅ Admin action logged successfully');
            } catch (logError) {
                window.logger?.warn('⚠️ Failed to log admin action:', logError.message);
                // Don't throw error - admin logging is not critical
            }

        } catch (error) {
            window.logger?.warn('⚠️ Failed to log admin action:', error);
        }
    }

    /**
     * Show loading state
     */
    showLoading(show, text = 'Processing...') {
        const loading = document.getElementById('edit-user-loading');
        const loadingText = document.getElementById('edit-user-loading-text');
        const saveBtn = document.getElementById('save-user-changes-btn');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (saveBtn) {
            saveBtn.disabled = show;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('edit-user-error');
        const messageEl = document.getElementById('edit-user-error-message');
        
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
        const successEl = document.getElementById('edit-user-success');
        const messageEl = document.getElementById('edit-user-success-message');
        
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
        const errorEl = document.getElementById('edit-user-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        const successEl = document.getElementById('edit-user-success');
        if (successEl) {
            successEl.classList.add('hidden');
        }
    }

    /**
     * Trigger user update event
     */
    triggerUserUpdate() {
        const event = new CustomEvent('userUpdated', {
            detail: { 
                user: this.currentUser,
                component: 'editUser'
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get country list
     */
    getCountryList() {
        return [
            'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 
            'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 
            'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 
            'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 
            'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 
            'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 
            'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 
            'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 
            'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 
            'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 
            'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea', 'South Korea', 
            'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 
            'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 
            'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 
            'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 
            'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 
            'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 
            'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 
            'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 
            'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 
            'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 
            'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 
            'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 
            'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 
            'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
        ];
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.editUserTranslations) {
            window.editUserTranslations.updateTranslations();
        }
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
        this.currentUser = null;
        this.originalData = {};
    }
}

// Export for use in other scripts
window.EditUser = EditUser;
} // End of if statement to prevent duplicate class declaration

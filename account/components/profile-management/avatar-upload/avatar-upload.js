/**
 * Avatar Upload Component
 * Handles avatar file upload functionality
 */
if (typeof window.AvatarUpload === 'undefined') {
class AvatarUpload {
    constructor() {
        this.isInitialized = false;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        this.uploadProgress = 0;
        
        // Bind methods
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.handleFileChange = this.handleFileChange.bind(this);
    }

    /**
     * Initialize the avatar upload component
     */
    async init() {
        if (this.isInitialized) {
            console.log('Avatar upload component already initialized');
            return;
        }

        try {
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Avatar upload component initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize avatar upload component:', error);
            this.showError('Failed to initialize avatar upload');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const uploadBtn = document.getElementById('avatar-upload-btn');
        const fileInput = document.getElementById('avatar-file-input');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', this.handleFileSelect);
        }

        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileChange);
        }
    }

    /**
     * Handle file selection button click
     */
    handleFileSelect(event) {
        event.preventDefault();
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file input change
     */
    async handleFileChange(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }

        try {
            // Validate file
            this.validateFile(file);
            
            // Show loading state
            this.showLoading(true);
            this.hideError();
            this.hideSuccess();
            
            // Upload file
            const avatarUrl = await this.uploadFile(file);
            
            // Update avatar display
            await this.updateAvatarDisplay(avatarUrl);
            
            // Show success
            this.showSuccess('Avatar updated successfully');
            
            // Trigger profile update event
            this.triggerProfileUpdate();
            
        } catch (error) {
            console.error('❌ Failed to upload avatar:', error);
            this.showError(error.message || 'Failed to upload avatar');
        } finally {
            this.showLoading(false);
            // Clear file input
            event.target.value = '';
        }
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error('File size must be less than 5MB');
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error('File must be a JPEG, PNG, or WebP image');
        }

        // Check if it's actually an image
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }
    }

    /**
     * Upload file to Supabase Storage
     */
    async uploadFile(file) {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User not authenticated');
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await window.supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
                onUploadProgress: (progress) => {
                    this.updateProgress(progress.loaded / progress.total * 100);
                }
            });

        if (uploadError) {
            throw new Error('Failed to upload file to storage');
        }

        // Get public URL
        const { data: urlData } = window.supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
            throw new Error('Failed to get avatar URL');
        }

        return urlData.publicUrl;
    }

    /**
     * Update avatar display
     */
    async updateAvatarDisplay(avatarUrl) {
        // Update avatar image
        const avatarImg = document.getElementById('profile-avatar');
        const avatarInitial = document.getElementById('profile-avatar-initial');
        const avatarContainer = document.getElementById('profile-avatar-container');
        
        if (avatarImg && avatarInitial && avatarContainer) {
            avatarImg.src = avatarUrl;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
            avatarContainer.classList.add('has-avatar');
        }

        // Update database
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User not authenticated');
        }

        const { error: updateError } = await window.supabase
            .from('user_profiles')
            .update({ 
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            throw new Error('Failed to update avatar in database');
        }
    }

    /**
     * Update upload progress
     */
    updateProgress(percentage) {
        this.uploadProgress = percentage;
        const progressFill = document.getElementById('avatar-progress-fill');
        const progressText = document.getElementById('avatar-progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Uploading... ${Math.round(percentage)}%`;
        }
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const container = document.querySelector('.profile-management__avatar-container');
        const progress = document.getElementById('avatar-upload-progress');
        const uploadBtn = document.getElementById('avatar-upload-btn');
        
        if (container) {
            container.classList.toggle('loading', show);
        }
        
        if (progress) {
            progress.classList.toggle('hidden', !show);
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = show;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('avatar-upload-error');
        const messageEl = document.getElementById('avatar-error-message');
        
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
        const successEl = document.getElementById('avatar-upload-success');
        const messageEl = document.getElementById('avatar-success-message');
        
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
        const errorEl = document.getElementById('avatar-upload-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        const successEl = document.getElementById('avatar-upload-success');
        if (successEl) {
            successEl.classList.add('hidden');
        }
    }

    /**
     * Trigger profile update event
     */
    triggerProfileUpdate() {
        const event = new CustomEvent('profileUpdated', {
            detail: { component: 'avatar' }
        });
        window.dispatchEvent(event);
    }

    /**
     * Set avatar URL (for loading existing avatar)
     */
    setAvatarUrl(url, username = '') {
        const avatarImg = document.getElementById('profile-avatar');
        const avatarInitial = document.getElementById('profile-avatar-initial');
        const avatarContainer = document.getElementById('profile-avatar-container');
        
        if (avatarImg && avatarInitial && avatarContainer) {
            if (url) {
                // Show avatar image
                avatarImg.src = url;
                avatarImg.style.display = 'block';
                avatarInitial.style.display = 'none';
                avatarContainer.classList.add('has-avatar');
            } else {
                // Show username initial
                avatarImg.style.display = 'none';
                avatarInitial.style.display = 'block';
                avatarInitial.textContent = username.charAt(0).toUpperCase();
                avatarContainer.classList.remove('has-avatar');
            }
        }
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        this.isInitialized = false;
        this.uploadProgress = 0;
    }
}

// Export for use in other scripts
window.AvatarUpload = AvatarUpload;
} // End of if statement to prevent duplicate class declaration

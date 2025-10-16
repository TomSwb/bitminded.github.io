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
        
        // Avatar cropper window
        this.cropperWindow = null;
        this.currentFile = null;
        
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
            // Check if we're returning from mobile cropper with a cropped image
            const croppedImage = sessionStorage.getItem('avatar_cropped_image');
            const cropConfirmed = sessionStorage.getItem('avatar_crop_confirmed');
            
            if (croppedImage && cropConfirmed === 'true') {
                console.log('📨 Found cropped image in sessionStorage (mobile mode)');
                // Clean up sessionStorage
                sessionStorage.removeItem('avatar_cropped_image');
                sessionStorage.removeItem('avatar_crop_confirmed');
                sessionStorage.removeItem('avatar_crop_image');
                
                // Process the cropped image
                setTimeout(() => {
                    this.handleCroppedImage(croppedImage);
                }, 100);
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Listen for postMessage from cropper window (desktop popup mode)
            window.addEventListener('message', (event) => {
                if (event.origin === window.location.origin && event.data.type === 'avatar_cropped') {
                    console.log('📨 Received avatar_cropped message from cropper');
                    if (event.data.imageData) {
                        console.log('✅ Received image data, length:', event.data.imageData.length);
                        this.handleCroppedImage(event.data.imageData);
                    } else {
                        console.error('❌ No image data in message');
                    }
                }
            });
            
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
            
            // Hide any errors
            this.hideError();
            
            // Store file for later
            this.currentFile = file;
            
            // Convert file to data URL
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store image data in sessionStorage
                sessionStorage.setItem('avatar_crop_image', e.target.result);
                sessionStorage.removeItem('avatar_crop_confirmed');
                sessionStorage.removeItem('avatar_cropped_image');
                
                // Detect if we're on mobile/tablet or desktop
                const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Open cropper window
                const cropperUrl = '/account/components/profile-management/avatar-upload/cropper.html';
                
                if (isMobile) {
                    // On mobile, navigate to the cropper page directly
                    window.location.href = cropperUrl;
                } else {
                    // On desktop, use popup window
                    const windowFeatures = 'width=600,height=700,scrollbars=no,resizable=yes';
                    this.cropperWindow = window.open(cropperUrl, 'avatar-cropper', windowFeatures);
                    
                    if (!this.cropperWindow || this.cropperWindow.closed || typeof this.cropperWindow.closed === 'undefined') {
                        // Fallback to full page navigation if popup blocked
                        window.location.href = cropperUrl;
                    }
                }
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('❌ Failed to process file:', error);
            this.showError(error.message || 'Failed to process file');
        } finally {
            // Clear file input so same file can be selected again
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
     * Handle cropped image received from popup window
     */
    async handleCroppedImage(imageDataUrl) {
        try {
            console.log('🔄 Processing cropped image...');
            
            // Show loading state
            this.showLoading(true);
            this.hideError();
            this.hideSuccess();
            
            // Convert data URL to File
            const file = await this.dataURLtoFile(imageDataUrl, 'avatar.jpg');
            console.log('✅ File created:', file.name, file.size, 'bytes');
            
            console.log('🔄 Uploading to Supabase...');
            // Upload file
            const avatarUrl = await this.uploadFile(file);
            console.log('✅ Uploaded, URL:', avatarUrl);
            
            console.log('🔄 Updating avatar display...');
            // Update avatar display
            await this.updateAvatarDisplay(avatarUrl);
            
            // Show success
            this.showSuccess('Avatar updated successfully');
            console.log('✅ Avatar update complete!');
            
            // Trigger profile update event
            this.triggerProfileUpdate();
            
        } catch (error) {
            console.error('❌ Failed to upload avatar:', error);
            this.showError(error.message || 'Failed to upload avatar');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Convert data URL to File object
     */
    async dataURLtoFile(dataUrl, filename) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type: 'image/jpeg' });
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

        // Create unique filename with timestamp to bust cache
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`;

        // Delete old avatar files before uploading new one
        try {
            const { data: existingFiles } = await window.supabase.storage
                .from('avatars')
                .list(user.id);
            
            if (existingFiles && existingFiles.length > 0) {
                const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
                await window.supabase.storage
                    .from('avatars')
                    .remove(filesToDelete);
            }
        } catch (cleanupError) {
            console.warn('Could not clean up old avatars:', cleanupError);
            // Continue anyway - not critical
        }

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await window.supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false, // Changed to false since we use unique filenames now
                onUploadProgress: (progress) => {
                    this.updateProgress(progress.loaded / progress.total * 100);
                }
            });

        if (uploadError) {
            throw new Error('Failed to upload file to storage: ' + uploadError.message);
        }

        // Get public URL with cache-busting parameter
        const { data: urlData } = window.supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
            throw new Error('Failed to get avatar URL');
        }

        // Add cache-busting parameter
        const urlWithCacheBust = `${urlData.publicUrl}?t=${timestamp}`;
        return urlWithCacheBust;
    }

    /**
     * Update avatar display
     */
    async updateAvatarDisplay(avatarUrl) {
        // Update avatar image with aggressive cache busting
        const avatarImg = document.getElementById('profile-avatar');
        const avatarInitial = document.getElementById('profile-avatar-initial');
        const avatarContainer = document.getElementById('profile-avatar-container');
        
        if (avatarImg && avatarInitial && avatarContainer) {
            // Force reload by clearing src first
            avatarImg.src = '';
            
            // Wait a moment then set new source with cache buster
            await new Promise(resolve => setTimeout(resolve, 50));
            
            avatarImg.src = avatarUrl;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
            avatarContainer.classList.add('has-avatar');
            
            // Trigger a repaint
            avatarImg.style.opacity = '0.99';
            setTimeout(() => {
                avatarImg.style.opacity = '1';
            }, 10);
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
        
        // Force reload all avatar instances on the page
        document.querySelectorAll('img[src*="avatars"]').forEach(img => {
            if (img !== avatarImg) {
                const currentSrc = img.src;
                img.src = '';
                setTimeout(() => {
                    img.src = avatarUrl;
                }, 50);
            }
        });
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
                // Add cache-busting parameter if not already present
                const cacheBustedUrl = url.includes('?') ? url : `${url}?t=${Date.now()}`;
                
                // Show avatar image
                avatarImg.src = cacheBustedUrl;
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

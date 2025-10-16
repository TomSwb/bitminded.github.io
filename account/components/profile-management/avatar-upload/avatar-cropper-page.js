/**
 * Avatar Cropper Page Script
 * Handles image cropping in popup window
 */

class AvatarCropperPage {
    constructor() {
        // State
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.imageX = 0;
        this.imageY = 0;
        this.scale = 1;
        this.imageData = null;
        
        // Elements
        this.image = null;
        this.previewCircle = null;
        
        // Bind methods
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDrag = this.handleDrag.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleZoomIn = this.handleZoomIn.bind(this);
        this.handleZoomOut = this.handleZoomOut.bind(this);
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }
    
    async init() {
        // Get image data from sessionStorage
        this.imageData = sessionStorage.getItem('avatar_crop_image');
        if (!this.imageData) {
            alert('No image data found');
            window.close();
            return;
        }
        
        // Get elements
        this.image = document.getElementById('cropper-image');
        this.previewCircle = document.querySelector('.cropper-page__preview-circle');
        
        // Set image and wait for it to load
        this.image.src = this.imageData;
        
        // Wait for image to load before setting initial transform
        await new Promise((resolve) => {
            if (this.image.complete) {
                resolve();
            } else {
                this.image.onload = () => resolve();
            }
        });
        
        // Set initial transform to center the image
        this.updateImageTransform();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Wait for translations
        await this.initializeTranslations();
    }
    
    setupEventListeners() {
        // Zoom buttons
        document.getElementById('zoom-in-btn')?.addEventListener('click', this.handleZoomIn);
        document.getElementById('zoom-out-btn')?.addEventListener('click', this.handleZoomOut);
        
        // Action buttons
        document.getElementById('confirm-btn')?.addEventListener('click', this.handleConfirm);
        document.getElementById('cancel-btn')?.addEventListener('click', this.handleCancel);
        
        // Image dragging
        if (this.image) {
            this.image.addEventListener('mousedown', this.handleDragStart);
            this.image.addEventListener('touchstart', this.handleDragStart, { passive: false });
        }
    }
    
    handleDragStart(e) {
        e.preventDefault();
        this.isDragging = true;
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        this.dragStartX = clientX - this.imageX;
        this.dragStartY = clientY - this.imageY;
        
        document.addEventListener('mousemove', this.handleDrag);
        document.addEventListener('mouseup', this.handleDragEnd);
        document.addEventListener('touchmove', this.handleDrag, { passive: false });
        document.addEventListener('touchend', this.handleDragEnd);
        
        if (this.image) {
            this.image.style.cursor = 'grabbing';
        }
    }
    
    handleDrag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        let newX = clientX - this.dragStartX;
        let newY = clientY - this.dragStartY;
        
        const constrained = this.constrainPosition(newX, newY);
        this.imageX = constrained.x;
        this.imageY = constrained.y;
        
        this.updateImageTransform();
    }
    
    handleDragEnd() {
        this.isDragging = false;
        
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
        document.removeEventListener('touchmove', this.handleDrag);
        document.removeEventListener('touchend', this.handleDragEnd);
        
        if (this.image) {
            this.image.style.cursor = 'move';
        }
    }
    
    handleZoomIn() {
        this.scale = Math.min(this.scale + 0.1, 3);
        
        const constrained = this.constrainPosition(this.imageX, this.imageY);
        this.imageX = constrained.x;
        this.imageY = constrained.y;
        
        this.updateImageTransform();
    }
    
    handleZoomOut() {
        this.scale = Math.max(this.scale - 0.1, 0.5);
        
        const constrained = this.constrainPosition(this.imageX, this.imageY);
        this.imageX = constrained.x;
        this.imageY = constrained.y;
        
        this.updateImageTransform();
    }
    
    constrainPosition(x, y) {
        if (!this.previewCircle || !this.image) {
            return { x, y };
        }
        
        const circleRect = this.previewCircle.getBoundingClientRect();
        const imgRect = this.image.getBoundingClientRect();
        
        const scaledWidth = imgRect.width;
        const scaledHeight = imgRect.height;
        const circleRadius = circleRect.width / 2;
        
        const maxOffsetX = Math.max(0, (scaledWidth / 2) - circleRadius);
        const maxOffsetY = Math.max(0, (scaledHeight / 2) - circleRadius);
        
        let constrainedX = x;
        if (Math.abs(x) > maxOffsetX) {
            constrainedX = x > 0 ? maxOffsetX : -maxOffsetX;
        }
        
        let constrainedY = y;
        if (Math.abs(y) > maxOffsetY) {
            constrainedY = y > 0 ? maxOffsetY : -maxOffsetY;
        }
        
        return { x: constrainedX, y: constrainedY };
    }
    
    updateImageTransform() {
        if (this.image) {
            // Combine base centering (-50%, -50%) with user positioning and scaling
            this.image.style.transform = `translate(calc(-50% + ${this.imageX}px), calc(-50% + ${this.imageY}px)) scale(${this.scale})`;
        }
    }
    
    async handleConfirm() {
        try {
            console.log('🔄 Cropping image...');
            const croppedImage = await this.getCroppedImage();
            console.log('✅ Image cropped, data URL length:', croppedImage.length);
            
            // Check if we're in a popup window or full page
            const isPopup = window.opener && !window.opener.closed;
            
            if (isPopup) {
                // Send cropped image to parent window via postMessage
                try {
                    console.log('📤 Sending cropped image to parent window...');
                    window.opener.postMessage({ 
                        type: 'avatar_cropped',
                        imageData: croppedImage
                    }, window.location.origin);
                    console.log('✅ Message sent to parent');
                    
                    // Small delay before closing
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Close window
                    window.close();
                } catch (e) {
                    console.error('Could not post message to opener:', e);
                    alert('Failed to send image data. Please try again.');
                    return;
                }
            } else {
                // Full page mode (mobile) - store in sessionStorage and navigate back
                console.log('📤 Storing cropped image in sessionStorage for mobile...');
                sessionStorage.setItem('avatar_cropped_image', croppedImage);
                sessionStorage.setItem('avatar_crop_confirmed', 'true');
                
                // Navigate back to account page
                window.location.href = '/account/';
            }
        } catch (error) {
            console.error('Error cropping image:', error);
            alert('Failed to crop image. Please try again.');
        }
    }
    
    handleCancel() {
        // Clean up sessionStorage
        sessionStorage.removeItem('avatar_crop_image');
        sessionStorage.removeItem('avatar_cropped_image');
        sessionStorage.removeItem('avatar_crop_confirmed');
        
        // Check if we're in a popup or full page
        const isPopup = window.opener && !window.opener.closed;
        
        if (isPopup) {
            window.close();
        } else {
            // Navigate back to account page
            window.location.href = '/account/';
        }
    }
    
    async getCroppedImage() {
        return new Promise((resolve, reject) => {
            try {
                console.log('📊 Crop state:', {
                    imageX: this.imageX,
                    imageY: this.imageY,
                    scale: this.scale
                });
                
                // Get the preview circle dimensions
                const circleSize = this.previewCircle.offsetWidth;
                
                console.log('Circle size:', circleSize);
                
                // Get natural image dimensions
                const natWidth = this.image.naturalWidth;
                const natHeight = this.image.naturalHeight;
                
                console.log('Natural dimensions:', natWidth, 'x', natHeight);
                
                // Create a canvas that matches the preview circle exactly
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = circleSize;
                tempCanvas.height = circleSize;
                
                // Calculate how the image is displayed in CSS
                // CSS: height: 100%, max-width: none, top: 50%, left: 50%
                // This means the image height = circleSize, width is scaled proportionally
                const displayHeight = circleSize;
                const displayWidth = (natWidth / natHeight) * displayHeight;
                
                console.log('CSS display dimensions:', displayWidth, 'x', displayHeight);
                
                // Apply the same transforms as CSS: translate(calc(-50% + Xpx), calc(-50% + Ypx)) scale(Z)
                tempCtx.save();
                
                // Move to center of circle
                tempCtx.translate(circleSize / 2, circleSize / 2);
                
                // Apply user's position offset
                tempCtx.translate(this.imageX, this.imageY);
                
                // Apply scale
                tempCtx.scale(this.scale, this.scale);
                
                // Draw image with the same dimensions as CSS display
                tempCtx.drawImage(
                    this.image,
                    -displayWidth / 2,
                    -displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                
                tempCtx.restore();
                
                // Create the final output canvas with circular clipping
                const outputSize = 400;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = outputSize;
                canvas.height = outputSize;
                
                // Apply circular clipping
                ctx.save();
                ctx.beginPath();
                ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                
                // Draw the temp canvas scaled to output size
                ctx.drawImage(tempCanvas, 0, 0, circleSize, circleSize, 0, 0, outputSize, outputSize);
                
                ctx.restore();
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                console.log('✅ Cropped image created');
                resolve(dataUrl);
                
            } catch (error) {
                console.error('❌ Error in getCroppedImage:', error);
                reject(error);
            }
        });
    }
    
    async initializeTranslations() {
        // Always show content first - add loaded class to all translatable elements
        document.querySelectorAll('.translatable-content').forEach(element => {
            element.classList.add('loaded');
        });
        
        // Remove hide-translatable class to show content
        document.documentElement.classList.remove('hide-translatable');
        
        try {
            // Load profile management translations
            const response = await fetch('/account/components/profile-management/locales/profile-management-locales.json');
            const translations = await response.json();
            
            // Get current language from localStorage
            const currentLanguage = localStorage.getItem('language') || 'en';
            
            // Get translations for current language
            const languageTranslations = translations[currentLanguage];
            
            if (!languageTranslations) {
                console.warn('No translations found for language:', currentLanguage);
                return;
            }
            
            // Update all translatable elements
            this.updateTranslations(languageTranslations);
            
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }
    
    updateTranslations(translations) {
        document.querySelectorAll('.translatable-content').forEach(element => {
            const key = element.dataset.translationKey;
            if (key && translations[key]) {
                element.textContent = translations[key];
            } else if (key) {
                // Handle nested keys like "avatar.cropper.title"
                const keys = key.split('.');
                let value = translations;
                for (const k of keys) {
                    value = value?.[k];
                }
                if (value) {
                    element.textContent = value;
                }
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const cropper = new AvatarCropperPage();
    cropper.init();
});


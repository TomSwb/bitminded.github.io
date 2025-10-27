/**
 * Step 3: Content & Media
 * Handles product icons, screenshots, features, and media URLs
 */

if (typeof window.StepContentMedia === 'undefined') {
    window.StepContentMedia = class {
        constructor() {
            this.elements = {};
            this.maxScreenshots = 5;
            this.screenshotIndex = 0;
        }

        async init() {
            console.log('🎨 Initializing Step 3: Content & Media');
            this.initializeElements();
            this.setupEventListeners();
            this.setupDefaults();
        }

        initializeElements() {
            // Icon upload
            this.elements.iconInput = document.getElementById('product-icon');
            this.elements.iconPreview = document.getElementById('icon-preview');

            // Screenshots
            this.elements.screenshotsContainer = document.querySelector('.step-content-media__screenshots');
            this.elements.addScreenshotBtn = document.getElementById('add-screenshot-btn');

            // Features
            this.elements.featuresList = document.getElementById('features-list');
            this.elements.addFeatureBtn = document.getElementById('add-feature-btn');

            // URLs
            this.elements.demoVideoUrl = document.getElementById('demo-video-url');
            this.elements.documentationUrl = document.getElementById('documentation-url');
            this.elements.supportEmail = document.getElementById('support-email');

            // Preview container
            this.elements.iconPreviewContainer = this.elements.iconPreview?.parentElement;
        }

        setupEventListeners() {
            // Icon upload
            if (this.elements.iconInput) {
                this.elements.iconInput.addEventListener('change', (e) => this.handleIconUpload(e));
                this.elements.iconPreviewContainer?.addEventListener('click', () => {
                    this.elements.iconInput?.click();
                });
            }

            // Add screenshot button
            if (this.elements.addScreenshotBtn) {
                this.elements.addScreenshotBtn.addEventListener('click', () => this.addScreenshotSlot());
            }

            // Add feature button
            if (this.elements.addFeatureBtn) {
                this.elements.addFeatureBtn.addEventListener('click', () => this.addFeatureSlot());
            }

            // Initialize feature input listeners
            this.setupFeatureListeners();
        }

        setupFeatureListeners() {
            if (!this.elements.featuresList) return;

            // Remove feature buttons
            this.elements.featuresList.querySelectorAll('.step-content-media__remove-feature').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.target.closest('.step-content-media__feature-item').remove();
                    this.saveFormData();
                });
            });

            // Feature input changes
            this.elements.featuresList.querySelectorAll('.step-content-media__feature-input').forEach(input => {
                input.addEventListener('input', () => this.saveFormData());
            });
        }

        setupDefaults() {
            if (!window.productWizard) return;

            const basicInfo = window.productWizard.formData || {};
            const stepData = window.productWizard.stepData || {};

            // Load icon
            if (basicInfo.icon_url) {
                this.loadIconPreview(basicInfo.icon_url);
            }

            // Load screenshots (optional, no default empty slot)
            if (basicInfo.screenshots) {
                // Ensure screenshots is an array
                const screenshotsArray = Array.isArray(basicInfo.screenshots) 
                    ? basicInfo.screenshots 
                    : [basicInfo.screenshots].filter(Boolean);
                
                // Filter out invalid URLs (not actual image URLs)
                const validScreenshots = screenshotsArray.filter(url => {
                    return url && 
                           typeof url === 'string' && 
                           url.startsWith('http') && 
                           !url.includes('product-wizard.html');
                });
                
                if (validScreenshots.length > 0) {
                    validScreenshots.forEach((url, index) => {
                        if (index < this.maxScreenshots) {
                            this.addScreenshotSlot(url);
                        }
                    });
                }
            }

            // Load features (no default empty field)
            if (basicInfo.features) {
                // Ensure features is an array
                const featuresArray = Array.isArray(basicInfo.features) 
                    ? basicInfo.features 
                    : [basicInfo.features].filter(Boolean);
                
                if (featuresArray.length > 0) {
                    featuresArray.forEach(feature => {
                        this.addFeatureSlot(feature);
                    });
                }
            }

            // Load URLs
            if (basicInfo.demo_video_url) {
                this.elements.demoVideoUrl.value = basicInfo.demo_video_url;
            }
            if (basicInfo.documentation_url) {
                this.elements.documentationUrl.value = basicInfo.documentation_url;
            }
            if (basicInfo.support_email) {
                this.elements.supportEmail.value = basicInfo.support_email;
            }
        }

        handleIconUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadIconPreview(e.target.result);
                
                // Upload to storage
                this.uploadIcon(file);
            };
            reader.readAsDataURL(file);
        }

        loadIconPreview(url) {
            if (!this.elements.iconPreview) return;
            
            this.elements.iconPreview.src = url;
            this.elements.iconPreview.style.display = 'block';
            const placeholder = this.elements.iconPreviewContainer?.querySelector('.step-content-media__preview-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }

        async uploadIcon(file) {
            try {
                // Upload to Supabase Storage (products bucket)
                const fileExt = file.name.split('.').pop();
                const fileName = `${window.productWizard.formData.id || Date.now()}_icon.${fileExt}`;
                const filePath = `products/${window.productWizard.formData.slug || 'temp'}/${fileName}`;

                const { data, error } = await window.supabase.storage
                    .from('products')
                    .upload(filePath, file, {
                        upsert: true,
                        contentType: file.type
                    });

                if (error) throw error;

                // Get public URL
                const { data: urlData } = window.supabase.storage
                    .from('products')
                    .getPublicUrl(filePath);

                // Save to form data
                if (window.productWizard) {
                    window.productWizard.formData.icon_url = urlData.publicUrl;
                    this.saveFormData();
                }

                console.log('✅ Icon uploaded successfully:', urlData.publicUrl);
            } catch (error) {
                console.error('❌ Error uploading icon:', error);
                alert('Failed to upload icon. Please try again.');
            }
        }

        addScreenshotSlot(existingUrl = null) {
            const screenshotsContainer = this.elements.screenshotsContainer;
            if (!screenshotsContainer) return;

            const currentScreenshots = screenshotsContainer.querySelectorAll('.step-content-media__screenshot-container').length;
            if (currentScreenshots >= this.maxScreenshots) {
                alert(`Maximum ${this.maxScreenshots} screenshots allowed`);
                return;
            }

            const container = document.createElement('div');
            container.className = 'step-content-media__screenshot-container';
            container.setAttribute('data-index', this.screenshotIndex);

            container.innerHTML = `
                <input type="file" class="step-content-media__screenshot-input" accept="image/*" data-index="${this.screenshotIndex}">
                <div class="step-content-media__screenshot-preview">
                    <img class="screenshot-img" style="display: ${existingUrl ? 'block' : 'none'};" src="${existingUrl || ''}">
                    <div class="step-content-media__preview-placeholder" style="display: ${existingUrl ? 'none' : 'flex'}; flex-direction: column; align-items: center; justify-content: center;">
                        <span>📸</span>
                        <p>Add screenshot</p>
                    </div>
                </div>
                <button type="button" class="step-content-media__remove-screenshot" style="display: ${existingUrl ? 'block' : 'none'};">✕</button>
            `;

            screenshotsContainer.appendChild(container);

            // Setup event listeners for this screenshot
            const input = container.querySelector('.step-content-media__screenshot-input');
            const removeBtn = container.querySelector('.step-content-media__remove-screenshot');
            const previewImg = container.querySelector('.screenshot-img');

            input.addEventListener('change', (e) => this.handleScreenshotUpload(e, container));
            removeBtn.addEventListener('click', () => this.removeScreenshot(container));
            container.addEventListener('click', (e) => {
                if (e.target === container || e.target === container.querySelector('.step-content-media__preview-placeholder')) {
                    input.click();
                }
            });

            this.screenshotIndex++;
        }

        handleScreenshotUpload(event, container) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            const previewImg = container.querySelector('.screenshot-img');
            const placeholder = container.querySelector('.step-content-media__preview-placeholder');
            const removeBtn = container.querySelector('.step-content-media__remove-screenshot');

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'block';
                
                // Upload to storage
                this.uploadScreenshot(file, container);
            };
            reader.readAsDataURL(file);
        }

        async uploadScreenshot(file, container) {
            try {
                // Upload to Supabase Storage (products bucket)
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `products/${window.productWizard.formData.slug || 'temp'}/screenshots/${fileName}`;

                const { data, error } = await window.supabase.storage
                    .from('products')
                    .upload(filePath, file, {
                        upsert: true,
                        contentType: file.type
                    });

                if (error) throw error;

                // Get public URL
                const { data: urlData } = window.supabase.storage
                    .from('products')
                    .getPublicUrl(filePath);

                // Store URL in container for later retrieval
                container.dataset.screenshotUrl = urlData.publicUrl;

                // Save to form data
                this.saveFormData();

                console.log('✅ Screenshot uploaded successfully:', urlData.publicUrl);
            } catch (error) {
                console.error('❌ Error uploading screenshot:', error);
                alert('Failed to upload screenshot. Please try again.');
            }
        }

        removeScreenshot(container) {
            container.remove();
            this.saveFormData();
        }

        addFeatureSlot(existingValue = '') {
            const featureItem = document.createElement('div');
            featureItem.className = 'step-content-media__feature-item';

            featureItem.innerHTML = `
                <input type="text" class="step-content-media__feature-input" placeholder="Enter a feature" value="${existingValue}">
                <button type="button" class="step-content-media__remove-feature">✕</button>
            `;

            this.elements.featuresList.appendChild(featureItem);

            // Setup event listeners
            const input = featureItem.querySelector('.step-content-media__feature-input');
            const removeBtn = featureItem.querySelector('.step-content-media__remove-feature');

            input.addEventListener('input', () => this.saveFormData());
            removeBtn.addEventListener('click', () => {
                featureItem.remove();
                this.saveFormData();
            });
        }

        saveFormData() {
            if (!window.productWizard) return;

            // Get icon URL
            const iconUrl = window.productWizard.formData.icon_url;

            // Get screenshots
            const screenshotContainers = this.elements.screenshotsContainer?.querySelectorAll('.step-content-media__screenshot-container') || [];
            const screenshots = Array.from(screenshotContainers)
                .map(container => {
                    const url = container.dataset.screenshotUrl;
                    const previewImg = container.querySelector('.screenshot-img');
                    // Use stored URL or image src as fallback
                    return url || previewImg?.src || null;
                })
                .filter(url => url && url !== 'data:,');

            // Get features
            const featureInputs = this.elements.featuresList?.querySelectorAll('.step-content-media__feature-input') || [];
            const features = Array.from(featureInputs)
                .map(input => input.value.trim())
                .filter(value => value);

            // Get URLs
            const demoVideoUrl = this.elements.demoVideoUrl?.value || '';
            const documentationUrl = this.elements.documentationUrl?.value || '';
            const supportEmail = this.elements.supportEmail?.value || '';

            // Save to form data
            window.productWizard.formData.icon_url = iconUrl || null;
            window.productWizard.formData.screenshots = screenshots.length > 0 ? screenshots : null;
            window.productWizard.formData.features = features.length > 0 ? features : null;
            window.productWizard.formData.demo_video_url = demoVideoUrl || null;
            window.productWizard.formData.documentation_url = documentationUrl || null;
            window.productWizard.formData.support_email = supportEmail || null;

            console.log('💾 Saved content & media data to formData');
        }

        setFormData(formData) {
            // This method is called by the wizard to load existing data
            if (formData) {
                window.productWizard.formData = { ...window.productWizard.formData, ...formData };
            }
        }

        validate() {
            // Validate required fields
            const iconUrl = window.productWizard?.formData?.icon_url;
            const screenshots = window.productWizard?.formData?.screenshots || [];
            const features = window.productWizard?.formData?.features || [];

            if (!iconUrl) {
                alert('Please upload a product icon');
                this.elements.iconInput?.click();
                return false;
            }

            // Screenshots are optional now
            // if (screenshots.length === 0) {
            //     alert('Please add at least one screenshot');
            //     return false;
            // }

            if (features.length === 0) {
                alert('Please add at least one feature');
                this.elements.featuresList?.querySelector('.step-content-media__feature-input')?.focus();
                return false;
            }

            return true;
        }
    };
}


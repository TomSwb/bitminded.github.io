/**
 * Quick Product Modal Component
 * Handles quick product addition with translations for external products (e.g., itch.io games)
 */

if (typeof window.QuickProductModal === 'undefined') {
    const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

    class QuickProductModal {
        constructor() {
            this.isInitialized = false;
            this.elements = {};
            this.categories = [];
            this.translationTabs = [];
            this.translationPanels = [];
            this.translationInputs = [];
        }

        /**
         * Initialize the modal
         */
        async init(config = {}) {
            if (this.isInitialized) {
                return;
            }

            try {
                this.cacheElements();
                this.bindEvents();
                await this.loadCategories();
                await this.loadTranslations();
                this.showTranslatableContent();

                this.isInitialized = true;
                window.logger?.log('✅ Quick Product Modal initialized');
            } catch (error) {
                window.logger?.error('❌ Quick Product Modal: Failed to initialize:', error);
                throw error;
            }
        }

        /**
         * Cache DOM elements
         */
        cacheElements() {
            this.elements = {
                modal: document.getElementById('quick-product-modal'),
                overlay: document.querySelector('.quick-product-modal__overlay'),
                form: document.getElementById('quick-product-form'),
                productName: document.getElementById('quick-product-name'),
                productSlug: document.getElementById('quick-product-slug'),
                productShortDescription: document.getElementById('quick-product-short-description'),
                productDescription: document.getElementById('quick-product-description'),
                externalUrl: document.getElementById('quick-product-external-url'),
                imageInput: document.getElementById('quick-product-image'),
                imagePreview: document.getElementById('quick-product-image-preview'),
                imagePreviewPlaceholder: document.querySelector('.quick-product-modal__preview-placeholder'),
                imageStatus: document.getElementById('quick-product-image-status'),
                category: document.getElementById('quick-product-category'),
                status: document.getElementById('quick-product-status'),
                generateTranslationsBtn: document.getElementById('quick-product-generate-translations-btn'),
                generateTranslationsStatus: document.getElementById('quick-product-generate-translations-status'),
                saveBtn: document.getElementById('save-quick-product'),
                cancelBtn: document.getElementById('cancel-quick-product'),
                closeBtn: document.getElementById('close-quick-product-modal'),
                errorContainer: document.getElementById('quick-product-error'),
                errorMessage: document.getElementById('quick-product-error-message')
            };

            // Store uploaded image URL
            this.uploadedImageUrl = null;

            this.elements.generateTranslationsLabel = this.elements.generateTranslationsBtn
                ? this.elements.generateTranslationsBtn.querySelector('.translatable-content')
                : null;

            this.translationTabs = Array.from(document.querySelectorAll('.quick-product-modal__translations-tab[data-language-tab]'));
            this.translationPanels = Array.from(document.querySelectorAll('.quick-product-modal__translations-panel[data-language-panel]'));
            this.translationInputs = Array.from(document.querySelectorAll('[data-translation-field]'));
        }

        /**
         * Bind event listeners
         */
        bindEvents() {
            // Form submission
            if (this.elements.form) {
                this.elements.form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveProduct();
                });
            }

            // Save button
            if (this.elements.saveBtn) {
                this.elements.saveBtn.addEventListener('click', () => {
                    this.saveProduct();
                });
            }

            // Cancel/Close buttons
            if (this.elements.cancelBtn) {
                this.elements.cancelBtn.addEventListener('click', () => {
                    this.close();
                });
            }

            if (this.elements.closeBtn) {
                this.elements.closeBtn.addEventListener('click', () => {
                    this.close();
                });
            }

            if (this.elements.overlay) {
                this.elements.overlay.addEventListener('click', () => {
                    this.close();
                });
            }

            // Slug auto-generation from name
            if (this.elements.productName) {
                this.elements.productName.addEventListener('input', () => {
                    this.updateSlugFromName();
                });
            }

            // Image upload
            if (this.elements.imageInput) {
                this.elements.imageInput.addEventListener('change', (e) => {
                    this.handleImageUpload(e);
                });
            }

            // Click on preview area to trigger file input
            if (this.elements.imagePreviewPlaceholder) {
                const previewArea = this.elements.imagePreviewPlaceholder.closest('.quick-product-modal__preview');
                if (previewArea && this.elements.imageInput) {
                    previewArea.addEventListener('click', () => {
                        this.elements.imageInput.click();
                    });
                }
            }

            // Translation tabs
            this.setupTranslationTabs();

            // Generate translations button
            if (this.elements.generateTranslationsBtn) {
                this.elements.generateTranslationsBtn.addEventListener('click', () => {
                    this.generateTranslations();
                });
            }

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this.elements.modal?.classList.contains('hidden')) {
                    this.close();
                }
            });
        }

        /**
         * Setup translation tabs
         */
        setupTranslationTabs() {
            if (!this.translationTabs.length) {
                return;
            }

            this.translationTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const language = tab.dataset.languageTab;
                    this.activateTranslationTab(language);
                });
            });

            this.activateTranslationTab('en');
        }

        /**
         * Activate a translation tab
         */
        activateTranslationTab(language) {
            this.translationTabs.forEach(tab => {
                const isActive = tab.dataset.languageTab === language;
                tab.classList.toggle('active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            this.translationPanels.forEach(panel => {
                const isActive = panel.dataset.languagePanel === language;
                panel.classList.toggle('active', isActive);
                if (isActive) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', 'true');
                }
            });
        }

        /**
         * Update slug from product name
         */
        updateSlugFromName() {
            if (!this.elements.productName || !this.elements.productSlug) {
                return;
            }

            const name = this.elements.productName.value;
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            this.elements.productSlug.value = slug;
        }

        /**
         * Load categories from database
         */
        async loadCategories() {
            try {
                if (!window.supabase) {
                    window.logger?.warn('⚠️ Supabase not available');
                    return;
                }

                const { data, error } = await window.supabase
                    .from('product_categories')
                    .select('id, name, description')
                    .eq('is_active', true)
                    .order('name');

                if (error) {
                    throw error;
                }

                this.categories = data || [];
                this.populateCategoryDropdown();
            } catch (error) {
                window.logger?.error('❌ Error loading categories:', error);
            }
        }

        /**
         * Populate category dropdown
         */
        populateCategoryDropdown() {
            if (!this.elements.category) {
                return;
            }

            // Keep the first option (Select a category...)
            const firstOption = this.elements.category.querySelector('option[value=""]');
            this.elements.category.innerHTML = '';
            if (firstOption) {
                this.elements.category.appendChild(firstOption);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Select a category...';
                this.elements.category.appendChild(option);
            }

            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                this.elements.category.appendChild(option);
            });
        }

        /**
         * Generate translations
         */
        async generateTranslations() {
            if (!window.supabase?.functions) {
                this.updateTranslationsStatus('Translation service unavailable. Check Supabase functions config.', 'error');
                return;
            }

            const englishContent = {
                name: this.elements.productName?.value?.trim() || '',
                summary: this.elements.productShortDescription?.value?.trim() || '',
                description: this.elements.productDescription?.value?.trim() || ''
            };

            if (!englishContent.name && !englishContent.summary && !englishContent.description) {
                this.updateTranslationsStatus('Add English content before generating translations.', 'error');
                return;
            }

            this.setGenerateTranslationsLoading(true);
            this.updateTranslationsStatus('Translating with OpenAI…', 'info');

            try {
                const data = await window.invokeEdgeFunction('translate-product-content', {
                    body: {
                        sourceLanguage: 'en',
                        targetLanguages: SUPPORTED_LANGUAGES.filter(lang => lang !== 'en'),
                        fields: englishContent
                    }
                });

                if (data?.translations) {
                    this.applyTranslations(data.translations);
                    this.updateTranslationsStatus('Translations updated. Review each language and adjust if needed.', 'success');
                } else {
                    this.updateTranslationsStatus('No translations returned. Try again.', 'error');
                }
            } catch (error) {
                window.logger?.error('❌ Translation generation failed:', error);
                const detail = error?.message || 'Unable to reach translation service.';
                this.updateTranslationsStatus(`Translation failed: ${detail}`, 'error');
            } finally {
                this.setGenerateTranslationsLoading(false);
            }
        }

        /**
         * Set generate translations loading state
         */
        setGenerateTranslationsLoading(isLoading) {
            if (!this.elements.generateTranslationsBtn) {
                return;
            }

            this.elements.generateTranslationsBtn.disabled = isLoading;
            this.elements.generateTranslationsBtn.classList.toggle('is-loading', isLoading);
            if (this.elements.generateTranslationsLabel) {
                if (isLoading) {
                    this.elements.generateTranslationsLabel.textContent = 'Translating…';
                } else {
                    this.elements.generateTranslationsLabel.textContent = 'Generate Translations';
                }
            }
        }

        /**
         * Update translations status message
         */
        updateTranslationsStatus(message, status = 'info') {
            if (!this.elements.generateTranslationsStatus) {
                return;
            }

            this.elements.generateTranslationsStatus.textContent = message;
            this.elements.generateTranslationsStatus.dataset.status = status;
        }

        /**
         * Apply translations to form fields
         */
        applyTranslations(translations) {
            Object.entries(translations).forEach(([language, fields]) => {
                Object.entries(fields || {}).forEach(([fieldKey, value]) => {
                    const input = this.translationInputs.find(
                        el =>
                            el.dataset.language === language &&
                            el.dataset.translationField === fieldKey
                    );
                    if (input) {
                        input.value = value || '';
                    }
                });
            });
        }

        /**
         * Collect translations from form
         */
        collectTranslations() {
            const collected = {
                name: {},
                summary: {},
                description: {}
            };

            this.translationInputs.forEach(input => {
                const language = input.dataset.language;
                const field = input.dataset.translationField;

                if (!language || !field || !Object.prototype.hasOwnProperty.call(collected, field)) {
                    return;
                }

                const value = input.value.trim();
                if (value) {
                    collected[field][language] = value;
                }
            });

            // Add English from main form fields
            const englishName = this.elements.productName?.value?.trim() || '';
            const englishSummary = this.elements.productShortDescription?.value?.trim() || '';
            const englishDescription = this.elements.productDescription?.value?.trim() || '';

            collected.name.en = englishName;
            collected.summary.en = englishSummary;
            collected.description.en = englishDescription;

            return collected;
        }

        /**
         * Handle image upload
         */
        handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showImageStatus('Please select an image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showImageStatus('Image size should be less than 5MB', 'error');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadImagePreview(e.target.result);
                this.showImageStatus('Uploading image...', 'info');
                
                // Upload to storage
                this.uploadImage(file);
            };
            reader.readAsDataURL(file);
        }

        /**
         * Load image preview
         */
        loadImagePreview(url) {
            if (!this.elements.imagePreview || !this.elements.imagePreviewPlaceholder) {
                return;
            }

            this.elements.imagePreview.src = url;
            this.elements.imagePreview.style.display = 'block';
            this.elements.imagePreviewPlaceholder.style.display = 'none';
        }

        /**
         * Show image upload status
         */
        showImageStatus(message, status = 'info') {
            if (this.elements.imageStatus) {
                this.elements.imageStatus.textContent = message;
                this.elements.imageStatus.style.display = 'block';
                this.elements.imageStatus.style.color = status === 'error' 
                    ? 'var(--color-error)' 
                    : status === 'success' 
                    ? 'var(--color-success)' 
                    : 'var(--color-text-primary)';
            }
        }

        /**
         * Upload image to Supabase Storage
         */
        async uploadImage(file) {
            try {
                if (!window.supabase) {
                    throw new Error('Supabase not available');
                }

                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(7);
                const fileName = `${timestamp}_${randomStr}_icon.${fileExt}`;
                
                // Use slug if available, otherwise use temp
                const slug = this.elements.productSlug?.value?.trim() || 'temp';
                const filePath = `products/${slug}/${fileName}`;

                // Upload to Supabase Storage
                const { data, error } = await window.supabase.storage
                    .from('products')
                    .upload(filePath, file, {
                        upsert: true,
                        contentType: file.type
                    });

                if (error) {
                    throw error;
                }

                // Get public URL
                const { data: urlData } = window.supabase.storage
                    .from('products')
                    .getPublicUrl(filePath);

                // Store the URL
                this.uploadedImageUrl = urlData.publicUrl;
                this.showImageStatus('Image uploaded successfully', 'success');

                window.logger?.log('✅ Image uploaded successfully:', urlData.publicUrl);
            } catch (error) {
                window.logger?.error('❌ Error uploading image:', error);
                this.showImageStatus('Failed to upload image. Please try again.', 'error');
                this.uploadedImageUrl = null;
            }
        }

        /**
         * Validate form
         */
        validateForm() {
            const errors = [];

            // Product name
            if (!this.elements.productName?.value?.trim() || this.elements.productName.value.trim().length < 2) {
                errors.push('Product name is required (minimum 2 characters)');
            }

            // Product slug
            const slug = this.elements.productSlug?.value?.trim();
            if (!slug) {
                errors.push('Product slug is required');
            } else if (!/^[a-z0-9-]+$/.test(slug)) {
                errors.push('Product slug must contain only lowercase letters, numbers, and hyphens');
            }

            // Short description
            if (!this.elements.productShortDescription?.value?.trim()) {
                errors.push('Short description is required');
            } else if (this.elements.productShortDescription.value.trim().length > 500) {
                errors.push('Short description must be 500 characters or less');
            }

            // External URL
            if (!this.elements.externalUrl?.value?.trim()) {
                errors.push('itch.io URL is required');
            } else {
                try {
                    new URL(this.elements.externalUrl.value.trim());
                } catch (e) {
                    errors.push('Invalid URL format');
                }
            }

            // Image - check if uploaded
            if (!this.uploadedImageUrl && (!this.elements.imageInput?.files || this.elements.imageInput.files.length === 0)) {
                errors.push('Product image is required. Please upload an image.');
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        }

        /**
         * Check if slug is unique
         */
        async checkSlugUniqueness(slug) {
            try {
                if (!window.supabase) {
                    return { isUnique: false, error: 'Supabase not available' };
                }

                const { data, error } = await window.supabase
                    .from('products')
                    .select('id')
                    .eq('slug', slug)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                return { isUnique: !data, error: data ? 'Slug already exists' : null };
            } catch (error) {
                window.logger?.error('❌ Error checking slug uniqueness:', error);
                return { isUnique: false, error: error.message };
            }
        }

        /**
         * Show error message
         */
        showError(message) {
            if (this.elements.errorContainer && this.elements.errorMessage) {
                this.elements.errorMessage.textContent = message;
                this.elements.errorContainer.classList.remove('hidden');
            }
        }

        /**
         * Hide error message
         */
        hideError() {
            if (this.elements.errorContainer) {
                this.elements.errorContainer.classList.add('hidden');
                if (this.elements.errorMessage) {
                    this.elements.errorMessage.textContent = '';
                }
            }
        }

        /**
         * Save product to database
         */
        async saveProduct() {
            this.hideError();

            // Validate form
            const validation = this.validateForm();
            if (!validation.isValid) {
                this.showError(validation.errors.join('. '));
                return;
            }

            // Check slug uniqueness
            const slug = this.elements.productSlug.value.trim();
            const slugCheck = await this.checkSlugUniqueness(slug);
            if (!slugCheck.isUnique) {
                this.showError(`Slug "${slug}" is already in use. Please choose a different slug.`);
                return;
            }

            // Collect translations
            const translations = this.collectTranslations();

            // Ensure image is uploaded
            if (!this.uploadedImageUrl) {
                // If file is selected but not uploaded yet, upload it now
                if (this.elements.imageInput?.files && this.elements.imageInput.files.length > 0) {
                    this.showError('Please wait for image upload to complete.');
                    return;
                } else {
                    this.showError('Product image is required. Please upload an image.');
                    return;
                }
            }

            // Prepare product data
            const externalUrl = this.elements.externalUrl.value.trim();
            const productData = {
                name: this.elements.productName.value.trim(),
                slug: slug,
                short_description: this.elements.productShortDescription.value.trim(),
                description: this.elements.productDescription?.value?.trim() || null,
                external_url: externalUrl,
                icon_url: this.uploadedImageUrl,
                status: this.elements.status?.value || 'active',
                pricing_type: null,
                // For external products (e.g., itch.io games), make them available for purchase
                is_available_for_purchase: externalUrl && externalUrl.length > 0,
                name_translations: translations.name,
                summary_translations: translations.summary,
                description_translations: translations.description,
                category_id: this.elements.category?.value || null
            };

            // Disable save button
            if (this.elements.saveBtn) {
                this.elements.saveBtn.disabled = true;
                this.elements.saveBtn.textContent = 'Saving...';
            }

            try {
                if (!window.supabase) {
                    throw new Error('Supabase not available');
                }

                const { data, error } = await window.supabase
                    .from('products')
                    .insert(productData)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                window.logger?.log('✅ Product saved successfully:', data);

                // Close modal and refresh product list
                this.close();
                this.resetForm();

                // Trigger product list refresh if ProductManagement is available
                if (window.productManagement && typeof window.productManagement.loadProducts === 'function') {
                    await window.productManagement.loadProducts();
                }

                // Show success message (could use a notification system)
                if (window.productManagement && typeof window.productManagement.showSuccess === 'function') {
                    window.productManagement.showSuccess('Product added successfully!');
                }
            } catch (error) {
                window.logger?.error('❌ Error saving product:', error);
                this.showError(`Failed to save product: ${error.message || 'Unknown error'}`);
            } finally {
                // Re-enable save button
                if (this.elements.saveBtn) {
                    this.elements.saveBtn.disabled = false;
                    const saveLabel = this.elements.saveBtn.querySelector('.translatable-content');
                    if (saveLabel) {
                        saveLabel.textContent = 'Save Product';
                    } else {
                        this.elements.saveBtn.textContent = 'Save Product';
                    }
                }
            }
        }

        /**
         * Reset form
         */
        resetForm() {
            if (this.elements.form) {
                this.elements.form.reset();
            }

            // Clear image preview
            if (this.elements.imagePreview) {
                this.elements.imagePreview.src = '';
                this.elements.imagePreview.style.display = 'none';
            }
            if (this.elements.imagePreviewPlaceholder) {
                this.elements.imagePreviewPlaceholder.style.display = 'flex';
            }
            if (this.elements.imageStatus) {
                this.elements.imageStatus.textContent = '';
                this.elements.imageStatus.style.display = 'none';
            }
            this.uploadedImageUrl = null;

            // Clear translation inputs
            this.translationInputs.forEach(input => {
                input.value = '';
            });

            // Reset status dropdown to default
            if (this.elements.status) {
                this.elements.status.value = 'active';
            }

            // Clear translations status
            this.updateTranslationsStatus('', 'info');

            this.hideError();
        }

        /**
         * Open modal
         */
        open() {
            if (this.elements.modal) {
                this.elements.modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                // Update translations when modal opens
                setTimeout(() => {
                    this.showTranslatableContent();
                }, 100);
            }
        }

        /**
         * Close modal
         */
        close() {
            if (this.elements.modal) {
                this.elements.modal.classList.add('hidden');
                document.body.style.overflow = '';
                this.resetForm();
            }
        }

        /**
         * Load translations
         */
        async loadTranslations() {
            try {
                const response = await fetch('/admin/components/product-management/quick-product-modal/locales/quick-product-modal-locales.json');
                if (!response.ok) {
                    throw new Error(`Failed to load translations: ${response.status}`);
                }

                const translations = await response.json();

                // Add translations to i18next if available
                if (window.i18next && typeof window.i18next.addResourceBundle === 'function') {
                    Object.keys(translations).forEach(lang => {
                        window.i18next.addResourceBundle(
                            lang,
                            'translation',
                            translations[lang].translation,
                            true,
                            true
                        );
                    });
                }

                window.logger?.log('✅ Quick Product Modal translations loaded');
            } catch (error) {
                window.logger?.warn('⚠️ Could not load translations:', error);
            }
        }

        /**
         * Show translatable content
         */
        showTranslatableContent() {
            // Update all translatable elements in the modal
            const elements = document.querySelectorAll('#quick-product-modal .translatable-content[data-translation-key]');
            elements.forEach(el => {
                const key = el.getAttribute('data-translation-key');
                if (key && window.i18next && typeof window.i18next.t === 'function') {
                    const translation = window.i18next.t(key);
                    if (translation && translation !== key) {
                        // Update text content or placeholder
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.placeholder = translation;
                        } else {
                            el.textContent = translation;
                        }
                    }
                }
            });
        }
    }

    // Export globally
    window.QuickProductModal = QuickProductModal;
}

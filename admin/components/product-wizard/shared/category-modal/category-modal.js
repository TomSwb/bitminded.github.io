/**
 * Category Modal Component
 * Handles creating new product categories
 */

if (typeof window.CategoryModal === 'undefined') {
class CategoryModal {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.onCategoryCreated = null;
    }

    /**
     * Initialize the component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {

            // Initialize DOM elements
            this.initializeElements();

            // Initialize translations
            await this.initializeTranslations();

            // Setup event listeners
            this.setupEventListeners();

            // Show translatable content
            this.showTranslatableContent();

            this.isInitialized = true;

        } catch (error) {
            window.logger?.error('❌ Category Modal: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            modal: document.getElementById('category-modal'),
            closeBtn: document.getElementById('close-category-modal'),
            cancelBtn: document.getElementById('cancel-category'),
            saveBtn: document.getElementById('save-category'),
            nameInput: document.getElementById('new-category-name'),
            descriptionInput: document.getElementById('new-category-description')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => {
                this.saveCategory();
            });
        }

        // Close modal when clicking outside
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.hide();
                }
            });
        }

        // Handle Enter key in name field
        if (this.elements.nameInput) {
            this.elements.nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveCategory();
                }
            });
        }
    }

    /**
     * Show the modal
     */
    show() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            // Clear form
            this.clearForm();
            // Focus on name field
            setTimeout(() => {
                if (this.elements.nameInput) {
                    this.elements.nameInput.focus();
                }
            }, 100);
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
    }

    /**
     * Clear the form
     */
    clearForm() {
        if (this.elements.nameInput) {
            this.elements.nameInput.value = '';
        }
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.value = '';
        }
    }

    /**
     * Save new category
     */
    async saveCategory() {
        if (!this.elements.nameInput || !this.elements.nameInput.value.trim()) {
            this.showError('Category name is required');
            return;
        }

        try {
            this.showLoading();

            const categoryName = this.elements.nameInput.value.trim();
            const categoryData = {
                name: categoryName,
                slug: this.generateSlug(categoryName),
                description: this.elements.descriptionInput ? this.elements.descriptionInput.value.trim() : '',
                is_active: true
            };

            // Insert new category into database
            const { data, error } = await window.supabase
                .from('product_categories')
                .insert([categoryData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Hide modal
            this.hide();

            // Notify parent component
            if (this.onCategoryCreated) {
                this.onCategoryCreated(data);
            }

            // Show success message
            this.showSuccess(`Category "${data.name}" created successfully!`);

            window.logger?.log('✅ Category created:', data);

        } catch (error) {
            window.logger?.error('❌ Error creating category:', error);
            this.showError(`Failed to create category: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Set callback for when category is created
     */
    setOnCategoryCreated(callback) {
        this.onCategoryCreated = callback;
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = true;
            this.elements.saveBtn.textContent = 'Saving...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = false;
            this.elements.saveBtn.innerHTML = '<span class="translatable-content" data-translation-key="Save Category">Save Category</span>';
        }
    }

    /**
     * Generate URL-friendly slug from category name
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }

    /**
     * Show error message
     */
    showError(message) {
        // This would integrate with the main wizard's message system
        window.logger?.error('Category Modal Error:', message);
        // For now, just alert - this should be replaced with proper message system
        alert(message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // This would integrate with the main wizard's message system
        window.logger?.log('Category Modal Success:', message);
        // For now, just log - this should be replaced with proper message system
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.categoryModalTranslations) {
                await window.categoryModalTranslations.init();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#category-modal .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }
}

// Export for use in other scripts
window.CategoryModal = CategoryModal;
}

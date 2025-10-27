/**
 * Step 1: Basic Information Component
 * Handles basic product information form
 */

if (typeof window.StepBasicInfo === 'undefined') {
class StepBasicInfo {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.categories = [];
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

            // Load categories
            await this.loadCategories();

            // Show translatable content
            this.showTranslatableContent();

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Step 1: Basic Information: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            productName: document.getElementById('product-name'),
            productSlug: document.getElementById('product-slug'),
            productCategory: document.getElementById('product-category'),
            productShortDescription: document.getElementById('product-short-description'),
            productDescription: document.getElementById('product-description'),
            productTags: document.getElementById('product-tags'),
            pricingType: document.getElementById('pricing-type'),
            addCategoryBtn: document.getElementById('add-category-btn')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auto-generate slug from product name
        if (this.elements.productName) {
            this.elements.productName.addEventListener('input', () => {
                this.updateSlugFromName();
            });
        }

        // Add category button
        if (this.elements.addCategoryBtn) {
            this.elements.addCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }
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
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

        this.elements.productSlug.value = slug;
    }

    /**
     * Load categories from database
     */
    async loadCategories() {
        try {
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
            console.error('❌ Error loading categories:', error);
            // Don't throw error, just log it - categories are optional
        }
    }

    /**
     * Populate category dropdown
     */
    populateCategoryDropdown() {
        if (!this.elements.productCategory) {
            return;
        }

        // Clear existing options except the first one
        this.elements.productCategory.innerHTML = '<option value="">Select a category...</option>';

        // Add categories
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            this.elements.productCategory.appendChild(option);
        });
    }

    /**
     * Show add category modal
     */
    showAddCategoryModal() {
        // This will be handled by the shared category modal component
        if (window.categoryModal) {
            window.categoryModal.show();
        }
    }

    /**
     * Add new category to dropdown
     */
    addCategoryToDropdown(category) {
        if (!this.elements.productCategory) {
            return;
        }

        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        this.elements.productCategory.appendChild(option);
        
        // Select the new category
        this.elements.productCategory.value = category.id;
    }

    /**
     * Get form data
     */
    getFormData() {
        const categoryId = this.elements.productCategory?.value || null;
        const selectedCategory = this.categories.find(cat => cat.id === categoryId);
        
        return {
            name: this.elements.productName?.value || '',
            slug: this.elements.productSlug?.value || '',
            category_id: categoryId,
            category: selectedCategory ? selectedCategory.name : '',
            short_description: this.elements.productShortDescription?.value || '',
            description: this.elements.productDescription?.value || '',
            tags: this.elements.productTags?.value || '',
            pricing_type: this.elements.pricingType?.value || ''
        };
    }

    /**
     * Set form data
     */
    setFormData(data) {
        if (this.elements.productName && data.name) {
            this.elements.productName.value = data.name;
        }
        if (this.elements.productSlug && data.slug) {
            this.elements.productSlug.value = data.slug;
        }
        if (this.elements.productCategory && data.category_id) {
            this.elements.productCategory.value = data.category_id;
        }
        if (this.elements.productShortDescription && data.short_description) {
            this.elements.productShortDescription.value = data.short_description;
        }
        if (this.elements.productDescription && data.description) {
            this.elements.productDescription.value = data.description;
        }
        if (this.elements.productTags && data.tags) {
            this.elements.productTags.value = data.tags;
        }
        if (this.elements.pricingType && data.pricing_type) {
            this.elements.pricingType.value = data.pricing_type;
        }
    }

    /**
     * Validate form
     */
    validate() {
        const errors = [];

        if (!this.elements.productName?.value.trim()) {
            errors.push('Product name is required');
            if (this.elements.productName) {
                this.elements.productName.style.borderColor = 'var(--color-error)';
            }
        } else if (this.elements.productName) {
            this.elements.productName.style.borderColor = '';
        }

        if (!this.elements.productSlug?.value.trim()) {
            errors.push('Product slug is required');
            if (this.elements.productSlug) {
                this.elements.productSlug.style.borderColor = 'var(--color-error)';
            }
        } else if (this.elements.productSlug) {
            this.elements.productSlug.style.borderColor = '';
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.stepBasicInfoTranslations) {
                await window.stepBasicInfoTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Save form data to wizard's formData object
     * @param {Object} formData - The wizard's form data object
     */
    saveFormData(formData) {
        const stepData = this.getFormData();
        Object.assign(formData, stepData);
    }

    /**
     * Restore form data from wizard's formData object
     * @param {Object} formData - The wizard's form data object
     */
    restoreFormData(formData) {
        this.setFormData(formData);
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#step-1 .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }
}

// Export for use in other scripts
window.StepBasicInfo = StepBasicInfo;
}

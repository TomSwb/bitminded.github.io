/**
 * Step 1: Basic Information Component
 * Handles basic product information form with multilingual support
 */

(function initStepBasicInfo() {
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

if (typeof window.StepBasicInfo !== 'undefined') {
    return;
}

const TAG_SEPARATOR_REGEX = /\s*,\s*/;

class StepBasicInfo {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.categories = [];
        this.translationTabs = [];
        this.translationPanels = [];
        this.translationInputs = [];
        this.generateBtnLabel = '';
    }

    /**
     * Initialize the component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.initializeElements();
            await this.initializeTranslations();
            this.setupEventListeners();
            await this.loadCategories();
            this.showTranslatableContent();

            this.isInitialized = true;
        } catch (error) {
            window.logger?.error('❌ Step 1: Basic Information: Failed to initialize:', error);
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
            addCategoryBtn: document.getElementById('add-category-btn'),
            generateTranslationsBtn: document.getElementById('generate-translations-btn'),
            generateTranslationsStatus: document.getElementById('generate-translations-status')
        };

        this.elements.generateTranslationsLabel = this.elements.generateTranslationsBtn
            ? this.elements.generateTranslationsBtn.querySelector('.translatable-content')
            : null;
        this.translationTabs = Array.from(document.querySelectorAll('[data-language-tab]'));
        this.translationPanels = Array.from(document.querySelectorAll('[data-language-panel]'));
        this.translationInputs = Array.from(document.querySelectorAll('[data-translation-field]'));
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.elements.productName) {
            this.elements.productName.addEventListener('input', () => {
                this.updateSlugFromName();
            });
        }

        if (this.elements.addCategoryBtn) {
            this.elements.addCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }

        this.setupTranslationTabs();
        this.setupGenerateTranslations();
    }

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

    setupGenerateTranslations() {
        if (!this.elements.generateTranslationsBtn) {
            return;
        }

        this.elements.generateTranslationsBtn.addEventListener('click', async () => {
            await this.generateTranslations();
        });
    }

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

    async generateTranslations() {
        if (!window.supabase?.functions) {
            this.updateTranslationsStatus('Translation service unavailable. Check Supabase functions config.', 'error');
            return;
        }

        const englishTags = this.parseTagsString(this.elements.productTags?.value || '');

        const englishContent = {
            name: this.elements.productName?.value?.trim() || '',
            summary: this.elements.productShortDescription?.value?.trim() || '',
            description: this.elements.productDescription?.value?.trim() || '',
            tags: englishTags
        };

        if (
            !englishContent.name &&
            !englishContent.summary &&
            !englishContent.description &&
            englishTags.length === 0
        ) {
            this.updateTranslationsStatus('Add English content before generating translations.', 'error');
            return;
        }

        this.setGenerateTranslationsLoading(true);
        this.updateTranslationsStatus('Translating with OpenAI…', 'info');

        try {
            const { data, error } = await window.supabase.functions.invoke('translate-product-content', {
                body: {
                    sourceLanguage: 'en',
                    targetLanguages: SUPPORTED_LANGUAGES.filter(lang => lang !== 'en'),
                    fields: englishContent
                }
            });

            if (error) {
                throw error;
            }

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

    setGenerateTranslationsLoading(isLoading) {
        if (!this.elements.generateTranslationsBtn) {
            return;
        }

        this.elements.generateTranslationsBtn.disabled = isLoading;
        this.elements.generateTranslationsBtn.classList.toggle('is-loading', isLoading);
        if (this.elements.generateTranslationsLabel) {
            if (isLoading) {
                const translationHelper = window.stepBasicInfoTranslations;
                const loadingLabel = translationHelper?.t
                    ? translationHelper.t('Translating')
                    : 'Translating';
                this.elements.generateTranslationsLabel.textContent = `${loadingLabel}…`;
            } else {
                const translationHelper = window.stepBasicInfoTranslations;
                const defaultLabel = translationHelper?.t
                    ? translationHelper.t('Generate Translations')
                    : 'Generate Translations';
                this.elements.generateTranslationsLabel.textContent = defaultLabel;
            }
        }
    }

    updateTranslationsStatus(message, status = 'info') {
        if (!this.elements.generateTranslationsStatus) {
            return;
        }

        this.elements.generateTranslationsStatus.textContent = message;
        this.elements.generateTranslationsStatus.dataset.status = status;
    }

    applyTranslations(translations) {
        Object.entries(translations).forEach(([language, fields]) => {
            Object.entries(fields || {}).forEach(([fieldKey, value]) => {
                const input = this.translationInputs.find(
                    el =>
                        el.dataset.language === language &&
                        el.dataset.translationField === fieldKey
                );
                if (input) {
                    if (Array.isArray(value)) {
                        input.value = value.join(', ');
                    } else {
                        input.value = value || '';
                    }
                }
            });
        });
    }

    collectTranslations() {
        const collected = {
            name: {},
            summary: {},
            description: {},
            tags: {}
        };

        this.translationInputs.forEach(input => {
            const language = input.dataset.language;
            const field = input.dataset.translationField;

            if (!language || !field || !Object.prototype.hasOwnProperty.call(collected, field)) {
                return;
            }

            const value = input.value.trim();
            if (value) {
                if (field === 'tags') {
                    collected.tags[language] = this.parseTagsString(value);
                } else {
                    collected[field][language] = value;
                }
            }
        });

        const englishName = this.elements.productName?.value?.trim() || '';
        const englishSummary = this.elements.productShortDescription?.value?.trim() || '';
        const englishDescription = this.elements.productDescription?.value?.trim() || '';
        const englishTags = this.parseTagsString(this.elements.productTags?.value || '');

        collected.name.en = englishName;
        collected.summary.en = englishSummary;
        collected.description.en = englishDescription;
        collected.tags.en = englishTags;

        return collected;
    }

    populateTranslationInputs(data) {
        if (!data) {
            return;
        }

        const nameTranslations = data.name_translations || {};
        const summaryTranslations = data.summary_translations || {};
        const descriptionTranslations = data.description_translations || {};
        const tagTranslations = data.tag_translations || {};

        this.translationInputs.forEach(input => {
            const language = input.dataset.language;
            const field = input.dataset.translationField;
            if (!language || !field) {
                return;
            }

            let value = '';
            if (field === 'name') {
                value = nameTranslations[language] || '';
            } else if (field === 'summary') {
                value = summaryTranslations[language] || '';
            } else if (field === 'description') {
                value = descriptionTranslations[language] || '';
            } else if (field === 'tags') {
                const tags = tagTranslations[language];
                if (Array.isArray(tags)) {
                    value = tags.join(', ');
                }
            }

            input.value = value;
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
        if (!this.elements.productCategory) {
            return;
        }

        this.elements.productCategory.innerHTML = '<option value="">Select a category...</option>';

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
        this.elements.productCategory.value = category.id;
    }

    /**
     * Get form data
     */
    getFormData() {
        const categoryId = this.elements.productCategory?.value || null;
        const selectedCategory = this.categories.find(cat => cat.id === categoryId);
        const translations = this.collectTranslations();

        return {
            name: this.elements.productName?.value || '',
            slug: this.elements.productSlug?.value || '',
            category_id: categoryId,
            category: selectedCategory ? selectedCategory.name : '',
            short_description: this.elements.productShortDescription?.value || '',
            description: this.elements.productDescription?.value || '',
            tags: this.elements.productTags?.value || '',
            pricing_type: this.elements.pricingType?.value || '',
            name_translations: translations.name,
            summary_translations: translations.summary,
            description_translations: translations.description,
            tag_translations: translations.tags
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

        this.populateTranslationInputs(data);
    }
    parseTagsString(value) {
        if (!value) {
            return [];
        }

        return value
            .split(TAG_SEPARATOR_REGEX)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
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
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Save form data to wizard's formData object
     */
    saveFormData(formData) {
        const stepData = this.getFormData();
        Object.assign(formData, stepData);
    }

    /**
     * Restore form data from wizard's formData object
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

window.StepBasicInfo = StepBasicInfo;
})();

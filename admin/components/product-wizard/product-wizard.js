/**
 * Product Creation Wizard - Main Controller
 * Handles step navigation and component coordination
 */

if (typeof window.ProductWizard === 'undefined') {
class ProductWizard {
    constructor() {
        this.isInitialized = false;
        this.currentStep = 1;
        this.totalSteps = 7; // Removed Step 5 (Database Configuration)
        this.formData = {};
        this.elements = {};
        this.steps = {};
        this.categoryModal = null;
        this.isEditMode = false;
        this.editProductId = null;
        this.completedSteps = new Set(); // Track which steps have been completed
    }

    /**
     * Initialize the product wizard
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {

            // Check authentication first
            const isAuthenticated = await this.checkAuthentication();
            if (!isAuthenticated) {
                window.logger?.error('❌ User not authenticated');
                this.showError('Please log in to access the admin panel');
                return;
            }

            // Check for edit mode
            this.checkEditMode();

            // Initialize DOM elements
            this.initializeElements();

            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize translations
            await this.initializeTranslations();
            
            // Show translatable content
            this.showTranslatableContent();
            
            // Initialize components
            await this.initializeComponents();

            // Load existing product data if in edit mode
            if (this.isEditMode) {
                await this.loadExistingProduct();
                
                // Mark steps as completed based on database data
                this.checkCompletedStepsFromDatabase();
            }

            // Load Step 1
            await this.loadStep(1);

            // Update progress
            this.updateProgress();

            this.isInitialized = true;

        } catch (error) {
            window.logger?.error('❌ Product Creation Wizard: Failed to initialize:', error);
            this.showError('Failed to initialize product wizard');
        }
    }

    /**
     * Check for edit mode from URL parameters
     */
    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        if (editId) {
            this.isEditMode = true;
            this.editProductId = editId;
            
            // Update page title and header
            document.title = `Edit Product - BitMinded Admin`;
            const titleElement = document.querySelector('.product-wizard__title');
            if (titleElement) {
                titleElement.textContent = 'Edit Product';
            }
            
            // Update loading text for edit mode
            const loadingText = document.querySelector('#wizard-loading p');
            if (loadingText) {
                loadingText.textContent = 'Updating Product...';
            }
        }
    }

    /**
     * Load existing product data for edit mode
     */
    async loadExistingProduct() {
        try {
            
            const { data, error } = await window.supabase
                .from('products')
                .select(`
                    id,
                    name,
                    slug,
                    description,
                    short_description,
                    category_id,
                    tags,
                    tag_translations,
                    pricing_type,
                    price_amount,
                    price_currency,
                    individual_price,
                    enterprise_price,
                    subscription_interval,
                    name_translations,
                    summary_translations,
                    description_translations,
                    status,
                    github_repo_url,
                    github_repo_name,
                    github_branch,
                    github_repo_created,
                    cloudflare_domain,
                    cloudflare_worker_url,
                    stripe_product_id,
                    stripe_price_id,
                    stripe_price_monthly_id,
                    stripe_price_yearly_id,
                    stripe_price_lifetime_id,
                    is_commissioned,
                    commissioned_by,
                    commissioned_client_name,
                    commissioned_client_email,
                    trial_days,
                    trial_requires_payment,
                    icon_url,
                    screenshots,
                    demo_video_url,
                    features,
                    target_audience,
                    tech_stack,
                    documentation_url,
                    support_email,
                    is_featured,
                    is_available_for_purchase,
                    requires_admin_approval,
                    completed_steps,
                    technical_specification,
                    ai_recommendations,
                    ai_conversations,
                    ai_final_decisions,
                    product_categories (
                        id,
                        name,
                        slug,
                        description,
                        name_translations,
                        description_translations
                    )
                `)
                .eq('id', this.editProductId)
                .single();

            if (error) {
                window.logger?.error('❌ Error loading product:', error);
                this.showError('Failed to load product data');
                return;
            }

            if (!data) {
                this.showError('Product not found');
                return;
            }

            // Convert product data to form data format
            this.formData = {
                product_id: data.id,
                name: data.name || '',
                slug: data.slug || '',
                category_id: data.category_id || null,
                short_description: data.short_description || '',
                description: data.description || '',
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
                pricing_type: data.pricing_type || 'one_time',
                name_translations: data.name_translations || {},
                summary_translations: data.summary_translations || {},
                description_translations: data.description_translations || {},
                tag_translations: data.tag_translations || {},
                price_amount: data.price_amount || '',
                price_currency: data.price_currency || 'USD',
                price_amount_chf: data.price_amount_chf || null,
                price_amount_usd: data.price_amount_usd || null,
                price_amount_eur: data.price_amount_eur || null,
                price_amount_gbp: data.price_amount_gbp || null,
                individual_price: data.individual_price || '',
                enterprise_price: data.enterprise_price || '',
                subscription_interval: data.subscription_interval || '',
                github_repo_url: data.github_repo_url || '',
                github_repo_name: data.github_repo_name || '',
                github_branch: data.github_branch || 'main',
                github_repo_created: data.github_repo_created || false,
                cloudflare_domain: data.cloudflare_domain || '',
                cloudflare_worker_url: data.cloudflare_worker_url || '',
                stripe_product_id: data.stripe_product_id || null,
                stripe_price_id: data.stripe_price_id || null,
                stripe_price_monthly_id: data.stripe_price_monthly_id || '',
                stripe_price_yearly_id: data.stripe_price_yearly_id || '',
                stripe_price_lifetime_id: data.stripe_price_lifetime_id || '',
                is_commissioned: data.is_commissioned || false,
                commissioned_by: data.commissioned_by || null,
                commissioned_client_name: data.commissioned_client_name || '',
                commissioned_client_email: data.commissioned_client_email || '',
                trial_days: data.trial_days || 0,
                trial_requires_payment: data.trial_requires_payment || false,
                icon_url: data.icon_url || '',
                screenshots: data.screenshots || null,
                demo_video_url: data.demo_video_url || '',
                features: data.features || null,
                target_audience: data.target_audience || '',
                tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack.join(', ') : (data.tech_stack || ''),
                documentation_url: data.documentation_url || '',
                support_email: data.support_email || '',
                is_featured: data.is_featured || false,
                is_available_for_purchase: data.is_available_for_purchase || true,
                requires_admin_approval: data.requires_admin_approval || false
            };

            // Load AI data into stepData for Step 2
            if (data.ai_recommendations || data.ai_conversations || data.ai_final_decisions || data.technical_specification) {
                this.stepData = this.stepData || {};
                this.stepData[2] = {
                    recommendations: data.ai_recommendations || {},
                    conversationHistory: data.ai_conversations || {},
                    finalDecisions: data.ai_final_decisions || {},
                    technicalSpecification: data.technical_specification || ''
                };
            }

            // Load completed steps from database (but we'll rebuild them based on actual data to handle step reordering)
            if (data.completed_steps && Array.isArray(data.completed_steps)) {
                window.logger?.log('⚠️ Loaded old completed_steps:', Array.from(data.completed_steps));
                window.logger?.log('ℹ️ Will rebuild based on actual data to handle step reordering');
            }

        } catch (error) {
            window.logger?.error('❌ Error loading existing product:', error);
            this.showError('Failed to load product data');
        }
    }

    /**
     * Check for completed steps based on database data
     * This is called before any steps are loaded
     */
    checkCompletedStepsFromDatabase() {
        if (!this.formData) return;

        // Step 1 is always completed if we're in edit mode (basic info exists)
        this.markStepCompleted(1);

        // Step 2: Check if technical specification exists
        if (this.stepData && this.stepData[2] && this.stepData[2].technicalSpecification) {
            const technicalSpec = this.stepData[2].technicalSpecification;
            if (technicalSpec && technicalSpec.trim() !== '') {
                this.markStepCompleted(2);
                window.logger?.log('✅ Step 2 marked as completed (technical spec exists)');
            }
        }

        // Step 3: Check if content & media exists (icon is required)
        if (this.formData.icon_url && this.formData.features && this.formData.features.length > 0) {
            this.markStepCompleted(3);
            window.logger?.log('✅ Step 3 marked as completed (icon and features exist)');
        }

        // Step 4: Check if GitHub repository exists
        if (this.formData.github_repo_created && this.formData.github_repo_url) {
            this.markStepCompleted(4);
            window.logger?.log('✅ Step 4 marked as completed (GitHub repo exists)');
        }

        // Step 5: Check if Stripe product exists
        if (this.formData.stripe_product_id) {
            this.markStepCompleted(5);
            window.logger?.log('✅ Step 5 marked as completed (Stripe product exists)');
        }

        // Step 6: Check if Cloudflare domain is configured
        if (this.formData.cloudflare_domain || this.formData.cloudflare_worker_url) {
            this.markStepCompleted(6);
            window.logger?.log('✅ Step 6 marked as completed (Cloudflare configured)');
        }
    }

    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        try {
            if (typeof window.supabase === 'undefined') {
                window.logger?.error('❌ Supabase client not available');
                return false;
            }

            // Check authentication
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                return false;
            }

            return true;

        } catch (error) {
            window.logger?.error('❌ Authentication check failed:', error);
            return false;
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Navigation
            prevBtn: document.getElementById('wizard-prev-btn'),
            nextBtn: document.getElementById('wizard-next-btn'),
            saveDraftBtn: document.getElementById('wizard-save-draft-btn'),
            backBtn: document.getElementById('back-to-products'),
            
            // Progress
            progressFill: document.getElementById('wizard-progress-fill'),
            progressText: document.getElementById('wizard-progress-text'),
            
            // Steps
            steps: document.querySelectorAll('.product-wizard__step'),
            stepContents: document.querySelectorAll('.product-wizard__step-content'),
            
            // Form
            form: document.getElementById('product-wizard-form'),
            
            // Loading
            loadingOverlay: document.getElementById('wizard-loading'),
            
            // Messages
            messagesContainer: document.getElementById('wizard-messages')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => {
                this.previousStep();
            });
        }

        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => {
                this.nextStep();
            });
        }

        if (this.elements.saveDraftBtn) {
            this.elements.saveDraftBtn.addEventListener('click', () => {
                this.saveDraft();
            });
        }

        // Back button
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => {
                // Check if this tab was opened as a new tab (no navigation history)
                // or has an opener (opened via window.open or target="_blank")
                if (window.opener || window.history.length <= 1) {
                    // Close this tab and focus back to the opener
                    window.close();
                    
                    // If window.close() didn't work (browser security), navigate instead
                    setTimeout(() => {
                        if (!window.closed) {
                            window.location.href = '/admin/?section=products';
                        }
                    }, 100);
                } else {
                    // Normal navigation - go back in history
                    window.history.back();
                }
            });
        }

        // Step navigation - Allow free navigation for draft creation
        this.elements.steps.forEach((step, index) => {
            step.addEventListener('click', () => {
                const stepNumber = parseInt(step.dataset.step);
                // Allow navigation to any step for draft creation
                this.goToStep(stepNumber);
            });
        });
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        // Initialize category modal
        if (window.CategoryModal) {
            this.categoryModal = new window.CategoryModal();
            await this.categoryModal.init();
            
            // Set callback for when category is created
            this.categoryModal.setOnCategoryCreated((category) => {
                // Notify current step about new category
                if (this.steps[this.currentStep] && this.steps[this.currentStep].addCategoryToDropdown) {
                    this.steps[this.currentStep].addCategoryToDropdown(category);
                }
            });
            
            // Make category modal globally available
            window.categoryModal = this.categoryModal;
        }
    }

    /**
     * Load step component
     */
    async loadStep(stepNumber) {
        try {
            const stepContent = document.getElementById(`step-${stepNumber}`);
            if (!stepContent) {
                window.logger?.error(`Step ${stepNumber} content not found`);
                return;
            }

            // Load step-specific component
            switch (stepNumber) {
                case 1:
                    await this.loadStep1(stepContent);
                    break;
                case 2:
                    await this.loadStep2(stepContent);
                    break;
                case 3:
                    await this.loadStep3(stepContent); // Content & Media
                    break;
                case 4:
                    await this.loadStep4(stepContent); // GitHub
                    break;
                case 5:
                    await this.loadStep5(stepContent); // Cloudflare (was Step 6)
                    break;
                case 6:
                    await this.loadStep6(stepContent); // Stripe (was Step 7)
                    break;
                case 7:
                    await this.loadStep7(stepContent); // Review & Publish (was Step 8)
                    break;
                default:
                    window.logger?.error(`Unknown step: ${stepNumber}`);
            }

        } catch (error) {
            window.logger?.error(`Error loading step ${stepNumber}:`, error);
            this.showError(`Failed to load step ${stepNumber}`);
        }
    }

    /**
     * Load Step 1: Basic Information
     */
    async loadStep1(stepContent) {
        if (window.StepBasicInfo) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-basic-info/step-basic-info.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[1] = new window.StepBasicInfo();
            await this.steps[1].init();

            // Load saved data if available (for drafts) or edit data
            // Check if formData has step 1 fields (name, slug, etc.) - this covers both edit mode and draft mode
            if (this.formData && (this.formData.name || this.formData.slug || this.formData.category_id)) {
                // Load form data (works for both edit mode and draft mode)
                this.steps[1].setFormData(this.formData);
            } else if (this.formData.step1) {
                // Fallback: load step-specific data if stored separately
                this.steps[1].setFormData(this.formData.step1);
            }
        }
    }

    /**
     * Load Step 2: AI-Powered Technical Specification
     */
    async loadStep2(stepContent) {
        if (window.StepSpecGeneration) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-spec-generation/step-spec-generation.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[2] = new window.StepSpecGeneration();
            await this.steps[2].init();

            // Set context from Step 1
            if (this.steps[1]) {
                const step1Data = this.steps[1].getFormData();
                this.steps[2].setContextFromStep1(step1Data);
            }

            // Load existing specification if in edit mode
            if (this.isEditMode && this.formData.technical_specification) {
                this.steps[2].loadExistingSpecification(this.formData.technical_specification);
            }

        } else {
            window.logger?.error('❌ StepSpecGeneration component not available');
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 2: Technical Specification</h2><p>Component not available</p></div>';
        }
    }

    /**
     * Load Step 3: Content & Media
     */
    async loadStep3(stepContent) {
        if (window.StepContentMedia) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-content-media/step-content-media.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[3] = new window.StepContentMedia();
            await this.steps[3].init();

            // Load any existing data for this step
            if (this.stepData && this.stepData[3]) {
                this.steps[3].setFormData(this.stepData[3]);
            }
        } else {
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 3: Content & Media</h2><p>Component not loaded...</p></div>';
        }
    }

    /**
     * Load Step 4: GitHub Repository Setup
     */
    async loadStep4(stepContent) {
        if (window.StepGithubSetup) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-github-setup/step-github-setup.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[4] = new window.StepGithubSetup();
            await this.steps[4].init();

            // Load existing data if in edit mode
            if (this.isEditMode && this.formData) {
                this.steps[4].setFormData(this.formData);
            }

        } else {
            window.logger?.error('❌ StepGithubSetup component not available');
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 4: GitHub Repository Setup</h2><p>Component not available</p></div>';
        }
    }

    /**
     * Load Step 5: Stripe Product Creation (moved before Cloudflare)
     */
    async loadStep5(stepContent) {
        // If step is already initialized, just repopulate form fields from saved data
        if (this.steps[5] && this.steps[5].isInitialized) {
            window.logger?.log('✅ Step 5 already initialized, repopulating form fields from saved data');
            // Repopulate form fields from current formData to ensure they're up to date
            this.steps[5].populateFormFields();
            return;
        }

        if (window.StepStripeCreation) {
            const response = await fetch('/admin/components/product-wizard/components/step-stripe-creation/step-stripe-creation.html');
            const html = await response.text();
            stepContent.innerHTML = html;
            this.steps[5] = new window.StepStripeCreation();
            await this.steps[5].init();
            if (this.isEditMode && this.formData) {
                this.steps[5].setFormData(this.formData);
            }
        } else {
            window.logger?.error('❌ StepStripeCreation component not available');
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 5: Stripe Product Creation</h2><p>Component not available</p></div>';
        }
    }

    /**
     * Load Step 6: Cloudflare Configuration (moved after Stripe)
     */
    async loadStep6(stepContent) {
        if (window.StepCloudflareSetup) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-cloudflare-setup/step-cloudflare-setup.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[6] = new window.StepCloudflareSetup();
            await this.steps[6].init();

            // Load any existing data for this step
            if (this.stepData && this.stepData[6]) {
                this.steps[6].setFormData(this.stepData[6]);
            }
        } else {
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 6: Cloudflare Configuration</h2><p>Component not loaded...</p></div>';
        }
    }

    /**
     * Load Step 7: Review & Summary
     */
    async loadStep7(stepContent) {
        if (window.StepReviewSummary) {
            // Load HTML content
            const response = await fetch('/admin/components/product-wizard/components/step-review-summary/step-review-summary.html');
            const html = await response.text();
            stepContent.innerHTML = html;

            // Initialize component
            this.steps[7] = new window.StepReviewSummary();
            await this.steps[7].init();
        } else {
            window.logger?.error('❌ StepReviewSummary component not available');
            stepContent.innerHTML = '<div class="product-wizard__step-header"><h2>Step 7: Review & Summary</h2><p>Component not available</p></div>';
        }
    }

    /**
     * Go to specific step
     */
    async goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            return;
        }

        // Save current step data before moving and auto-persist
        const previousStep = this.currentStep;
        // For Stripe step (step 5), read form field values before saving to preserve user input
        if (previousStep === 5 && this.steps[5] && typeof this.steps[5].readFormFieldValues === 'function') {
            this.steps[5].readFormFieldValues();
        }
        this.saveCurrentStepData(previousStep);
        // Silent autosave; do not block navigation on failure
        try {
            await this.saveDraftToDatabase();
        } catch (e) {
            window.logger?.warn('⚠️ Autosave failed while navigating:', e);
        } finally {
            // Always reflect completion state based on in-memory data
            this.updateCompletionForStep(previousStep);
        }

        // Update current step
        this.currentStep = stepNumber;

        // Update step indicators
        this.updateStepIndicators();

        // Show/hide step content
        this.elements.stepContents.forEach((content, index) => {
            if (index + 1 === stepNumber) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Load step content if not already loaded
        await this.loadStep(stepNumber);

        // Update navigation buttons
        this.updateNavigationButtons();

        // Update progress
        this.updateProgress();
    }

    /**
     * Update completion state for a specific step based on current formData
     */
    updateCompletionForStep(stepNumber) {
        switch (stepNumber) {
            case 1: {
                const name = this.formData.name && this.formData.name.trim().length > 0;
                const slug = this.formData.slug && this.formData.slug.trim().length > 0;
                if (name && slug) {
                    this.markStepCompleted(1);
                } else {
                    this.markStepIncomplete(1);
                }
                break;
            }
            case 2: {
                const spec = this.stepData && this.stepData[2] && this.stepData[2].technicalSpecification;
                if (spec && String(spec).trim() !== '') {
                    this.markStepCompleted(2);
                } else {
                    this.markStepIncomplete(2);
                }
                break;
            }
            case 3: {
                const hasIcon = !!this.formData.icon_url;
                const features = this.formData.features || [];
                const hasFeatures = Array.isArray(features) && features.length > 0;
                if (hasIcon && hasFeatures) {
                    this.markStepCompleted(3);
                } else {
                    this.markStepIncomplete(3);
                }
                break;
            }
            case 4: {
                if (this.formData.github_repo_created && this.formData.github_repo_url) {
                    this.markStepCompleted(4);
                } else {
                    this.markStepIncomplete(4);
                }
                break;
            }
            case 5: {
                if (this.formData.stripe_product_id) {
                    this.markStepCompleted(5);
                } else {
                    this.markStepIncomplete(5);
                }
                break;
            }
            case 6: {
                if (this.formData.cloudflare_domain || this.formData.cloudflare_worker_url) {
                    this.markStepCompleted(6);
                } else {
                    this.markStepIncomplete(6);
                }
                break;
            }
            default:
                break;
        }
    }

    /**
     * Go to next step
     */
    async nextStep() {
        if (this.currentStep < this.totalSteps) {
            // Regular step navigation - no validation needed
            await this.goToStep(this.currentStep + 1);
        } else {
            // Final step - validate all mandatory fields before creating/updating product
            if (this.validateAllMandatoryFields()) {
                if (this.isEditMode) {
                    this.updateProduct();
                } else {
                    this.createProduct();
                }
            } else {
                const action = this.isEditMode ? 'updating' : 'creating';
                this.showError(`Please fill in all mandatory fields before ${action} the product`);
            }
        }
    }

    /**
     * Go to previous step
     */
    async previousStep() {
        if (this.currentStep > 1) {
            await this.goToStep(this.currentStep - 1);
        }
    }

    /**
     * Get Step 1 data for other steps to use
     */
    getStep1Data() {
        if (this.steps[1]) {
            return this.steps[1].getFormData();
        }
        return {};
    }

    /**
     * Save current step data to formData
     * @param {number} stepNumber - Optional step number, defaults to currentStep
     */
    saveCurrentStepData(stepNumber = this.currentStep) {
        if (this.steps[stepNumber] && this.steps[stepNumber].saveFormData) {
            this.steps[stepNumber].saveFormData(this.formData);
        }
    }

    /**
     * Validate all mandatory fields across all steps
     */
    validateAllMandatoryFields() {
        const mandatoryFields = [
            'productName',
            'productSlug', 
            'productDescription',
            'productCategory',
            'pricingType'
        ];

        let isValid = true;
        const missingFields = [];

        mandatoryFields.forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (!field || !field.value.trim()) {
                isValid = false;
                missingFields.push(fieldName);
                if (field) {
                    field.style.borderColor = 'var(--color-error)';
                }
            } else if (field) {
                field.style.borderColor = '';
            }
        });

        if (!isValid) {
            window.logger?.log('❌ Missing mandatory fields:', missingFields);
        }

        return isValid;
    }

    /**
     * Update step indicators
     */
    updateStepIndicators() {
        this.elements.steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('product-wizard__step--active', 'product-wizard__step--completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('product-wizard__step--active');
            } else if (this.completedSteps.has(stepNumber)) {
                step.classList.add('product-wizard__step--completed');
            }
        });
    }

    /**
     * Update navigation buttons
     */
    updateNavigationButtons() {
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.currentStep === 1;
        }

        if (this.elements.nextBtn) {
            if (this.currentStep === this.totalSteps) {
                this.elements.nextBtn.textContent = 'Create Product';
            } else {
                this.elements.nextBtn.textContent = 'Next';
            }
        }
    }

    /**
     * Update progress
     */
    updateProgress() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }

        if (this.elements.progressText) {
            this.elements.progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        }
    }

    /**
     * Mark a step as completed
     * @param {number} stepNumber - The step number to mark as completed
     */
    markStepCompleted(stepNumber) {
        this.completedSteps.add(stepNumber);
        window.logger?.log(`✅ Marked step ${stepNumber} as completed`);
        this.updateStepIndicators();
    }

    /**
     * Mark a step as incomplete (when deleting/undoing)
     * @param {number} stepNumber - The step number to mark as incomplete
     */
    markStepIncomplete(stepNumber) {
        this.completedSteps.delete(stepNumber);
        window.logger?.log(`❌ Marked step ${stepNumber} as incomplete`);
        this.updateStepIndicators();
    }

    /**
     * Save draft
     */
    async saveDraft() {
        try {
            this.showLoading('Saving draft...');

            // Save current step data only (since other steps aren't loaded yet)
            this.saveCurrentStepData();

            // Save to database
            const result = await this.saveDraftToDatabase();
            
            if (result.success) {
                this.showSuccess('Draft saved successfully!');
                window.logger?.log('💾 Draft saved:', this.formData);
                
                // Mark Step 1 as completed (basic info is saved)
                this.markStepCompleted(1);
            } else {
                throw new Error(result.error || 'Failed to save draft');
            }

        } catch (error) {
            window.logger?.error('❌ Error saving draft:', error);
            this.showError('Failed to save draft: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Parse tags string into array format for database
     * @param {string} tagsString - Comma-separated tags string
     * @returns {Array} Array of trimmed tags
     */
    parseTags(tagsString) {
        if (!tagsString || typeof tagsString !== 'string') {
            return [];
        }
        
        return tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    /**
     * Ensure multilingual fields are populated via OpenAI translation service.
     */
    async ensureTranslationsForFormData() {
        const source = {
            name: this.formData.name || '',
            summary: this.formData.short_description || '',
            description: this.formData.description || '',
            tags: this.parseTags(this.formData.tags || '')
        };

        if (!source.name && !source.summary && !source.description && source.tags.length === 0) {
            return;
        }

        const hasValue = value => typeof value === 'string' && value.trim().length > 0;

        const existingTranslations = {
            name: { ...(this.formData.name_translations || {}) },
            summary: { ...(this.formData.summary_translations || {}) },
            description: { ...(this.formData.description_translations || {}) },
            tags: { ...(this.formData.tag_translations || {}) }
        };

        const targetLanguages = ['es', 'fr', 'de'];
        const missingLanguages = targetLanguages.filter(lang => {
            const needsName = hasValue(source.name) && !hasValue(existingTranslations.name[lang]);
            const needsSummary = hasValue(source.summary) && !hasValue(existingTranslations.summary[lang]);
            const needsDescription = hasValue(source.description) && !hasValue(existingTranslations.description[lang]);
            const needsTags = source.tags.length > 0 && !Array.isArray(existingTranslations.tags[lang]);
            return needsName || needsSummary || needsDescription || needsTags;
        });

        if (missingLanguages.length > 0 && window.supabase?.functions) {
            try {
                const { data, error } = await window.supabase.functions.invoke('translate-product-content', {
                    body: {
                        sourceLanguage: 'en',
                        targetLanguages: missingLanguages,
                        fields: {
                            name: source.name,
                            summary: source.summary,
                            description: source.description,
                            tags: source.tags
                        }
                    }
                });

                if (error) {
                    throw error;
                }

                if (data?.translations) {
                    missingLanguages.forEach(lang => {
                        const translations = data.translations[lang];
                        if (!translations) {
                            return;
                        }

                        if (hasValue(translations.name)) {
                            existingTranslations.name[lang] = translations.name.trim();
                        }
                        if (hasValue(translations.summary)) {
                            existingTranslations.summary[lang] = translations.summary.trim();
                        }
                        if (hasValue(translations.description)) {
                            existingTranslations.description[lang] = translations.description.trim();
                        }
                        if (Array.isArray(translations.tags) && translations.tags.length > 0) {
                            existingTranslations.tags[lang] = translations.tags.map(tag =>
                                typeof tag === 'string' ? tag.trim() : ''
                            ).filter(Boolean);
                        }
                    });
                }
            } catch (error) {
                window.logger?.error('⚠️ Automatic translation failed:', error);
            }
        }

        // Ensure English baseline is always present
        existingTranslations.name.en = source.name;
        existingTranslations.summary.en = source.summary;
        existingTranslations.description.en = source.description;
        existingTranslations.tags.en = source.tags;

        this.formData.name_translations = existingTranslations.name;
        this.formData.summary_translations = existingTranslations.summary;
        this.formData.description_translations = existingTranslations.description;
        this.formData.tag_translations = existingTranslations.tags;
    }

    /**
     * Save draft to database
     */
    async saveDraftToDatabase(statusOverride = null) {
        try {
            // Prepare product data
            window.logger?.log('🔍 formData before saveDraft:', { 
                stripe_product_id: this.formData.stripe_product_id,
                stripe_price_id: this.formData.stripe_price_id 
            });

            await this.ensureTranslationsForFormData();
            
            // Determine status: use override if provided, otherwise 'draft'
            // If step 7 is completed and no override, use 'beta'
            const productStatus = statusOverride || 
                (this.completedSteps.has(7) ? 'beta' : 'draft');
            
            const productData = {
                name: this.formData.name || '',
                slug: this.formData.slug || '',
                category_id: this.formData.category_id || null,
                short_description: this.formData.short_description || '',
                description: this.formData.description || '',
                name_translations: this.formData.name_translations || null,
                summary_translations: this.formData.summary_translations || null,
                description_translations: this.formData.description_translations || null,
                tag_translations: this.formData.tag_translations || null,
                tags: this.parseTags(this.formData.tags || ''),
                pricing_type: this.formData.pricing_type || 'one_time',
                status: productStatus
            };

            // Add AI data from Step 2 if available
            window.logger?.log('🔍 Checking for Step 2 data:', {
                hasStepData: !!this.stepData,
                stepDataKeys: this.stepData ? Object.keys(this.stepData) : [],
                step2Data: this.stepData && this.stepData[2] ? this.stepData[2] : null
            });
            
            if (this.stepData && this.stepData[2]) {
                const step2Data = this.stepData[2];
                
                window.logger?.log('📊 Step 2 data details:', {
                    hasRecommendations: !!step2Data.recommendations,
                    recommendationsKeys: step2Data.recommendations ? Object.keys(step2Data.recommendations) : [],
                    hasConversationHistory: !!step2Data.conversationHistory,
                    conversationHistoryKeys: step2Data.conversationHistory ? Object.keys(step2Data.conversationHistory) : [],
                    hasFinalDecisions: !!step2Data.finalDecisions,
                    finalDecisionsKeys: step2Data.finalDecisions ? Object.keys(step2Data.finalDecisions) : [],
                    hasTechnicalSpec: !!step2Data.technicalSpecification
                });
                
                // Add AI recommendations and conversations
                if (step2Data.recommendations) {
                    productData.ai_recommendations = step2Data.recommendations;
                    window.logger?.log('✅ Added ai_recommendations to productData');
                }
                if (step2Data.conversationHistory) {
                    productData.ai_conversations = step2Data.conversationHistory;
                    window.logger?.log('✅ Added ai_conversations to productData');
                }
                if (step2Data.finalDecisions) {
                    productData.ai_final_decisions = step2Data.finalDecisions;
                    window.logger?.log('✅ Added ai_final_decisions to productData');
                }
                
                // Add technical specification if generated
                if (step2Data.technicalSpecification) {
                    productData.technical_specification = step2Data.technicalSpecification;
                    window.logger?.log('✅ Added technical_specification to productData');
                }
            } else {
                window.logger?.log('❌ No Step 2 data found to save');
            }
            
            // Add GitHub repository status if created
            if (this.formData.github_repo_created) {
                productData.github_repo_created = this.formData.github_repo_created;
                productData.github_repo_url = this.formData.github_repo_url;
                productData.github_repo_name = this.formData.github_repo_name;
                productData.github_branch = this.formData.github_branch;
                window.logger?.log('✅ Added GitHub repository status to productData');
            }

            // Add Cloudflare configuration if set
            productData.cloudflare_domain = this.formData.cloudflare_domain || null;
            productData.cloudflare_worker_url = this.formData.cloudflare_worker_url || null;
            if (this.formData.cloudflare_domain || this.formData.cloudflare_worker_url) {
                window.logger?.log('✅ Added Cloudflare configuration to productData');
            }

            // Add media fields from Step 3
            productData.icon_url = this.formData.icon_url || null;
            productData.screenshots = this.formData.screenshots || null;
            productData.demo_video_url = this.formData.demo_video_url || null;
            productData.documentation_url = this.formData.documentation_url || null;
            productData.support_email = this.formData.support_email || null;
            productData.features = this.formData.features || null;
            window.logger?.log('✅ Added media fields to productData');

            // Add Stripe fields (always, so we can save null when deleting)
            productData.stripe_product_id = this.formData.stripe_product_id || null;
            productData.stripe_price_id = this.formData.stripe_price_id || null;
            productData.stripe_price_monthly_id = this.formData.stripe_price_monthly_id || null;
            productData.stripe_price_yearly_id = this.formData.stripe_price_yearly_id || null;
            productData.stripe_price_lifetime_id = this.formData.stripe_price_lifetime_id || null;
            
            // Add currency-specific price IDs
            productData.stripe_price_chf_id = this.formData.stripe_price_chf_id || null;
            productData.stripe_price_usd_id = this.formData.stripe_price_usd_id || null;
            productData.stripe_price_eur_id = this.formData.stripe_price_eur_id || null;
            productData.stripe_price_gbp_id = this.formData.stripe_price_gbp_id || null;
            
            productData.pricing_type = this.formData.pricing_type || 'one_time';
            productData.price_amount = this.formData.price_amount || null;
            productData.price_currency = this.formData.price_currency || 'USD';
            
            // Only update currency amounts if they exist in formData
            // This prevents overwriting values that were saved by Edge Functions but not yet in formData
            // Use !== undefined to distinguish between "not set" (undefined) and "explicitly null"
            if (this.formData.price_amount_chf !== undefined) {
                productData.price_amount_chf = this.formData.price_amount_chf;
            }
            if (this.formData.price_amount_usd !== undefined) {
                productData.price_amount_usd = this.formData.price_amount_usd;
            }
            if (this.formData.price_amount_eur !== undefined) {
                productData.price_amount_eur = this.formData.price_amount_eur;
            }
            if (this.formData.price_amount_gbp !== undefined) {
                productData.price_amount_gbp = this.formData.price_amount_gbp;
            }
            productData.individual_price = this.formData.individual_price || null;
            productData.enterprise_price = this.formData.enterprise_price || null;
            productData.subscription_interval = this.formData.subscription_interval || null;
            productData.trial_days = this.formData.trial_days || 0;
            productData.trial_requires_payment = this.formData.trial_requires_payment || false;
            productData.requires_admin_approval = this.formData.requires_admin_approval || false;
            window.logger?.log('✅ Added Stripe fields to productData');

            // Add completed steps array
            productData.completed_steps = Array.from(this.completedSteps);
            window.logger?.log('✅ Added completed_steps to productData:', productData.completed_steps);

            window.logger?.log('📤 Final productData being sent to database:', productData);

            // Test if AI columns exist by checking the current product
            if (this.formData.product_id) {
                window.logger?.log('🔍 Testing AI columns existence...');
                const { data: testData, error: testError } = await window.supabase
                    .from('products')
                    .select('ai_recommendations, ai_conversations, ai_final_decisions')
                    .eq('id', this.formData.product_id)
                    .single();
                
                window.logger?.log('🧪 AI columns test result:', { testData, testError });
            }

            // Check if this is an update to existing draft
            if (this.formData.product_id) {
                window.logger?.log('🔄 Updating existing product with ID:', this.formData.product_id);
                window.logger?.log('🔍 Stripe fields in productData:', {
                    stripe_product_id: productData.stripe_product_id,
                    stripe_price_id: productData.stripe_price_id
                });
                
                const { data, error } = await window.supabase
                    .from('products')
                    .update(productData)
                    .eq('id', this.formData.product_id)
                    .select()
                    .single();

                window.logger?.log('📥 Database update response:', { data, error });

                if (error) {
                    window.logger?.error('❌ Database update error:', error);
                    throw error;
                }
                
                window.logger?.log('✅ Product updated successfully:', data);
                return { success: true, data };
            } else {
                // Create new draft
                const { data, error } = await window.supabase
                    .from('products')
                    .insert(productData)
                    .select()
                    .single();

                if (error) throw error;
                
                // Store the product ID for future updates
                this.formData.product_id = data.id;
                
                return { success: true, data };
            }

        } catch (error) {
            window.logger?.error('❌ Database error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update existing product
     */
    async updateProduct() {
        try {
            this.showLoading('Updating product...');

            // Collect all form data
            for (let i = 1; i <= this.totalSteps; i++) {
                this.saveCurrentStepData(i);
            }

            // Update the product in database
            const result = await this.updateProductInDatabase();
            
            if (result.success) {
                this.showSuccess('Product updated successfully!');
                window.logger?.log('✅ Product updated:', this.formData);
                
                // Close the tab after a short delay
                setTimeout(() => {
                    window.close();
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to update product');
            }

        } catch (error) {
            window.logger?.error('❌ Error updating product:', error);
            this.showError('Failed to update product: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update product in database
     */
    async updateProductInDatabase() {
        try {
            await this.ensureTranslationsForFormData();

            // Prepare product data (same as create but with product_id)
            const productData = {
                name: this.formData.name || '',
                slug: this.formData.slug || '',
                category_id: this.formData.category_id || null,
                short_description: this.formData.short_description || '',
                description: this.formData.description || '',
                name_translations: this.formData.name_translations || null,
                summary_translations: this.formData.summary_translations || null,
                description_translations: this.formData.description_translations || null,
                tag_translations: this.formData.tag_translations || null,
                tags: this.parseTags(this.formData.tags || ''),
                pricing_type: this.formData.pricing_type || 'one_time',
                price_amount: this.formData.price_amount || null,
                price_currency: this.formData.price_currency || 'USD',
                individual_price: this.formData.individual_price || null,
                enterprise_price: this.formData.enterprise_price || null,
                subscription_interval: this.formData.subscription_interval || null,
                github_repo_url: this.formData.github_repo_url || '',
                github_repo_name: this.formData.github_repo_name || '',
                github_branch: this.formData.github_branch || 'main',
                cloudflare_domain: this.formData.cloudflare_domain || '',
                cloudflare_worker_url: this.formData.cloudflare_worker_url || '',
                stripe_product_id: this.formData.stripe_product_id || null,
                stripe_price_id: this.formData.stripe_price_id || null,
                stripe_price_monthly_id: this.formData.stripe_price_monthly_id || '',
                stripe_price_yearly_id: this.formData.stripe_price_yearly_id || '',
                stripe_price_lifetime_id: this.formData.stripe_price_lifetime_id || '',
                is_commissioned: this.formData.is_commissioned || false,
                commissioned_by: this.formData.commissioned_by || null,
                commissioned_client_name: this.formData.commissioned_client_name || '',
                commissioned_client_email: this.formData.commissioned_client_email || '',
                trial_days: this.formData.trial_days || 0,
                trial_requires_payment: this.formData.trial_requires_payment || false,
                icon_url: this.formData.icon_url || '',
                screenshots: this.parseTags(this.formData.screenshots || ''),
                demo_video_url: this.formData.demo_video_url || '',
                features: this.parseTags(this.formData.features || ''),
                target_audience: this.formData.target_audience || '',
                tech_stack: this.parseTags(this.formData.tech_stack || ''),
                documentation_url: this.formData.documentation_url || '',
                support_email: this.formData.support_email || '',
                is_featured: this.formData.is_featured || false,
                is_available_for_purchase: this.formData.is_available_for_purchase || true,
                requires_admin_approval: this.formData.requires_admin_approval || false
            };

            // Update the product
            const { data, error } = await window.supabase
                .from('products')
                .update(productData)
                .eq('id', this.editProductId)
                .select()
                .single();

            if (error) {
                window.logger?.error('❌ Database error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data };

        } catch (error) {
            window.logger?.error('❌ Error updating product in database:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create product
     */
    async createProduct() {
        try {
            this.showLoading('Creating product...');

            // Collect all form data
            for (let i = 1; i <= this.totalSteps; i++) {
                this.saveCurrentStepData(i);
            }

            // Here you would create the product
            window.logger?.log('🚀 Creating product with data:', this.formData);
            this.showSuccess('Product created successfully!');

        } catch (error) {
            window.logger?.error('❌ Error creating product:', error);
            this.showError('Failed to create product');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
            const loadingText = this.elements.loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.productWizardTranslations) {
                await window.productWizardTranslations.init();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('.translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message
     */
    showMessage(message, type) {
        if (!this.elements.messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `product-wizard__message product-wizard__message--${type}`;
        messageEl.textContent = message;

        this.elements.messagesContainer.appendChild(messageEl);

        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }
}

// Initialize wizard when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const wizard = new ProductWizard();
    await wizard.init();
    
    // Make wizard globally available
    window.productWizard = wizard;
});

// Export for use in other scripts
window.ProductWizard = ProductWizard;
}
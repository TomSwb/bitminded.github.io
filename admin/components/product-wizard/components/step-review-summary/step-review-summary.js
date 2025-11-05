/**
 * Step 7: Review & Summary Component
 * Displays all entered data for review before saving
 */

if (typeof window.StepReviewSummary === 'undefined') {
    window.StepReviewSummary = class StepReviewSummary {
        constructor() {
            this.isInitialized = false;
            this.elements = {};
        }

        async init() {
            if (this.isInitialized) {
                return;
            }

            try {
                this.initializeElements();
                this.attachEventListeners();
                await this.initializeTranslations();
                this.loadSummaryData();
                this.showTranslatableContent();
                this.isInitialized = true;
            } catch (error) {
                console.error('❌ Step 7: Review & Summary: Failed to initialize:', error);
            }
        }

        initializeElements() {
            this.elements = {
                validationStatus: document.getElementById('validation-status'),
                saveAndExitBtn: document.getElementById('save-and-exit-btn'),
                backToEditBtn: document.getElementById('back-to-edit-btn'),
                
                // Section content containers
                basicInfoContent: document.getElementById('basic-info-content'),
                technicalSpecContent: document.getElementById('technical-spec-content'),
                contentMediaContent: document.getElementById('content-media-content'),
                githubContent: document.getElementById('github-content'),
                stripeContent: document.getElementById('stripe-content'),
                cloudflareContent: document.getElementById('cloudflare-content'),
                
                // Status icons
                statusIcons: {
                    1: document.getElementById('status-icon-1'),
                    2: document.getElementById('status-icon-2'),
                    3: document.getElementById('status-icon-3'),
                    4: document.getElementById('status-icon-4'),
                    5: document.getElementById('status-icon-5'),
                    6: document.getElementById('status-icon-6')
                }
            };
        }

        attachEventListeners() {
            if (this.elements.saveAndExitBtn) {
                this.elements.saveAndExitBtn.addEventListener('click', () => {
                    this.handleSaveAndExit();
                });
            }

            if (this.elements.backToEditBtn) {
                this.elements.backToEditBtn.addEventListener('click', () => {
                    this.handleBackToEdit();
                });
            }
        }

        loadSummaryData() {
            if (!window.productWizard) {
                console.error('Product wizard not available');
                return;
            }

            const formData = window.productWizard.formData || {};
            const stepData = window.productWizard.stepData || {};

            // Render each section
            this.renderBasicInfo(formData);
            this.renderTechnicalSpec(stepData[2], formData);
            this.renderContentMedia(formData);
            this.renderGitHub(formData);
            this.renderStripe(formData);
            this.renderCloudflare(formData);

            // Show validation status
            this.validateAllSteps(formData, stepData);
        }

        renderBasicInfo(data) {
            if (!this.elements.basicInfoContent) return;

            const name = data.name || 'Not provided';
            const slug = data.slug || 'Not provided';
            const category = data.category || 'None';
            const shortDescription = data.short_description || 'Not provided';
            const description = data.description || 'Not provided';
            const tags = data.tags || '';
            const pricingType = data.pricing_type || 'Not selected';

            // Validate required fields
            const isComplete = name !== 'Not provided' && slug !== 'Not provided';
            this.updateStatusIcon(1, isComplete);

            const tagsDisplay = tags 
                ? (Array.isArray(tags) ? tags.join(', ') : tags)
                : 'None';

            const descriptionPreview = description.length > 200 
                ? description.substring(0, 200) + '...'
                : description;

            this.elements.basicInfoContent.innerHTML = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Product Name:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(name)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Slug:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(slug)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Category:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(category)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Short Description:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(shortDescription)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Description:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(descriptionPreview)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Tags:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(tagsDisplay)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Pricing Type:</span>
                    <span class="step-review-summary__field-value">${this.formatPricingType(pricingType)}</span>
                </div>
            `;
        }

        renderTechnicalSpec(step2Data, formData) {
            if (!this.elements.technicalSpecContent) return;

            const technicalSpec = step2Data?.technicalSpecification || formData.technical_specification || null;
            const hasSpec = technicalSpec && technicalSpec.trim() !== '';

            this.updateStatusIcon(2, hasSpec);

            if (!hasSpec) {
                this.elements.technicalSpecContent.innerHTML = `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-value step-review-summary__field-value--missing">
                            Technical specification not yet generated
                        </span>
                    </div>
                `;
                return;
            }

            const preview = technicalSpec.length > 500 
                ? technicalSpec.substring(0, 500) + '...'
                : technicalSpec;

            this.elements.technicalSpecContent.innerHTML = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Status:</span>
                    <span class="step-review-summary__field-value step-review-summary__field-value--success">Generated</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Preview:</span>
                    <div class="step-review-summary__spec-preview">${this.escapeHtml(preview)}</div>
                </div>
            `;
        }

        renderContentMedia(data) {
            if (!this.elements.contentMediaContent) return;

            const iconUrl = data.icon_url || null;
            const features = data.features || [];
            const screenshots = data.screenshots || [];
            const demoVideoUrl = data.demo_video_url || null;
            const documentationUrl = data.documentation_url || null;
            const supportEmail = data.support_email || null;

            // Validate required fields
            const hasIcon = !!iconUrl;
            const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
            const hasFeatures = featuresArray.length > 0;
            const isComplete = hasIcon && hasFeatures;

            this.updateStatusIcon(3, isComplete);

            const screenshotsArray = Array.isArray(screenshots) 
                ? screenshots 
                : (screenshots ? [screenshots] : []);
            const validScreenshots = screenshotsArray.filter(url => url && typeof url === 'string' && url.startsWith('http'));

            let html = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Icon:</span>
                    <span class="step-review-summary__field-value">
                        ${iconUrl 
                            ? `<img src="${this.escapeHtml(iconUrl)}" alt="Product icon" class="step-review-summary__icon-preview">` 
                            : '<span class="step-review-summary__field-value--missing">Not uploaded</span>'}
                    </span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Features:</span>
                    <span class="step-review-summary__field-value">
                        ${hasFeatures 
                            ? `<ul class="step-review-summary__list">${featuresArray.map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}</ul>` 
                            : '<span class="step-review-summary__field-value--missing">No features added</span>'}
                    </span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Screenshots:</span>
                    <span class="step-review-summary__field-value">${validScreenshots.length} screenshot(s)</span>
                </div>
            `;

            if (demoVideoUrl) {
                html += `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-label">Demo Video:</span>
                        <span class="step-review-summary__field-value">
                            <a href="${this.escapeHtml(demoVideoUrl)}" target="_blank" rel="noopener">${this.escapeHtml(demoVideoUrl)}</a>
                        </span>
                    </div>
                `;
            }

            if (documentationUrl) {
                html += `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-label">Documentation:</span>
                        <span class="step-review-summary__field-value">
                            <a href="${this.escapeHtml(documentationUrl)}" target="_blank" rel="noopener">${this.escapeHtml(documentationUrl)}</a>
                        </span>
                    </div>
                `;
            }

            if (supportEmail) {
                html += `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-label">Support Email:</span>
                        <span class="step-review-summary__field-value">${this.escapeHtml(supportEmail)}</span>
                    </div>
                `;
            }

            this.elements.contentMediaContent.innerHTML = html;
        }

        renderGitHub(data) {
            if (!this.elements.githubContent) return;

            const repoCreated = data.github_repo_created || false;
            const repoUrl = data.github_repo_url || null;
            const repoName = data.github_repo_name || null;
            const branch = data.github_branch || 'main';

            this.updateStatusIcon(4, repoCreated && repoUrl);

            if (!repoCreated || !repoUrl) {
                this.elements.githubContent.innerHTML = `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-value step-review-summary__field-value--missing">
                            GitHub repository not yet created
                        </span>
                    </div>
                `;
                return;
            }

            this.elements.githubContent.innerHTML = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Status:</span>
                    <span class="step-review-summary__field-value step-review-summary__field-value--success">Created</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Repository:</span>
                    <span class="step-review-summary__field-value">
                        <a href="${this.escapeHtml(repoUrl)}" target="_blank" rel="noopener">${this.escapeHtml(repoUrl)}</a>
                    </span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Name:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(repoName || 'N/A')}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Branch:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(branch)}</span>
                </div>
            `;
        }

        renderStripe(data) {
            if (!this.elements.stripeContent) return;

            const productId = data.stripe_product_id || null;
            const priceId = data.stripe_price_id || null;
            const pricingType = data.pricing_type || '';
            const priceAmount = data.price_amount || null;
            const currency = data.price_currency || 'USD';
            const subscriptionInterval = data.subscription_interval || null;
            const enterprisePrice = data.enterprise_price || null;

            this.updateStatusIcon(5, !!productId);

            if (!productId) {
                this.elements.stripeContent.innerHTML = `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-value step-review-summary__field-value--missing">
                            Stripe product not yet created
                        </span>
                    </div>
                `;
                return;
            }

            let pricingInfo = 'N/A';
            if (pricingType === 'subscription' && priceAmount) {
                pricingInfo = `${currency.toUpperCase()} ${priceAmount} / ${subscriptionInterval || 'month'}`;
            } else if (pricingType === 'one_time' && priceAmount) {
                pricingInfo = `${currency.toUpperCase()} ${priceAmount} (one-time)`;
            } else if (pricingType === 'freemium' && enterprisePrice) {
                pricingInfo = `Freemium (Enterprise: ${currency.toUpperCase()} ${enterprisePrice})`;
            }

            this.elements.stripeContent.innerHTML = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Status:</span>
                    <span class="step-review-summary__field-value step-review-summary__field-value--success">Created</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Product ID:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(productId)}</span>
                </div>
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Pricing:</span>
                    <span class="step-review-summary__field-value">${this.escapeHtml(pricingInfo)}</span>
                </div>
            `;
        }

        renderCloudflare(data) {
            if (!this.elements.cloudflareContent) return;

            const domain = data.cloudflare_domain || null;
            const workerUrl = data.cloudflare_worker_url || null;
            const hasConfig = !!(domain || workerUrl);

            this.updateStatusIcon(6, hasConfig);

            if (!hasConfig) {
                this.elements.cloudflareContent.innerHTML = `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-value step-review-summary__field-value--missing">
                            Cloudflare configuration not yet completed
                        </span>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="step-review-summary__field">
                    <span class="step-review-summary__field-label">Status:</span>
                    <span class="step-review-summary__field-value step-review-summary__field-value--success">Configured</span>
                </div>
            `;

            if (domain) {
                html += `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-label">Domain:</span>
                        <span class="step-review-summary__field-value">
                            <a href="https://${this.escapeHtml(domain)}" target="_blank" rel="noopener">${this.escapeHtml(domain)}</a>
                        </span>
                    </div>
                `;
            }

            if (workerUrl) {
                html += `
                    <div class="step-review-summary__field">
                        <span class="step-review-summary__field-label">Worker URL:</span>
                        <span class="step-review-summary__field-value">
                            <a href="${this.escapeHtml(workerUrl)}" target="_blank" rel="noopener">${this.escapeHtml(workerUrl)}</a>
                        </span>
                    </div>
                `;
            }

            this.elements.cloudflareContent.innerHTML = html;
        }

        validateAllSteps(formData, stepData) {
            if (!this.elements.validationStatus) return;

            const errors = [];
            const warnings = [];

            // Step 1: Required fields
            if (!formData.name || !formData.slug) {
                errors.push('Step 1: Product name and slug are required');
            }

            // Step 2: Optional but recommended
            const techSpec = stepData[2]?.technicalSpecification || formData.technical_specification;
            if (!techSpec || techSpec.trim() === '') {
                warnings.push('Step 2: Technical specification not generated');
            }

            // Step 3: Required fields
            if (!formData.icon_url) {
                errors.push('Step 3: Product icon is required');
            }
            const features = formData.features || [];
            const featuresArray = Array.isArray(features) ? features : (features ? [features] : []);
            if (featuresArray.length === 0) {
                errors.push('Step 3: At least one feature is required');
            }

            // Step 4: Optional
            if (!formData.github_repo_created) {
                warnings.push('Step 4: GitHub repository not created');
            }

            // Step 5: Optional but recommended
            if (!formData.stripe_product_id) {
                warnings.push('Step 5: Stripe product not created');
            }

            // Step 6: Optional
            if (!formData.cloudflare_domain && !formData.cloudflare_worker_url) {
                warnings.push('Step 6: Cloudflare configuration not completed');
            }

            // Display validation status
            if (errors.length > 0) {
                this.elements.validationStatus.className = 'step-review-summary__validation step-review-summary__validation--error';
                this.elements.validationStatus.innerHTML = `
                    <strong>⚠️ Required fields missing:</strong>
                    <ul>${errors.map(e => `<li>${this.escapeHtml(e)}</li>`).join('')}</ul>
                `;
            } else if (warnings.length > 0) {
                this.elements.validationStatus.className = 'step-review-summary__validation step-review-summary__validation--warning';
                this.elements.validationStatus.innerHTML = `
                    <strong>ℹ️ Optional steps not completed:</strong>
                    <ul>${warnings.map(w => `<li>${this.escapeHtml(w)}</li>`).join('')}</ul>
                `;
            } else {
                this.elements.validationStatus.className = 'step-review-summary__validation step-review-summary__validation--success';
                this.elements.validationStatus.innerHTML = `
                    <strong>✅ All required fields completed!</strong>
                `;
            }
        }

        updateStatusIcon(stepNumber, isComplete) {
            const icon = this.elements.statusIcons[stepNumber];
            if (!icon) return;

            if (isComplete) {
                icon.textContent = '✅';
                icon.className = 'step-review-summary__status-icon step-review-summary__status-icon--complete';
            } else {
                icon.textContent = '⚠️';
                icon.className = 'step-review-summary__status-icon step-review-summary__status-icon--incomplete';
            }
        }

        formatPricingType(type) {
            const types = {
                'freemium': 'Freemium',
                'subscription': 'Subscription',
                'one_time': 'One-time Payment'
            };
            return types[type] || type;
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        async handleSaveAndExit() {
            try {
                if (!window.productWizard) {
                    console.error('Product wizard not available');
                    return;
                }

                // Save current step data
                window.productWizard.saveCurrentStepData(7);

                // Mark step 7 as completed
                window.productWizard.markStepCompleted(7);

                // Save to database with beta status
                const result = await window.productWizard.saveDraftToDatabase('beta');
                
                if (result.success) {
                    // Navigate back to Product Management
                    window.location.href = '/admin/?section=products';
                } else {
                    alert('Failed to save product: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('❌ Error saving and exiting:', error);
                alert('Failed to save product: ' + error.message);
            }
        }

        handleBackToEdit() {
            if (!window.productWizard) {
                return;
            }

            // Go back to Step 6
            window.productWizard.goToStep(6);
        }

        /**
         * Initialize translations
         */
        async initializeTranslations() {
            try {
                // Step 7 doesn't have its own translation file, uses shared wizard translations
                // Wait for i18next to be ready if available
                if (window.i18next && window.i18next.isInitialized) {
                    // Translations will be handled by the main wizard translation system
                }
            } catch (error) {
                console.error('❌ Failed to initialize translations:', error);
            }
        }

        /**
         * Show translatable content
         */
        showTranslatableContent() {
            const elements = document.querySelectorAll('#step-7 .translatable-content, .step-review-summary .translatable-content');
            elements.forEach(el => el.classList.add('loaded'));
        }

        // Required interface methods
        getFormData() {
            return {}; // Review step doesn't collect new data
        }

        setFormData(data) {
            // Nothing to set for review step
        }

        saveFormData(formData) {
            // Review step doesn't modify formData
        }
    }
}


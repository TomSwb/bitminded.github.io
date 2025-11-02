if (typeof window.StepStripeCreation === 'undefined') {
    window.StepStripeCreation = class StepStripeCreation {
        constructor() {
            this.elements = {};
            this.formData = {
                pricing_type: 'freemium',
                individual_price: 0,
                enterprise_price: 0,
                subscription_interval: 'monthly',
                subscription_price: 0,
                one_time_price: 0,
                trial_days: 0,
                trial_requires_payment: false,
                requires_admin_approval: false
            };
            this.stripeProductCreated = false;
        }

        async init() {
            this.initializeElements();
            this.attachEventListeners();
            this.setupDefaults();
            this.togglePricingSections();
        }

        initializeElements() {
            this.elements = {
                pricingTypeRadios: document.querySelectorAll('input[name="pricing_type"]'),
                individualPriceInput: document.getElementById('individual-price'),
                enterprisePriceInput: document.getElementById('enterprise-price'),
                requiresAdminApprovalCheckbox: document.getElementById('requires-admin-approval'),
                subscriptionIntervalSelect: document.getElementById('subscription-interval'),
                subscriptionPriceInput: document.getElementById('subscription-price'),
                oneTimePriceInput: document.getElementById('one-time-price'),
                trialDaysInput: document.getElementById('trial-days'),
                trialRequiresPaymentCheckbox: document.getElementById('trial-requires-payment'),
                createStripeBtn: document.getElementById('create-stripe-btn'),
                stripeStatusSection: document.getElementById('stripe-status-section'),
                stripeStatus: document.getElementById('stripe-status'),
                stripeActions: document.getElementById('stripe-actions'),
                deleteStripeBtn: document.getElementById('delete-stripe-btn'),
                viewStripeLink: document.getElementById('view-stripe-link'),
                freemiumSection: document.getElementById('freemium-pricing'),
                subscriptionSection: document.getElementById('subscription-pricing'),
                oneTimeSection: document.getElementById('one-time-pricing')
            };
        }

        attachEventListeners() {
            if (this.elements.pricingTypeRadios) {
                this.elements.pricingTypeRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        this.formData.pricing_type = radio.value;
                        this.togglePricingSections();
                    });
                });
            }

            if (this.elements.enterprisePriceInput) {
                this.elements.enterprisePriceInput.addEventListener('input', () => {
                    this.formData.enterprise_price = parseFloat(this.elements.enterprisePriceInput.value) || 0;
                });
            }

            if (this.elements.subscriptionPriceInput) {
                this.elements.subscriptionPriceInput.addEventListener('input', () => {
                    this.formData.subscription_price = parseFloat(this.elements.subscriptionPriceInput.value) || 0;
                });
            }

            if (this.elements.oneTimePriceInput) {
                this.elements.oneTimePriceInput.addEventListener('input', () => {
                    this.formData.one_time_price = parseFloat(this.elements.oneTimePriceInput.value) || 0;
                });
            }

            if (this.elements.subscriptionIntervalSelect) {
                this.elements.subscriptionIntervalSelect.addEventListener('change', () => {
                    this.formData.subscription_interval = this.elements.subscriptionIntervalSelect.value;
                });
            }

            if (this.elements.trialDaysInput) {
                this.elements.trialDaysInput.addEventListener('input', () => {
                    this.formData.trial_days = parseInt(this.elements.trialDaysInput.value) || 0;
                });
            }

            if (this.elements.trialRequiresPaymentCheckbox) {
                this.elements.trialRequiresPaymentCheckbox.addEventListener('change', () => {
                    this.formData.trial_requires_payment = this.elements.trialRequiresPaymentCheckbox.checked;
                });
            }

            if (this.elements.requiresAdminApprovalCheckbox) {
                this.elements.requiresAdminApprovalCheckbox.addEventListener('change', () => {
                    this.formData.requires_admin_approval = this.elements.requiresAdminApprovalCheckbox.checked;
                });
            }

            if (this.elements.createStripeBtn) {
                this.elements.createStripeBtn.addEventListener('click', () => {
                    this.handleCreateStripeProduct();
                });
            }

            if (this.elements.deleteStripeBtn) {
                this.elements.deleteStripeBtn.addEventListener('click', () => {
                    this.handleDeleteStripeProduct();
                });
            }
        }

        setupDefaults() {
            if (window.productWizard && window.productWizard.formData) {
                const basicInfo = window.productWizard.formData;
                
                // Load pricing configuration
                if (basicInfo.pricing_type) {
                    this.formData.pricing_type = basicInfo.pricing_type;
                    if (this.elements.pricingTypeRadios) {
                        this.elements.pricingTypeRadios.forEach(radio => {
                            if (radio.value === basicInfo.pricing_type) {
                                radio.checked = true;
                            }
                        });
                    }
                }

                if (basicInfo.enterprise_price !== undefined) {
                    this.formData.enterprise_price = basicInfo.enterprise_price;
                    if (this.elements.enterprisePriceInput) {
                        this.elements.enterprisePriceInput.value = basicInfo.enterprise_price;
                    }
                }

                if (basicInfo.subscription_price !== undefined) {
                    this.formData.subscription_price = basicInfo.subscription_price;
                    if (this.elements.subscriptionPriceInput) {
                        this.elements.subscriptionPriceInput.value = basicInfo.subscription_price;
                    }
                }

                if (basicInfo.one_time_price !== undefined) {
                    this.formData.one_time_price = basicInfo.one_time_price;
                    if (this.elements.oneTimePriceInput) {
                        this.elements.oneTimePriceInput.value = basicInfo.one_time_price;
                    }
                }

                if (basicInfo.subscription_interval) {
                    this.formData.subscription_interval = basicInfo.subscription_interval;
                    if (this.elements.subscriptionIntervalSelect) {
                        this.elements.subscriptionIntervalSelect.value = basicInfo.subscription_interval;
                    }
                }

                if (basicInfo.trial_days !== undefined) {
                    this.formData.trial_days = basicInfo.trial_days;
                    if (this.elements.trialDaysInput) {
                        this.elements.trialDaysInput.value = basicInfo.trial_days;
                    }
                }

                if (basicInfo.trial_requires_payment !== undefined) {
                    this.formData.trial_requires_payment = basicInfo.trial_requires_payment;
                    if (this.elements.trialRequiresPaymentCheckbox) {
                        this.elements.trialRequiresPaymentCheckbox.checked = basicInfo.trial_requires_payment;
                    }
                }

                if (basicInfo.requires_admin_approval !== undefined) {
                    this.formData.requires_admin_approval = basicInfo.requires_admin_approval;
                    if (this.elements.requiresAdminApprovalCheckbox) {
                        this.elements.requiresAdminApprovalCheckbox.checked = basicInfo.requires_admin_approval;
                    }
                }
                
                // Sync this.formData with basicInfo to ensure consistency
                this.formData = { ...this.formData, ...basicInfo };

                // Check if Stripe product was already created
                if (basicInfo.stripe_product_id) {
                    this.stripeProductCreated = true;
                    this.showFinalState(basicInfo);
                }
                
                // Always ensure form fields are populated and correct section is visible
                this.populateFormFields();
                this.togglePricingSections();
            }
        }

        togglePricingSections() {
            if (!this.elements.freemiumSection || !this.elements.subscriptionSection || !this.elements.oneTimeSection) return;

            switch (this.formData.pricing_type) {
                case 'freemium':
                    this.elements.freemiumSection.style.display = 'block';
                    this.elements.subscriptionSection.style.display = 'none';
                    this.elements.oneTimeSection.style.display = 'none';
                    break;
                case 'subscription':
                    this.elements.freemiumSection.style.display = 'none';
                    this.elements.subscriptionSection.style.display = 'block';
                    this.elements.oneTimeSection.style.display = 'none';
                    break;
                case 'one_time':
                    this.elements.freemiumSection.style.display = 'none';
                    this.elements.subscriptionSection.style.display = 'none';
                    this.elements.oneTimeSection.style.display = 'block';
                    break;
            }
        }

        async handleCreateStripeProduct() {
            try {
                if (!this.validate()) {
                    alert('Please fill in all required pricing fields');
                    return;
                }

                this.elements.createStripeBtn.disabled = true;
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Creating...</span>';

                const result = await this.createStripeProduct();

                if (result.success) {
                    this.elements.createStripeBtn.parentElement.style.display = 'none';
                    this.updateStripeStatus(result.data);
                    this.stripeProductCreated = true;
                    console.log('💾 About to save Stripe data to formData. Result:', result.data);
                    this.saveToFormData(result.data);
                    console.log('💾 After saveToFormData. window.productWizard.formData.stripe_product_id:', window.productWizard?.formData?.stripe_product_id);
                    
                    // Ensure form fields remain populated with the values that were used
                    this.populateFormFields();
                    // Ensure the correct pricing section is visible
                    this.togglePricingSections();

                    // Persist immediately to database (no manual Save Draft required)
                    try {
                        if (window.productWizard && typeof window.productWizard.saveDraftToDatabase === 'function') {
                            console.log('💾 Saving Stripe IDs to database...');
                            const saveResult = await window.productWizard.saveDraftToDatabase();
                            if (!saveResult?.success) {
                                console.warn('⚠️ Failed to persist Stripe IDs automatically:', saveResult?.error);
                            } else {
                                console.log('✅ Stripe IDs persisted to database');
                            }
                        }
                    } catch (persistError) {
                        console.warn('⚠️ Could not auto-persist Stripe IDs:', persistError);
                    }

                    // Mark step as completed (Stripe is Step 5)
                    if (window.productWizard) {
                        window.productWizard.markStepCompleted(5);
                    }
                } else {
                    throw new Error(result.error || 'Failed to create Stripe product');
                }

            } catch (error) {
                console.error('❌ Error:', error);
                this.elements.createStripeBtn.disabled = false;
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span>Create Stripe Product</span>';
                alert('Failed to create Stripe product: ' + error.message);
            }
        }

        validate() {
            switch (this.formData.pricing_type) {
                case 'freemium':
                    return this.formData.enterprise_price > 0;
                case 'subscription':
                    return this.formData.subscription_price > 0;
                case 'one_time':
                    return this.formData.one_time_price > 0;
            }
            return true;
        }

        async createStripeProduct() {
            try {
                const basicInfo = window.productWizard?.formData || {};
                const body = {
                    name: basicInfo.name,
                    description: basicInfo.short_description,
                    fullDescription: basicInfo.description, // Full description for Stripe
                    iconUrl: basicInfo.icon_url || null, // Product icon (will be available from Step 6)
                    documentationUrl: basicInfo.documentation_url,
                    supportEmail: basicInfo.support_email,
                    category: basicInfo.category,
                    tags: Array.isArray(basicInfo.tags) ? basicInfo.tags.join(', ') : basicInfo.tags,
                    pricingType: this.formData.pricing_type,
                    currency: 'chf',
                    enterprisePrice: this.formData.enterprise_price,
                    subscriptionInterval: this.formData.subscription_interval,
                    subscriptionPrice: this.formData.subscription_price,
                    oneTimePrice: this.formData.one_time_price,
                    trialDays: this.formData.trial_days,
                    trialRequiresPayment: this.formData.trial_requires_payment
                };

                const { data, error } = await window.supabase.functions.invoke('create-stripe-product', { body });
                if (error) throw error;
                console.log('✅ Stripe product created:', data);
                return { success: true, data };

            } catch (error) {
                console.error('❌ Error:', error);
                return { success: false, error: error.message };
            }
        }

        updateStripeStatus(data) {
            if (!this.elements.stripeStatus) return;
            let statusHTML = '<div class="step-stripe-creation__status-item">';
            statusHTML += '<span class="step-stripe-creation__status-label">Status:</span>';
            statusHTML += '<span class="step-stripe-creation__status-value step-stripe-creation__status-value--success">✅ Product Created</span>';
            statusHTML += '</div>';
            if (data.productId) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Product ID:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${data.productId}</span>`;
                statusHTML += '</div>';
            }
            this.elements.stripeStatus.innerHTML = statusHTML;
            if (this.elements.stripeStatusSection) {
                this.elements.stripeStatusSection.style.display = 'block';
            }
            
            // Show action buttons and set up links
            if (data.productId && this.elements.stripeActions) {
                this.elements.stripeActions.style.display = 'flex';
                if (this.elements.viewStripeLink) {
                    this.elements.viewStripeLink.href = `https://dashboard.stripe.com/test/products/${data.productId}`;
                }
            }
        }
        
        async handleDeleteStripeProduct() {
            const confirmed = confirm('Are you sure you want to delete this Stripe product? This will also archive all associated prices.');
            if (!confirmed) return;
            
            const basicInfo = window.productWizard?.formData || {};
            const productId = basicInfo.stripe_product_id;
            
            if (!productId) {
                alert('No Stripe product ID found');
                return;
            }
            
            try {
                // Call Edge Function to archive the product
                const { error } = await window.supabase.functions.invoke('delete-stripe-product', {
                    body: { productId }
                });
                
                if (error) throw error;
                
                // Clear from form data
                if (window.productWizard && window.productWizard.formData) {
                    window.productWizard.formData.stripe_product_id = null;
                    window.productWizard.formData.stripe_price_id = null;
                }
                
                // Update database to reflect the deletion
                console.log('💾 Saving deleted Stripe status to database...');
                const saveResult = await window.productWizard.saveDraftToDatabase();
                if (!saveResult.success) {
                    console.error('❌ Failed to update database after Stripe deletion:', saveResult.error);
                    alert('Stripe product archived, but failed to update database. Please refresh the page.');
                } else {
                    console.log('✅ Database updated after Stripe deletion');
                }

                // Mark step as incomplete (Stripe is Step 5)
                if (window.productWizard) {
                    window.productWizard.markStepIncomplete(5);
                }
                
                // Update UI
                this.stripeProductCreated = false;
                this.elements.createStripeBtn.disabled = false;
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span>Create Stripe Product</span>';
                this.elements.createStripeBtn.parentElement.style.display = 'block';
                this.elements.stripeStatusSection.style.display = 'none';
                
                alert('Stripe product archived successfully');
                
            } catch (error) {
                console.error('❌ Error deleting Stripe product:', error);
                alert('Failed to delete Stripe product: ' + error.message);
            }
        }

        showFinalState(data) {
            if (!data) data = window.productWizard?.formData || {};
            
            console.log('🔄 Showing final state for Stripe product:', data.stripe_product_id);
            
            // Hide create button section
            if (this.elements.createStripeBtn && this.elements.createStripeBtn.parentElement) {
                this.elements.createStripeBtn.parentElement.style.display = 'none';
                console.log('✅ Create button hidden');
            }
            
            if (data.stripe_product_id) {
                this.updateStripeStatus({ productId: data.stripe_product_id, priceId: data.stripe_price_id });
            }
        }

        saveToFormData(data) {
            if (!window.productWizard || !window.productWizard.formData) return;
            if (data.productId) window.productWizard.formData.stripe_product_id = data.productId;
            if (data.priceId) window.productWizard.formData.stripe_price_id = data.priceId;
            
            // Save all pricing configuration
            window.productWizard.formData.pricing_type = this.formData.pricing_type;
            window.productWizard.formData.enterprise_price = this.formData.enterprise_price;
            window.productWizard.formData.subscription_price = this.formData.subscription_price;
            window.productWizard.formData.one_time_price = this.formData.one_time_price;
            window.productWizard.formData.subscription_interval = this.formData.subscription_interval;
            window.productWizard.formData.trial_days = this.formData.trial_days;
            window.productWizard.formData.trial_requires_payment = this.formData.trial_requires_payment;
            window.productWizard.formData.requires_admin_approval = this.formData.requires_admin_approval;
            window.productWizard.formData.individual_price = this.formData.individual_price;
            
            console.log('✅ Saved Stripe data to formData');
        }
        
        populateFormFields() {
            // Use window.productWizard.formData as source of truth (it has the saved values)
            // Fall back to this.formData if wizard data not available
            const sourceData = (window.productWizard?.formData && Object.keys(window.productWizard.formData).length > 0) 
                ? window.productWizard.formData 
                : this.formData;
            
            console.log('📝 Populating form fields with saved values:', sourceData);
            
            // Set pricing type radio buttons
            if (sourceData.pricing_type && this.elements.pricingTypeRadios) {
                this.elements.pricingTypeRadios.forEach(radio => {
                    radio.checked = (radio.value === sourceData.pricing_type);
                });
            }
            
            // Populate enterprise price
            if (this.elements.enterprisePriceInput) {
                this.elements.enterprisePriceInput.value = sourceData.enterprise_price !== undefined ? sourceData.enterprise_price : '';
            }
            
            // Populate subscription price
            if (this.elements.subscriptionPriceInput) {
                this.elements.subscriptionPriceInput.value = sourceData.subscription_price !== undefined ? sourceData.subscription_price : '';
            }
            
            // Populate one-time price
            if (this.elements.oneTimePriceInput) {
                this.elements.oneTimePriceInput.value = sourceData.one_time_price !== undefined ? sourceData.one_time_price : '';
            }
            
            // Populate subscription interval
            if (sourceData.subscription_interval && this.elements.subscriptionIntervalSelect) {
                this.elements.subscriptionIntervalSelect.value = sourceData.subscription_interval;
            }
            
            // Populate trial days
            if (this.elements.trialDaysInput) {
                this.elements.trialDaysInput.value = sourceData.trial_days !== undefined ? sourceData.trial_days : 0;
            }
            
            // Populate trial requires payment checkbox
            if (this.elements.trialRequiresPaymentCheckbox) {
                this.elements.trialRequiresPaymentCheckbox.checked = sourceData.trial_requires_payment || false;
            }
            
            // Populate requires admin approval checkbox
            if (this.elements.requiresAdminApprovalCheckbox) {
                this.elements.requiresAdminApprovalCheckbox.checked = sourceData.requires_admin_approval || false;
            }
            
            // Populate individual price (always 0 for freemium)
            if (this.elements.individualPriceInput) {
                this.elements.individualPriceInput.value = sourceData.individual_price !== undefined ? sourceData.individual_price : 0;
            }
            
            // Sync this.formData with sourceData to keep them in sync
            this.formData = { ...this.formData, ...sourceData };
            
            console.log('✅ Form fields populated from:', sourceData.stripe_product_id ? 'wizard.formData' : 'this.formData');
        }

        /**
         * Save form data (called by parent wizard on save)
         */
        saveFormData(wizardFormData) {
            // Save all pricing configuration to wizard's formData
            wizardFormData.pricing_type = this.formData.pricing_type;
            wizardFormData.enterprise_price = this.formData.enterprise_price;
            wizardFormData.subscription_price = this.formData.subscription_price;
            wizardFormData.one_time_price = this.formData.one_time_price;
            wizardFormData.subscription_interval = this.formData.subscription_interval;
            wizardFormData.trial_days = this.formData.trial_days;
            wizardFormData.trial_requires_payment = this.formData.trial_requires_payment;
            wizardFormData.requires_admin_approval = this.formData.requires_admin_approval;
            wizardFormData.individual_price = this.formData.individual_price;
            
            console.log('✅ SaveFormData: Saved Stripe pricing configuration');
        }

        setFormData(data) {
            if (data) {
                this.formData = { ...this.formData, ...data };
            }
        }

        validate() {
            return true;
        }
    }
}


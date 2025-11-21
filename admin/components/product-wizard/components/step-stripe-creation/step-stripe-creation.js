if (typeof window.StepStripeCreation === 'undefined') {
    window.StepStripeCreation = class StepStripeCreation {
        constructor() {
            this.elements = {};
            this.formData = {
                pricing_type: 'freemium',
                subscription_price: 0,
                subscription_pricing: { CHF: 0, USD: 0, EUR: 0, GBP: 0 },
                one_time_price: 0,
                one_time_pricing: { CHF: 0, USD: 0, EUR: 0, GBP: 0 },
                trial_days: 0,
                trial_requires_payment: false
            };
            this.stripeProductCreated = false;
        }

        async init() {
            this.initializeElements();
            this.attachEventListeners();
            this.setupDefaults();
            this.togglePricingSections();
            // Ensure freemium defaults are set on init
            if (this.formData.pricing_type === 'freemium') {
                this.setFreemiumPricesToZero();
            }
        }

        initializeElements() {
            this.elements = {
                pricingTypeRadios: document.querySelectorAll('input[name="pricing_type"]'),
                subscriptionPriceInput: document.getElementById('subscription-price'),
                // Multi-currency subscription price inputs
                subscriptionPriceChf: document.getElementById('subscription-price-chf'),
                subscriptionPriceUsd: document.getElementById('subscription-price-usd'),
                subscriptionPriceEur: document.getElementById('subscription-price-eur'),
                subscriptionPriceGbp: document.getElementById('subscription-price-gbp'),
                oneTimePriceInput: document.getElementById('one-time-price'),
                // Multi-currency one-time price inputs
                oneTimePriceChf: document.getElementById('one-time-price-chf'),
                oneTimePriceUsd: document.getElementById('one-time-price-usd'),
                oneTimePriceEur: document.getElementById('one-time-price-eur'),
                oneTimePriceGbp: document.getElementById('one-time-price-gbp'),
                trialDaysInput: document.getElementById('trial-days'),
                trialRequiresPaymentCheckbox: document.getElementById('trial-requires-payment'),
                trialSection: document.getElementById('trial-section') || document.getElementById('trial-days')?.closest('.step-stripe-creation__section'),
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

            // Multi-currency subscription price inputs
            if (this.elements.subscriptionPriceChf) {
                this.elements.subscriptionPriceChf.addEventListener('input', () => {
                    this.formData.subscription_pricing.CHF = parseFloat(this.elements.subscriptionPriceChf.value) || 0;
                    this.formData.subscription_price = this.formData.subscription_pricing.CHF; // Keep for backward compatibility
                });
            }
            if (this.elements.subscriptionPriceUsd) {
                this.elements.subscriptionPriceUsd.addEventListener('input', () => {
                    this.formData.subscription_pricing.USD = parseFloat(this.elements.subscriptionPriceUsd.value) || 0;
                });
            }
            if (this.elements.subscriptionPriceEur) {
                this.elements.subscriptionPriceEur.addEventListener('input', () => {
                    this.formData.subscription_pricing.EUR = parseFloat(this.elements.subscriptionPriceEur.value) || 0;
                });
            }
            if (this.elements.subscriptionPriceGbp) {
                this.elements.subscriptionPriceGbp.addEventListener('input', () => {
                    this.formData.subscription_pricing.GBP = parseFloat(this.elements.subscriptionPriceGbp.value) || 0;
                });
            }

            // Multi-currency one-time price inputs
            if (this.elements.oneTimePriceChf) {
                this.elements.oneTimePriceChf.addEventListener('input', () => {
                    this.formData.one_time_pricing.CHF = parseFloat(this.elements.oneTimePriceChf.value) || 0;
                    this.formData.one_time_price = this.formData.one_time_pricing.CHF; // Keep for backward compatibility
                });
            }
            if (this.elements.oneTimePriceUsd) {
                this.elements.oneTimePriceUsd.addEventListener('input', () => {
                    this.formData.one_time_pricing.USD = parseFloat(this.elements.oneTimePriceUsd.value) || 0;
                });
            }
            if (this.elements.oneTimePriceEur) {
                this.elements.oneTimePriceEur.addEventListener('input', () => {
                    this.formData.one_time_pricing.EUR = parseFloat(this.elements.oneTimePriceEur.value) || 0;
                });
            }
            if (this.elements.oneTimePriceGbp) {
                this.elements.oneTimePriceGbp.addEventListener('input', () => {
                    this.formData.one_time_pricing.GBP = parseFloat(this.elements.oneTimePriceGbp.value) || 0;
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

                // Load subscription pricing (multi-currency or single)
                if (basicInfo.subscription_pricing) {
                    this.formData.subscription_pricing = { ...this.formData.subscription_pricing, ...basicInfo.subscription_pricing };
                }
                if (basicInfo.subscription_price !== undefined) {
                    this.formData.subscription_price = basicInfo.subscription_price;
                    // If no multi-currency pricing, use single price for CHF
                    if (!this.formData.subscription_pricing.CHF && basicInfo.subscription_price > 0) {
                        this.formData.subscription_pricing.CHF = basicInfo.subscription_price;
                    }
                }

                // Load one-time pricing (multi-currency or single)
                if (basicInfo.one_time_pricing) {
                    this.formData.one_time_pricing = { ...this.formData.one_time_pricing, ...basicInfo.one_time_pricing };
                }
                if (basicInfo.one_time_price !== undefined) {
                    this.formData.one_time_price = basicInfo.one_time_price;
                    // If no multi-currency pricing, use single price for CHF
                    if (!this.formData.one_time_pricing.CHF && basicInfo.one_time_price > 0) {
                        this.formData.one_time_pricing.CHF = basicInfo.one_time_price;
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
                    // Hide trial section for freemium (immediate access, no trial)
                    if (this.elements.trialSection) {
                        this.elements.trialSection.style.display = 'none';
                    }
                    // Set all prices to 0 for freemium
                    this.setFreemiumPricesToZero();
                    // Set trial to 0 and no payment required
                    this.formData.trial_days = 0;
                    this.formData.trial_requires_payment = false;
                    if (this.elements.trialDaysInput) {
                        this.elements.trialDaysInput.value = 0;
                    }
                    if (this.elements.trialRequiresPaymentCheckbox) {
                        this.elements.trialRequiresPaymentCheckbox.checked = false;
                    }
                    break;
                case 'subscription':
                    this.elements.freemiumSection.style.display = 'none';
                    this.elements.subscriptionSection.style.display = 'block';
                    this.elements.oneTimeSection.style.display = 'none';
                    // Show trial section for subscriptions
                    if (this.elements.trialSection) {
                        this.elements.trialSection.style.display = 'block';
                    }
                    break;
                case 'one_time':
                    this.elements.freemiumSection.style.display = 'none';
                    this.elements.subscriptionSection.style.display = 'none';
                    this.elements.oneTimeSection.style.display = 'block';
                    // Show trial section for one-time (optional)
                    if (this.elements.trialSection) {
                        this.elements.trialSection.style.display = 'block';
                    }
                    break;
            }
        }

        setFreemiumPricesToZero() {
            // Set all prices to 0 for freemium (no pricing needed)
            // This ensures the pricing object is set correctly for Stripe creation
            this.formData.subscription_pricing = { CHF: 0, USD: 0, EUR: 0, GBP: 0 };
            this.formData.subscription_price = 0;
            this.formData.one_time_pricing = { CHF: 0, USD: 0, EUR: 0, GBP: 0 };
            this.formData.one_time_price = 0;
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
                    window.logger?.log('💾 About to save Stripe data to formData. Result:', result.data);
                    this.saveToFormData(result.data);
                    window.logger?.log('💾 After saveToFormData. window.productWizard.formData.stripe_product_id:', window.productWizard?.formData?.stripe_product_id);
                    
                    // Ensure form fields remain populated with the values that were used
                    this.populateFormFields();
                    // Ensure the correct pricing section is visible
                    this.togglePricingSections();

                    // Persist immediately to database (no manual Save Draft required)
                    try {
                        if (window.productWizard && typeof window.productWizard.saveDraftToDatabase === 'function') {
                            window.logger?.log('💾 Saving Stripe IDs to database...');
                            const saveResult = await window.productWizard.saveDraftToDatabase();
                            if (!saveResult?.success) {
                                window.logger?.warn('⚠️ Failed to persist Stripe IDs automatically:', saveResult?.error);
                            } else {
                                window.logger?.log('✅ Stripe IDs persisted to database');
                            }
                        }
                    } catch (persistError) {
                        window.logger?.warn('⚠️ Could not auto-persist Stripe IDs:', persistError);
                    }

                    // Mark step as completed (Stripe is Step 5)
                    if (window.productWizard) {
                        window.productWizard.markStepCompleted(5);
                    }
                } else {
                    throw new Error(result.error || 'Failed to create Stripe product');
                }

            } catch (error) {
                window.logger?.error('❌ Error:', error);
                this.elements.createStripeBtn.disabled = false;
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span>Create Stripe Product</span>';
                alert('Failed to create Stripe product: ' + error.message);
            }
        }

        validate() {
            switch (this.formData.pricing_type) {
                case 'freemium':
                    // Freemium is always valid (prices are 0, immediate access)
                    return true;
                case 'subscription':
                    // Check if at least one currency has a price
                    const hasSubscriptionPrice = Object.values(this.formData.subscription_pricing || {}).some(price => price > 0);
                    return hasSubscriptionPrice || this.formData.subscription_price > 0;
                case 'one_time':
                    // Check if at least one currency has a price
                    const hasOneTimePrice = Object.values(this.formData.one_time_pricing || {}).some(price => price > 0);
                    return hasOneTimePrice || this.formData.one_time_price > 0;
            }
            return true;
        }

        async createStripeProduct() {
            try {
                const basicInfo = window.productWizard?.formData || {};
                
                // Build pricing object - filter out zero values and convert to lowercase for Stripe
                let pricing = {};
                if (this.formData.pricing_type === 'freemium') {
                    // For freemium, always set all currencies to 0 (immediate free access)
                    pricing = {
                        CHF: 0,
                        USD: 0,
                        EUR: 0,
                        GBP: 0
                    };
                } else if (this.formData.pricing_type === 'subscription') {
                    // For subscriptions, we need monthly and yearly pricing structure
                    const subscriptionPricing = {};
                    Object.entries(this.formData.subscription_pricing || {}).forEach(([currency, amount]) => {
                        if (amount > 0) {
                            subscriptionPricing[currency.toUpperCase()] = {
                                monthly: amount, // Use same amount for monthly if not specified separately
                                yearly: amount * 12 * 0.9 // Estimate yearly (10% discount) if not specified
                            };
                        }
                    });
                    // Fallback to old single price if no multi-currency prices set
                    if (Object.keys(subscriptionPricing).length === 0 && this.formData.subscription_price > 0) {
                        subscriptionPricing.CHF = {
                            monthly: this.formData.subscription_price,
                            yearly: this.formData.subscription_price * 12 * 0.9
                        };
                    }
                    pricing = subscriptionPricing;
                } else if (this.formData.pricing_type === 'one_time') {
                    Object.entries(this.formData.one_time_pricing || {}).forEach(([currency, amount]) => {
                        if (amount > 0) {
                            pricing[currency.toUpperCase()] = amount;
                        }
                    });
                    // Fallback to old single price if no multi-currency prices set
                    if (Object.keys(pricing).length === 0 && this.formData.one_time_price > 0) {
                        pricing = { CHF: this.formData.one_time_price };
                    }
                }
                
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
                    pricing: pricing, // Multi-currency pricing object
                    // For freemium, always set trial to 0 (immediate access)
                    trialDays: this.formData.pricing_type === 'freemium' ? 0 : this.formData.trial_days,
                    trialRequiresPayment: this.formData.pricing_type === 'freemium' ? false : this.formData.trial_requires_payment
                };

                // Use subscription-specific function for subscription products
                const functionName = this.formData.pricing_type === 'subscription' 
                    ? 'create-stripe-subscription-product' 
                    : 'create-stripe-product';
                
                // For subscription products, rebuild body with correct format
                if (this.formData.pricing_type === 'subscription') {
                    body = {
                        name: basicInfo.name,
                        description: basicInfo.short_description,
                        short_description: basicInfo.description,
                        pricing: pricing, // Should have monthly/yearly structure from above
                        trial_days: this.formData.trial_days || 0,
                        trial_requires_payment: this.formData.trial_requires_payment || false,
                        entity_type: 'product'
                    };
                }
                
                const { data, error } = await window.supabase.functions.invoke(functionName, { body });
                if (error) throw error;
                window.logger?.log('✅ Stripe product created:', data);
                return { success: true, data };

            } catch (error) {
                window.logger?.error('❌ Error:', error);
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
                window.logger?.log('💾 Saving deleted Stripe status to database...');
                const saveResult = await window.productWizard.saveDraftToDatabase();
                if (!saveResult.success) {
                    window.logger?.error('❌ Failed to update database after Stripe deletion:', saveResult.error);
                    alert('Stripe product archived, but failed to update database. Please refresh the page.');
                } else {
                    window.logger?.log('✅ Database updated after Stripe deletion');
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
                window.logger?.error('❌ Error deleting Stripe product:', error);
                alert('Failed to delete Stripe product: ' + error.message);
            }
        }

        showFinalState(data) {
            if (!data) data = window.productWizard?.formData || {};
            
            window.logger?.log('🔄 Showing final state for Stripe product:', data.stripe_product_id);
            
            // Hide create button section
            if (this.elements.createStripeBtn && this.elements.createStripeBtn.parentElement) {
                this.elements.createStripeBtn.parentElement.style.display = 'none';
                window.logger?.log('✅ Create button hidden');
            }
            
            if (data.stripe_product_id) {
                this.updateStripeStatus({ productId: data.stripe_product_id, priceId: data.stripe_price_id });
            }
        }

        saveToFormData(data) {
            if (!window.productWizard || !window.productWizard.formData) return;
            if (data.productId) window.productWizard.formData.stripe_product_id = data.productId;
            if (data.priceId) window.productWizard.formData.stripe_price_id = data.priceId;
            // Save multi-currency price IDs if returned
            if (data.prices) {
                window.productWizard.formData.stripe_prices = data.prices;
            }
            
            // Save all pricing configuration
            window.productWizard.formData.pricing_type = this.formData.pricing_type;
            window.productWizard.formData.subscription_price = this.formData.subscription_price;
            window.productWizard.formData.subscription_pricing = this.formData.subscription_pricing;
            window.productWizard.formData.one_time_price = this.formData.one_time_price;
            window.productWizard.formData.one_time_pricing = this.formData.one_time_pricing;
            window.productWizard.formData.trial_days = this.formData.trial_days;
            window.productWizard.formData.trial_requires_payment = this.formData.trial_requires_payment;
            
            window.logger?.log('✅ Saved Stripe data to formData');
        }
        
        populateFormFields() {
            // Use window.productWizard.formData as source of truth (it has the saved values)
            // Fall back to this.formData if wizard data not available
            const sourceData = (window.productWizard?.formData && Object.keys(window.productWizard.formData).length > 0) 
                ? window.productWizard.formData 
                : this.formData;
            
            window.logger?.log('📝 Populating form fields with saved values:', sourceData);
            
            // Set pricing type radio buttons
            if (sourceData.pricing_type && this.elements.pricingTypeRadios) {
                this.elements.pricingTypeRadios.forEach(radio => {
                    radio.checked = (radio.value === sourceData.pricing_type);
                });
            }
            
            // Populate subscription price (multi-currency)
            const subscriptionPricing = sourceData.subscription_pricing || {};
            if (this.elements.subscriptionPriceChf) {
                this.elements.subscriptionPriceChf.value = subscriptionPricing.CHF || sourceData.subscription_price || '';
            }
            if (this.elements.subscriptionPriceUsd) {
                this.elements.subscriptionPriceUsd.value = subscriptionPricing.USD || '';
            }
            if (this.elements.subscriptionPriceEur) {
                this.elements.subscriptionPriceEur.value = subscriptionPricing.EUR || '';
            }
            if (this.elements.subscriptionPriceGbp) {
                this.elements.subscriptionPriceGbp.value = subscriptionPricing.GBP || '';
            }
            if (this.elements.subscriptionPriceInput) {
                this.elements.subscriptionPriceInput.value = sourceData.subscription_price !== undefined ? sourceData.subscription_price : '';
            }
            
            // Populate one-time price (multi-currency)
            const oneTimePricing = sourceData.one_time_pricing || {};
            if (this.elements.oneTimePriceChf) {
                this.elements.oneTimePriceChf.value = oneTimePricing.CHF || sourceData.one_time_price || '';
            }
            if (this.elements.oneTimePriceUsd) {
                this.elements.oneTimePriceUsd.value = oneTimePricing.USD || '';
            }
            if (this.elements.oneTimePriceEur) {
                this.elements.oneTimePriceEur.value = oneTimePricing.EUR || '';
            }
            if (this.elements.oneTimePriceGbp) {
                this.elements.oneTimePriceGbp.value = oneTimePricing.GBP || '';
            }
            if (this.elements.oneTimePriceInput) {
                this.elements.oneTimePriceInput.value = sourceData.one_time_price !== undefined ? sourceData.one_time_price : '';
            }
            
            // Populate trial days
            if (this.elements.trialDaysInput) {
                this.elements.trialDaysInput.value = sourceData.trial_days !== undefined ? sourceData.trial_days : 0;
            }
            
            // Populate trial requires payment checkbox
            if (this.elements.trialRequiresPaymentCheckbox) {
                this.elements.trialRequiresPaymentCheckbox.checked = sourceData.trial_requires_payment || false;
            }
            
            // Sync this.formData with sourceData to keep them in sync
            this.formData = { ...this.formData, ...sourceData };
            
            window.logger?.log('✅ Form fields populated from:', sourceData.stripe_product_id ? 'wizard.formData' : 'this.formData');
        }

        /**
         * Save form data (called by parent wizard on save)
         */
        saveFormData(wizardFormData) {
            // Save all pricing configuration to wizard's formData
            wizardFormData.pricing_type = this.formData.pricing_type;
            wizardFormData.subscription_price = this.formData.subscription_price;
            wizardFormData.subscription_pricing = this.formData.subscription_pricing;
            wizardFormData.one_time_price = this.formData.one_time_price;
            wizardFormData.one_time_pricing = this.formData.one_time_pricing;
            wizardFormData.trial_days = this.formData.trial_days;
            wizardFormData.trial_requires_payment = this.formData.trial_requires_payment;
            
            window.logger?.log('✅ SaveFormData: Saved Stripe pricing configuration');
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


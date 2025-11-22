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
            this.isInitialized = false;
        }

        async init() {
            this.initializeElements();
            this.attachEventListeners();
            this.setupDefaults();
            
            // Ensure pricing_type is set from radio buttons if not already set
            if (this.elements.pricingTypeRadios) {
                const checkedRadio = Array.from(this.elements.pricingTypeRadios).find(radio => radio.checked);
                if (checkedRadio && !this.formData.pricing_type) {
                    this.formData.pricing_type = checkedRadio.value;
                }
            }
            
            // Ensure freemium defaults are set on init if freemium is selected
            if (this.formData.pricing_type === 'freemium') {
                this.setFreemiumPricesToZero();
            }
            
            this.togglePricingSections();
            
            // Populate form fields after everything is set up (only if not already populated)
            this.populateFormFields();
            
            // Mark as initialized
            this.isInitialized = true;
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
                updateStripeBtn: document.getElementById('update-stripe-btn'),
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
                        // Ensure prices are set correctly when switching
                        if (this.formData.pricing_type === 'freemium') {
                            this.setFreemiumPricesToZero();
                        }
                        this.togglePricingSections();
                        this.saveFormData(window.productWizard?.formData || {});
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

            if (this.elements.updateStripeBtn) {
                this.elements.updateStripeBtn.addEventListener('click', () => {
                    this.handleUpdateStripeProduct();
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
                
                // Load pricing configuration - check for valid pricing_type values
                // Valid values: 'freemium', 'one_time', 'subscription'
                if (basicInfo.pricing_type && ['freemium', 'one_time', 'subscription'].includes(basicInfo.pricing_type)) {
                    this.formData.pricing_type = basicInfo.pricing_type;
                    if (this.elements.pricingTypeRadios) {
                        this.elements.pricingTypeRadios.forEach(radio => {
                            if (radio.value === basicInfo.pricing_type) {
                                radio.checked = true;
                            } else {
                                radio.checked = false;
                            }
                        });
                    }
                    window.logger?.log('✅ Loaded pricing_type from formData:', basicInfo.pricing_type);
                } else {
                    // No existing pricing_type or invalid value - default to freemium and ensure it's checked
                    // But only if pricing_type is truly missing, not if it's a valid value
                    const defaultPricingType = 'freemium';
                    this.formData.pricing_type = defaultPricingType;
                    if (this.elements.pricingTypeRadios) {
                        this.elements.pricingTypeRadios.forEach(radio => {
                            if (radio.value === defaultPricingType) {
                                radio.checked = true;
                            } else {
                                radio.checked = false;
                            }
                        });
                    }
                    // Also update the wizard's formData to keep it in sync
                    if (window.productWizard && window.productWizard.formData) {
                        window.productWizard.formData.pricing_type = defaultPricingType;
                    }
                    window.logger?.log('⚠️ No valid pricing_type found, defaulting to:', defaultPricingType);
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
                // But preserve pricing_type if we just set it above (don't overwrite with null/undefined)
                const currentPricingType = this.formData.pricing_type;
                this.formData = { ...this.formData, ...basicInfo };
                // Restore pricing_type if basicInfo had a null/undefined value
                if (!basicInfo.pricing_type || !['freemium', 'one_time', 'subscription'].includes(basicInfo.pricing_type)) {
                    this.formData.pricing_type = currentPricingType;
                }

                // Check if Stripe product was already created
                if (basicInfo.stripe_product_id) {
                    this.stripeProductCreated = true;
                    this.showFinalState(basicInfo);
                }
                
                // Always ensure form fields are populated and correct section is visible
                this.populateFormFields();
            } else {
                // No existing data - ensure freemium is properly set as default
                this.formData.pricing_type = 'freemium';
                if (this.elements.pricingTypeRadios) {
                    this.elements.pricingTypeRadios.forEach(radio => {
                        if (radio.value === 'freemium') {
                            radio.checked = true;
                        } else {
                            radio.checked = false;
                        }
                    });
                }
                this.setFreemiumPricesToZero();
            }
            
            // Always toggle sections after setup
                this.togglePricingSections();
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
                    trialRequiresPayment: this.formData.pricing_type === 'freemium' ? false : this.formData.trial_requires_payment,
                    // Pass product ID or slug to enable database update
                    productId: basicInfo.id || null,
                    slug: basicInfo.slug || null
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
                        entity_type: 'product',
                        // Pass product ID or slug to enable database update
                        productId: basicInfo.id || null,
                        slug: basicInfo.slug || null
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
            let statusHTML = '';
            if (data.productId) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Product ID:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${data.productId}</span>`;
                statusHTML += '</div>';
            }
            
            // Display prices for all currencies
            const prices = [];
            if (data.price_amount_chf) prices.push(`CHF ${data.price_amount_chf}`);
            if (data.price_amount_usd) prices.push(`USD ${data.price_amount_usd}`);
            if (data.price_amount_eur) prices.push(`EUR ${data.price_amount_eur}`);
            if (data.price_amount_gbp) prices.push(`GBP ${data.price_amount_gbp}`);
            
            // Fallback to price_amount/price_currency if currency-specific amounts not available
            if (prices.length === 0 && data.price_amount) {
                prices.push(`${data.price_amount} ${data.price_currency || 'USD'}`);
            }
            
            if (prices.length > 0) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Prices:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${prices.join(' | ')}</span>`;
                statusHTML += '</div>';
            }
            
            if (data.monthlyPriceId) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Monthly Price ID:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${data.monthlyPriceId}</span>`;
                statusHTML += '</div>';
            }
            if (data.yearlyPriceId) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Yearly Price ID:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${data.yearlyPriceId}</span>`;
                statusHTML += '</div>';
            }
            if (data.priceId && !data.monthlyPriceId && !data.yearlyPriceId) {
                statusHTML += '<div class="step-stripe-creation__status-item">';
                statusHTML += '<span class="step-stripe-creation__status-label">Price ID:</span>';
                statusHTML += `<span class="step-stripe-creation__status-value">${data.priceId}</span>`;
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
        
        async handleUpdateStripeProduct() {
            const basicInfo = window.productWizard?.formData || {};
            const productId = basicInfo.stripe_product_id;
            
            if (!productId) {
                alert('No Stripe product ID found. Please create a Stripe product first.');
                return;
            }
            
            try {
                // Read current form field values first (in case user just changed pricing type)
                this.readFormFieldValues();
                
                // Build pricing object - same logic as createStripeProduct
                let pricing = {};
                if (this.formData.pricing_type === 'freemium') {
                    pricing = {
                        CHF: 0,
                        USD: 0,
                        EUR: 0,
                        GBP: 0
                    };
                } else if (this.formData.pricing_type === 'subscription') {
                    const subscriptionPricing = {};
                    Object.entries(this.formData.subscription_pricing || {}).forEach(([currency, amount]) => {
                        if (amount > 0) {
                            subscriptionPricing[currency.toUpperCase()] = {
                                monthly: amount,
                                yearly: amount * 12 * 0.9
                            };
                        }
                    });
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
                    if (Object.keys(pricing).length === 0 && this.formData.one_time_price > 0) {
                        pricing = { CHF: this.formData.one_time_price };
                    }
                }
                
                // Validate pricing exists (skip validation for freemium - prices are 0)
                if (this.formData.pricing_type !== 'freemium' && (!pricing || typeof pricing !== 'object' || Object.keys(pricing).length === 0)) {
                    alert('Product must have pricing configured before updating Stripe product.');
                    return;
                }
                
                // For freemium, ensure pricing is set to all zeros
                if (this.formData.pricing_type === 'freemium') {
                    pricing = {
                        CHF: 0,
                        USD: 0,
                        EUR: 0,
                        GBP: 0
                    };
                }
                
                // Disable button and show loading
                this.elements.updateStripeBtn.disabled = true;
                const btnText = this.elements.updateStripeBtn.querySelector('span:last-child');
                if (btnText) {
                    btnText.textContent = 'Updating...';
                }
                
                // Get current session and refresh to ensure we have a valid token
                let session;
                try {
                    const { data: { session: currentSession }, error: sessionError } = await window.supabase.auth.getSession();
                    
                    if (currentSession) {
                        const { data: { session: refreshedSession }, error: refreshError } = await window.supabase.auth.refreshSession();
                        if (!refreshError && refreshedSession) {
                            session = refreshedSession;
                        } else {
                            session = currentSession;
                        }
                    } else if (sessionError) {
                        throw new Error('Not authenticated. Please log in again.');
                    } else {
                        throw new Error('No active session. Please log in again.');
                    }
                } catch (authError) {
                    window.logger?.error('❌ Authentication error:', authError);
                    throw new Error('Authentication failed. Please log in again.');
                }
                
                if (!session || !session.access_token) {
                    throw new Error('Invalid session. Please log in again.');
                }
                
                // Prepare update data
                const updateData = {
                    productId: productId,
                    name: basicInfo.name,
                    description: basicInfo.short_description,
                    short_description: basicInfo.description,
                    pricing: pricing,
                    pricing_type: this.formData.pricing_type,
                    trial_days: this.formData.pricing_type === 'freemium' ? 0 : (this.formData.trial_days || 0),
                    trial_requires_payment: this.formData.pricing_type === 'freemium' ? false : (this.formData.trial_requires_payment || false),
                    // Pass existing price IDs to return when only sales changed
                    existing_price_id: basicInfo.stripe_price_id || null,
                    existing_monthly_price_id: basicInfo.stripe_price_monthly_id || null,
                    existing_yearly_price_id: basicInfo.stripe_price_yearly_id || null,
                    // Pass old price IDs to deactivate
                    old_price_id: basicInfo.stripe_price_id || null,
                    old_monthly_price_id: basicInfo.stripe_price_monthly_id || null,
                    old_yearly_price_id: basicInfo.stripe_price_yearly_id || null
                };
                
                // Call edge function to update Stripe product
                const { data, error } = await window.supabase.functions.invoke('update-stripe-product', {
                    body: updateData,
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                
                if (error) throw error;
                
                // Update form data with new Stripe IDs
                if (window.productWizard && window.productWizard.formData) {
                    // Primary price IDs (backward compatibility)
                    if (data.priceId) {
                        window.productWizard.formData.stripe_price_id = data.priceId;
                    }
                    if (data.monthlyPriceId) {
                        window.productWizard.formData.stripe_price_monthly_id = data.monthlyPriceId;
                    }
                    if (data.yearlyPriceId) {
                        window.productWizard.formData.stripe_price_yearly_id = data.yearlyPriceId;
                    }
                    
                    // Currency-specific one-time price IDs
                    if (data.oneTimePrices) {
                        if (data.oneTimePrices.CHF) window.productWizard.formData.stripe_price_chf_id = data.oneTimePrices.CHF;
                        if (data.oneTimePrices.USD) window.productWizard.formData.stripe_price_usd_id = data.oneTimePrices.USD;
                        if (data.oneTimePrices.EUR) window.productWizard.formData.stripe_price_eur_id = data.oneTimePrices.EUR;
                        if (data.oneTimePrices.GBP) window.productWizard.formData.stripe_price_gbp_id = data.oneTimePrices.GBP;
                    }
                    
                    // Currency-specific monthly price IDs (for subscriptions)
                    if (data.monthlyPrices) {
                        // For subscriptions, monthly prices go into the currency-specific fields
                        if (data.monthlyPrices.CHF) window.productWizard.formData.stripe_price_chf_id = data.monthlyPrices.CHF;
                        if (data.monthlyPrices.USD) window.productWizard.formData.stripe_price_usd_id = data.monthlyPrices.USD;
                        if (data.monthlyPrices.EUR) window.productWizard.formData.stripe_price_eur_id = data.monthlyPrices.EUR;
                        if (data.monthlyPrices.GBP) window.productWizard.formData.stripe_price_gbp_id = data.monthlyPrices.GBP;
                    }
                    
                    // Also save pricing configuration
                    window.productWizard.formData.pricing_type = this.formData.pricing_type;
                    window.productWizard.formData.subscription_pricing = this.formData.subscription_pricing;
                    window.productWizard.formData.one_time_pricing = this.formData.one_time_pricing;
                    window.productWizard.formData.subscription_price = this.formData.subscription_price;
                    window.productWizard.formData.one_time_price = this.formData.one_time_price;
                    window.productWizard.formData.trial_days = this.formData.trial_days;
                    window.productWizard.formData.trial_requires_payment = this.formData.trial_requires_payment;
                    
                    // Save price_amount and price_currency from Edge Function response (if provided)
                    if (data.price_amount !== undefined) {
                        window.productWizard.formData.price_amount = data.price_amount;
                    }
                    if (data.price_currency) {
                        window.productWizard.formData.price_currency = data.price_currency;
                    }
                    
                    // Save currency-specific price amounts (if provided)
                    if (data.price_amount_chf !== undefined) {
                        window.productWizard.formData.price_amount_chf = data.price_amount_chf;
                    }
                    if (data.price_amount_usd !== undefined) {
                        window.productWizard.formData.price_amount_usd = data.price_amount_usd;
                    }
                    if (data.price_amount_eur !== undefined) {
                        window.productWizard.formData.price_amount_eur = data.price_amount_eur;
                    }
                    if (data.price_amount_gbp !== undefined) {
                        window.productWizard.formData.price_amount_gbp = data.price_amount_gbp;
                    }
                }
                
                // Update database to reflect the changes
                window.logger?.log('💾 Saving updated Stripe status to database...');
                const saveResult = await window.productWizard.saveDraftToDatabase();
                if (!saveResult.success) {
                    window.logger?.warn('⚠️ Stripe product updated but failed to save to database:', saveResult.error);
                } else {
                    window.logger?.log('✅ Database updated after Stripe update');
                }
                
                // Update UI status
                this.updateStripeStatus({
                    productId: productId,
                    priceId: data.priceId || basicInfo.stripe_price_id,
                    monthlyPriceId: data.monthlyPriceId || basicInfo.stripe_price_monthly_id,
                    yearlyPriceId: data.yearlyPriceId || basicInfo.stripe_price_yearly_id
                });
                
                // Reset button state
                this.elements.updateStripeBtn.disabled = false;
                if (btnText) {
                    btnText.textContent = 'Update Stripe Product';
                }
                
                alert('Stripe product updated successfully. ' + (data.message || ''));
                
            } catch (error) {
                window.logger?.error('❌ Error updating Stripe product:', error);
                alert('Failed to update Stripe product: ' + (error.message || error));
                this.elements.updateStripeBtn.disabled = false;
                const btnText = this.elements.updateStripeBtn.querySelector('span:last-child');
                if (btnText) {
                    btnText.textContent = 'Update Stripe Product';
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
                this.updateStripeStatus({ 
                    productId: data.stripe_product_id, 
                    priceId: data.stripe_price_id,
                    monthlyPriceId: data.stripe_price_monthly_id,
                    yearlyPriceId: data.stripe_price_yearly_id,
                    price_amount: data.price_amount,
                    price_currency: data.price_currency,
                    price_amount_chf: data.price_amount_chf,
                    price_amount_usd: data.price_amount_usd,
                    price_amount_eur: data.price_amount_eur,
                    price_amount_gbp: data.price_amount_gbp
                });
            }
        }

        saveToFormData(data) {
            if (!window.productWizard || !window.productWizard.formData) return;
            if (data.productId) window.productWizard.formData.stripe_product_id = data.productId;
            if (data.priceId) window.productWizard.formData.stripe_price_id = data.priceId;
            
            // Save multi-currency price IDs if returned (from create-stripe-product)
            if (data.prices) {
                window.productWizard.formData.stripe_prices = data.prices;
                
                // Extract currency-specific price IDs for one-time pricing
                if (this.formData.pricing_type === 'one_time') {
                    if (data.prices.CHF) window.productWizard.formData.stripe_price_chf_id = data.prices.CHF;
                    if (data.prices.USD) window.productWizard.formData.stripe_price_usd_id = data.prices.USD;
                    if (data.prices.EUR) window.productWizard.formData.stripe_price_eur_id = data.prices.EUR;
                    if (data.prices.GBP) window.productWizard.formData.stripe_price_gbp_id = data.prices.GBP;
                }
            }
            
            // Handle subscription prices (monthlyPrices, yearlyPrices from update response)
            if (data.monthlyPrices) {
                // For subscriptions, monthly prices go into the currency-specific fields
                if (data.monthlyPrices.CHF) window.productWizard.formData.stripe_price_chf_id = data.monthlyPrices.CHF;
                if (data.monthlyPrices.USD) window.productWizard.formData.stripe_price_usd_id = data.monthlyPrices.USD;
                if (data.monthlyPrices.EUR) window.productWizard.formData.stripe_price_eur_id = data.monthlyPrices.EUR;
                if (data.monthlyPrices.GBP) window.productWizard.formData.stripe_price_gbp_id = data.monthlyPrices.GBP;
            }
            
            // Handle one-time prices from update response
            if (data.oneTimePrices) {
                if (data.oneTimePrices.CHF) window.productWizard.formData.stripe_price_chf_id = data.oneTimePrices.CHF;
                if (data.oneTimePrices.USD) window.productWizard.formData.stripe_price_usd_id = data.oneTimePrices.USD;
                if (data.oneTimePrices.EUR) window.productWizard.formData.stripe_price_eur_id = data.oneTimePrices.EUR;
                if (data.oneTimePrices.GBP) window.productWizard.formData.stripe_price_gbp_id = data.oneTimePrices.GBP;
            }
            
            // Save all pricing configuration
            window.productWizard.formData.pricing_type = this.formData.pricing_type;
            window.productWizard.formData.subscription_price = this.formData.subscription_price;
            window.productWizard.formData.subscription_pricing = this.formData.subscription_pricing;
            window.productWizard.formData.one_time_price = this.formData.one_time_price;
            window.productWizard.formData.one_time_pricing = this.formData.one_time_pricing;
            window.productWizard.formData.trial_days = this.formData.trial_days;
            window.productWizard.formData.trial_requires_payment = this.formData.trial_requires_payment;
            
            // Save price_amount and price_currency from Edge Function response (if provided)
            if (data.price_amount !== undefined) {
                window.productWizard.formData.price_amount = data.price_amount;
            }
            if (data.price_currency) {
                window.productWizard.formData.price_currency = data.price_currency;
            }
            
            // CRITICAL: Save currency-specific price amounts from Edge Function response
            // These are saved by the Edge Function to the database, so we MUST save them to formData
            // to prevent saveDraftToDatabase from overwriting them with null
            if (data.price_amount_chf !== undefined && data.price_amount_chf !== null) {
                window.productWizard.formData.price_amount_chf = data.price_amount_chf;
                window.logger?.log('✅ Saved price_amount_chf to formData:', data.price_amount_chf);
            }
            if (data.price_amount_usd !== undefined && data.price_amount_usd !== null) {
                window.productWizard.formData.price_amount_usd = data.price_amount_usd;
                window.logger?.log('✅ Saved price_amount_usd to formData:', data.price_amount_usd);
            }
            if (data.price_amount_eur !== undefined && data.price_amount_eur !== null) {
                window.productWizard.formData.price_amount_eur = data.price_amount_eur;
                window.logger?.log('✅ Saved price_amount_eur to formData:', data.price_amount_eur);
            }
            if (data.price_amount_gbp !== undefined && data.price_amount_gbp !== null) {
                window.productWizard.formData.price_amount_gbp = data.price_amount_gbp;
                window.logger?.log('✅ Saved price_amount_gbp to formData:', data.price_amount_gbp);
            }
            
            window.logger?.log('✅ Saved Stripe data to formData', {
                price_amount: window.productWizard.formData.price_amount,
                price_currency: window.productWizard.formData.price_currency,
                price_amount_chf: window.productWizard.formData.price_amount_chf,
                price_amount_usd: window.productWizard.formData.price_amount_usd,
                price_amount_eur: window.productWizard.formData.price_amount_eur,
                price_amount_gbp: window.productWizard.formData.price_amount_gbp
            });
        }
        
        readFormFieldValues() {
            // Read current values from form fields and update formData
            // This ensures we have the latest values when user clicks update
            
            // Read pricing type from radio buttons
            if (this.elements.pricingTypeRadios) {
                const checkedRadio = Array.from(this.elements.pricingTypeRadios).find(radio => radio.checked);
                if (checkedRadio) {
                    this.formData.pricing_type = checkedRadio.value;
                }
            }
            
            // Read subscription prices from form fields
            if (this.elements.subscriptionPriceChf) {
                this.formData.subscription_pricing.CHF = parseFloat(this.elements.subscriptionPriceChf.value) || 0;
                this.formData.subscription_price = this.formData.subscription_pricing.CHF; // Keep for backward compatibility
            }
            if (this.elements.subscriptionPriceUsd) {
                this.formData.subscription_pricing.USD = parseFloat(this.elements.subscriptionPriceUsd.value) || 0;
            }
            if (this.elements.subscriptionPriceEur) {
                this.formData.subscription_pricing.EUR = parseFloat(this.elements.subscriptionPriceEur.value) || 0;
            }
            if (this.elements.subscriptionPriceGbp) {
                this.formData.subscription_pricing.GBP = parseFloat(this.elements.subscriptionPriceGbp.value) || 0;
            }
            
            // Read one-time prices from form fields
            if (this.elements.oneTimePriceChf) {
                this.formData.one_time_pricing.CHF = parseFloat(this.elements.oneTimePriceChf.value) || 0;
                this.formData.one_time_price = this.formData.one_time_pricing.CHF; // Keep for backward compatibility
            }
            if (this.elements.oneTimePriceUsd) {
                this.formData.one_time_pricing.USD = parseFloat(this.elements.oneTimePriceUsd.value) || 0;
            }
            if (this.elements.oneTimePriceEur) {
                this.formData.one_time_pricing.EUR = parseFloat(this.elements.oneTimePriceEur.value) || 0;
            }
            if (this.elements.oneTimePriceGbp) {
                this.formData.one_time_pricing.GBP = parseFloat(this.elements.oneTimePriceGbp.value) || 0;
            }
            
            // Read trial settings
            if (this.elements.trialDaysInput) {
                this.formData.trial_days = parseInt(this.elements.trialDaysInput.value) || 0;
            }
            if (this.elements.trialRequiresPaymentCheckbox) {
                this.formData.trial_requires_payment = this.elements.trialRequiresPaymentCheckbox.checked;
            }
            
            window.logger?.log('📖 Read form field values:', this.formData);
        }
        
        populateFormFields() {
            // Use window.productWizard.formData as source of truth (it has the saved values)
            // Fall back to this.formData if wizard data not available
            const sourceData = (window.productWizard?.formData && Object.keys(window.productWizard.formData).length > 0) 
                ? window.productWizard.formData 
                : this.formData;
            
            window.logger?.log('📝 Populating form fields with saved values:', sourceData);
            
            // DON'T read form field values here - they might be empty if HTML was just replaced
            // This was causing database prices to be reset to empty values
            // We'll populate from saved database values instead
            
            // Set pricing type radio buttons (only if not already set by user)
            if (sourceData.pricing_type && this.elements.pricingTypeRadios) {
                const hasChecked = Array.from(this.elements.pricingTypeRadios).some(radio => radio.checked);
                if (!hasChecked) {
                    this.elements.pricingTypeRadios.forEach(radio => {
                        radio.checked = (radio.value === sourceData.pricing_type);
                    });
                    this.formData.pricing_type = sourceData.pricing_type;
                }
            }
            
            // Populate subscription price (multi-currency) - always use saved data from database
            const subscriptionPricing = sourceData.subscription_pricing || {};
            if (this.elements.subscriptionPriceChf) {
                const savedValue = subscriptionPricing.CHF || sourceData.subscription_price || '';
                // Always populate from saved data (database is source of truth)
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceChf.value = savedValue;
                    // Update formData with saved value
                    this.formData.subscription_pricing.CHF = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceUsd) {
                const savedValue = subscriptionPricing.USD || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceUsd.value = savedValue;
                    this.formData.subscription_pricing.USD = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceEur) {
                const savedValue = subscriptionPricing.EUR || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceEur.value = savedValue;
                    this.formData.subscription_pricing.EUR = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceGbp) {
                const savedValue = subscriptionPricing.GBP || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceGbp.value = savedValue;
                    this.formData.subscription_pricing.GBP = parseFloat(savedValue) || 0;
                }
            }
            
            // Populate one-time price (multi-currency) - always use saved data from database
            const oneTimePricing = sourceData.one_time_pricing || {};
            if (this.elements.oneTimePriceChf) {
                const savedValue = oneTimePricing.CHF || sourceData.one_time_price || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceChf.value = savedValue;
                    this.formData.one_time_pricing.CHF = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceUsd) {
                const savedValue = oneTimePricing.USD || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceUsd.value = savedValue;
                    this.formData.one_time_pricing.USD = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceEur) {
                const savedValue = oneTimePricing.EUR || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceEur.value = savedValue;
                    this.formData.one_time_pricing.EUR = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceGbp) {
                const savedValue = oneTimePricing.GBP || '';
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceGbp.value = savedValue;
                    this.formData.one_time_pricing.GBP = parseFloat(savedValue) || 0;
                }
            }
            
            // Populate trial days - always use saved data
            if (this.elements.trialDaysInput) {
                const savedValue = sourceData.trial_days !== undefined ? sourceData.trial_days : 0;
                this.elements.trialDaysInput.value = savedValue;
                this.formData.trial_days = savedValue;
            }
            
            // Populate trial requires payment checkbox
            if (this.elements.trialRequiresPaymentCheckbox) {
                const savedValue = sourceData.trial_requires_payment || false;
                this.elements.trialRequiresPaymentCheckbox.checked = savedValue;
                this.formData.trial_requires_payment = savedValue;
            }
            
            // Sync this.formData with sourceData, prioritizing saved database values
            // Only merge non-pricing fields from sourceData to avoid overwriting the pricing we just set
            this.formData = { 
                ...this.formData, 
                ...sourceData,
                // Ensure pricing objects are preserved (they were set above from saved data)
                subscription_pricing: this.formData.subscription_pricing,
                one_time_pricing: this.formData.one_time_pricing
            };
            
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


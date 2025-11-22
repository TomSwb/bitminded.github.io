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
            
            // On first load, ensure we have fresh data from database before setting defaults
            // This is especially important for price_amount_* fields that might not be in formData yet
            if (window.productWizard && window.productWizard.formData && window.productWizard.formData.product_id) {
                const productId = window.productWizard.formData.product_id;
                // Check if we have price_amount_* fields, if not, fetch from database
                const hasPriceAmountFields = window.productWizard.formData.price_amount_chf !== null && window.productWizard.formData.price_amount_chf !== undefined ||
                                            window.productWizard.formData.price_amount_usd !== null && window.productWizard.formData.price_amount_usd !== undefined ||
                                            window.productWizard.formData.price_amount_eur !== null && window.productWizard.formData.price_amount_eur !== undefined ||
                                            window.productWizard.formData.price_amount_gbp !== null && window.productWizard.formData.price_amount_gbp !== undefined;
                
                if (!hasPriceAmountFields) {
                    // Fetch fresh data from database to ensure we have price_amount_* fields
                    try {
                        const { data, error } = await window.supabase
                            .from('products')
                            .select('pricing_type, price_amount_chf, price_amount_usd, price_amount_eur, price_amount_gbp, trial_days, trial_requires_payment')
                            .eq('id', productId)
                            .single();
                        
                        if (!error && data) {
                            // Update formData with fresh database values
                            if (data.price_amount_chf !== undefined) window.productWizard.formData.price_amount_chf = data.price_amount_chf;
                            if (data.price_amount_usd !== undefined) window.productWizard.formData.price_amount_usd = data.price_amount_usd;
                            if (data.price_amount_eur !== undefined) window.productWizard.formData.price_amount_eur = data.price_amount_eur;
                            if (data.price_amount_gbp !== undefined) window.productWizard.formData.price_amount_gbp = data.price_amount_gbp;
                            if (data.pricing_type !== undefined) window.productWizard.formData.pricing_type = data.pricing_type;
                            if (data.trial_days !== undefined) window.productWizard.formData.trial_days = data.trial_days;
                            if (data.trial_requires_payment !== undefined) window.productWizard.formData.trial_requires_payment = data.trial_requires_payment;
                            window.logger?.log('✅ Fetched fresh pricing data from database on init:', data);
                        }
                    } catch (error) {
                        window.logger?.warn('⚠️ Error fetching pricing data on init:', error);
                    }
                }
            }
            
            this.setupDefaults();
            
            // Ensure pricing_type is set from radio buttons if not already set
            // But only if a radio is actually checked (don't force a default)
            if (this.elements.pricingTypeRadios) {
                const checkedRadio = Array.from(this.elements.pricingTypeRadios).find(radio => radio.checked);
                if (checkedRadio) {
                    this.formData.pricing_type = checkedRadio.value;
                }
            }
            
            // Ensure freemium defaults are set on init if freemium is selected
            if (this.formData.pricing_type === 'freemium') {
                this.setFreemiumPricesToZero();
            }
            
            // Only toggle sections if we have a pricing_type (don't show any section if unselected)
            if (this.formData.pricing_type) {
                this.togglePricingSections();
            } else {
                // Hide all pricing sections if no type is selected
                if (this.elements.freemiumSection) this.elements.freemiumSection.style.display = 'none';
                if (this.elements.subscriptionSection) this.elements.subscriptionSection.style.display = 'none';
                if (this.elements.oneTimeSection) this.elements.oneTimeSection.style.display = 'none';
                if (this.elements.trialSection) this.elements.trialSection.style.display = 'none';
            }
            
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
                saveWithoutStripeBtn: document.getElementById('save-step-5-without-stripe-btn'),
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
                    radio.addEventListener('change', async () => {
                        this.formData.pricing_type = radio.value;
                        
                        // When switching pricing types, check if we need to convert price_amount_* fields
                        // This handles the case where data was saved but not yet converted to pricing objects
                        if (window.productWizard && window.productWizard.formData) {
                            const basicInfo = window.productWizard.formData;
                            const hasPriceAmountFields = basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined ||
                                                        basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined ||
                                                        basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined ||
                                                        basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined;
                            
                            // If we have price_amount_* fields but not the corresponding pricing object, convert them
                            if (hasPriceAmountFields) {
                                if (this.formData.pricing_type === 'subscription') {
                                    const hasSubscriptionPricing = this.formData.subscription_pricing && 
                                        Object.values(this.formData.subscription_pricing).some(price => price > 0);
                                    if (!hasSubscriptionPricing) {
                                        // Convert price_amount_* to subscription_pricing
                                        this.formData.subscription_pricing = this.formData.subscription_pricing || {};
                                        if (basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined) {
                                            this.formData.subscription_pricing.CHF = parseFloat(basicInfo.price_amount_chf) || 0;
                                        }
                                        if (basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined) {
                                            this.formData.subscription_pricing.USD = parseFloat(basicInfo.price_amount_usd) || 0;
                                        }
                                        if (basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined) {
                                            this.formData.subscription_pricing.EUR = parseFloat(basicInfo.price_amount_eur) || 0;
                                        }
                                        if (basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined) {
                                            this.formData.subscription_pricing.GBP = parseFloat(basicInfo.price_amount_gbp) || 0;
                                        }
                                        // Populate form fields with the converted values
                                        this.populateFormFields();
                                    }
                                } else if (this.formData.pricing_type === 'one_time') {
                                    const hasOneTimePricing = this.formData.one_time_pricing && 
                                        Object.values(this.formData.one_time_pricing).some(price => price > 0);
                                    if (!hasOneTimePricing) {
                                        // Convert price_amount_* to one_time_pricing
                                        this.formData.one_time_pricing = this.formData.one_time_pricing || {};
                                        if (basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined) {
                                            this.formData.one_time_pricing.CHF = parseFloat(basicInfo.price_amount_chf) || 0;
                                        }
                                        if (basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined) {
                                            this.formData.one_time_pricing.USD = parseFloat(basicInfo.price_amount_usd) || 0;
                                        }
                                        if (basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined) {
                                            this.formData.one_time_pricing.EUR = parseFloat(basicInfo.price_amount_eur) || 0;
                                        }
                                        if (basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined) {
                                            this.formData.one_time_pricing.GBP = parseFloat(basicInfo.price_amount_gbp) || 0;
                                        }
                                        // Populate form fields with the converted values
                                        this.populateFormFields();
                                    }
                                }
                            }
                        }
                        
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

            // TEMPORARY: Save data without creating Stripe product (for dev/testing)
            if (this.elements.saveWithoutStripeBtn) {
                this.elements.saveWithoutStripeBtn.addEventListener('click', async () => {
                    await this.handleSaveWithoutStripe();
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
                
                // FIRST: Check if there's saved data in the database (price_amount_* fields)
                const hasPriceAmountFields = basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined ||
                                            basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined ||
                                            basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined ||
                                            basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined;
                
                const hasSavedPricingData = hasPriceAmountFields || 
                    (basicInfo.subscription_pricing && typeof basicInfo.subscription_pricing === 'object' && Object.keys(basicInfo.subscription_pricing).length > 0 && Object.values(basicInfo.subscription_pricing).some(price => price > 0)) ||
                    (basicInfo.one_time_pricing && typeof basicInfo.one_time_pricing === 'object' && Object.keys(basicInfo.one_time_pricing).length > 0 && Object.values(basicInfo.one_time_pricing).some(price => price > 0)) ||
                    (basicInfo.subscription_price && basicInfo.subscription_price > 0) ||
                    (basicInfo.one_time_price && basicInfo.one_time_price > 0);
                
                // Load pricing configuration - ONLY use what's in the database, NO defaults
                // If pricing_type exists in DB, use it
                if (basicInfo.pricing_type && ['freemium', 'one_time', 'subscription'].includes(basicInfo.pricing_type)) {
                    // Use saved pricing_type from database
                    this.formData.pricing_type = basicInfo.pricing_type;
                    if (this.elements.pricingTypeRadios) {
                        this.elements.pricingTypeRadios.forEach(radio => {
                            radio.checked = (radio.value === basicInfo.pricing_type);
                        });
                    }
                    window.logger?.log('✅ Loaded pricing_type from database:', basicInfo.pricing_type);
                } else if (hasSavedPricingData) {
                    // There's saved pricing data but no pricing_type in DB - infer from data
                    // Check which pricing object has data to determine type
                    const hasSubscriptionData = (basicInfo.subscription_pricing && Object.values(basicInfo.subscription_pricing).some(price => price > 0)) || 
                                               (basicInfo.subscription_price && basicInfo.subscription_price > 0);
                    const hasOneTimeData = (basicInfo.one_time_pricing && Object.values(basicInfo.one_time_pricing).some(price => price > 0)) || 
                                          (basicInfo.one_time_price && basicInfo.one_time_price > 0);
                    
                    // If we have price_amount_* fields, infer type based on which pricing object would have data
                    // Since price_amount_* could be either, default to one_time if we can't determine
                    let inferredPricingType = null;
                    if (hasSubscriptionData) {
                        inferredPricingType = 'subscription';
                    } else if (hasOneTimeData) {
                        inferredPricingType = 'one_time';
                    } else if (hasPriceAmountFields) {
                        // If we only have price_amount_* fields, check if any are > 0
                        const hasNonZeroPrices = (basicInfo.price_amount_chf && basicInfo.price_amount_chf > 0) ||
                                                (basicInfo.price_amount_usd && basicInfo.price_amount_usd > 0) ||
                                                (basicInfo.price_amount_eur && basicInfo.price_amount_eur > 0) ||
                                                (basicInfo.price_amount_gbp && basicInfo.price_amount_gbp > 0);
                        if (hasNonZeroPrices) {
                            inferredPricingType = 'one_time'; // Default inference for price_amount_* fields
                        }
                    }
                    
                    if (inferredPricingType) {
                        this.formData.pricing_type = inferredPricingType;
                        if (this.elements.pricingTypeRadios) {
                            this.elements.pricingTypeRadios.forEach(radio => {
                                radio.checked = (radio.value === inferredPricingType);
                            });
                        }
                        // Also update the wizard's formData to keep it in sync
                        if (window.productWizard && window.productWizard.formData) {
                            window.productWizard.formData.pricing_type = inferredPricingType;
                        }
                        window.logger?.log('⚠️ Found saved pricing data but no pricing_type in DB, inferred:', inferredPricingType);
                    } else {
                        // No pricing type can be determined - leave unselected
                        this.formData.pricing_type = null;
                        if (this.elements.pricingTypeRadios) {
                            this.elements.pricingTypeRadios.forEach(radio => {
                                radio.checked = false;
                            });
                        }
                        window.logger?.log('⚠️ Found pricing data but could not determine pricing_type, leaving unselected');
                    }
                } else {
                    // No saved data at all - leave unselected (NO default)
                    this.formData.pricing_type = null;
                    if (this.elements.pricingTypeRadios) {
                        this.elements.pricingTypeRadios.forEach(radio => {
                            radio.checked = false;
                        });
                    }
                    window.logger?.log('⚠️ No saved pricing data found, leaving pricing_type unselected (no default)');
                }

                // Load subscription pricing (multi-currency or single)
                // Only load if basicInfo has actual pricing data (not empty/null)
                if (basicInfo.subscription_pricing && typeof basicInfo.subscription_pricing === 'object' && Object.keys(basicInfo.subscription_pricing).length > 0) {
                    // Merge subscription pricing, but only overwrite with non-zero values
                    Object.keys(basicInfo.subscription_pricing).forEach(currency => {
                        const price = basicInfo.subscription_pricing[currency];
                        if (price !== null && price !== undefined && price !== '' && price > 0) {
                            this.formData.subscription_pricing[currency] = price;
                        }
                    });
                }
                if (basicInfo.subscription_price !== undefined && basicInfo.subscription_price !== null && basicInfo.subscription_price !== '' && basicInfo.subscription_price > 0) {
                    this.formData.subscription_price = basicInfo.subscription_price;
                    // If no multi-currency pricing, use single price for CHF
                    if (!this.formData.subscription_pricing.CHF || this.formData.subscription_pricing.CHF === 0) {
                        this.formData.subscription_pricing.CHF = basicInfo.subscription_price;
                    }
                }

                // Load one-time pricing (multi-currency or single)
                // Only load if basicInfo has actual pricing data (not empty/null)
                if (basicInfo.one_time_pricing && typeof basicInfo.one_time_pricing === 'object' && Object.keys(basicInfo.one_time_pricing).length > 0) {
                    // Merge one-time pricing, but only overwrite with non-zero values
                    Object.keys(basicInfo.one_time_pricing).forEach(currency => {
                        const price = basicInfo.one_time_pricing[currency];
                        if (price !== null && price !== undefined && price !== '' && price > 0) {
                            this.formData.one_time_pricing[currency] = price;
                        }
                    });
                }
                if (basicInfo.one_time_price !== undefined && basicInfo.one_time_price !== null && basicInfo.one_time_price !== '' && basicInfo.one_time_price > 0) {
                    this.formData.one_time_price = basicInfo.one_time_price;
                    // If no multi-currency pricing, use single price for CHF
                    if (!this.formData.one_time_pricing.CHF || this.formData.one_time_pricing.CHF === 0) {
                        this.formData.one_time_pricing.CHF = basicInfo.one_time_price;
                    }
                }

                // ALWAYS check price_amount_* fields from database and convert them to pricing objects
                // This handles the case where data was saved using the temp button (which saves price_amount_* directly)
                // Priority: Use price_amount_* fields if they exist, even if pricing objects exist (database is source of truth)
                // Use the pricing_type we just set above (from database or inferred)
                if (hasPriceAmountFields) {
                    const pricingType = this.formData.pricing_type; // Use the pricing_type we just set above
                    
                    // Check if pricing objects have meaningful data (non-zero values)
                    const hasSubscriptionPricing = this.formData.subscription_pricing && 
                        Object.values(this.formData.subscription_pricing).some(price => price > 0);
                    const hasOneTimePricing = this.formData.one_time_pricing && 
                        Object.values(this.formData.one_time_pricing).some(price => price > 0);
                    
                    // Convert price_amount_* to pricing objects based on pricing_type
                    if (pricingType === 'subscription' && !hasSubscriptionPricing) {
                        // Build subscription_pricing from price_amount_* fields
                        this.formData.subscription_pricing = this.formData.subscription_pricing || {};
                        if (basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined) {
                            this.formData.subscription_pricing.CHF = parseFloat(basicInfo.price_amount_chf) || 0;
                        }
                        if (basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined) {
                            this.formData.subscription_pricing.USD = parseFloat(basicInfo.price_amount_usd) || 0;
                        }
                        if (basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined) {
                            this.formData.subscription_pricing.EUR = parseFloat(basicInfo.price_amount_eur) || 0;
                        }
                        if (basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined) {
                            this.formData.subscription_pricing.GBP = parseFloat(basicInfo.price_amount_gbp) || 0;
                        }
                        
                        // Set subscription_price to first non-zero value
                        if (this.formData.subscription_pricing.CHF > 0) {
                            this.formData.subscription_price = this.formData.subscription_pricing.CHF;
                        } else if (this.formData.subscription_pricing.USD > 0) {
                            this.formData.subscription_price = this.formData.subscription_pricing.USD;
                        } else if (this.formData.subscription_pricing.EUR > 0) {
                            this.formData.subscription_price = this.formData.subscription_pricing.EUR;
                        } else if (this.formData.subscription_pricing.GBP > 0) {
                            this.formData.subscription_price = this.formData.subscription_pricing.GBP;
                        }
                        window.logger?.log('✅ Converted price_amount_* to subscription_pricing in setupDefaults:', this.formData.subscription_pricing);
                    } else if (pricingType === 'one_time' && !hasOneTimePricing) {
                        // Build one_time_pricing from price_amount_* fields
                        this.formData.one_time_pricing = this.formData.one_time_pricing || {};
                        if (basicInfo.price_amount_chf !== null && basicInfo.price_amount_chf !== undefined) {
                            this.formData.one_time_pricing.CHF = parseFloat(basicInfo.price_amount_chf) || 0;
                        }
                        if (basicInfo.price_amount_usd !== null && basicInfo.price_amount_usd !== undefined) {
                            this.formData.one_time_pricing.USD = parseFloat(basicInfo.price_amount_usd) || 0;
                        }
                        if (basicInfo.price_amount_eur !== null && basicInfo.price_amount_eur !== undefined) {
                            this.formData.one_time_pricing.EUR = parseFloat(basicInfo.price_amount_eur) || 0;
                        }
                        if (basicInfo.price_amount_gbp !== null && basicInfo.price_amount_gbp !== undefined) {
                            this.formData.one_time_pricing.GBP = parseFloat(basicInfo.price_amount_gbp) || 0;
                        }
                        
                        // Set one_time_price to first non-zero value
                        if (this.formData.one_time_pricing.CHF > 0) {
                            this.formData.one_time_price = this.formData.one_time_pricing.CHF;
                        } else if (this.formData.one_time_pricing.USD > 0) {
                            this.formData.one_time_price = this.formData.one_time_pricing.USD;
                        } else if (this.formData.one_time_pricing.EUR > 0) {
                            this.formData.one_time_price = this.formData.one_time_pricing.EUR;
                        } else if (this.formData.one_time_pricing.GBP > 0) {
                            this.formData.one_time_price = this.formData.one_time_pricing.GBP;
                        }
                        window.logger?.log('✅ Converted price_amount_* to one_time_pricing in setupDefaults:', this.formData.one_time_pricing);
                    } else if (pricingType === 'freemium') {
                        // For freemium, ensure all prices are 0
                        this.setFreemiumPricesToZero();
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
                // IMPORTANT: Don't overwrite with empty/null values from basicInfo
                // Only merge non-empty values to preserve existing data
                const currentPricingType = this.formData.pricing_type; // Save the pricing_type we set above
                
                // Merge basicInfo into formData, but only for fields that have actual values
                // This prevents empty/null values from overwriting good data
                // IMPORTANT: Skip subscription_pricing, one_time_pricing, and pricing_type - we handle them separately above
                Object.keys(basicInfo).forEach(key => {
                    // Skip pricing objects and pricing_type - we handle them separately to preserve converted data
                    if (key === 'subscription_pricing' || key === 'one_time_pricing' || key === 'pricing_type') {
                        return;
                    }
                    
                    const value = basicInfo[key];
                    // Only overwrite if value is not null, undefined, or empty object/array
                    if (value !== null && value !== undefined) {
                        if (typeof value === 'object' && !Array.isArray(value)) {
                            // For objects, merge only if not empty
                            if (Object.keys(value).length > 0) {
                                this.formData[key] = { ...this.formData[key], ...value };
                            }
                        } else if (Array.isArray(value)) {
                            // For arrays, only overwrite if not empty
                            if (value.length > 0) {
                                this.formData[key] = value;
                            }
                        } else {
                            // For primitives, only overwrite if not empty string
                            if (value !== '') {
                                this.formData[key] = value;
                            }
                        }
                    }
                });
                
                // Ensure pricing_type is preserved (don't let the merge overwrite it with null/undefined)
                // The pricing_type we set above (from database or inferred) should be kept
                this.formData.pricing_type = currentPricingType;
                
                // Preserve pricing objects we just created from price_amount_* fields
                // Don't let the merge overwrite them with empty objects from basicInfo
                if (this.formData.subscription_pricing && Object.keys(this.formData.subscription_pricing).length > 0 && Object.values(this.formData.subscription_pricing).some(price => price > 0)) {
                    // Keep our converted pricing object
                } else if (basicInfo.subscription_pricing && typeof basicInfo.subscription_pricing === 'object' && Object.keys(basicInfo.subscription_pricing).length > 0) {
                    // Use basicInfo's pricing object if we don't have one
                    this.formData.subscription_pricing = { ...this.formData.subscription_pricing, ...basicInfo.subscription_pricing };
                }
                
                if (this.formData.one_time_pricing && Object.keys(this.formData.one_time_pricing).length > 0 && Object.values(this.formData.one_time_pricing).some(price => price > 0)) {
                    // Keep our converted pricing object
                } else if (basicInfo.one_time_pricing && typeof basicInfo.one_time_pricing === 'object' && Object.keys(basicInfo.one_time_pricing).length > 0) {
                    // Use basicInfo's pricing object if we don't have one
                    this.formData.one_time_pricing = { ...this.formData.one_time_pricing, ...basicInfo.one_time_pricing };
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
                        if (window.productWizard && typeof window.productWizard.saveStepToDatabase === 'function') {
                            window.logger?.log('💾 Saving Stripe IDs to database...');
                            const saveResult = await window.productWizard.saveStepToDatabase(5);
                            if (!saveResult?.success) {
                                window.logger?.warn('⚠️ Failed to persist Stripe IDs automatically:', saveResult?.error);
                            } else {
                                window.logger?.log('✅ Stripe IDs persisted to database, Step 5 marked as saved');
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

        /**
         * TEMPORARY: Save pricing data without creating Stripe products (for dev/testing)
         */
        async handleSaveWithoutStripe() {
            try {
                if (!window.productWizard) {
                    alert('ProductWizard not available');
                    return;
                }

                // Read form field values
                this.readFormFieldValues();

                // Save form data to wizard's formData
                this.saveFormData(window.productWizard.formData);

                // Disable button and show saving state
                if (this.elements.saveWithoutStripeBtn) {
                    this.elements.saveWithoutStripeBtn.disabled = true;
                    this.elements.saveWithoutStripeBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Saving...</span>';
                }

                // Save to database using the per-step save function
                const result = await window.productWizard.saveStepToDatabase(5);

                if (result.success) {
                    // Show success message
                    alert('✅ Pricing data saved successfully (without Stripe product creation)');
                    window.logger?.log('✅ Step 5 saved without Stripe product creation');
                    
                    // Update navigation buttons to re-enable Next
                    await window.productWizard.updateNavigationButtons();
                } else {
                    throw new Error(result.error || 'Failed to save step');
                }
            } catch (error) {
                window.logger?.error('❌ Error saving Step 5 without Stripe:', error);
                alert('Failed to save: ' + (error.message || 'Unknown error'));
            } finally {
                // Re-enable button
                if (this.elements.saveWithoutStripeBtn) {
                    this.elements.saveWithoutStripeBtn.disabled = false;
                    this.elements.saveWithoutStripeBtn.innerHTML = '<span class="btn-icon">💾</span><span>TEMPORARY: Save Data (No Stripe)</span>';
                }
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
                    // Pass currency-specific price IDs for proper deactivation
                    existing_chf_price_id: basicInfo.stripe_price_chf_id || null,
                    existing_usd_price_id: basicInfo.stripe_price_usd_id || null,
                    existing_eur_price_id: basicInfo.stripe_price_eur_id || null,
                    existing_gbp_price_id: basicInfo.stripe_price_gbp_id || null,
                    // Pass old price IDs to deactivate (including currency-specific)
                    old_price_id: basicInfo.stripe_price_id || null,
                    old_monthly_price_id: basicInfo.stripe_price_monthly_id || null,
                    old_yearly_price_id: basicInfo.stripe_price_yearly_id || null,
                    old_chf_price_id: basicInfo.stripe_price_chf_id || null,
                    old_usd_price_id: basicInfo.stripe_price_usd_id || null,
                    old_eur_price_id: basicInfo.stripe_price_eur_id || null,
                    old_gbp_price_id: basicInfo.stripe_price_gbp_id || null
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
                const saveResult = await window.productWizard.saveStepToDatabase(5);
                if (!saveResult.success) {
                    window.logger?.warn('⚠️ Stripe product updated but failed to save to database:', saveResult.error);
                } else {
                    window.logger?.log('✅ Database updated after Stripe update, Step 5 marked as saved');
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
                const saveResult = await window.productWizard.saveStepToDatabase(5);
                if (!saveResult.success) {
                    window.logger?.error('❌ Failed to update database after Stripe deletion:', saveResult.error);
                    alert('Stripe product archived, but failed to update database. Please refresh the page.');
                } else {
                    window.logger?.log('✅ Database updated after Stripe deletion');
                }

                // Mark step as incomplete (Stripe is Step 5) - deletion means step is no longer saved
                if (window.productWizard) {
                    window.productWizard.markStepIncomplete(5);
                    window.productWizard.savedSteps.delete(5);
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
            
            // Safety check: Ensure form fields exist (HTML might have been replaced but not populated yet)
            if (!this.elements || !this.elements.pricingTypeRadios) {
                window.logger?.warn('⚠️ readFormFieldValues: Form elements not yet available, skipping read');
                return;
            }
            
            // Read pricing type from radio buttons
            if (this.elements.pricingTypeRadios && this.elements.pricingTypeRadios.length > 0) {
                const checkedRadio = Array.from(this.elements.pricingTypeRadios).find(radio => radio.checked);
                if (checkedRadio) {
                    this.formData.pricing_type = checkedRadio.value;
                }
            }
            
            // Read subscription prices from form fields (only if elements exist and are in DOM)
            if (this.elements.subscriptionPriceChf && document.contains(this.elements.subscriptionPriceChf)) {
                const value = this.elements.subscriptionPriceChf.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                // Only set if we got a valid number, otherwise don't set (preserve existing or leave undefined)
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.subscription_pricing.CHF = numValue;
                    this.formData.subscription_price = numValue; // Keep for backward compatibility
                } else if (value === '' || value.trim() === '') {
                    // Explicitly set to undefined (not empty string) if field is empty
                    delete this.formData.subscription_pricing.CHF;
                }
            }
            if (this.elements.subscriptionPriceUsd && document.contains(this.elements.subscriptionPriceUsd)) {
                const value = this.elements.subscriptionPriceUsd.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.subscription_pricing.USD = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.subscription_pricing.USD;
                }
            }
            if (this.elements.subscriptionPriceEur && document.contains(this.elements.subscriptionPriceEur)) {
                const value = this.elements.subscriptionPriceEur.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.subscription_pricing.EUR = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.subscription_pricing.EUR;
                }
            }
            if (this.elements.subscriptionPriceGbp && document.contains(this.elements.subscriptionPriceGbp)) {
                const value = this.elements.subscriptionPriceGbp.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.subscription_pricing.GBP = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.subscription_pricing.GBP;
                }
            }
            
            // Read one-time prices from form fields (only if elements exist and are in DOM)
            if (this.elements.oneTimePriceChf && document.contains(this.elements.oneTimePriceChf)) {
                const value = this.elements.oneTimePriceChf.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.one_time_pricing.CHF = numValue;
                    this.formData.one_time_price = numValue; // Keep for backward compatibility
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.one_time_pricing.CHF;
                }
            }
            if (this.elements.oneTimePriceUsd && document.contains(this.elements.oneTimePriceUsd)) {
                const value = this.elements.oneTimePriceUsd.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.one_time_pricing.USD = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.one_time_pricing.USD;
                }
            }
            if (this.elements.oneTimePriceEur && document.contains(this.elements.oneTimePriceEur)) {
                const value = this.elements.oneTimePriceEur.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.one_time_pricing.EUR = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.one_time_pricing.EUR;
                }
            }
            if (this.elements.oneTimePriceGbp && document.contains(this.elements.oneTimePriceGbp)) {
                const value = this.elements.oneTimePriceGbp.value;
                const numValue = (value !== null && value !== undefined && value !== '' && value.trim() !== '') 
                    ? parseFloat(value) 
                    : null;
                if (numValue !== null && !isNaN(numValue)) {
                    this.formData.one_time_pricing.GBP = numValue;
                } else if (value === '' || value.trim() === '') {
                    delete this.formData.one_time_pricing.GBP;
                }
            }
            
            // Read trial settings (only if elements exist and are in DOM)
            if (this.elements.trialDaysInput && document.contains(this.elements.trialDaysInput)) {
                const value = this.elements.trialDaysInput.value;
                this.formData.trial_days = (value !== null && value !== undefined && value !== '') 
                    ? parseInt(value) || 0 
                    : this.formData.trial_days || 0;
            }
            if (this.elements.trialRequiresPaymentCheckbox && document.contains(this.elements.trialRequiresPaymentCheckbox)) {
                this.formData.trial_requires_payment = this.elements.trialRequiresPaymentCheckbox.checked;
            }
            
            window.logger?.log('📖 Read form field values:', {
                pricing_type: this.formData.pricing_type,
                subscription_pricing: this.formData.subscription_pricing,
                one_time_pricing: this.formData.one_time_pricing,
                trial_days: this.formData.trial_days
            });
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
            
            // Check if we need to convert price_amount_* fields to pricing objects
            // This handles the case where data was saved directly to price_amount_* fields
            const hasPriceAmountFields = sourceData.price_amount_chf !== null && sourceData.price_amount_chf !== undefined ||
                                        sourceData.price_amount_usd !== null && sourceData.price_amount_usd !== undefined ||
                                        sourceData.price_amount_eur !== null && sourceData.price_amount_eur !== undefined ||
                                        sourceData.price_amount_gbp !== null && sourceData.price_amount_gbp !== undefined;
            
            // Populate subscription price (multi-currency) - check pricing object first, then price_amount_* fields
            const subscriptionPricing = sourceData.subscription_pricing || {};
            const hasSubscriptionPricing = Object.keys(subscriptionPricing).length > 0 && 
                Object.values(subscriptionPricing).some(price => price > 0);
            
            if (this.elements.subscriptionPriceChf) {
                let savedValue = subscriptionPricing.CHF || sourceData.subscription_price;
                // Fallback to price_amount_chf if pricing object doesn't have CHF
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'subscription' && sourceData.price_amount_chf !== null && sourceData.price_amount_chf !== undefined) {
                    savedValue = sourceData.price_amount_chf;
                    // Update pricing object
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.CHF = parseFloat(savedValue) || 0;
                }
                // Always populate from saved data (database is source of truth)
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceChf.value = savedValue;
                    // Update formData with saved value
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.CHF = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceUsd) {
                let savedValue = subscriptionPricing.USD;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'subscription' && sourceData.price_amount_usd !== null && sourceData.price_amount_usd !== undefined) {
                    savedValue = sourceData.price_amount_usd;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.USD = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceUsd.value = savedValue;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.USD = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceEur) {
                let savedValue = subscriptionPricing.EUR;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'subscription' && sourceData.price_amount_eur !== null && sourceData.price_amount_eur !== undefined) {
                    savedValue = sourceData.price_amount_eur;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.EUR = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceEur.value = savedValue;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.EUR = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.subscriptionPriceGbp) {
                let savedValue = subscriptionPricing.GBP;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'subscription' && sourceData.price_amount_gbp !== null && sourceData.price_amount_gbp !== undefined) {
                    savedValue = sourceData.price_amount_gbp;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.GBP = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.subscriptionPriceGbp.value = savedValue;
                    if (!this.formData.subscription_pricing) this.formData.subscription_pricing = {};
                    this.formData.subscription_pricing.GBP = parseFloat(savedValue) || 0;
                }
            }
            
            // Populate one-time price (multi-currency) - check pricing object first, then price_amount_* fields
            const oneTimePricing = sourceData.one_time_pricing || {};
            const hasOneTimePricing = Object.keys(oneTimePricing).length > 0 && 
                Object.values(oneTimePricing).some(price => price > 0);
            
            if (this.elements.oneTimePriceChf) {
                let savedValue = oneTimePricing.CHF || sourceData.one_time_price;
                // Fallback to price_amount_chf if pricing object doesn't have CHF
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'one_time' && sourceData.price_amount_chf !== null && sourceData.price_amount_chf !== undefined) {
                    savedValue = sourceData.price_amount_chf;
                    // Update pricing object
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.CHF = parseFloat(savedValue) || 0;
                }
                // Always populate from saved data (database is source of truth)
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceChf.value = savedValue;
                    // Update formData with saved value
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.CHF = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceUsd) {
                let savedValue = oneTimePricing.USD;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'one_time' && sourceData.price_amount_usd !== null && sourceData.price_amount_usd !== undefined) {
                    savedValue = sourceData.price_amount_usd;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.USD = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceUsd.value = savedValue;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.USD = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceEur) {
                let savedValue = oneTimePricing.EUR;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'one_time' && sourceData.price_amount_eur !== null && sourceData.price_amount_eur !== undefined) {
                    savedValue = sourceData.price_amount_eur;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.EUR = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceEur.value = savedValue;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.EUR = parseFloat(savedValue) || 0;
                }
            }
            if (this.elements.oneTimePriceGbp) {
                let savedValue = oneTimePricing.GBP;
                if ((!savedValue || savedValue === 0) && hasPriceAmountFields && sourceData.pricing_type === 'one_time' && sourceData.price_amount_gbp !== null && sourceData.price_amount_gbp !== undefined) {
                    savedValue = sourceData.price_amount_gbp;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
                    this.formData.one_time_pricing.GBP = parseFloat(savedValue) || 0;
                }
                if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
                    this.elements.oneTimePriceGbp.value = savedValue;
                    if (!this.formData.one_time_pricing) this.formData.one_time_pricing = {};
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
            
            // Final sync: Ensure this.formData matches populated form field values
            // This ensures saveFormData() sees the correct values even if called right after navigation
            if (this.elements.subscriptionPriceChf && this.elements.subscriptionPriceChf.value) {
                this.formData.subscription_pricing.CHF = parseFloat(this.elements.subscriptionPriceChf.value) || 0;
                this.formData.subscription_price = this.formData.subscription_pricing.CHF;
            }
            if (this.elements.subscriptionPriceUsd && this.elements.subscriptionPriceUsd.value) {
                this.formData.subscription_pricing.USD = parseFloat(this.elements.subscriptionPriceUsd.value) || 0;
            }
            if (this.elements.subscriptionPriceEur && this.elements.subscriptionPriceEur.value) {
                this.formData.subscription_pricing.EUR = parseFloat(this.elements.subscriptionPriceEur.value) || 0;
            }
            if (this.elements.subscriptionPriceGbp && this.elements.subscriptionPriceGbp.value) {
                this.formData.subscription_pricing.GBP = parseFloat(this.elements.subscriptionPriceGbp.value) || 0;
            }
            if (this.elements.oneTimePriceChf && this.elements.oneTimePriceChf.value) {
                this.formData.one_time_pricing.CHF = parseFloat(this.elements.oneTimePriceChf.value) || 0;
                this.formData.one_time_price = this.formData.one_time_pricing.CHF;
            }
            if (this.elements.oneTimePriceUsd && this.elements.oneTimePriceUsd.value) {
                this.formData.one_time_pricing.USD = parseFloat(this.elements.oneTimePriceUsd.value) || 0;
            }
            if (this.elements.oneTimePriceEur && this.elements.oneTimePriceEur.value) {
                this.formData.one_time_pricing.EUR = parseFloat(this.elements.oneTimePriceEur.value) || 0;
            }
            if (this.elements.oneTimePriceGbp && this.elements.oneTimePriceGbp.value) {
                this.formData.one_time_pricing.GBP = parseFloat(this.elements.oneTimePriceGbp.value) || 0;
            }
            
            window.logger?.log('✅ Form fields populated and synced to this.formData from:', sourceData.stripe_product_id ? 'wizard.formData' : 'this.formData');
        }

        /**
         * Save form data (called by parent wizard on save)
         * Only saves if step has been initialized and has meaningful data (not just defaults)
         */
        saveFormData(wizardFormData) {
            // Only save if step has been initialized (user has visited this step)
            if (!this.isInitialized) {
                window.logger?.log('⚠️ SaveFormData: Step not initialized, skipping save to prevent overwriting with defaults');
                return;
            }
            
            // Read current form values before saving (in case user just changed them)
            // This ensures we capture the latest form state, not stale this.formData
            this.readFormFieldValues();
            
            // Check if DB already has pricing data
            const hasExistingStripeProduct = !!wizardFormData.stripe_product_id;
            
            // Check if wizardFormData has existing pricing objects with meaningful data
            const hasExistingPricingObjects = 
                (wizardFormData.subscription_pricing && typeof wizardFormData.subscription_pricing === 'object' && Object.keys(wizardFormData.subscription_pricing).length > 0 && Object.values(wizardFormData.subscription_pricing).some(price => price > 0)) ||
                (wizardFormData.one_time_pricing && typeof wizardFormData.one_time_pricing === 'object' && Object.keys(wizardFormData.one_time_pricing).length > 0 && Object.values(wizardFormData.one_time_pricing).some(price => price > 0));
            
            // Check if wizardFormData has price_amount_* fields (from database)
            const hasExistingPriceAmounts = 
                (wizardFormData.price_amount_chf && wizardFormData.price_amount_chf > 0) ||
                (wizardFormData.price_amount_usd && wizardFormData.price_amount_usd > 0) ||
                (wizardFormData.price_amount_eur && wizardFormData.price_amount_eur > 0) ||
                (wizardFormData.price_amount_gbp && wizardFormData.price_amount_gbp > 0);
            
            const hasExistingPricingInDB = hasExistingPriceAmounts || hasExistingPricingObjects;
            
            // Check if we have meaningful pricing data in this.formData (after reading form fields)
            const hasNonDefaultPricing = 
                (this.formData.pricing_type && this.formData.pricing_type !== 'freemium') ||
                (this.formData.subscription_pricing && Object.values(this.formData.subscription_pricing).some(price => price > 0)) ||
                (this.formData.one_time_pricing && Object.values(this.formData.one_time_pricing).some(price => price > 0)) ||
                (this.formData.subscription_price > 0) ||
                (this.formData.one_time_price > 0);
            
            // CRITICAL: If Stripe product exists in DB but form fields are empty, DON'T overwrite
            // This protects against saving empty pricing over existing DB data during navigation
            if (hasExistingStripeProduct && hasExistingPricingInDB && !hasNonDefaultPricing) {
                // Preserve existing pricing - user hasn't changed it, form fields may just be empty during navigation
                window.logger?.log('⚠️ SaveFormData: Stripe product exists with pricing in DB, but form fields are empty. Preserving existing DB pricing.');
                // Still save pricing_type and trial settings as they're safe to update
                wizardFormData.pricing_type = this.formData.pricing_type || wizardFormData.pricing_type;
                wizardFormData.trial_days = this.formData.trial_days !== undefined ? this.formData.trial_days : wizardFormData.trial_days;
                wizardFormData.trial_requires_payment = this.formData.trial_requires_payment !== undefined ? this.formData.trial_requires_payment : wizardFormData.trial_requires_payment;
                return; // Don't save empty pricing over existing data
            }
            
            // Always save pricing_type and trial settings if step is initialized
            wizardFormData.pricing_type = this.formData.pricing_type || wizardFormData.pricing_type;
            wizardFormData.trial_days = this.formData.trial_days !== undefined ? this.formData.trial_days : (wizardFormData.trial_days || 0);
            wizardFormData.trial_requires_payment = this.formData.trial_requires_payment !== undefined ? this.formData.trial_requires_payment : (wizardFormData.trial_requires_payment || false);
            
            // Only save pricing objects if we have meaningful data, otherwise preserve existing
            if (hasNonDefaultPricing || this.formData.pricing_type === 'freemium') {
                // We have meaningful pricing data OR explicit freemium (all zeros is valid)
                wizardFormData.subscription_price = this.formData.subscription_price;
                wizardFormData.subscription_pricing = this.formData.subscription_pricing;
                wizardFormData.one_time_price = this.formData.one_time_price;
                wizardFormData.one_time_pricing = this.formData.one_time_pricing;
                window.logger?.log('✅ SaveFormData: Saved Stripe pricing configuration', {
                    pricing_type: this.formData.pricing_type,
                    hasNonDefaultPricing: hasNonDefaultPricing
                });
            } else if (wizardFormData.stripe_product_id && (!hasExistingPricingObjects && !hasExistingPriceAmounts)) {
                // Stripe product exists but no pricing data in DB - save defaults (freemium case)
                wizardFormData.subscription_price = this.formData.subscription_price;
                wizardFormData.subscription_pricing = this.formData.subscription_pricing;
                wizardFormData.one_time_price = this.formData.one_time_price;
                wizardFormData.one_time_pricing = this.formData.one_time_pricing;
                window.logger?.log('✅ SaveFormData: Saved Stripe pricing configuration (freemium/defaults)');
            } else {
                // Preserve existing pricing data - don't overwrite with empty objects
                window.logger?.log('⚠️ SaveFormData: Preserving existing pricing data, not overwriting with empty objects. Existing:', {
                    hasPricingObjects: hasExistingPricingObjects,
                    hasPriceAmounts: hasExistingPriceAmounts,
                    stripe_product_id: wizardFormData.stripe_product_id
                });
            }
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


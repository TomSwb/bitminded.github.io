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
            console.log('📝 Initializing Step 4: Stripe Product Creation...');
            this.initializeElements();
            this.attachEventListeners();
            this.setupDefaults();
            this.togglePricingSections();
            console.log('✅ Step 4: Stripe Product Creation initialized');
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
        }

        setupDefaults() {
            if (window.productWizard && window.productWizard.formData) {
                const basicInfo = window.productWizard.formData;
                
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

                if (basicInfo.stripe_product_id) {
                    this.stripeProductCreated = true;
                    this.showFinalState(basicInfo);
                }
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
                    this.saveToFormData(result.data);
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
        }

        showFinalState(data) {
            if (!data) data = window.productWizard?.formData || {};
            if (this.elements.createStripeBtn && this.elements.createStripeBtn.parentElement) {
                this.elements.createStripeBtn.parentElement.style.display = 'none';
            }
            if (data.stripe_product_id) {
                this.updateStripeStatus({ productId: data.stripe_product_id, priceId: data.stripe_price_id });
            }
        }

        saveToFormData(data) {
            if (!window.productWizard || !window.productWizard.formData) return;
            if (data.productId) window.productWizard.formData.stripe_product_id = data.productId;
            window.productWizard.formData.pricing_type = this.formData.pricing_type;
            window.productWizard.formData.enterprise_price = this.formData.enterprise_price;
            console.log('✅ Saved Stripe data');
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


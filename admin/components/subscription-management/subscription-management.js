/**
 * Subscription Management Component
 * Handles subscription viewing, filtering, managing, and analyzing
 */

if (typeof window.SubscriptionManagement === 'undefined') {
class SubscriptionManagement {
    constructor() {
        this.isInitialized = false;
        this.subscriptions = [];
        this.filteredSubscriptions = [];
        this.filters = this.getDefaultFilters();
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.currentSubscription = null;
        this.elements = {};
        this.products = [];
        this.services = [];
    }

    /**
     * Return a copy of the default filter configuration
     */
    getDefaultFilters() {
        return {
            status: 'all',
            product: 'all',
            billing: 'all',
            source: 'all',
            paymentStatus: 'all',
            dateFrom: null,
            dateTo: null
        };
    }

    /**
     * Initialize the subscription management component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            window.logger?.log('🔄 Initializing subscription management component');

            // Initialize DOM elements
            this.cacheElements();

            // Setup event listeners
            this.bindEvents();
            
            // Initialize translations
            await this.loadTranslations();
            
            // Load products and services for filter dropdown
            await this.loadProductsAndServices();
            
            // Load subscriptions
            await this.loadSubscriptions();

            // Calculate and display metrics
            this.calculateMetrics();

            // Apply initial filters
            this.applyFilters();

            this.isInitialized = true;
            
            window.logger?.log('✅ Subscription management component initialized');

            // Final translation update after everything is loaded
            setTimeout(() => {
                this.updateTranslations();
            }, 200);

        } catch (error) {
            window.logger?.error('❌ Subscription Management: Failed to initialize:', error);
            this.showError('Failed to initialize subscription management');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Stats
            statTotal: document.getElementById('stat-total'),
            statActive: document.getElementById('stat-active'),
            statMRR: document.getElementById('stat-mrr'),
            statChurn: document.getElementById('stat-churn'),
            
            // Filters
            statusFilter: document.getElementById('status-filter'),
            productFilter: document.getElementById('product-filter'),
            billingFilter: document.getElementById('billing-filter'),
            sourceFilter: document.getElementById('source-filter'),
            paymentStatusFilter: document.getElementById('payment-status-filter'),
            dateFromFilter: document.getElementById('date-from-filter'),
            dateToFilter: document.getElementById('date-to-filter'),
            clearFiltersButton: document.getElementById('clear-filters-button'),
            
            // Actions
            syncStripeButton: document.getElementById('sync-stripe-button'),
            exportButton: document.getElementById('export-subscriptions-button'),
            
            // Table
            tableBody: document.getElementById('subscriptions-table-body'),
            table: document.getElementById('subscriptions-table'),
            
            // States
            loading: document.getElementById('subscription-loading'),
            error: document.getElementById('subscription-error'),
            errorText: document.getElementById('subscription-error-text'),
            empty: document.getElementById('subscription-empty'),
            
            // Pagination
            pagination: document.getElementById('subscription-pagination'),
            paginationStart: document.getElementById('pagination-start'),
            paginationEnd: document.getElementById('pagination-end'),
            paginationTotal: document.getElementById('pagination-total'),
            paginationPrev: document.getElementById('pagination-prev'),
            paginationNext: document.getElementById('pagination-next'),
            
            // Modal
            detailModal: document.getElementById('subscription-detail-modal'),
            modalClose: document.getElementById('modal-close-button'),
            modalClose2: document.getElementById('modal-close-button-2'),
            modalTabs: document.querySelectorAll('.subscription-management__modal-tab'),
            modalTabContents: {
                overview: document.getElementById('tab-overview'),
                billing: document.getElementById('tab-billing'),
                events: document.getElementById('tab-events'),
                modifications: document.getElementById('tab-modifications')
            },
            confirmModal: document.getElementById('action-confirm-modal'),
            confirmModalClose: document.getElementById('confirm-modal-close'),
            confirmModalCancel: document.getElementById('confirm-modal-cancel'),
            confirmModalConfirm: document.getElementById('confirm-modal-confirm'),
            confirmModalTitle: document.getElementById('confirm-modal-title'),
            confirmModalMessage: document.getElementById('confirm-modal-message'),
            confirmModalForm: document.getElementById('confirm-modal-form')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Filter changes
        if (this.elements.statusFilter) {
            this.elements.statusFilter.addEventListener('change', () => {
                this.filters.status = this.elements.statusFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.productFilter) {
            this.elements.productFilter.addEventListener('change', () => {
                this.filters.product = this.elements.productFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.billingFilter) {
            this.elements.billingFilter.addEventListener('change', () => {
                this.filters.billing = this.elements.billingFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.sourceFilter) {
            this.elements.sourceFilter.addEventListener('change', () => {
                this.filters.source = this.elements.sourceFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.paymentStatusFilter) {
            this.elements.paymentStatusFilter.addEventListener('change', () => {
                this.filters.paymentStatus = this.elements.paymentStatusFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.dateFromFilter) {
            this.elements.dateFromFilter.addEventListener('change', () => {
                this.filters.dateFrom = this.elements.dateFromFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.dateToFilter) {
            this.elements.dateToFilter.addEventListener('change', () => {
                this.filters.dateTo = this.elements.dateToFilter.value;
                this.applyFilters();
            });
        }

        if (this.elements.clearFiltersButton) {
            this.elements.clearFiltersButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Action buttons
        if (this.elements.syncStripeButton) {
            this.elements.syncStripeButton.addEventListener('click', () => {
                this.syncStripeSubscriptions();
            });
        }

        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => {
                this.exportSubscriptions();
            });
        }

        // Sortable headers
        const sortableHeaders = document.querySelectorAll('.subscription-management__sortable-header');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.getAttribute('data-sort');
                this.handleSort(sortField);
            });
        });

        // Modal events
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => {
                this.closeDetailModal();
            });
        }

        if (this.elements.modalClose2) {
            this.elements.modalClose2.addEventListener('click', () => {
                this.closeDetailModal();
            });
        }

        if (this.elements.detailModal) {
            this.elements.detailModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('subscription-management__modal-overlay')) {
                    this.closeDetailModal();
                }
            });
        }

        // Modal tabs
        this.elements.modalTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchModalTab(tabName);
            });
        });

        // Confirm modal
        if (this.elements.confirmModalClose) {
            this.elements.confirmModalClose.addEventListener('click', () => {
                this.closeConfirmModal();
            });
        }

        if (this.elements.confirmModalCancel) {
            this.elements.confirmModalCancel.addEventListener('click', () => {
                this.closeConfirmModal();
            });
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('subscription-management__modal-overlay')) {
                    this.closeConfirmModal();
                }
            });
        }

        // Language change
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        if (window.subscriptionManagementTranslations) {
            await window.subscriptionManagementTranslations.init();
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.subscriptionManagementTranslations) {
            window.subscriptionManagementTranslations.updateTranslations();
        }
    }

    /**
     * Get translation
     */
    t(key) {
        if (window.i18next) {
            return window.i18next.t(key);
        }
        if (window.subscriptionManagementTranslations) {
            return window.subscriptionManagementTranslations.getTranslation(key);
        }
        return key;
    }

    /**
     * Load products and services for filter dropdown
     */
    async loadProductsAndServices() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Load products
            const { data: productsData, error: productsError } = await window.supabase
                .from('products')
                .select('id, name')
                .order('name');

            if (productsError) {
                window.logger?.error('❌ Error loading products:', productsError);
            } else {
                this.products = productsData || [];
            }

            // Load services
            const { data: servicesData, error: servicesError } = await window.supabase
                .from('services')
                .select('id, name')
                .order('name');

            if (servicesError) {
                window.logger?.error('❌ Error loading services:', servicesError);
            } else {
                this.services = servicesData || [];
            }

            // Populate product filter dropdown
            if (this.elements.productFilter) {
                this.elements.productFilter.innerHTML = '<option value="all">' + this.t('all') + '</option>';
                
                // Add products
                this.products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = `product_${product.id}`;
                    option.textContent = product.name;
                    this.elements.productFilter.appendChild(option);
                });

                // Add services
                this.services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = `service_${service.id}`;
                    option.textContent = service.name;
                    this.elements.productFilter.appendChild(option);
                });
            }

        } catch (error) {
            window.logger?.error('❌ Failed to load products and services:', error);
        }
    }

    /**
     * Load subscriptions from all sources
     */
    async loadSubscriptions() {
        try {
            this.showLoading();

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'subscription_list_viewed',
                    'Admin viewed subscription management list'
                );
            }

            const allSubscriptions = [];

            // 1. Load Stripe subscriptions from user_subscriptions
            const { data: stripeSubs, error: stripeError } = await window.supabase
                .from('user_subscriptions')
                .select(`
                    id,
                    user_id,
                    stripe_customer_id,
                    stripe_subscription_id,
                    plan_name,
                    status,
                    current_period_start,
                    current_period_end,
                    created_at,
                    updated_at
                `);

            if (stripeError) {
                window.logger?.error('❌ Error loading Stripe subscriptions:', stripeError);
            } else if (stripeSubs) {
                // Enrich with user data
                for (const sub of stripeSubs) {
                    const enriched = await this.enrichSubscriptionData(sub, 'stripe');
                    if (enriched) {
                        allSubscriptions.push(enriched);
                    }
                }
            }

            // 2. Load product purchases (subscriptions)
            const { data: productPurchases, error: productError } = await window.supabase
                .from('product_purchases')
                .select(`
                    id,
                    user_id,
                    product_id,
                    purchase_type,
                    amount_paid,
                    currency,
                    stripe_subscription_id,
                    stripe_customer_id,
                    subscription_interval,
                    current_period_start,
                    current_period_end,
                    status,
                    payment_status,
                    expires_at,
                    purchased_at,
                    cancelled_at
                `)
                .eq('purchase_type', 'subscription');

            if (productError) {
                window.logger?.error('❌ Error loading product purchases:', productError);
            } else if (productPurchases) {
                for (const purchase of productPurchases) {
                    const enriched = await this.enrichPurchaseData(purchase, 'product');
                    if (enriched) {
                        allSubscriptions.push(enriched);
                    }
                }
            }

            // 3. Load service purchases (subscriptions)
            const { data: servicePurchases, error: serviceError } = await window.supabase
                .from('service_purchases')
                .select(`
                    id,
                    user_id,
                    service_id,
                    purchase_type,
                    amount_paid,
                    currency,
                    stripe_subscription_id,
                    stripe_customer_id,
                    subscription_interval,
                    current_period_start,
                    current_period_end,
                    status,
                    payment_status,
                    expires_at,
                    purchased_at,
                    cancelled_at
                `)
                .eq('purchase_type', 'subscription');

            if (serviceError) {
                window.logger?.error('❌ Error loading service purchases:', serviceError);
            } else if (servicePurchases) {
                for (const purchase of servicePurchases) {
                    const enriched = await this.enrichPurchaseData(purchase, 'service');
                    if (enriched) {
                        allSubscriptions.push(enriched);
                    }
                }
            }

            // 4. Load manual entitlements (non-trial, no subscription_id)
            const { data: entitlements, error: entitlementsError } = await window.supabase
                .from('entitlements')
                .select(`
                    id,
                    user_id,
                    app_id,
                    active,
                    expires_at,
                    subscription_id,
                    grant_type,
                    created_at,
                    updated_at
                `)
                .is('subscription_id', null)
                .in('grant_type', ['manual', 'admin']);

            if (entitlementsError) {
                window.logger?.error('❌ Error loading entitlements:', entitlementsError);
            } else if (entitlements) {
                for (const entitlement of entitlements) {
                    const enriched = await this.enrichEntitlementData(entitlement);
                    if (enriched) {
                        allSubscriptions.push(enriched);
                    }
                }
            }

            this.subscriptions = allSubscriptions;
            this.filteredSubscriptions = [...allSubscriptions];

            this.hideLoading();
            this.renderSubscriptions();

            window.logger?.log(`✅ Loaded ${allSubscriptions.length} subscriptions`);

        } catch (error) {
            window.logger?.error('❌ Failed to load subscriptions:', error);
            this.hideLoading();
            this.showError('Failed to load subscriptions');
        }
    }

    /**
     * Enrich Stripe subscription data with user info
     */
    async enrichSubscriptionData(sub, source) {
        try {
            // Get user profile with email
            const { data: profile } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, email')
                .eq('id', sub.user_id)
                .single();

            const email = profile?.email || 'N/A';

            return {
                id: sub.id,
                subscriptionId: sub.stripe_subscription_id,
                userId: sub.user_id,
                user: {
                    id: sub.user_id,
                    username: profile?.username || 'Unknown',
                    avatar_url: profile?.avatar_url || null,
                    email: email
                },
                productName: sub.plan_name,
                productId: null,
                productType: 'stripe_plan',
                status: this.normalizeStatus(sub.status),
                source: source,
                billingCycle: this.determineBillingCycle(sub.plan_name),
                amountPerCycle: null, // Not available in user_subscriptions
                currency: 'CHF',
                currentPeriodStart: sub.current_period_start,
                currentPeriodEnd: sub.current_period_end,
                expiresAt: sub.current_period_end,
                createdAt: sub.created_at,
                updatedAt: sub.updated_at,
                cancelledAt: null,
                paymentStatus: 'paid', // Assume paid for Stripe subscriptions
                paymentMethod: 'stripe',
                totalPaid: null,
                stripeCustomerId: sub.stripe_customer_id
            };
        } catch (error) {
            window.logger?.error('❌ Error enriching subscription data:', error);
            return null;
        }
    }

    /**
     * Enrich purchase data (product or service)
     */
    async enrichPurchaseData(purchase, type) {
        try {
            // Get user profile with email
            const { data: profile } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, email')
                .eq('id', purchase.user_id)
                .single();

            const email = profile?.email || 'N/A';

            // Get product/service name
            const tableName = type === 'product' ? 'products' : 'services';
            const { data: item } = await window.supabase
                .from(tableName)
                .select('id, name')
                .eq('id', purchase[`${type}_id`])
                .single();

            // Calculate total paid (would need to query payments table, simplified here)
            const totalPaid = purchase.amount_paid || 0;

            return {
                id: purchase.id,
                subscriptionId: purchase.stripe_subscription_id,
                userId: purchase.user_id,
                user: {
                    id: purchase.user_id,
                    username: profile?.username || 'Unknown',
                    avatar_url: profile?.avatar_url || null,
                    email: email
                },
                productName: item?.name || 'Unknown',
                productId: purchase[`${type}_id`],
                productType: type,
                status: this.normalizeStatus(purchase.status),
                source: purchase.stripe_subscription_id ? 'stripe' : 'manual',
                billingCycle: purchase.subscription_interval || 'monthly',
                amountPerCycle: purchase.amount_paid || 0,
                currency: purchase.currency || 'CHF',
                currentPeriodStart: purchase.current_period_start,
                currentPeriodEnd: purchase.current_period_end,
                expiresAt: purchase.expires_at,
                createdAt: purchase.purchased_at || purchase.created_at,
                updatedAt: purchase.updated_at,
                cancelledAt: purchase.cancelled_at,
                paymentStatus: purchase.payment_status || 'paid',
                paymentMethod: purchase.stripe_subscription_id ? 'stripe' : 'manual',
                totalPaid: totalPaid,
                stripeCustomerId: purchase.stripe_customer_id
            };
        } catch (error) {
            window.logger?.error('❌ Error enriching purchase data:', error);
            return null;
        }
    }

    /**
     * Enrich entitlement data
     */
    async enrichEntitlementData(entitlement) {
        try {
            // Get user profile with email
            const { data: profile } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, email')
                .eq('id', entitlement.user_id)
                .single();

            const email = profile?.email || 'N/A';

            // Try to determine if it's a product or service
            const { data: product } = await window.supabase
                .from('products')
                .select('id, name')
                .eq('id', entitlement.app_id)
                .single();

            const { data: service } = product ? null : await window.supabase
                .from('services')
                .select('id, name')
                .eq('id', entitlement.app_id)
                .single();

            const item = product || service;
            const productType = product ? 'product' : (service ? 'service' : 'unknown');

            return {
                id: entitlement.id,
                subscriptionId: null,
                userId: entitlement.user_id,
                user: {
                    id: entitlement.user_id,
                    username: profile?.username || 'Unknown',
                    avatar_url: profile?.avatar_url || null,
                    email: email
                },
                productName: item?.name || 'Unknown',
                productId: entitlement.app_id,
                productType: productType,
                status: entitlement.active ? 'active' : 'cancelled',
                source: 'manual',
                billingCycle: 'lifetime',
                amountPerCycle: 0,
                currency: 'CHF',
                currentPeriodStart: entitlement.created_at,
                currentPeriodEnd: entitlement.expires_at,
                expiresAt: entitlement.expires_at,
                createdAt: entitlement.created_at,
                updatedAt: entitlement.updated_at,
                cancelledAt: entitlement.active ? null : entitlement.updated_at,
                paymentStatus: 'paid',
                paymentMethod: 'manual',
                totalPaid: 0,
                stripeCustomerId: null
            };
        } catch (error) {
            window.logger?.error('❌ Error enriching entitlement data:', error);
            return null;
        }
    }

    /**
     * Normalize status values
     */
    normalizeStatus(status) {
        if (!status) return 'active';
        const statusLower = status.toLowerCase();
        if (['active', 'cancelled', 'canceled', 'past_due', 'past due', 'trialing', 'trial'].includes(statusLower)) {
            if (statusLower === 'canceled') return 'cancelled';
            if (statusLower === 'past due') return 'past_due';
            return statusLower;
        }
        return 'active';
    }

    /**
     * Determine billing cycle from plan name
     */
    determineBillingCycle(planName) {
        if (!planName) return 'monthly';
        const nameLower = planName.toLowerCase();
        if (nameLower.includes('year') || nameLower.includes('annual')) {
            return 'yearly';
        }
        if (nameLower.includes('month')) {
            return 'monthly';
        }
        return 'monthly';
    }

    /**
     * Calculate metrics
     */
    calculateMetrics() {
        const total = this.subscriptions.length;
        const active = this.subscriptions.filter(s => 
            s.status === 'active' && 
            (!s.expiresAt || new Date(s.expiresAt) > new Date())
        ).length;

        // Calculate MRR (Monthly Recurring Revenue)
        let mrr = 0;
        this.subscriptions.forEach(sub => {
            if (sub.status === 'active' && sub.amountPerCycle) {
                if (sub.billingCycle === 'yearly') {
                    mrr += sub.amountPerCycle / 12;
                } else if (sub.billingCycle === 'monthly') {
                    mrr += sub.amountPerCycle;
                }
            }
        });

        // Calculate churn rate (cancelled this month / total)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const cancelledThisMonth = this.subscriptions.filter(s => 
            s.cancelledAt && new Date(s.cancelledAt) >= startOfMonth
        ).length;
        const churnRate = total > 0 ? (cancelledThisMonth / total) * 100 : 0;

        // Update UI
        if (this.elements.statTotal) {
            this.elements.statTotal.textContent = total;
        }
        if (this.elements.statActive) {
            this.elements.statActive.textContent = active;
        }
        if (this.elements.statMRR) {
            this.elements.statMRR.textContent = `CHF ${mrr.toFixed(2)}`;
        }
        if (this.elements.statChurn) {
            this.elements.statChurn.textContent = `${churnRate.toFixed(1)}%`;
        }
    }

    /**
     * Apply filters
     */
    applyFilters() {
        this.filteredSubscriptions = this.subscriptions.filter(sub => {
            // Status filter
            if (this.filters.status !== 'all') {
                if (sub.status !== this.filters.status) {
                    return false;
                }
            }

            // Product/Service filter
            if (this.filters.product !== 'all') {
                const [type, id] = this.filters.product.split('_');
                if (type === 'product' && sub.productType === 'product' && sub.productId !== id) {
                    return false;
                }
                if (type === 'service' && sub.productType === 'service' && sub.productId !== id) {
                    return false;
                }
            }

            // Billing cycle filter
            if (this.filters.billing !== 'all') {
                if (sub.billingCycle !== this.filters.billing) {
                    return false;
                }
            }

            // Source filter
            if (this.filters.source !== 'all') {
                if (sub.source !== this.filters.source) {
                    return false;
                }
            }

            // Payment status filter
            if (this.filters.paymentStatus !== 'all') {
                if (sub.paymentStatus !== this.filters.paymentStatus) {
                    return false;
                }
            }

            // Date range filter
            if (this.filters.dateFrom) {
                const subDate = new Date(sub.createdAt);
                const filterDate = new Date(this.filters.dateFrom);
                if (subDate < filterDate) {
                    return false;
                }
            }

            if (this.filters.dateTo) {
                const subDate = new Date(sub.createdAt);
                const filterDate = new Date(this.filters.dateTo);
                filterDate.setHours(23, 59, 59, 999); // End of day
                if (subDate > filterDate) {
                    return false;
                }
            }

            return true;
        });

        // Apply sorting
        if (this.sort.field) {
            this.applySorting();
        }

        // Update metrics with filtered data
        this.updateMetricsForFiltered();

        // Render
        this.renderSubscriptions();
        this.updatePagination();
    }

    /**
     * Update metrics for filtered subscriptions
     */
    updateMetricsForFiltered() {
        const total = this.filteredSubscriptions.length;
        const active = this.filteredSubscriptions.filter(s => 
            s.status === 'active' && 
            (!s.expiresAt || new Date(s.expiresAt) > new Date())
        ).length;

        // Update UI (keep MRR and churn from all subscriptions)
        if (this.elements.statTotal) {
            this.elements.statTotal.textContent = total;
        }
        if (this.elements.statActive) {
            this.elements.statActive.textContent = active;
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = this.getDefaultFilters();

        if (this.elements.statusFilter) {
            this.elements.statusFilter.value = 'all';
        }
        if (this.elements.productFilter) {
            this.elements.productFilter.value = 'all';
        }
        if (this.elements.billingFilter) {
            this.elements.billingFilter.value = 'all';
        }
        if (this.elements.sourceFilter) {
            this.elements.sourceFilter.value = 'all';
        }
        if (this.elements.paymentStatusFilter) {
            this.elements.paymentStatusFilter.value = 'all';
        }
        if (this.elements.dateFromFilter) {
            this.elements.dateFromFilter.value = '';
        }
        if (this.elements.dateToFilter) {
            this.elements.dateToFilter.value = '';
        }

        this.applyFilters();
    }

    /**
     * Handle sort
     */
    handleSort(field) {
        if (this.sort.field === field) {
            this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort.field = field;
            this.sort.direction = 'asc';
        }

        this.updateSortIndicators();
        this.applySorting();
        this.renderSubscriptions();
    }

    /**
     * Apply sorting
     */
    applySorting() {
        if (!this.sort.field) return;

        this.filteredSubscriptions.sort((a, b) => {
            let aValue = a[this.sort.field];
            let bValue = b[this.sort.field];

            // Handle nested properties
            if (this.sort.field === 'user') {
                aValue = a.user?.username || '';
                bValue = b.user?.username || '';
            } else if (this.sort.field === 'product') {
                aValue = a.productName || '';
                bValue = b.productName || '';
            }

            // Handle dates
            if (aValue instanceof Date || (typeof aValue === 'string' && aValue.includes('T'))) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Handle strings
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            else if (aValue > bValue) comparison = 1;

            return this.sort.direction === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Update sort indicators
     */
    updateSortIndicators() {
        const headers = document.querySelectorAll('.subscription-management__sortable-header');
        headers.forEach(header => {
            header.removeAttribute('data-sort-direction');
        });

        if (this.sort.field) {
            const activeHeader = document.querySelector(`[data-sort="${this.sort.field}"]`);
            if (activeHeader) {
                activeHeader.setAttribute('data-sort-direction', this.sort.direction);
            }
        }
    }

    /**
     * Render subscriptions table
     */
    renderSubscriptions() {
        if (!this.elements.tableBody) {
            window.logger?.error('❌ Table body not found');
            return;
        }

        this.elements.tableBody.innerHTML = '';

        if (this.filteredSubscriptions.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        // Get paginated subscriptions
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedSubs = this.filteredSubscriptions.slice(startIndex, endIndex);

        paginatedSubs.forEach(sub => {
            const row = this.createSubscriptionRow(sub);
            this.elements.tableBody.appendChild(row);
        });

        // Update translations
        setTimeout(() => {
            this.updateTranslations();
        }, 100);
    }

    /**
     * Create subscription table row
     */
    createSubscriptionRow(sub) {
        const tr = document.createElement('tr');
        tr.dataset.subscriptionId = sub.id;

        // User cell
        const userCell = document.createElement('td');
        userCell.className = 'subscription-management__user-cell';
        const avatar = sub.user?.avatar_url 
            ? `<img src="${sub.user.avatar_url}" alt="${sub.user.username}" class="subscription-management__user-avatar">`
            : '<div class="subscription-management__user-avatar" style="background-color: var(--color-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-bg-primary); font-weight: bold;">' + (sub.user?.username?.[0] || 'U') + '</div>';
        userCell.innerHTML = `
            ${avatar}
            <div class="subscription-management__user-info">
                <div class="subscription-management__user-name" onclick="window.subscriptionManagementComponent?.viewUserDetail('${sub.userId}')">${sub.user?.username || 'Unknown'}</div>
                <div class="subscription-management__user-email">${sub.user?.email || 'N/A'}</div>
            </div>
        `;

        // Product/Plan cell
        const productCell = document.createElement('td');
        productCell.innerHTML = `
            <div><strong>${sub.productName || 'Unknown'}</strong></div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${this.t(sub.billingCycle)}</div>
            ${sub.amountPerCycle ? `<div style="font-size: var(--font-size-sm);">${sub.currency} ${sub.amountPerCycle.toFixed(2)}</div>` : ''}
        `;

        // Status cell
        const statusCell = document.createElement('td');
        const statusClass = `subscription-management__status-badge--${sub.status}`;
        statusCell.innerHTML = `
            <span class="subscription-management__status-badge ${statusClass}">${this.t(sub.status)}</span>
        `;

        // Billing cell
        const billingCell = document.createElement('td');
        const periodStart = sub.currentPeriodStart ? this.formatDate(sub.currentPeriodStart) : 'N/A';
        const periodEnd = sub.currentPeriodEnd ? this.formatDate(sub.currentPeriodEnd) : 'N/A';
        billingCell.innerHTML = `
            <div style="font-size: var(--font-size-sm);">${this.t('current_period')}: ${periodStart} - ${periodEnd}</div>
            ${sub.currentPeriodEnd ? `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${this.t('next_billing')}: ${this.formatDate(sub.currentPeriodEnd)}</div>` : ''}
        `;

        // Revenue cell
        const revenueCell = document.createElement('td');
        revenueCell.innerHTML = `
            ${sub.amountPerCycle ? `<div>${sub.currency} ${sub.amountPerCycle.toFixed(2)}/${this.t(sub.billingCycle === 'yearly' ? 'year' : 'month')}</div>` : '<div>N/A</div>'}
            ${sub.totalPaid ? `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${this.t('total_paid')}: ${sub.currency} ${sub.totalPaid.toFixed(2)}</div>` : ''}
        `;

        // Source cell
        const sourceCell = document.createElement('td');
        const sourceClass = `subscription-management__source-badge--${sub.source}`;
        let sourceText = this.t(sub.source);
        if (sub.source === 'stripe' && sub.subscriptionId) {
            sourceText = `<a href="https://dashboard.stripe.com/subscriptions/${sub.subscriptionId}" target="_blank" style="color: inherit; text-decoration: underline;">${this.t('stripe')}</a>`;
        }
        sourceCell.innerHTML = `
            <span class="subscription-management__source-badge ${sourceClass}">${sourceText}</span>
        `;

        // Payment method cell
        const paymentCell = document.createElement('td');
        paymentCell.textContent = sub.paymentMethod === 'stripe' ? 'Card ****' : this.t('n_a');

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'subscription-management__actions-cell';
        const isActive = sub.status === 'active';
        actionsCell.innerHTML = `
            <button class="subscription-management__actions-button" onclick="window.subscriptionManagementComponent?.openActionsMenu(event, '${sub.id}')">
                ${this.t('actions')} ▼
            </button>
            <div class="subscription-management__actions-dropdown" id="actions-dropdown-${sub.id}">
                <button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.viewSubscriptionDetails('${sub.id}')">${this.t('view_details')}</button>
                ${sub.subscriptionId ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.viewInStripe('${sub.subscriptionId}')">${this.t('view_in_stripe')}</button>` : ''}
                ${isActive ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openCancelModal('${sub.id}')">${this.t('cancel_subscription')}</button>` : ''}
                ${isActive && sub.source === 'stripe' ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openRefundModal('${sub.id}')">${this.t('refund_and_cancel')}</button>` : ''}
                ${isActive ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openExtendModal('${sub.id}')">${this.t('extend_subscription')}</button>` : ''}
                ${isActive && sub.source === 'stripe' ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openChangePlanModal('${sub.id}')">${this.t('change_plan')}</button>` : ''}
                ${isActive && sub.source === 'stripe' ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openPauseModal('${sub.id}')">${this.t('pause_subscription')}</button>` : ''}
                ${sub.status === 'paused' && sub.source === 'stripe' ? `<button class="subscription-management__actions-item" onclick="window.subscriptionManagementComponent?.openResumeModal('${sub.id}')">${this.t('resume_subscription')}</button>` : ''}
            </div>
        `;

        tr.appendChild(userCell);
        tr.appendChild(productCell);
        tr.appendChild(statusCell);
        tr.appendChild(billingCell);
        tr.appendChild(revenueCell);
        tr.appendChild(sourceCell);
        tr.appendChild(paymentCell);
        tr.appendChild(actionsCell);

        return tr;
    }

    /**
     * Open actions menu
     */
    openActionsMenu(event, subscriptionId) {
        event.stopPropagation();
        const dropdown = document.getElementById(`actions-dropdown-${subscriptionId}`);
        if (dropdown) {
            // Close all other dropdowns
            document.querySelectorAll('.subscription-management__actions-dropdown').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('show');
                }
            });
            dropdown.classList.toggle('show');
        }

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeHandler(e) {
                if (!dropdown.contains(e.target) && !event.target.contains(e.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeHandler);
                }
            });
        }, 0);
    }

    /**
     * View user detail
     */
    viewUserDetail(userId) {
        // Open user detail page in new tab (same pattern as user-management)
        window.open(`/admin/components/user-detail/?id=${userId}`, '_blank');
    }

    /**
     * View in Stripe
     */
    viewInStripe(subscriptionId) {
        window.open(`https://dashboard.stripe.com/subscriptions/${subscriptionId}`, '_blank');
    }

    /**
     * View subscription details
     */
    async viewSubscriptionDetails(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentSubscription = sub;
        this.openDetailModal();
        await this.loadSubscriptionDetails(sub);
    }

    /**
     * Load subscription details for modal
     */
    async loadSubscriptionDetails(sub) {
        // Overview tab
        if (this.elements.modalTabContents.overview) {
            this.elements.modalTabContents.overview.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    <div>
                        <h3 style="margin-bottom: var(--spacing-sm);">${this.t('subscription_details')}</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div><strong>${this.t('subscription_id')}:</strong> ${sub.subscriptionId || 'N/A'}</div>
                            <div><strong>${this.t('plan_name')}:</strong> ${sub.productName}</div>
                            <div><strong>${this.t('status')}:</strong> <span class="subscription-management__status-badge subscription-management__status-badge--${sub.status}">${this.t(sub.status)}</span></div>
                            <div><strong>${this.t('source')}:</strong> ${this.t(sub.source)}</div>
                            <div><strong>${this.t('billing_cycle')}:</strong> ${this.t(sub.billingCycle)}</div>
                        </div>
                    </div>
                    <div>
                        <h3 style="margin-bottom: var(--spacing-sm);">${this.t('user')}</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div><strong>${this.t('user')}:</strong> ${sub.user?.username || 'Unknown'}</div>
                            <div><strong>${this.t('email')}:</strong> ${sub.user?.email || 'N/A'}</div>
                        </div>
                    </div>
                    <div>
                        <h3 style="margin-bottom: var(--spacing-sm);">${this.t('billing')}</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div><strong>${this.t('current_period')}:</strong> ${sub.currentPeriodStart ? this.formatDate(sub.currentPeriodStart) : 'N/A'} - ${sub.currentPeriodEnd ? this.formatDate(sub.currentPeriodEnd) : 'N/A'}</div>
                            <div><strong>${this.t('next_billing')}:</strong> ${sub.currentPeriodEnd ? this.formatDate(sub.currentPeriodEnd) : 'N/A'}</div>
                            <div><strong>${this.t('amount_per_cycle')}:</strong> ${sub.amountPerCycle ? `${sub.currency} ${sub.amountPerCycle.toFixed(2)}` : 'N/A'}</div>
                        </div>
                    </div>
                    <div>
                        <h3 style="margin-bottom: var(--spacing-sm);">${this.t('revenue')}</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div><strong>${this.t('total_paid')}:</strong> ${sub.totalPaid ? `${sub.currency} ${sub.totalPaid.toFixed(2)}` : 'N/A'}</div>
                            <div><strong>${this.t('payment_method')}:</strong> ${sub.paymentMethod === 'stripe' ? 'Card' : this.t('manual')}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Billing history tab
        await this.loadBillingHistory(sub);

        // Events tab
        await this.loadEvents(sub);

        // Modifications tab
        await this.loadModifications(sub);
    }

    /**
     * Load billing history
     */
    async loadBillingHistory(sub) {
        if (!this.elements.modalTabContents.billing) return;

        try {
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Load from product_purchases or service_purchases
            const tableName = sub.productType === 'product' ? 'product_purchases' : 'service_purchases';
            const { data: purchases, error } = await window.supabase
                .from(tableName)
                .select('*')
                .eq('user_id', sub.userId)
                .eq(sub.productType === 'product' ? 'product_id' : 'service_id', sub.productId)
                .order('purchased_at', { ascending: false })
                .limit(50);

            if (error) {
                window.logger?.error('❌ Error loading billing history:', error);
                this.elements.modalTabContents.billing.innerHTML = `<p>${this.t('no_billing_history')}</p>`;
                return;
            }

            if (!purchases || purchases.length === 0) {
                this.elements.modalTabContents.billing.innerHTML = `<p>${this.t('no_billing_history')}</p>`;
                return;
            }

            const historyHtml = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color-primary);">
                            <th style="padding: var(--spacing-sm); text-align: left;">${this.t('date')}</th>
                            <th style="padding: var(--spacing-sm); text-align: left;">${this.t('amount')}</th>
                            <th style="padding: var(--spacing-sm); text-align: left;">${this.t('status')}</th>
                            <th style="padding: var(--spacing-sm); text-align: left;">${this.t('invoice')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(purchase => `
                            <tr style="border-bottom: 1px solid var(--border-color-primary);">
                                <td style="padding: var(--spacing-sm);">${this.formatDate(purchase.purchased_at)}</td>
                                <td style="padding: var(--spacing-sm);">${purchase.currency} ${purchase.amount_paid?.toFixed(2) || '0.00'}</td>
                                <td style="padding: var(--spacing-sm);">${purchase.payment_status || 'N/A'}</td>
                                <td style="padding: var(--spacing-sm);">${purchase.stripe_invoice_id || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            this.elements.modalTabContents.billing.innerHTML = historyHtml;

        } catch (error) {
            window.logger?.error('❌ Error loading billing history:', error);
            this.elements.modalTabContents.billing.innerHTML = `<p>${this.t('no_billing_history')}</p>`;
        }
    }

    /**
     * Load events
     */
    async loadEvents(sub) {
        if (!this.elements.modalTabContents.events) return;

        try {
            // Load from error_logs or admin_activity (simplified - would need proper event tracking)
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // For now, show a placeholder - would need proper event tracking system
            this.elements.modalTabContents.events.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                    <div style="padding: var(--spacing-md); border: 1px solid var(--border-color-primary); border-radius: var(--radius-sm);">
                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${this.formatDate(sub.createdAt)}</div>
                        <div>${this.t('subscription_created') || 'Subscription created'}</div>
                    </div>
                    ${sub.updatedAt && sub.updatedAt !== sub.createdAt ? `
                        <div style="padding: var(--spacing-md); border: 1px solid var(--border-color-primary); border-radius: var(--radius-sm);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${this.formatDate(sub.updatedAt)}</div>
                            <div>${this.t('subscription_updated') || 'Subscription updated'}</div>
                        </div>
                    ` : ''}
                    ${sub.cancelledAt ? `
                        <div style="padding: var(--spacing-md); border: 1px solid var(--border-color-primary); border-radius: var(--radius-sm);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${this.formatDate(sub.cancelledAt)}</div>
                            <div>${this.t('subscription_cancelled') || 'Subscription cancelled'}</div>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (error) {
            window.logger?.error('❌ Error loading events:', error);
            this.elements.modalTabContents.events.innerHTML = `<p>${this.t('no_events')}</p>`;
        }
    }

    /**
     * Load modifications
     */
    async loadModifications(sub) {
        if (!this.elements.modalTabContents.modifications) return;

        try {
            // Load from admin_activity table (if available)
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // For now, show a placeholder - would need proper modification tracking
            this.elements.modalTabContents.modifications.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                    <div style="padding: var(--spacing-md); border: 1px solid var(--border-color-primary); border-radius: var(--radius-sm);">
                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${this.formatDate(sub.createdAt)}</div>
                        <div>${this.t('subscription_created') || 'Subscription created'}</div>
                    </div>
                    ${sub.updatedAt && sub.updatedAt !== sub.createdAt ? `
                        <div style="padding: var(--spacing-md); border: 1px solid var(--border-color-primary); border-radius: var(--radius-sm);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${this.formatDate(sub.updatedAt)}</div>
                            <div>${this.t('subscription_updated') || 'Subscription updated'}</div>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (error) {
            window.logger?.error('❌ Error loading modifications:', error);
            this.elements.modalTabContents.modifications.innerHTML = `<p>${this.t('no_modifications')}</p>`;
        }
    }

    /**
     * Open detail modal
     */
    openDetailModal() {
        if (this.elements.detailModal) {
            this.elements.detailModal.style.display = 'flex';
        }
    }

    /**
     * Close detail modal
     */
    closeDetailModal() {
        if (this.elements.detailModal) {
            this.elements.detailModal.style.display = 'none';
        }
        this.currentSubscription = null;
    }

    /**
     * Switch modal tab
     */
    switchModalTab(tabName) {
        // Update tab buttons
        this.elements.modalTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab contents
        Object.keys(this.elements.modalTabContents).forEach(key => {
            const content = this.elements.modalTabContents[key];
            if (content) {
                if (key === tabName) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            }
        });
    }

    /**
     * Open cancel modal
     */
    openCancelModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'cancel',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('cancel_subscription');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_cancel');
        }
        if (this.elements.confirmModalForm) {
            this.elements.confirmModalForm.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('cancel_immediate')}</label>
                    <input type="radio" name="cancel-type" value="immediate" checked>
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('cancel_at_period_end')}</label>
                    <input type="radio" name="cancel-type" value="period_end">
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('reason')}</label>
                    <textarea name="reason" rows="3" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);"></textarea>
                </div>
            `;
            this.elements.confirmModalForm.style.display = 'block';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmCancel();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm cancel
     */
    async confirmCancel() {
        try {
            const cancelType = document.querySelector('input[name="cancel-type"]:checked')?.value || 'immediate';
            const reason = document.querySelector('textarea[name="reason"]')?.value || '';

            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            const data = await window.invokeEdgeFunction('cancel-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId || this.currentAction.subscriptionId,
                    immediate: cancelType === 'immediate',
                    reason: reason,
                    source: this.currentAction.subscription.source
                }
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to cancel subscription');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error cancelling subscription:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Open refund modal
     */
    openRefundModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'refund',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('refund_and_cancel');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_refund');
        }
        if (this.elements.confirmModalForm) {
            this.elements.confirmModalForm.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('refund_amount')} (${sub.currency})</label>
                    <input type="number" name="refund-amount" step="0.01" min="0" max="${sub.amountPerCycle || 0}" value="${sub.amountPerCycle || 0}" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);">
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('reason')}</label>
                    <textarea name="reason" rows="3" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);"></textarea>
                </div>
            `;
            this.elements.confirmModalForm.style.display = 'block';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmRefund();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm refund
     */
    async confirmRefund() {
        try {
            const refundAmount = parseFloat(document.querySelector('input[name="refund-amount"]')?.value || '0');
            const reason = document.querySelector('textarea[name="reason"]')?.value || '';

            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            // First create refund
            const refundData = await window.invokeEdgeFunction('create-refund', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId,
                    amount: refundAmount,
                    reason: reason
                }
            });

            if (!refundData.success) {
                throw new Error(refundData.error || 'Failed to create refund');
            }

            // Then cancel subscription
            const cancelData = await window.invokeEdgeFunction('cancel-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId,
                    immediate: true,
                    reason: reason
                }
            });

            if (!cancelData.success) {
                throw new Error(cancelData.error || 'Failed to cancel subscription');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error processing refund:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Open extend modal
     */
    openExtendModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'extend',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('extend_subscription');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_extend');
        }
        if (this.elements.confirmModalForm) {
            this.elements.confirmModalForm.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('extension_days')}</label>
                    <input type="number" name="extension-days" min="1" value="30" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);">
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('reason')}</label>
                    <textarea name="reason" rows="3" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);"></textarea>
                </div>
            `;
            this.elements.confirmModalForm.style.display = 'block';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmExtend();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm extend
     */
    async confirmExtend() {
        try {
            const extensionDays = parseInt(document.querySelector('input[name="extension-days"]')?.value || '0');
            const reason = document.querySelector('textarea[name="reason"]')?.value || '';

            if (extensionDays <= 0) {
                throw new Error('Extension days must be greater than 0');
            }

            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            const data = await window.invokeEdgeFunction('extend-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId || this.currentAction.subscriptionId,
                    extension_days: extensionDays,
                    reason: reason,
                    source: this.currentAction.subscription.source
                }
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to extend subscription');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error extending subscription:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Open change plan modal
     */
    openChangePlanModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'change_plan',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('change_plan');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_change_plan');
        }
        if (this.elements.confirmModalForm) {
            // Load available plans (simplified - would need to fetch from products/services)
            this.elements.confirmModalForm.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('new_plan')}</label>
                    <select name="new-plan" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);">
                        <option value="">${this.t('select_plan') || 'Select Plan'}</option>
                        <!-- Would be populated with available plans -->
                    </select>
                </div>
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-sm);">${this.t('proration')}</label>
                    <select name="proration" style="width: 100%; padding: var(--spacing-sm); border: 2px solid var(--border-color-primary); background-color: var(--color-bg-primary); color: var(--color-text-primary); border-radius: var(--radius-sm);">
                        <option value="immediate">${this.t('immediate') || 'Immediate'}</option>
                        <option value="period_end">${this.t('at_period_end') || 'At Period End'}</option>
                    </select>
                </div>
            `;
            this.elements.confirmModalForm.style.display = 'block';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmChangePlan();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm change plan
     */
    async confirmChangePlan() {
        try {
            const newPlanId = document.querySelector('select[name="new-plan"]')?.value;
            const proration = document.querySelector('select[name="proration"]')?.value || 'immediate';

            if (!newPlanId) {
                throw new Error('Please select a new plan');
            }

            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            const data = await window.invokeEdgeFunction('update-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId,
                    new_plan_id: newPlanId,
                    proration: proration
                }
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to change plan');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error changing plan:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Open pause modal
     */
    openPauseModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'pause',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('pause_subscription');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_pause') || 'Are you sure you want to pause this subscription?';
        }
        if (this.elements.confirmModalForm) {
            this.elements.confirmModalForm.style.display = 'none';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmPause();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm pause
     */
    async confirmPause() {
        try {
            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            const data = await window.invokeEdgeFunction('pause-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId
                }
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to pause subscription');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error pausing subscription:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Open resume modal
     */
    openResumeModal(subscriptionId) {
        const sub = this.subscriptions.find(s => s.id === subscriptionId);
        if (!sub) {
            this.showError('Subscription not found');
            return;
        }

        this.currentAction = {
            type: 'resume',
            subscriptionId: subscriptionId,
            subscription: sub
        };

        if (this.elements.confirmModalTitle) {
            this.elements.confirmModalTitle.textContent = this.t('resume_subscription');
        }
        if (this.elements.confirmModalMessage) {
            this.elements.confirmModalMessage.textContent = this.t('confirm_resume') || 'Are you sure you want to resume this subscription?';
        }
        if (this.elements.confirmModalForm) {
            this.elements.confirmModalForm.style.display = 'none';
        }

        if (this.elements.confirmModalConfirm) {
            this.elements.confirmModalConfirm.onclick = () => {
                this.confirmResume();
            };
        }

        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'flex';
        }
    }

    /**
     * Confirm resume
     */
    async confirmResume() {
        try {
            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            const data = await window.invokeEdgeFunction('resume-subscription', {
                body: {
                    subscription_id: this.currentAction.subscription.subscriptionId
                }
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to resume subscription');
            }

            this.showSuccess(this.t('action_success'));
            this.closeConfirmModal();
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error resuming subscription:', error);
            this.showError(error.message || this.t('action_error'));
        }
    }

    /**
     * Close confirm modal
     */
    closeConfirmModal() {
        if (this.elements.confirmModal) {
            this.elements.confirmModal.style.display = 'none';
        }
        this.currentAction = null;
    }

    /**
     * Sync with Stripe
     */
    async syncStripeSubscriptions() {
        try {
            if (!window.invokeEdgeFunction) {
                throw new Error('Edge Function invoker not available');
            }

            if (this.elements.syncStripeButton) {
                this.elements.syncStripeButton.disabled = true;
                this.elements.syncStripeButton.textContent = this.t('syncing') || 'Syncing...';
            }

            const data = await window.invokeEdgeFunction('sync-stripe-subscriptions', {
                body: {}
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to sync with Stripe');
            }

            this.showSuccess(this.t('sync_success'));
            await this.loadSubscriptions();
            this.calculateMetrics();

        } catch (error) {
            window.logger?.error('❌ Error syncing with Stripe:', error);
            this.showError(error.message || this.t('sync_error'));
        } finally {
            if (this.elements.syncStripeButton) {
                this.elements.syncStripeButton.disabled = false;
                this.elements.syncStripeButton.textContent = this.t('sync_with_stripe');
            }
        }
    }

    /**
     * Export subscriptions
     */
    exportSubscriptions() {
        // Simple CSV export
        const headers = ['User', 'Product', 'Status', 'Billing Cycle', 'Amount', 'Status', 'Source', 'Created At'];
        const rows = this.filteredSubscriptions.map(sub => [
            sub.user?.username || 'Unknown',
            sub.productName || 'Unknown',
            sub.status,
            sub.billingCycle,
            sub.amountPerCycle || 0,
            sub.paymentStatus,
            sub.source,
            sub.createdAt
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Update pagination
     */
    updatePagination() {
        const total = this.filteredSubscriptions.length;
        const start = total > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const end = Math.min(this.currentPage * this.itemsPerPage, total);

        if (this.elements.paginationStart) {
            this.elements.paginationStart.textContent = start;
        }
        if (this.elements.paginationEnd) {
            this.elements.paginationEnd.textContent = end;
        }
        if (this.elements.paginationTotal) {
            this.elements.paginationTotal.textContent = total;
        }

        if (this.elements.paginationPrev) {
            this.elements.paginationPrev.disabled = this.currentPage === 1;
        }
        if (this.elements.paginationNext) {
            this.elements.paginationNext.disabled = end >= total;
        }

        if (this.elements.pagination) {
            this.elements.pagination.style.display = total > 0 ? 'flex' : 'none';
        }

        // Pagination event listeners
        if (this.elements.paginationPrev) {
            this.elements.paginationPrev.onclick = () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderSubscriptions();
                    this.updatePagination();
                }
            };
        }

        if (this.elements.paginationNext) {
            this.elements.paginationNext.onclick = () => {
                if (end < total) {
                    this.currentPage++;
                    this.renderSubscriptions();
                    this.updatePagination();
                }
            };
        }
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.loading) {
            this.elements.loading.style.display = 'block';
        }
        this.hideError();
        this.hideEmpty();
        this.hideTable();
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        if (this.elements.errorText) {
            this.elements.errorText.textContent = message;
        }
        if (this.elements.error) {
            this.elements.error.style.display = 'block';
        }
        this.hideLoading();
        this.hideEmpty();
        this.hideTable();
    }

    /**
     * Hide error state
     */
    hideError() {
        if (this.elements.error) {
            this.elements.error.style.display = 'none';
        }
    }

    /**
     * Show empty state
     */
    showEmpty() {
        if (this.elements.empty) {
            this.elements.empty.style.display = 'block';
        }
        this.hideLoading();
        this.hideError();
        this.hideTable();
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        if (this.elements.empty) {
            this.elements.empty.style.display = 'none';
        }
    }

    /**
     * Show table
     */
    showTable() {
        if (this.elements.table) {
            this.elements.table.style.display = 'table';
        }
    }

    /**
     * Hide table
     */
    hideTable() {
        if (this.elements.table) {
            this.elements.table.style.display = 'none';
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Simple alert for now, could be enhanced with a proper notification system
        alert(`✅ ${message}`);
    }
}

// Export class
window.SubscriptionManagement = SubscriptionManagement;

// Create global instance
window.subscriptionManagementComponent = new SubscriptionManagement();

} // End of SubscriptionManagement class wrapper

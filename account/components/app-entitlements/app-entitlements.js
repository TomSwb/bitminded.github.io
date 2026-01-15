/**
 * App Entitlements Component
 * Displays the current user's app and product entitlements
 */

if (typeof window.AppEntitlements === 'undefined') {
class AppEntitlements {
    constructor() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.entitlements = [];
        this.purchases = [];
        this.productMap = {};
        this.serviceMap = {};
        this.elements = {};
        this.translations = null;
        this.currentLanguage = 'en';
    }

    /**
     * Initialize the component
     */
    async init() {
        if (this.isInitialized) {
            window.logger?.log('✅ App Entitlements already initialized');
            return;
        }

        try {
            // Get current user
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('User not authenticated');
            }

            this.currentUserId = user.id;

            // Load translations
            await this.loadTranslations();

            // Initialize elements
            this.initializeElements();

            // Make translatable content visible
            this.showTranslatableContent();

            // Load products and services
            await this.loadProducts();
            await this.loadServices();

            // Load entitlements and purchases
            await this.loadEntitlements();
            await this.loadPurchases();

            this.isInitialized = true;
            window.logger?.log('✅ App Entitlements initialized');

        } catch (error) {
            window.logger?.error('❌ App Entitlements: Failed to initialize:', error);
            this.showError('Failed to initialize app entitlements');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Table
            table: document.getElementById('entitlements-table'),
            tableBody: document.getElementById('entitlements-table-body'),
            tableContainer: document.getElementById('entitlements-table-container'),
            empty: document.getElementById('entitlements-empty'),
            loading: document.getElementById('entitlements-loading'),
            error: document.getElementById('entitlements-error'),
            errorText: document.getElementById('entitlements-error-text')
        };
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            this.currentLanguage = localStorage.getItem('language') || 'en';
            const response = await fetch('/account/components/app-entitlements/locales/app-entitlements-locales.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            
            this.translations = await response.json();
            
            // Add translations to i18next if available
            if (window.i18next && typeof window.i18next.addResourceBundle === 'function') {
                try {
                    Object.keys(this.translations).forEach(lang => {
                        window.i18next.addResourceBundle(
                            lang,
                            'translation',
                            this.translations[lang].translation,
                            true,
                            true
                        );
                    });
                } catch (i18nextError) {
                    window.logger?.warn('⚠️ Could not add to i18next:', i18nextError);
                }
            }
        } catch (error) {
            window.logger?.warn('⚠️ Failed to load app entitlements translations:', error);
            this.translations = {};
        }
    }

    /**
     * Get translation for a key
     */
    getTranslation(key) {
        // Try i18next first if available
        if (window.i18next && typeof window.i18next.t === 'function') {
            const i18nTranslation = window.i18next.t(key);
            if (i18nTranslation && i18nTranslation !== key) {
                return i18nTranslation;
            }
        }
        
        // Fallback to loaded translations
        if (this.translations && this.translations[this.currentLanguage]) {
            return this.translations[this.currentLanguage].translation[key] || key;
        }
        
        // Return key as fallback
        return key;
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const container = document.getElementById('app-entitlements');
        if (!container) return;

        const translatableElements = container.querySelectorAll('.translatable-content[data-translation-key]');
        translatableElements.forEach(el => {
            const key = el.getAttribute('data-translation-key');
            if (key) {
                el.classList.add('loaded');
                const translation = this.getTranslation(key);
                if (translation && translation !== key) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = translation;
                    } else {
                        el.textContent = translation;
                    }
                } else if (!translation || translation === key) {
                    if (el.textContent.trim() === '') {
                        el.textContent = key;
                    }
                    el.classList.add('loaded');
                }
            }
        });
    }

    /**
     * Load products from database
     */
    async loadProducts() {
        try {
            if (!window.supabase) {
                this.productMap = {};
                return;
            }

            const { data, error } = await window.supabase
                .from('products')
                .select('id, name, slug, status')
                .order('name', { ascending: true });

            if (error) {
                window.logger?.error('❌ Error loading products:', error);
                this.productMap = {};
                return;
            }

            this.productMap = {};
            (data || []).forEach(p => {
                const slug = p.slug || p.id;
                if (slug) {
                    this.productMap[slug] = {
                        id: p.id,
                        name: p.name || 'Unnamed Product',
                        slug: slug,
                        status: p.status
                    };
                }
            });

            // Also add 'all' to the map
            this.productMap['all'] = {
                id: 'all',
                name: this.getTranslation('All Products') || 'All Products',
                slug: 'all',
                status: 'active'
            };

        } catch (error) {
            window.logger?.error('❌ Failed to load products:', error);
            this.productMap = {};
        }
    }

    /**
     * Load services from database
     */
    async loadServices() {
        try {
            if (!window.supabase) {
                this.serviceMap = {};
                return;
            }

            const { data, error } = await window.supabase
                .from('services')
                .select('id, name, slug, status')
                .order('name', { ascending: true });

            if (error) {
                window.logger?.error('❌ Error loading services:', error);
                this.serviceMap = {};
                return;
            }

            this.serviceMap = {};
            (data || []).forEach(s => {
                const slug = s.slug || s.id;
                if (slug) {
                    this.serviceMap[slug] = {
                        id: s.id,
                        name: s.name || 'Unnamed Service',
                        slug: slug,
                        status: s.status
                    };
                }
            });

        } catch (error) {
            window.logger?.error('❌ Failed to load services:', error);
            this.serviceMap = {};
        }
    }

    /**
     * Load entitlements for the current user
     */
    async loadEntitlements() {
        try {
            this.showLoading(true);
            this.hideError();

            if (!window.supabase || !this.currentUserId) {
                throw new Error('Supabase or user ID not available');
            }

            // Fetch entitlements for this user
            const { data, error } = await window.supabase
                .from('entitlements')
                .select(`
                    id,
                    user_id,
                    app_id,
                    active,
                    expires_at,
                    created_at,
                    updated_at,
                    grant_type,
                    grant_reason
                `)
                .eq('user_id', this.currentUserId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            this.entitlements = data || [];
            this.renderAll();

            this.showLoading(false);

        } catch (error) {
            window.logger?.error('❌ Failed to load entitlements:', error);
            this.showError(this.getTranslation('Failed to load entitlements') || 'Failed to load entitlements');
            this.showLoading(false);
        }
    }

    /**
     * Load purchases for the current user
     */
    async loadPurchases() {
        try {
            if (!window.supabase || !this.currentUserId) {
                this.purchases = [];
                return;
            }

            // Fetch product purchases
            const { data: productPurchases, error: productError } = await window.supabase
                .from('product_purchases')
                .select(`
                    id,
                    user_id,
                    product_id,
                    purchase_type,
                    status,
                    payment_status,
                    amount_paid,
                    currency,
                    subscription_interval,
                    purchased_at,
                    expires_at,
                    current_period_end,
                    is_trial,
                    trial_end,
                    products!inner(id, name, slug)
                `)
                .eq('user_id', this.currentUserId)
                .eq('status', 'active')
                .order('purchased_at', { ascending: false });

            if (productError) {
                window.logger?.warn('⚠️ Error loading product purchases:', productError);
            }

            // Fetch service purchases
            const { data: servicePurchases, error: serviceError } = await window.supabase
                .from('service_purchases')
                .select(`
                    id,
                    user_id,
                    service_id,
                    purchase_type,
                    status,
                    payment_status,
                    amount_paid,
                    currency,
                    subscription_interval,
                    purchased_at,
                    expires_at,
                    current_period_end,
                    is_trial,
                    trial_end,
                    services!inner(id, name, slug)
                `)
                .eq('user_id', this.currentUserId)
                .eq('status', 'active')
                .order('purchased_at', { ascending: false });

            if (serviceError) {
                window.logger?.warn('⚠️ Error loading service purchases:', serviceError);
            }

            // Combine and format purchases
            this.purchases = [];
            
            if (productPurchases) {
                productPurchases.forEach(p => {
                    this.purchases.push({
                        id: p.id,
                        type: 'product',
                        product_id: p.product_id,
                        service_id: null,
                        app_id: p.products?.slug || null,
                        product_name: p.products?.name || 'Unknown Product',
                        purchase_type: p.purchase_type,
                        status: p.status,
                        payment_status: p.payment_status,
                        amount_paid: p.amount_paid,
                        currency: p.currency,
                        subscription_interval: p.subscription_interval,
                        purchased_at: p.purchased_at,
                        expires_at: p.expires_at,
                        current_period_end: p.current_period_end,
                        is_trial: p.is_trial,
                        trial_end: p.trial_end,
                        source: 'purchase'
                    });
                });
            }

            if (servicePurchases) {
                servicePurchases.forEach(s => {
                    this.purchases.push({
                        id: s.id,
                        type: 'service',
                        product_id: null,
                        service_id: s.service_id,
                        app_id: s.services?.slug || null,
                        product_name: s.services?.name || 'Unknown Service',
                        purchase_type: s.purchase_type,
                        status: s.status,
                        payment_status: s.payment_status,
                        amount_paid: s.amount_paid,
                        currency: s.currency,
                        subscription_interval: s.subscription_interval,
                        purchased_at: s.purchased_at,
                        expires_at: s.expires_at,
                        current_period_end: s.current_period_end,
                        is_trial: s.is_trial,
                        trial_end: s.trial_end,
                        source: 'purchase'
                    });
                });
            }

        } catch (error) {
            window.logger?.error('❌ Failed to load purchases:', error);
            this.purchases = [];
        }
    }

    /**
     * Render entitlements and purchases in the table
     */
    renderAll() {
        if (!this.elements.tableBody) return;

        this.elements.tableBody.innerHTML = '';

        // Combine entitlements and purchases
        const allItems = [];

        // Add entitlements (admin grants)
        this.entitlements.forEach(e => {
            allItems.push({
                ...e,
                source: 'admin_grant',
                product_name: e.app_id === 'all' 
                    ? (this.getTranslation('All Products') || 'All Products')
                    : (this.productMap[e.app_id]?.name || e.app_id || 'Unknown Product')
            });
        });

        // Add purchases (convert to entitlement-like format)
        this.purchases.forEach(p => {
            // Map purchase type to grant_type
            let grantType = 'subscription';
            if (p.purchase_type === 'one_time') {
                grantType = 'lifetime';
            } else if (p.purchase_type === 'trial' || p.is_trial) {
                grantType = 'trial';
            } else if (p.purchase_type === 'subscription') {
                grantType = 'subscription';
            }

            // Determine expiration
            let expiresAt = p.expires_at || p.current_period_end || null;
            if (grantType === 'lifetime') {
                expiresAt = null;
            } else if (grantType === 'trial' && p.trial_end) {
                expiresAt = p.trial_end;
            }

            // Check if active
            const isActive = p.status === 'active' && p.payment_status === 'succeeded';

            allItems.push({
                id: p.id,
                app_id: p.app_id,
                active: isActive,
                expires_at: expiresAt,
                created_at: p.purchased_at,
                grant_type: grantType,
                source: 'purchase',
                product_name: p.product_name,
                purchase_type: p.purchase_type,
                subscription_interval: p.subscription_interval,
                amount_paid: p.amount_paid,
                currency: p.currency,
                current_period_end: p.current_period_end
            });
        });

        // Remove duplicates (if purchase has corresponding entitlement, prefer purchase for more details)
        const uniqueItems = [];
        const seenAppIds = new Set();
        
        // First add purchases (they have more detail)
        allItems.forEach(item => {
            if (item.source === 'purchase' && item.app_id) {
                if (!seenAppIds.has(item.app_id)) {
                    uniqueItems.push(item);
                    seenAppIds.add(item.app_id);
                }
            }
        });

        // Then add entitlements that don't have purchases
        allItems.forEach(item => {
            if (item.source === 'admin_grant' && item.app_id) {
                if (!seenAppIds.has(item.app_id)) {
                    uniqueItems.push(item);
                    seenAppIds.add(item.app_id);
                }
            }
        });

        if (uniqueItems.length === 0) {
            this.showEmpty(true);
            this.showTable(false);
            return;
        }

        this.showEmpty(false);
        this.showTable(true);

        uniqueItems.forEach(item => {
            const row = this.createEntitlementRow(item);
            this.elements.tableBody.appendChild(row);
        });

        // Update translations for dynamically generated content
        this.showTranslatableContent();
    }

    /**
     * Create a table row for an entitlement
     */
    createEntitlementRow(entitlement) {
        const row = document.createElement('tr');
        row.className = 'app-entitlements__table-row';

        // Product name
        const productCell = document.createElement('td');
        productCell.className = 'app-entitlements__table-cell';
        const productName = entitlement.app_id === 'all' 
            ? (this.getTranslation('All Products') || 'All Products')
            : (this.productMap[entitlement.app_id]?.name || entitlement.app_id || 'Unknown Product');
        productCell.innerHTML = `<strong>${this.escapeHtml(productName)}</strong>`;
        row.appendChild(productCell);

        // Source (Purchase vs Admin Grant)
        const sourceCell = document.createElement('td');
        sourceCell.className = 'app-entitlements__table-cell';
        const source = entitlement.source || 'admin_grant';
        const sourceText = source === 'purchase' 
            ? (this.getTranslation('Purchase') || 'Purchase')
            : (this.getTranslation('Admin Grant') || 'Admin Grant');
        const sourceClass = source === 'purchase' 
            ? 'app-entitlements__badge--purchase'
            : 'app-entitlements__badge--admin';
        sourceCell.innerHTML = `<span class="app-entitlements__badge ${sourceClass}">${this.escapeHtml(sourceText)}</span>`;
        row.appendChild(sourceCell);

        // Grant type
        const grantTypeCell = document.createElement('td');
        grantTypeCell.className = 'app-entitlements__table-cell';
        const grantType = entitlement.grant_type || 'manual';
        const grantTypeText = this.getTranslation(this.capitalizeFirst(grantType)) || this.capitalizeFirst(grantType);
        grantTypeCell.innerHTML = `<span class="app-entitlements__badge">${this.escapeHtml(grantTypeText)}</span>`;
        row.appendChild(grantTypeCell);

        // Status
        const statusCell = document.createElement('td');
        statusCell.className = 'app-entitlements__table-cell';
        const isActive = entitlement.active && this.isNotExpired(entitlement.expires_at);
        const statusClass = isActive ? 'app-entitlements__badge--active' : 'app-entitlements__badge--inactive';
        const statusText = isActive 
            ? (this.getTranslation('Active') || 'Active')
            : (this.getTranslation('Inactive') || 'Inactive');
        statusCell.innerHTML = `<span class="app-entitlements__badge ${statusClass}">${this.escapeHtml(statusText)}</span>`;
        row.appendChild(statusCell);

        // Granted date / Purchase date
        const grantedDateCell = document.createElement('td');
        grantedDateCell.className = 'app-entitlements__table-cell';
        const grantedDate = entitlement.created_at ? new Date(entitlement.created_at) : null;
        if (grantedDate) {
            grantedDateCell.textContent = this.formatDate(grantedDate);
            // For purchases, show additional info if subscription
            if (entitlement.source === 'purchase' && entitlement.subscription_interval) {
                const intervalText = entitlement.subscription_interval === 'monthly' 
                    ? (this.getTranslation('Monthly') || 'Monthly')
                    : entitlement.subscription_interval === 'yearly'
                    ? (this.getTranslation('Yearly') || 'Yearly')
                    : entitlement.subscription_interval;
                grantedDateCell.innerHTML += `<br><small class="app-entitlements__subscription-info">${this.escapeHtml(intervalText)}</small>`;
            }
        } else {
            grantedDateCell.textContent = '-';
        }
        row.appendChild(grantedDateCell);

        // Expiration / Next billing
        const expirationCell = document.createElement('td');
        expirationCell.className = 'app-entitlements__table-cell';
        if (!entitlement.expires_at) {
            const lifetimeText = this.getTranslation('Lifetime') || 'Never';
            expirationCell.innerHTML = `<span class="app-entitlements__badge">${this.escapeHtml(lifetimeText)}</span>`;
        } else {
            const expDate = new Date(entitlement.expires_at);
            const now = new Date();
            const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntil < 0) {
                const expiredText = this.getTranslation('Expired') || 'Expired';
                expirationCell.innerHTML = `<span class="app-entitlements__badge app-entitlements__badge--expired">${this.escapeHtml(expiredText)}</span>`;
            } else if (daysUntil < 7) {
                expirationCell.innerHTML = `<span class="app-entitlements__badge app-entitlements__badge--warning">${daysUntil} ${this.getTranslation('days') || 'days'}</span>`;
            } else {
                expirationCell.textContent = this.formatDate(expDate);
            }
            // For subscriptions, show "Next billing" label
            if (entitlement.source === 'purchase' && entitlement.purchase_type === 'subscription' && entitlement.current_period_end) {
                const nextBillingDate = new Date(entitlement.current_period_end);
                const nextBillingText = this.getTranslation('Next billing') || 'Next billing';
                expirationCell.innerHTML += `<br><small class="app-entitlements__subscription-info">${this.escapeHtml(nextBillingText)}: ${this.formatDate(nextBillingDate)}</small>`;
            }
        }
        row.appendChild(expirationCell);

        // Access link
        const accessCell = document.createElement('td');
        accessCell.className = 'app-entitlements__table-cell';
        if (entitlement.app_id && entitlement.app_id !== 'all' && isActive) {
            const productSlug = entitlement.app_id;
            const link = document.createElement('a');
            link.href = `https://${productSlug}.bitminded.ch`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'app-entitlements__access-link';
            link.textContent = this.getTranslation('Open App') || 'Open App';
            link.innerHTML = `${this.getTranslation('Open App') || 'Open App'} →`;
            accessCell.appendChild(link);
        } else if (entitlement.app_id === 'all' && isActive) {
            const link = document.createElement('a');
            link.href = '/account?section=apps';
            link.className = 'app-entitlements__access-link';
            link.textContent = this.getTranslation('View All') || 'View All';
            accessCell.appendChild(link);
        } else {
            accessCell.textContent = '-';
        }
        row.appendChild(accessCell);

        return row;
    }

    /**
     * Check if entitlement is not expired
     */
    isNotExpired(expiresAt) {
        if (!expiresAt) return true; // No expiration = lifetime
        const expDate = new Date(expiresAt);
        const now = new Date();
        return expDate > now;
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        if (!date || !(date instanceof Date)) return '-';
        return date.toLocaleDateString(this.currentLanguage, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        if (this.elements.loading) {
            if (show) {
                this.elements.loading.classList.remove('app-entitlements__loading--hidden');
            } else {
                this.elements.loading.classList.add('app-entitlements__loading--hidden');
            }
        }
    }

    /**
     * Show/hide empty state
     */
    showEmpty(show) {
        if (this.elements.empty) {
            if (show) {
                this.elements.empty.classList.remove('app-entitlements__empty--hidden');
            } else {
                this.elements.empty.classList.add('app-entitlements__empty--hidden');
            }
        }
    }

    /**
     * Show/hide table
     */
    showTable(show) {
        if (this.elements.table) {
            if (show) {
                this.elements.table.classList.remove('app-entitlements__table--hidden');
            } else {
                this.elements.table.classList.add('app-entitlements__table--hidden');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.elements.error && this.elements.errorText) {
            this.elements.errorText.textContent = message;
            this.elements.error.classList.remove('app-entitlements__error--hidden');
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.elements.error) {
            this.elements.error.classList.add('app-entitlements__error--hidden');
        }
    }
}

// Register globally
window.AppEntitlements = AppEntitlements;
}


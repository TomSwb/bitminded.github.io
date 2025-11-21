/**
 * User Access Management Component
 * Manages access grants for a specific user in the user detail page
 */

if (typeof window.UserAccessManagement === 'undefined') {
class UserAccessManagement {
    constructor() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.currentUser = null;
        this.entitlements = [];
        this.products = [];
        this.productMap = {};
        this.productSearchTimeout = null;
        this.currentGrantId = null;
        this.elements = {};
        this.translations = null;
        this.currentLanguage = 'en';
    }

    /**
     * Initialize the component
     */
    async init(userId, userData = null) {
        if (this.isInitialized && this.currentUserId === userId) {
            window.logger?.log('✅ User Access Management already initialized for this user');
            return;
        }

        try {
            this.currentUserId = userId;
            this.currentUser = userData;

            // Load translations
            await this.loadTranslations();

            // Initialize elements
            this.initializeElements();

            // Make translatable content visible
            this.showTranslatableContent();

            // Load products
            await this.loadProducts();

            // Load entitlements
            await this.loadEntitlements();

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            window.logger?.log('✅ User Access Management initialized');

        } catch (error) {
            window.logger?.error('❌ User Access Management: Failed to initialize:', error);
            this.showError('Failed to initialize access management');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Table
            table: document.getElementById('access-table'),
            tableBody: document.getElementById('access-table-body'),
            tableContainer: document.getElementById('access-table-container'),
            empty: document.getElementById('access-empty'),
            loading: document.getElementById('access-loading'),
            error: document.getElementById('access-error'),
            errorText: document.getElementById('access-error-text'),

            // Grant modal
            grantModal: document.getElementById('grant-access-modal'),
            grantModalClose: document.getElementById('grant-modal-close'),
            grantModalCancel: document.getElementById('grant-modal-cancel'),
            grantAccessForm: document.getElementById('grant-access-form'),
            grantUserDisplay: document.getElementById('grant-user-display'),
            grantUserId: document.getElementById('grant-user-id'),
            grantProductSelect: document.getElementById('grant-product-select'),
            grantProductId: document.getElementById('grant-product-id'),
            productSuggestions: document.getElementById('product-suggestions'),
            selectedProductDisplay: document.getElementById('selected-product-display'),
            grantExpirationType: document.getElementById('grant-expiration-type'),
            grantExpirationDate: document.getElementById('grant-expiration-date'),
            grantExpirationDuration: document.getElementById('grant-expiration-duration'),
            grantReason: document.getElementById('grant-reason'),
            grantSendNotification: document.getElementById('grant-send-notification'),

            // Revoke modal
            revokeModal: document.getElementById('revoke-access-modal'),
            revokeModalClose: document.getElementById('revoke-modal-close'),
            revokeModalCancel: document.getElementById('revoke-modal-cancel'),
            revokeAccessForm: document.getElementById('revoke-access-form'),
            revokeInfo: document.getElementById('revoke-info'),
            revokeReason: document.getElementById('revoke-reason'),
            revokeSendNotification: document.getElementById('revoke-send-notification')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Grant modal
        if (this.elements.grantModalClose) {
            this.elements.grantModalClose.addEventListener('click', () => this.closeGrantModal());
        }
        if (this.elements.grantModalCancel) {
            this.elements.grantModalCancel.addEventListener('click', () => this.closeGrantModal());
        }
        if (this.elements.grantAccessForm) {
            this.elements.grantAccessForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGrantAccess();
            });
        }

        // Revoke modal
        if (this.elements.revokeModalClose) {
            this.elements.revokeModalClose.addEventListener('click', () => this.closeRevokeModal());
        }
        if (this.elements.revokeModalCancel) {
            this.elements.revokeModalCancel.addEventListener('click', () => this.closeRevokeModal());
        }
        if (this.elements.revokeAccessForm) {
            this.elements.revokeAccessForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRevokeAccess();
            });
        }

        // Product search
        if (this.elements.grantProductSelect) {
            this.elements.grantProductSelect.addEventListener('input', (e) => {
                this.handleProductSearch(e.target.value);
            });

            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-access-management__form-group')) {
                    if (this.elements.productSuggestions) {
                        this.elements.productSuggestions.innerHTML = '';
                        this.elements.productSuggestions.style.display = 'none';
                        this.elements.productSuggestions.classList.add('hidden');
                    }
                }
            });
        }

        // Reason templates
        const templateButtons = document.querySelectorAll('.user-access-management__template-btn');
        templateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.closest('.user-access-management__template-btn').dataset.template;
                if (this.elements.grantReason) {
                    this.elements.grantReason.value = template;
                }
            });
        });

        // Expiration type toggle - use event delegation to work when modal is moved
        document.addEventListener('change', (e) => {
            if (e.target.matches('#grant-access-modal #grant-expiration-type')) {
                if (e.target.value === 'date') {
                    const dateInput = document.getElementById('grant-expiration-date');
                    const durationSelect = document.getElementById('grant-expiration-duration');
                    if (dateInput) {
                        dateInput.classList.remove('hidden');
                    }
                    if (durationSelect) {
                        durationSelect.classList.add('hidden');
                    }
                } else {
                    const dateInput = document.getElementById('grant-expiration-date');
                    const durationSelect = document.getElementById('grant-expiration-duration');
                    if (dateInput) {
                        dateInput.classList.add('hidden');
                    }
                    if (durationSelect) {
                        durationSelect.classList.remove('hidden');
                    }
                }
            }
        });

        // Grant type radio change (hide expiration for lifetime) - use event delegation
        // This works even when modal is moved to document.body
        document.addEventListener('change', (e) => {
            if (e.target.matches('#grant-access-modal input[name="grant-type"]')) {
                const expirationGroup = document.getElementById('expiration-group');
                if (expirationGroup) {
                    if (e.target.value === 'lifetime') {
                        expirationGroup.style.display = 'none';
                    } else {
                        expirationGroup.style.display = 'block';
                    }
                }
            }
        });

        // Click outside to close modals
        if (this.elements.grantModal) {
            this.elements.grantModal.addEventListener('click', (e) => {
                if (e.target === this.elements.grantModal) {
                    this.closeGrantModal();
                }
            });
        }
        if (this.elements.revokeModal) {
            this.elements.revokeModal.addEventListener('click', (e) => {
                if (e.target === this.elements.revokeModal) {
                    this.closeRevokeModal();
                }
            });
        }
    }

    /**
     * Load products from database
     */
    async loadProducts() {
        try {
            if (!window.supabase) {
                this.products = ['all'];
                this.productMap = {};
                return;
            }

            const { data, error } = await window.supabase
                .from('products')
                .select('id, name, slug, status')
                .order('name', { ascending: true });

            if (error) {
                window.logger?.error('❌ Error loading products:', error);
                this.products = ['all'];
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

            const productSlugs = (data || [])
                .map(p => p.slug || p.id)
                .filter(slug => slug);
            
            this.products = ['all', ...productSlugs];

        } catch (error) {
            window.logger?.error('❌ Failed to load products:', error);
            this.products = ['all'];
            this.productMap = {};
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
                    granted_by,
                    grant_type,
                    grant_reason
                `)
                .eq('user_id', this.currentUserId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Fetch user profiles for granted_by
            const grantedByUserIds = [...new Set((data || []).map(e => e.granted_by).filter(Boolean))];
            let grantedByUsers = {};
            
            if (grantedByUserIds.length > 0) {
                const { data: userProfiles, error: userError } = await window.supabase
                    .from('user_profiles')
                    .select('id, username, avatar_url')
                    .in('id', grantedByUserIds);

                if (!userError && userProfiles) {
                    userProfiles.forEach(user => {
                        grantedByUsers[user.id] = user;
                    });
                }
            }

            // Enrich entitlements with granted_by user data
            this.entitlements = (data || []).map(entitlement => {
                const status = !entitlement.active ? 'revoked' : 
                              (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) ? 'expired' : 
                              'active';
                
                return {
                    ...entitlement,
                    status,
                    grantedByAdmin: grantedByUsers[entitlement.granted_by] || null
                };
            });

            this.displayEntitlements();

        } catch (error) {
            window.logger?.error('❌ Failed to load entitlements:', error);
            this.showError('Failed to load entitlements: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display entitlements in table
     */
    displayEntitlements() {
        if (!this.elements.tableBody) return;

        this.elements.tableBody.innerHTML = '';

        if (this.entitlements.length === 0) {
            this.showEmpty(true);
            this.hideTable();
            return;
        }

        this.showEmpty(false);
        this.showTable();

        this.entitlements.forEach(entitlement => {
            const row = this.createEntitlementRow(entitlement);
            this.elements.tableBody.appendChild(row);
        });
    }

    /**
     * Create entitlement table row
     */
    createEntitlementRow(entitlement) {
        const row = document.createElement('tr');
        row.className = 'user-access-management__table-row';

        // Product
        const productCell = document.createElement('td');
        productCell.className = 'user-access-management__table-cell';
        const productName = entitlement.app_id && this.productMap[entitlement.app_id] 
            ? this.productMap[entitlement.app_id].name 
            : (entitlement.app_id || '-');
        productCell.textContent = productName;

        // Grant Type
        const grantTypeCell = document.createElement('td');
        grantTypeCell.className = 'user-access-management__table-cell';
        const grantType = entitlement.grant_type || 'manual';
        const translatedGrantType = this.getTranslation(this.capitalizeFirst(grantType)) || this.capitalizeFirst(grantType);
        grantTypeCell.innerHTML = `<span class="user-access-management__badge user-access-management__badge--${grantType}">${translatedGrantType}</span>`;

        // Status
        const statusCell = document.createElement('td');
        statusCell.className = 'user-access-management__table-cell';
        const translatedStatus = this.getTranslation(entitlement.status) || this.capitalizeFirst(entitlement.status);
        statusCell.innerHTML = `<span class="user-access-management__badge user-access-management__badge--${entitlement.status}">${translatedStatus}</span>`;

        // Granted By
        const grantedByCell = document.createElement('td');
        grantedByCell.className = 'user-access-management__table-cell';
        grantedByCell.textContent = entitlement.grantedByAdmin?.username || 'System';

        // Granted Date
        const grantedDateCell = document.createElement('td');
        grantedDateCell.className = 'user-access-management__table-cell';
        grantedDateCell.textContent = this.formatDate(entitlement.created_at);

        // Expiration
        const expirationCell = document.createElement('td');
        expirationCell.className = 'user-access-management__table-cell';
        if (!entitlement.expires_at) {
            const neverText = this.getTranslation('Lifetime') || 'Never';
            expirationCell.innerHTML = `<span class="user-access-management__badge">${neverText}</span>`;
        } else {
            const expDate = new Date(entitlement.expires_at);
            const now = new Date();
            const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntil < 0) {
                const expiredText = this.getTranslation('expired') || 'Expired';
                expirationCell.innerHTML = `<span class="user-access-management__badge user-access-management__badge--expired">${expiredText}</span>`;
            } else if (daysUntil < 7) {
                expirationCell.innerHTML = `<span class="user-access-management__badge user-access-management__badge--warning">${daysUntil} days</span>`;
            } else {
                expirationCell.textContent = this.formatDate(entitlement.expires_at);
            }
        }

        // Reason
        const reasonCell = document.createElement('td');
        reasonCell.className = 'user-access-management__table-cell';
        reasonCell.textContent = entitlement.grant_reason ? (entitlement.grant_reason.length > 50 ? entitlement.grant_reason.substring(0, 50) + '...' : entitlement.grant_reason) : '-';

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'user-access-management__table-cell';
        
        let actionButtons = '';
        if (entitlement.status === 'active') {
            const revokeText = this.getTranslation('Revoke Access') || 'Revoke';
            actionButtons = `
                <button class="user-access-management__action-btn user-access-management__action-btn--revoke" data-action="revoke" data-entitlement-id="${entitlement.id}" title="Revoke Access" type="button">
                    ${revokeText}
                </button>
            `;
        } else if (entitlement.status === 'revoked') {
            const regrantText = this.getTranslation('Regrant') || 'Regrant';
            const deleteText = this.getTranslation('Delete') || 'Delete';
            actionButtons = `
                <button class="user-access-management__action-btn user-access-management__action-btn--regrant" data-action="regrant" data-entitlement-id="${entitlement.id}" title="Regrant Access" type="button">
                    ${regrantText}
                </button>
                <button class="user-access-management__action-btn user-access-management__action-btn--delete" data-action="delete" data-entitlement-id="${entitlement.id}" title="Delete Entitlement" type="button">
                    ${deleteText}
                </button>
            `;
        }
        
        actionsCell.innerHTML = `
            <div class="user-access-management__actions">
                ${actionButtons}
            </div>
        `;
        
        // Add click handlers
        const revokeButton = actionsCell.querySelector('[data-action="revoke"]');
        if (revokeButton) {
            revokeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRevokeModal(entitlement);
            });
        }
        
        const regrantButton = actionsCell.querySelector('[data-action="regrant"]');
        if (regrantButton) {
            regrantButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRegrantAccess(entitlement);
            });
        }
        
        const deleteButton = actionsCell.querySelector('[data-action="delete"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteEntitlement(entitlement);
            });
        }

        row.appendChild(productCell);
        row.appendChild(grantTypeCell);
        row.appendChild(statusCell);
        row.appendChild(grantedByCell);
        row.appendChild(grantedDateCell);
        row.appendChild(expirationCell);
        row.appendChild(reasonCell);
        row.appendChild(actionsCell);

        return row;
    }

    /**
     * Open grant access modal
     */
    openGrantModal() {
        if (!this.elements.grantModal) {
            window.logger?.error('❌ Grant modal element not found!');
            return;
        }

        // Pre-fill user info
        if (this.elements.grantUserId && this.currentUserId) {
            this.elements.grantUserId.value = this.currentUserId;
        }
        if (this.elements.grantUserDisplay && this.currentUser) {
            const username = this.currentUser.username || 'Unknown';
            const email = this.currentUser.email || '';
            this.elements.grantUserDisplay.innerHTML = `
                <div class="user-access-management__selected-user-info">
                    <strong>${username}</strong>
                    ${email ? `<div>${email}</div>` : ''}
                </div>
            `;
        }

        // Reset form
        if (this.elements.grantAccessForm) {
            this.elements.grantAccessForm.reset();
        }
        if (this.elements.selectedProductDisplay) {
            this.elements.selectedProductDisplay.innerHTML = '';
        }
        if (this.elements.grantProductId) {
            this.elements.grantProductId.value = '';
        }
        if (this.elements.grantProductSelect) {
            this.elements.grantProductSelect.value = '';
        }

        // Reset expiration group visibility (default is manual, so show expiration)
        const expirationGroup = document.getElementById('expiration-group');
        if (expirationGroup) {
            expirationGroup.style.display = 'block';
        }
        // Reset expiration type to date (default)
        if (this.elements.grantExpirationType) {
            this.elements.grantExpirationType.value = 'date';
        }
        // Show date input, hide duration input
        if (this.elements.grantExpirationDate) {
            this.elements.grantExpirationDate.classList.remove('hidden');
        }
        if (this.elements.grantExpirationDuration) {
            this.elements.grantExpirationDuration.classList.add('hidden');
        }

        // Move modal to body for proper positioning
        if (this.elements.grantModal.parentElement !== document.body) {
            document.body.appendChild(this.elements.grantModal);
        }
        
        this.elements.grantModal.classList.add('open');
        this.elements.grantModal.style.display = 'flex';
        this.elements.grantModal.style.position = 'fixed';
        this.elements.grantModal.style.top = '0';
        this.elements.grantModal.style.left = '0';
        this.elements.grantModal.style.width = '100vw';
        this.elements.grantModal.style.height = '100vh';
        this.elements.grantModal.style.zIndex = '9999';
        this.elements.grantModal.style.margin = '0';
        this.elements.grantModal.style.padding = '0';
        
        // Update translations for modal content
        setTimeout(() => this.showTranslatableContent(), 100);
    }

    /**
     * Close grant access modal
     */
    closeGrantModal() {
        if (this.elements.grantModal) {
            this.elements.grantModal.classList.remove('open');
            this.elements.grantModal.style.display = 'none';
            const container = document.getElementById('user-access-management');
            if (container && this.elements.grantModal.parentElement === document.body) {
                container.appendChild(this.elements.grantModal);
            }
        }
    }

    /**
     * Handle grant access form submission
     */
    async handleGrantAccess() {
        try {
            if (!this.currentUserId || !window.supabase) {
                throw new Error('User ID or Supabase not available');
            }

            const productId = this.elements.grantProductId?.value;
            const grantType = document.querySelector('input[name="grant-type"]:checked')?.value;
            const reason = this.elements.grantReason?.value;
            const sendNotification = this.elements.grantSendNotification?.checked;

            if (!productId || !grantType || !reason) {
                alert(this.getTranslation('Please fill in all required fields') || 'Please fill in all required fields');
                return;
            }

            // Calculate expiration
            let expiration = null;
            if (grantType !== 'lifetime') {
                const expirationType = this.elements.grantExpirationType?.value;
                if (expirationType === 'date') {
                    const dateValue = this.elements.grantExpirationDate?.value;
                    if (dateValue) {
                        expiration = new Date(dateValue).toISOString();
                    }
                } else if (expirationType === 'duration') {
                    const duration = parseInt(this.elements.grantExpirationDuration?.value);
                    if (duration) {
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + duration);
                        expiration = expDate.toISOString();
                    }
                }
            }

            // Call Edge Function
            const { data, error } = await window.supabase.functions.invoke('admin-grant-access', {
                body: {
                    userId: this.currentUserId,
                    productId: productId,
                    accessType: grantType,
                    expiration: expiration,
                    reason: reason,
                    sendNotification: sendNotification
                }
            });

            if (error) {
                throw error;
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to grant access');
            }

            alert(data.message || 'Access granted successfully');
            this.closeGrantModal();
            await this.loadEntitlements();

            // Notify parent to refresh if needed
            if (window.userDetailPage && typeof window.userDetailPage.refreshStats === 'function') {
                await window.userDetailPage.refreshStats();
            }

        } catch (error) {
            window.logger?.error('❌ Failed to grant access:', error);
            alert('Failed to grant access: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Open revoke access modal
     */
    openRevokeModal(entitlement) {
        this.currentGrantId = entitlement.id;

        if (!this.elements.revokeModal) {
            window.logger?.error('❌ Revoke modal element not found!');
            return;
        }

        // Populate revoke info
        if (this.elements.revokeInfo) {
            const productName = entitlement.app_id && this.productMap[entitlement.app_id] 
                ? this.productMap[entitlement.app_id].name 
                : (entitlement.app_id || '-');
            this.elements.revokeInfo.innerHTML = `
                <p><strong>Product:</strong> ${productName}</p>
                <p><strong>${this.getTranslation('Grant Type') || 'Grant Type'}:</strong> ${this.getTranslation(this.capitalizeFirst(entitlement.grant_type || 'manual')) || this.capitalizeFirst(entitlement.grant_type || 'manual')}</p>
            `;
        }

        // Reset form
        if (this.elements.revokeAccessForm) {
            this.elements.revokeAccessForm.reset();
        }

        // Move modal to body
        if (this.elements.revokeModal.parentElement !== document.body) {
            document.body.appendChild(this.elements.revokeModal);
        }
        
        this.elements.revokeModal.classList.add('open');
        this.elements.revokeModal.style.display = 'flex';
        this.elements.revokeModal.style.position = 'fixed';
        this.elements.revokeModal.style.top = '0';
        this.elements.revokeModal.style.left = '0';
        this.elements.revokeModal.style.width = '100vw';
        this.elements.revokeModal.style.height = '100vh';
        this.elements.revokeModal.style.zIndex = '9999';
        this.elements.revokeModal.style.margin = '0';
        this.elements.revokeModal.style.padding = '0';
        
        // Update translations for modal content
        setTimeout(() => this.showTranslatableContent(), 100);
    }

    /**
     * Close revoke access modal
     */
    closeRevokeModal() {
        if (this.elements.revokeModal) {
            this.elements.revokeModal.classList.remove('open');
            this.elements.revokeModal.style.display = 'none';
            const container = document.getElementById('user-access-management');
            if (container && this.elements.revokeModal.parentElement === document.body) {
                container.appendChild(this.elements.revokeModal);
            }
        }
    }

    /**
     * Handle revoke access form submission
     */
    async handleRevokeAccess() {
        try {
            if (!this.currentGrantId || !window.supabase) {
                throw new Error('Grant ID or Supabase not available');
            }

            const reason = this.elements.revokeReason?.value;
            const sendNotification = this.elements.revokeSendNotification?.checked;

            if (!reason) {
                alert(this.getTranslation('Reason is required') || 'Reason is required');
                return;
            }

            const { data, error } = await window.supabase.functions.invoke('admin-revoke-access', {
                body: {
                    entitlementId: this.currentGrantId,
                    reason: reason,
                    sendNotification: sendNotification
                }
            });

            if (error) {
                throw error;
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to revoke access');
            }

            alert(data.message || 'Access revoked successfully');
            this.closeRevokeModal();
            await this.loadEntitlements();

        } catch (error) {
            window.logger?.error('❌ Failed to revoke access:', error);
            alert('Failed to revoke access: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Handle regrant access
     */
    async handleRegrantAccess(entitlement) {
        if (!confirm(`Are you sure you want to regrant access for ${entitlement.app_id}?`)) {
            return;
        }

        try {
            const { data, error } = await window.supabase.functions.invoke('admin-regrant-access', {
                body: {
                    entitlementId: entitlement.id,
                    reason: 'Access restored by admin',
                    sendNotification: true
                }
            });

            if (error) {
                throw error;
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to regrant access');
            }

            alert(data.message || 'Access regranted successfully');
            await this.loadEntitlements();

        } catch (error) {
            window.logger?.error('❌ Failed to regrant access:', error);
            alert('Failed to regrant access: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Handle delete entitlement
     */
    async handleDeleteEntitlement(entitlement) {
        const productName = entitlement.app_id && this.productMap[entitlement.app_id] 
            ? this.productMap[entitlement.app_id].name 
            : entitlement.app_id;
        
        if (!confirm(`Are you sure you want to permanently delete this entitlement for ${productName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const { data, error } = await window.supabase.functions.invoke('admin-delete-entitlement', {
                body: {
                    entitlementId: entitlement.id,
                    reason: 'Deleted by admin'
                }
            });

            if (error) {
                throw error;
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to delete entitlement');
            }

            alert(data.message || 'Entitlement deleted successfully');
            await this.loadEntitlements();

        } catch (error) {
            window.logger?.error('❌ Failed to delete entitlement:', error);
            alert('Failed to delete entitlement: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Handle product search
     */
    handleProductSearch(query) {
        clearTimeout(this.productSearchTimeout);
        
        this.productSearchTimeout = setTimeout(() => {
            if (!query || !this.elements.productSuggestions) {
                if (this.elements.productSuggestions) {
                    this.elements.productSuggestions.innerHTML = '';
                    this.elements.productSuggestions.style.display = 'none';
                    this.elements.productSuggestions.classList.add('hidden');
                }
                return;
            }

            const searchLower = query.toLowerCase();
            const matchingProducts = this.products.filter(slug => {
                if (slug === 'all') {
                    return 'all products'.includes(searchLower);
                }
                const product = this.productMap[slug];
                if (!product) return false;
                return product.name.toLowerCase().includes(searchLower) || 
                       product.slug.toLowerCase().includes(searchLower);
            }).slice(0, 10);

            if (this.elements.productSuggestions && matchingProducts.length > 0) {
                this.elements.productSuggestions.innerHTML = '';
                this.elements.productSuggestions.style.display = 'block';
                this.elements.productSuggestions.classList.remove('hidden');

                matchingProducts.forEach(productSlug => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'user-access-management__suggestion';
                    const productName = productSlug === 'all'
                        ? this.getTranslation('All Products') || 'All Products'
                        : (this.productMap[productSlug]?.name || productSlug);
                    suggestion.innerHTML = `
                        <div class="user-access-management__suggestion-name">${productName}</div>
                        ${productSlug !== 'all' && this.productMap[productSlug]?.slug ? `<div class="user-access-management__suggestion-slug">${productSlug}</div>` : ''}
                    `;
                    suggestion.addEventListener('click', () => {
                        this.selectProduct(productSlug);
                    });
                    this.elements.productSuggestions.appendChild(suggestion);
                });
            } else if (this.elements.productSuggestions) {
                this.elements.productSuggestions.innerHTML = '<div class="user-access-management__suggestion">No products found</div>';
                this.elements.productSuggestions.style.display = 'block';
                this.elements.productSuggestions.classList.remove('hidden');
            }
        }, 300);
    }

    /**
     * Select product from suggestions
     */
    selectProduct(productSlug) {
        if (this.elements.grantProductId) {
            this.elements.grantProductId.value = productSlug;
        }
        if (this.elements.grantProductSelect) {
            const productName = productSlug === 'all'
                ? this.getTranslation('All Products') || 'All Products'
                : (this.productMap[productSlug]?.name || productSlug);
            this.elements.grantProductSelect.value = productName;
        }
        if (this.elements.selectedProductDisplay) {
            const productName = productSlug === 'all'
                ? this.getTranslation('All Products') || 'All Products'
                : (this.productMap[productSlug]?.name || productSlug);
            this.elements.selectedProductDisplay.innerHTML = `
                <div class="user-access-management__selected-product-info">
                    <strong>${productName}</strong>
                </div>
            `;
        }
        if (this.elements.productSuggestions) {
            this.elements.productSuggestions.innerHTML = '';
            this.elements.productSuggestions.style.display = 'none';
            this.elements.productSuggestions.classList.add('hidden');
        }
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        if (this.elements.loading) {
            if (show) {
                this.elements.loading.classList.remove('user-access-management__loading--hidden');
            } else {
                this.elements.loading.classList.add('user-access-management__loading--hidden');
            }
        }
        if (this.elements.table) {
            if (show) {
                this.elements.table.classList.add('user-access-management__table--hidden');
            } else {
                this.elements.table.classList.remove('user-access-management__table--hidden');
            }
        }
    }

    /**
     * Show/hide empty state
     */
    showEmpty(show) {
        if (this.elements.empty) {
            if (show) {
                this.elements.empty.classList.remove('user-access-management__empty--hidden');
            } else {
                this.elements.empty.classList.add('user-access-management__empty--hidden');
            }
        }
    }

    /**
     * Show/hide table
     */
    showTable() {
        if (this.elements.table) {
            this.elements.table.classList.remove('user-access-management__table--hidden');
        }
    }

    hideTable() {
        if (this.elements.table) {
            this.elements.table.classList.add('user-access-management__table--hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.elements.error && this.elements.errorText) {
            this.elements.errorText.textContent = message;
            this.elements.error.classList.remove('user-access-management__error--hidden');
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.elements.error) {
            this.elements.error.classList.add('user-access-management__error--hidden');
        }
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            this.currentLanguage = localStorage.getItem('language') || 'en';
            const response = await fetch('/admin/components/user-detail/components/user-access-management/locales/user-access-management-locales.json');
            
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
            window.logger?.warn('⚠️ Failed to load user access management translations:', error);
            // Continue with empty translations - will use keys as fallback
            this.translations = {};
        }
    }

    /**
     * Get translated text
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
     * Show translatable content by adding loaded class and updating text
     */
    showTranslatableContent() {
        // Scope to component container and modals (which might be in document.body)
        const container = document.getElementById('user-access-management');
        const grantModal = document.getElementById('grant-access-modal');
        const revokeModal = document.getElementById('revoke-access-modal');
        
        // Collect all translatable elements from container and modals
        let translatableElements = [];
        
        if (container) {
            const containerElements = container.querySelectorAll('.translatable-content[data-translation-key]');
            translatableElements.push(...containerElements);
        }
        
        if (grantModal) {
            const modalElements = grantModal.querySelectorAll('.translatable-content[data-translation-key]');
            translatableElements.push(...modalElements);
        }
        
        if (revokeModal) {
            const modalElements = revokeModal.querySelectorAll('.translatable-content[data-translation-key]');
            translatableElements.push(...modalElements);
        }

        translatableElements.forEach(el => {
            const key = el.getAttribute('data-translation-key');
            if (key) {
                // Add loaded class to make content visible
                el.classList.add('loaded');
                
                // Update text content with translation
                const translation = this.getTranslation(key);
                if (translation && translation !== key) {
                    // Handle input/textarea placeholders
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = translation;
                    } else {
                        el.textContent = translation;
                    }
                } else if (!translation || translation === key) {
                    // If no translation found, still show the key text so content is visible
                    if (el.textContent.trim() === '') {
                        el.textContent = key;
                    }
                    el.classList.add('loaded');
                }
            }
        });
    }

    /**
     * Refresh entitlements
     */
    async refresh() {
        await this.loadEntitlements();
    }

    /**
     * Public method to open grant modal (called from parent)
     */
    openGrantAccessModal() {
        this.openGrantModal();
    }
}

window.UserAccessManagement = UserAccessManagement;
}


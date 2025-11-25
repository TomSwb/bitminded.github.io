/**
 * Access Control Component
 * Handles access grants display, search, filtering, and grant/revoke operations
 */

if (typeof window.AccessControl === 'undefined') {
class AccessControl {
    constructor() {
        this.isInitialized = false;
        this.grants = [];
        this.filteredGrants = [];
        this.products = []; // Product slugs - loaded from database
        this.productMap = {}; // Map of slug -> product data (name, id, etc.)
        this.filters = {
            search: '',
            product: [],
            grantType: [],
            status: [],
            grantedBy: [],
            dateRange: 'all'
        };
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.searchTimeout = null;
        this.userSearchTimeout = null;
        this.productSearchTimeout = null;
        this.elements = {};
        this.currentGrantId = null; // For revoke modal
    }

    /**
     * Initialize the access control component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize DOM elements
            this.initializeElements();

            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize translations FIRST (before loading data)
            await this.initializeTranslations();
            
            // Show translatable content
            this.showTranslatableContent();
            
            // Load products (could be from database in future)
            await this.loadProducts();

            // Load access grants
            await this.loadGrants();

            // Populate filter options
            this.populateFilterOptions();

            // Apply initial filters
            this.applyFilters();

            this.isInitialized = true;
            
            // Final translation update after everything is loaded
            setTimeout(() => {
                this.updateTranslations();
            }, 200);

        } catch (error) {
            window.logger?.error('❌ Access Control: Failed to initialize:', error);
            this.showError('Failed to initialize access control');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        window.logger?.log('🔍 Initializing elements...');
        this.elements = {
            // Header
            totalActiveGrants: document.getElementById('total-active-grants'),
            grantAccessButton: document.getElementById('grant-access-button'),
            exportAccessButton: document.getElementById('export-access-button'),

            // Search
            searchInput: document.getElementById('access-search-input'),

            // Filters
            productDropdown: document.getElementById('product-dropdown'),
            productDropdownBtn: document.getElementById('product-dropdown-btn'),
            productOptions: document.getElementById('product-options'),
            grantTypeDropdown: document.getElementById('grant-type-dropdown'),
            grantTypeDropdownBtn: document.getElementById('grant-type-dropdown-btn'),
            grantTypeOptions: document.getElementById('grant-type-options'),
            statusDropdown: document.getElementById('status-dropdown'),
            statusDropdownBtn: document.getElementById('status-dropdown-btn'),
            statusOptions: document.getElementById('status-options'),
            grantedByDropdown: document.getElementById('granted-by-dropdown'),
            grantedByDropdownBtn: document.getElementById('granted-by-dropdown-btn'),
            grantedByOptions: document.getElementById('granted-by-options'),
            dateRangeFilter: document.getElementById('date-range-filter'),
            clearFiltersBtn: document.getElementById('access-clear-filters-btn'),
            accessCountText: document.getElementById('access-count-text'),

            // Table
            tableBody: document.getElementById('access-table-body'),
            table: document.getElementById('access-table'),
            loading: document.getElementById('access-loading'),
            empty: document.getElementById('access-empty'),

            // Modals
            grantModal: document.getElementById('grant-access-modal'),
            grantModalClose: document.getElementById('grant-modal-close'),
            grantModalCancel: document.getElementById('grant-modal-cancel'),
            grantAccessForm: document.getElementById('grant-access-form'),
            revokeModal: document.getElementById('revoke-access-modal'),
            revokeModalClose: document.getElementById('revoke-modal-close'),
            revokeModalCancel: document.getElementById('revoke-modal-cancel'),
            revokeAccessForm: document.getElementById('revoke-access-form'),

            // Grant form elements
            grantUserSelect: document.getElementById('grant-user-select'),
            grantUserId: document.getElementById('grant-user-id'),
            userSuggestions: document.getElementById('user-suggestions'),
            selectedUserDisplay: document.getElementById('selected-user-display'),
            grantProductSelect: document.getElementById('grant-product-select'),
            grantProductId: document.getElementById('grant-product-id'),
            productSuggestions: document.getElementById('product-suggestions'),
            selectedProductDisplay: document.getElementById('selected-product-display'),
            grantExpirationType: document.getElementById('grant-expiration-type'),
            grantExpirationDate: document.getElementById('grant-expiration-date'),
            grantExpirationDuration: document.getElementById('grant-expiration-duration'),
            grantReason: document.getElementById('grant-reason'),
            grantSendNotification: document.getElementById('grant-send-notification'),

            // Revoke form elements
            revokeInfo: document.getElementById('revoke-info'),
            revokeReason: document.getElementById('revoke-reason'),
            revokeSendNotification: document.getElementById('revoke-send-notification')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input (debounced)
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        }

        // Grant Access Button
        if (this.elements.grantAccessButton) {
            this.elements.grantAccessButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openGrantModal();
            });
        } else {
            window.logger?.error('❌ Grant Access button NOT found!', document.getElementById('grant-access-button'));
        }

        // Export Button
        if (this.elements.exportAccessButton) {
            this.elements.exportAccessButton.addEventListener('click', () => {
                this.exportGrants();
            });
        }

        // Modal close buttons
        if (this.elements.grantModalClose) {
            this.elements.grantModalClose.addEventListener('click', () => {
                this.closeGrantModal();
            });
        }

        if (this.elements.grantModalCancel) {
            this.elements.grantModalCancel.addEventListener('click', () => {
                this.closeGrantModal();
            });
        }

        if (this.elements.revokeModalClose) {
            this.elements.revokeModalClose.addEventListener('click', () => {
                this.closeRevokeModal();
            });
        }

        if (this.elements.revokeModalCancel) {
            this.elements.revokeModalCancel.addEventListener('click', () => {
                this.closeRevokeModal();
            });
        }

        // Close modals on backdrop click
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

        // Grant Access Form Submit
        if (this.elements.grantAccessForm) {
            this.elements.grantAccessForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGrantAccess();
            });
        }

        // Revoke Access Form Submit
        if (this.elements.revokeAccessForm) {
            this.elements.revokeAccessForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRevokeAccess();
            });
        }

        // User search autocomplete
        if (this.elements.grantUserSelect) {
            this.elements.grantUserSelect.addEventListener('input', (e) => {
                this.handleUserSearch(e.target.value);
            });

            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.access-control__form-group')) {
                    if (this.elements.userSuggestions) {
                        this.elements.userSuggestions.innerHTML = '';
                        this.elements.userSuggestions.style.display = 'none';
                        this.elements.userSuggestions.classList.add('hidden');
                    }
                    if (this.elements.productSuggestions) {
                        this.elements.productSuggestions.innerHTML = '';
                        this.elements.productSuggestions.style.display = 'none';
                        this.elements.productSuggestions.classList.add('hidden');
                    }
                }
            });
        }

        // Product search autocomplete
        if (this.elements.grantProductSelect) {
            this.elements.grantProductSelect.addEventListener('input', (e) => {
                this.handleProductSearch(e.target.value);
            });
        }

        // Expiration type change
        if (this.elements.grantExpirationType) {
            this.elements.grantExpirationType.addEventListener('change', (e) => {
                if (e.target.value === 'date') {
                    this.elements.grantExpirationDate.classList.remove('hidden');
                    this.elements.grantExpirationDuration.classList.add('hidden');
                } else {
                    this.elements.grantExpirationDate.classList.add('hidden');
                    this.elements.grantExpirationDuration.classList.remove('hidden');
                }
            });
        }

        // Grant type radio change (hide expiration for lifetime)
        const grantTypeRadios = document.querySelectorAll('input[name="grant-type"]');
        grantTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const expirationGroup = document.getElementById('expiration-group');
                if (e.target.value === 'lifetime') {
                    expirationGroup.style.display = 'none';
                } else {
                    expirationGroup.style.display = 'block';
                }
            });
        });

        // Reason template buttons
        const templateButtons = document.querySelectorAll('.access-control__template-btn');
        templateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.closest('.access-control__template-btn').dataset.template;
                if (this.elements.grantReason) {
                    this.elements.grantReason.value = template;
                }
            });
        });

        // Filter dropdowns (similar to user-management pattern)
        this.setupFilterDropdowns();

        // Date range filter
        if (this.elements.dateRangeFilter) {
            this.elements.dateRangeFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.applyFilters();
            });
        }

        // Clear filters button
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Sortable table headers
        const sortableHeaders = document.querySelectorAll('.access-control__sortable-header');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.getAttribute('data-sort');
                this.handleSort(sortField);
            });
        });

        // Language change
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Setup filter dropdowns (product, grant type, status, granted by)
     */
    setupFilterDropdowns() {
        // Product filter
        this.setupMultiSelectDropdown(
            'product',
            this.elements.productDropdownBtn,
            this.elements.productDropdown,
            this.elements.productOptions,
            document.getElementById('product-select-all'),
            document.getElementById('product-deselect-all'),
            document.getElementById('product-search')
        );

        // Grant type filter
        this.setupMultiSelectDropdown(
            'grantType',
            this.elements.grantTypeDropdownBtn,
            this.elements.grantTypeDropdown,
            this.elements.grantTypeOptions,
            document.getElementById('grant-type-select-all'),
            document.getElementById('grant-type-deselect-all'),
            null
        );

        // Status filter
        this.setupMultiSelectDropdown(
            'status',
            this.elements.statusDropdownBtn,
            this.elements.statusDropdown,
            this.elements.statusOptions,
            document.getElementById('status-select-all'),
            document.getElementById('status-deselect-all'),
            null
        );

        // Granted by filter
        this.setupMultiSelectDropdown(
            'grantedBy',
            this.elements.grantedByDropdownBtn,
            this.elements.grantedByDropdown,
            this.elements.grantedByOptions,
            document.getElementById('granted-by-select-all'),
            document.getElementById('granted-by-deselect-all'),
            document.getElementById('granted-by-search')
        );
    }

    /**
     * Setup multi-select dropdown (reusable pattern)
     */
    setupMultiSelectDropdown(filterKey, button, dropdown, optionsContainer, selectAllBtn, deselectAllBtn, searchInput) {
        // Toggle dropdown
        if (button && dropdown) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.access-control__filter-group')) {
                    dropdown.classList.remove('open');
                }
            });
        }

        // Select all
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    const value = cb.value;
                    if (!this.filters[filterKey].includes(value)) {
                        this.filters[filterKey].push(value);
                    }
                });
                this.updateDropdownButtonText(button, filterKey);
                this.applyFilters();
            });
        }

        // Deselect all
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = false;
                });
                this.filters[filterKey] = [];
                this.updateDropdownButtonText(button, filterKey);
                this.applyFilters();
            });
        }

        // Individual checkbox change
        if (optionsContainer) {
            optionsContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const value = e.target.value;
                    if (e.target.checked) {
                        if (!this.filters[filterKey].includes(value)) {
                            this.filters[filterKey].push(value);
                        }
                    } else {
                        this.filters[filterKey] = this.filters[filterKey].filter(v => v !== value);
                    }
                    this.updateDropdownButtonText(button, filterKey);
                    this.applyFilters();
                }
            });
        }

        // Search filter (if search input exists)
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const checkboxes = optionsContainer.querySelectorAll('label');
                checkboxes.forEach(label => {
                    const text = label.textContent.toLowerCase();
                    label.style.display = text.includes(searchTerm) ? 'block' : 'none';
                });
            });
        }
    }

    /**
     * Update dropdown button text based on selected filters
     */
    updateDropdownButtonText(button, filterKey) {
        if (!button) return;
        const span = button.querySelector('span:first-child');
        const count = this.filters[filterKey].length;
        if (count === 0) {
            span.textContent = this.getTranslation(`select_${filterKey}`) || 'Select...';
        } else {
            span.textContent = `${count} selected`;
        }
    }

    /**
     * Load products (could be from database in future)
     */
    /**
     * Load products from database
     */
    async loadProducts() {
        try {
            if (!window.supabase) {
                window.logger?.error('❌ Supabase not available');
                // Fallback to hardcoded list
                this.products = ['all'];
                this.productMap = {};
                return;
            }

            // Query ALL products from database (admins should see all products regardless of status)
            // Note: RLS policies should allow admins to see all products
            const { data, error } = await window.supabase
                .from('products')
                .select('id, name, slug, status')
                .order('name', { ascending: true });

            if (error) {
                window.logger?.error('❌ Error loading products:', error);
                window.logger?.error('❌ Error details:', JSON.stringify(error, null, 2));
                // Fallback to hardcoded list
                this.products = ['all'];
                this.productMap = {};
                return;
            }


            // Create product map for easy lookup (slug -> product data)
            this.productMap = {};
            (data || []).forEach(p => {
                // Use slug if available, otherwise fall back to id
                const slug = p.slug || p.id;
                if (!slug) {
                    window.logger?.warn('⚠️ Product missing both slug and id:', p);
                    return;
                }
                this.productMap[slug] = {
                    id: p.id,
                    name: p.name || 'Unnamed Product',
                    slug: slug,
                    status: p.status
                };
            });

            // Map products to array of slugs (matching entitlements.app_id format)
            // Include 'all' as a special option for granting access to all products
            const productSlugs = (data || [])
                .map(p => p.slug || p.id)
                .filter(slug => slug); // Filter out any null/undefined slugs
            
            this.products = ['all', ...productSlugs];
            

        } catch (error) {
            window.logger?.error('❌ Failed to load products:', error);
            window.logger?.error('❌ Error stack:', error.stack);
            // Fallback to hardcoded list
            this.products = ['all'];
            this.productMap = {};
        }
    }

    /**
     * Load access grants from database
     */
    async loadGrants() {
        try {
            this.showLoading();

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'access_control_viewed',
                    'Admin viewed access control list'
                );
            }

            // Query entitlements with related data
            // Note: entitlements.user_id and entitlements.granted_by reference auth.users(id)
            // user_profiles.id also references auth.users(id), so we join on id = user_id
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
                .order('created_at', { ascending: false });

            if (error) {
                window.logger?.error('❌ Database query error:', error);
                throw error;
            }

            // Handle empty data
            if (!data || data.length === 0) {
                this.grants = [];
                this.hideLoading();
                return;
            }

            // Enrich grants with user profile data
            // Fetch user profiles separately since there's no direct FK relationship
            const userIds = [...new Set(data.map(g => g.user_id).filter(Boolean))];
            const grantedByUserIds = [...new Set(data.map(g => g.granted_by).filter(Boolean))];
            const allUserIds = [...new Set([...userIds, ...grantedByUserIds])];

            let userProfilesMap = {};
            if (allUserIds.length > 0) {
                const { data: profiles, error: profilesError } = await window.supabase
                    .from('user_profiles')
                    .select('id, username, avatar_url')
                    .in('id', allUserIds);

                if (!profilesError && profiles) {
                    profiles.forEach(profile => {
                        userProfilesMap[profile.id] = profile;
                    });
                }
            }

            // Map grants with user data
            this.grants = (data || []).map(grant => {
                // Determine status
                let status = 'active';
                if (!grant.active) {
                    status = 'revoked';
                } else if (grant.expires_at && new Date(grant.expires_at) < new Date()) {
                    status = 'expired';
                }

                return {
                    ...grant,
                    status,
                    user: userProfilesMap[grant.user_id] || {},
                    grantedByAdmin: grant.granted_by ? (userProfilesMap[grant.granted_by] || null) : null
                };
            });

            // Update stats
            const activeCount = this.grants.filter(g => g.status === 'active').length;
            if (this.elements.totalActiveGrants) {
                this.elements.totalActiveGrants.textContent = activeCount;
            }

            this.hideLoading();

        } catch (error) {
            window.logger?.error('❌ Error loading grants:', error);
            this.showError('Failed to load access grants');
            this.hideLoading();
        }
    }

    /**
     * Populate filter options
     */
    populateFilterOptions() {
        // Populate product options
        if (this.elements.productOptions) {
            this.elements.productOptions.innerHTML = '';
            this.products.forEach(productSlug => {
                const label = document.createElement('label');
                label.className = 'access-control__option';
                // Get product name from map, or use slug if not found (e.g., 'all')
                const productName = productSlug === 'all' 
                    ? this.getTranslation('All Products') || 'All Products'
                    : (this.productMap[productSlug]?.name || productSlug);
                label.innerHTML = `
                    <input type="checkbox" value="${productSlug}">
                    <span>${productName}</span>
                `;
                this.elements.productOptions.appendChild(label);
            });
        }

        // Populate grant type options
        if (this.elements.grantTypeOptions) {
            const grantTypes = ['manual', 'trial', 'subscription', 'lifetime'];
            this.elements.grantTypeOptions.innerHTML = '';
            grantTypes.forEach(type => {
                const label = document.createElement('label');
                label.className = 'access-control__option';
                const translatedType = this.getTranslation(this.capitalizeFirst(type)) || this.capitalizeFirst(type);
                label.innerHTML = `
                    <input type="checkbox" value="${type}">
                    <span>${translatedType}</span>
                `;
                this.elements.grantTypeOptions.appendChild(label);
            });
        }

        // Populate status options
        if (this.elements.statusOptions) {
            const statuses = ['active', 'expired', 'revoked'];
            this.elements.statusOptions.innerHTML = '';
            statuses.forEach(status => {
                const label = document.createElement('label');
                label.className = 'access-control__option';
                const translatedStatus = this.getTranslation(status) || this.capitalizeFirst(status);
                label.innerHTML = `
                    <input type="checkbox" value="${status}">
                    <span>${translatedStatus}</span>
                `;
                this.elements.statusOptions.appendChild(label);
            });
        }

        // Populate granted by options (from unique admins in grants)
        if (this.elements.grantedByOptions) {
            const uniqueAdmins = [...new Set(this.grants
                .filter(g => g.grantedByAdmin)
                .map(g => g.granted_by))];
            
            this.elements.grantedByOptions.innerHTML = '';
            uniqueAdmins.forEach(adminId => {
                const grant = this.grants.find(g => g.granted_by === adminId);
                const adminName = grant?.grantedByAdmin?.username || 'Unknown Admin';
                const label = document.createElement('label');
                label.className = 'access-control__option';
                label.innerHTML = `
                    <input type="checkbox" value="${adminId}">
                    <span>${adminName}</span>
                `;
                this.elements.grantedByOptions.appendChild(label);
            });
        }
        
        // Reapply translations after populating filter options
        setTimeout(() => {
            this.updateTranslations();
        }, 100);

        // Product search is handled by handleProductSearch() - no need to populate dropdown
    }

    /**
     * Apply filters to grants
     */
    applyFilters() {
        let filtered = [...this.grants];

        // Search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(grant => {
                const username = grant.user?.username?.toLowerCase() || '';
                const product = grant.app_id?.toLowerCase() || '';
                const reason = grant.grant_reason?.toLowerCase() || '';
                return username.includes(searchLower) || 
                       product.includes(searchLower) || 
                       reason.includes(searchLower);
            });
        }

        // Product filter
        if (this.filters.product.length > 0) {
            filtered = filtered.filter(grant => 
                this.filters.product.includes(grant.app_id)
            );
        }

        // Grant type filter
        if (this.filters.grantType.length > 0) {
            filtered = filtered.filter(grant => 
                this.filters.grantType.includes(grant.grant_type || 'manual')
            );
        }

        // Status filter
        if (this.filters.status.length > 0) {
            filtered = filtered.filter(grant => 
                this.filters.status.includes(grant.status)
            );
        }

        // Granted by filter
        if (this.filters.grantedBy.length > 0) {
            filtered = filtered.filter(grant => 
                grant.granted_by && this.filters.grantedBy.includes(grant.granted_by)
            );
        }

        // Date range filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            let cutoffDate;
            switch (this.filters.dateRange) {
                case '7d':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case '1y':
                    cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
            }
            if (cutoffDate) {
                filtered = filtered.filter(grant => 
                    new Date(grant.created_at) >= cutoffDate
                );
            }
        }

        // Apply sorting
        if (this.sort.field) {
            filtered.sort((a, b) => {
                let aVal = a[this.sort.field];
                let bVal = b[this.sort.field];
                
                // Handle nested properties
                if (this.sort.field === 'username') {
                    aVal = a.user?.username || '';
                    bVal = b.user?.username || '';
                } else if (this.sort.field === 'product') {
                    aVal = a.app_id || '';
                    bVal = b.app_id || '';
                }

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return this.sort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.filteredGrants = filtered;

        // Update count text
        if (this.elements.accessCountText) {
            const count = filtered.length;
            if (count === this.grants.length) {
                this.elements.accessCountText.textContent = this.getTranslation('showing_all_grants') || `Showing all ${count} grants`;
            } else {
                this.elements.accessCountText.textContent = `Showing ${count} of ${this.grants.length} grants`;
            }
        }

        this.renderGrants();
        
        // Reapply translations after rendering (in case DOM was reset)
        setTimeout(() => {
            this.updateTranslations();
        }, 100);
    }

    /**
     * Render grants table
     */
    renderGrants() {
        const tbody = this.elements.tableBody;
        if (!tbody) {
            window.logger?.error('❌ Table body not found');
            return;
        }

        tbody.innerHTML = '';

        if (this.filteredGrants.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        this.filteredGrants.forEach(grant => {
            const row = this.createGrantRow(grant);
            tbody.appendChild(row);
        });
    }

    /**
     * Create grant table row
     */
    createGrantRow(grant) {
        const row = document.createElement('tr');
        row.className = 'access-control__table-row';

        // User
        const userCell = document.createElement('td');
        userCell.className = 'access-control__table-cell';
        const userAvatar = grant.user?.avatar_url || '';
        const username = grant.user?.username || 'Unknown';
        userCell.innerHTML = `
            <div class="access-control__user-info">
                ${userAvatar ? `<img src="${userAvatar}" alt="${username}" class="access-control__avatar">` : ''}
                <div>
                    <div class="access-control__username">${username}</div>
                    <div class="access-control__user-id">${grant.user_id.substring(0, 8)}...</div>
                </div>
            </div>
        `;

        // Product
        const productCell = document.createElement('td');
        productCell.className = 'access-control__table-cell';
        // Display product name if available, otherwise show slug
        const productName = grant.app_id && this.productMap[grant.app_id] 
            ? this.productMap[grant.app_id].name 
            : (grant.app_id || '-');
        productCell.textContent = productName;

        // Grant Type
        const grantTypeCell = document.createElement('td');
        grantTypeCell.className = 'access-control__table-cell';
        const grantType = grant.grant_type || 'manual';
        const translatedGrantType = this.getTranslation(this.capitalizeFirst(grantType)) || this.capitalizeFirst(grantType);
        grantTypeCell.innerHTML = `<span class="access-control__badge access-control__badge--${grantType}">${translatedGrantType}</span>`;

        // Status
        const statusCell = document.createElement('td');
        statusCell.className = 'access-control__table-cell';
        const translatedStatus = this.getTranslation(grant.status) || this.capitalizeFirst(grant.status);
        statusCell.innerHTML = `<span class="access-control__badge access-control__badge--${grant.status}">${translatedStatus}</span>`;

        // Granted By
        const grantedByCell = document.createElement('td');
        grantedByCell.className = 'access-control__table-cell';
        grantedByCell.textContent = grant.grantedByAdmin?.username || 'System';

        // Granted Date
        const grantedDateCell = document.createElement('td');
        grantedDateCell.className = 'access-control__table-cell';
        grantedDateCell.textContent = this.formatDate(grant.created_at);

        // Expiration
        const expirationCell = document.createElement('td');
        expirationCell.className = 'access-control__table-cell';
        if (!grant.expires_at) {
            const neverText = this.getTranslation('Lifetime') || 'Never';
            expirationCell.innerHTML = `<span class="access-control__badge">${neverText}</span>`;
        } else {
            const expDate = new Date(grant.expires_at);
            const now = new Date();
            const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntil < 0) {
                const expiredText = this.getTranslation('expired') || 'Expired';
                expirationCell.innerHTML = `<span class="access-control__badge access-control__badge--expired">${expiredText}</span>`;
            } else if (daysUntil < 7) {
                expirationCell.innerHTML = `<span class="access-control__badge access-control__badge--warning">${daysUntil} days</span>`;
            } else {
                expirationCell.textContent = this.formatDate(grant.expires_at);
            }
        }

        // Reason
        const reasonCell = document.createElement('td');
        reasonCell.className = 'access-control__table-cell';
        reasonCell.textContent = grant.grant_reason ? (grant.grant_reason.length > 50 ? grant.grant_reason.substring(0, 50) + '...' : grant.grant_reason) : '-';

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.setAttribute('data-label', 'Actions');
        actionsCell.style.padding = 'var(--spacing-sm)';
        
        let actionButtons = '';
        if (grant.status === 'active') {
            const revokeText = this.getTranslation('Revoke Access') || 'Revoke';
            actionButtons = `
                <button class="access-control__action-btn access-control__action-btn--revoke" data-action="revoke" data-grant-id="${grant.id}" title="Revoke Access" type="button">
                    ${revokeText}
                </button>
            `;
        } else if (grant.status === 'revoked') {
            const regrantText = this.getTranslation('Regrant') || 'Regrant';
            const deleteText = this.getTranslation('Delete') || 'Delete';
            actionButtons = `
                <button class="access-control__action-btn access-control__action-btn--regrant" data-action="regrant" data-grant-id="${grant.id}" title="Regrant Access" type="button">
                    ${regrantText}
                </button>
                <button class="access-control__action-btn access-control__action-btn--delete" data-action="delete" data-grant-id="${grant.id}" title="Delete Entitlement" type="button">
                    ${deleteText}
                </button>
            `;
        }
        
        actionsCell.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm);">
                ${actionButtons}
            </div>
        `;
        
        // Add click handlers (matching user-management pattern)
        const revokeButton = actionsCell.querySelector('[data-action="revoke"]');
        if (revokeButton) {
            revokeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRevokeModal(grant);
            });
        }
        
        const regrantButton = actionsCell.querySelector('[data-action="regrant"]');
        if (regrantButton) {
            regrantButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRegrantAccess(grant);
            });
        }
        
        const deleteButton = actionsCell.querySelector('[data-action="delete"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteEntitlement(grant);
            });
        }

        row.appendChild(userCell);
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
        this.applyFilters();
    }

    /**
     * Update sort indicators
     */
    updateSortIndicators() {
        const headers = document.querySelectorAll('.access-control__sortable-header');
        headers.forEach(header => {
            const indicator = header.querySelector('.access-control__sort-indicator');
            const sortField = header.getAttribute('data-sort');
            if (sortField === this.sort.field) {
                indicator.textContent = this.sort.direction === 'asc' ? ' ▲' : ' ▼';
                header.setAttribute('data-sort-direction', this.sort.direction);
            } else {
                indicator.textContent = '';
                header.removeAttribute('data-sort-direction');
            }
        });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            search: '',
            product: [],
            grantType: [],
            status: [],
            grantedBy: [],
            dateRange: 'all'
        };

        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        if (this.elements.dateRangeFilter) {
            this.elements.dateRangeFilter.value = 'all';
        }

        // Uncheck all filter checkboxes
        const checkboxes = document.querySelectorAll('.access-control__options input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        // Update dropdown button texts
        this.updateDropdownButtonText(this.elements.productDropdownBtn, 'product');
        this.updateDropdownButtonText(this.elements.grantTypeDropdownBtn, 'grantType');
        this.updateDropdownButtonText(this.elements.statusDropdownBtn, 'status');
        this.updateDropdownButtonText(this.elements.grantedByDropdownBtn, 'grantedBy');

        this.applyFilters();
    }

    /**
     * Open grant access modal
     */
    openGrantModal() {
        if (this.elements.grantModal) {
            this.elements.grantModal.classList.add('open');
            // Reset form
            if (this.elements.grantAccessForm) {
                this.elements.grantAccessForm.reset();
            }
            if (this.elements.selectedUserDisplay) {
                this.elements.selectedUserDisplay.innerHTML = '';
            }
            if (this.elements.grantUserId) {
                this.elements.grantUserId.value = '';
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
        } else {
            window.logger?.error('❌ Grant modal element NOT found!');
        }
        window.logger?.log('📋 openGrantModal() completed');
    }

    /**
     * Close grant access modal
     */
    closeGrantModal() {
        if (this.elements.grantModal) {
            this.elements.grantModal.classList.remove('open');
        }
    }

    /**
     * Open revoke access modal
     */
    openRevokeModal(grant) {
        this.currentGrantId = grant.id;
        
        if (!this.elements.revokeModal) {
            window.logger?.error('❌ Revoke modal element not found!');
            return;
        }
        
        // Populate revoke info
        if (this.elements.revokeInfo) {
            this.elements.revokeInfo.innerHTML = `
                <p><strong>User:</strong> ${grant.user?.username || 'Unknown'}</p>
                <p><strong>Product:</strong> ${grant.app_id}</p>
                <p><strong>${this.getTranslation('Grant Type') || 'Grant Type'}:</strong> ${this.getTranslation(this.capitalizeFirst(grant.grant_type || 'manual')) || this.capitalizeFirst(grant.grant_type || 'manual')}</p>
            `;
        }

        // Reset form
        if (this.elements.revokeAccessForm) {
            this.elements.revokeAccessForm.reset();
        }

        // Move modal to body if it's nested (fixed positioning works better at body level)
        if (this.elements.revokeModal.parentElement !== document.body) {
            document.body.appendChild(this.elements.revokeModal);
        }
        
        // Add open class
        this.elements.revokeModal.classList.add('open');
        
        // Force modal styles to ensure visibility
        this.elements.revokeModal.style.display = 'flex';
        this.elements.revokeModal.style.position = 'fixed';
        this.elements.revokeModal.style.top = '0';
        this.elements.revokeModal.style.left = '0';
        this.elements.revokeModal.style.width = '100vw';
        this.elements.revokeModal.style.height = '100vh';
        this.elements.revokeModal.style.zIndex = '9999';
        this.elements.revokeModal.style.margin = '0';
        this.elements.revokeModal.style.padding = '0';
    }

    /**
     * Close revoke access modal
     */
    closeRevokeModal() {
        if (this.elements.revokeModal) {
            this.elements.revokeModal.classList.remove('open');
            this.elements.revokeModal.style.display = 'none';
            
            // Move modal back to original location if needed
            const accessControl = document.getElementById('access-control');
            if (accessControl && this.elements.revokeModal.parentElement === document.body) {
                accessControl.appendChild(this.elements.revokeModal);
            }
        }
        this.currentGrantId = null;
    }

    /**
     * Handle user search (autocomplete)
     */
    async handleUserSearch(query) {
        if (!query || query.length < 2) {
            if (this.elements.userSuggestions) {
                this.elements.userSuggestions.innerHTML = '';
                this.elements.userSuggestions.style.display = 'none';
                this.elements.userSuggestions.classList.add('hidden');
            }
            return;
        }

        clearTimeout(this.userSearchTimeout);
        this.userSearchTimeout = setTimeout(async () => {
            try {
                if (!window.supabase) return;

                const { data, error } = await window.supabase
                    .from('user_profiles')
                    .select('id, username, email')
                    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
                    .limit(10);

                if (error) {
                    window.logger?.error('❌ User search error:', error);
                    return;
                }

                if (this.elements.userSuggestions && data && data.length > 0) {
                    this.elements.userSuggestions.innerHTML = '';
                    this.elements.userSuggestions.style.display = 'block';
                    this.elements.userSuggestions.classList.remove('hidden');

                    data.forEach(user => {
                        const suggestion = document.createElement('div');
                        suggestion.className = 'access-control__suggestion';
                        suggestion.innerHTML = `
                            <div class="access-control__suggestion-name">${user.username}</div>
                            <div class="access-control__suggestion-email">${user.email}</div>
                        `;
                        suggestion.addEventListener('click', () => {
                            this.selectUser(user);
                        });
                        this.elements.userSuggestions.appendChild(suggestion);
                    });
                } else if (this.elements.userSuggestions) {
                    this.elements.userSuggestions.innerHTML = '<div class="access-control__suggestion">No users found</div>';
                    this.elements.userSuggestions.style.display = 'block';
                    this.elements.userSuggestions.classList.remove('hidden');
                }
            } catch (error) {
                window.logger?.error('❌ Error searching users:', error);
            }
        }, 300);
    }

    /**
     * Select user from suggestions
     */
    selectUser(user) {
        if (this.elements.grantUserId) {
            this.elements.grantUserId.value = user.id;
        }
        if (this.elements.grantUserSelect) {
            this.elements.grantUserSelect.value = user.username;
        }
        if (this.elements.selectedUserDisplay) {
            this.elements.selectedUserDisplay.innerHTML = `
                <div class="access-control__selected-user-info">
                    <strong>${user.username}</strong> (${user.email})
                </div>
            `;
        }
        if (this.elements.userSuggestions) {
            this.elements.userSuggestions.innerHTML = '';
            this.elements.userSuggestions.style.display = 'none';
            this.elements.userSuggestions.classList.add('hidden');
        }
    }

    /**
     * Handle product search (autocomplete)
     */
    async handleProductSearch(query) {
        if (!query || query.length < 1) {
            if (this.elements.productSuggestions) {
                this.elements.productSuggestions.innerHTML = '';
                this.elements.productSuggestions.style.display = 'none';
                this.elements.productSuggestions.classList.add('hidden');
            }
            return;
        }

        clearTimeout(this.productSearchTimeout);
        this.productSearchTimeout = setTimeout(() => {
            try {
                const queryLower = query.toLowerCase();
                
                window.logger?.log('🔍 Product search query:', query);
                window.logger?.log('🔍 Available products:', this.products);
                window.logger?.log('🔍 Product map:', this.productMap);
                
                // Filter products by name or slug
                const matchingProducts = this.products
                    .filter(slug => {
                        if (slug === 'all') {
                            const allProductsText = (this.getTranslation('All Products') || 'All Products').toLowerCase();
                            return allProductsText.includes(queryLower);
                        }
                        const product = this.productMap[slug];
                        if (!product) {
                            window.logger?.warn('⚠️ Product not found in map:', slug);
                            return false;
                        }
                        const name = (product.name || '').toLowerCase();
                        const slugLower = slug.toLowerCase();
                        const matches = name.includes(queryLower) || slugLower.includes(queryLower);
                        if (matches) {
                        }
                        return matches;
                    })
                    .slice(0, 10); // Limit to 10 results
                

                if (this.elements.productSuggestions && matchingProducts.length > 0) {
                    this.elements.productSuggestions.innerHTML = '';
                    this.elements.productSuggestions.style.display = 'block';
                    this.elements.productSuggestions.classList.remove('hidden');

                    matchingProducts.forEach(productSlug => {
                        const suggestion = document.createElement('div');
                        suggestion.className = 'access-control__suggestion';
                        const productName = productSlug === 'all'
                            ? this.getTranslation('All Products') || 'All Products'
                            : (this.productMap[productSlug]?.name || productSlug);
                        suggestion.innerHTML = `
                            <div class="access-control__suggestion-name">${productName}</div>
                            ${productSlug !== 'all' && this.productMap[productSlug]?.slug ? `<div class="access-control__suggestion-email">${productSlug}</div>` : ''}
                        `;
                        suggestion.addEventListener('click', () => {
                            this.selectProduct(productSlug);
                        });
                        this.elements.productSuggestions.appendChild(suggestion);
                    });
                } else if (this.elements.productSuggestions) {
                    this.elements.productSuggestions.innerHTML = '<div class="access-control__suggestion">No products found</div>';
                    this.elements.productSuggestions.style.display = 'block';
                    this.elements.productSuggestions.classList.remove('hidden');
                }
            } catch (error) {
                window.logger?.error('❌ Error searching products:', error);
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
                <div class="access-control__selected-product-info">
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
     * Handle grant access form submit
     */
    async handleGrantAccess() {
        try {
            // Validate form
            const userId = this.elements.grantUserId?.value;
            const productId = this.elements.grantProductId?.value || this.elements.grantProductSelect?.value;
            const grantType = document.querySelector('input[name="grant-type"]:checked')?.value;
            const reason = this.elements.grantReason?.value;
            const sendNotification = this.elements.grantSendNotification?.checked;

            if (!userId || !productId || !grantType || !reason) {
                this.showError('Please fill in all required fields');
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

            // Get session
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Debug: Log what we're sending
            window.logger?.log('📤 Granting access with:', {
                userId,
                productId,
                productSlug: productId, // This should be the slug (e.g., 'converter')
                accessType: grantType,
                expiration,
                reason
            });

            // Call Edge Function
            const { data, error } = await window.supabase.functions.invoke('admin-grant-access', {
                body: {
                    userId,
                    productId,
                    accessType: grantType,
                    expiration,
                    reason,
                    sendNotification
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                throw new Error(error.message || 'Failed to grant access');
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to grant access');
            }

            this.showSuccess('Access granted successfully');
            this.closeGrantModal();
            
            // Reload grants
            await this.loadGrants();
            this.applyFilters();

        } catch (error) {
            window.logger?.error('❌ Error granting access:', error);
            this.showError(error.message || 'Failed to grant access');
        }
    }

    /**
     * Handle regrant access
     */
    async handleRegrantAccess(grant) {
        if (!grant || !grant.id) {
            this.showError('No grant selected');
            return;
        }

        if (!confirm(`Are you sure you want to regrant access to ${grant.user?.username || 'this user'} for ${grant.app_id}?`)) {
            return;
        }

        try {
            // Get session
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Call Edge Function
            const { data, error } = await window.supabase.functions.invoke('admin-regrant-access', {
                body: {
                    entitlementId: grant.id,
                    reason: 'Access restored by admin',
                    sendNotification: true
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                throw new Error(error.message || 'Failed to regrant access');
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to regrant access');
            }

            this.showSuccess('Access regranted successfully');
            
            // Reload grants
            await this.loadGrants();
            this.applyFilters();

        } catch (error) {
            window.logger?.error('❌ Error regranting access:', error);
            this.showError(error.message || 'Failed to regrant access');
        }
    }

    /**
     * Handle delete entitlement
     */
    async handleDeleteEntitlement(grant) {
        if (!grant || !grant.id) {
            this.showError('No grant selected');
            return;
        }

        const userName = grant.user?.username || 'this user';
        const productName = grant.app_id || 'this product';
        
        if (!confirm(`Are you sure you want to permanently delete this entitlement for ${userName} (${productName})? This action cannot be undone.`)) {
            return;
        }

        try {
            // Get session
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Call Edge Function
            const { data, error } = await window.supabase.functions.invoke('admin-delete-entitlement', {
                body: {
                    entitlementId: grant.id,
                    reason: 'Permanently deleted by admin'
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                throw new Error(error.message || 'Failed to delete entitlement');
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete entitlement');
            }

            this.showSuccess('Entitlement deleted successfully');
            
            // Reload grants
            await this.loadGrants();
            this.applyFilters();

        } catch (error) {
            window.logger?.error('❌ Error deleting entitlement:', error);
            this.showError(error.message || 'Failed to delete entitlement');
        }
    }

    /**
     * Handle revoke access form submit
     */
    async handleRevokeAccess() {
        try {
            if (!this.currentGrantId) {
                throw new Error('No grant selected');
            }

            const reason = this.elements.revokeReason?.value;
            const sendNotification = this.elements.revokeSendNotification?.checked;

            if (!reason) {
                this.showError('Please provide a reason for revoking access');
                return;
            }

            // Get session
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Call Edge Function
            const { data, error } = await window.supabase.functions.invoke('admin-revoke-access', {
                body: {
                    entitlementId: this.currentGrantId,
                    reason,
                    sendNotification
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                throw new Error(error.message || 'Failed to revoke access');
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to revoke access');
            }

            this.showSuccess('Access revoked successfully');
            this.closeRevokeModal();
            
            // Reload grants
            await this.loadGrants();
            this.applyFilters();

        } catch (error) {
            window.logger?.error('❌ Error revoking access:', error);
            this.showError(error.message || 'Failed to revoke access');
        }
    }

    /**
     * Export grants report
     */
    exportGrants() {
        // Create CSV
        const headers = ['User', 'Product', 'Grant Type', 'Status', 'Granted By', 'Granted Date', 'Expiration', 'Reason'];
        const rows = this.filteredGrants.map(grant => [
            grant.user?.username || 'Unknown',
            grant.app_id || '',
            grant.grant_type || 'manual',
            grant.status,
            grant.grantedByAdmin?.username || 'System',
            this.formatDate(grant.created_at),
            grant.expires_at ? this.formatDate(grant.expires_at) : 'Never',
            grant.grant_reason || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `access-grants-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Utility: Format date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Utility: Capitalize first letter
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.remove('hidden');
        }
        if (this.elements.table) {
            this.elements.table.style.opacity = '0.5';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.add('hidden');
        }
        if (this.elements.table) {
            this.elements.table.style.opacity = '1';
        }
    }

    /**
     * Show empty state
     */
    showEmpty() {
        if (this.elements.empty) {
            this.elements.empty.classList.remove('hidden');
        }
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        if (this.elements.empty) {
            this.elements.empty.classList.add('hidden');
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
        // Simple alert for now - could be enhanced with toast notification
        alert(`✅ ${message}`);
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(`❌ ${message}`);
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            // Load translations script if not already loaded
            if (!window.accessControlTranslations) {
                const script = document.createElement('script');
                script.src = '/admin/components/access-control/access-control-translations.js';
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(() => reject(new Error('Translation script timeout')), 5000);
                });

                // Wait a bit for the translations object to be available
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Initialize translations
            if (window.accessControlTranslations && !window.accessControlTranslations.isInitialized) {
                await window.accessControlTranslations.init();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.accessControlTranslations) {
            window.accessControlTranslations.updateTranslations();
        }
        this.showTranslatableContent();
        
        // Re-populate filter options with new translations
        this.populateFilterOptions();
        
        // Re-render table with new translations
        if (this.grants && this.grants.length > 0) {
            this.renderGrants();
        }
    }

    /**
     * Show translatable content by adding loaded class
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#access-control .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }

    /**
     * Get translation
     */
    getTranslation(key) {
        if (window.accessControlTranslations && window.accessControlTranslations.isInitialized) {
            return window.accessControlTranslations.getTranslation(key);
        }
        return key;
    }

} // End of AccessControl class

// Export globally
if (typeof window !== 'undefined') {
    window.AccessControl = AccessControl;
}

} // End of if (typeof window.AccessControl === 'undefined')

/**
 * Service Management Component
 * Handles service list display, search, filtering, CRUD operations, and pricing management
 */

if (typeof window.ServiceManagement === 'undefined') {
class ServiceManagement {
    constructor() {
        this.isInitialized = false;
        this.services = [];
        this.filteredServices = [];
        this.filters = {
            search: '',
            category: [], // Multi-select for categories
            status: [], // Multi-select for status
            saleStatus: 'all', // Single select: all, on_sale, not_on_sale
            featured: 'all' // Single select: all, featured, not_featured
        };
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.searchTimeout = null;
        this.elements = {};
        this.currentEditingService = null;
        this.currencies = ['CHF', 'USD', 'EUR', 'GBP'];
    }

    /**
     * Initialize the service management component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.initializeElements();
            this.setupEventListeners();
            await this.initializeTranslations();
            this.showTranslatableContent();
            await this.loadServices();
            this.populateFilterOptions();
            this.applyFilters();

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Service Management: Failed to initialize:', error);
            this.showError('Failed to initialize service management');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            searchInput: document.getElementById('service-search-input'),
            categoryDropdown: document.getElementById('category-dropdown'),
            categoryDropdownBtn: document.getElementById('category-dropdown-btn'),
            categoryOptions: document.getElementById('category-options'),
            categorySelectAll: document.getElementById('category-select-all'),
            categoryDeselectAll: document.getElementById('category-deselect-all'),
            statusDropdown: document.getElementById('status-dropdown'),
            statusDropdownBtn: document.getElementById('status-dropdown-btn'),
            statusOptions: document.getElementById('status-options'),
            statusSelectAll: document.getElementById('status-select-all'),
            statusDeselectAll: document.getElementById('status-deselect-all'),
            saleFilter: document.getElementById('sale-filter'),
            featuredFilter: document.getElementById('featured-filter'),
            clearBtn: document.getElementById('service-clear-filters-btn'),
            addButton: document.getElementById('add-service-button'),
            selectAllCheckbox: document.getElementById('select-all-checkbox'),
            bulkActions: document.getElementById('bulk-actions'),
            bulkFeaturedBtn: document.getElementById('bulk-featured-btn'),
            bulkUnfeaturedBtn: document.getElementById('bulk-unfeatured-btn'),
            selectedCount: document.getElementById('selected-count'),
            modal: document.getElementById('service-modal'),
            modalOverlay: document.getElementById('service-modal-overlay'),
            modalClose: document.getElementById('service-modal-close'),
            modalCancel: document.getElementById('service-modal-cancel'),
            modalSave: document.getElementById('service-modal-save'),
            modalTitle: document.getElementById('service-modal-title'),
            form: document.getElementById('service-form'),
            currencyPricingEditor: document.getElementById('currency-pricing-editor'),
            reducedFarePricingEditor: document.getElementById('reduced-fare-pricing-editor'),
            salePricingEditor: document.getElementById('sale-pricing-editor')
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

        // Single select filters
        if (this.elements.saleFilter) {
            this.elements.saleFilter.addEventListener('change', (e) => {
                this.filters.saleStatus = e.target.value;
                this.applyFilters();
            });
        }

        if (this.elements.featuredFilter) {
            this.elements.featuredFilter.addEventListener('change', (e) => {
                this.filters.featured = e.target.value;
                this.applyFilters();
            });
        }

        // Multi-select filter handlers
        ['category', 'status'].forEach(filterType => {
            const selectAllBtn = this.elements[`${filterType}SelectAll`];
            const deselectAllBtn = this.elements[`${filterType}DeselectAll`];

            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    this.handleSelectAll(filterType);
                });
            }

            if (deselectAllBtn) {
                deselectAllBtn.addEventListener('click', () => {
                    this.handleDeselectAll(filterType);
                });
            }
        });

        // Clear filters
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Initialize dropdowns
        this.initializeDropdowns();

        // Add Service button
        if (this.elements.addButton) {
            this.elements.addButton.addEventListener('click', () => {
                this.openAddModal();
            });
        }

        // Select all checkbox
        if (this.elements.selectAllCheckbox) {
            this.elements.selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Bulk actions
        if (this.elements.bulkFeaturedBtn) {
            this.elements.bulkFeaturedBtn.addEventListener('click', () => {
                this.bulkUpdateFeatured(true);
            });
        }

        if (this.elements.bulkUnfeaturedBtn) {
            this.elements.bulkUnfeaturedBtn.addEventListener('click', () => {
                this.bulkUpdateFeatured(false);
            });
        }

        // Modal handlers
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (this.elements.modalCancel) {
            this.elements.modalCancel.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (this.elements.modalSave) {
            this.elements.modalSave.addEventListener('click', () => {
                this.saveService();
            });
        }

        // Modal tabs
        const tabs = document.querySelectorAll('.service-management__modal-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use currentTarget to get the button, not the span inside
                const tabButton = e.currentTarget;
                const tabName = tabButton.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Pricing type change
        const pricingTypeSelect = document.getElementById('pricing-type');
        if (pricingTypeSelect) {
            pricingTypeSelect.addEventListener('change', (e) => {
                this.handlePricingTypeChange(e.target.value);
            });
        }

        // Service category change - re-initialize pricing editors if switching to/from membership
        const categorySelect = document.getElementById('service-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                // Only re-initialize if modal is open and editors exist
                if (this.elements.modal && !this.elements.modal.classList.contains('hidden')) {
                    if (this.elements.currencyPricingEditor) {
                        try {
                            const currentPricing = this.getPricingData() || this.currentEditingService?.pricing || {};
                            this.initializeCurrencyPricingEditor(currentPricing);
                        } catch (error) {
                            console.warn('Error re-initializing currency editor:', error);
                        }
                    }
                    if (this.elements.salePricingEditor && this.elements.salePricingEditor.innerHTML) {
                        try {
                            const currentSalePricing = this.getSalePricingData() || this.currentEditingService?.sale_pricing || {};
                            this.initializeSalePricingEditor(currentSalePricing);
                        } catch (error) {
                            console.warn('Error re-initializing sale pricing editor:', error);
                        }
                    }
                }
            });
        }

        // Reduced fare toggle
        const hasReducedFare = document.getElementById('has-reduced-fare');
        if (hasReducedFare) {
            hasReducedFare.addEventListener('change', (e) => {
                this.toggleReducedFare(e.target.checked);
            });
        }

        // On sale toggle
        const isOnSale = document.getElementById('is-on-sale');
        if (isOnSale) {
            isOnSale.addEventListener('change', (e) => {
                this.toggleSale(e.target.checked);
            });
        }

        // Sortable headers
        const sortableHeaders = document.querySelectorAll('.service-management__sortable-header');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.getAttribute('data-sort');
                this.handleSort(sortField);
            });
        });

        // Service Name - auto-generate slug
        const nameInput = document.getElementById('service-name');
        const slugInput = document.getElementById('service-slug');
        if (nameInput && slugInput) {
            nameInput.addEventListener('input', (e) => {
                if (!slugInput.dataset.manualEdit) {
                    const slug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    slugInput.value = slug;
                }
            });

            // Track manual slug edits
            slugInput.addEventListener('input', () => {
                slugInput.dataset.manualEdit = 'true';
            });
        }

        // Language change
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Load services from database
     */
    async loadServices() {
        try {
            this.showLoading();

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'service_list_viewed',
                    `Admin viewed service management list`
                );
            }

            // Query services
            const { data, error } = await window.supabase
                .from('services')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Database query error:', error);
                throw error;
            }

            this.services = data || [];
            this.filteredServices = [...this.services];

            this.hideLoading();
            this.renderServices();

        } catch (error) {
            console.error('❌ Failed to load services:', error);
            this.showError('Failed to load services');
            this.hideLoading();
        }
    }

    /**
     * Render services table
     */
    renderServices() {
        const tbody = document.getElementById('services-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredServices.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        this.filteredServices.forEach(service => {
            const row = this.createServiceRow(service);
            tbody.appendChild(row);
        });

        // Update bulk actions visibility after rendering
        this.updateBulkActionsVisibility();
    }

    /**
     * Create service table row
     */
    createServiceRow(service) {
        const tr = document.createElement('tr');
        tr.dataset.serviceId = service.id;

        // Checkbox cell
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'service-management__checkbox-cell';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'service-management__checkbox service-row-checkbox';
        checkbox.dataset.serviceId = service.id;
        checkbox.addEventListener('change', () => {
            this.updateBulkActionsVisibility();
        });
        checkboxCell.appendChild(checkbox);

        // Get pricing for display
        const pricing = service.pricing || {};
        const baseCurrency = service.base_price_currency || 'CHF';
        const basePricing = pricing[baseCurrency] || {};
        let price = basePricing.amount || service.price_range_min || 0;
        let priceMax = service.price_range_max;
        
        // Handle range pricing structure (min/max in JSONB)
        if (service.pricing_type === 'range' && basePricing.min !== undefined && basePricing.max !== undefined) {
            price = basePricing.min;
            priceMax = basePricing.max;
        }

        // Service Name
        const nameCell = document.createElement('td');
        nameCell.setAttribute('data-label', 'Service Name');
        nameCell.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
                <div style="font-weight: 600;">${service.name}</div>
                <div style="font-size: 0.8em; opacity: 0.7;">${service.slug}</div>
            </div>
        `;

        // Category
        const categoryCell = document.createElement('td');
        categoryCell.setAttribute('data-label', 'Category');
        categoryCell.textContent = service.service_category || '';

        // Status
        const statusCell = document.createElement('td');
        statusCell.setAttribute('data-label', 'Status');
        const status = service.status || 'available';
        statusCell.innerHTML = `
            <span class="service-management__badge service-management__badge--${status}">
                ${status}
            </span>
        `;

        // Pricing
        const pricingCell = document.createElement('td');
        pricingCell.setAttribute('data-label', 'Pricing');
        let pricingText = '';
        if (service.pricing_type === 'range' && priceMax) {
            pricingText = `${baseCurrency} ${price}-${priceMax}`;
        } else if (service.pricing_type === 'hourly') {
            pricingText = `${baseCurrency} ${price}/hour`;
        } else {
            pricingText = `${baseCurrency} ${price}`;
        }
        if (service.duration) {
            pricingText += ` (${service.duration})`;
        }
        pricingCell.textContent = pricingText;

        // Sale
        const saleCell = document.createElement('td');
        saleCell.setAttribute('data-label', 'Sale');
        if (service.is_on_sale) {
            saleCell.innerHTML = '<span class="service-management__sale-badge">ON SALE</span>';
        } else {
            saleCell.textContent = '-';
        }

        // Featured
        const featuredCell = document.createElement('td');
        featuredCell.setAttribute('data-label', 'Featured');
        featuredCell.innerHTML = service.is_featured 
            ? '<span style="color: var(--color-primary);">⭐</span>' 
            : '-';

        // Created
        const createdCell = document.createElement('td');
        createdCell.setAttribute('data-label', 'Created');
        const createdDate = new Date(service.created_at);
        createdCell.textContent = createdDate.toLocaleDateString();

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.setAttribute('data-label', 'Actions');
        actionsCell.className = 'service-management__actions-cell';
        actionsCell.innerHTML = `
            <button class="service-management__action-button" data-action="edit" data-id="${service.id}">
                Edit
            </button>
            <button class="service-management__action-button service-management__action-button--danger" data-action="delete" data-id="${service.id}">
                Delete
            </button>
        `;

        // Add action handlers
        actionsCell.querySelector('[data-action="edit"]').addEventListener('click', () => {
            this.openEditModal(service.id);
        });

        actionsCell.querySelector('[data-action="delete"]').addEventListener('click', () => {
            this.deleteService(service.id);
        });

        tr.appendChild(checkboxCell);
        tr.appendChild(nameCell);
        tr.appendChild(categoryCell);
        tr.appendChild(statusCell);
        tr.appendChild(pricingCell);
        tr.appendChild(saleCell);
        tr.appendChild(featuredCell);
        tr.appendChild(createdCell);
        tr.appendChild(actionsCell);

        return tr;
    }

    /**
     * Toggle select all checkboxes
     */
    toggleSelectAll(checked) {
        // Get all checkboxes in the table body (only visible/filtered rows)
        const tbody = document.getElementById('services-table-body');
        if (!tbody) {
            console.warn('Table body not found');
            return;
        }
        
        const checkboxes = tbody.querySelectorAll('.service-row-checkbox');
        if (checkboxes.length === 0) {
            console.warn('No checkboxes found in table');
            return;
        }
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        
        // Update bulk actions visibility and select all checkbox state
        this.updateBulkActionsVisibility();
    }

    /**
     * Get selected service IDs
     */
    getSelectedServiceIds() {
        const tbody = document.getElementById('services-table-body');
        if (!tbody) return [];
        const checkboxes = tbody.querySelectorAll('.service-row-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.serviceId);
    }

    /**
     * Update bulk actions visibility and count
     */
    updateBulkActionsVisibility() {
        const selectedIds = this.getSelectedServiceIds();
        const count = selectedIds.length;

        if (this.elements.bulkActions) {
            if (count > 0) {
                this.elements.bulkActions.classList.remove('hidden');
            } else {
                this.elements.bulkActions.classList.add('hidden');
            }
        }

        if (this.elements.selectedCount) {
            const countText = count === 1 ? '1 selected' : `${count} selected`;
            this.elements.selectedCount.textContent = countText;
        }

        // Update select all checkbox state (only check visible/filtered rows)
        if (this.elements.selectAllCheckbox) {
            const tbody = document.getElementById('services-table-body');
            if (tbody) {
                const allCheckboxes = tbody.querySelectorAll('.service-row-checkbox');
                const checkedCount = tbody.querySelectorAll('.service-row-checkbox:checked').length;
                this.elements.selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
                this.elements.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
            }
        }
    }

    /**
     * Bulk update featured status
     */
    async bulkUpdateFeatured(isFeatured) {
        const selectedIds = this.getSelectedServiceIds();
        
        if (selectedIds.length === 0) {
            this.showError('No services selected');
            return;
        }

        try {
            // Show loading state
            const originalText = isFeatured 
                ? this.elements.bulkFeaturedBtn.textContent 
                : this.elements.bulkUnfeaturedBtn.textContent;
            
            if (isFeatured && this.elements.bulkFeaturedBtn) {
                this.elements.bulkFeaturedBtn.disabled = true;
                this.elements.bulkFeaturedBtn.textContent = 'Updating...';
            } else if (!isFeatured && this.elements.bulkUnfeaturedBtn) {
                this.elements.bulkUnfeaturedBtn.disabled = true;
                this.elements.bulkUnfeaturedBtn.textContent = 'Updating...';
            }

            // Update each service
            const updatePromises = selectedIds.map(serviceId => {
                return this.updateServiceFeaturedStatus(serviceId, isFeatured);
            });

            await Promise.all(updatePromises);

            // Reload services and reapply filters
            await this.loadServices();
            this.applyFilters();

            // Clear selections
            this.toggleSelectAll(false);

            // Show success message
            this.showSuccess(`Successfully updated ${selectedIds.length} service(s)`);

        } catch (error) {
            console.error('Error bulk updating featured status:', error);
            this.showError('Failed to update services');
        } finally {
            // Restore button state
            if (isFeatured && this.elements.bulkFeaturedBtn) {
                this.elements.bulkFeaturedBtn.disabled = false;
                this.elements.bulkFeaturedBtn.innerHTML = originalText;
            } else if (!isFeatured && this.elements.bulkUnfeaturedBtn) {
                this.elements.bulkUnfeaturedBtn.disabled = false;
                this.elements.bulkUnfeaturedBtn.innerHTML = originalText;
            }
        }
    }

    /**
     * Update a single service's featured status
     */
    async updateServiceFeaturedStatus(serviceId, isFeatured) {
        try {
            const { data: service } = await window.supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .single();

            if (!service) {
                throw new Error('Service not found');
            }

            const { error } = await window.supabase
                .from('services')
                .update({ is_featured: isFeatured })
                .eq('id', serviceId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error(`Error updating service ${serviceId}:`, error);
            throw error;
        }
    }

    /**
     * Open add service modal
     */
    openAddModal() {
        this.currentEditingService = null;
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = 'Add New Service';
        }
        if (this.elements.form) {
            this.elements.form.reset();
        }
        // Reset slug manual edit flag
        const slugInput = document.getElementById('service-slug');
        if (slugInput) {
            delete slugInput.dataset.manualEdit;
        }
        this.initializeCurrencyPricingEditor();
        this.switchTab('basic');
        this.showModal();
    }

    /**
     * Open edit service modal
     */
    async openEditModal(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        this.currentEditingService = service;
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = 'Edit Service';
        }

        // Convert pricing structure for range pricing if needed (before populating form)
        let pricingToUse = service.pricing || {};
        if (service.pricing_type === 'range' && service.pricing) {
            // Convert existing pricing structure to min/max format if needed
            pricingToUse = {};
            Object.keys(service.pricing).forEach(currency => {
                const currencyData = service.pricing[currency];
                if (currencyData.min !== undefined && currencyData.max !== undefined) {
                    // Already in min/max format
                    pricingToUse[currency] = currencyData;
                } else if (currencyData.amount !== undefined) {
                    // Convert from amount to min/max using price_range_min/max as fallback
                    pricingToUse[currency] = {
                        min: service.price_range_min || currencyData.amount,
                        max: service.price_range_max || currencyData.amount
                    };
                }
            });
        }
        
        // Populate form (this will call handlePricingTypeChange which will initialize currency editor)
        this.populateForm(service);
        
        // Re-initialize currency editor with converted pricing data
        this.handlePricingTypeChange(service.pricing_type, pricingToUse);
        
        if (service.has_reduced_fare) {
            this.initializeReducedFarePricingEditor(service.pricing);
        }
        if (service.is_on_sale && service.sale_pricing) {
            this.initializeSalePricingEditor(service.sale_pricing);
        }

        this.switchTab('basic');
        this.showModal();
    }

    /**
     * Populate form with service data
     */
    populateForm(service) {
        // Set slug manual edit flag when editing
        const slugInput = document.getElementById('service-slug');
        if (slugInput) {
            slugInput.dataset.manualEdit = 'true';
        }

        const fields = {
            'service-name': service.name,
            'service-slug': service.slug,
            'service-category': service.service_category,
            'service-status': service.status,
            'service-short-description': service.short_description || '',
            'service-description': service.description || '',
            'service-featured': service.is_featured,
            'service-active': service.is_active,
            'pricing-type': service.pricing_type,
            'base-currency': service.base_price_currency,
            'price-range-min': service.price_range_min || '',
            'price-range-max': service.price_range_max || '',
            'hourly-rate': service.hourly_rate || '',
            'duration': service.duration || '',
            'additional-costs': service.additional_costs || '',
            'has-reduced-fare': service.has_reduced_fare,
            'reduced-fare-eligibility': service.reduced_fare_eligibility || '',
            'is-on-sale': service.is_on_sale,
            'sale-start-date': service.sale_start_date ? new Date(service.sale_start_date).toISOString().slice(0, 16) : '',
            'sale-end-date': service.sale_end_date ? new Date(service.sale_end_date).toISOString().slice(0, 16) : '',
            'sale-description': service.sale_description || '',
            'stripe-product-id': service.stripe_product_id || '',
            'stripe-price-id': service.stripe_price_id || '',
            'stripe-price-reduced-id': service.stripe_price_reduced_id || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Handle conditional fields
        this.handlePricingTypeChange(service.pricing_type);
        this.toggleReducedFare(service.has_reduced_fare);
        this.toggleSale(service.is_on_sale);
    }

    /**
     * Check if current service is a membership service
     */
    isMembershipService() {
        try {
            const categorySelect = document.getElementById('service-category');
            const category = categorySelect ? categorySelect.value : '';
            const slugInput = document.getElementById('service-slug');
            const slug = slugInput ? slugInput.value : '';
            
            // Check if it's a catalog-access service and a membership
            if (category === 'catalog-access') {
                const membershipSlugs = ['all-tools-membership', 'supporter-tier'];
                return membershipSlugs.includes(slug) || 
                       (this.currentEditingService && membershipSlugs.includes(this.currentEditingService.slug));
            }
            return false;
        } catch (error) {
            console.warn('Error checking membership service:', error);
            return false;
        }
    }

    /**
     * Initialize currency pricing editor
     */
    initializeCurrencyPricingEditor(pricing = {}) {
        if (!this.elements.currencyPricingEditor) return;

        this.elements.currencyPricingEditor.innerHTML = '';

        // Get current pricing type
        const pricingTypeSelect = document.getElementById('pricing-type');
        const pricingType = pricingTypeSelect ? pricingTypeSelect.value : 'fixed';
        const isRange = pricingType === 'range';
        const isMembership = this.isMembershipService();

        this.currencies.forEach(currency => {
            const currencyData = pricing[currency] || {};
            const row = document.createElement('div');
            row.className = 'service-management__currency-row';
            
            if (isMembership) {
                // For membership services, create 4 inputs: monthly, yearly, family_monthly, family_yearly
                row.innerHTML = `
                    <div class="service-management__currency-label">${currency}</div>
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="monthly"
                        step="0.01"
                        placeholder="Monthly"
                        value="${currencyData.monthly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="yearly"
                        step="0.01"
                        placeholder="Yearly"
                        value="${currencyData.yearly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="family_monthly"
                        step="0.01"
                        placeholder="Family Monthly"
                        value="${currencyData.family_monthly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="family_yearly"
                        step="0.01"
                        placeholder="Family Yearly"
                        value="${currencyData.family_yearly || ''}">
                `;
            } else if (isRange) {
                // For range pricing, create min and max inputs
                row.innerHTML = `
                    <div class="service-management__currency-label">${currency}</div>
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="min"
                        step="0.01"
                        placeholder="Min"
                        value="${currencyData.min || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="max"
                        step="0.01"
                        placeholder="Max"
                        value="${currencyData.max || ''}">
                    <div></div>
                    <div></div>
                `;
            } else {
                // For fixed/hourly/variable, create single amount input
                row.innerHTML = `
                    <div class="service-management__currency-label">${currency}</div>
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="amount"
                        step="0.01"
                        placeholder="Amount"
                        value="${currencyData.amount || ''}">
                    <div></div>
                    <div></div>
                    <div></div>
                `;
            }
            
            this.elements.currencyPricingEditor.appendChild(row);
        });
    }

    /**
     * Initialize reduced fare pricing editor
     */
    initializeReducedFarePricingEditor(pricing = {}) {
        if (!this.elements.reducedFarePricingEditor) return;

        this.elements.reducedFarePricingEditor.innerHTML = '';

        this.currencies.forEach(currency => {
            const currencyData = pricing[currency] || {};
            const row = document.createElement('div');
            row.className = 'service-management__currency-row';
            row.innerHTML = `
                <div class="service-management__currency-label">${currency}</div>
                <input 
                    type="number" 
                    class="service-management__currency-input" 
                    data-currency="${currency}" 
                    data-type="reduced_amount"
                    step="0.01"
                    placeholder="Reduced amount"
                    value="${currencyData.reduced_amount || ''}">
            `;
            this.elements.reducedFarePricingEditor.appendChild(row);
        });
    }

    /**
     * Initialize sale pricing editor
     */
    initializeSalePricingEditor(salePricing = {}) {
        if (!this.elements.salePricingEditor) return;

        this.elements.salePricingEditor.innerHTML = '';

        const isMembership = this.isMembershipService();

        this.currencies.forEach(currency => {
            const currencyData = salePricing[currency] || {};
            const row = document.createElement('div');
            row.className = 'service-management__currency-row';
            
            if (isMembership) {
                // For membership services, create 4 sale price inputs
                row.innerHTML = `
                    <div class="service-management__currency-label">${currency}</div>
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="monthly"
                        step="0.01"
                        placeholder="Sale Monthly"
                        value="${currencyData.monthly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="yearly"
                        step="0.01"
                        placeholder="Sale Yearly"
                        value="${currencyData.yearly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="family_monthly"
                        step="0.01"
                        placeholder="Sale Family Monthly"
                        value="${currencyData.family_monthly || ''}">
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="family_yearly"
                        step="0.01"
                        placeholder="Sale Family Yearly"
                        value="${currencyData.family_yearly || ''}">
                `;
            } else {
                // For non-membership services, single sale amount input
                row.innerHTML = `
                    <div class="service-management__currency-label">${currency}</div>
                    <input 
                        type="number" 
                        class="service-management__currency-input" 
                        data-currency="${currency}" 
                        data-type="amount"
                        step="0.01"
                        placeholder="Sale amount"
                        value="${currencyData.amount || ''}">
                    <div></div>
                    <div></div>
                    <div></div>
                `;
            }
            
            this.elements.salePricingEditor.appendChild(row);
        });
    }

    /**
     * Get pricing data from form
     */
    getPricingData() {
        const pricing = {};
        const inputs = this.elements.currencyPricingEditor?.querySelectorAll('[data-currency]') || [];
        
        inputs.forEach(input => {
            const currency = input.dataset.currency;
            const type = input.dataset.type;
            const value = parseFloat(input.value);

            if (!pricing[currency]) {
                pricing[currency] = {};
            }

            if (!isNaN(value)) {
                pricing[currency][type] = value;
            }
        });

        return pricing;
    }

    /**
     * Get reduced fare pricing data from form
     */
    getReducedFarePricingData() {
        const pricing = {};
        const inputs = this.elements.reducedFarePricingEditor?.querySelectorAll('[data-currency]') || [];
        
        inputs.forEach(input => {
            const currency = input.dataset.currency;
            const value = parseFloat(input.value);

            if (!pricing[currency]) {
                pricing[currency] = {};
            }

            if (!isNaN(value)) {
                pricing[currency].reduced_amount = value;
            }
        });

        return pricing;
    }

    /**
     * Get sale pricing data from form
     */
    getSalePricingData() {
        const pricing = {};
        const inputs = this.elements.salePricingEditor?.querySelectorAll('[data-currency]') || [];
        
        inputs.forEach(input => {
            const currency = input.dataset.currency;
            const value = parseFloat(input.value);

            if (!pricing[currency]) {
                pricing[currency] = {};
            }

            if (!isNaN(value)) {
                pricing[currency].amount = value;
            }
        });

        return pricing;
    }

    /**
     * Save service
     */
    async saveService() {
        try {
            if (!this.elements.form || !this.elements.form.checkValidity()) {
                this.elements.form?.reportValidity();
                return;
            }

            const formData = new FormData(this.elements.form);
            const pricing = this.getPricingData();
            
            // Merge reduced fare pricing into main pricing
            if (formData.get('has_reduced_fare') === 'on') {
                const reducedFarePricing = this.getReducedFarePricingData();
                Object.keys(reducedFarePricing).forEach(currency => {
                    if (!pricing[currency]) pricing[currency] = {};
                    if (reducedFarePricing[currency] && reducedFarePricing[currency].reduced_amount !== undefined) {
                        pricing[currency].reduced_amount = reducedFarePricing[currency].reduced_amount;
                    }
                });
            }

            const serviceData = {
                name: formData.get('name'),
                slug: formData.get('slug'),
                service_category: formData.get('service_category'),
                status: formData.get('status'),
                short_description: formData.get('short_description') || null,
                description: formData.get('description') || null,
                is_featured: formData.get('is_featured') === 'on',
                is_active: formData.get('is_active') === 'on',
                pricing_type: formData.get('pricing_type'),
                base_price_currency: formData.get('base_price_currency'),
                pricing: pricing,
                price_range_min: formData.get('price_range_min') ? parseFloat(formData.get('price_range_min')) : null,
                price_range_max: formData.get('price_range_max') ? parseFloat(formData.get('price_range_max')) : null,
                hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')) : null,
                duration: formData.get('duration') || null,
                additional_costs: formData.get('additional_costs') || null,
                has_reduced_fare: formData.get('has_reduced_fare') === 'on',
                reduced_fare_eligibility: formData.get('reduced_fare_eligibility') || null,
                is_on_sale: formData.get('is_on_sale') === 'on',
                sale_start_date: formData.get('sale_start_date') || null,
                sale_end_date: formData.get('sale_end_date') || null,
                sale_description: formData.get('sale_description') || null,
                sale_pricing: formData.get('is_on_sale') === 'on' ? this.getSalePricingData() : null,
                stripe_product_id: formData.get('stripe_product_id') || null,
                stripe_price_id: formData.get('stripe_price_id') || null,
                stripe_price_reduced_id: formData.get('stripe_price_reduced_id') || null
            };

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            let result;
            if (this.currentEditingService) {
                // Update
                const { data, error } = await window.supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', this.currentEditingService.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Insert
                const { data, error } = await window.supabase
                    .from('services')
                    .insert(serviceData)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    this.currentEditingService ? 'service_updated' : 'service_created',
                    `Service: ${result.name}`
                );
            }

            await this.loadServices();
            this.applyFilters(); // Reapply filters to preserve filter state
            this.closeModal();
            this.showSuccess(this.currentEditingService ? 'Service updated successfully' : 'Service created successfully');

        } catch (error) {
            console.error('❌ Failed to save service:', error);
            this.showError('Failed to save service: ' + error.message);
        }
    }

    /**
     * Delete service
     */
    async deleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }

        try {
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            const { error } = await window.supabase
                .from('services')
                .delete()
                .eq('id', serviceId);

            if (error) throw error;

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'service_deleted',
                    `Service ID: ${serviceId}`
                );
            }

            await this.loadServices();
            this.applyFilters(); // Reapply filters to preserve filter state
            this.showSuccess('Service deleted successfully');

        } catch (error) {
            console.error('❌ Failed to delete service:', error);
            this.showError('Failed to delete service: ' + error.message);
        }
    }

    /**
     * Handle pricing type change
     * @param {string} pricingType - The pricing type
     * @param {Object} pricingData - Optional pricing data to use when re-initializing
     */
    handlePricingTypeChange(pricingType, pricingData = null) {
        const rangeGroup = document.getElementById('range-pricing-group');
        const hourlyGroup = document.getElementById('hourly-pricing-group');

        if (rangeGroup) rangeGroup.style.display = pricingType === 'range' ? 'block' : 'none';
        if (hourlyGroup) hourlyGroup.style.display = pricingType === 'hourly' ? 'block' : 'none';
        
        // Re-initialize currency editor with current pricing data to switch between single/multiple inputs
        if (this.elements.currencyPricingEditor) {
            // Use provided pricing data, or get current pricing data, or use service pricing
            const currentPricing = pricingData || this.getPricingData() || this.currentEditingService?.pricing || {};
            this.initializeCurrencyPricingEditor(currentPricing);
        }
        
        // Also re-initialize sale pricing editor if it exists and has content
        if (this.elements.salePricingEditor && this.elements.salePricingEditor.innerHTML) {
            const currentSalePricing = this.getSalePricingData() || this.currentEditingService?.sale_pricing || {};
            this.initializeSalePricingEditor(currentSalePricing);
        }
    }

    /**
     * Toggle reduced fare section
     */
    toggleReducedFare(enabled) {
        const eligibilityGroup = document.getElementById('reduced-fare-eligibility-group');
        const pricingGroup = document.getElementById('reduced-fare-pricing-group');

        if (eligibilityGroup) eligibilityGroup.style.display = enabled ? 'block' : 'none';
        if (pricingGroup) {
            pricingGroup.style.display = enabled ? 'block' : 'none';
            if (enabled && !this.elements.reducedFarePricingEditor?.innerHTML) {
                const currentPricing = this.currentEditingService?.pricing || {};
                this.initializeReducedFarePricingEditor(currentPricing);
            }
        }
    }

    /**
     * Toggle sale section
     */
    toggleSale(enabled) {
        const datesGroup = document.getElementById('sale-dates-group');
        const descriptionGroup = document.getElementById('sale-description-group');
        const pricingGroup = document.getElementById('sale-pricing-group');

        if (datesGroup) datesGroup.style.display = enabled ? 'block' : 'none';
        if (descriptionGroup) descriptionGroup.style.display = enabled ? 'block' : 'none';
        if (pricingGroup) {
            pricingGroup.style.display = enabled ? 'block' : 'none';
            if (enabled) {
                // Always re-initialize to ensure correct layout (membership vs regular)
                const currentSalePricing = this.getSalePricingData() || this.currentEditingService?.sale_pricing || {};
                this.initializeSalePricingEditor(currentSalePricing);
            }
        }
    }

    /**
     * Switch modal tab
     */
    switchTab(tabName) {
        if (!tabName) {
            console.warn('⚠️ No tab name provided to switchTab');
            return;
        }

        // Update tab buttons
        document.querySelectorAll('.service-management__modal-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.service-management__tab-content').forEach(content => {
            if (content.dataset.tabContent === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    /**
     * Show modal
     */
    showModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
        this.currentEditingService = null;
        if (this.elements.form) {
            this.elements.form.reset();
        }
    }

    /**
     * Apply filters
     */
    applyFilters() {
        this.filteredServices = this.services.filter(service => {
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const matchesSearch = 
                    service.name.toLowerCase().includes(searchLower) ||
                    service.slug.toLowerCase().includes(searchLower) ||
                    (service.description && service.description.toLowerCase().includes(searchLower)) ||
                    (service.short_description && service.short_description.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            // Category filter
            if (this.filters.category.length > 0) {
                if (!this.filters.category.includes(service.service_category)) return false;
            }

            // Status filter
            if (this.filters.status.length > 0) {
                if (!this.filters.status.includes(service.status)) return false;
            }

            // Sale status filter
            if (this.filters.saleStatus === 'on_sale' && !service.is_on_sale) return false;
            if (this.filters.saleStatus === 'not_on_sale' && service.is_on_sale) return false;

            // Featured filter
            if (this.filters.featured === 'featured' && !service.is_featured) return false;
            if (this.filters.featured === 'not_featured' && service.is_featured) return false;

            return true;
        });

        this.renderServices();
        this.updateSummary();
    }

    /**
     * Populate filter options
     */
    populateFilterOptions() {
        // Categories
        const categories = [...new Set(this.services.map(s => s.service_category))];
        this.populateDropdownOptions('category', categories);

        // Statuses
        const statuses = [...new Set(this.services.map(s => s.status))];
        this.populateDropdownOptions('status', statuses);
    }

    /**
     * Populate dropdown options
     */
    populateDropdownOptions(filterType, options) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'service-management__option';
            optionEl.innerHTML = `
                <input 
                    type="checkbox" 
                    class="service-management__checkbox" 
                    id="${filterType}-${option}" 
                    value="${option}"
                    ${this.filters[filterType].includes(option) ? 'checked' : ''}>
                <span>${option}</span>
            `;

            optionEl.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.filters[filterType].includes(option)) {
                        this.filters[filterType].push(option);
                    }
                } else {
                    this.filters[filterType] = this.filters[filterType].filter(f => f !== option);
                }
                this.applyFilters();
            });

            optionsContainer.appendChild(optionEl);
        });
    }

    /**
     * Handle select all
     */
    handleSelectAll(filterType) {
        const options = [...new Set(this.services.map(s => s[filterType === 'category' ? 'service_category' : 'status']))];
        this.filters[filterType] = [...options];
        this.populateDropdownOptions(filterType, options);
        this.applyFilters();
    }

    /**
     * Handle deselect all
     */
    handleDeselectAll(filterType) {
        this.filters[filterType] = [];
        this.populateDropdownOptions(filterType, [...new Set(this.services.map(s => s[filterType === 'category' ? 'service_category' : 'status']))]);
        this.applyFilters();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.filters = {
            search: '',
            category: [],
            status: [],
            saleStatus: 'all',
            featured: 'all'
        };

        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.saleFilter) this.elements.saleFilter.value = 'all';
        if (this.elements.featuredFilter) this.elements.featuredFilter.value = 'all';

        this.populateFilterOptions();
        this.applyFilters();
    }

    /**
     * Initialize dropdowns
     */
    initializeDropdowns() {
        ['category', 'status'].forEach(filterType => {
            const btn = this.elements[`${filterType}DropdownBtn`];
            const content = this.elements[`${filterType}Dropdown`];

            if (btn && content) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    content.classList.toggle('show');
                    btn.classList.toggle('active');
                });

                // Close on outside click
                document.addEventListener('click', (e) => {
                    if (!content.contains(e.target) && !btn.contains(e.target)) {
                        content.classList.remove('show');
                        btn.classList.remove('active');
                    }
                });
            }
        });
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

        this.filteredServices.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sort.direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        this.renderServices();
    }

    /**
     * Update summary
     */
    updateSummary() {
        const countEl = document.querySelector('.service-management__count');
        if (countEl) {
            const total = this.services.length;
            const filtered = this.filteredServices.length;
            countEl.textContent = `Showing ${filtered} of ${total} services`;
        }
    }

    /**
     * Show loading
     */
    showLoading() {
        const loading = document.getElementById('services-loading');
        const table = document.getElementById('services-table');
        if (loading) loading.classList.remove('hidden');
        if (table) table.style.display = 'none';
    }

    /**
     * Hide loading
     */
    hideLoading() {
        const loading = document.getElementById('services-loading');
        if (loading) loading.classList.add('hidden');
    }

    /**
     * Show table
     */
    showTable() {
        const table = document.getElementById('services-table');
        if (table) table.style.display = 'table';
    }

    /**
     * Hide table
     */
    hideTable() {
        const table = document.getElementById('services-table');
        if (table) table.style.display = 'none';
    }

    /**
     * Show empty
     */
    showEmpty() {
        const empty = document.getElementById('services-empty');
        if (empty) empty.classList.remove('hidden');
    }

    /**
     * Hide empty
     */
    hideEmpty() {
        const empty = document.getElementById('services-empty');
        if (empty) empty.classList.add('hidden');
    }

    /**
     * Show error
     */
    showError(message) {
        if (window.adminLayout) {
            window.adminLayout.showError(message);
        } else {
            alert(message);
        }
    }

    /**
     * Show success
     */
    showSuccess(message) {
        if (window.adminLayout) {
            window.adminLayout.showSuccess(message);
        } else {
            alert(message);
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        // Translation initialization will be handled by translation component
        if (window.ServiceManagementTranslations) {
            await window.ServiceManagementTranslations.init();
        }
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        document.querySelectorAll('.translatable-content').forEach(el => {
            el.classList.add('loaded');
        });
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.ServiceManagementTranslations) {
            window.ServiceManagementTranslations.updateTranslations();
        }
    }
}

// Export class
window.ServiceManagement = ServiceManagement;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('service-management')) {
            window.serviceManagement = new ServiceManagement();
            window.serviceManagement.init();
        }
    });
} else {
    if (document.getElementById('service-management')) {
        window.serviceManagement = new ServiceManagement();
        window.serviceManagement.init();
    }
}


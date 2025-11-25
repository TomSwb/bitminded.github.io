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
            window.logger?.error('❌ Service Management: Failed to initialize:', error);
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
            bulkRemoveSaleBtn: document.getElementById('bulk-remove-sale-btn'),
            bulkStatusOverbookedBtn: document.getElementById('bulk-status-overbooked-btn'),
            bulkStatusUnavailableBtn: document.getElementById('bulk-status-unavailable-btn'),
            bulkStatusArchivedBtn: document.getElementById('bulk-status-archived-btn'),
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
            saleDiscountPercentage: document.getElementById('sale-discount-percentage'),
            salePricingPreview: document.getElementById('sale-pricing-preview'),
            salePricingPreviewContent: document.getElementById('sale-pricing-preview-content'),
            // Stripe elements
            createStripeBtn: document.getElementById('create-stripe-service-btn'),
            stripeStatusSection: document.getElementById('stripe-status-section'),
            stripeStatus: document.getElementById('stripe-status'),
            stripeActions: document.getElementById('stripe-actions'),
            viewStripeLink: document.getElementById('view-stripe-link'),
            stripeCreateSection: document.getElementById('stripe-create-section'),
            deleteStripeBtn: document.getElementById('delete-stripe-service-btn'),
            updateStripeBtn: document.getElementById('update-stripe-service-btn')
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

        if (this.elements.bulkRemoveSaleBtn) {
            this.elements.bulkRemoveSaleBtn.addEventListener('click', () => {
                this.bulkRemoveSale();
            });
        }

        if (this.elements.bulkStatusOverbookedBtn) {
            this.elements.bulkStatusOverbookedBtn.addEventListener('click', () => {
                this.bulkUpdateStatus('overbooked');
            });
        }

        if (this.elements.bulkStatusUnavailableBtn) {
            this.elements.bulkStatusUnavailableBtn.addEventListener('click', () => {
                this.bulkUpdateStatus('unavailable');
            });
        }

        if (this.elements.bulkStatusArchivedBtn) {
            this.elements.bulkStatusArchivedBtn.addEventListener('click', () => {
                this.bulkUpdateStatus('archived');
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
                this.saveService({ skipModalClose: true });
            });
        }

        // Stripe product creation
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
        if (this.elements.updateStripeBtn) {
            this.elements.updateStripeBtn.addEventListener('click', () => {
                this.handleUpdateStripeProduct();
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
                // Auto-select payment_method based on category
                this.autoSelectPaymentMethod();
                
                // Only re-initialize if modal is open and editors exist
                if (this.elements.modal && !this.elements.modal.classList.contains('hidden')) {
                    if (this.elements.currencyPricingEditor) {
                        try {
                            const currentPricing = this.getPricingData() || this.currentEditingService?.pricing || {};
                            this.initializeCurrencyPricingEditor(currentPricing);
                        } catch (error) {
                            window.logger?.warn('Error re-initializing currency editor:', error);
                        }
                    }
                    // Update sale price preview when category/slug changes
                    if (document.getElementById('is-on-sale')?.checked) {
                        this.updateSalePricePreview();
                    }
                }
            });
        }
        
        // Additional costs change - update payment_method if travel costs added
        const additionalCostsInput = document.getElementById('additional-costs');
        if (additionalCostsInput) {
            additionalCostsInput.addEventListener('change', () => {
                this.autoSelectPaymentMethod();
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

        // Sale discount percentage input - update preview on change
        if (this.elements.saleDiscountPercentage) {
            this.elements.saleDiscountPercentage.addEventListener('input', () => {
                this.updateSalePricePreview();
            });
        }

        // Update preview when pricing changes
        if (this.elements.currencyPricingEditor) {
            // Listen to input events in pricing editor
            this.elements.currencyPricingEditor.addEventListener('input', () => {
                if (document.getElementById('is-on-sale')?.checked) {
                    this.updateSalePricePreview();
                }
            });
        }

        // Emoji picker handlers
        this.setupEmojiPickers();

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
                window.logger?.error('❌ Database query error:', error);
                throw error;
            }

            this.services = data || [];
            // Debug: Log first service to check payment_method
            if (this.services.length > 0) {
                window.logger?.log('First service payment_method:', this.services[0].payment_method, 'Full service:', this.services[0]);
            }
            this.filteredServices = [...this.services];

            this.hideLoading();
            this.renderServices();

        } catch (error) {
            window.logger?.error('❌ Failed to load services:', error);
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

        // Payment Method
        const paymentMethodCell = document.createElement('td');
        paymentMethodCell.setAttribute('data-label', 'Payment Method');
        // Ensure we always have a payment_method value (fallback to 'stripe' if missing)
        // Handle null, undefined, or empty string
        let paymentMethod = service.payment_method;
        if (!paymentMethod || (typeof paymentMethod === 'string' && paymentMethod.trim() === '')) {
            // Auto-determine based on category if not set
            if (service.service_category === 'commissioning') {
                paymentMethod = 'bank_transfer';
            } else if (service.service_category === 'tech-support') {
                // Check if has travel costs
                const hasTravel = service.additional_costs && 
                    (service.additional_costs.toLowerCase().includes('travel') || 
                     service.additional_costs.toLowerCase().includes('device cost'));
                paymentMethod = hasTravel ? 'bank_transfer' : 'stripe';
            } else if (service.service_category === 'catalog-access') {
                paymentMethod = 'stripe';
            } else {
                paymentMethod = 'stripe'; // Default fallback
            }
        }
        
        // Check if service supports both formats (can be in-person AND remote)
        // Tech support services with travel costs can be offered both ways
        const supportsBothFormats = service.service_category === 'tech-support' && 
                                    service.additional_costs && 
                                    (service.additional_costs.toLowerCase().includes('travel') || 
                                     service.additional_costs.toLowerCase().includes('device cost')) &&
                                    !service.additional_costs.toLowerCase().includes('only in-person') &&
                                    !service.additional_costs.toLowerCase().includes('in-person only');
        
        // Render payment method badges
        if (supportsBothFormats) {
            // Service supports both formats - show both badges
            paymentMethodCell.innerHTML = `
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="service-management__badge service-management__badge--stripe" title="Remote: Stripe payment">
                        Stripe
                    </span>
                    <span class="service-management__badge service-management__badge--bank-transfer" title="In-person: Bank transfer">
                        Bank Transfer
                    </span>
                </div>
                <small style="display: block; margin-top: 0.25rem; opacity: 0.7; font-size: 0.75em;">
                    Both (format determines payment)
                </small>
            `;
        } else {
            // Single payment method
            const paymentMethodBadgeClass = paymentMethod === 'bank_transfer' 
                ? 'service-management__badge--bank-transfer' 
                : 'service-management__badge--stripe';
            const paymentMethodLabel = paymentMethod === 'bank_transfer' 
                ? 'Bank Transfer' 
                : 'Stripe';
            paymentMethodCell.innerHTML = `
                <span class="service-management__badge ${paymentMethodBadgeClass}">
                    ${paymentMethodLabel}
                </span>
            `;
        }

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
        tr.appendChild(paymentMethodCell);
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
            window.logger?.warn('Table body not found');
            return;
        }
        
        const checkboxes = tbody.querySelectorAll('.service-row-checkbox');
        if (checkboxes.length === 0) {
            window.logger?.warn('No checkboxes found in table');
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
            window.logger?.error('Error bulk updating featured status:', error);
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
            window.logger?.error(`Error updating service ${serviceId}:`, error);
            throw error;
        }
    }

    /**
     * Bulk remove sale from selected services
     */
    async bulkRemoveSale() {
        const selectedIds = this.getSelectedServiceIds();
        
        if (selectedIds.length === 0) {
            this.showError('No services selected');
            return;
        }

        try {
            // Show loading state
            const originalText = this.elements.bulkRemoveSaleBtn.textContent;
            
            if (this.elements.bulkRemoveSaleBtn) {
                this.elements.bulkRemoveSaleBtn.disabled = true;
                this.elements.bulkRemoveSaleBtn.textContent = 'Removing...';
            }

            // Update each service
            const updatePromises = selectedIds.map(serviceId => {
                return this.updateServiceSaleStatus(serviceId, false);
            });

            await Promise.all(updatePromises);

            // Reload services and reapply filters
            await this.loadServices();
            this.applyFilters();

            // Clear selections
            this.toggleSelectAll(false);

            // Show success message
            this.showSuccess(`Successfully removed sale from ${selectedIds.length} service(s)`);

        } catch (error) {
            window.logger?.error('Error bulk removing sale:', error);
            this.showError('Failed to remove sale from services');
        } finally {
            // Restore button state
            if (this.elements.bulkRemoveSaleBtn) {
                this.elements.bulkRemoveSaleBtn.disabled = false;
                this.elements.bulkRemoveSaleBtn.innerHTML = originalText;
            }
        }
    }

    /**
     * Update a single service's sale status
     */
    async updateServiceSaleStatus(serviceId, isOnSale) {
        try {
            const { data: service } = await window.supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .single();

            if (!service) {
                throw new Error('Service not found');
            }

            const updateData = {
                is_on_sale: isOnSale
            };

            // If removing sale, also clear sale-related fields
            if (!isOnSale) {
                updateData.sale_start_date = null;
                updateData.sale_end_date = null;
                updateData.sale_description = null;
                updateData.sale_discount_percentage = null;
                updateData.sale_emoji_left = null;
                updateData.sale_emoji_right = null;
            }

            const { error } = await window.supabase
                .from('services')
                .update(updateData)
                .eq('id', serviceId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            window.logger?.error(`Error updating service ${serviceId}:`, error);
            throw error;
        }
    }

    /**
     * Bulk update service status
     */
    async bulkUpdateStatus(status) {
        const selectedIds = this.getSelectedServiceIds();
        
        if (selectedIds.length === 0) {
            this.showError('No services selected');
            return;
        }

        const statusLabels = {
            'overbooked': 'Overbooked',
            'unavailable': 'Unavailable',
            'archived': 'Archived'
        };

        const statusLabel = statusLabels[status] || status;

        try {
            // Show loading state
            let buttonElement = null;
            if (status === 'overbooked' && this.elements.bulkStatusOverbookedBtn) {
                buttonElement = this.elements.bulkStatusOverbookedBtn;
            } else if (status === 'unavailable' && this.elements.bulkStatusUnavailableBtn) {
                buttonElement = this.elements.bulkStatusUnavailableBtn;
            } else if (status === 'archived' && this.elements.bulkStatusArchivedBtn) {
                buttonElement = this.elements.bulkStatusArchivedBtn;
            }

            const originalText = buttonElement ? buttonElement.textContent : '';
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.textContent = 'Updating...';
            }

            // Update each service
            const updatePromises = selectedIds.map(serviceId => {
                return this.updateServiceStatus(serviceId, status);
            });

            await Promise.all(updatePromises);

            // Reload services and reapply filters
            await this.loadServices();
            this.applyFilters();

            // Clear selections
            this.toggleSelectAll(false);

            // Show success message
            this.showSuccess(`Successfully set ${selectedIds.length} service(s) to ${statusLabel}`);

        } catch (error) {
            window.logger?.error('Error bulk updating status:', error);
            this.showError('Failed to update service status');
        } finally {
            // Restore button state
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalText;
            }
        }
    }

    /**
     * Update a single service's status
     */
    async updateServiceStatus(serviceId, status) {
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
                .update({ status: status })
                .eq('id', serviceId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            window.logger?.error(`Error updating service ${serviceId}:`, error);
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
        // Sale pricing is now percentage-based, no need to initialize editor

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
            'service-payment-method': service.payment_method || 'stripe',
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
            'trial-days': service.trial_days || 0,
            'trial-requires-payment': service.trial_requires_payment || false,
            'duration': service.duration || '',
            'additional-costs': service.additional_costs || '',
            'has-reduced-fare': service.has_reduced_fare,
            'reduced-fare-eligibility': service.reduced_fare_eligibility || '',
            'is-on-sale': service.is_on_sale,
            'sale-start-date': service.sale_start_date ? new Date(service.sale_start_date).toISOString().slice(0, 16) : '',
            'sale-end-date': service.sale_end_date ? new Date(service.sale_end_date).toISOString().slice(0, 16) : '',
            'sale-description': service.sale_description || '',
            'sale-emoji-left': service.sale_emoji_left || '✨',
            'sale-emoji-right': service.sale_emoji_right || '✨',
            'sale-discount-percentage': service.sale_discount_percentage || '',
            'stripe-product-id': service.stripe_product_id || '',
            'stripe-price-id': service.stripe_price_id || '',
            'stripe-price-monthly-id': service.stripe_price_monthly_id || '',
            'stripe-price-yearly-id': service.stripe_price_yearly_id || '',
            'stripe-price-reduced-id': service.stripe_price_reduced_id || '',
            'stripe-price-sale-id': service.stripe_price_sale_id || '',
            'stripe-price-monthly-sale-id': service.stripe_price_monthly_sale_id || '',
            'stripe-price-yearly-sale-id': service.stripe_price_yearly_sale_id || ''
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
        this.handlePricingTypeChange(service.pricing_type, service.pricing);
        this.toggleReducedFare(service.has_reduced_fare);
        this.toggleSale(service.is_on_sale);

        // Show/hide Stripe create button based on whether product exists
        if (this.elements.createStripeBtn && this.elements.stripeCreateSection) {
            if (service.stripe_product_id) {
                this.elements.stripeCreateSection.style.display = 'none';
                if (this.elements.stripeStatusSection) {
                    this.elements.stripeStatusSection.style.display = 'block';
                    this.updateStripeStatus({
                        productId: service.stripe_product_id,
                        priceId: service.stripe_price_id,
                        monthlyPriceId: service.stripe_price_monthly_id,
                        yearlyPriceId: service.stripe_price_yearly_id,
                        reducedPriceId: service.stripe_price_reduced_id
                    });
                }
                // Show action buttons
                if (this.elements.stripeActions) {
                    this.elements.stripeActions.style.display = 'flex';
                }
            } else {
                this.elements.stripeCreateSection.style.display = 'block';
                if (this.elements.stripeStatusSection) {
                    this.elements.stripeStatusSection.style.display = 'none';
                }
                // Hide action buttons
                if (this.elements.stripeActions) {
                    this.elements.stripeActions.style.display = 'none';
                }
            }
            // Reset button state
            this.elements.createStripeBtn.disabled = false;
            const btnText = document.getElementById('create-stripe-btn-text');
            if (btnText) {
                btnText.textContent = 'Create Stripe Product';
            } else {
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span id="create-stripe-btn-text">Create Stripe Product</span>';
            }
        }
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
            window.logger?.warn('Error checking membership service:', error);
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
     * Calculate sale price from regular price and discount percentage
     */
    calculateSalePrice(regularPrice, discountPercentage) {
        if (!regularPrice || !discountPercentage || discountPercentage <= 0) {
            return null;
        }
        const discount = parseFloat(discountPercentage) / 100;
        return regularPrice * (1 - discount);
    }

    /**
     * Update sale price preview based on discount percentage
     */
    updateSalePricePreview() {
        if (!this.elements.salePricingPreview || !this.elements.salePricingPreviewContent) {
            return;
        }

        const discountPercentage = parseFloat(this.elements.saleDiscountPercentage?.value || 0);
        const pricing = this.getPricingData();
        const pricingType = document.getElementById('pricing-type')?.value || 'fixed';
        const isMembership = this.isMembershipService();

        if (!discountPercentage || discountPercentage <= 0 || !pricing || Object.keys(pricing).length === 0) {
            this.elements.salePricingPreview.style.display = 'none';
            return;
        }

        this.elements.salePricingPreview.style.display = 'block';
        this.elements.salePricingPreviewContent.innerHTML = '';

        this.currencies.forEach(currency => {
            const currencyPricing = pricing[currency] || {};
            const row = document.createElement('div');
            row.style.marginBottom = 'var(--spacing-sm, 0.75rem)';
            row.style.padding = 'var(--spacing-sm, 0.75rem)';
            row.style.background = 'var(--color-background-primary, rgba(15,23,42,0.6))';
            row.style.borderRadius = 'var(--radius-sm, 0.25rem)';

            let content = `<strong>${currency}:</strong><br>`;

            if (isMembership) {
                const monthly = currencyPricing.monthly;
                const yearly = currencyPricing.yearly;
                const familyMonthly = currencyPricing.family_monthly;
                const familyYearly = currencyPricing.family_yearly;

                if (monthly !== undefined) {
                    const salePrice = this.calculateSalePrice(monthly, discountPercentage);
                    content += `Monthly: ${currencyPricing.monthly} → ${salePrice?.toFixed(2)}<br>`;
                }
                if (yearly !== undefined) {
                    const salePrice = this.calculateSalePrice(yearly, discountPercentage);
                    content += `Yearly: ${currencyPricing.yearly} → ${salePrice?.toFixed(2)}<br>`;
                }
                if (familyMonthly !== undefined) {
                    const salePrice = this.calculateSalePrice(familyMonthly, discountPercentage);
                    content += `Family Monthly: ${currencyPricing.family_monthly} → ${salePrice?.toFixed(2)}<br>`;
                }
                if (familyYearly !== undefined) {
                    const salePrice = this.calculateSalePrice(familyYearly, discountPercentage);
                    content += `Family Yearly: ${currencyPricing.family_yearly} → ${salePrice?.toFixed(2)}<br>`;
                }
            } else if (pricingType === 'range') {
                const min = currencyPricing.min;
                const max = currencyPricing.max;
                if (min !== undefined && max !== undefined) {
                    const saleMin = this.calculateSalePrice(min, discountPercentage);
                    const saleMax = this.calculateSalePrice(max, discountPercentage);
                    content += `Range: ${min}-${max} → ${saleMin?.toFixed(2)}-${saleMax?.toFixed(2)}<br>`;
                }
            } else {
                const amount = currencyPricing.amount;
                if (amount !== undefined) {
                    const salePrice = this.calculateSalePrice(amount, discountPercentage);
                    content += `${amount} → ${salePrice?.toFixed(2)}<br>`;
                }
            }

            row.innerHTML = content;
            this.elements.salePricingPreviewContent.appendChild(row);
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
     * Get sale discount percentage from form
     */
    getSaleDiscountPercentage() {
        const percentage = parseFloat(this.elements.saleDiscountPercentage?.value || 0);
        return (!isNaN(percentage) && percentage > 0 && percentage <= 100) ? percentage : null;
    }

    /**
     * Save service
     */
    async saveService(options = {}) {
        const { skipModalClose = false, skipReload = false, skipSuccessMessage = false } = options;
        
        try {
            if (!this.elements.form || !this.elements.form.checkValidity()) {
                this.elements.form?.reportValidity();
                return { success: false, error: 'Form validation failed' };
            }

            const formData = new FormData(this.elements.form);
            const pricing = this.getPricingData();
            const isOnSale = formData.get('is_on_sale') === 'on';
            const discountPercentage = isOnSale ? this.getSaleDiscountPercentage() : null;
            
            // Calculate sale pricing from discount percentage if on sale
            let salePricing = null;
            if (isOnSale && discountPercentage && discountPercentage > 0) {
                salePricing = {};
                this.currencies.forEach(currency => {
                    const currencyPricing = pricing[currency] || {};
                    const saleCurrencyPricing = {};
                    
                    if (currencyPricing.amount !== undefined) {
                        saleCurrencyPricing.amount = this.calculateSalePrice(currencyPricing.amount, discountPercentage);
                    }
                    if (currencyPricing.monthly !== undefined) {
                        saleCurrencyPricing.monthly = this.calculateSalePrice(currencyPricing.monthly, discountPercentage);
                    }
                    if (currencyPricing.yearly !== undefined) {
                        saleCurrencyPricing.yearly = this.calculateSalePrice(currencyPricing.yearly, discountPercentage);
                    }
                    
                    if (Object.keys(saleCurrencyPricing).length > 0) {
                        salePricing[currency] = saleCurrencyPricing;
                    }
                });
            }
            
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
                payment_method: formData.get('payment_method') || 'stripe',
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
                trial_days: formData.get('pricing_type') === 'subscription' ? (parseInt(formData.get('trial_days')) || 0) : null,
                trial_requires_payment: formData.get('pricing_type') === 'subscription' ? (formData.get('trial_requires_payment') === 'on') : false,
                duration: formData.get('duration') || null,
                additional_costs: formData.get('additional_costs') || null,
                has_reduced_fare: formData.get('has_reduced_fare') === 'on',
                reduced_fare_eligibility: formData.get('reduced_fare_eligibility') || null,
                is_on_sale: formData.get('is_on_sale') === 'on',
                sale_start_date: formData.get('sale_start_date') || null,
                sale_end_date: formData.get('sale_end_date') || null,
                sale_description: formData.get('sale_description') || null,
                sale_emoji_left: formData.get('sale_emoji_left') || '✨',
                sale_emoji_right: formData.get('sale_emoji_right') || '✨',
                sale_discount_percentage: isOnSale ? discountPercentage : null,
                sale_pricing: salePricing, // Calculated from discount percentage
                stripe_product_id: formData.get('stripe_product_id') || this.currentEditingService?.stripe_product_id || null,
                stripe_price_id: formData.get('stripe_price_id') || this.currentEditingService?.stripe_price_id || null,
                stripe_price_monthly_id: formData.get('stripe_price_monthly_id') || this.currentEditingService?.stripe_price_monthly_id || null,
                stripe_price_yearly_id: formData.get('stripe_price_yearly_id') || this.currentEditingService?.stripe_price_yearly_id || null,
                stripe_price_reduced_id: formData.get('stripe_price_reduced_id') || this.currentEditingService?.stripe_price_reduced_id || null
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

            if (!skipReload) {
                await this.loadServices();
                this.applyFilters(); // Reapply filters to preserve filter state
            }
            
            if (!skipModalClose) {
                this.closeModal();
            }
            
            if (!skipSuccessMessage) {
                this.showSuccess(this.currentEditingService ? 'Service updated successfully' : 'Service created successfully');
            }

            return { success: true, data: result };

        } catch (error) {
            window.logger?.error('❌ Failed to save service:', error);
            this.showError('Failed to save service: ' + error.message);
            return { success: false, error: error.message };
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
            window.logger?.error('❌ Failed to delete service:', error);
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
        const trialGroup = document.getElementById('trial-period-group');

        if (rangeGroup) rangeGroup.style.display = pricingType === 'range' ? 'block' : 'none';
        if (hourlyGroup) hourlyGroup.style.display = pricingType === 'hourly' ? 'block' : 'none';
        if (trialGroup) trialGroup.style.display = pricingType === 'subscription' ? 'block' : 'none';
        
        // Re-initialize currency editor with current pricing data to switch between single/multiple inputs
        if (this.elements.currencyPricingEditor) {
            // Use provided pricing data, or get current pricing data, or use service pricing
            const currentPricing = pricingData || this.getPricingData() || this.currentEditingService?.pricing || {};
            this.initializeCurrencyPricingEditor(currentPricing);
        }
        
        // Update sale price preview if sale is enabled
        if (document.getElementById('is-on-sale')?.checked) {
            this.updateSalePricePreview();
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
        const salePricesGroup = document.getElementById('stripe-sale-prices-group');

        if (datesGroup) datesGroup.style.display = enabled ? 'block' : 'none';
        if (descriptionGroup) descriptionGroup.style.display = enabled ? 'block' : 'none';
        if (pricingGroup) {
            pricingGroup.style.display = enabled ? 'block' : 'none';
            if (enabled) {
                // Update sale price preview when enabled
                this.updateSalePricePreview();
            }
        }
    }

    /**
     * Setup emoji pickers
     */
    setupEmojiPickers() {
        const leftPickerBtn = document.getElementById('emoji-picker-left-btn');
        const rightPickerBtn = document.getElementById('emoji-picker-right-btn');
        const leftPicker = document.getElementById('emoji-picker-left');
        const rightPicker = document.getElementById('emoji-picker-right');
        const leftInput = document.getElementById('sale-emoji-left');
        const rightInput = document.getElementById('sale-emoji-right');

        // Left emoji picker
        if (leftPickerBtn && leftPicker && leftInput) {
            leftPickerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close right picker if open
                if (rightPicker) rightPicker.style.display = 'none';
                // Toggle left picker
                const isVisible = leftPicker.style.display === 'block';
                leftPicker.style.display = isVisible ? 'none' : 'block';
            });

            // Handle emoji selection
            leftPicker.querySelectorAll('.service-management__emoji-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const emoji = btn.getAttribute('data-emoji');
                    leftInput.value = emoji;
                    leftPicker.style.display = 'none';
                });
            });
        }

        // Right emoji picker
        if (rightPickerBtn && rightPicker && rightInput) {
            rightPickerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close left picker if open
                if (leftPicker) leftPicker.style.display = 'none';
                // Toggle right picker
                const isVisible = rightPicker.style.display === 'block';
                rightPicker.style.display = isVisible ? 'none' : 'block';
            });

            // Handle emoji selection
            rightPicker.querySelectorAll('.service-management__emoji-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const emoji = btn.getAttribute('data-emoji');
                    rightInput.value = emoji;
                    rightPicker.style.display = 'none';
                });
            });
        }

        // Close pickers when clicking outside
        document.addEventListener('click', (e) => {
            if (leftPicker && !leftPicker.contains(e.target) && leftPickerBtn && !leftPickerBtn.contains(e.target)) {
                leftPicker.style.display = 'none';
            }
            if (rightPicker && !rightPicker.contains(e.target) && rightPickerBtn && !rightPickerBtn.contains(e.target)) {
                rightPicker.style.display = 'none';
            }
        });
    }

    /**
     * Switch modal tab
     */
    switchTab(tabName) {
        if (!tabName) {
            window.logger?.warn('⚠️ No tab name provided to switchTab');
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
     * Handle Stripe product creation
     */
    async handleCreateStripeProduct() {
        if (!this.currentEditingService) {
            this.showError('Please save the service first before creating Stripe product');
            return;
        }

        // Check if service pricing type is compatible with Stripe
        const pricingType = this.currentEditingService.pricing_type || 
                           document.getElementById('pricing-type')?.value;
        
        // Only fixed and subscription pricing can use Stripe (range/hourly/variable need custom quotes)
        if (pricingType !== 'fixed' && pricingType !== 'subscription') {
            const pricingTypeLabels = {
                'range': 'Range',
                'hourly': 'Hourly',
                'variable': 'Variable'
            };
            const label = pricingTypeLabels[pricingType] || pricingType;
            this.showError(`Stripe integration is only available for fixed or subscription pricing services. This service uses ${label} pricing, which requires custom quotes.`);
            return;
        }

        try {
            // Get service data from form
            const formData = new FormData(this.elements.form);
            
            // Get pricing - try from currentEditingService first, then form
            let pricing = this.currentEditingService?.pricing || {};
            
            // If pricing is empty or invalid, try to get it from the form
            if (!pricing || typeof pricing !== 'object' || Object.keys(pricing).length === 0) {
                // Try to parse pricing from form if available
                const pricingInput = document.getElementById('pricing-editor');
                if (pricingInput && pricingInput.value) {
                    try {
                        pricing = JSON.parse(pricingInput.value);
                    } catch (e) {
                        window.logger?.warn('Could not parse pricing from form');
                    }
                }
            }
            
            const pricingType = formData.get('pricing_type') || 'fixed';
            
            // Use subscription-specific function for subscription products
            const isSubscription = pricingType === 'subscription';
            const functionName = isSubscription 
                ? 'create-stripe-subscription-product' 
                : 'create-stripe-service-product';
            
            const serviceData = {
                name: formData.get('name'),
                description: formData.get('description'),
                short_description: formData.get('short_description'),
                pricing: pricing,
                has_reduced_fare: formData.get('has_reduced_fare') === 'on',
                pricing_type: pricingType,
                // Subscription-specific fields
                ...(isSubscription && {
                    trial_days: parseInt(formData.get('trial_days')) || 0,
                    trial_requires_payment: formData.get('trial_requires_payment') === 'on',
                    entity_type: 'service'
                })
            };

            // Validate pricing exists
            if (!serviceData.pricing || typeof serviceData.pricing !== 'object' || Object.keys(serviceData.pricing).length === 0) {
                this.showError('Service must have pricing configured before creating Stripe product. Please save the service with pricing first.');
                // Reset button
                this.elements.createStripeBtn.disabled = false;
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span class="translatable-content" data-translation-key="Create Stripe Product" data-original-text="Create Stripe Product">Create Stripe Product</span>';
                this.updateTranslations();
                return;
            }
            
            // Log the data being sent for debugging
            window.logger?.log('📤 Sending to Stripe:', { 
                name: serviceData.name, 
                pricing_type: serviceData.pricing_type,
                pricing_keys: Object.keys(serviceData.pricing),
                has_reduced_fare: serviceData.has_reduced_fare
            });

            // Disable button and show loading
            this.elements.createStripeBtn.disabled = true;
            let btnText = document.getElementById('create-stripe-btn-text');
            if (btnText) {
                btnText.textContent = 'Creating...';
            } else {
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">⏳</span><span id="create-stripe-btn-text">Creating...</span>';
                btnText = document.getElementById('create-stripe-btn-text');
            }

            // Get current session to ensure we have proper authentication
            // Always refresh the session to ensure we have a valid, non-expired token
            let session;
            try {
                // First try to get current session
                const { data: { session: currentSession }, error: sessionError } = await window.supabase.auth.getSession();
                
                // If we have a session, try to refresh it to ensure it's still valid
                if (currentSession) {
                    const { data: { session: refreshedSession }, error: refreshError } = await window.supabase.auth.refreshSession();
                    if (!refreshError && refreshedSession) {
                        session = refreshedSession;
                    } else {
                        // If refresh fails, use current session (it might still be valid)
                        session = currentSession;
                    }
                } else if (sessionError) {
                    // No session at all - user needs to log in
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

            // Call edge function to create Stripe product (subscription or regular)
            const { data, error } = await window.supabase.functions.invoke(functionName, {
                body: serviceData,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            // Update form fields with Stripe IDs
            if (data.productId) {
                const productIdField = document.getElementById('stripe-product-id');
                if (productIdField) productIdField.value = data.productId;
            }
            if (data.priceId) {
                const priceIdField = document.getElementById('stripe-price-id');
                if (priceIdField) priceIdField.value = data.priceId;
            }
            if (data.monthlyPriceId) {
                const monthlyPriceIdField = document.getElementById('stripe-price-monthly-id');
                if (monthlyPriceIdField) monthlyPriceIdField.value = data.monthlyPriceId;
            }
            if (data.yearlyPriceId) {
                const yearlyPriceIdField = document.getElementById('stripe-price-yearly-id');
                if (yearlyPriceIdField) yearlyPriceIdField.value = data.yearlyPriceId;
            }
            if (data.reducedPriceId) {
                const reducedPriceIdField = document.getElementById('stripe-price-reduced-id');
                if (reducedPriceIdField) reducedPriceIdField.value = data.reducedPriceId;
            }

            // Update current editing service
            this.currentEditingService.stripe_product_id = data.productId;
            this.currentEditingService.stripe_price_id = data.priceId; // Backward compatibility
            this.currentEditingService.stripe_price_monthly_id = data.monthlyPriceId || null;
            this.currentEditingService.stripe_price_yearly_id = data.yearlyPriceId || null;
            this.currentEditingService.stripe_price_reduced_id = data.reducedPriceId || null;

            // Save the service to persist Stripe IDs to database
            try {
                const saveResult = await this.saveService({ 
                    skipModalClose: true, 
                    skipReload: true, 
                    skipSuccessMessage: true 
                });
                if (!saveResult || !saveResult.success) {
                    window.logger?.warn('⚠️ Stripe product created but failed to save to database:', saveResult?.error);
                    this.showError('Stripe product created, but failed to save to database. Please save the service manually.');
                } else {
                    window.logger?.log('✅ Service saved with Stripe IDs');
                    // Update currentEditingService with the saved data
                    if (saveResult.data) {
                        this.currentEditingService = saveResult.data;
                    }
                }
            } catch (saveError) {
                window.logger?.warn('⚠️ Could not auto-save service after Stripe creation:', saveError);
            }

            // Show status
            this.updateStripeStatus(data);

            // Hide create button, show status
            if (this.elements.stripeCreateSection) {
                this.elements.stripeCreateSection.style.display = 'none';
            }
            if (this.elements.stripeStatusSection) {
                this.elements.stripeStatusSection.style.display = 'block';
            }
            if (this.elements.stripeActions) {
                this.elements.stripeActions.style.display = 'flex';
            }

            // Reset button state
            this.elements.createStripeBtn.disabled = false;
            btnText = document.getElementById('create-stripe-btn-text');
            if (btnText) {
                btnText.textContent = 'Create Stripe Product';
            } else {
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span id="create-stripe-btn-text">Create Stripe Product</span>';
            }

            this.showSuccess('Stripe product created successfully');

        } catch (error) {
            window.logger?.error('❌ Error creating Stripe product:', error);
            this.showError('Failed to create Stripe product: ' + (error.message || error));
            this.elements.createStripeBtn.disabled = false;
            const btnText = document.getElementById('create-stripe-btn-text');
            if (btnText) {
                btnText.textContent = 'Create Stripe Product';
            } else {
                this.elements.createStripeBtn.innerHTML = '<span class="btn-icon">💳</span><span id="create-stripe-btn-text">Create Stripe Product</span>';
            }
        }
    }

    /**
     * Handle delete Stripe product
     */
    async handleDeleteStripeProduct() {
        if (!this.currentEditingService || !this.currentEditingService.stripe_product_id) {
            this.showError('No Stripe product ID found');
            return;
        }

        const confirmed = confirm('Are you sure you want to archive this Stripe product? This will archive the product in Stripe (products cannot be permanently deleted). The Stripe IDs will be removed from this service.');
        if (!confirmed) return;

        try {
            // Get current session and refresh to ensure we have a valid token
            let session;
            try {
                // First try to get current session
                const { data: { session: currentSession }, error: sessionError } = await window.supabase.auth.getSession();
                
                // If we have a session, try to refresh it to ensure it's still valid
                if (currentSession) {
                    const { data: { session: refreshedSession }, error: refreshError } = await window.supabase.auth.refreshSession();
                    if (!refreshError && refreshedSession) {
                        session = refreshedSession;
                    } else {
                        // If refresh fails, use current session (it might still be valid)
                        session = currentSession;
                    }
                } else if (sessionError) {
                    // No session at all - user needs to log in
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

            // Call edge function to archive the product
            const { data, error } = await window.supabase.functions.invoke('delete-stripe-product', {
                body: { productId: this.currentEditingService.stripe_product_id },
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            // Clear Stripe IDs from current editing service
            this.currentEditingService.stripe_product_id = null;
            this.currentEditingService.stripe_price_id = null;
            this.currentEditingService.stripe_price_monthly_id = null;
            this.currentEditingService.stripe_price_yearly_id = null;
            this.currentEditingService.stripe_price_reduced_id = null;

            // Clear form fields
            const productIdField = document.getElementById('stripe-product-id');
            if (productIdField) productIdField.value = '';
            const priceIdField = document.getElementById('stripe-price-id');
            if (priceIdField) priceIdField.value = '';
            const monthlyPriceIdField = document.getElementById('stripe-price-monthly-id');
            if (monthlyPriceIdField) monthlyPriceIdField.value = '';
            const yearlyPriceIdField = document.getElementById('stripe-price-yearly-id');
            if (yearlyPriceIdField) yearlyPriceIdField.value = '';
            const reducedPriceIdField = document.getElementById('stripe-price-reduced-id');
            if (reducedPriceIdField) reducedPriceIdField.value = '';

            // Save the service to persist the removal
            try {
                const saveResult = await this.saveService();
                if (!saveResult.success) {
                    window.logger?.warn('⚠️ Stripe product archived but failed to update database:', saveResult.error);
                    this.showError('Stripe product archived, but failed to update database. Please save the service manually.');
                } else {
                    window.logger?.log('✅ Service updated after Stripe deletion');
                }
            } catch (saveError) {
                window.logger?.warn('⚠️ Could not auto-save service after Stripe deletion:', saveError);
            }

            // Update UI
            if (this.elements.stripeCreateSection) {
                this.elements.stripeCreateSection.style.display = 'block';
            }
            if (this.elements.stripeStatusSection) {
                this.elements.stripeStatusSection.style.display = 'none';
            }
            if (this.elements.stripeActions) {
                this.elements.stripeActions.style.display = 'none';
            }

            this.showSuccess('Stripe product archived successfully');
        } catch (error) {
            window.logger?.error('❌ Error deleting Stripe product:', error);
            this.showError('Failed to archive Stripe product: ' + (error.message || error));
        }
    }

    /**
     * Handle update Stripe product (update product info and create new prices if needed)
     */
    async handleUpdateStripeProduct() {
        if (!this.currentEditingService || !this.currentEditingService.stripe_product_id) {
            this.showError('No Stripe product ID found. Please create a Stripe product first.');
            return;
        }

        if (!this.currentEditingService) {
            this.showError('Please save the service first before updating Stripe product');
            return;
        }

        try {
            // Get service data from form
            const formData = new FormData(this.elements.form);
            
            // Get pricing - try from currentEditingService first, then form
            let pricing = this.currentEditingService?.pricing || {};
            
            // If pricing is empty or invalid, try to get it from the form
            if (!pricing || typeof pricing !== 'object' || Object.keys(pricing).length === 0) {
                const pricingInput = document.getElementById('pricing-editor');
                if (pricingInput && pricingInput.value) {
                    try {
                        pricing = JSON.parse(pricingInput.value);
                    } catch (e) {
                        window.logger?.warn('Could not parse pricing from form');
                    }
                }
            }
            
            const pricingType = formData.get('pricing_type') || 'fixed';
            const isOnSale = formData.get('is_on_sale') === 'on';
            const discountPercentage = isOnSale ? this.getSaleDiscountPercentage() : null;
            
            // Calculate sale pricing from discount percentage if on sale
            let salePricing = null;
            if (isOnSale && discountPercentage && discountPercentage > 0) {
                salePricing = {};
                this.currencies.forEach(currency => {
                    const currencyPricing = pricing[currency] || {};
                    const saleCurrencyPricing = {};
                    
                    if (currencyPricing.amount !== undefined) {
                        saleCurrencyPricing.amount = this.calculateSalePrice(currencyPricing.amount, discountPercentage);
                    }
                    if (currencyPricing.monthly !== undefined) {
                        saleCurrencyPricing.monthly = this.calculateSalePrice(currencyPricing.monthly, discountPercentage);
                    }
                    if (currencyPricing.yearly !== undefined) {
                        saleCurrencyPricing.yearly = this.calculateSalePrice(currencyPricing.yearly, discountPercentage);
                    }
                    
                    if (Object.keys(saleCurrencyPricing).length > 0) {
                        salePricing[currency] = saleCurrencyPricing;
                    }
                });
            }
            
            // Detect if only sales changed (optimization to avoid recreating regular prices)
            // Compare current form values with saved service values
            const savedPricing = this.currentEditingService.pricing || {};
            const savedIsOnSale = this.currentEditingService.is_on_sale || false;
            const savedDiscountPercentage = this.currentEditingService.sale_discount_percentage || null;
            
            // Check if regular pricing changed
            const pricingChanged = JSON.stringify(pricing) !== JSON.stringify(savedPricing);
            const pricingTypeChanged = pricingType !== (this.currentEditingService.pricing_type || 'fixed');
            const reducedFareChanged = (formData.get('has_reduced_fare') === 'on') !== (this.currentEditingService.has_reduced_fare || false);
            
            // Check if only sales changed
            const onlySalesChanged = !pricingChanged && 
                                    !pricingTypeChanged && 
                                    !reducedFareChanged &&
                                    (isOnSale !== savedIsOnSale || 
                                     (isOnSale && discountPercentage !== savedDiscountPercentage));
            
            const serviceData = {
                productId: this.currentEditingService.stripe_product_id,
                name: formData.get('name'),
                description: formData.get('description'),
                short_description: formData.get('short_description'),
                pricing: pricing,
                has_reduced_fare: formData.get('has_reduced_fare') === 'on',
                pricing_type: pricingType,
                trial_days: pricingType === 'subscription' ? (parseInt(formData.get('trial_days')) || 0) : 0,
                trial_requires_payment: pricingType === 'subscription' ? (formData.get('trial_requires_payment') === 'on') : false,
                is_on_sale: isOnSale,
                sale_pricing: salePricing,
                only_sales_changed: onlySalesChanged, // Optimization flag
                // Pass existing regular price IDs (to return when only sales changed)
                existing_price_id: this.currentEditingService.stripe_price_id || null,
                existing_monthly_price_id: this.currentEditingService.stripe_price_monthly_id || null,
                existing_yearly_price_id: this.currentEditingService.stripe_price_yearly_id || null,
                // Pass old price IDs to deactivate
                old_price_id: this.currentEditingService.stripe_price_id || null,
                old_monthly_price_id: this.currentEditingService.stripe_price_monthly_id || null,
                old_yearly_price_id: this.currentEditingService.stripe_price_yearly_id || null,
                old_reduced_price_id: this.currentEditingService.stripe_price_reduced_id || null,
                old_sale_price_id: this.currentEditingService.stripe_price_sale_id || null,
                old_sale_monthly_price_id: this.currentEditingService.stripe_price_monthly_sale_id || null,
                old_sale_yearly_price_id: this.currentEditingService.stripe_price_yearly_sale_id || null
            };

            // Validate pricing exists
            if (!serviceData.pricing || typeof serviceData.pricing !== 'object' || Object.keys(serviceData.pricing).length === 0) {
                this.showError('Service must have pricing configured before updating Stripe product.');
                return;
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

            // Call edge function to update Stripe product
            const { data, error } = await window.supabase.functions.invoke('update-stripe-service-product', {
                body: serviceData,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            // Update form fields with new Stripe IDs (if new prices were created)
            if (data.monthlyPriceId) {
                const monthlyPriceIdField = document.getElementById('stripe-price-monthly-id');
                if (monthlyPriceIdField) monthlyPriceIdField.value = data.monthlyPriceId;
                this.currentEditingService.stripe_price_monthly_id = data.monthlyPriceId;
            }
            if (data.yearlyPriceId) {
                const yearlyPriceIdField = document.getElementById('stripe-price-yearly-id');
                if (yearlyPriceIdField) yearlyPriceIdField.value = data.yearlyPriceId;
                this.currentEditingService.stripe_price_yearly_id = data.yearlyPriceId;
            }
            if (data.priceId) {
                const priceIdField = document.getElementById('stripe-price-id');
                if (priceIdField) priceIdField.value = data.priceId;
                this.currentEditingService.stripe_price_id = data.priceId;
            }
            // Update sale price IDs
            if (data.salePriceId) {
                const salePriceIdField = document.getElementById('stripe-price-sale-id');
                if (salePriceIdField) salePriceIdField.value = data.salePriceId;
                this.currentEditingService.stripe_price_sale_id = data.salePriceId;
            }
            if (data.saleMonthlyPriceId) {
                const saleMonthlyPriceIdField = document.getElementById('stripe-price-monthly-sale-id');
                if (saleMonthlyPriceIdField) saleMonthlyPriceIdField.value = data.saleMonthlyPriceId;
                this.currentEditingService.stripe_price_monthly_sale_id = data.saleMonthlyPriceId;
            }
            if (data.saleYearlyPriceId) {
                const saleYearlyPriceIdField = document.getElementById('stripe-price-yearly-sale-id');
                if (saleYearlyPriceIdField) saleYearlyPriceIdField.value = data.saleYearlyPriceId;
                this.currentEditingService.stripe_price_yearly_sale_id = data.saleYearlyPriceId;
            }

            // Save the service to persist any new price IDs
            try {
                const saveResult = await this.saveService({ 
                    skipModalClose: true, 
                    skipReload: true, 
                    skipSuccessMessage: true 
                });
                if (!saveResult || !saveResult.success) {
                    window.logger?.warn('⚠️ Stripe product updated but failed to save to database:', saveResult?.error);
                } else {
                    window.logger?.log('✅ Service saved with updated Stripe IDs');
                    if (saveResult.data) {
                        this.currentEditingService = saveResult.data;
                    }
                }
            } catch (saveError) {
                window.logger?.warn('⚠️ Could not auto-save service after Stripe update:', saveError);
            }

            // Show status
            this.updateStripeStatus(data);

            // Reset button state
            this.elements.updateStripeBtn.disabled = false;
            if (btnText) {
                btnText.textContent = 'Update Stripe Product';
            }

            this.showSuccess('Stripe product updated successfully. ' + (data.message || ''));
        } catch (error) {
            window.logger?.error('❌ Error updating Stripe product:', error);
            this.showError('Failed to update Stripe product: ' + (error.message || error));
            this.elements.updateStripeBtn.disabled = false;
            const btnText = this.elements.updateStripeBtn.querySelector('span:last-child');
            if (btnText) {
                btnText.textContent = 'Update Stripe Product';
            }
        }
    }

    /**
     * Update Stripe status display
     */
    updateStripeStatus(data) {
        if (!this.elements.stripeStatus) return;

        // Status display removed - it's obvious the product is created
        let statusHTML = '';

        // For subscription services, show monthly and yearly price IDs
        if (data.monthlyPriceId || data.yearlyPriceId) {
            if (data.monthlyPriceId) {
                statusHTML += '<div class="service-management__status-item">';
                statusHTML += '<span class="service-management__status-label">Monthly Price ID:</span>';
                statusHTML += `<span class="service-management__status-value">${data.monthlyPriceId}</span>`;
                statusHTML += '</div>';
            }
            if (data.yearlyPriceId) {
                statusHTML += '<div class="service-management__status-item">';
                statusHTML += '<span class="service-management__status-label">Yearly Price ID:</span>';
                statusHTML += `<span class="service-management__status-value">${data.yearlyPriceId}</span>`;
                statusHTML += '</div>';
            }
        } else if (data.priceId) {
            // For one-time payments, show regular price ID
            statusHTML += '<div class="service-management__status-item">';
            statusHTML += '<span class="service-management__status-label">Price ID:</span>';
            statusHTML += `<span class="service-management__status-value">${data.priceId}</span>`;
            statusHTML += '</div>';
        }

        if (data.reducedPriceId) {
            statusHTML += '<div class="service-management__status-item">';
            statusHTML += '<span class="service-management__status-label">Reduced Price ID:</span>';
            statusHTML += `<span class="service-management__status-value">${data.reducedPriceId}</span>`;
            statusHTML += '</div>';
        }

        this.elements.stripeStatus.innerHTML = statusHTML;

        // Show action buttons and set up links
        if (data.productId && this.elements.stripeActions) {
            this.elements.stripeActions.style.display = 'flex';
            if (this.elements.viewStripeLink) {
                this.elements.viewStripeLink.href = `https://dashboard.stripe.com/test/products/${data.productId}`;
            }
        } else if (this.elements.stripeActions) {
            this.elements.stripeActions.style.display = 'none';
        }
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
        // Find all translatable elements, including those in modals
        const selectors = [
            '#service-management .translatable-content',
            '.service-management__modal .translatable-content',
            '#service-modal .translatable-content'
        ];
        
        const elements = new Set();
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => elements.add(el));
        });
        
        elements.forEach(el => {
            el.classList.add('loaded');
            // Store original text if not already stored
            // Check HTML attribute first, then textContent, then innerHTML
            if (!el.hasAttribute('data-original-text')) {
                const htmlAttr = el.getAttribute('data-original-text'); // From HTML
                const textContent = el.textContent.trim();
                const innerHTML = el.innerHTML.trim().replace(/<[^>]*>/g, ''); // Strip HTML tags
                const key = el.getAttribute('data-translation-key');
                
                const originalText = htmlAttr || textContent || innerHTML || key;
                if (originalText) {
                    el.setAttribute('data-original-text', originalText);
                }
            }
        });
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.ServiceManagementTranslations) {
            window.ServiceManagementTranslations.updateTranslations();
        }
        
        // Manually update Create Stripe Product button text if translation system is available
        const btnText = document.getElementById('create-stripe-btn-text');
        if (btnText && window.ServiceManagementTranslations && window.ServiceManagementTranslations.isInitialized) {
            const translation = window.ServiceManagementTranslations.getTranslation('Create Stripe Product');
            if (translation && translation !== 'Create Stripe Product') {
                btnText.textContent = translation;
            } else if (!btnText.textContent || btnText.textContent.trim() === '') {
                btnText.textContent = 'Create Stripe Product';
            }
        } else if (btnText && (!btnText.textContent || btnText.textContent.trim() === '')) {
            // Fallback: ensure text is always there
            btnText.textContent = 'Create Stripe Product';
        }
    }

    /**
     * Auto-select payment_method based on service category and additional costs
     */
    autoSelectPaymentMethod() {
        const categorySelect = document.getElementById('service-category');
        const paymentMethodSelect = document.getElementById('service-payment-method');
        const additionalCostsInput = document.getElementById('additional-costs');
        
        if (!categorySelect || !paymentMethodSelect) {
            return;
        }
        
        const category = categorySelect.value;
        const additionalCosts = additionalCostsInput ? additionalCostsInput.value : '';
        const hasTravelCosts = additionalCosts.toLowerCase().includes('travel');
        
        let suggestedPaymentMethod = 'stripe'; // Default
        
        // Auto-select based on finalized payment strategy
        if (category === 'catalog-access') {
            suggestedPaymentMethod = 'stripe';
        } else if (category === 'tech-support') {
            suggestedPaymentMethod = hasTravelCosts ? 'bank_transfer' : 'stripe';
        } else if (category === 'commissioning') {
            suggestedPaymentMethod = 'bank_transfer';
        }
        
        // Only auto-select if payment_method is not manually set or is empty
        // Allow user to override
        if (paymentMethodSelect.value === '' || paymentMethodSelect.value === 'stripe') {
            paymentMethodSelect.value = suggestedPaymentMethod;
            window.logger?.log(`Auto-selected payment method: ${suggestedPaymentMethod} for category: ${category}`);
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


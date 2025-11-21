/**
 * Product Management Component
 * Handles product list display, search, filtering, and pagination
 */

if (typeof window.ProductManagement === 'undefined') {
class ProductManagement {
    constructor() {
        this.isInitialized = false;
        this.products = [];
        this.filteredProducts = [];
        this.filters = {
            search: '',
            status: [], // Multi-select for status
            category: [], // Multi-select for categories
            pricingType: [], // Multi-select for pricing types
            commissioned: 'all', // Single select: all, commissioned, not_commissioned
            featured: 'all', // Single select: all, featured, not_featured
            createdDate: 'all' // Single select: all, 7d, 30d, 90d, 1y
        };
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.searchTimeout = null;
        this.elements = {}; // Store DOM elements
    }

    /**
     * Initialize the product management component
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
            
            // Load saved preferences
            await this.loadPreferences();
            
            // Initialize translations
            await this.initializeTranslations();
            
            // Show translatable content
            this.showTranslatableContent();
            
            // Load products
            await this.loadProducts();

            // Populate filter options
            this.populateFilterOptions();

            // Apply initial filters
            this.applyFilters();

            this.isInitialized = true;

        } catch (error) {
            window.logger?.error('❌ Product Management: Failed to initialize:', error);
            this.showError('Failed to initialize product management');
        }
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
                    this.savePreferences();
                }, 300); // 300ms debounce
            });
        }

        // Single select filters
        if (this.elements.commissionedFilter) {
            this.elements.commissionedFilter.addEventListener('change', (e) => {
                this.filters.commissioned = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        if (this.elements.featuredFilter) {
            this.elements.featuredFilter.addEventListener('change', (e) => {
                this.filters.featured = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        if (this.elements.createdDateFilter) {
            this.elements.createdDateFilter.addEventListener('change', (e) => {
                this.filters.createdDate = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        // Select All / Deselect All buttons for multi-select filters
        const filterTypes = ['status', 'category', 'pricingType'];
        filterTypes.forEach(filterType => {
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

        // Clear all filters button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Initialize dropdown functionality
        this.initializeDropdowns();

        // Initialize dropdown search functionality
        this.initializeDropdownSearch();

        // Add Product button
        const addProductButton = document.getElementById('add-product-button');
        if (addProductButton) {
            addProductButton.addEventListener('click', () => {
                this.addProduct();
            });
        }

        // Create Bundle button
        const createBundleButton = document.getElementById('create-bundle-button');
        if (createBundleButton) {
            createBundleButton.addEventListener('click', () => {
                this.createBundle();
            });
        }

        // Sortable headers
        const sortableHeaders = document.querySelectorAll('.product-management__sortable-header');
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

        // Sale modal event listeners
        if (this.elements.saleModalClose) {
            this.elements.saleModalClose.addEventListener('click', () => {
                this.closeSaleModal();
            });
        }

        if (this.elements.saleModalCancel) {
            this.elements.saleModalCancel.addEventListener('click', () => {
                this.closeSaleModal();
            });
        }

        if (this.elements.saleModalOverlay) {
            this.elements.saleModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.saleModalOverlay) {
                    this.closeSaleModal();
                }
            });
        }

        if (this.elements.saleModalSave) {
            this.elements.saleModalSave.addEventListener('click', () => {
                this.saveSale();
            });
        }

        if (this.elements.saleIsOnSale) {
            this.elements.saleIsOnSale.addEventListener('change', (e) => {
                this.toggleSaleFields(e.target.checked);
            });
        }

        // Setup emoji pickers
        this.setupEmojiPickers();
    }

    /**
     * Load products from database
     */
    async loadProducts() {
        try {
            this.showLoading();

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action - viewing product list
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'product_list_viewed',
                    `Admin viewed product management list`
                );
            }

            // Query products with category information
            const { data, error } = await window.supabase
                .from('products')
                .select(`
                    id,
                    name,
                    slug,
                    description,
                    short_description,
                    status,
                    pricing_type,
                    price_amount,
                    price_currency,
                    individual_price,
                    enterprise_price,
                    subscription_interval,
                    is_commissioned,
                    commissioned_by,
                    commissioned_client_name,
                    is_featured,
                    is_available_for_purchase,
                    is_on_sale,
                    sale_start_date,
                    sale_end_date,
                    sale_discount_percentage,
                    sale_description,
                    sale_emoji_left,
                    sale_emoji_right,
                    github_repo_url,
                    github_repo_name,
                    cloudflare_domain,
                    cloudflare_worker_url,
                    icon_url,
                    stripe_product_id,
                    stripe_price_id,
                    stripe_price_monthly_id,
                    stripe_price_yearly_id,
                    stripe_price_sale_id,
                    stripe_price_monthly_sale_id,
                    stripe_price_yearly_sale_id,
                    created_at,
                    updated_at,
                    published_at,
                    product_categories (
                        id,
                        name,
                        slug
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                window.logger?.error('❌ Database query error:', error);
                throw error;
            }

            // Process products data
            this.products = data.map(product => ({
                ...product,
                category_name: product.product_categories?.name || 'Uncategorized',
                category_slug: product.product_categories?.slug || 'uncategorized'
            }));

            // Apply initial filters and render
            this.applyFilters();
            this.hideLoading();

        } catch (error) {
            window.logger?.error('❌ Failed to load products:', error);
            this.hideLoading();
            this.showEmpty();
            this.showError('Failed to load products');
        }
    }

    /**
     * Apply filters to products list
     */
    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search;
                const matchesSearch = 
                    product.name.toLowerCase().includes(searchLower) ||
                    product.slug.toLowerCase().includes(searchLower) ||
                    (product.description && product.description.toLowerCase().includes(searchLower)) ||
                    (product.short_description && product.short_description.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) return false;
            }

            // Status filter (multi-select)
            if (this.filters.status.length > 0) {
                if (!this.filters.status.includes(product.status)) return false;
            }

            // Category filter (multi-select)
            if (this.filters.category.length > 0) {
                if (!this.filters.category.includes(product.category_slug)) return false;
            }

            // Pricing type filter (multi-select)
            if (this.filters.pricingType.length > 0) {
                if (!this.filters.pricingType.includes(product.pricing_type)) return false;
            }

            // Commissioned filter
            if (this.filters.commissioned !== 'all') {
                const isCommissioned = product.is_commissioned === true;
                if (this.filters.commissioned === 'commissioned' && !isCommissioned) return false;
                if (this.filters.commissioned === 'not_commissioned' && isCommissioned) return false;
            }

            // Featured filter
            if (this.filters.featured !== 'all') {
                const isFeatured = product.is_featured === true;
                if (this.filters.featured === 'featured' && !isFeatured) return false;
                if (this.filters.featured === 'not_featured' && isFeatured) return false;
            }

            // Created date filter
            if (this.filters.createdDate !== 'all') {
                const createdDate = new Date(product.created_at);
                const now = new Date();
                const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
                
                switch (this.filters.createdDate) {
                    case '7d':
                        if (daysDiff > 7) return false;
                        break;
                    case '30d':
                        if (daysDiff > 30) return false;
                        break;
                    case '90d':
                        if (daysDiff > 90) return false;
                        break;
                    case '1y':
                        if (daysDiff > 365) return false;
                        break;
                }
            }

            return true;
        });

        // Apply sorting if active
        if (this.sort.field) {
            this.applySorting();
        }

        // Update filter summary
        this.updateFilterSummary();
        
        // Render filtered results
        this.renderProducts();
    }

    /**
     * Handle sortable header click
     */
    handleSort(field) {
        // If clicking the same field, toggle direction
        if (this.sort.field === field) {
            this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field, default to ascending
            this.sort.field = field;
            this.sort.direction = 'asc';
        }

        // Update UI indicators
        this.updateSortIndicators();
        
        // Apply sorting and re-render
        this.applySorting();
        this.renderProducts();
    }

    /**
     * Apply sorting to filtered products
     */
    applySorting() {
        if (!this.sort.field) return;

        this.filteredProducts.sort((a, b) => {
            let aValue = a[this.sort.field];
            let bValue = b[this.sort.field];

            // Handle string comparison (case insensitive)
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
     * Update sort indicators in headers
     */
    updateSortIndicators() {
        // Clear all indicators
        const headers = document.querySelectorAll('.product-management__sortable-header');
        headers.forEach(header => {
            header.removeAttribute('data-sort-direction');
        });

        // Set indicator for active sort
        if (this.sort.field) {
            const activeHeader = document.querySelector(`[data-sort="${this.sort.field}"]`);
            if (activeHeader) {
                activeHeader.setAttribute('data-sort-direction', this.sort.direction);
            }
        }
    }

    /**
     * Render products table
     */
    renderProducts() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) {
            window.logger?.error('❌ Table body not found');
            return;
        }

        // Show all filtered products (no pagination for now)
        const allProducts = this.filteredProducts;

        // Clear table and ensure tbody is visible
        tbody.innerHTML = '';
        tbody.style.display = 'table-row-group';

        // Check if empty
        if (allProducts.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        // Render each product
        allProducts.forEach((product, index) => {
            const row = this.createProductRow(product);
            tbody.appendChild(row);
        });
    }

    /**
     * Create product table row
     * @param {Object} product - Product data
     * @returns {HTMLElement} Table row element
     */
    createProductRow(product) {
        const tr = document.createElement('tr');
        tr.dataset.productId = product.id;
        tr.style.borderBottom = '1px solid var(--color-primary)';

        // Product Name cell
        const nameCell = document.createElement('td');
        nameCell.setAttribute('data-label', 'Product Name');
        nameCell.style.padding = 'var(--spacing-sm)';
        nameCell.style.color = 'var(--color-text-primary)';
        nameCell.style.textAlign = 'center';
        nameCell.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
                <div style="font-weight: 600;">${product.name}</div>
                <div style="font-size: 0.8em; opacity: 0.7;">${product.slug}</div>
            </div>
        `;

        // Category cell
        const categoryCell = document.createElement('td');
        categoryCell.setAttribute('data-label', 'Category');
        categoryCell.style.padding = 'var(--spacing-sm)';
        categoryCell.style.color = 'var(--color-text-primary)';
        categoryCell.textContent = product.category_name;

        // Status cell with editable dropdown
        const statusCell = document.createElement('td');
        statusCell.setAttribute('data-label', 'Status');
        statusCell.style.padding = 'var(--spacing-sm)';
        statusCell.style.position = 'relative';
        const status = product.status || 'draft';
        
        // Determine badge class based on status
        const badgeClass = `product-management__badge--${status}`;
        
        const statusOptions = ['draft', 'active', 'beta', 'coming-soon', 'suspended', 'archived'];
        
        statusCell.innerHTML = `
            <div class="product-management__status-editor" data-product-id="${product.id}">
                <span class="product-management__badge ${badgeClass} product-management__status-badge" style="cursor: pointer; user-select: none;">
                    ${status}
                </span>
                <select class="product-management__status-select" style="display: none;">
                    ${statusOptions.map(opt => `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>
        `;
        
        // Add click handler to show dropdown
        const statusEditor = statusCell.querySelector('.product-management__status-editor');
        const statusBadge = statusCell.querySelector('.product-management__status-badge');
        const statusSelect = statusCell.querySelector('.product-management__status-select');
        
        // Make badge clickable to trigger select
        statusBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            // Position select over badge and make it visible
            statusSelect.style.display = 'block';
            statusSelect.style.position = 'absolute';
            statusSelect.style.top = '0';
            statusSelect.style.left = '0';
            statusSelect.style.width = '100%';
            statusSelect.style.height = '100%';
            statusSelect.style.opacity = '0';
            statusSelect.style.cursor = 'pointer';
            statusSelect.style.zIndex = '100';
            statusSelect.focus();
            // Trigger native dropdown
            statusSelect.click();
        });
        
        // Handle status change
        statusSelect.addEventListener('change', async (e) => {
            e.stopPropagation();
            const newStatus = e.target.value;
            if (newStatus !== status) {
                await this.updateProductStatus(product.id, product, newStatus);
            }
            statusSelect.style.display = 'none';
        });
        
        // Hide dropdown when losing focus
        statusSelect.addEventListener('blur', () => {
            statusSelect.style.display = 'none';
        });

        // Pricing cell
        const pricingCell = document.createElement('td');
        pricingCell.setAttribute('data-label', 'Pricing');
        pricingCell.style.padding = 'var(--spacing-sm)';
        pricingCell.style.color = 'var(--color-text-primary)';
        
        let pricingText = '';
        if (product.pricing_type === 'one_time') {
            pricingText = `${product.price_amount || 0} ${product.price_currency || 'USD'}`;
        } else if (product.pricing_type === 'subscription') {
            // Show subscription pricing (monthly/yearly if available, otherwise just the type)
            if (product.stripe_price_monthly_id || product.stripe_price_yearly_id) {
                pricingText = 'Subscription';
            } else {
                pricingText = `${product.price_amount || 0} ${product.price_currency || 'USD'}/mo`;
            }
        } else if (product.pricing_type === 'freemium') {
            pricingText = 'Freemium';
        }
        
        pricingCell.textContent = pricingText;

        // Sale cell
        const saleCell = document.createElement('td');
        saleCell.setAttribute('data-label', 'Sale');
        saleCell.style.padding = 'var(--spacing-sm)';
        saleCell.style.textAlign = 'center';
        
        if (product.is_on_sale) {
            saleCell.innerHTML = '<span class="product-management__sale-badge" style="background: var(--color-secondary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600;">ON SALE</span>';
        } else {
            saleCell.textContent = '-';
        }

        // Commissioned cell
        const commissionedCell = document.createElement('td');
        commissionedCell.setAttribute('data-label', 'Commissioned');
        commissionedCell.style.padding = 'var(--spacing-sm)';
        
        if (product.is_commissioned) {
            commissionedCell.innerHTML = `
                <span style="color: var(--color-secondary); font-weight: 600;">Yes</span>
                ${product.commissioned_client_name ? `<br><small style="opacity: 0.7;">${product.commissioned_client_name}</small>` : ''}
            `;
        } else {
            commissionedCell.innerHTML = '<span style="opacity: 0.7;">No</span>';
        }

        // Featured cell
        const featuredCell = document.createElement('td');
        featuredCell.setAttribute('data-label', 'Featured');
        featuredCell.style.padding = 'var(--spacing-sm)';
        
        if (product.is_featured) {
            featuredCell.innerHTML = '<span style="color: var(--color-primary); font-weight: 600;">⭐ Featured</span>';
        } else {
            featuredCell.innerHTML = '<span style="opacity: 0.7;">No</span>';
        }

        // Created cell
        const createdCell = document.createElement('td');
        createdCell.setAttribute('data-label', 'Created');
        createdCell.style.padding = 'var(--spacing-sm)';
        createdCell.style.color = 'var(--color-text-primary)';
        createdCell.textContent = this.formatDate(product.created_at);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.setAttribute('data-label', 'Actions');
        actionsCell.style.padding = 'var(--spacing-sm)';
        
        // Determine which buttons to show based on status (status already declared above)
        const showPublish = status === 'draft' || status === 'coming-soon' || status === 'beta';
        const showUnpublish = status === 'active';
        
        let actionButtons = `
            <button class="product-management__action-btn product-management__action-btn--view" data-action="view" data-product-id="${product.id}">
                View
            </button>
            <button class="product-management__action-btn product-management__action-btn--edit" data-action="edit" data-product-id="${product.id}">
                Edit
            </button>
        `;
        
        if (showPublish) {
            actionButtons += `
                <button class="product-management__action-btn product-management__action-btn--publish" data-action="publish" data-product-id="${product.id}">
                    Publish
                </button>
            `;
        } else if (showUnpublish) {
            actionButtons += `
                <button class="product-management__action-btn product-management__action-btn--unpublish" data-action="unpublish" data-product-id="${product.id}">
                    Unpublish
                </button>
            `;
        }
        
        actionButtons += `
            <button class="product-management__action-btn product-management__action-btn--sale" data-action="sale" data-product-id="${product.id}">
                ${product.is_on_sale ? 'Edit Sale' : 'Manage Sale'}
            </button>
            <button class="product-management__action-btn product-management__action-btn--delete" data-action="delete" data-product-id="${product.id}">
                Delete
            </button>
        `;
        
        actionsCell.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                ${actionButtons}
            </div>
        `;

        // Add click handlers to action buttons
        const viewButton = actionsCell.querySelector('[data-action="view"]');
        if (viewButton) {
            viewButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewProduct(product.id);
            });
        }

        const editButton = actionsCell.querySelector('[data-action="edit"]');
        if (editButton) {
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editProduct(product.id);
            });
        }

        const publishButton = actionsCell.querySelector('[data-action="publish"]');
        if (publishButton) {
            publishButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.publishProduct(product.id, product.name);
            });
        }

        const unpublishButton = actionsCell.querySelector('[data-action="unpublish"]');
        if (unpublishButton) {
            unpublishButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.unpublishProduct(product.id, product.name);
            });
        }

        const saleButton = actionsCell.querySelector('[data-action="sale"]');
        if (saleButton) {
            saleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openSaleModal(product.id);
            });
        }

        const deleteButton = actionsCell.querySelector('[data-action="delete"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProduct(product.id, product.name);
            });
        }

        // Append cells
        tr.appendChild(nameCell);
        tr.appendChild(categoryCell);
        tr.appendChild(statusCell);
        tr.appendChild(pricingCell);
        tr.appendChild(saleCell);
        tr.appendChild(commissionedCell);
        tr.appendChild(featuredCell);
        tr.appendChild(createdCell);
        tr.appendChild(actionsCell);

        return tr;
    }

    /**
     * View product detail
     * @param {string} productId - Product ID
     */
    viewProduct(productId) {
        // Find the product data
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            this.showError('Product not found');
            return;
        }
        
        // For now, show product info in an alert (can be enhanced later)
        const productInfo = `
Product: ${product.name}
Slug: ${product.slug}
Status: ${product.status}
Category: ${product.category_name}
Pricing: ${product.pricing_type}
Created: ${this.formatDate(product.created_at)}
Description: ${product.description || 'No description'}
        `.trim();
        
        alert(productInfo);
        
        // TODO: Create a proper product detail page or modal
        // window.open(`/products/${product.slug}`, '_blank');
    }

    /**
     * Edit product
     * @param {string} productId - Product ID
     */
    editProduct(productId) {
        // Open product wizard in edit mode
        window.logger?.log('Edit product:', productId);
        window.open(`/admin/components/product-wizard/product-wizard.html?edit=${productId}`, '_blank');
    }

    /**
     * Publish a product (placeholder - will be connected when publishing destination is ready)
     * @param {string} productId - Product ID to publish
     * @param {string} productName - Product name
     */
    /**
     * Check if a product is a test product
     * @param {Object} product - Product object
     * @returns {boolean} True if product is a test product
     */
    isTestProduct(product) {
        if (!product) return false;
        // Check if name starts with "Test"
        if (product.name && product.name.startsWith('Test ')) {
            return true;
        }
        // Check if Stripe product ID is a test ID
        if (product.stripe_product_id && product.stripe_product_id.startsWith('prod_test_')) {
            return true;
        }
        return false;
    }

    /**
     * Update product status
     * @param {string} productId - Product ID
     * @param {Object} product - Product object
     * @param {string} newStatus - New status value
     */
    async updateProductStatus(productId, product, newStatus) {
        try {
            const isTest = this.isTestProduct(product);
            
            // For real products, validate required fields when publishing (status = 'active')
            if (!isTest && newStatus === 'active') {
                const missingFields = [];
                
                if (!product.github_repo_url && !product.github_repo_name) {
                    missingFields.push('GitHub repository');
                }
                if (!product.cloudflare_domain && !product.cloudflare_worker_url) {
                    missingFields.push('Cloudflare configuration');
                }
                if (!product.stripe_product_id) {
                    missingFields.push('Stripe product');
                }
                if (!product.icon_url) {
                    missingFields.push('Product icon');
                }
                
                if (missingFields.length > 0) {
                    this.showError(`Cannot set status to 'active'. Missing required fields: ${missingFields.join(', ')}`);
                    // Reload to reset the dropdown
                    await this.loadProducts();
                    return;
                }
            }
            
            // Prepare update data
            const updateData = {
                status: newStatus
            };
            
            // Set published_at when status becomes 'active', clear it otherwise
            if (newStatus === 'active') {
                updateData.published_at = new Date().toISOString();
            } else if (product.status === 'active' && newStatus !== 'active') {
                updateData.published_at = null;
            }
            
            // Update product in database
            const { error } = await window.supabase
                .from('products')
                .update(updateData)
                .eq('id', productId);
            
            if (error) {
                throw error;
            }
            
            // Reload products to reflect changes
            await this.loadProducts();
            
            // Show success message
            const message = isTest && newStatus === 'active'
                ? `Test product status updated to '${newStatus}' (test mode - validation skipped)`
                : `Product status updated to '${newStatus}'`;
            this.showSuccess(message);
            
        } catch (error) {
            window.logger?.error('❌ Error updating product status:', error);
            this.showError(`Failed to update status: ${error.message || 'Unknown error'}`);
            // Reload to reset the dropdown
            await this.loadProducts();
        }
    }

    async publishProduct(productId, productName) {
        window.logger?.log('📢 Publish product:', productId, productName);
        
        try {
            // Get product data
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                this.showError('Product not found');
                return;
            }

            const isTest = this.isTestProduct(product);
            
            // For real products, validate required fields (unless it's a test product)
            if (!isTest) {
                // Validate required fields for real products
                const missingFields = [];
                
                if (!product.github_repo_url && !product.github_repo_name) {
                    missingFields.push('GitHub repository');
                }
                if (!product.cloudflare_domain && !product.cloudflare_worker_url) {
                    missingFields.push('Cloudflare configuration');
                }
                if (!product.stripe_product_id) {
                    missingFields.push('Stripe product');
                }
                if (!product.icon_url) {
                    missingFields.push('Product icon');
                }
                
                if (missingFields.length > 0) {
                    this.showError(`Cannot publish product. Missing required fields: ${missingFields.join(', ')}`);
                    return;
                }
            }
            
            // Update product status to 'active' and set published_at
            const { error } = await window.supabase
                .from('products')
                .update({
                    status: 'active',
                    published_at: new Date().toISOString()
                })
                .eq('id', productId);
            
            if (error) {
                throw error;
            }
            
            // Reload products to reflect changes
            await this.loadProducts();
            
            // Show success message
            const message = isTest 
                ? `Test product "${productName}" has been published (test mode - validation skipped)`
                : `Product "${productName}" has been published successfully`;
            this.showSuccess(message);
            
        } catch (error) {
            window.logger?.error('❌ Error publishing product:', error);
            this.showError(`Failed to publish product: ${error.message || 'Unknown error'}`);
        }
        // 4. Refresh product list
    }

    /**
     * Unpublish a product (placeholder - will be connected when publishing destination is ready)
     * @param {string} productId - Product ID to unpublish
     * @param {string} productName - Product name
     */
    async unpublishProduct(productId, productName) {
        window.logger?.log('📢 Unpublish product:', productId, productName);
        
        try {
            // Update product status to 'draft' and clear published_at
            const { error } = await window.supabase
                .from('products')
                .update({
                    status: 'draft',
                    published_at: null
                })
                .eq('id', productId);
            
            if (error) {
                throw error;
            }
            
            // Reload products to reflect changes
            await this.loadProducts();
            
            // Show success message
            this.showSuccess(`Product "${productName}" has been unpublished`);
            
        } catch (error) {
            window.logger?.error('❌ Error unpublishing product:', error);
            this.showError(`Failed to unpublish product: ${error.message || 'Unknown error'}`);
        }
        // 4. Refresh product list
    }

    /**
     * Delete a product
     * @param {string} productId - Product ID to delete
     * @param {string} productName - Product name for confirmation
     */
    async deleteProduct(productId, productName) {
        if (!window.supabase) {
            this.showError('Supabase not available');
            return;
        }
        
        // Confirm deletion with product name verification
        const confirmMessage = `Are you sure you want to permanently delete the product "${productName}"?\n\nThis action cannot be undone and will:\n- Delete the product\n- Remove all product data\n- Cancel all related purchases\n\nType "${productName}" to confirm:`;
        
        const confirmation = prompt(confirmMessage);
        
        if (confirmation !== productName) {
            if (confirmation !== null) {
                this.showError('Product name confirmation did not match. Deletion cancelled.');
            }
            return;
        }
        
        try {
            // Show loading state
            this.showLoading();
            
            // Get current session
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                this.showError('You must be logged in to delete products');
                this.hideLoading();
                return;
            }
            
            // Delete the product
            const { error } = await window.supabase
                .from('products')
                .delete()
                .eq('id', productId);
            
            if (error) {
                window.logger?.error('❌ Database error:', error);
                this.showError(`Failed to delete product: ${error.message}`);
                this.hideLoading();
                return;
            }
            
            this.showSuccess(`Product "${productName}" has been permanently deleted`);
            
            // Reload products list
            await this.loadProducts();
            
        } catch (error) {
            window.logger?.error('❌ Error deleting product:', error);
            this.showError(`Failed to delete product: ${error.message || 'Unknown error'}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Add new product
     */
    addProduct() {
        window.logger?.log('Opening product creation wizard');
        // Open product creation wizard in new tab
        window.open('/admin/components/product-wizard/product-wizard.html', '_blank');
    }

    /**
     * Create product bundle
     */
    createBundle() {
        window.logger?.log('Create product bundle');
        // TODO: Implement create bundle functionality
        this.showSuccess('Create bundle functionality coming soon!');
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loading = document.getElementById('products-loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
        this.hideTable();
        this.hideEmpty();
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = document.getElementById('products-loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Show empty state
     */
    showEmpty() {
        const empty = document.getElementById('products-empty');
        if (empty) {
            empty.classList.remove('hidden');
        }
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        const empty = document.getElementById('products-empty');
        if (empty) {
            empty.classList.add('hidden');
        }
    }

    /**
     * Show table
     */
    showTable() {
        const table = document.getElementById('products-table');
        if (table) {
            table.style.display = 'table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
        }
    }

    /**
     * Hide table
     */
    hideTable() {
        const table = document.getElementById('products-table');
        if (table) {
            table.style.display = 'none';
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.productManagementTranslations) {
                await window.productManagementTranslations.init();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.productManagementTranslations) {
            window.productManagementTranslations.updateTranslations();
        }
        this.showTranslatableContent();
        
        // Add a small delay to ensure translations are fully loaded
        setTimeout(() => {
            this.updateTableHeaders();
            this.updateFilterLabels();
        }, 50);
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#product-management .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }

    /**
     * Update table headers when language changes
     */
    updateTableHeaders() {
        if (!window.productManagementTranslations || !window.productManagementTranslations.isInitialized) {
            window.logger?.log('❌ Product Management: Translations not initialized, skipping table headers update');
            return;
        }

        window.logger?.log('🔄 Product Management: Updating table headers');
        const headerMap = {
            'Product Name': 'Product Name',
            'Category': 'Category',
            'Status': 'Status',
            'Pricing': 'Pricing',
            'Commissioned': 'Commissioned',
            'Featured': 'Featured',
            'Created': 'Created',
            'Actions': 'Actions'
        };

        // Update table headers
        const tableHeaders = document.querySelectorAll('#products-table th.translatable-content, #products-table th .translatable-content');
        window.logger?.log(`🔄 Product Management: Found ${tableHeaders.length} table headers to update`);
        
        const currentLanguage = window.productManagementTranslations.getCurrentLanguage();
        
        tableHeaders.forEach(header => {
            const translationKey = header.getAttribute('data-translation-key');
            if (translationKey && headerMap[translationKey]) {
                const newText = window.productManagementTranslations.getTranslation(translationKey, currentLanguage);
                window.logger?.log(`🔄 Product Management: Updating "${translationKey}" from "${header.textContent}" to "${newText}"`);
                header.textContent = newText;
            }
        });
    }

    /**
     * Update filter labels when language changes
     */
    updateFilterLabels() {
        if (!window.productManagementTranslations || !window.productManagementTranslations.isInitialized) {
            window.logger?.log('❌ Product Management: Translations not initialized, skipping filter labels update');
            return;
        }

        window.logger?.log('🔄 Product Management: Updating filter labels');
        const filterMap = {
            'Status': 'Status',
            'Category': 'Category',
            'Pricing Type': 'Pricing Type',
            'Commissioned': 'Commissioned',
            'Featured': 'Featured',
            'Created Date': 'Created Date',
            'select_status': 'select_status',
            'select_category': 'select_category',
            'select_pricing_type': 'select_pricing_type',
            'select_all': 'select_all',
            'deselect_all': 'deselect_all',
            'Clear Filters': 'Clear Filters'
        };

        // Update filter labels
        const filterLabels = document.querySelectorAll('#product-management .product-management__filter-label[data-translation-key]');
        window.logger?.log(`🔄 Product Management: Found ${filterLabels.length} filter labels to update`);
        
        const currentLanguage = window.productManagementTranslations.getCurrentLanguage();
        
        filterLabels.forEach(label => {
            const translationKey = label.getAttribute('data-translation-key');
            if (translationKey && filterMap[translationKey]) {
                const newText = window.productManagementTranslations.getTranslation(translationKey, currentLanguage);
                window.logger?.log(`🔄 Product Management: Updating filter "${translationKey}" from "${label.textContent}" to "${newText}"`);
                label.textContent = newText;
            }
        });

        // Update dropdown button text
        const dropdownButtons = document.querySelectorAll('#product-management .product-management__dropdown-btn span');
        window.logger?.log(`🔄 Product Management: Found ${dropdownButtons.length} dropdown buttons to update`);
        
        dropdownButtons.forEach(button => {
            const translationKey = button.getAttribute('data-translation-key');
            if (translationKey && filterMap[translationKey]) {
                const newText = window.productManagementTranslations.getTranslation(translationKey);
                window.logger?.log(`🔄 Product Management: Updating dropdown "${translationKey}" from "${button.textContent}" to "${newText}"`);
                button.textContent = newText;
            }
        });

        // Update clear button
        const clearButton = document.querySelector('#product-management .product-management__clear-btn');
        if (clearButton) {
            const newText = window.productManagementTranslations.getTranslation('Clear Filters');
            window.logger?.log(`🔄 Product Management: Updating clear button from "${clearButton.textContent}" to "${newText}"`);
            clearButton.textContent = newText;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.adminLayout) {
            window.adminLayout.showError(message);
        } else {
            window.logger?.error('Product Management Error:', message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.adminLayout) {
            window.adminLayout.showSuccess(message);
        } else {
            window.logger?.log('Product Management Success:', message);
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Search
            searchInput: document.getElementById('product-search-input'),
            // Sale modal elements
            saleModal: document.getElementById('sale-modal'),
            saleModalOverlay: document.getElementById('sale-modal-overlay'),
            saleModalClose: document.getElementById('sale-modal-close'),
            saleModalCancel: document.getElementById('sale-modal-cancel'),
            saleModalSave: document.getElementById('sale-modal-save'),
            saleModalTitle: document.getElementById('sale-modal-title'),
            saleForm: document.getElementById('sale-form'),
            saleIsOnSale: document.getElementById('sale-is-on-sale'),
            saleStartDate: document.getElementById('sale-start-date'),
            saleEndDate: document.getElementById('sale-end-date'),
            saleDiscountPercentage: document.getElementById('sale-discount-percentage'),
            saleDescription: document.getElementById('sale-description'),
            saleEmojiLeft: document.getElementById('sale-emoji-left'),
            saleEmojiRight: document.getElementById('sale-emoji-right'),
            saleDatesGroup: document.getElementById('sale-dates-group'),
            saleDiscountGroup: document.getElementById('sale-discount-group'),
            saleDescriptionGroup: document.getElementById('sale-description-group'),
            saleEmojiGroup: document.getElementById('sale-emoji-group'),
            
            // Dropdown buttons
            statusDropdownBtn: document.getElementById('status-dropdown-btn'),
            categoryDropdownBtn: document.getElementById('category-dropdown-btn'),
            pricingTypeDropdownBtn: document.getElementById('pricing-type-dropdown-btn'),
            
            // Dropdown content
            statusDropdown: document.getElementById('status-dropdown'),
            categoryDropdown: document.getElementById('category-dropdown'),
            pricingTypeDropdown: document.getElementById('pricing-type-dropdown'),
            
            // Options containers
            statusOptions: document.getElementById('status-options'),
            categoryOptions: document.getElementById('category-options'),
            pricingTypeOptions: document.getElementById('pricing-type-options'),
            
            // Search inputs within dropdowns
            statusSearch: document.getElementById('status-search'),
            categorySearch: document.getElementById('category-search'),
            pricingTypeSearch: document.getElementById('pricing-type-search'),
            
            // Action buttons
            statusSelectAll: document.getElementById('status-select-all'),
            statusDeselectAll: document.getElementById('status-deselect-all'),
            categorySelectAll: document.getElementById('category-select-all'),
            categoryDeselectAll: document.getElementById('category-deselect-all'),
            pricingTypeSelectAll: document.getElementById('pricing-type-select-all'),
            pricingTypeDeselectAll: document.getElementById('pricing-type-deselect-all'),
            
            // Single select filters
            commissionedFilter: document.getElementById('commissioned-filter'),
            featuredFilter: document.getElementById('featured-filter'),
            createdDateFilter: document.getElementById('created-date-filter'),
            
            // Summary and clear
            clearBtn: document.getElementById('product-clear-filters-btn'),
            filterSummary: document.querySelector('.product-management__summary .product-management__count'),
            // Sale modal elements
            saleModal: document.getElementById('sale-modal'),
            saleModalOverlay: document.getElementById('sale-modal-overlay'),
            saleModalClose: document.getElementById('sale-modal-close'),
            saleModalCancel: document.getElementById('sale-modal-cancel'),
            saleModalSave: document.getElementById('sale-modal-save'),
            saleModalTitle: document.getElementById('sale-modal-title'),
            saleForm: document.getElementById('sale-form'),
            saleIsOnSale: document.getElementById('sale-is-on-sale'),
            saleStartDate: document.getElementById('sale-start-date'),
            saleEndDate: document.getElementById('sale-end-date'),
            saleDiscountPercentage: document.getElementById('sale-discount-percentage'),
            saleDescription: document.getElementById('sale-description'),
            saleEmojiLeft: document.getElementById('sale-emoji-left'),
            saleEmojiRight: document.getElementById('sale-emoji-right'),
            saleDatesGroup: document.getElementById('sale-dates-group'),
            saleDiscountGroup: document.getElementById('sale-discount-group'),
            saleDescriptionGroup: document.getElementById('sale-description-group'),
            saleEmojiGroup: document.getElementById('sale-emoji-group')
        };
    }

    /**
     * Load saved filter preferences from database
     */
    async loadPreferences() {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            const { data: preferences } = await window.supabase
                .from('admin_preferences')
                .select('preferences')
                .eq('admin_id', user.id)
                .single();

            if (preferences && preferences.preferences.productManagementFilters) {
                this.filters = {
                    ...this.filters,
                    ...preferences.preferences.productManagementFilters
                };
            }
        } catch (error) {
            window.logger?.error('❌ Failed to load preferences:', error);
        }
    }

    /**
     * Save filter preferences to database
     */
    async savePreferences() {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            // Get existing preferences
            const { data: existingPrefs } = await window.supabase
                .from('admin_preferences')
                .select('preferences')
                .eq('admin_id', user.id)
                .single();

            const currentPreferences = existingPrefs?.preferences || {};
            currentPreferences.productManagementFilters = this.filters;

            await window.supabase
                .from('admin_preferences')
                .upsert({
                    admin_id: user.id,
                    preferences: currentPreferences
                }, { onConflict: 'admin_id' });

        } catch (error) {
            window.logger?.error('❌ Failed to save preferences:', error);
        }
    }

    /**
     * Populate filter options dynamically from product data
     */
    populateFilterOptions() {
        if (!this.products.length) return;

        // Get unique values for each filter type
        const statuses = [...new Set(this.products.map(product => product.status))];
        const categories = [...new Set(this.products.map(product => product.category_slug))];
        const pricingTypes = [...new Set(this.products.map(product => product.pricing_type))];

        window.logger?.log('🔍 Filter options found:', { statuses, categories, pricingTypes });

        // Render options for each filter
        this.renderFilterOptions('status', statuses);
        this.renderFilterOptions('category', categories);
        this.renderFilterOptions('pricingType', pricingTypes);
    }

    /**
     * Render filter options for a specific filter type
     */
    renderFilterOptions(filterType, options) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        options.forEach(option => {
            if (!option) return; // Skip null/undefined values

            const optionElement = document.createElement('label');
            optionElement.className = 'product-management__option';
            optionElement.innerHTML = `
                <input type="checkbox" value="${option}" class="product-management__checkbox">
                <span>${option}</span>
            `;

            // Set initial state based on saved preferences
            const checkbox = optionElement.querySelector('input');
            if (this.filters[filterType].includes(option)) {
                checkbox.checked = true;
            }

            // Add event listener
            checkbox.addEventListener('change', () => {
                this.handleFilterToggle(filterType, option, checkbox.checked);
            });

            optionsContainer.appendChild(optionElement);
        });
    }

    /**
     * Handle filter toggle for multi-select filters
     */
    handleFilterToggle(filterType, option, isChecked) {
        if (isChecked) {
            // Add to filter if not already present
            if (!this.filters[filterType].includes(option)) {
                this.filters[filterType].push(option);
            }
        } else {
            // Remove from filter
            this.filters[filterType] = this.filters[filterType].filter(item => item !== option);
        }

        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Handle select all for a filter type
     */
    handleSelectAll(filterType) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        const allValues = Array.from(checkboxes).map(cb => cb.value);

        // Set all checkboxes as checked
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });

        // Update filter
        this.filters[filterType] = [...allValues];
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Handle deselect all for a filter type
     */
    handleDeselectAll(filterType) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');

        // Set all checkboxes as unchecked
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Update filter
        this.filters[filterType] = [];
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Update filter summary text
     */
    updateFilterSummary() {
        if (!this.elements.filterSummary) return;

        const totalCount = this.products.length;
        const filteredCount = this.filteredProducts.length;

        let summaryText;
        if (filteredCount === totalCount) {
            summaryText = `Showing all products`;
        } else {
            summaryText = `Showing ${filteredCount} of ${totalCount} products`;
        }

        this.elements.filterSummary.textContent = summaryText;
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        // Reset filter state
        this.filters = {
            search: '',
            status: [],
            category: [],
            pricingType: [],
            commissioned: 'all',
            featured: 'all',
            createdDate: 'all'
        };

        // Clear search input
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        // Clear single select filters
        if (this.elements.commissionedFilter) {
            this.elements.commissionedFilter.value = 'all';
        }
        if (this.elements.featuredFilter) {
            this.elements.featuredFilter.value = 'all';
        }
        if (this.elements.createdDateFilter) {
            this.elements.createdDateFilter.value = 'all';
        }

        // Clear all checkboxes
        ['status', 'category', 'pricingType'].forEach(filterType => {
            const optionsContainer = this.elements[`${filterType}Options`];
            if (optionsContainer) {
                const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
        });

        // Apply filters and save preferences
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Initialize dropdown functionality
     */
    initializeDropdowns() {
        const dropdownButtons = [
            'statusDropdownBtn',
            'categoryDropdownBtn', 
            'pricingTypeDropdownBtn'
        ];

        dropdownButtons.forEach(btnKey => {
            const btn = this.elements[btnKey];
            const dropdown = this.elements[btnKey.replace('Btn', '')];

            if (btn && dropdown) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(btn, dropdown);
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                        this.closeDropdown(btn, dropdown);
                    }
                });
            }
        });
    }

    /**
     * Initialize dropdown search functionality
     */
    initializeDropdownSearch() {
        const searchInputs = [
            'statusSearch',
            'categorySearch', 
            'pricingTypeSearch'
        ];

        searchInputs.forEach(searchKey => {
            const searchInput = this.elements[searchKey];
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const filterType = searchKey.replace('Search', '');
                    this.filterDropdownOptions(filterType, e.target.value);
                });
            }
        });
    }

    /**
     * Filter dropdown options based on search input
     */
    filterDropdownOptions(filterType, searchTerm) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const options = optionsContainer.querySelectorAll('.product-management__option');
        const searchLower = searchTerm.toLowerCase();

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const isVisible = text.includes(searchLower);
            option.style.display = isVisible ? 'block' : 'none';
        });
    }

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown(btn, dropdown) {
        const isOpen = dropdown.classList.contains('show');
        
        // Close all other dropdowns
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.classList.add('show');
            btn.classList.add('active');
        }
    }

    /**
     * Close specific dropdown
     */
    closeDropdown(btn, dropdown) {
        dropdown.classList.remove('show');
        btn.classList.remove('active');
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const dropdowns = [
            'statusDropdown',
            'categoryDropdown',
            'pricingTypeDropdown'
        ];

        dropdowns.forEach(dropdownKey => {
            const btn = this.elements[dropdownKey.replace('Dropdown', 'DropdownBtn')];
            const dropdown = this.elements[dropdownKey];
            
            if (btn && dropdown) {
                this.closeDropdown(btn, dropdown);
            }
        });
    }

    /**
     * Open sale management modal
     * @param {string} productId - Product ID
     */
    async openSaleModal(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                this.showError('Product not found');
                return;
            }

            this.currentEditingProduct = product;

            // Update modal title
            if (this.elements.saleModalTitle) {
                this.elements.saleModalTitle.textContent = `Manage Sale - ${product.name}`;
            }

            // Populate form fields
            if (this.elements.saleIsOnSale) {
                this.elements.saleIsOnSale.checked = product.is_on_sale || false;
            }

            if (this.elements.saleStartDate) {
                this.elements.saleStartDate.value = product.sale_start_date 
                    ? new Date(product.sale_start_date).toISOString().slice(0, 16) 
                    : '';
            }

            if (this.elements.saleEndDate) {
                this.elements.saleEndDate.value = product.sale_end_date 
                    ? new Date(product.sale_end_date).toISOString().slice(0, 16) 
                    : '';
            }

            if (this.elements.saleDiscountPercentage) {
                this.elements.saleDiscountPercentage.value = product.sale_discount_percentage || '';
            }

            if (this.elements.saleDescription) {
                this.elements.saleDescription.value = product.sale_description || '';
            }

            if (this.elements.saleEmojiLeft) {
                this.elements.saleEmojiLeft.value = product.sale_emoji_left || '✨';
            }

            if (this.elements.saleEmojiRight) {
                this.elements.saleEmojiRight.value = product.sale_emoji_right || '✨';
            }

            // Toggle fields based on sale status
            this.toggleSaleFields(product.is_on_sale || false);

            // Show modal
            if (this.elements.saleModalOverlay) {
                this.elements.saleModalOverlay.style.display = 'flex';
            }
        } catch (error) {
            window.logger?.error('❌ Failed to open sale modal:', error);
            this.showError('Failed to open sale management');
        }
    }

    /**
     * Close sale modal
     */
    closeSaleModal() {
        if (this.elements.saleModalOverlay) {
            this.elements.saleModalOverlay.style.display = 'none';
        }
        this.currentEditingProduct = null;
        
        // Reset form
        if (this.elements.saleForm) {
            this.elements.saleForm.reset();
        }
    }

    /**
     * Toggle sale fields visibility
     * @param {boolean} enabled - Whether sale is enabled
     */
    toggleSaleFields(enabled) {
        if (this.elements.saleDatesGroup) {
            this.elements.saleDatesGroup.style.display = enabled ? 'block' : 'none';
        }
        if (this.elements.saleDiscountGroup) {
            this.elements.saleDiscountGroup.style.display = enabled ? 'block' : 'none';
        }
        if (this.elements.saleDescriptionGroup) {
            this.elements.saleDescriptionGroup.style.display = enabled ? 'block' : 'none';
        }
        if (this.elements.saleEmojiGroup) {
            this.elements.saleEmojiGroup.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Save sale configuration
     */
    async saveSale() {
        try {
            if (!this.currentEditingProduct) {
                this.showError('No product selected');
                return;
            }

            const isOnSale = this.elements.saleIsOnSale?.checked || false;
            const saleStartDate = this.elements.saleStartDate?.value || null;
            const saleEndDate = this.elements.saleEndDate?.value || null;
            const saleDiscountPercentage = this.elements.saleDiscountPercentage?.value 
                ? parseFloat(this.elements.saleDiscountPercentage.value) 
                : null;
            const saleDescription = this.elements.saleDescription?.value || null;
            const saleEmojiLeft = this.elements.saleEmojiLeft?.value || '✨';
            const saleEmojiRight = this.elements.saleEmojiRight?.value || '✨';

            // Validate discount percentage
            if (isOnSale && saleDiscountPercentage !== null) {
                if (saleDiscountPercentage < 0 || saleDiscountPercentage > 100) {
                    this.showError('Discount percentage must be between 0 and 100');
                    return;
                }
            }

            // Prepare update data
            const updateData = {
                is_on_sale: isOnSale,
                sale_start_date: saleStartDate ? new Date(saleStartDate).toISOString() : null,
                sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
                sale_discount_percentage: isOnSale ? saleDiscountPercentage : null,
                sale_description: isOnSale ? saleDescription : null,
                sale_emoji_left: isOnSale ? saleEmojiLeft : '✨',
                sale_emoji_right: isOnSale ? saleEmojiRight : '✨'
            };

            // If removing sale, clear sale-related fields
            if (!isOnSale) {
                updateData.sale_start_date = null;
                updateData.sale_end_date = null;
                updateData.sale_description = null;
                updateData.sale_discount_percentage = null;
                updateData.sale_emoji_left = '✨';
                updateData.sale_emoji_right = '✨';
            }

            // Calculate sale pricing if discount percentage is provided
            let salePricing = null;
            if (isOnSale && saleDiscountPercentage !== null && this.currentEditingProduct) {
                salePricing = this.calculateSalePricing(this.currentEditingProduct, saleDiscountPercentage);
                updateData.sale_pricing = salePricing;
            } else if (!isOnSale) {
                updateData.sale_pricing = null;
            }

            // Update product in database
            const { error: updateError } = await window.supabase
                .from('products')
                .update(updateData)
                .eq('id', this.currentEditingProduct.id);

            if (updateError) {
                throw updateError;
            }

            // If product has Stripe integration, update Stripe sale prices
            // Skip Stripe update for test products (they have fake Stripe IDs)
            if (this.currentEditingProduct.stripe_product_id && !this.isTestProduct(this.currentEditingProduct)) {
                await this.updateStripeSalePrices(
                    this.currentEditingProduct.id,
                    isOnSale,
                    salePricing,
                    saleDiscountPercentage
                );
            } else if (this.isTestProduct(this.currentEditingProduct)) {
                window.logger?.log('ℹ️ Skipping Stripe update for test product');
            }

            // Reload products to reflect changes
            await this.loadProducts();

            // Close modal
            this.closeSaleModal();

            // Show success message
            this.showSuccess('Sale configuration saved successfully');

        } catch (error) {
            window.logger?.error('❌ Failed to save sale:', error);
            this.showError('Failed to save sale configuration: ' + (error.message || error));
        }
    }

    /**
     * Calculate sale pricing based on discount percentage
     * @param {Object} product - Product object
     * @param {number} discountPercentage - Discount percentage (0-100)
     * @returns {Object} Sale pricing object
     */
    calculateSalePricing(product, discountPercentage) {
        const salePricing = {};
        const discountMultiplier = 1 - (discountPercentage / 100);

        // Handle different pricing types
        if (product.pricing_type === 'one_time' && product.price_amount) {
            // For one-time products, calculate sale price per currency
            // We need to get the pricing from the product (might need to query for full pricing data)
            // For now, use the price_amount as base
            salePricing[product.price_currency || 'USD'] = Math.round(product.price_amount * discountMultiplier * 100) / 100;
        } else if (product.pricing_type === 'subscription') {
            // For subscriptions, we need monthly and yearly prices
            // This would need to be calculated from the actual pricing structure
            // For now, return empty object - will be handled by Stripe update
            salePricing = {};
        }

        return salePricing;
    }

    /**
     * Update Stripe sale prices
     * @param {string} productId - Product ID
     * @param {boolean} isOnSale - Whether product is on sale
     * @param {Object} salePricing - Sale pricing object
     * @param {number} discountPercentage - Discount percentage
     */
    async updateStripeSalePrices(productId, isOnSale, salePricing, discountPercentage) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product || !product.stripe_product_id) {
                return;
            }

            // Get current session
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session) {
                window.logger?.warn('⚠️ No session available for Stripe update');
                return;
            }

            // Prepare request body
            const body = {
                productId: product.stripe_product_id,
                is_on_sale: isOnSale,
                sale_discount_percentage: discountPercentage,
                pricing_type: product.pricing_type,
                // Pass existing price IDs
                existing_price_id: product.stripe_price_id,
                existing_monthly_price_id: product.stripe_price_monthly_id,
                existing_yearly_price_id: product.stripe_price_yearly_id,
                // Pass existing sale price IDs
                old_sale_price_id: product.stripe_price_sale_id,
                old_sale_monthly_price_id: product.stripe_price_monthly_sale_id,
                old_sale_yearly_price_id: product.stripe_price_yearly_sale_id
            };

            // Get pricing data for calculation
            if (product.pricing_type === 'one_time' && product.price_amount) {
                body.pricing = {
                    [product.price_currency || 'USD']: product.price_amount
                };
            } else if (product.pricing_type === 'subscription') {
                // For subscriptions, we'd need the full pricing structure
                // This might need to be fetched separately or stored differently
                body.pricing = salePricing || {};
            }

            // Call update edge function
            const { data, error } = await window.supabase.functions.invoke('update-stripe-product', {
                body: body,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (error) {
                throw error;
            }

            // Update product with new sale price IDs
            if (data && (data.sale_price_id || data.sale_monthly_price_id || data.sale_yearly_price_id)) {
                const updateData = {};
                if (data.sale_price_id) updateData.stripe_price_sale_id = data.sale_price_id;
                if (data.sale_monthly_price_id) updateData.stripe_price_monthly_sale_id = data.sale_monthly_price_id;
                if (data.sale_yearly_price_id) updateData.stripe_price_yearly_sale_id = data.sale_yearly_price_id;

                await window.supabase
                    .from('products')
                    .update(updateData)
                    .eq('id', productId);
            }

            window.logger?.log('✅ Stripe sale prices updated successfully');

        } catch (error) {
            window.logger?.error('❌ Failed to update Stripe sale prices:', error);
            // Don't throw - allow the sale to be saved even if Stripe update fails
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
            leftPicker.querySelectorAll('.product-management__emoji-btn').forEach(btn => {
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
            rightPicker.querySelectorAll('.product-management__emoji-btn').forEach(btn => {
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
} // End of ProductManagement class

// Export for use in other scripts
window.ProductManagement = ProductManagement;
} // End of if statement to prevent duplicate class declaration

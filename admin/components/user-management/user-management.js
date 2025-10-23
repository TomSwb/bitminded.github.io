/**
 * User Management Component
 * Handles user list display, search, filtering, and pagination
 */

if (typeof window.UserManagement === 'undefined') {
class UserManagement {
    constructor() {
        this.isInitialized = false;
        this.users = [];
        this.filteredUsers = [];
        this.currentPage = 1;
        this.itemsPerPage = 25;
        this.filters = {
            search: '',
            status: '',
            role: '',
            subscription: ''
        };
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.searchTimeout = null;
    }

    /**
     * Initialize the user management component
     */
    async init() {
        if (this.isInitialized) {
            console.log('User Management: Already initialized');
            return;
        }

        try {
            // Initializing

            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize translations
            await this.initializeTranslations();
            
            // Show translatable content
            this.showTranslatableContent();
            
            // Load users
            await this.loadUsers();

            this.isInitialized = true;
            // Initialized

        } catch (error) {
            console.error('❌ User Management: Failed to initialize:', error);
            this.showError('Failed to initialize user management');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input (debounced)
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300); // 300ms debounce
            });
        }

        // Status filter
        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Role filter (commented out - will be needed when multiple roles exist)
        /*
        const roleFilter = document.getElementById('filter-role');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.applyFilters();
            });
        }
        */

        // Subscription filter
        const subscriptionFilter = document.getElementById('filter-subscription');
        if (subscriptionFilter) {
            subscriptionFilter.addEventListener('change', (e) => {
                this.filters.subscription = e.target.value;
                this.applyFilters();
            });
        }

        // Clear filters button
        const clearButton = document.getElementById('clear-filters-button');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Export button
        const exportButton = document.getElementById('export-users-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportUsers();
            });
        }

        // Sortable headers
        const sortableHeaders = document.querySelectorAll('.user-management__sortable-header');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.getAttribute('data-sort');
                this.handleSort(sortField);
            });
        });

        // Items per page
        const itemsPerPage = document.getElementById('items-per-page');
        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1; // Reset to first page
                this.renderUsers();
            });
        }

        // Pagination buttons
        const prevButton = document.getElementById('pagination-prev');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderUsers();
                }
            });
        }

        const nextButton = document.getElementById('pagination-next');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderUsers();
                }
            });
        }

        // Language change
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Load users from database
     */
    async loadUsers() {
        try {
            this.showLoading();
            // Loading users

            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action - viewing user list
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'user_list_viewed',
                    `Admin viewed user management list`
                ); // No user_id - this is an admin-only action
            }

            // Query users with all related data
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, created_at, email, status')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Database query error:', error);
                throw error;
            }

            // Enrich user data with roles and subscriptions
            this.users = await Promise.all(data.map(async (profile) => {
                // Get role (prioritize admin role if multiple roles exist)
                const { data: roleData } = await window.supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', profile.id)
                    .order('role', { ascending: true }) // 'admin' comes before 'user' alphabetically, so ascending puts 'admin' first
                    .limit(1)
                    .maybeSingle();

                // Get subscription count
                const { count } = await window.supabase
                    .from('entitlements')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('active', true);

                // Get last login with location
                const { data: lastLogin } = await window.supabase
                    .from('user_login_activity')
                    .select('login_time, location_city, location_country')
                    .eq('user_id', profile.id)
                    .eq('success', true) // Only successful logins
                    .order('login_time', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return {
                    ...profile,
                    email: profile.email || 'Email not available',
                    role: roleData?.role || 'user',
                    status: profile.status || 'active',
                    subscription_count: count || 0,
                    last_login: lastLogin?.login_time || null,
                    last_login_city: lastLogin?.location_city || null,
                    last_login_country: lastLogin?.location_country || null
                };
            }));

            // Users loaded
            
            // Apply initial filters and render
            this.filteredUsers = [...this.users];
            this.renderUsers();
            this.hideLoading();

        } catch (error) {
            console.error('❌ Failed to load users:', error);
            this.hideLoading();
            this.showEmpty();
            this.showError('Failed to load users');
        }
    }

    /**
     * Apply filters to users list
     */
    applyFilters() {
        this.filteredUsers = this.users.filter(user => {
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search;
                const matchesSearch = 
                    user.username.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower);
                
                if (!matchesSearch) return false;
            }

            // Status filter
            if (this.filters.status) {
                if (user.status !== this.filters.status) return false;
            }

            // Role filter
            if (this.filters.role) {
                if (user.role !== this.filters.role) return false;
            }

            // Subscription filter
            if (this.filters.subscription === 'active') {
                if (user.subscription_count === 0) return false;
            } else if (this.filters.subscription === 'none') {
                if (user.subscription_count > 0) return false;
            }

            return true;
        });

        // Apply sorting if active
        if (this.sort.field) {
            this.applySorting();
        }

        // Reset to first page when filtering
        this.currentPage = 1;
        
        // Render filtered results
        this.renderUsers();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        // Reset filter values
        this.filters = {
            search: '',
            status: '',
            role: '',
            subscription: ''
        };

        // Reset UI
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) searchInput.value = '';

        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) statusFilter.value = '';

        const roleFilter = document.getElementById('filter-role');
        if (roleFilter) roleFilter.value = '';

        const subscriptionFilter = document.getElementById('filter-subscription');
        if (subscriptionFilter) subscriptionFilter.value = '';

        // Reapply (will show all)
        this.applyFilters();
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
        this.renderUsers();
    }

    /**
     * Apply sorting to filtered users
     */
    applySorting() {
        if (!this.sort.field) return;

        this.filteredUsers.sort((a, b) => {
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
        const headers = document.querySelectorAll('.user-management__sortable-header');
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
     * Render users table
     */
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        // Calculate pagination
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageUsers = this.filteredUsers.slice(start, end);

        // Clear table
        tbody.innerHTML = '';

        // Check if empty
        if (pageUsers.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        // Render each user
        pageUsers.forEach(user => {
            const row = this.createUserRow(user);
            tbody.appendChild(row);
        });

        // Update pagination
        this.updatePagination();
        
        // Update total count
        this.updateTotalCount();
    }

    /**
     * Create user table row
     * @param {Object} user - User data
     * @returns {HTMLElement} Table row element
     */
    createUserRow(user) {
        const tr = document.createElement('tr');
        tr.dataset.userId = user.id;
        
        // Username cell
        const usernameCell = document.createElement('td');
        usernameCell.setAttribute('data-label', 'Username');
        usernameCell.textContent = user.username;

        // Email cell
        const emailCell = document.createElement('td');
        emailCell.setAttribute('data-label', 'Email');
        emailCell.textContent = user.email;

        // Role cell
        const roleCell = document.createElement('td');
        roleCell.setAttribute('data-label', 'Role');
        roleCell.innerHTML = `
            <span class="user-management__badge user-management__badge--${user.role}">
                ${user.role}
            </span>
        `;

        // Status cell
        const statusCell = document.createElement('td');
        statusCell.setAttribute('data-label', 'Status');
        const status = user.status || 'active';
        statusCell.innerHTML = `
            <span class="user-management__badge user-management__badge--${status}">
                ${status}
            </span>
        `;

        // Subscriptions cell
        const subsCell = document.createElement('td');
        subsCell.setAttribute('data-label', 'Subscriptions');
        subsCell.textContent = user.subscription_count;

        // Registered cell
        const registeredCell = document.createElement('td');
        registeredCell.setAttribute('data-label', 'Registered');
        registeredCell.textContent = this.formatDate(user.created_at);

        // Last login cell
        const lastLoginCell = document.createElement('td');
        lastLoginCell.setAttribute('data-label', 'Last Login');
        
        if (user.last_login) {
            const loginDate = new Date(user.last_login);
            const date = loginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const time = loginDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            const location = user.last_login_city && user.last_login_country 
                ? `${user.last_login_city}, ${user.last_login_country}`
                : user.last_login_country || 'Unknown';
            
            lastLoginCell.innerHTML = `
                <div style="line-height: 1.4;">
                    <div style="color: var(--color-text-primary);">${date}</div>
                    <div style="color: var(--color-text-primary); font-size: 0.85em;">${time}</div>
                    <div style="color: var(--color-text-primary); font-size: 0.85em;">📍 ${location}</div>
                </div>
            `;
        } else {
            lastLoginCell.textContent = 'Never';
        }

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.setAttribute('data-label', 'Actions');
        actionsCell.innerHTML = `
            <div class="user-management__actions-cell">
                <button class="user-management__action-button" data-action="view" data-user-id="${user.id}">
                    View
                </button>
                <button class="user-management__action-button user-management__action-button--danger" data-action="delete" data-user-id="${user.id}">
                    Delete
                </button>
            </div>
        `;

        // Add click handler to view button
        const viewButton = actionsCell.querySelector('[data-action="view"]');
        if (viewButton) {
            viewButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent any bubbling
                this.viewUserDetail(user.id);
            });
        }

        // Add click handler to delete button
        const deleteButton = actionsCell.querySelector('[data-action="delete"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent any bubbling
                this.deleteUser(user.id, user.username);
            });
        }

        // Append cells
        tr.appendChild(usernameCell);
        tr.appendChild(emailCell);
        tr.appendChild(roleCell);
        tr.appendChild(statusCell);
        tr.appendChild(subsCell);
        tr.appendChild(registeredCell);
        tr.appendChild(lastLoginCell);
        tr.appendChild(actionsCell);

        return tr;
    }

    /**
     * View user detail
     * @param {string} userId - User ID
     */
    viewUserDetail(userId) {
        console.log('👤 Opening user details in new tab for:', userId);
        
        // Open user detail page in new tab
        window.open(`/admin/components/user-detail/?id=${userId}`, '_blank');
    }

    /**
     * Delete a user
     * @param {string} userId - User ID to delete
     * @param {string} username - Username for confirmation
     */
    async deleteUser(userId, username) {
        console.log('🗑️ Attempting to delete user:', userId);
        
        if (!window.supabase) {
            this.showError('Supabase not available');
            return;
        }
        
        // Confirm deletion with username verification
        const confirmMessage = `Are you sure you want to permanently delete the user "${username}"?\n\nThis action cannot be undone and will:\n- Delete the user account\n- Remove all user data\n- Revoke all active sessions\n- Cancel all subscriptions\n\nType "${username}" to confirm:`;
        
        const confirmation = prompt(confirmMessage);
        
        if (confirmation !== username) {
            if (confirmation !== null) {
                this.showError('Username confirmation did not match. Deletion cancelled.');
            }
            return;
        }
        
        try {
            // Show loading state
            this.showLoading();
            
            // Get current session
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                this.showError('You must be logged in to delete users');
                this.hideLoading();
                return;
            }
            
            console.log('🔑 Session token available:', !!session.access_token);
            console.log('🔑 Calling delete-user Edge Function with auth...');
            
            // Call the delete-user Edge Function with explicit headers
            const response = await window.supabase.functions.invoke('delete-user', {
                body: {
                    user_id: userId,
                    username: username,
                    reason: 'Deleted by admin from user management'
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            
            console.log('📡 Edge Function response:', response);
            
            if (response.error) {
                console.error('❌ Edge Function error:', response.error);
                console.error('❌ Error data:', response.data);
                
                // Try to extract error message from response
                const errorMessage = response.data?.error || response.error.message || 'Unknown error';
                this.showError(`Failed to delete user: ${errorMessage}`);
                this.hideLoading();
                return;
            }
            
            console.log('✅ User deleted successfully:', response.data);
            this.showSuccess(`User "${username}" has been permanently deleted`);
            
            // Reload users list
            await this.loadUsers();
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showError(`Failed to delete user: ${error.message || 'Unknown error'}`);
        } finally {
            this.hideLoading();
        }
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
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        
        // Update pagination info
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredUsers.length);
        
        document.getElementById('pagination-start').textContent = this.filteredUsers.length > 0 ? start : 0;
        document.getElementById('pagination-end').textContent = end;
        document.getElementById('pagination-total').textContent = this.filteredUsers.length;

        // Update button states
        const prevButton = document.getElementById('pagination-prev');
        const nextButton = document.getElementById('pagination-next');
        
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage >= totalPages;
        }

        // Update page numbers
        this.renderPageNumbers(totalPages);
    }

    /**
     * Render page numbers
     * @param {number} totalPages - Total number of pages
     */
    renderPageNumbers(totalPages) {
        const pagesContainer = document.getElementById('pagination-pages');
        if (!pagesContainer) return;

        pagesContainer.innerHTML = '';

        // Show max 5 page numbers
        const maxPages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);

        // Adjust start if end is at max
        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'user-management__pagination-page';
            if (i === this.currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.currentPage = i;
                this.renderUsers();
            });
            pagesContainer.appendChild(pageButton);
        }
    }

    /**
     * Update total count display
     */
    updateTotalCount() {
        const countNumber = document.getElementById('user-count-number');
        if (countNumber) {
            countNumber.textContent = this.users.length;
        }
    }

    /**
     * Export users to CSV
     */
    exportUsers() {
        console.log('📤 Exporting users...');
        
        // Create CSV content
        const headers = ['Username', 'Email', 'Role', 'Status', 'Subscriptions', 'Registered', 'Last Login'];
        const rows = this.filteredUsers.map(user => [
            user.username,
            user.email,
            user.role,
            user.status || 'active',
            user.subscription_count,
            this.formatDate(user.created_at),
            user.last_login ? this.formatDate(user.last_login) : 'Never'
        ]);

        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('✅ Users exported');
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loading = document.getElementById('users-loading');
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
        const loading = document.getElementById('users-loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Show empty state
     */
    showEmpty() {
        const empty = document.getElementById('users-empty');
        if (empty) {
            empty.classList.remove('hidden');
        }
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        const empty = document.getElementById('users-empty');
        if (empty) {
            empty.classList.add('hidden');
        }
    }

    /**
     * Show table
     */
    showTable() {
        const table = document.getElementById('users-table');
        if (table) {
            table.style.display = 'table';
        }
    }

    /**
     * Hide table
     */
    hideTable() {
        const table = document.getElementById('users-table');
        if (table) {
            table.style.display = 'none';
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.userManagementTranslations) {
                await window.userManagementTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.userManagementTranslations) {
            window.userManagementTranslations.updateTranslations();
        }
        this.showTranslatableContent();
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#user-management .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.adminLayout) {
            window.adminLayout.showError(message);
        } else {
            console.error('User Management Error:', message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.adminLayout) {
            window.adminLayout.showSuccess(message);
        } else {
            console.log('User Management Success:', message);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingContainer = document.querySelector('.user-management__loading');
        const tableBody = document.getElementById('users-table-body');
        
        if (loadingContainer && tableBody) {
            loadingContainer.style.display = 'flex';
            tableBody.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingContainer = document.querySelector('.user-management__loading');
        const tableBody = document.getElementById('users-table-body');
        
        if (loadingContainer && tableBody) {
            loadingContainer.style.display = 'none';
            tableBody.style.display = 'table-row-group';
        }
    }
}

// Export for use in other scripts
window.UserManagement = UserManagement;
} // End of if statement to prevent duplicate class declaration


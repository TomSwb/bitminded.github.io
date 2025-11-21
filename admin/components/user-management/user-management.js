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
        this.filters = this.getDefaultFilters();
        this.sort = {
            field: null,
            direction: 'asc'
        };
        this.searchTimeout = null;
        this.elements = {}; // Store DOM elements
    }

    /**
     * Return a copy of the default filter configuration
     */
    getDefaultFilters() {
        return {
            search: '',
            status: [],
            role: [],
            subscription: [],
            registrationDate: 'all',
            lastLogin: 'all',
            lastLoginLocation: [],
            gender: [],
            country: [],
            age: [],
            language: []
        };
    }

    /**
     * Ensure filter state contains all expected keys with valid types
     */
    normalizeFilters() {
        const defaults = this.getDefaultFilters();
        this.filters = {
            ...defaults,
            ...this.filters
        };

        const arrayFilters = ['status', 'role', 'subscription', 'lastLoginLocation', 'gender', 'country', 'age', 'language'];
        arrayFilters.forEach(filterKey => {
            if (!Array.isArray(this.filters[filterKey])) {
                this.filters[filterKey] = [];
            }
        });

        if (typeof this.filters.search !== 'string') {
            this.filters.search = '';
        }

        const allowedRegistration = ['all', '7d', '30d', '90d', '1y'];
        if (!allowedRegistration.includes(this.filters.registrationDate)) {
            this.filters.registrationDate = 'all';
        }

        const allowedLastLogin = ['all', 'never', '7d', '30d', '90d'];
        if (!allowedLastLogin.includes(this.filters.lastLogin)) {
            this.filters.lastLogin = 'all';
        }
    }

    /**
     * Initialize the user management component
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
            
            // Load users
            await this.loadUsers();

            // Populate filter options
            this.populateFilterOptions();

            // Apply initial filters
            this.applyFilters();

            this.isInitialized = true;

        } catch (error) {
            window.logger?.error('❌ User Management: Failed to initialize:', error);
            this.showError('Failed to initialize user management');
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

        // Date filters
        if (this.elements.registrationDateFilter) {
            this.elements.registrationDateFilter.addEventListener('change', (e) => {
                this.filters.registrationDate = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        if (this.elements.lastLoginFilter) {
            this.elements.lastLoginFilter.addEventListener('change', (e) => {
                this.filters.lastLogin = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        // Select All / Deselect All buttons
        const filterTypes = ['status', 'role', 'subscription', 'gender', 'country', 'age', 'language', 'lastLoginLocation'];
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
                .select('id, username, avatar_url, created_at, email, status, date_of_birth, gender, country, language')
                .order('created_at', { ascending: false });

            if (error) {
                window.logger?.error('❌ Database query error:', error);
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
                    last_login_country: lastLogin?.location_country || null,
                    last_login_location: lastLogin ? 
                        [lastLogin.location_city, lastLogin.location_country].filter(Boolean).join(', ') : 
                        null
                };
            }));

            
            // Apply initial filters and render
            this.applyFilters();
            this.hideLoading();

        } catch (error) {
            window.logger?.error('❌ Failed to load users:', error);
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

            // Status filter (multi-select)
            if (this.filters.status.length > 0) {
                if (!this.filters.status.includes(user.status)) return false;
            }

            // Role filter (multi-select)
            if (this.filters.role.length > 0) {
                if (!this.filters.role.includes(user.role)) return false;
            }

            // Subscription filter (multi-select)
            if (this.filters.subscription.length > 0) {
                const userSubscriptionStatus = user.subscription_count > 0 ? 'active' : 'none';
                if (!this.filters.subscription.includes(userSubscriptionStatus)) return false;
            }

            // Registration date filter
            if (this.filters.registrationDate !== 'all') {
                const registrationDate = new Date(user.created_at);
                const now = new Date();
                const daysDiff = Math.floor((now - registrationDate) / (1000 * 60 * 60 * 24));
                
                switch (this.filters.registrationDate) {
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

            // Last login filter
            if (this.filters.lastLogin !== 'all') {
                if (!user.last_login) {
                    // User has never logged in
                    if (this.filters.lastLogin !== 'never') return false;
                } else {
                    const lastLoginDate = new Date(user.last_login);
                    const now = new Date();
                    const daysDiff = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));
                    
                    switch (this.filters.lastLogin) {
                        case 'never':
                            return false; // User has logged in, so doesn't match "never"
                        case '7d':
                            if (daysDiff > 7) return false;
                            break;
                        case '30d':
                            if (daysDiff > 30) return false;
                            break;
                        case '90d':
                            if (daysDiff > 90) return false;
                            break;
                    }
                }
            }

            // Gender filter (multi-select)
            if (this.filters.gender.length > 0) {
                if (!user.gender || !this.filters.gender.includes(user.gender)) return false;
            }

            // Country filter (multi-select)
            if (this.filters.country.length > 0) {
                if (!user.country || !this.filters.country.includes(user.country)) return false;
            }

            // Age filter (multi-select)
            if (this.filters.age.length > 0) {
                if (!user.date_of_birth) return false; // Skip users without birth date
                
                const birthDate = new Date(user.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                
                // Determine age range
                let ageRange;
                if (age < 18) {
                    ageRange = 'Under 18';
                } else if (age >= 18 && age <= 25) {
                    ageRange = '18-25';
                } else if (age >= 26 && age <= 35) {
                    ageRange = '26-35';
                } else if (age >= 36 && age <= 50) {
                    ageRange = '36-50';
                } else if (age >= 51 && age <= 65) {
                    ageRange = '51-65';
                } else {
                    ageRange = '65+';
                }
                
                if (!this.filters.age.includes(ageRange)) return false;
            }

            // Language filter (multi-select)
            if (this.filters.language.length > 0) {
                if (!user.language || !this.filters.language.includes(user.language)) return false;
            }

            // Last Login Location filter (multi-select)
            if (this.filters.lastLoginLocation.length > 0) {
                if (!user.last_login_location || !this.filters.lastLoginLocation.includes(user.last_login_location)) return false;
            }

            return true;
        });


        // Apply sorting if active
        if (this.sort.field) {
            this.applySorting();
        }

        // Reset to first page when filtering
        this.currentPage = 1;
        
        // Update filter summary
        this.updateFilterSummary();
        
        // Render filtered results
        this.renderUsers();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        // Reset filter values
        this.filters = this.getDefaultFilters();

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
        if (!tbody) {
            window.logger?.error('❌ Table body not found');
            return;
        }

        // Show all filtered users (no pagination)
        const allUsers = this.filteredUsers;

        // Clear table and ensure tbody is visible
        tbody.innerHTML = '';
        tbody.style.display = 'table-row-group'; // Explicitly show the tbody

        // Check if empty
        if (allUsers.length === 0) {
            this.showEmpty();
            this.hideTable();
            return;
        }

        this.showTable();
        this.hideEmpty();

        // Render each user
        allUsers.forEach((user, index) => {
            const row = this.createUserRow(user);
            tbody.appendChild(row);
        });
    }

    /**
     * Create user table row
     * @param {Object} user - User data
     * @returns {HTMLElement} Table row element
     */
    createUserRow(user) {
        
        const tr = document.createElement('tr');
        tr.dataset.userId = user.id;
        tr.style.borderBottom = '1px solid var(--color-primary)';
        
        
        // Username cell
        const usernameCell = document.createElement('td');
        usernameCell.setAttribute('data-label', 'Username');
        usernameCell.style.padding = 'var(--spacing-sm)';
        usernameCell.style.color = 'var(--color-text-primary)';
        usernameCell.textContent = user.username;

        // Email cell
        const emailCell = document.createElement('td');
        emailCell.setAttribute('data-label', 'Email');
        emailCell.style.padding = 'var(--spacing-sm)';
        emailCell.style.color = 'var(--color-text-primary)';
        emailCell.textContent = user.email;

        // Role cell
        const roleCell = document.createElement('td');
        roleCell.setAttribute('data-label', 'Role');
        roleCell.style.padding = 'var(--spacing-sm)';
        
        // Different styling for User vs Admin roles
        const roleStyle = user.role === 'user' 
            ? 'background-color: var(--color-background-primary); color: var(--color-primary); border: 1px solid var(--color-primary);'
            : 'background-color: var(--color-primary); color: var(--color-background-primary);';
            
        roleCell.innerHTML = `
            <span style="display: inline-block; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; ${roleStyle}">
                ${user.role}
            </span>
        `;

        // Status cell
        const statusCell = document.createElement('td');
        statusCell.setAttribute('data-label', 'Status');
        statusCell.style.padding = 'var(--spacing-sm)';
        const status = user.status || 'active';
        
        // Determine badge class based on status
        const badgeClass = status === 'suspended' ? 'user-management__badge--suspended' : 'user-management__badge--active';
        
        statusCell.innerHTML = `
            <span class="user-management__badge ${badgeClass}">
                ${status}
            </span>
        `;

        // User Info cell
        const userInfoCell = document.createElement('td');
        userInfoCell.setAttribute('data-label', 'User Info');
        userInfoCell.style.padding = 'var(--spacing-sm)';
        userInfoCell.style.color = 'var(--color-text-primary)';
        
        // Calculate age from date_of_birth
        let ageText = '';
        if (user.date_of_birth) {
            const birthDate = new Date(user.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            ageText = `${age} years`;
        }
        
        // Format user info
        const userInfo = [];
        if (user.gender) userInfo.push(user.gender);
        if (ageText) userInfo.push(ageText);
        if (user.country) userInfo.push(user.country);
        
        userInfoCell.innerHTML = `
            <div style="line-height: 1.4;">
                ${userInfo.length > 0 ? userInfo.join('<br>') : 'Not provided'}
            </div>
        `;

        // Subscriptions cell
        const subsCell = document.createElement('td');
        subsCell.setAttribute('data-label', 'Subscriptions');
        subsCell.style.padding = 'var(--spacing-sm)';
        subsCell.style.color = 'var(--color-text-primary)';
        subsCell.textContent = user.subscription_count;

        // Registered cell
        const registeredCell = document.createElement('td');
        registeredCell.setAttribute('data-label', 'Registered');
        registeredCell.style.padding = 'var(--spacing-sm)';
        registeredCell.style.color = 'var(--color-text-primary)';
        registeredCell.textContent = this.formatDate(user.created_at);

        // Last login cell
        const lastLoginCell = document.createElement('td');
        lastLoginCell.setAttribute('data-label', 'Last Login');
        lastLoginCell.style.padding = 'var(--spacing-sm)';
        
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
        actionsCell.style.padding = 'var(--spacing-sm)';
        actionsCell.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm);">
                <button class="user-management__action-btn user-management__action-btn--view" data-action="view" data-user-id="${user.id}">
                    View
                </button>
                <button class="user-management__action-btn user-management__action-btn--delete" data-action="delete" data-user-id="${user.id}">
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
        tr.appendChild(userInfoCell);
        
        // Language cell
        const languageCell = document.createElement('td');
        languageCell.setAttribute('data-label', 'Preferred Language');
        languageCell.style.padding = 'var(--spacing-sm)';
        languageCell.style.color = 'var(--color-text-primary)';
        languageCell.style.textAlign = 'center';
        
        if (user.language) {
            const languageMap = {
                'en': '🇬🇧',
                'es': '🇪🇸', 
                'fr': '🇫🇷',
                'de': '🇩🇪'
            };
            const flag = languageMap[user.language] || '🇬🇧';
            languageCell.innerHTML = `<span style="font-size: 1.2em;">${flag}</span>`;
        } else {
            languageCell.innerHTML = '<span style="color: var(--color-text-primary);">Not Set</span>';
        }
        
        tr.appendChild(languageCell);
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
        
        // Open user detail page in new tab
        window.open(`/admin/components/user-detail/?id=${userId}`, '_blank');
    }

    /**
     * Delete a user
     * @param {string} userId - User ID to delete
     * @param {string} username - Username for confirmation
     */
    async deleteUser(userId, username) {
        
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
            
            
            if (response.error) {
                window.logger?.error('❌ Edge Function error:', response.error);
                window.logger?.error('❌ Error data:', response.data);
                
                // Try to extract error message from response
                const errorMessage = response.data?.error || response.error.message || 'Unknown error';
                this.showError(`Failed to delete user: ${errorMessage}`);
                this.hideLoading();
                return;
            }
            
            this.showSuccess(`User "${username}" has been permanently deleted`);
            
            // Reload users list
            await this.loadUsers();
            
        } catch (error) {
            window.logger?.error('❌ Error deleting user:', error);
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
     * Export users to CSV
     */
    exportUsers() {
        
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
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
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
            window.logger?.error('❌ Failed to initialize translations:', error);
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
        window.logger?.log('🔄 User Management: Calling updateTableHeaders and updateFilterLabels');
        
        // Debug: Check what elements actually exist
        this.debugDOMElements();
        
        // Add a small delay to ensure translations are fully loaded
        setTimeout(() => {
            this.updateTableHeaders();
            this.updateFilterLabels();
        }, 50);
    }

    /**
     * Debug DOM elements to see what's actually available
     */
    debugDOMElements() {
        window.logger?.log('🔍 DEBUG: Checking DOM elements...');
        
        // Check all th elements
        const allThs = document.querySelectorAll('#users-table th');
        window.logger?.log(`🔍 Found ${allThs.length} total th elements:`);
        allThs.forEach((th, index) => {
            window.logger?.log(`🔍 TH ${index}: class="${th.className}", hasTranslatableContent=${th.classList.contains('translatable-content')}, hasDataKey=${th.hasAttribute('data-translation-key')}, key="${th.getAttribute('data-translation-key')}", text="${th.textContent.trim()}"`);
        });
        
        // Check all filter labels
        const allLabels = document.querySelectorAll('#user-management label');
        window.logger?.log(`🔍 Found ${allLabels.length} total label elements:`);
        allLabels.forEach((label, index) => {
            window.logger?.log(`🔍 Label ${index}: class="${label.className}", hasDataKey=${label.hasAttribute('data-translation-key')}, key="${label.getAttribute('data-translation-key')}", text="${label.textContent.trim()}"`);
        });
    }

    /**
     * Show translatable content
     */
    showTranslatableContent() {
        const elements = document.querySelectorAll('#user-management .translatable-content');
        elements.forEach(el => el.classList.add('loaded'));
    }

    /**
     * Update table headers when language changes
     */
    updateTableHeaders() {
        if (!window.userManagementTranslations || !window.userManagementTranslations.isInitialized) {
            window.logger?.log('❌ User Management: Translations not initialized, skipping table headers update');
            return;
        }

        window.logger?.log('🔄 User Management: Updating table headers');
        const headerMap = {
            'Username': 'Username',
            'Email': 'Email', 
            'Role': 'Role',
            'Status': 'Status',
            'User Info': 'User Info',
            'Preferred Language': 'Preferred Language',
            'Subscriptions': 'Subscriptions',
            'Registered': 'Registered',
            'Last Login': 'Last Login',
            'Actions': 'Actions'
        };

        // Update table headers
        const tableHeaders = document.querySelectorAll('#users-table th.translatable-content, #users-table th .translatable-content');
        window.logger?.log(`🔄 User Management: Found ${tableHeaders.length} table headers to update`);
        
        // Debug: Log all found headers
        tableHeaders.forEach((header, index) => {
            const translationKey = header.getAttribute('data-translation-key');
            window.logger?.log(`🔄 Header ${index}: tag="${header.tagName}", class="${header.className}", key="${translationKey}", text="${header.textContent.trim()}"`);
        });
        
        // Actually update the headers
        const currentLanguage = window.userManagementTranslations.getCurrentLanguage();
        window.logger?.log(`🔍 Debug: Current language is: ${currentLanguage}`);
        
        tableHeaders.forEach(header => {
            const translationKey = header.getAttribute('data-translation-key');
            if (translationKey && headerMap[translationKey]) {
                const newText = window.userManagementTranslations.getTranslation(translationKey, currentLanguage);
                window.logger?.log(`🔄 User Management: Updating "${translationKey}" from "${header.textContent}" to "${newText}"`);
                window.logger?.log(`🔍 Debug: window.userManagementTranslations exists: ${!!window.userManagementTranslations}`);
                window.logger?.log(`🔍 Debug: getTranslation function exists: ${!!window.userManagementTranslations?.getTranslation}`);
                header.textContent = newText;
            } else {
                window.logger?.log(`❌ User Management: Skipping header "${translationKey}" - not in headerMap or no translation`);
            }
        });
    }

    /**
     * Update filter labels when language changes
     */
    updateFilterLabels() {
        if (!window.userManagementTranslations || !window.userManagementTranslations.isInitialized) {
            window.logger?.log('❌ User Management: Translations not initialized, skipping filter labels update');
            return;
        }

        window.logger?.log('🔄 User Management: Updating filter labels');
        const filterMap = {
            'Status': 'Status',
            'Role': 'Role',
            'Subscriptions': 'Subscriptions',
            'Gender': 'Gender',
            'Country': 'Country',
            'Age': 'Age',
            'Preferred Language': 'Preferred Language',
            'Last Login Time': 'Last Login Time',
            'Last Login Location': 'Last Login Location',
            'Registration Date': 'Registration Date',
            'select_status': 'select_status',
            'select_role': 'select_role',
            'select_subscription': 'select_subscription',
            'select_gender': 'select_gender',
            'select_country': 'select_country',
            'select_age': 'select_age',
            'select_language': 'select_language',
            'select_location': 'select_location',
            'Clear Filters': 'Clear Filters'
        };

        // Update filter labels
        const filterLabels = document.querySelectorAll('#user-management .user-management__filter-label[data-translation-key]');
        window.logger?.log(`🔄 User Management: Found ${filterLabels.length} filter labels to update`);
        
        // Debug: Log all found filter labels
        filterLabels.forEach((label, index) => {
            const translationKey = label.getAttribute('data-translation-key');
            window.logger?.log(`🔄 Filter ${index}: tag="${label.tagName}", class="${label.className}", key="${translationKey}", text="${label.textContent.trim()}"`);
        });
        
        // Actually update the filter labels
        const currentLanguage = window.userManagementTranslations.getCurrentLanguage();
        window.logger?.log(`🔍 Debug: Current language for filters is: ${currentLanguage}`);
        
        filterLabels.forEach(label => {
            const translationKey = label.getAttribute('data-translation-key');
            if (translationKey && filterMap[translationKey]) {
                const newText = window.userManagementTranslations.getTranslation(translationKey, currentLanguage);
                window.logger?.log(`🔄 User Management: Updating filter "${translationKey}" from "${label.textContent}" to "${newText}"`);
                label.textContent = newText;
            }
        });

        // Update dropdown button text
        const dropdownButtons = document.querySelectorAll('#user-management .user-management__dropdown-btn span');
        window.logger?.log(`🔄 User Management: Found ${dropdownButtons.length} dropdown buttons to update`);
        
        dropdownButtons.forEach(button => {
            const translationKey = button.getAttribute('data-translation-key');
            if (translationKey && filterMap[translationKey]) {
                const newText = window.userManagementTranslations.getTranslation(translationKey);
                window.logger?.log(`🔄 User Management: Updating dropdown "${translationKey}" from "${button.textContent}" to "${newText}"`);
                button.textContent = newText;
            }
        });

        // Update clear button
        const clearButton = document.querySelector('#user-management .user-management__clear-btn');
        if (clearButton) {
            const newText = window.userManagementTranslations.getTranslation('Clear Filters');
            window.logger?.log(`🔄 User Management: Updating clear button from "${clearButton.textContent}" to "${newText}"`);
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
            window.logger?.error('User Management Error:', message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.adminLayout) {
            window.adminLayout.showSuccess(message);
        } else {
            window.logger?.log('User Management Success:', message);
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
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Search
            searchInput: document.getElementById('user-search-input'),
            
            // Dropdown buttons
            statusDropdownBtn: document.getElementById('status-dropdown-btn'),
            roleDropdownBtn: document.getElementById('role-dropdown-btn'),
            subscriptionDropdownBtn: document.getElementById('subscription-dropdown-btn'),
            genderDropdownBtn: document.getElementById('gender-dropdown-btn'),
            countryDropdownBtn: document.getElementById('country-dropdown-btn'),
            ageDropdownBtn: document.getElementById('age-dropdown-btn'),
            languageDropdownBtn: document.getElementById('language-dropdown-btn'),
            lastLoginLocationDropdownBtn: document.getElementById('last-login-location-dropdown-btn'),
            
            // Dropdown content
            statusDropdown: document.getElementById('status-dropdown'),
            roleDropdown: document.getElementById('role-dropdown'),
            subscriptionDropdown: document.getElementById('subscription-dropdown'),
            genderDropdown: document.getElementById('gender-dropdown'),
            countryDropdown: document.getElementById('country-dropdown'),
            ageDropdown: document.getElementById('age-dropdown'),
            languageDropdown: document.getElementById('language-dropdown'),
            lastLoginLocationDropdown: document.getElementById('last-login-location-dropdown'),
            
            // Options containers
            statusOptions: document.getElementById('status-options'),
            roleOptions: document.getElementById('role-options'),
            subscriptionOptions: document.getElementById('subscription-options'),
            genderOptions: document.getElementById('gender-options'),
            countryOptions: document.getElementById('country-options'),
            ageOptions: document.getElementById('age-options'),
            languageOptions: document.getElementById('language-options'),
            lastLoginLocationOptions: document.getElementById('last-login-location-options'),
            
            // Search inputs within dropdowns
            statusSearch: document.getElementById('status-search'),
            roleSearch: document.getElementById('role-search'),
            subscriptionSearch: document.getElementById('subscription-search'),
            genderSearch: document.getElementById('gender-search'),
            countrySearch: document.getElementById('country-search'),
            ageSearch: document.getElementById('age-search'),
            languageSearch: document.getElementById('language-search'),
            lastLoginLocationSearch: document.getElementById('last-login-location-search'),
            
            // Action buttons
            statusSelectAll: document.getElementById('status-select-all'),
            statusDeselectAll: document.getElementById('status-deselect-all'),
            roleSelectAll: document.getElementById('role-select-all'),
            roleDeselectAll: document.getElementById('role-deselect-all'),
            subscriptionSelectAll: document.getElementById('subscription-select-all'),
            subscriptionDeselectAll: document.getElementById('subscription-deselect-all'),
            genderSelectAll: document.getElementById('gender-select-all'),
            genderDeselectAll: document.getElementById('gender-deselect-all'),
            countrySelectAll: document.getElementById('country-select-all'),
            countryDeselectAll: document.getElementById('country-deselect-all'),
            ageSelectAll: document.getElementById('age-select-all'),
            ageDeselectAll: document.getElementById('age-deselect-all'),
            languageSelectAll: document.getElementById('language-select-all'),
            languageDeselectAll: document.getElementById('language-deselect-all'),
            lastLoginLocationSelectAll: document.getElementById('last-login-location-select-all'),
            lastLoginLocationDeselectAll: document.getElementById('last-login-location-deselect-all'),
            
            // Date filters
            registrationDateFilter: document.getElementById('registration-date-filter'),
            lastLoginFilter: document.getElementById('last-login-filter'),
            
            // Summary and clear
            clearBtn: document.getElementById('user-clear-filters-btn'),
            filterSummary: document.querySelector('.user-management__summary .user-management__count')
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

            if (preferences && preferences.preferences.userManagementFilters) {
                this.filters = {
                    ...this.filters,
                    ...preferences.preferences.userManagementFilters
                };
            }

            this.normalizeFilters();
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

            this.normalizeFilters();

            const currentPreferences = existingPrefs?.preferences || {};
            currentPreferences.userManagementFilters = this.filters;

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
     * Populate filter options dynamically from user data
     */
    populateFilterOptions() {
        if (!this.users.length) return;

        // Get unique values for each filter type
        const statuses = [...new Set(this.users.map(user => user.status))];
        const roles = [...new Set(this.users.map(user => user.role))];
        const subscriptions = [...new Set(this.users.map(user => user.subscription_count > 0 ? 'active' : 'none'))];
        const genders = [...new Set(this.users.map(user => user.gender).filter(Boolean))];
        const countries = [...new Set(this.users.map(user => user.country).filter(Boolean))];
        const languages = [...new Set(this.users.map(user => user.language).filter(Boolean))];
        
        // Calculate age ranges from users with date_of_birth
        const ageRanges = this.calculateAgeRanges();
        
        // Get unique last login locations from users with last_login data
        const lastLoginLocations = [...new Set(this.users.map(user => user.last_login_location).filter(Boolean))];
        
        window.logger?.log('🔍 Last login locations found:', lastLoginLocations);

        // Render options for each filter
        this.renderFilterOptions('status', statuses);
        this.renderFilterOptions('role', roles);
        this.renderFilterOptions('subscription', subscriptions);
        this.renderFilterOptions('gender', genders);
        this.renderFilterOptions('country', countries);
        this.renderFilterOptions('age', ageRanges);
        this.renderFilterOptions('language', languages);
        this.renderFilterOptions('lastLoginLocation', lastLoginLocations);
    }

    /**
     * Calculate age ranges from users with date_of_birth
     */
    calculateAgeRanges() {
        const ageRanges = new Set();
        
        this.users.forEach(user => {
            if (user.date_of_birth) {
                const birthDate = new Date(user.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                
                // Categorize into age ranges
                if (age < 18) {
                    ageRanges.add('Under 18');
                } else if (age >= 18 && age <= 25) {
                    ageRanges.add('18-25');
                } else if (age >= 26 && age <= 35) {
                    ageRanges.add('26-35');
                } else if (age >= 36 && age <= 50) {
                    ageRanges.add('36-50');
                } else if (age >= 51 && age <= 65) {
                    ageRanges.add('51-65');
                } else {
                    ageRanges.add('65+');
                }
            }
        });
        
        return Array.from(ageRanges).sort();
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
            optionElement.className = 'user-management__option';
            optionElement.innerHTML = `
                <input type="checkbox" value="${option}" class="user-management__checkbox">
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

        const totalCount = this.users.length;
        const filteredCount = this.filteredUsers.length;

        let summaryText;
        if (filteredCount === totalCount) {
            summaryText = `Showing all users`;
        } else {
            summaryText = `Showing ${filteredCount} of ${totalCount} users`;
        }

        this.elements.filterSummary.textContent = summaryText;
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {

        // Reset filter state
        this.filters = this.getDefaultFilters();

        // Clear search input
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        // Clear date filters
        if (this.elements.registrationDateFilter) {
            this.elements.registrationDateFilter.value = 'all';
        }
        if (this.elements.lastLoginFilter) {
            this.elements.lastLoginFilter.value = 'all';
        }

        // Clear all checkboxes
        ['status', 'role', 'subscription', 'gender', 'country', 'age', 'language', 'lastLoginLocation'].forEach(filterType => {
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
            'roleDropdownBtn', 
            'subscriptionDropdownBtn',
            'genderDropdownBtn',
            'countryDropdownBtn',
            'ageDropdownBtn',
            'languageDropdownBtn',
            'lastLoginLocationDropdownBtn'
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
            'roleSearch', 
            'subscriptionSearch',
            'genderSearch',
            'countrySearch',
            'ageSearch',
            'lastLoginLocationSearch'
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

        const options = optionsContainer.querySelectorAll('.user-management__option');
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
            'roleDropdown',
            'subscriptionDropdown',
            'genderDropdown',
            'countryDropdown',
            'ageDropdown',
            'lastLoginLocationDropdown'
        ];

        dropdowns.forEach(dropdownKey => {
            const btn = this.elements[dropdownKey.replace('Dropdown', 'DropdownBtn')];
            const dropdown = this.elements[dropdownKey];
            
            if (btn && dropdown) {
                this.closeDropdown(btn, dropdown);
            }
        });
    }
} // End of UserManagement class

// Export for use in other scripts
window.UserManagement = UserManagement;
} // End of if statement to prevent duplicate class declaration


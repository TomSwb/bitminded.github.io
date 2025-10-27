/**
 * Login Activity Filters Component
 * Provides filtering capabilities for login activity data
 */
class LoginActivityFilters {
    constructor() {
        this.allActivities = [];
        this.currentFilters = {
            dateRange: '7d',
            status: [],
            deviceTypes: [],
            browsers: [],
            locations: [],
            twoFactorAuth: []
        };
        this.availableOptions = {
            status: [],
            deviceTypes: [],
            browsers: [],
            locations: [],
            twoFactorAuth: ['true', 'false']
        };
        
        this.init();
    }

    async init() {
        console.log('🔍 Initializing Login Activity Filters...');
        
        try {
            // Load saved preferences
            await this.loadPreferences();
            
            // Initialize UI
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ Login Activity Filters initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Login Activity Filters:', error);
        }
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

            if (preferences && preferences.preferences.loginActivityFilters) {
                this.currentFilters = {
                    ...this.currentFilters,
                    ...preferences.preferences.loginActivityFilters
                };
                console.log('📋 Loaded saved filter preferences:', this.currentFilters);
            }
        } catch (error) {
            console.error('❌ Failed to load preferences:', error);
        }
    }

    /**
     * Save filter preferences to database
     */
    async savePreferences() {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            // Get existing preferences first
            const { data: existingPrefs } = await window.supabase
                .from('admin_preferences')
                .select('preferences')
                .eq('admin_id', user.id)
                .single();

            // Merge with existing preferences
            const existingPreferences = existingPrefs?.preferences || {};
            const updatedPreferences = {
                ...existingPreferences,
                loginActivityFilters: this.currentFilters
            };

            const { error } = await window.supabase
                .from('admin_preferences')
                .upsert({
                    admin_id: user.id,
                    preferences: updatedPreferences
                }, { onConflict: 'admin_id' });

            if (error) throw error;
            console.log('💾 Saved login activity filter preferences');
        } catch (error) {
            console.error('❌ Failed to save preferences:', error);
        }
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Set date range
        const dateRangeSelect = document.getElementById('date-range-select');
        if (dateRangeSelect) {
            dateRangeSelect.value = this.currentFilters.dateRange;
        }

        // Initialize dropdowns
        this.initializeDropdowns();
    }

    /**
     * Initialize dropdown functionality
     */
    initializeDropdowns() {
        const dropdowns = [
            'status', 'device', 'browser', 'location', 'twofa'
        ];

        dropdowns.forEach(type => {
            const btn = document.getElementById(`${type}-dropdown-btn`);
            const content = document.getElementById(`${type}-dropdown`);
            
            if (btn && content) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(type);
                });
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown(type) {
        const btn = document.getElementById(`${type}-dropdown-btn`);
        const content = document.getElementById(`${type}-dropdown`);
        
        if (!btn || !content) return;

        // Close other dropdowns
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        const isOpen = content.classList.contains('show');
        if (!isOpen) {
            content.classList.add('show');
            btn.classList.add('active');
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const dropdowns = ['status', 'device', 'browser', 'location', 'twofa'];
        
        dropdowns.forEach(type => {
            const btn = document.getElementById(`${type}-dropdown-btn`);
            const content = document.getElementById(`${type}-dropdown`);
            
            if (btn && content) {
                content.classList.remove('show');
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Set activities data and populate filter options
     */
    setActivities(activities) {
        this.allActivities = activities || [];
        this.populateOptions();
        this.renderOptions();
        this.applyFilters();
    }

    /**
     * Populate available filter options from activities
     */
    populateOptions() {
        // Reset options
        this.availableOptions = {
            status: [],
            deviceTypes: [],
            browsers: [],
            locations: [],
            twoFactorAuth: ['true', 'false']
        };

        // Extract unique values from activities
        this.allActivities.forEach(activity => {
            // Status
            const status = activity.success ? 'success' : 'failed';
            if (!this.availableOptions.status.includes(status)) {
                this.availableOptions.status.push(status);
            }

            // Device types
            if (activity.device_type && !this.availableOptions.deviceTypes.includes(activity.device_type)) {
                this.availableOptions.deviceTypes.push(activity.device_type);
            }

            // Browsers
            if (activity.browser && !this.availableOptions.browsers.includes(activity.browser)) {
                this.availableOptions.browsers.push(activity.browser);
            }

            // Locations
            const location = activity.location_country || 'Unknown';
            if (!this.availableOptions.locations.includes(location)) {
                this.availableOptions.locations.push(location);
            }
        });

        // Sort options
        Object.keys(this.availableOptions).forEach(key => {
            if (key !== 'twoFactorAuth') {
                this.availableOptions[key].sort();
            }
        });
    }

    /**
     * Render filter options in dropdowns
     */
    renderOptions() {
        // Status options
        this.renderDropdownOptions('status', this.availableOptions.status, 'status');
        
        // Device type options
        this.renderDropdownOptions('device', this.availableOptions.deviceTypes, 'deviceTypes');
        
        // Browser options
        this.renderDropdownOptions('browser', this.availableOptions.browsers, 'browsers');
        
        // Location options
        this.renderDropdownOptions('location', this.availableOptions.locations, 'locations');
        
        // 2FA options are static, just update checkboxes
        this.update2FACheckboxes();
    }

    /**
     * Render options for a specific dropdown
     */
    renderDropdownOptions(dropdownId, options, filterKey) {
        const optionsContainer = document.getElementById(`${dropdownId}-options`);
        if (!optionsContainer) return;

        optionsContainer.innerHTML = options.map(option => `
            <label class="login-activity-filters__option">
                <input type="checkbox" value="${option}" class="login-activity-filters__checkbox">
                <span>${this.formatOptionLabel(option)}</span>
            </label>
        `).join('');

        // Add event listeners to checkboxes
        const checkboxes = optionsContainer.querySelectorAll('.login-activity-filters__checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handleFilterToggle(filterKey, checkbox.value, checkbox.checked);
            });
        });

        // Restore checkbox states from saved preferences
        this.restoreCheckboxStates(dropdownId, filterKey);
    }

    /**
     * Restore checkbox states from saved preferences
     */
    restoreCheckboxStates(dropdownId, filterKey) {
        const checkboxes = document.querySelectorAll(`#${dropdownId}-options .login-activity-filters__checkbox`);
        const savedFilters = this.currentFilters[filterKey] || [];
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = savedFilters.includes(checkbox.value);
        });
    }

    /**
     * Update 2FA checkboxes
     */
    update2FACheckboxes() {
        const checkboxes = document.querySelectorAll('#twofa-options .login-activity-filters__checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handle2FAToggle(checkbox.value, checkbox.checked);
            });
            
            // Restore checkbox state from saved preferences
            const savedFilters = this.currentFilters.twoFactorAuth || [];
            checkbox.checked = savedFilters.includes(checkbox.value);
        });
    }

    /**
     * Format option labels for display
     */
    formatOptionLabel(option) {
        const labels = {
            'success': 'Success',
            'failed': 'Failed',
            'desktop': 'Desktop',
            'mobile': 'Mobile',
            'tablet': 'Tablet',
            'Unknown': 'Unknown Location'
        };
        return labels[option] || option;
    }

    /**
     * Handle filter toggle for multi-select filters
     */
    handleFilterToggle(filterKey, option, isChecked) {
        console.log('🔍 Filter toggle:', { filterKey, option, isChecked, currentFilters: this.currentFilters[filterKey] });
        
        if (isChecked) {
            // Add to filters if not already present
            if (!this.currentFilters[filterKey].includes(option)) {
                this.currentFilters[filterKey].push(option);
            }
        } else {
            // Remove from filters
            this.currentFilters[filterKey] = this.currentFilters[filterKey].filter(item => item !== option);
        }
        
        console.log('🔍 Updated filters:', this.currentFilters);
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Handle 2FA filter toggle
     */
    handle2FAToggle(value, isChecked) {
        if (isChecked) {
            if (!this.currentFilters.twoFactorAuth.includes(value)) {
                this.currentFilters.twoFactorAuth.push(value);
            }
        } else {
            this.currentFilters.twoFactorAuth = this.currentFilters.twoFactorAuth.filter(item => item !== value);
        }
        
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Apply current filters to activities
     */
    applyFilters() {
        console.log('🔍 Applying filters:', this.currentFilters);
        console.log('🔍 Total activities:', this.allActivities.length);
        
        let filteredActivities = [...this.allActivities];

        // Date range filter
        if (this.currentFilters.dateRange !== 'all') {
            const now = new Date();
            let cutoffDate;
            
            switch (this.currentFilters.dateRange) {
                case '24h':
                    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
            }
            
            if (cutoffDate) {
                filteredActivities = filteredActivities.filter(activity => 
                    new Date(activity.login_time) >= cutoffDate
                );
            }
        }

        // Status filter
        if (this.currentFilters.status.length > 0) {
            filteredActivities = filteredActivities.filter(activity => {
                const status = activity.success ? 'success' : 'failed';
                return this.currentFilters.status.includes(status);
            });
        }

        // Device type filter
        if (this.currentFilters.deviceTypes.length > 0) {
            filteredActivities = filteredActivities.filter(activity => 
                this.currentFilters.deviceTypes.includes(activity.device_type)
            );
        }

        // Browser filter
        if (this.currentFilters.browsers.length > 0) {
            filteredActivities = filteredActivities.filter(activity => 
                this.currentFilters.browsers.includes(activity.browser)
            );
        }

        // Location filter
        if (this.currentFilters.locations.length > 0) {
            filteredActivities = filteredActivities.filter(activity => {
                const location = activity.location_country || 'Unknown';
                return this.currentFilters.locations.includes(location);
            });
        }

        // 2FA filter
        if (this.currentFilters.twoFactorAuth.length > 0) {
            filteredActivities = filteredActivities.filter(activity => 
                this.currentFilters.twoFactorAuth.includes(activity.used_2fa.toString())
            );
        }

        console.log('🔍 Filtered activities:', filteredActivities.length);
        
        // Update filter summary
        this.updateFilterSummary(filteredActivities.length);
        
        // Dispatch filtered results
        window.dispatchEvent(new CustomEvent('loginActivityFiltered', {
            detail: { filteredActivities }
        }));
    }

    /**
     * Update filter summary text
     */
    updateFilterSummary(filteredCount) {
        const countElement = document.querySelector('.login-activity-filters__count');
        if (countElement) {
            const totalCount = this.allActivities.length;
            if (filteredCount === totalCount) {
                countElement.textContent = `Showing all ${totalCount} activities`;
            } else {
                countElement.textContent = `Showing ${filteredCount} of ${totalCount} activities`;
            }
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Date range change
        const dateRangeSelect = document.getElementById('date-range-select');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.currentFilters.dateRange = e.target.value;
                this.applyFilters();
                this.savePreferences();
            });
        }

        // Clear all filters
        const clearBtn = document.getElementById('login-clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Search functionality for each dropdown
        this.setupSearchFunctionality();
        
        // Select all / Deselect all buttons
        this.setupSelectAllButtons();
        
        // Language change listener
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Setup search functionality for dropdowns
     */
    setupSearchFunctionality() {
        const searchInputs = [
            { id: 'status-search', dropdown: 'status' },
            { id: 'device-search', dropdown: 'device' },
            { id: 'browser-search', dropdown: 'browser' },
            { id: 'location-search', dropdown: 'location' }
        ];

        searchInputs.forEach(({ id, dropdown }) => {
            const searchInput = document.getElementById(id);
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.handleSearch(e.target.value, dropdown);
                });
            }
        });
    }

    /**
     * Handle search within dropdown
     */
    handleSearch(searchTerm, dropdown) {
        const options = document.querySelectorAll(`#${dropdown}-options .login-activity-filters__option`);
        const term = searchTerm.toLowerCase();
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(term) ? 'flex' : 'none';
        });
    }

    /**
     * Setup select all / deselect all buttons
     */
    setupSelectAllButtons() {
        const dropdowns = ['status', 'device', 'browser', 'location'];
        
        dropdowns.forEach(dropdown => {
            const selectAllBtn = document.getElementById(`${dropdown}-select-all`);
            const deselectAllBtn = document.getElementById(`${dropdown}-deselect-all`);
            
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    this.handleSelectAll(dropdown);
                });
            }
            
            if (deselectAllBtn) {
                deselectAllBtn.addEventListener('click', () => {
                    this.handleDeselectAll(dropdown);
                });
            }
        });
    }

    /**
     * Handle select all for a dropdown
     */
    handleSelectAll(dropdown) {
        const filterKey = this.getFilterKey(dropdown);
        if (!filterKey) return;
        
        const options = this.availableOptions[filterKey];
        this.currentFilters[filterKey] = [...options];
        
        // Update checkboxes
        const checkboxes = document.querySelectorAll(`#${dropdown}-options .login-activity-filters__checkbox`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Handle deselect all for a dropdown
     */
    handleDeselectAll(dropdown) {
        const filterKey = this.getFilterKey(dropdown);
        if (!filterKey) return;
        
        this.currentFilters[filterKey] = [];
        
        // Update checkboxes
        const checkboxes = document.querySelectorAll(`#${dropdown}-options .login-activity-filters__checkbox`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.applyFilters();
        this.savePreferences();
    }

    /**
     * Get filter key for dropdown
     */
    getFilterKey(dropdown) {
        const mapping = {
            'status': 'status',
            'device': 'deviceTypes',
            'browser': 'browsers',
            'location': 'locations'
        };
        return mapping[dropdown];
    }

    /**
     * Refresh filter states after HTML re-render
     */
    refreshFilterStates() {
        console.log('🔄 Refreshing filter states...');
        
        // Restore date range
        const dateRangeSelect = document.getElementById('date-range-select');
        if (dateRangeSelect) {
            dateRangeSelect.value = this.currentFilters.dateRange;
        }
        
        // Restore all dropdown states
        this.restoreCheckboxStates('status', 'status');
        this.restoreCheckboxStates('device', 'deviceTypes');
        this.restoreCheckboxStates('browser', 'browsers');
        this.restoreCheckboxStates('location', 'locations');
        this.restoreCheckboxStates('twofa', 'twoFactorAuth');
        
        // Re-initialize dropdowns
        this.initializeDropdowns();
        
        // Apply current filters
        this.applyFilters();
        
        console.log('✅ Filter states refreshed');
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        console.log('🧹 Login clear filters clicked');
        this.currentFilters = {
            dateRange: '7d',
            status: [],
            deviceTypes: [],
            browsers: [],
            locations: [],
            twoFactorAuth: []
        };
        
        // Update UI
        const dateRangeSelect = document.getElementById('date-range-select');
        if (dateRangeSelect) {
            dateRangeSelect.value = '7d';
        }
        
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('.login-activity-filters__checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.applyFilters();
        this.savePreferences();
        console.log('✅ Login filters cleared');
    }

    /**
     * Update translations when language changes
     */
    updateTranslations() {
        if (!window.i18next || !window.i18next.isInitialized) return;

        // Update filter labels
        const filterLabels = document.querySelectorAll('#login-activity-filters .translatable-content');
        filterLabels.forEach(label => {
            const translationKey = label.getAttribute('data-translation-key');
            if (translationKey) {
                label.textContent = window.i18next.t(translationKey);
            }
        });

        // Update dropdown button text
        const dropdownButtons = document.querySelectorAll('#login-activity-filters .login-activity-filters__dropdown-btn span');
        dropdownButtons.forEach(button => {
            const translationKey = button.getAttribute('data-translation-key');
            if (translationKey) {
                button.textContent = window.i18next.t(translationKey);
            }
        });

        // Update clear button
        const clearButton = document.querySelector('#login-activity-filters .login-activity-filters__clear-btn');
        if (clearButton) {
            clearButton.textContent = window.i18next.t('Clear Filters');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loginActivityFilters = new LoginActivityFilters();
});

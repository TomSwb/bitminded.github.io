/**
 * Admin Activity Filters Component
 * Provides filtering capabilities for the admin activity table with persistent preferences
 */
class AdminActivityFilters {
    constructor() {
        this.currentFilters = {
            dateRange: 'all',
            actionTypes: [], // Empty array means "all selected"
            targetUsers: []  // Empty array means "all selected"
        };
        
        this.availableActions = [];
        this.availableUsers = [];
        this.allActivities = [];
        this.filteredActivities = [];
        
        this.elements = {};
        this.isInitialized = false;
        
        // Bind methods
        this.handleDateRangeChange = this.handleDateRangeChange.bind(this);
        this.handleActionTypeToggle = this.handleActionTypeToggle.bind(this);
        this.handleTargetUserToggle = this.handleTargetUserToggle.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
        this.handleMultiselectToggle = this.handleMultiselectToggle.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.handleDeselectAll = this.handleDeselectAll.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            window.logger?.log('🔍 Initializing Admin Activity Filters...');
            
            // Load saved preferences
            await this.loadPreferences();
            
            // Initialize UI
            this.initializeElements();
            this.setupEventListeners();
            
            // Note: populateOptions() will be called when setActivities() is called
            
            this.isInitialized = true;
            window.logger?.log('✅ Admin Activity Filters initialized');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Admin Activity Filters:', error);
        }
    }

    initializeElements() {
        // Main elements
        this.elements.container = document.getElementById('admin-activity-filters');
        this.elements.dateRangeSelect = document.getElementById('date-range-filter');
        this.elements.clearBtn = document.getElementById('admin-clear-filters-btn');
        this.elements.filterSummary = document.getElementById('filter-summary');
        
        // Action type multiselect
        this.elements.actionTypeTrigger = document.getElementById('action-type-trigger');
        this.elements.actionTypeDropdown = document.getElementById('action-type-dropdown');
        this.elements.actionTypeOptions = document.getElementById('action-type-options');
        this.elements.actionTypeSearch = document.getElementById('action-type-search');
        this.elements.actionTypeSelectAll = document.getElementById('action-type-select-all');
        this.elements.actionTypeDeselectAll = document.getElementById('action-type-deselect-all');
        
        // Target user multiselect
        this.elements.targetUserTrigger = document.getElementById('target-user-trigger');
        this.elements.targetUserDropdown = document.getElementById('target-user-dropdown');
        this.elements.targetUserOptions = document.getElementById('target-user-options');
        this.elements.targetUserSearch = document.getElementById('target-user-search');
        this.elements.targetUserSelectAll = document.getElementById('target-user-select-all');
        this.elements.targetUserDeselectAll = document.getElementById('target-user-deselect-all');
    }

    setupEventListeners() {
        // Date range filter
        if (this.elements.dateRangeSelect) {
            this.elements.dateRangeSelect.addEventListener('change', this.handleDateRangeChange);
        }
        
        // Clear filters button
        if (this.elements.clearBtn) {
            window.logger?.log('🔗 Setting up admin clear button event listener');
            this.elements.clearBtn.addEventListener('click', this.handleClearFilters);
        } else {
            window.logger?.error('❌ Admin clear button not found');
        }
        
        // Action type multiselect
        if (this.elements.actionTypeTrigger) {
            this.elements.actionTypeTrigger.addEventListener('click', this.handleMultiselectToggle);
        }
        if (this.elements.actionTypeSearch) {
            this.elements.actionTypeSearch.addEventListener('input', this.handleSearch);
        }
        if (this.elements.actionTypeSelectAll) {
            this.elements.actionTypeSelectAll.addEventListener('click', () => this.handleSelectAll('action'));
        }
        if (this.elements.actionTypeDeselectAll) {
            this.elements.actionTypeDeselectAll.addEventListener('click', () => this.handleDeselectAll('action'));
        }
        
        // Target user multiselect
        if (this.elements.targetUserTrigger) {
            this.elements.targetUserTrigger.addEventListener('click', this.handleMultiselectToggle);
        }
        if (this.elements.targetUserSearch) {
            this.elements.targetUserSearch.addEventListener('input', this.handleSearch);
        }
        if (this.elements.targetUserSelectAll) {
            this.elements.targetUserSelectAll.addEventListener('click', () => this.handleSelectAll('user'));
        }
        if (this.elements.targetUserDeselectAll) {
            this.elements.targetUserDeselectAll.addEventListener('click', () => this.handleDeselectAll('user'));
        }
        
        // Click outside to close dropdowns
        document.addEventListener('click', this.handleClickOutside);
        
        // Language change listener
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    async loadPreferences() {
        try {
            if (!window.supabase) return;
            
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;
            
            const { data: preferences, error } = await window.supabase
                .from('admin_preferences')
                .select('preferences')
                .eq('admin_id', user.id)
                .maybeSingle();
            
            if (error) {
                window.logger?.warn('⚠️ Failed to load admin preferences:', error);
                return;
            }
            
            if (preferences && preferences.preferences) {
                const savedFilters = preferences.preferences.adminActivityFilters || {};
                this.currentFilters = {
                    dateRange: savedFilters.dateRange || 'all',
                    actionTypes: savedFilters.actionTypes || [],
                    targetUsers: savedFilters.targetUsers || []
                };
                
                window.logger?.log('📋 Loaded saved admin activity filter preferences:', this.currentFilters);
            }
            
        } catch (error) {
            window.logger?.warn('⚠️ Error loading preferences:', error);
        }
    }

    async savePreferences() {
        try {
            if (!window.supabase) return;
            
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
                adminActivityFilters: this.currentFilters
            };
            
            const { error } = await window.supabase
                .from('admin_preferences')
                .upsert({
                    admin_id: user.id,
                    preferences: updatedPreferences,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'admin_id'
                });
            
            if (error) {
                window.logger?.warn('⚠️ Failed to save admin preferences:', error);
            } else {
                window.logger?.log('💾 Saved admin activity filter preferences');
            }
            
        } catch (error) {
            window.logger?.warn('⚠️ Error saving preferences:', error);
        }
    }

    async populateOptions() {
        try {
            // Get all unique action types from current activities
            const actionTypes = [...new Set(this.allActivities.map(activity => activity.action))];
            this.availableActions = actionTypes.sort();
            
            // Get all unique target users
            const userIds = [...new Set(this.allActivities
                .filter(activity => activity.user_id)
                .map(activity => activity.user_id))];
            
            if (userIds.length > 0) {
                const { data: users } = await window.supabase
                    .from('user_profiles')
                    .select('id, username')
                    .in('id', userIds);
                
                this.availableUsers = users || [];
            }
            
            // Add "Admin Actions" option for activities without target user
            if (this.allActivities.some(activity => !activity.user_id)) {
                this.availableUsers.push({ id: null, username: 'Admin Actions' });
            }
            
            this.renderOptions();
            
        } catch (error) {
            window.logger?.error('❌ Failed to populate filter options:', error);
        }
    }

    renderOptions() {
        // Render action type options
        if (this.elements.actionTypeOptions) {
            this.elements.actionTypeOptions.innerHTML = this.availableActions.map(action => {
                const isSelected = this.currentFilters.actionTypes.length === 0 || 
                                 this.currentFilters.actionTypes.includes(action);
                
                return `
                    <div class="admin-activity-filters__multiselect-option">
                        <input type="checkbox" id="action-${action}" value="${action}" ${isSelected ? 'checked' : ''}>
                        <label for="action-${action}">${this.formatActionName(action)}</label>
                    </div>
                `;
            }).join('');
            
            // Add event listeners to checkboxes
            this.elements.actionTypeOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', this.handleActionTypeToggle);
            });
        }
        
        // Render target user options
        if (this.elements.targetUserOptions) {
            this.elements.targetUserOptions.innerHTML = this.availableUsers.map(user => {
                const userId = user.id; // This will be null for Admin Actions
                const isSelected = this.currentFilters.targetUsers.length === 0 || 
                                 this.currentFilters.targetUsers.includes(userId);
                const displayName = user.username || 'Unknown User';
                
                return `
                    <div class="admin-activity-filters__multiselect-option">
                        <input type="checkbox" id="user-${userId || 'admin'}" value="${userId || 'admin'}" ${isSelected ? 'checked' : ''}>
                        <label for="user-${userId || 'admin'}">${displayName}</label>
                    </div>
                `;
            }).join('');
            
            // Add event listeners to checkboxes
            this.elements.targetUserOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', this.handleTargetUserToggle);
            });
        }
        
        // Update trigger text
        this.updateTriggerText();
    }

    formatActionName(action) {
        // Use translation system if available
        if (window.adminActivityFiltersTranslations) {
            return window.adminActivityFiltersTranslations.getActionName(action);
        }
        
        // Fallback to hardcoded names
        const actionNames = {
            'user_detail_viewed': 'View User Detail',
            'user_field_updated': 'Update User Field',
            'email_change_sent': 'Send Email Change',
            'password_reset_sent': 'Send Password Reset',
            'all_sessions_revoked': 'Revoke All Sessions',
            'session_revoked': 'Revoke Session',
            'admin_panel_access': 'Admin Panel Access',
            'section_navigation': 'Section Navigation',
            'user_list_viewed': 'View User List'
        };
        
        return actionNames[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    updateTriggerText() {
        // Update action type trigger text
        if (this.elements.actionTypeTrigger) {
            const selectedCount = this.currentFilters.actionTypes.length;
            const totalCount = this.availableActions.length;
            
            let text;
            if (selectedCount === 0 || selectedCount === totalCount) {
                text = window.adminActivityFiltersTranslations?.t('all_actions') || 'All Actions';
            } else {
                text = `${selectedCount} of ${totalCount} Actions`;
            }
            this.elements.actionTypeTrigger.querySelector('.admin-activity-filters__multiselect-text').textContent = text;
        }
        
        // Update target user trigger text
        if (this.elements.targetUserTrigger) {
            const selectedCount = this.currentFilters.targetUsers.length;
            const totalCount = this.availableUsers.length;
            
            let text;
            if (selectedCount === 0 || selectedCount === totalCount) {
                text = window.adminActivityFiltersTranslations?.t('all_users') || 'All Users';
            } else {
                text = `${selectedCount} of ${totalCount} Users`;
            }
            this.elements.targetUserTrigger.querySelector('.admin-activity-filters__multiselect-text').textContent = text;
        }
    }

    handleDateRangeChange(event) {
        this.currentFilters.dateRange = event.target.value;
        this.applyFilters();
        this.savePreferences();
    }

    handleActionTypeToggle(event) {
        const action = event.target.value;
        const isChecked = event.target.checked;
        
        window.logger?.log('🔍 Action type toggle:', { action, isChecked, currentFilters: this.currentFilters.actionTypes });
        
        // If currently showing all (empty array), initialize with all actions
        if (this.currentFilters.actionTypes.length === 0) {
            this.currentFilters.actionTypes = [...this.availableActions];
        }
        
        if (isChecked) {
            // Add this action to the inclusion list
            if (!this.currentFilters.actionTypes.includes(action)) {
                this.currentFilters.actionTypes.push(action);
            }
        } else {
            // Remove this action from the inclusion list
            this.currentFilters.actionTypes = this.currentFilters.actionTypes.filter(a => a !== action);
        }
        
        window.logger?.log('🔍 Updated filters:', this.currentFilters);
        
        this.updateTriggerText();
        this.applyFilters();
        this.savePreferences();
    }

    handleTargetUserToggle(event) {
        const userId = event.target.value === 'admin' ? null : event.target.value;
        const isChecked = event.target.checked;
        
        window.logger?.log('🔍 Target user toggle:', { userId, isChecked, currentFilters: this.currentFilters.targetUsers });
        
        // If currently showing all (empty array), initialize with all users
        if (this.currentFilters.targetUsers.length === 0) {
            this.currentFilters.targetUsers = this.availableUsers.map(user => user.id);
        }
        
        if (isChecked) {
            // Add this user to the inclusion list
            if (!this.currentFilters.targetUsers.includes(userId)) {
                this.currentFilters.targetUsers.push(userId);
            }
        } else {
            // Remove this user from the inclusion list
            this.currentFilters.targetUsers = this.currentFilters.targetUsers.filter(u => u !== userId);
        }
        
        window.logger?.log('🔍 Updated target user filters:', this.currentFilters);
        
        this.updateTriggerText();
        this.applyFilters();
        this.savePreferences();
    }

    handleClearFilters() {
        window.logger?.log('🧹 Admin clear filters clicked');
        this.currentFilters = {
            dateRange: 'all',
            actionTypes: [],
            targetUsers: []
        };
        
        // Update UI
        if (this.elements.dateRangeSelect) {
            this.elements.dateRangeSelect.value = 'all';
        }
        
        this.renderOptions();
        this.applyFilters();
        this.savePreferences();
        window.logger?.log('✅ Admin filters cleared');
    }

    handleMultiselectToggle(event) {
        const trigger = event.currentTarget;
        const dropdown = trigger.nextElementSibling;
        
        // Close other dropdowns
        document.querySelectorAll('.admin-activity-filters__multiselect-dropdown').forEach(dd => {
            if (dd !== dropdown) {
                dd.classList.remove('active');
                dd.previousElementSibling.classList.remove('active');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('active');
        trigger.classList.toggle('active');
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const options = event.target.closest('.admin-activity-filters__multiselect-dropdown')
            .querySelector('.admin-activity-filters__multiselect-options');
        
        options.querySelectorAll('.admin-activity-filters__multiselect-option').forEach(option => {
            const label = option.querySelector('label').textContent.toLowerCase();
            option.style.display = label.includes(searchTerm) ? 'flex' : 'none';
        });
    }

    handleSelectAll(type) {
        if (type === 'action') {
            this.currentFilters.actionTypes = [...this.availableActions];
        } else if (type === 'user') {
            this.currentFilters.targetUsers = this.availableUsers.map(user => user.id);
        }
        
        this.renderOptions();
        this.applyFilters();
        this.savePreferences();
    }

    handleDeselectAll(type) {
        if (type === 'action') {
            this.currentFilters.actionTypes = [];
        } else if (type === 'user') {
            this.currentFilters.targetUsers = [];
        }
        
        this.renderOptions();
        this.applyFilters();
        this.savePreferences();
    }

    handleClickOutside(event) {
        if (!event.target.closest('.admin-activity-filters__multiselect')) {
            document.querySelectorAll('.admin-activity-filters__multiselect-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.previousElementSibling.classList.remove('active');
            });
        }
    }

    async applyFilters() {
        try {
            window.logger?.log('🔍 Applying filters:', this.currentFilters);
            window.logger?.log('🔍 Total activities:', this.allActivities.length);
            
            let filtered = [...this.allActivities];
            
            // Apply date range filter
            if (this.currentFilters.dateRange !== 'all') {
                const now = new Date();
                let cutoffDate;
                
                switch (this.currentFilters.dateRange) {
                    case '7d':
                        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case '3m':
                        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    case '6m':
                        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                        break;
                    case '1y':
                        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        break;
                }
                
                if (cutoffDate) {
                    filtered = filtered.filter(activity => 
                        new Date(activity.created_at) >= cutoffDate
                    );
                }
            }
            
            // Apply action type filter
            if (this.currentFilters.actionTypes.length > 0) {
                window.logger?.log('🔍 Filtering by action types:', this.currentFilters.actionTypes);
                filtered = filtered.filter(activity => 
                    this.currentFilters.actionTypes.includes(activity.action)
                );
                window.logger?.log('🔍 After action type filter:', filtered.length);
            }
            
            // Apply target user filter
            if (this.currentFilters.targetUsers.length > 0) {
                window.logger?.log('🔍 Filtering by target users:', this.currentFilters.targetUsers);
                filtered = filtered.filter(activity => {
                    if (!activity.user_id) {
                        return this.currentFilters.targetUsers.includes(null);
                    }
                    return this.currentFilters.targetUsers.includes(activity.user_id);
                });
                window.logger?.log('🔍 After target user filter:', filtered.length);
            }
            
            this.filteredActivities = filtered;
            this.updateFilterSummary();
            
            // Dispatch event to notify parent component
            window.dispatchEvent(new CustomEvent('adminActivityFiltered', {
                detail: {
                    filteredActivities: this.filteredActivities,
                    totalCount: this.allActivities.length,
                    filteredCount: this.filteredActivities.length
                }
            }));
            
        } catch (error) {
            window.logger?.error('❌ Failed to apply filters:', error);
        }
    }

    updateFilterSummary() {
        window.logger?.log('📊 Updating filter summary...', { 
            filterSummaryElement: !!this.elements.filterSummary,
            totalCount: this.allActivities.length,
            filteredCount: this.filteredActivities.length
        });
        
        if (!this.elements.filterSummary) {
            window.logger?.error('❌ Filter summary element not found');
            return;
        }
        
        const totalCount = this.allActivities.length;
        const filteredCount = this.filteredActivities.length;
        
        let summaryText;
        if (window.adminActivityFiltersTranslations) {
            summaryText = window.adminActivityFiltersTranslations.getFilterSummaryText(filteredCount, totalCount);
        } else {
            // Fallback
            if (filteredCount === totalCount) {
                summaryText = `Showing all ${totalCount} activities`;
            } else {
                summaryText = `Showing ${filteredCount} of ${totalCount} activities`;
            }
        }
        
        this.elements.filterSummary.querySelector('.admin-activity-filters__count').textContent = summaryText;
        window.logger?.log('✅ Filter summary updated:', summaryText);
    }

    /**
     * Refresh filter states after HTML re-render
     */
    refreshFilterStates() {
        window.logger?.log('🔄 Refreshing admin filter states...');
        
        // Re-initialize elements after HTML re-render
        this.initializeElements();
        
        // Restore date range
        const dateRangeSelect = document.getElementById('date-range-filter');
        if (dateRangeSelect) {
            dateRangeSelect.value = this.currentFilters.dateRange;
        }
        
        // Re-render options to restore checkbox states
        this.renderOptions();
        
        // Re-setup event listeners
        this.setupEventListeners();
        
        // Apply current filters
        this.applyFilters();
        
        window.logger?.log('✅ Admin filter states refreshed');
    }

    // Public methods for parent component
    setActivities(activities) {
        this.allActivities = activities;
        this.populateOptions();
        this.applyFilters();
    }

    getFilteredActivities() {
        return this.filteredActivities;
    }

    /**
     * Update translations when language changes
     */
    updateTranslations() {
        if (!window.i18next || !window.i18next.isInitialized) return;

        // Update filter labels
        const filterLabels = document.querySelectorAll('#admin-activity-filters .translatable-content');
        filterLabels.forEach(label => {
            const translationKey = label.getAttribute('data-translation-key');
            if (translationKey) {
                label.textContent = window.i18next.t(translationKey);
            }
        });

        // Update dropdown button text
        const dropdownButtons = document.querySelectorAll('#admin-activity-filters .admin-activity-filters__dropdown-btn span');
        dropdownButtons.forEach(button => {
            const translationKey = button.getAttribute('data-translation-key');
            if (translationKey) {
                button.textContent = window.i18next.t(translationKey);
            }
        });

        // Update clear button
        const clearButton = document.querySelector('#admin-activity-filters .admin-activity-filters__clear-btn');
        if (clearButton) {
            clearButton.textContent = window.i18next.t('Clear Filters');
        }
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('click', this.handleClickOutside);
        
        // Clear references
        this.elements = {};
        this.isInitialized = false;
    }
}

// Export for use in other components
window.AdminActivityFilters = AdminActivityFilters;

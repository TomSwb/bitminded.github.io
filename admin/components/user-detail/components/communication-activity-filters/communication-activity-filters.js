/**
 * Communication Activity Filters Component
 * Handles filtering for user communication activity table
 */

class CommunicationActivityFilters {
    constructor() {
        this.filters = {
            dateRange: 'all',
            type: [], // email, notification
            sender: [], // admin usernames
            subject: [] // email subjects
        };
        this.elements = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the communication activity filters
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.cacheElements();
            this.setupEventListeners();
            this.initializeDropdowns();
            
            this.isInitialized = true;
            console.log('✅ Communication Activity Filters initialized');
        } catch (error) {
            console.error('❌ Failed to initialize communication activity filters:', error);
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Date range
            dateRangeSelect: document.getElementById('communication-date-range-select'),
            
            // Dropdown buttons
            typeDropdownBtn: document.getElementById('type-dropdown-btn'),
            senderDropdownBtn: document.getElementById('sender-dropdown-btn'),
            subjectDropdownBtn: document.getElementById('subject-dropdown-btn'),
            
            // Dropdown content
            typeDropdown: document.getElementById('type-dropdown'),
            senderDropdown: document.getElementById('sender-dropdown'),
            subjectDropdown: document.getElementById('subject-dropdown'),
            
            // Options containers
            typeOptions: document.getElementById('type-options'),
            senderOptions: document.getElementById('sender-options'),
            subjectOptions: document.getElementById('subject-options'),
            
            // Search inputs
            typeSearch: document.getElementById('type-search'),
            senderSearch: document.getElementById('sender-search'),
            subjectSearch: document.getElementById('subject-search'),
            
            // Action buttons
            typeSelectAll: document.getElementById('type-select-all'),
            typeDeselectAll: document.getElementById('type-deselect-all'),
            senderSelectAll: document.getElementById('sender-select-all'),
            senderDeselectAll: document.getElementById('sender-deselect-all'),
            subjectSelectAll: document.getElementById('subject-select-all'),
            subjectDeselectAll: document.getElementById('subject-deselect-all'),
            
            // Summary and clear
            filterSummary: document.querySelector('.communication-activity-filters__count'),
            clearBtn: document.getElementById('communication-clear-filters-btn')
        };

    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Date range filter
        if (this.elements.dateRangeSelect) {
            this.elements.dateRangeSelect.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.applyFilters();
            });
        }

        // Select All / Deselect All buttons
        const filterTypes = ['type', 'sender', 'subject'];
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

        // Clear filters button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Language change listener
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    /**
     * Initialize dropdown functionality
     */
    initializeDropdowns() {
        const dropdownButtons = [
            'typeDropdownBtn',
            'senderDropdownBtn',
            'subjectDropdownBtn'
        ];

        dropdownButtons.forEach(btnKey => {
            const btn = this.elements[btnKey];
            const dropdown = this.elements[btnKey.replace('Btn', '')];

            if (btn && dropdown) {
                // Toggle dropdown
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(btn, dropdown);
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                        this.closeDropdown(btn, dropdown);
                    }
                });
            }
        });
    }

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown(btn, dropdown) {
        const isOpen = dropdown.classList.contains('show');
        
        // Close all other dropdowns
        document.querySelectorAll('.communication-activity-filters__dropdown-content.show').forEach(d => {
            d.classList.remove('show');
        });
        document.querySelectorAll('.communication-activity-filters__dropdown-btn.active').forEach(b => {
            b.classList.remove('active');
        });

        if (!isOpen) {
            dropdown.classList.add('show');
            btn.classList.add('active');
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown(btn, dropdown) {
        dropdown.classList.remove('show');
        btn.classList.remove('active');
    }

    /**
     * Populate filter options
     */
    populateFilterOptions(communications) {
        if (!communications || !communications.length) return;

        // Get unique values for each filter type
        const types = [...new Set(communications.map(comm => comm.type))];
        const senders = [...new Set(communications.map(comm => comm.sender_email).filter(Boolean))];
        const subjects = [...new Set(communications.map(comm => comm.subject).filter(Boolean))];

        // Render options for each filter
        this.renderFilterOptions('type', types);
        this.renderFilterOptions('sender', senders);
        this.renderFilterOptions('subject', subjects);
    }

    /**
     * Render filter options
     */
    renderFilterOptions(filterType, options) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const label = document.createElement('label');
            label.className = 'communication-activity-filters__option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;
            checkbox.className = 'communication-activity-filters__checkbox';
            
            const span = document.createElement('span');
            span.textContent = this.formatOptionText(filterType, option);
            
            label.appendChild(checkbox);
            label.appendChild(span);
            optionsContainer.appendChild(label);

            // Add change listener
            checkbox.addEventListener('change', () => {
                this.updateFilterSelection(filterType);
                this.applyFilters();
            });
        });
    }

    /**
     * Format option text for display
     */
    formatOptionText(filterType, option) {
        switch (filterType) {
            case 'type':
                return option === 'email' ? '📧 Email' : '🔔 Notification';
            case 'sender':
                return option;
            case 'subject':
                return option.length > 50 ? option.substring(0, 50) + '...' : option;
            default:
                return option;
        }
    }

    /**
     * Update filter selection
     */
    updateFilterSelection(filterType) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        this.filters[filterType] = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    /**
     * Handle select all for a filter type
     */
    handleSelectAll(filterType) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        
        this.updateFilterSelection(filterType);
        this.applyFilters();
    }

    /**
     * Handle deselect all for a filter type
     */
    handleDeselectAll(filterType) {
        const optionsContainer = this.elements[`${filterType}Options`];
        if (!optionsContainer) return;

        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        this.updateFilterSelection(filterType);
        this.applyFilters();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        // Reset filter values
        this.filters = {
            dateRange: 'all',
            type: [],
            sender: [],
            subject: []
        };

        // Reset UI
        if (this.elements.dateRangeSelect) {
            this.elements.dateRangeSelect.value = 'all';
        }

        // Uncheck all checkboxes
        const filterTypes = ['type', 'sender', 'subject'];
        filterTypes.forEach(filterType => {
            const optionsContainer = this.elements[`${filterType}Options`];
            if (optionsContainer) {
                const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = false);
            }
        });

        this.applyFilters();
    }

    /**
     * Apply filters and dispatch event
     */
    applyFilters() {
        // Get all communications from the parent component
        const allCommunications = window.userDetailPage?.allCommunicationActivities || [];
        
        // Apply filters
        let filteredCommunications = allCommunications.filter(communication => {
            // Date range filter
            if (this.filters.dateRange !== 'all') {
                const communicationDate = new Date(communication.created_at);
                const now = new Date();
                let cutoffDate;
                
                switch (this.filters.dateRange) {
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
                    default:
                        cutoffDate = null;
                }
                
                if (cutoffDate && communicationDate < cutoffDate) {
                    return false;
                }
            }
            
            // Type filter
            if (this.filters.type.length > 0) {
                if (!this.filters.type.includes(communication.type)) {
                    return false;
                }
            }
            
            // Sender filter
            if (this.filters.sender.length > 0) {
                const senderEmail = communication.sender_email || 'System';
                if (!this.filters.sender.includes(senderEmail)) {
                    return false;
                }
            }
            
            // Subject filter
            if (this.filters.subject.length > 0) {
                const subject = communication.subject || (communication.type === 'notification' ? 'In-app Notification' : 'No Subject');
                if (!this.filters.subject.includes(subject)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Update filter summary
        this.updateFilterSummary(filteredCommunications.length, allCommunications.length);
        
        // Dispatch custom event with filtered data
        const event = new CustomEvent('communicationFiltersChanged', {
            detail: { 
                filters: this.filters,
                filteredActivities: filteredCommunications
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Update filter summary
     */
    updateFilterSummary(filteredCount, totalCount) {
        if (!this.elements.filterSummary) return;

        if (filteredCount === totalCount) {
            this.elements.filterSummary.textContent = 'Showing all communications';
        } else {
            this.elements.filterSummary.textContent = `Showing ${filteredCount} of ${totalCount} communications`;
        }
    }

    /**
     * Update translations when language changes
     */
    updateTranslations() {
        if (!window.i18next || !window.i18next.isInitialized) return;

        // Update filter labels
        const filterLabels = document.querySelectorAll('#communication-activity-filters .translatable-content');
        filterLabels.forEach(label => {
            const translationKey = label.getAttribute('data-translation-key');
            if (translationKey) {
                label.textContent = window.i18next.t(translationKey);
            }
        });

        // Update dropdown button text
        const dropdownButtons = document.querySelectorAll('#communication-activity-filters .communication-activity-filters__dropdown-btn span');
        dropdownButtons.forEach(button => {
            const translationKey = button.getAttribute('data-translation-key');
            if (translationKey) {
                button.textContent = window.i18next.t(translationKey);
            }
        });

        // Update clear button
        const clearButton = document.querySelector('#communication-activity-filters .communication-activity-filters__clear-btn');
        if (clearButton) {
            clearButton.textContent = window.i18next.t('Clear Filters');
        }
    }
}

// Export the class for use by the user detail page
window.CommunicationActivityFilters = CommunicationActivityFilters;

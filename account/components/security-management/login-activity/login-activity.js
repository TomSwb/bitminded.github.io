/**
 * Login Activity Component
 * Displays recent login history and activity for security monitoring
 */
if (typeof window.LoginActivity === 'undefined') {
class LoginActivity {
    constructor() {
        this.isInitialized = false;
        this.activities = [];
        
        // UI elements
        this.listContainer = null;
        this.loadingContainer = null;
        this.emptyContainer = null;
        this.errorContainer = null;
        this.errorText = null;
    }

    /**
     * Initialize the login activity component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Login Activity: Already initialized');
                return;
            }

            // Initializing

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponent());
            } else {
                this.setupComponent();
            }

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;
            // Initialized
            
            // Final translation update
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

        } catch (error) {
            window.logger?.error('❌ Login Activity: Failed to initialize:', error);
            this.showError('Failed to initialize login activity component');
        }
    }

    /**
     * Setup component elements
     */
    async setupComponent() {
        // Get UI elements
        this.listContainer = document.getElementById('activity-list');
        this.loadingContainer = document.getElementById('activity-loading');
        this.emptyContainer = document.getElementById('activity-empty');
        this.errorContainer = document.getElementById('activity-error');
        this.errorText = document.getElementById('activity-error-text');

        if (!this.listContainer) {
            window.logger?.error('❌ Login Activity: Required elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Load activity
        await this.loadActivity();
        
        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations
        this.updateTranslations();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
            this.renderActivity(); // Re-render to translate dynamic content
        });
    }

    /**
     * Load login activity from database
     */
    async loadActivity() {
        try {
            // Loading
            this.showLoading(true);
            this.hideError();

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                window.logger?.error('❌ Login Activity: Failed to get user:', userError);
                this.showEmpty();
                this.showLoading(false);
                return;
            }

            // Query login activity
            const { data: activityData, error } = await supabase
                .from('user_login_activity')
                .select('*')
                .eq('user_id', user.id)
                .order('login_time', { ascending: false })
                .limit(20);
            
            if (error) {
                window.logger?.error('❌ Login Activity: Failed to load activity:', error);
                this.showError('Failed to load login activity');
                this.showLoading(false);
                return;
            }

            this.activities = activityData || [];
            // Records loaded
            
            this.renderActivity();
            this.showLoading(false);

        } catch (error) {
            window.logger?.error('❌ Login Activity: Failed to load activity:', error);
            this.showError('Failed to load login activity');
            this.showLoading(false);
        }
    }

    /**
     * Render activity items
     */
    renderActivity() {
        if (!this.listContainer) return;

        if (this.activities.length === 0) {
            this.showEmpty();
            return;
        }

        this.hideEmpty();
        this.listContainer.innerHTML = '';

        this.activities.forEach(activity => {
            const item = this.createActivityItem(activity);
            this.listContainer.appendChild(item);
        });
    }

    /**
     * Create activity item element
     */
    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = `login-activity__item ${activity.success ? 'success' : 'failed'}`;

        const formattedTime = this.formatDateTime(new Date(activity.login_time));
        const deviceInfo = this.getDeviceInfo(activity);
        const locationInfo = this.getLocationInfo(activity);

        const translations = this.getTranslations();
        const successText = activity.success 
            ? (translations['Successful'] || 'Successful')
            : (translations['Failed'] || 'Failed');
        
        const failureReason = activity.failure_reason 
            ? ` (${this.getFailureReasonText(activity.failure_reason)})`
            : '';

        item.innerHTML = `
            <div class="login-activity__item-header">
                <div class="login-activity__item-time">
                    <span class="login-activity__item-icon">📅</span>
                    <span>${formattedTime}</span>
                </div>
                <div class="login-activity__item-status ${activity.success ? 'success' : 'failed'}">
                    <span>${activity.success ? '✅' : '❌'}</span>
                    <span>${successText}${failureReason}</span>
                </div>
            </div>
            <div class="login-activity__item-details">
                ${locationInfo ? `
                    <div class="login-activity__item-detail">
                        <span class="login-activity__item-icon">🌍</span>
                        <span class="login-activity__item-text">${locationInfo}</span>
                    </div>
                ` : ''}
                <div class="login-activity__item-detail">
                    <span class="login-activity__item-icon">${this.getDeviceIcon(activity.device_type)}</span>
                    <span class="login-activity__item-text">
                        ${deviceInfo}
                        ${activity.ip_address ? ` · IP: ${activity.ip_address}` : ''}
                        ${activity.used_2fa ? `<span class="login-activity__2fa-badge">🔐 2FA</span>` : ''}
                    </span>
                </div>
            </div>
        `;

        return item;
    }

    /**
     * Get device icon based on type
     */
    getDeviceIcon(deviceType) {
        const icons = {
            'mobile': '📱',
            'tablet': '📱',
            'desktop': '💻'
        };
        return icons[deviceType] || '💻';
    }

    /**
     * Get device info string
     */
    getDeviceInfo(activity) {
        const parts = [];
        
        if (activity.browser) {
            parts.push(activity.browser);
        }
        
        if (activity.os) {
            parts.push(activity.os);
        }
        
        return parts.length > 0 ? parts.join(' on ') : 'Unknown device';
    }

    /**
     * Get location info string
     */
    getLocationInfo(activity) {
        const parts = [];
        
        if (activity.location_city) {
            parts.push(activity.location_city);
        }
        
        if (activity.location_country) {
            parts.push(activity.location_country);
        }
        
        return parts.length > 0 ? parts.join(', ') : null;
    }

    /**
     * Get human-readable failure reason
     */
    getFailureReasonText(reason) {
        const translations = this.getTranslations();
        const reasonMap = {
            'invalid_credentials': translations['Invalid credentials'] || 'Invalid credentials',
            'invalid_2fa': translations['Invalid 2FA code'] || 'Invalid 2FA code',
            'account_locked': translations['Account locked'] || 'Account locked',
            'session_expired': translations['Session expired'] || 'Session expired'
        };
        return reasonMap[reason] || reason;
    }

    /**
     * Format date and time
     */
    formatDateTime(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = show ? 'flex' : 'none';
        }
        if (show) {
            this.hideEmpty();
            if (this.listContainer) {
                this.listContainer.style.display = 'none';
            }
        } else {
            if (this.listContainer) {
                this.listContainer.style.display = 'flex';
            }
        }
    }

    /**
     * Show empty state
     */
    showEmpty() {
        if (this.emptyContainer) {
            this.emptyContainer.style.display = 'block';
        }
        if (this.listContainer) {
            this.listContainer.style.display = 'none';
        }
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        if (this.emptyContainer) {
            this.emptyContainer.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.errorContainer && this.errorText) {
            this.errorText.textContent = message;
            this.errorContainer.style.display = 'flex';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Get current translations
     */
    getTranslations() {
        const currentLanguage = localStorage.getItem('language') || 'en';
        if (window.loginActivityTranslations && window.loginActivityTranslations.translations) {
            return window.loginActivityTranslations.translations[currentLanguage] || window.loginActivityTranslations.translations['en'] || {};
        }
        return {};
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        if (!window.loginActivityTranslations) {
            window.logger?.warn('⚠️ Login Activity: Translations not loaded yet');
            return;
        }

        try {
            await window.loginActivityTranslations.init();
        } catch (error) {
            window.logger?.error('❌ Login Activity: Failed to initialize translations:', error);
        }
    }

    /**
     * Update all translations
     */
    updateTranslations() {
        if (window.loginActivityTranslations && window.loginActivityTranslations.isReady()) {
            window.loginActivityTranslations.updateTranslations();
        }
    }

    /**
     * Make translatable content visible
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('.login-activity .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
            element.style.opacity = '1';
        });
    }
}

// Register globally
window.LoginActivity = LoginActivity;
}


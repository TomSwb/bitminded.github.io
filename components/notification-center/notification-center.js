/**
 * Notification Center Component
 * Displays in-app notifications with real-time updates
 */
class NotificationCenter {
    constructor() {
        this.isInitialized = false;
        this.isOpen = false;
        this.notifications = [];
        this.unreadCount = 0;
        this.pollingInterval = null;
        this.user = null;
        
        // UI elements
        this.bellButton = null;
        this.badge = null;
        this.dropdown = null;
        this.list = null;
        this.loading = null;
        this.empty = null;
        this.markAllReadBtn = null;
        this.deleteAllBtn = null;
    }

    /**
     * Initialize the notification center
     */
    async init() {
        try {
            if (this.isInitialized) {
                return;
            }


            // Wait for Supabase
            await this.waitForSupabase();

            // Get current user
            await this.loadUser();

            // Wait for DOM
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Setup component
            this.setupComponent();

            // Initialize translations
            await this.initializeTranslations();

            this.isInitialized = true;

            // Defer loading notifications to avoid blocking page load and triggering token refreshes
            // This prevents the DB query from happening during initial auth setup
            setTimeout(async () => {
                await this.loadNotifications();
                // Start polling after initial load
                this.startPolling();
            }, 200);

        } catch (error) {
            console.error('❌ Notification Center: Failed to initialize:', error);
        }
    }

    /**
     * Wait for Supabase to be available
     */
    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (typeof supabase !== 'undefined' && supabase) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    /**
     * Load current user
     */
    async loadUser() {
        try {
            // First check if there's an active session (doesn't trigger auth errors)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                // No session - hiding notification center silently
                this.hideComponent();
                return;
            }
            
            // Session exists, get user details
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;
            
            if (!user) {
                console.log('🔔 No user logged in, hiding notification center');
                this.hideComponent();
                return;
            }
            
            this.user = user;
            this.showComponent();
            
        } catch (error) {
            console.error('❌ Notification Center: Failed to load user:', error);
            this.hideComponent();
        }
    }

    /**
     * Setup component elements
     */
    setupComponent() {
        this.bellButton = document.getElementById('notification-bell');
        this.badge = document.getElementById('notification-badge');
        this.dropdown = document.getElementById('notification-dropdown');
        this.list = document.getElementById('notification-list');
        this.loading = document.getElementById('notification-loading');
        this.empty = document.getElementById('notification-empty');
        this.markAllReadBtn = document.getElementById('mark-all-read-btn');
        this.deleteAllBtn = document.getElementById('delete-all-btn');

        if (!this.bellButton) {
            console.error('❌ Notification Center: Bell button not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle dropdown
        if (this.bellButton) {
            this.bellButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Mark all as read
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // Delete all
        if (this.deleteAllBtn) {
            this.deleteAllBtn.addEventListener('click', () => {
                this.deleteAll();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.dropdown && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
            this.render();
        });
    }

    /**
     * Load notifications from database
     */
    async loadNotifications() {
        if (!this.user) return;

        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            this.notifications = data || [];
            this.updateUnreadCount();
            this.render();

            console.log(`✅ Loaded ${this.notifications.length} notifications`);

        } catch (error) {
            console.error('❌ Failed to load notifications:', error);
        }
    }

    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
    }

    /**
     * Update badge display
     */
    updateBadge() {
        if (!this.badge) return;

        if (this.unreadCount > 0) {
            this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
            this.badge.style.display = 'block';
        } else {
            this.badge.style.display = 'none';
        }
    }

    /**
     * Render notifications list
     */
    render() {
        if (!this.list) return;

        // Hide loading
        if (this.loading) {
            this.loading.style.display = 'none';
        }

        // Remove old notification items (keep loading and empty states)
        const oldItems = this.list.querySelectorAll('.notification-item');
        oldItems.forEach(item => item.remove());

        // Show empty state if no notifications
        if (this.notifications.length === 0) {
            if (this.empty) {
                this.empty.style.display = 'block';
            }
            return;
        }

        // Hide empty state
        if (this.empty) {
            this.empty.style.display = 'none';
        }

        // Render notifications
        this.notifications.forEach(notification => {
            const item = this.createNotificationItem(notification);
            this.list.appendChild(item);
        });

        // Update translations for new items
        this.updateTranslations();
    }

    /**
     * Create notification item element
     */
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = `notification-item notification-item--${notification.type}`;
        if (!notification.read) {
            item.className += ' notification-item--unread';
        }
        item.dataset.notificationId = notification.id;

        const timeAgo = this.getTimeAgo(notification.created_at);
        
        // Build context details from notification data
        let contextDetails = '';
        if (notification.data) {
            const data = notification.data;
            const details = [];
            
            if (data.device) {
                details.push(`📱 ${data.device}`);
            }
            if (data.browser) {
                details.push(`🌐 ${data.browser}`);
            }
            if (data.oldUsername && data.newUsername) {
                details.push(`${data.oldUsername} → ${data.newUsername}`);
            }
            
            if (details.length > 0) {
                contextDetails = `<div class="notification-item__details">${details.join(' • ')}</div>`;
            }
        }

        item.innerHTML = `
            <div class="notification-item__main">
                <div class="notification-item__icon">${notification.icon || '📬'}</div>
                <div class="notification-item__content">
                    <div class="notification-item__title">
                        ${!notification.read ? '<span class="notification-item__unread-dot"></span>' : ''}
                        ${notification.title}
                    </div>
                    <p class="notification-item__message">${notification.message}</p>
                    ${contextDetails}
                    <div class="notification-item__footer">
                        <span class="notification-item__time">${timeAgo}</span>
                    </div>
                </div>
            </div>
            <button class="notification-item__delete" 
                    data-notification-id="${notification.id}"
                    type="button">
                <span class="translatable-content" data-translation-key="Delete">Delete</span>
            </button>
        `;

        // Click handler for notification item
        const contentArea = item.querySelector('.notification-item__content, .notification-item__icon');
        if (contentArea) {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking delete button
                if (!e.target.closest('.notification-item__delete')) {
                    this.handleNotificationClick(notification);
                }
            });
        }

        // Delete button handler
        const deleteBtn = item.querySelector('.notification-item__delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id);
            });
        }

        return item;
    }

    /**
     * Handle notification click
     */
    async handleNotificationClick(notification) {
        // Mark as read if unread
        if (!notification.read) {
            await this.markAsRead(notification.id);
        }

        // Don't navigate - just mark as read
        // Users can use "View preferences" link if needed
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .update({ 
                    read: true, 
                    read_at: new Date().toISOString() 
                })
                .eq('id', notificationId);

            if (error) throw error;

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                notification.read_at = new Date().toISOString();
            }

            this.updateUnreadCount();
            this.render();

        } catch (error) {
            console.error('❌ Failed to mark notification as read:', error);
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const { error } = await supabase.rpc('mark_all_notifications_read');

            if (error) throw error;

            // Update local state
            this.notifications.forEach(n => {
                n.read = true;
                n.read_at = new Date().toISOString();
            });

            this.updateUnreadCount();
            this.render();

            console.log('✅ All notifications marked as read');

        } catch (error) {
            console.error('❌ Failed to mark all as read:', error);
        }
    }

    /**
     * Delete all notifications
     */
    async deleteAll() {
        if (!this.user) return;

        // Confirm before deleting
        const confirmed = confirm('Are you sure you want to delete all notifications? This cannot be undone.');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('user_notifications')
                .delete()
                .eq('user_id', this.user.id);

            if (error) throw error;

            // Clear local state
            this.notifications = [];
            this.updateUnreadCount();
            this.render();

            console.log('✅ All notifications deleted');

        } catch (error) {
            console.error('❌ Failed to delete all notifications:', error);
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            // Remove from local state
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateUnreadCount();
            this.render();

            console.log('✅ Notification deleted');

        } catch (error) {
            console.error('❌ Failed to delete notification:', error);
        }
    }

    /**
     * Toggle dropdown
     */
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open dropdown
     */
    openDropdown() {
        if (!this.dropdown) return;

        this.isOpen = true;
        this.dropdown.setAttribute('aria-hidden', 'false');
        this.bellButton?.setAttribute('aria-expanded', 'true');
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        if (!this.dropdown) return;

        this.isOpen = false;
        this.dropdown.setAttribute('aria-hidden', 'true');
        this.bellButton?.setAttribute('aria-expanded', 'false');
    }

    /**
     * Start polling for new notifications
     */
    startPolling() {
        // Poll every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.loadNotifications();
        }, 30000);

        // Notification polling started silently
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('📡 Notification polling stopped');
        }
    }

    /**
     * Get time ago string
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const seconds = Math.floor((now - then) / 1000);

        if (seconds < 60) {
            return this.getTranslation('Just now');
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} ${this.getTranslation('minutes ago')}`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} ${this.getTranslation('hours ago')}`;
        }

        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days} ${this.getTranslation('days ago')}`;
        }

        const weeks = Math.floor(days / 7);
        return `${weeks} ${this.getTranslation('weeks ago')}`;
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        return new Promise((resolve) => {
            const checkTranslations = () => {
                if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                    this.updateTranslations();
                    resolve();
                } else {
                    setTimeout(checkTranslations, 100);
                }
            };
            checkTranslations();
        });
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            return;
        }

        const translatableElements = document.querySelectorAll('.notification-center .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey;
            if (key && i18next.exists(key)) {
                element.textContent = i18next.t(key);
            }
            element.classList.add('loaded');
        });
    }

    /**
     * Get translation
     */
    getTranslation(key) {
        if (typeof i18next !== 'undefined' && i18next.isInitialized && i18next.exists(key)) {
            return i18next.t(key);
        }
        return key;
    }

    /**
     * Manually refresh notifications
     */
    async refresh() {
        await this.loadNotifications();
    }

    /**
     * Show component (for authenticated users)
     */
    showComponent() {
        const bellButton = document.getElementById('notification-bell');
        if (bellButton) {
            bellButton.classList.add('authenticated');
        }
    }

    /**
     * Hide component (for non-authenticated users)
     */
    hideComponent() {
        const bellButton = document.getElementById('notification-bell');
        if (bellButton) {
            bellButton.classList.remove('authenticated');
        }
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        this.stopPolling();
        this.isInitialized = false;
    }
}

// Create global instance
if (typeof window.notificationCenter === 'undefined') {
    window.notificationCenter = new NotificationCenter();
}

// Export
window.NotificationCenter = NotificationCenter;



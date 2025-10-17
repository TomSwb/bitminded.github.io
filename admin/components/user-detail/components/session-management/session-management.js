/**
 * Session Management Component for Admin User Detail
 * Displays and manages user sessions
 */
if (typeof window.SessionManagement === 'undefined') {
class SessionManagement {
    constructor() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.sessions = [];
        this.translations = null;
        this.currentLanguage = 'en';
        
        // Elements
        this.sessionList = null;
        this.emptyState = null;
        this.loadingState = null;
        this.errorContainer = null;
        this.errorText = null;
    }

    /**
     * Initialize the session management component
     */
    async init(userId) {
        if (!userId) {
            console.error('❌ Session Management: No user ID provided');
            return;
        }

        try {
            // Initializing
            
            this.currentUserId = userId;
            
            // Load translations first
            await this.loadTranslations();
            
            // Get elements
            this.sessionList = document.getElementById('session-list');
            this.emptyState = document.getElementById('session-empty');
            this.loadingState = document.getElementById('session-loading');
            this.errorContainer = document.getElementById('session-error');
            this.errorText = document.getElementById('session-error-text');
            
            // Make translatable content visible
            this.showTranslatableContent();
            
            if (!this.sessionList) {
                console.error('❌ Session list element not found');
                return;
            }
            
            // Load sessions
            await this.loadSessions();
            
            this.isInitialized = true;
            // Initialized
            
        } catch (error) {
            console.error('❌ Session Management: Failed to initialize:', error);
            this.showError('Failed to initialize session management');
        }
    }

    /**
     * Load user sessions using Edge Function
     */
    async loadSessions() {
        if (!this.currentUserId || !window.supabase) return;
        
        try {
            this.showLoading(true);
            this.hideError();
            
            // Fetching sessions
            
            // Call Edge Function to get sessions (uses service role to query auth.sessions)
            const { data, error } = await window.supabase.functions.invoke('get-user-sessions', {
                body: { user_id: this.currentUserId }
            });
            
            if (error) {
                throw error;
            }
            
            // Edge Function response
            // Sessions received
            // Auth sessions available
            // Total auth sessions
            
            this.sessions = data.sessions || [];
            // Active sessions to display
            
            // Sessions loaded silently
            
            // Display sessions
            this.displaySessions();
            
            // Notify parent to refresh stats if sessions were cleaned up
            if (window.userDetailPage && typeof window.userDetailPage.refreshStats === 'function') {
                await window.userDetailPage.refreshStats();
            }
            
        } catch (error) {
            console.error('❌ Failed to load sessions:', error);
            this.showError('Failed to load sessions: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display sessions in the UI
     */
    displaySessions() {
        if (!this.sessionList) return;
        
        // Clear current list
        this.sessionList.innerHTML = '';
        
        if (this.sessions.length === 0) {
            this.showEmptyState(true);
            return;
        }
        
        this.showEmptyState(false);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'session-management__table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>${this.t('browser')}</th>
                <th>${this.t('os')}</th>
                <th>${this.t('ip')}</th>
                <th>${this.t('location')}</th>
                <th>${this.t('started')}</th>
                <th>Action</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        this.sessions.forEach((session, index) => {
            const row = this.createSessionRow(session, index);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        this.sessionList.appendChild(table);
    }

    /**
     * Create a session row element
     */
    createSessionRow(session, index) {
        const row = document.createElement('tr');
        row.className = 'session-management__row';
        row.dataset.sessionId = session.session_token;
        
        // Parse user agent for device info (from enriched data)
        const deviceInfo = this.parseUserAgent(session.user_agent || 'Unknown');
        
        // Format date
        const createdDate = new Date(session.created_at);
        const timeAgo = this.getTimeAgo(createdDate);
        
        row.innerHTML = `
            <td>
                <div class="session-management__device-info">
                    <span class="session-management__icon">${deviceInfo.icon}</span>
                    <span>${deviceInfo.browser}</span>
                </div>
            </td>
            <td>${deviceInfo.os}</td>
            <td>${session.ip_address || 'Unknown'}</td>
            <td>${session.location || 'Unknown'}</td>
            <td>${timeAgo}</td>
            <td>
                <button class="session-management__revoke-btn" data-session-id="${session.session_id}">
                    ${this.t('revoke')}
                </button>
            </td>
        `;
        
        // Add revoke button event listener
        const revokeBtn = row.querySelector('.session-management__revoke-btn');
        if (revokeBtn) {
            // Attaching revoke listener
            revokeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Revoke button clicked!');
                this.revokeSession(session.session_token);
            });
        } else {
            console.error('❌ Revoke button not found in row');
        }
        
        return row;
    }

    /**
     * Parse user agent string
     */
    parseUserAgent(userAgent) {
        if (!userAgent) {
            return { device: 'Unknown Device', browser: 'Unknown', os: 'Unknown', icon: '💻' };
        }
        
        // Detect device type
        let device = 'Desktop';
        let icon = '💻';
        
        if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
            if (/iPad/i.test(userAgent)) {
                device = 'iPad';
                icon = '📱';
            } else if (/iPhone/i.test(userAgent)) {
                device = 'iPhone';
                icon = '📱';
            } else if (/Android/i.test(userAgent)) {
                device = 'Android Device';
                icon = '📱';
            } else {
                device = 'Mobile Device';
                icon = '📱';
            }
        }
        
        // Detect browser
        let browser = 'Unknown Browser';
        if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) {
            browser = 'Chrome';
        } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
            browser = 'Safari';
        } else if (/Firefox/i.test(userAgent)) {
            browser = 'Firefox';
        } else if (/Edge|Edg/i.test(userAgent)) {
            browser = 'Edge';
        }
        
        // Detect OS
        let os = 'Unknown OS';
        if (/Windows/i.test(userAgent)) {
            os = 'Windows';
        } else if (/Mac OS X/i.test(userAgent)) {
            os = 'macOS';
        } else if (/Linux/i.test(userAgent)) {
            os = 'Linux';
        } else if (/Android/i.test(userAgent)) {
            os = 'Android';
        } else if (/iOS|iPhone|iPad/i.test(userAgent)) {
            os = 'iOS';
        }
        
        return { device, browser, os, icon };
    }

    /**
     * Get relative time string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(sessionId) {
        if (!sessionId || !window.supabase) {
            console.error('❌ No session ID or Supabase client');
            return;
        }
        
        try {
            console.log('🚫 Revoking session:', sessionId);
            
            const confirmed = confirm('Are you sure you want to revoke this session?\n\nThe user will be logged out from this device.');
            
            if (!confirmed) {
                console.log('❌ User cancelled revocation');
                return;
            }
            
            console.log('🔄 Calling revoke-session Edge Function...');
            
            // Find the table row and button
            const btn = document.querySelector(`[data-session-id="${sessionId}"]`);
            const row = btn?.closest('tr');
            
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Revoking...';
            }
            
            if (row) {
                // Add visual feedback to the row
                row.style.opacity = '0.5';
                row.style.pointerEvents = 'none';
                row.style.filter = 'grayscale(1)';
                row.style.textDecoration = 'line-through';
            }
            
            // Use Edge Function to revoke session (bypasses RLS with service role)
            const { data, error } = await window.supabase.functions.invoke('revoke-session', {
                body: { 
                    session_id: sessionId,
                    target_user_id: this.currentUserId  // Admin revoking for another user
                }
            });
            
            if (error) {
                console.error('❌ Edge Function error:', error);
                throw error;
            }
            
            if (!data?.success) {
                console.error('❌ Revoke failed:', data);
                throw new Error(data?.error || 'Failed to revoke session');
            }
            
            console.log('✅ Session revoked successfully in database');
            
            // Log admin action
            if (window.adminLayout) {
                console.log('📝 Logging admin action...');
                await window.adminLayout.logAdminAction(
                    'session_revoked',
                    `Revoked session ${sessionId.substring(0, 8)}... for user`
                );
                console.log('✅ Admin action logged');
            }
            
            // Show success message temporarily
            alert('Session revoked successfully!');
            
            // Reload sessions
            console.log('🔄 Reloading sessions list...');
            await this.loadSessions();
            
            // Notify parent to refresh stats
            if (window.userDetailPage && typeof window.userDetailPage.refreshStats === 'function') {
                await window.userDetailPage.refreshStats();
            }
            
        } catch (error) {
            console.error('❌ Failed to revoke session:', error);
            this.showError('Failed to revoke session: ' + error.message);
            alert('Failed to revoke session: ' + error.message);
        }
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        if (this.loadingState) {
            this.loadingState.style.display = show ? 'flex' : 'none';
        }
        if (this.sessionList) {
            this.sessionList.style.display = show ? 'none' : 'flex';
        }
    }

    /**
     * Show/hide empty state
     */
    showEmptyState(show) {
        if (this.emptyState) {
            this.emptyState.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.errorContainer && this.errorText) {
            this.errorText.textContent = message;
            this.errorContainer.style.display = 'flex';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideError();
            }, 5000);
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
     * Refresh sessions
     */
    async refresh() {
        await this.loadSessions();
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            this.currentLanguage = localStorage.getItem('language') || 'en';
            const response = await fetch('/admin/components/user-detail/components/session-management/locales/session-management-locales.json');
            this.translations = await response.json();
            // Translations loaded
        } catch (error) {
            console.warn('⚠️ Failed to load session management translations:', error);
            // Continue without translations - use English fallback in HTML
        }
    }

    /**
     * Get translated text
     */
    t(key) {
        if (!this.translations || !this.translations[this.currentLanguage]) {
            return key;
        }
        return this.translations[this.currentLanguage].translation[key] || key;
    }

    /**
     * Show translatable content by adding loaded class
     */
    showTranslatableContent() {
        const container = document.getElementById('session-management');
        if (container) {
            const translatableElements = container.querySelectorAll('.translatable-content');
            translatableElements.forEach(element => {
                element.classList.add('loaded');
            });
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.sessions = [];
    }
}

// Export for use in other scripts
window.SessionManagement = SessionManagement;
} // End of if statement to prevent duplicate class declaration


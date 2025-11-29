/**
 * Active Sessions Component
 * Manages and displays user's active login sessions
 */

if (typeof window.ActiveSessions === 'undefined') {
class ActiveSessions {
    constructor() {
        this.isInitialized = false;
        this.sessions = [];
        this.currentSessionId = null;
        this.timerIntervals = new Map(); // Store timer intervals for each session
        
        // DOM elements
        this.container = null;
        this.loadingEl = null;
        this.errorEl = null;
        this.errorMessageEl = null;
        this.contentEl = null;
        this.sessionsListEl = null;
        this.emptyStateEl = null;
        this.sessionCountEl = null;
        this.logoutAllBtn = null;
    }

    /**
     * Initialize the Active Sessions component
     */
    async init() {
        try {
            if (this.isInitialized) {
                window.logger?.log('Active Sessions: Already initialized');
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

            // Load sessions
            await this.loadSessions();

            this.isInitialized = true;
            // Initialized
            
            // Final translation update to ensure everything is translated
            setTimeout(() => {
                this.updateTranslations();
            }, 100);

        } catch (error) {
            window.logger?.error('❌ Active Sessions initialization error:', error);
            this.showError('Failed to initialize Active Sessions component');
        }
    }

    /**
     * Setup component DOM elements and event listeners
     */
    setupComponent() {
        this.container = document.getElementById('active-sessions');
        if (!this.container) {
            window.logger?.error('Active Sessions container not found');
            return;
        }

        // Get DOM elements
        this.loadingEl = document.getElementById('sessions-loading');
        this.errorEl = document.getElementById('sessions-error');
        this.errorMessageEl = document.getElementById('sessions-error-message');
        this.contentEl = document.getElementById('sessions-content');
        this.sessionsListEl = document.getElementById('sessions-list');
        this.emptyStateEl = document.getElementById('sessions-empty');
        this.sessionCountEl = document.getElementById('session-count');
        this.logoutAllBtn = document.getElementById('logout-all-btn');

        // Setup event listeners
        if (this.logoutAllBtn) {
            this.logoutAllBtn.addEventListener('click', () => this.handleLogoutAll());
        }

        // Listen for language changes and re-render sessions
        window.addEventListener('languageChanged', () => {
            window.logger?.log('🌐 Active Sessions: Language changed, re-rendering sessions');
            this.displaySessions();
        });

        // Make translatable content visible
        this.showTranslatableContent();
        
        // Update translations after component is set up
        this.updateTranslations();

        // Setup complete
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.activeSessionsTranslations) {
                await window.activeSessionsTranslations.init();
                // Update translations immediately after initialization
                this.updateTranslations();
            }
        } catch (error) {
            window.logger?.error('❌ Failed to initialize active sessions translations:', error);
        }
    }

    /**
     * Update translations for the component
     */
    updateTranslations() {
        if (window.activeSessionsTranslations) {
            window.activeSessionsTranslations.updateTranslations();
        }
    }

    /**
     * Show translatable content (remove any display:none if needed)
     */
    showTranslatableContent() {
        if (this.container) {
            const hiddenElements = this.container.querySelectorAll('[style*="display: none"][data-translation-key]');
            hiddenElements.forEach(el => {
                if (el.style.display === 'none' && el.hasAttribute('data-translation-key')) {
                    el.style.display = '';
                }
            });
        }
    }

    /**
     * Get translated text (delegate to translation manager)
     */
    t(key) {
        if (window.activeSessionsTranslations) {
            return window.activeSessionsTranslations.getTranslation(key);
        }
        return key;
    }

    /**
     * Load active sessions
     */
    async loadSessions() {
        try {
            this.showLoading();

            // Check if user is authenticated
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Store current session ID
            this.currentSessionId = session.access_token;

            // Get user's sessions from Supabase Auth
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError) {
                throw new Error('Failed to get user data');
            }

            // Since Supabase doesn't expose all sessions via client SDK,
            // we'll show the current session and use login activity as a proxy
            this.sessions = await this.buildSessionsFromLoginActivity(user.id, session);

            this.displaySessions();

        } catch (error) {
            window.logger?.error('❌ Error loading sessions:', error);
            this.showError(this.t('Failed to load sessions'));
        }
    }

    /**
     * Build sessions list from user_sessions (validated against auth.sessions)
     */
    async buildSessionsFromLoginActivity(userId, currentSession) {
        const sessions = [];

        // Use get-user-sessions Edge Function (same as admin panel - validates against auth.sessions)
        try {
            const sessionsData = await window.invokeEdgeFunction('get-user-sessions', {
                body: { user_id: userId }
            });
            
            const deviceInfo = this.getDeviceInfo();
            const currentToken = currentSession.access_token;
            const activeSessions = sessionsData?.sessions || [];
            
            // Convert to display format
            for (const session of activeSessions) {
                const isCurrent = session.session_token === currentToken;
                
                sessions.push({
                    id: session.session_token,
                    isCurrent: isCurrent,
                    device: session.device_type || (isCurrent ? deviceInfo.device : 'Unknown'),
                    browser: session.browser || (isCurrent ? deviceInfo.browser : 'Unknown'),
                    os: session.os || (isCurrent ? deviceInfo.os : 'Unknown'),
                    icon: this.getDeviceIcon(session.device_type || deviceInfo.device),
                    lastActive: session.last_accessed ? new Date(session.last_accessed) : new Date(),
                    createdAt: session.created_at ? new Date(session.created_at) : new Date(),
                    ipAddress: session.ip_address,
                    location: session.location  // Add location from geolocation
                });
            }
            
            // If no sessions returned (shouldn't happen), add current session manually
            if (sessions.length === 0) {
                sessions.push({
                    id: currentToken,
                    isCurrent: true,
                    device: deviceInfo.device,
                    browser: deviceInfo.browser,
                    os: deviceInfo.os,
                    icon: deviceInfo.icon,
                    lastActive: new Date(),
                    createdAt: new Date(currentSession.user.last_sign_in_at || Date.now()),
                    ipAddress: null
                });
            }
            
        } catch (error) {
            window.logger?.error('Failed to load active sessions:', error);
            // Fallback: show current session only
            const deviceInfo = this.getDeviceInfo();
            sessions.push({
                id: currentSession.access_token,
                isCurrent: true,
                device: deviceInfo.device,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                icon: deviceInfo.icon,
                lastActive: new Date(),
                createdAt: new Date(currentSession.user.last_sign_in_at || Date.now()),
                ipAddress: null
            });
        }

        return sessions;
    }

    /**
     * Get current device information
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        
        // Detect device type
        let device = 'Desktop';
        if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
            device = /iPad|Tablet/.test(ua) ? 'Tablet' : 'Mobile';
        }

        // Detect browser
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

        // Detect OS
        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS X')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        const icon = this.getDeviceIcon(device);

        return { device, browser, os, icon };
    }

    /**
     * Get device icon emoji
     */
    getDeviceIcon(deviceType) {
        const icons = {
            'Desktop': '🖥️',
            'Laptop': '💻',
            'Mobile': '📱',
            'Tablet': '📱',
            'Unknown': '💻'
        };
        return icons[deviceType] || icons.Unknown;
    }

    /**
     * Display sessions in the UI
     */
    displaySessions() {
        if (!this.sessionsListEl) return;

        // Clear existing timers
        this.timerIntervals.forEach(intervalId => clearInterval(intervalId));
        this.timerIntervals.clear();

        // Clear existing sessions
        this.sessionsListEl.innerHTML = '';

        if (this.sessions.length === 0) {
            this.showEmpty();
            return;
        }

        // Update session count
        if (this.sessionCountEl) {
            const count = this.sessions.length;
            const sessionText = count === 1 ? 'session' : 'sessions';
            this.sessionCountEl.textContent = `${count} ${sessionText}`;
        }

        // Render each session
        this.sessions.forEach(session => {
            const sessionEl = this.createSessionElement(session);
            this.sessionsListEl.appendChild(sessionEl);
        });

        this.showContent();
    }

    /**
     * Create session DOM element
     */
    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = 'active-sessions__session';
        div.dataset.sessionId = session.id;
        
        if (session.isCurrent) {
            div.classList.add('active-sessions__session--current');
        }
        if (session.revoked) {
            div.classList.add('active-sessions__session--revoked');
        }

        // Icon
        const icon = document.createElement('div');
        icon.className = 'active-sessions__session-icon';
        icon.textContent = session.icon;

        // Info container
        const info = document.createElement('div');
        info.className = 'active-sessions__session-info';

        // Device name
        const device = document.createElement('h4');
        device.className = 'active-sessions__session-device';
        device.textContent = `${session.device} • ${session.browser}`;
        
        if (session.isCurrent) {
            const badge = document.createElement('span');
            badge.className = 'active-sessions__session-current-badge';
            badge.textContent = this.t('Current Device');
            device.appendChild(badge);
        }

        // Details
        const details = document.createElement('div');
        details.className = 'active-sessions__session-details';

        // OS
        const osDetail = document.createElement('span');
        osDetail.className = 'active-sessions__session-detail';
        osDetail.textContent = session.os;
        details.appendChild(osDetail);

        // IP Address (if available)
        if (session.ipAddress) {
            const ipDetail = document.createElement('span');
            ipDetail.className = 'active-sessions__session-detail';
            ipDetail.textContent = `IP: ${session.ipAddress}`;
            details.appendChild(ipDetail);
        }

        // Location (if available)
        if (session.location) {
            const locationDetail = document.createElement('span');
            locationDetail.className = 'active-sessions__session-detail';
            locationDetail.textContent = session.location;
            details.appendChild(locationDetail);
        }

        // Last active
        const lastActive = document.createElement('span');
        lastActive.className = 'active-sessions__session-detail';
        lastActive.textContent = this.formatRelativeTime(session.lastActive);
        details.appendChild(lastActive);

        info.appendChild(device);
        info.appendChild(details);

        // Revoked warning message
        if (session.revoked) {
            const warning = document.createElement('div');
            warning.className = 'active-sessions__revoked-warning';
            
            const strongEl = document.createElement('strong');
            strongEl.textContent = this.t('⚠️ Session Revoked');
            warning.appendChild(strongEl);
            
            const br = document.createElement('br');
            warning.appendChild(br);
            
            const textNode = document.createTextNode(this.t('This session was logged out but the access token remains valid for') + ' ');
            warning.appendChild(textNode);
            
            const timerSpan = document.createElement('span');
            timerSpan.className = 'active-sessions__timer';
            timerSpan.dataset.sessionId = session.id;
            timerSpan.textContent = 'calculating...';
            warning.appendChild(timerSpan);
            
            info.appendChild(warning);
            
            // Start timer for this session
            this.startSessionTimer(session);
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'active-sessions__session-actions';

        if (!session.isCurrent && !session.revoked) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'active-sessions__logout-btn';
            logoutBtn.textContent = this.t('Logout');
            logoutBtn.addEventListener('click', () => this.handleLogoutSession(session));
            actions.appendChild(logoutBtn);
        }

        div.appendChild(icon);
        div.appendChild(info);
        div.appendChild(actions);

        return div;
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = Date.now();
        const diff = now - date.getTime();
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return this.t('Just now');
        if (minutes < 60) return `${minutes} ${this.t('minutes ago')}`;
        if (hours < 24) return `${hours} ${this.t('hours ago')}`;
        return `${days} ${this.t('days ago')}`;
    }

    /**
     * Start countdown timer for revoked session
     */
    startSessionTimer(session) {
        // JWT tokens expire 1 hour after they were created (not when revoked!)
        const TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour in milliseconds
        const expiresAt = session.createdAt.getTime() + TOKEN_LIFETIME;  // Based on login time!
        
        // Clear existing timer if any
        if (this.timerIntervals.has(session.id)) {
            clearInterval(this.timerIntervals.get(session.id));
        }
        
        const updateTimer = () => {
            const now = Date.now();
            const remaining = expiresAt - now;
            
            if (remaining <= 0) {
                // Token expired - remove session
                this.removeExpiredSession(session.id);
                return;
            }
            
            // Calculate time remaining
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            // Update timer display
            const timerEl = document.querySelector(`.active-sessions__timer[data-session-id="${session.id}"]`);
            if (timerEl) {
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        // Update immediately
        updateTimer();
        
        // Update every second
        const intervalId = setInterval(updateTimer, 1000);
        this.timerIntervals.set(session.id, intervalId);
    }

    /**
     * Remove expired session from list
     */
    removeExpiredSession(sessionId) {
        window.logger?.log('🕐 Session token expired:', sessionId);
        
        // Clear timer
        if (this.timerIntervals.has(sessionId)) {
            clearInterval(this.timerIntervals.get(sessionId));
            this.timerIntervals.delete(sessionId);
        }
        
        // Remove from sessions array
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        
        // Re-render
        this.displaySessions();
        
        // Show notification
        if (window.NotificationHelper) {
            window.NotificationHelper.showInfo('Session token has expired and been removed');
        }
    }

    /**
     * Handle logout single session
     */
    async handleLogoutSession(session) {
        if (session.isCurrent) {
            return; // Cannot logout current session from here
        }

        try {
            window.logger?.log('🔐 Revoking session:', session.id);
            
            // Call edge function to revoke the session
            const data = await window.invokeEdgeFunction('revoke-session', {
                body: { 
                    session_id: session.id 
                }
            });

            window.logger?.log('✅ Session revoked successfully');
            
            // Mark session as revoked instead of removing it
            const revokedSession = this.sessions.find(s => s.id === session.id);
            if (revokedSession) {
                revokedSession.revoked = true;
                revokedSession.revokedAt = new Date();
            }
            
            // Re-render to show orange card with timer
            this.displaySessions();

            // Show success message
            if (window.NotificationHelper) {
                window.NotificationHelper.showSuccess(this.t('Session logged out successfully'));
            }

        } catch (error) {
            window.logger?.error('❌ Error logging out session:', error);
            this.showError(this.t('Failed to logout session'));
        }
    }

    /**
     * Handle logout all other sessions
     */
    async handleLogoutAll() {
        if (!confirm(this.t('Are you sure you want to logout all other devices?'))) {
            return;
        }

        try {
            this.logoutAllBtn.disabled = true;
            this.logoutAllBtn.textContent = 'Logging out...';

            window.logger?.log('🔐 Revoking all other sessions');
            
            // Call edge function to revoke all sessions
            const data = await window.invokeEdgeFunction('revoke-session', {
                body: { 
                    revoke_all: true 
                }
            });

            window.logger?.log('✅ All other sessions revoked:', data);

            // Mark all non-current sessions as revoked
            const now = new Date();
            this.sessions.forEach(session => {
                if (!session.isCurrent && !session.revoked) {
                    session.revoked = true;
                    session.revokedAt = now;
                }
            });
            
            // Re-render to show orange cards with timers
            this.displaySessions();

            // Show success message
            if (window.NotificationHelper) {
                const message = data?.revoked_count > 0 
                    ? `${data.revoked_count} sessions logged out`
                    : this.t('All other sessions logged out successfully');
                window.NotificationHelper.showSuccess(message);
            }

        } catch (error) {
            window.logger?.error('❌ Error logging out all sessions:', error);
            this.showError(this.t('Failed to logout session'));
        } finally {
            this.logoutAllBtn.disabled = false;
            this.logoutAllBtn.textContent = this.t('Logout All Other Devices');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.loadingEl) this.loadingEl.style.display = 'flex';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
    }

    /**
     * Show content state
     */
    showContent() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'block';
        if (this.emptyStateEl) this.emptyStateEl.style.display = 'none';
    }

    /**
     * Show empty state
     */
    showEmpty() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'block';
        if (this.emptyStateEl) this.emptyStateEl.style.display = 'block';
        if (this.sessionsListEl) this.sessionsListEl.style.display = 'none';
    }

    /**
     * Show error state
     */
    showError(message) {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'block';
        if (this.errorMessageEl) this.errorMessageEl.textContent = message;
    }

    /**
     * Refresh sessions list
     */
    async refresh() {
        await this.loadSessions();
    }
}

// Create global instance
window.ActiveSessions = ActiveSessions;
}

// Auto-initialize when the component is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const activeSessions = new window.ActiveSessions();
        activeSessions.init();
    });
} else {
    const activeSessions = new window.ActiveSessions();
    activeSessions.init();
}

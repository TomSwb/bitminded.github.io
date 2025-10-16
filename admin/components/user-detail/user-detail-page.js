/**
 * User Detail Page Component
 * Handles the dedicated user detail page functionality
 */

class UserDetailPage {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.currentTab = 'overview';
        this.elements = {};
    }

    /**
     * Initialize the user detail page
     */
    async init() {
        if (this.isInitialized) {
            console.log('User Detail Page: Already initialized');
            return;
        }

        try {
            console.log('🔧 Initializing User Detail Page...');
            
            // Check authentication and admin access
            const hasAccess = await this.checkAdminAccess();
            if (!hasAccess) {
                console.log('🔒 Access denied, redirecting...');
                window.location.href = '/';
                return;
            }

            this.cacheElements();
            this.setupEventListeners();
            
            // Get user ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('id');
            
            if (!userId) {
                console.error('❌ No user ID provided');
                this.showError('No user ID provided');
                return;
            }

            // Load user data
            await this.loadUserData(userId);
            
            this.isInitialized = true;
            console.log('✅ User Detail Page initialized');
            
        } catch (error) {
            console.error('❌ User Detail Page: Failed to initialize:', error);
            this.showError('Failed to initialize user detail page');
        }
    }

    /**
     * Check if user has admin access
     */
    async checkAdminAccess() {
        try {
            if (!window.supabase) {
                console.error('❌ Supabase not available');
                return false;
            }

            // Check authentication
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                console.log('🔒 User not authenticated');
                return false;
            }

            // Check admin role
            const { data: adminRole, error: roleError } = await window.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle();
            
            if (roleError || !adminRole) {
                console.log('🔒 User is not admin');
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Error checking admin access:', error);
            return false;
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Page elements
            breadcrumbUsername: document.getElementById('breadcrumb-username'),
            pageTitle: document.getElementById('page-title'),
            backButton: document.getElementById('back-to-users'),
            
            // User info elements
            avatar: document.getElementById('user-detail-avatar'),
            avatarFallback: document.getElementById('user-detail-avatar-fallback'),
            username: document.getElementById('user-detail-username'),
            email: document.getElementById('user-detail-email'),
            roleBadge: document.getElementById('user-detail-role-badge'),
            statusBadge: document.getElementById('user-detail-status-badge'),
            twoFaBadge: document.getElementById('user-detail-2fa-badge'),
            
            // Tab elements
            tabs: document.querySelectorAll('.user-detail__tab'),
            tabContents: document.querySelectorAll('.user-detail__tab-content'),
            
            // Overview tab elements
            userId: document.getElementById('user-detail-user-id'),
            usernameValue: document.getElementById('user-detail-username-value'),
            emailValue: document.getElementById('user-detail-email-value'),
            roleValue: document.getElementById('user-detail-role-value'),
            statusValue: document.getElementById('user-detail-status-value'),
            twoFaValue: document.getElementById('user-detail-2fa-value'),
            registered: document.getElementById('user-detail-registered'),
            lastLogin: document.getElementById('user-detail-last-login'),
            subscriptionCount: document.getElementById('user-detail-subscription-count'),
            loginCount: document.getElementById('user-detail-login-count'),
            sessionCount: document.getElementById('user-detail-session-count'),
            notesInput: document.getElementById('user-detail-notes-input'),
            saveNotesButton: document.getElementById('user-detail-save-notes'),
            
            // Action buttons
            grantAccessButton: document.getElementById('user-detail-grant-access'),
            revokeSessionsButton: document.getElementById('user-detail-revoke-all-sessions'),
            editUserButton: document.getElementById('user-detail-edit-user'),
            sendPasswordResetButton: document.getElementById('user-detail-send-password-reset'),
            sendEmailButton: document.getElementById('user-detail-send-email'),
            suspendUserButton: document.getElementById('user-detail-suspend-user'),
            deleteUserButton: document.getElementById('user-detail-delete-user'),
            permanentDeleteButton: document.getElementById('user-detail-permanent-delete')
        };

        // Validate required elements
        const requiredElements = ['username', 'email', 'backButton'];
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                console.warn(`Required element not found: ${elementName}`);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Back button
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => {
                window.location.href = '/admin/?section=users';
            });
        }

        // Tab switching
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Action buttons
        if (this.elements.saveNotesButton) {
            this.elements.saveNotesButton.addEventListener('click', () => this.saveNotes());
        }

        if (this.elements.grantAccessButton) {
            this.elements.grantAccessButton.addEventListener('click', () => this.grantAccess());
        }

        if (this.elements.revokeSessionsButton) {
            this.elements.revokeSessionsButton.addEventListener('click', () => this.revokeAllSessions());
        }

        if (this.elements.editUserButton) {
            this.elements.editUserButton.addEventListener('click', () => this.editUser());
        }

        if (this.elements.sendPasswordResetButton) {
            this.elements.sendPasswordResetButton.addEventListener('click', () => this.sendPasswordReset());
        }

        if (this.elements.sendEmailButton) {
            this.elements.sendEmailButton.addEventListener('click', () => this.sendEmail());
        }

        if (this.elements.suspendUserButton) {
            this.elements.suspendUserButton.addEventListener('click', () => this.suspendUser());
        }

        if (this.elements.deleteUserButton) {
            this.elements.deleteUserButton.addEventListener('click', () => this.deleteUser());
        }

        if (this.elements.permanentDeleteButton) {
            this.elements.permanentDeleteButton.addEventListener('click', () => this.permanentDeleteUser());
        }
    }

    /**
     * Load user data from database
     */
    async loadUserData(userId) {
        try {
            console.log('📥 Loading user data for ID:', userId);
            
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Query user profile with all related data
            const { data: profileData, error: profileError } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, created_at, email, status')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('❌ Failed to load user profile:', profileError);
                throw profileError;
            }

            // Get role
            const { data: roleData } = await window.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .order('role', { ascending: true }) // Prioritize admin role
                .limit(1)
                .maybeSingle();

            // Get user statistics (login count, session count, etc.) using the new function
            const { data: statsData } = await window.supabase
                .rpc('get_user_statistics', { user_uuid: userId })
                .maybeSingle();

            console.log('📊 User statistics:', statsData);

            // Get 2FA status (check if table exists first)
            let twoFaData = null;
            try {
                const { data, error } = await window.supabase
                    .from('user_2fa')
                    .select('is_enabled')
                    .eq('user_id', userId)
                    .maybeSingle();
                
                if (!error) {
                    twoFaData = data;
                } else {
                    console.warn('⚠️ 2FA table query failed:', error);
                }
            } catch (error) {
                console.warn('⚠️ 2FA table does not exist or has different structure:', error);
            }

            // Combine all user data
            this.currentUser = {
                ...profileData,
                email: profileData.email || 'Email not available',
                role: roleData?.role || 'user',
                status: profileData.status || 'active',
                subscription_count: statsData?.subscription_count || 0,
                total_logins: statsData?.total_logins || 0,
                active_sessions: statsData?.active_sessions || 0,
                last_login: statsData?.last_login || null,
                has_2fa: twoFaData?.is_enabled || false
            };

            // Populate UI
            this.populateUserInfo(this.currentUser);
            this.switchTab('overview');
            await this.loadOverviewData();

            // Hide loading screen using proper ready flag system
            console.log('🔧 Hiding loading screen...');
            
            if (window.loadingScreen) {
                // Set translation ready flag to true so loading screen can hide
                window.loadingScreen.setReadyFlag('translation', true);
                console.log('✅ Loading screen ready flag set');
            } else {
                // Fallback: hide directly if loading screen component not available
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    console.log('✅ Loading screen hidden directly (fallback)');
                }
            }

            console.log('✅ User data loaded successfully');

        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            this.showError('Failed to load user data');
            
            // Hide loading screen (error case) using proper ready flag system
            console.log('🔧 Hiding loading screen (error case)...');
            
            if (window.loadingScreen) {
                // Set translation ready flag to true so loading screen can hide
                window.loadingScreen.setReadyFlag('translation', true);
                console.log('✅ Loading screen ready flag set (error case)');
            } else {
                // Fallback: hide directly if loading screen component not available
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    console.log('✅ Loading screen hidden directly (error case fallback)');
                }
            }
        }
    }

    /**
     * Populate basic user information
     */
    populateUserInfo(userData) {
        // Update page title and breadcrumb
        if (this.elements.breadcrumbUsername) {
            this.elements.breadcrumbUsername.textContent = userData.username || 'User Details';
        }
        if (this.elements.pageTitle) {
            this.elements.pageTitle.textContent = `${userData.username || 'User'} Details`;
        }

        // Avatar
        if (userData.avatar_url) {
            this.elements.avatar.src = userData.avatar_url;
            this.elements.avatar.style.display = 'block';
            this.elements.avatarFallback.style.display = 'none';
        } else {
            this.elements.avatar.style.display = 'none';
            this.elements.avatarFallback.style.display = 'flex';
            this.elements.avatarFallback.textContent = userData.username?.charAt(0).toUpperCase() || '?';
        }

        // Basic info
        this.elements.username.textContent = userData.username || 'Unknown User';
        this.elements.email.textContent = userData.email || 'No email';
        
        // Detailed info (Overview tab)
        this.elements.userId.textContent = userData.id || 'N/A';
        this.elements.usernameValue.textContent = userData.username || 'Unknown';
        this.elements.emailValue.textContent = userData.email || 'No email';
        this.elements.roleValue.textContent = userData.role || 'user';
        this.elements.statusValue.textContent = userData.status || 'active';
        this.elements.twoFaValue.textContent = userData.has_2fa ? 'Yes' : 'No';
        this.elements.registered.textContent = this.formatDate(userData.created_at);
        this.elements.lastLogin.textContent = userData.last_login ? this.formatDate(userData.last_login) : 'Never';

        // Badges
        this.updateBadges(userData);
    }

    /**
     * Update user badges
     */
    updateBadges(userData) {
        // Role badge
        this.elements.roleBadge.textContent = userData.role || 'user';
        this.elements.roleBadge.className = `user-detail__badge user-detail__badge--role ${userData.role || 'user'}`;

        // Status badge
        this.elements.statusBadge.textContent = userData.status || 'active';
        this.elements.statusBadge.className = `user-detail__badge user-detail__badge--status ${userData.status || 'active'}`;

        // 2FA badge
        if (userData.has_2fa) {
            this.elements.twoFaBadge.textContent = '2FA';
            this.elements.twoFaBadge.style.display = 'inline-block';
        } else {
            this.elements.twoFaBadge.style.display = 'none';
        }
    }

    /**
     * Load overview tab data
     */
    async loadOverviewData() {
        if (!this.currentUser) return;

        try {
            // Load stats from currentUser data
            this.elements.subscriptionCount.textContent = this.currentUser.subscription_count || 0;
            this.elements.loginCount.textContent = this.currentUser.total_logins || 0;
            this.elements.sessionCount.textContent = this.currentUser.active_sessions || 0;

            // Load admin notes
            await this.loadAdminNotes();

        } catch (error) {
            console.error('❌ Failed to load overview data:', error);
        }
    }

    /**
     * Load admin notes for the user
     */
    async loadAdminNotes() {
        if (!this.currentUser || !window.supabase) return;

        try {
            const { data, error } = await window.supabase
                .from('admin_notes')
                .select('id, note, created_at, admin_id')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('❌ Failed to load admin notes:', error);
                return;
            }

            console.log('📝 Admin notes loaded:', data);

            // Display notes history
            const notesHistory = document.getElementById('user-detail-notes-history');
            if (notesHistory) {
                if (!data || data.length === 0) {
                    notesHistory.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">No notes yet.</p>';
                } else {
                    // Create masonry-style grid
                    notesHistory.style.display = 'grid';
                    notesHistory.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
                    notesHistory.style.gap = 'var(--spacing-md)';
                    notesHistory.style.alignItems = 'start';
                    
                    notesHistory.innerHTML = data.map((note, index) => `
                        <div class="user-detail__note-item" data-note-id="${note.id || index}" style="padding: var(--spacing-md); border: 1px solid var(--color-primary); border-radius: var(--radius-sm); position: relative; height: fit-content; display: flex; flex-direction: column;">
                            <!-- Action buttons (hidden when editing) -->
                            <div class="user-detail__note-actions" id="note-actions-${index}" style="display: flex; gap: var(--spacing-xs); justify-content: center; margin-bottom: var(--spacing-md);">
                                <button class="user-detail__note-action-btn" onclick="window.userDetailPage.editNote(${index})" style="background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-sm); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 60px;">
                                    <span style="font-size: var(--font-size-lg);">✏️</span>
                                    <span style="font-size: 10px;">Edit</span>
                                </button>
                                <button class="user-detail__note-action-btn" onclick="window.userDetailPage.deleteNote('${note.id}')" style="background: transparent; border: 1px solid var(--color-error); color: var(--color-error); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-sm); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 60px;">
                                    <span style="font-size: var(--font-size-lg);">🗑️</span>
                                    <span style="font-size: 10px;">Delete</span>
                                </button>
                            </div>
                            
                            <!-- Note content -->
                            <div class="user-detail__note-content" id="note-content-${index}">
                                <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--color-text-primary); word-wrap: break-word;">${this.escapeHtml(note.note)}</p>
                            </div>
                            
                            <!-- Edit form (hidden by default) -->
                            <div class="user-detail__note-edit" id="note-edit-${index}" style="display: none;">
                                <textarea class="user-detail__notes-input" id="note-edit-input-${index}" style="width: 100%; min-height: 60px; margin-bottom: var(--spacing-sm); resize: vertical;">${this.escapeHtml(note.note)}</textarea>
                                <div style="display: flex; gap: var(--spacing-sm); justify-content: center;">
                                    <button class="user-detail__button user-detail__button--primary" onclick="window.userDetailPage.updateNote(${index}, '${note.id}')">Save</button>
                                    <button class="user-detail__button user-detail__button--secondary" onclick="window.userDetailPage.cancelEditNote(${index})">Cancel</button>
                                </div>
                            </div>
                            
                            <!-- Timestamp -->
                            <small style="color: var(--color-text-secondary); font-size: var(--font-size-xs); display: block; margin-top: var(--spacing-sm); text-align: center;">
                                ${this.formatDate(note.created_at)}
                            </small>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('❌ Error loading admin notes:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Switch to a specific tab
     */
    switchTab(tabName) {
        // Update tab buttons
        this.elements.tabs.forEach(tab => {
            tab.classList.toggle('user-detail__tab--active', tab.getAttribute('data-tab') === tabName);
        });

        // Update tab content
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('user-detail__tab-content--active', content.getAttribute('data-tab') === tabName);
        });

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load data specific to the current tab
     */
    async loadTabData(tabName) {
        if (!this.currentUser) return;

        switch (tabName) {
            case 'subscriptions':
                await this.loadSubscriptionsData();
                break;
            case 'activity':
                await this.loadActivityData();
                break;
            case 'security':
                await this.loadSecurityData();
                break;
            case 'actions':
                // Actions tab doesn't need additional data loading
                break;
        }
    }

    /**
     * Load subscriptions data
     */
    async loadSubscriptionsData() {
        if (!this.currentUser || !window.supabase) return;

        try {
            const { data, error } = await window.supabase
                .from('entitlements')
                .select('app_id, active, created_at, expires_at')
                .eq('user_id', this.currentUser.id)
                .eq('active', true);

            if (error) {
                console.error('❌ Failed to load subscriptions:', error);
                return;
            }

            // TODO: Display subscriptions
            console.log('📦 User subscriptions:', data);

        } catch (error) {
            console.error('❌ Error loading subscriptions:', error);
        }
    }

    /**
     * Load activity data
     */
    async loadActivityData() {
        if (!this.currentUser || !window.supabase) return;

        try {
            // Get login activity
            const { data: loginData, error: loginError } = await window.supabase
                .from('user_login_activity')
                .select('login_time, success, ip_address, user_agent, device_type, browser, os, used_2fa')
                .eq('user_id', this.currentUser.id)
                .order('login_time', { ascending: false })
                .limit(20);

            if (loginError) {
                console.error('❌ Failed to load login activity:', error);
                return;
            }

            console.log('📊 User login activity:', loginData);

            // Display login activity
            const loginActivityContainer = document.getElementById('user-detail-login-activity');
            if (loginActivityContainer) {
                if (!loginData || loginData.length === 0) {
                    loginActivityContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No login activity yet.</p>';
                } else {
                    loginActivityContainer.innerHTML = `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--color-primary);">
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Date/Time</th>
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Status</th>
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Device</th>
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Browser</th>
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">IP Address</th>
                                        <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">2FA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${loginData.map(activity => `
                                        <tr style="border-bottom: 1px solid var(--color-primary);">
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.formatDate(activity.login_time)}</td>
                                            <td style="padding: var(--spacing-sm);">
                                                <span style="color: ${activity.success ? 'var(--color-success)' : 'var(--color-error)'}; font-weight: 600;">
                                                    ${activity.success ? '✓ Success' : '✗ Failed'}
                                                </span>
                                            </td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.device_type || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.browser || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary); font-family: monospace;">${activity.ip_address || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.used_2fa ? 'Yes' : 'No'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }

            // Only show admin actions if user is an admin
            if (this.currentUser.role === 'admin') {
                const { data: adminActions, error: adminError } = await window.supabase
                    .from('admin_activity')
                    .select('action, created_at, admin_id')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!adminError) {
                    console.log('📊 Admin actions:', adminActions);
                    
                    const adminActionsContainer = document.getElementById('user-detail-admin-actions');
                    if (adminActionsContainer) {
                        // Show the parent section
                        const adminActionsSection = adminActionsContainer.closest('.user-detail__section');
                        if (adminActionsSection) {
                            adminActionsSection.style.display = 'block';
                        }
                        
                        if (!adminActions || adminActions.length === 0) {
                            adminActionsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No admin actions yet.</p>';
                        } else {
                            adminActionsContainer.innerHTML = `
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="border-bottom: 1px solid var(--color-primary);">
                                                <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Date/Time</th>
                                                <th style="padding: var(--spacing-sm); text-align: left; color: var(--color-secondary);">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${adminActions.map(action => `
                                                <tr style="border-bottom: 1px solid var(--color-primary);">
                                                    <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.formatDate(action.created_at)}</td>
                                                    <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.escapeHtml(action.action)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        }
                    }
                }
            } else {
                // Hide admin actions section for non-admin users
                const adminActionsContainer = document.getElementById('user-detail-admin-actions');
                if (adminActionsContainer) {
                    const adminActionsSection = adminActionsContainer.closest('.user-detail__section');
                    if (adminActionsSection) {
                        adminActionsSection.style.display = 'none';
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error loading activity:', error);
        }
    }

    /**
     * Load security data
     */
    async loadSecurityData() {
        if (!this.currentUser || !window.supabase) return;

        try {
            // Load session management component HTML
            const response = await fetch('/admin/components/user-detail/components/session-management/session-management.html');
            const html = await response.text();
            
            const container = document.getElementById('session-management-container');
            if (container) {
                container.innerHTML = html;
                
                // Load component CSS
                if (!document.querySelector('link[href*="session-management.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/admin/components/user-detail/components/session-management/session-management.css';
                    document.head.appendChild(link);
                }
                
                // Load component JS and initialize
                if (!window.SessionManagement) {
                    await this.loadScript('/admin/components/user-detail/components/session-management/session-management.js');
                }
                
                // Initialize session management component
                if (window.SessionManagement) {
                    const sessionMgmt = new window.SessionManagement();
                    await sessionMgmt.init(this.currentUser.id);
                    this.sessionManagement = sessionMgmt;
                }
            }

            console.log('🔒 Security tab loaded with session management component');

        } catch (error) {
            console.error('❌ Error loading security data:', error);
        }
    }
    
    /**
     * Helper to load a script dynamically
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Action methods (placeholders for now)
     */
    async saveNotes() {
        console.log('💾 Save notes clicked');
        
        if (!this.currentUser || !window.supabase) return;
        
        const notesInput = document.getElementById('user-detail-notes-input');
        if (!notesInput) return;
        
        const noteText = notesInput.value.trim();
        
        if (!noteText) {
            this.showError('Please enter a note');
            return;
        }
        
        try {
            // Get current admin user ID
            const { data: { user } } = await window.supabase.auth.getUser();
            
            if (!user) {
                this.showError('Admin user not authenticated');
                return;
            }
            
            // Save the note
            const { data, error } = await window.supabase
                .from('admin_notes')
                .insert({
                    user_id: this.currentUser.id,
                    admin_id: user.id,
                    note: noteText
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Failed to save note:', error);
                this.showError('Failed to save note');
                return;
            }
            
            console.log('✅ Note saved:', data);
            this.showSuccess('Note saved successfully');
            
            // Clear the input
            notesInput.value = '';
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            console.error('❌ Error saving note:', error);
            this.showError('Failed to save note');
        }
    }

    /**
     * Edit a note
     */
    editNote(index) {
        console.log('✏️ Edit note:', index);
        
        // Hide content and action buttons, show edit form
        const contentDiv = document.getElementById(`note-content-${index}`);
        const editDiv = document.getElementById(`note-edit-${index}`);
        const actionsDiv = document.getElementById(`note-actions-${index}`);
        
        if (contentDiv && editDiv) {
            contentDiv.style.display = 'none';
            editDiv.style.display = 'block';
        }
        
        if (actionsDiv) {
            actionsDiv.style.display = 'none';
        }
    }

    /**
     * Cancel editing a note
     */
    cancelEditNote(index) {
        console.log('❌ Cancel edit note:', index);
        
        // Show content and action buttons, hide edit form
        const contentDiv = document.getElementById(`note-content-${index}`);
        const editDiv = document.getElementById(`note-edit-${index}`);
        const actionsDiv = document.getElementById(`note-actions-${index}`);
        
        if (contentDiv && editDiv) {
            contentDiv.style.display = 'block';
            editDiv.style.display = 'none';
        }
        
        if (actionsDiv) {
            actionsDiv.style.display = 'flex';
        }
    }

    /**
     * Update a note
     */
    async updateNote(index, noteId) {
        console.log('💾 Update note:', noteId);
        
        if (!window.supabase) return;
        
        const editInput = document.getElementById(`note-edit-input-${index}`);
        if (!editInput) return;
        
        const noteText = editInput.value.trim();
        
        if (!noteText) {
            this.showError('Note cannot be empty');
            return;
        }
        
        try {
            // Update the note
            const { error } = await window.supabase
                .from('admin_notes')
                .update({ note: noteText })
                .eq('id', noteId);
            
            if (error) {
                console.error('❌ Failed to update note:', error);
                this.showError('Failed to update note');
                return;
            }
            
            console.log('✅ Note updated');
            this.showSuccess('Note updated successfully');
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            console.error('❌ Error updating note:', error);
            this.showError('Failed to update note');
        }
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        console.log('🗑️ Delete note:', noteId);
        
        if (!window.supabase) return;
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }
        
        try {
            // Delete the note
            const { error } = await window.supabase
                .from('admin_notes')
                .delete()
                .eq('id', noteId);
            
            if (error) {
                console.error('❌ Failed to delete note:', error);
                this.showError('Failed to delete note');
                return;
            }
            
            console.log('✅ Note deleted');
            this.showSuccess('Note deleted successfully');
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            console.error('❌ Error deleting note:', error);
            this.showError('Failed to delete note');
        }
    }

    async grantAccess() {
        console.log('🎁 Grant access clicked');
        // TODO: Implement grant access functionality
    }

    async revokeAllSessions() {
        if (!this.currentUser || !window.supabase) return;
        
        try {
            console.log('🚫 Revoking all sessions for user:', this.currentUser.email);
            
            // Confirm action
            const confirmed = confirm(
                `⚠️ REVOKE ALL SESSIONS\n\n` +
                `User: ${this.currentUser.username}\n` +
                `Email: ${this.currentUser.email}\n\n` +
                `This will:\n` +
                `- Log out the user from ALL devices\n` +
                `- Revoke all active sessions\n` +
                `- User will need to log in again\n\n` +
                `Are you sure?`
            );
            
            if (!confirmed) {
                return;
            }
            
            this.showLoading(true);
            
            // Update all non-revoked sessions for this user
            const { error } = await window.supabase
                .from('user_login_activity')
                .update({ revoked_at: new Date().toISOString() })
                .eq('user_id', this.currentUser.id)
                .is('revoked_at', null);
            
            if (error) {
                throw error;
            }
            
            this.showSuccess('All sessions revoked successfully');
            console.log('✅ All sessions revoked successfully');
            
            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'all_sessions_revoked',
                    `Revoked all sessions for user: ${this.currentUser.username} (${this.currentUser.email})`
                );
            }
            
            // Refresh the session management component
            if (this.sessionManagement) {
                await this.sessionManagement.refresh();
            }
            
        } catch (error) {
            console.error('❌ Failed to revoke all sessions:', error);
            this.showError('Failed to revoke all sessions: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async editUser() {
        console.log('✏️ Edit user clicked');
        // TODO: Implement edit user functionality
    }

    async sendPasswordReset() {
        if (!this.currentUser || !window.supabase) return;
        
        try {
            console.log('🔑 Sending password reset email...');
            
            // Confirm action
            const confirmed = confirm(
                `Send password reset email to:\n\n${this.currentUser.email}\n\n` +
                `The user will receive an email with a link to reset their password.`
            );
            
            if (!confirmed) {
                return;
            }
            
            this.showLoading(true);
            
            // Send password reset email using Supabase
            const { error } = await window.supabase.auth.resetPasswordForEmail(
                this.currentUser.email,
                {
                    redirectTo: `${window.location.origin}/auth/?form=reset-password`
                }
            );
            
            if (error) {
                throw error;
            }
            
            this.showSuccess(`Password reset email sent to ${this.currentUser.email}`);
            console.log('✅ Password reset email sent successfully');
            
            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'password_reset_sent',
                    `Sent password reset email to user: ${this.currentUser.username} (${this.currentUser.email})`
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            this.showError('Failed to send password reset email: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async sendEmail() {
        console.log('📧 Send email clicked');
        // TODO: Implement send email functionality
    }

    async suspendUser() {
        console.log('⏸️ Suspend user clicked');
        // TODO: Implement suspend user functionality
    }

    async deleteUser() {
        console.log('🗑️ Delete user clicked');
        // TODO: Implement delete user functionality
    }

    async permanentDeleteUser() {
        console.log('💥 Permanent delete clicked');
        
        if (!this.currentUser || !window.supabase) return;
        
        // Prevent deleting yourself
        const { data: { user: currentAdmin } } = await window.supabase.auth.getUser();
        if (currentAdmin && currentAdmin.id === this.currentUser.id) {
            this.showError('You cannot delete your own account from the admin panel');
            return;
        }
        
        // Confirm deletion with username verification
        const confirmMessage = `⚠️ DANGER: PERMANENT USER DELETION ⚠️\n\nYou are about to permanently delete the user:\n\nUsername: ${this.currentUser.username}\nEmail: ${this.currentUser.email}\n\nThis action will:\n- Permanently delete the user account\n- Remove ALL user data from the database\n- Revoke all active sessions\n- Cancel all subscriptions\n- Delete all user content\n\n❌ THIS CANNOT BE UNDONE ❌\n\nType "${this.currentUser.username}" to confirm deletion:`;
        
        const confirmation = prompt(confirmMessage);
        
        if (confirmation !== this.currentUser.username) {
            if (confirmation !== null) {
                this.showError('Username confirmation did not match. Deletion cancelled.');
            }
            return;
        }
        
        // Second confirmation
        const doubleConfirm = confirm(`⚠️ FINAL CONFIRMATION ⚠️\n\nAre you ABSOLUTELY SURE you want to delete "${this.currentUser.username}"?\n\nClick OK to DELETE PERMANENTLY or Cancel to abort.`);
        
        if (!doubleConfirm) {
            console.log('❌ Deletion cancelled by admin');
            return;
        }
        
        try {
            console.log('🗑️ Proceeding with permanent deletion...');
            
            // Get current session
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                this.showError('You must be logged in to delete users');
                return;
            }
            
            console.log('🔑 Calling delete-user Edge Function with auth...');
            
            // Call the delete-user Edge Function
            const { data, error } = await window.supabase.functions.invoke('delete-user', {
                body: {
                    user_id: this.currentUser.id,
                    username: this.currentUser.username,
                    reason: 'Deleted by admin from user detail page'
                }
            });
            
            if (error) {
                console.error('❌ Failed to delete user:', error);
                this.showError(`Failed to delete user: ${error.message || 'Unknown error'}`);
                return;
            }
            
            console.log('✅ User permanently deleted:', data);
            alert(`User "${this.currentUser.username}" has been permanently deleted.\n\nYou will now be redirected to the user management page.`);
            
            // Redirect back to user management
            window.location.href = '/admin/?section=users';
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showError(`Failed to delete user: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('User Detail Page Error:', message);
        // TODO: Implement error display in UI
        alert(message); // Temporary fallback
    }

    showSuccess(message) {
        console.log('User Detail Page Success:', message);
        // TODO: Implement success display in UI
        // For now, just log it (we could add a toast notification later)
        if (window.showNotification) {
            window.showNotification(message, 'success');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const userDetailPage = new UserDetailPage();
    
    // Expose globally for onclick handlers
    window.userDetailPage = userDetailPage;
    
    await userDetailPage.init();
});

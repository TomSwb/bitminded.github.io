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
            // Initializing
            
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
            // Initialized
            
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
            age: document.getElementById('user-detail-age'),
            country: document.getElementById('user-detail-country'),
            gender: document.getElementById('user-detail-gender'),
            subscriptionCount: document.getElementById('user-detail-subscription-count'),
            loginCount: document.getElementById('user-detail-login-count'),
            sessionCount: document.getElementById('user-detail-session-count'),
            notesInput: document.getElementById('user-detail-notes-input'),
            saveNotesButton: document.getElementById('user-detail-save-notes'),
            
            // Action buttons
            grantAccessButton: document.getElementById('user-detail-grant-access'),
            revokeSessionsButton: document.getElementById('user-detail-revoke-all-sessions'),
            editUserButton: document.getElementById('user-detail-edit-user'),
            contactUserButton: document.getElementById('user-detail-contact-user'),
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
                // Check if this tab was opened as a new tab (no navigation history)
                // or has an opener (opened via window.open or target="_blank")
                if (window.opener || window.history.length <= 1) {
                    // Close this tab and focus back to the opener
                    window.close();
                    
                    // If window.close() didn't work (browser security), navigate instead
                    setTimeout(() => {
                        if (!window.closed) {
                            window.location.href = '/admin/?section=users';
                        }
                    }, 100);
                } else {
                    // Normal navigation if this tab has history
                    window.location.href = '/admin/?section=users';
                }
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

        if (this.elements.contactUserButton) {
            this.elements.contactUserButton.addEventListener('click', () => this.openContactUser());
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
            console.log('🔄 Loading user data for ID:', userId);
            
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Log admin action - viewing user detail page
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'user_detail_viewed',
                    `Admin viewed user detail page`,
                    userId
                );
            }

            // Query user profile with all related data
            const { data: profileData, error: profileError } = await window.supabase
                .from('user_profiles')
                .select('id, username, avatar_url, created_at, email, status, date_of_birth, country, gender')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('❌ Failed to load user profile:', profileError);
                throw profileError;
            }

            console.log('✅ User profile loaded:', profileData);

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

            // User statistics loaded

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
            // Hiding loading screen
            
            if (window.loadingScreen) {
                // Set translation ready flag to true so loading screen can hide
                window.loadingScreen.setReadyFlag('translation', true);
                // Loading screen ready
            } else {
                // Fallback: hide directly if loading screen component not available
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    console.log('✅ Loading screen hidden directly (fallback)');
                }
            }

            // User data loaded

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
        
        // Personal info (age, country, gender)
        if (this.elements.age) {
            if (userData.date_of_birth) {
                const age = this.calculateAge(new Date(userData.date_of_birth));
                this.elements.age.textContent = age;
            } else {
                this.elements.age.textContent = '-';
            }
        }
        
        if (this.elements.country) {
            if (userData.country) {
                const flag = this.getCountryFlag(userData.country);
                this.elements.country.textContent = `${flag} ${userData.country}`;
            } else {
                this.elements.country.textContent = '-';
            }
        }
        
        if (this.elements.gender) {
            if (userData.gender === 'male') {
                this.elements.gender.innerHTML = '<span style="color: #4A90E2;">♂ Male</span>';
            } else if (userData.gender === 'female') {
                this.elements.gender.innerHTML = '<span style="color: #E91E63;">♀ Female</span>';
            } else if (userData.gender === 'prefer_not_say') {
                this.elements.gender.textContent = 'Prefer not to say';
            } else {
                this.elements.gender.textContent = '-';
            }
        }
        
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

            // Admin notes loaded

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
            case 'overview':
                await this.refreshStats();
                break;
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
            // User subscriptions loaded

        } catch (error) {
            console.error('❌ Error loading subscriptions:', error);
        }
    }

    async loadAdminActivityFilters() {
        try {
            console.log('🔍 Loading Admin Activity Filters component...');
            
            // Check if component already exists
            if (window.adminActivityFilters) {
                console.log('✅ Admin Activity Filters component already loaded');
                return;
            }
            
            // Load CSS (only if not already loaded)
            if (!document.querySelector('link[href*="admin-activity-filters.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/admin/components/user-detail/components/admin-activity-filters/admin-activity-filters.css';
                document.head.appendChild(cssLink);
            }
            
            // Load translations (only if not already loaded)
            if (!document.querySelector('script[src*="admin-activity-filters-translations.js"]')) {
                const translationsScript = document.createElement('script');
                translationsScript.src = '/admin/components/user-detail/components/admin-activity-filters/admin-activity-filters-translations.js';
                document.head.appendChild(translationsScript);
                
                // Wait for translations to load
                await new Promise((resolve) => {
                    translationsScript.onload = resolve;
                });
            }
            
            // Load component script (only if not already loaded)
            if (!document.querySelector('script[src*="admin-activity-filters.js"]')) {
                const componentScript = document.createElement('script');
                componentScript.src = '/admin/components/user-detail/components/admin-activity-filters/admin-activity-filters.js';
                document.head.appendChild(componentScript);
                
                // Wait for component to load
                await new Promise((resolve) => {
                    componentScript.onload = resolve;
                });
            }
            
            // Load HTML
            const response = await fetch('/admin/components/user-detail/components/admin-activity-filters/admin-activity-filters.html');
            const html = await response.text();
            
            // Insert HTML
            const container = document.getElementById('admin-activity-filters-container');
            if (container) {
                container.innerHTML = html;
                
                // Initialize component (only if not already initialized)
                if (!window.adminActivityFilters) {
                    window.adminActivityFilters = new AdminActivityFilters();
                    await window.adminActivityFilters.init();
                }
                
                // Set up event listener for filter changes (only if not already set up)
                if (!this.adminActivityFilterListenerSet) {
                    window.addEventListener('adminActivityFiltered', (event) => {
                        this.renderAdminActivityTable(event.detail.filteredActivities);
                    });
                    this.adminActivityFilterListenerSet = true;
                }
                
                console.log('✅ Admin Activity Filters component loaded');
            }
            
        } catch (error) {
            console.error('❌ Failed to load Admin Activity Filters component:', error);
        }
    }

    async loadLoginActivityFilters() {
        try {
            console.log('🔍 Loading Login Activity Filters component...');
            
            // Check if component already exists
            if (window.loginActivityFilters) {
                console.log('✅ Login Activity Filters component already loaded');
                return;
            }

            // Load CSS (only if not already loaded)
            if (!document.querySelector('link[href*="login-activity-filters.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/admin/components/user-detail/components/login-activity-filters/login-activity-filters.css';
                document.head.appendChild(cssLink);
            }
            
            // Load translations (only if not already loaded)
            if (!document.querySelector('script[src*="login-activity-filters-translations.js"]')) {
                const translationsScript = document.createElement('script');
                translationsScript.src = '/admin/components/user-detail/components/login-activity-filters/login-activity-filters-translations.js';
                document.head.appendChild(translationsScript);
                
                // Wait for translations to load
                await new Promise((resolve) => {
                    translationsScript.onload = resolve;
                });
            }
            
            // Load component script (only if not already loaded)
            if (!document.querySelector('script[src*="login-activity-filters.js"]')) {
                const componentScript = document.createElement('script');
                componentScript.src = '/admin/components/user-detail/components/login-activity-filters/login-activity-filters.js';
                document.head.appendChild(componentScript);
                
                // Wait for component to load
                await new Promise((resolve) => {
                    componentScript.onload = resolve;
                });
            }
            
            // Load HTML
            const response = await fetch('/admin/components/user-detail/components/login-activity-filters/login-activity-filters.html');
            const html = await response.text();
            
            // Insert HTML
            const container = document.getElementById('login-activity-filters-container');
            if (container) {
                container.innerHTML = html;
                
                // Initialize component (only if not already initialized)
                if (!window.loginActivityFilters) {
                    window.loginActivityFilters = new LoginActivityFilters();
                    await window.loginActivityFilters.init();
                }
                
                // Set up event listener for filter changes (only if not already set up)
                if (!this.loginActivityFilterListenerSet) {
                    window.addEventListener('loginActivityFiltered', (event) => {
                        this.renderLoginActivityTable(event.detail.filteredActivities);
                    });
                    this.loginActivityFilterListenerSet = true;
                }
                
                console.log('✅ Login Activity Filters component loaded');
            }
            
        } catch (error) {
            console.error('❌ Failed to load Login Activity Filters component:', error);
        }
    }

    async renderAdminActivityTable(activities) {
        const adminActionsContainer = document.getElementById('user-detail-admin-actions');
        if (!adminActionsContainer) return;
        
        if (!activities || activities.length === 0) {
            adminActionsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No admin actions yet.</p>';
            return;
        }
        
        try {
            // Get usernames for target users
            const userIds = activities
                .filter(action => action.user_id)
                .map(action => action.user_id);
            
            let userMap = {};
            if (userIds.length > 0) {
                const { data: users } = await window.supabase
                    .from('user_profiles')
                    .select('id, username')
                    .in('id', userIds);
                
                if (users) {
                    userMap = users.reduce((acc, user) => {
                        acc[user.id] = user.username;
                        return acc;
                    }, {});
                }
            }
            
            // Create table rows for all activities
            const allRows = activities.map(action => {
                // For user_field_updated actions, show the detailed change info
                let actionDisplay = action.action;
                if (action.action === 'user_field_updated' && action.details) {
                    // Extract the detailed change information from details
                    if (typeof action.details === 'string') {
                        actionDisplay = action.details;
                    } else if (action.details.details) {
                        actionDisplay = action.details.details;
                    }
                }
                
                return `
                <tr style="border-bottom: 1px solid var(--color-primary);">
                    <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.formatDate(action.created_at)}</td>
                    <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.escapeHtml(actionDisplay)}</td>
                    <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${action.user_id ? (userMap[action.user_id] || 'Unknown User') : 'N/A'}</td>
                </tr>
                `;
            }).join('');
            
            adminActionsContainer.innerHTML = `
                <div style="overflow-x: auto;">
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--color-primary); border-radius: var(--border-radius-sm);">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="position: sticky; top: 0; background: var(--color-background-primary); z-index: 10;">
                                <tr style="border-bottom: 1px solid var(--color-primary);">
                                    <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Date/Time</th>
                                    <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Action</th>
                                    <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Target User</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Failed to render admin activity table:', error);
            adminActionsContainer.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: var(--spacing-xl);">Failed to load admin activities.</p>';
        }
    }

    /**
     * Render login activity table with scroll limit
     */
    renderLoginActivityTable(activities) {
            const loginActivityContainer = document.getElementById('user-detail-login-activity');
        if (!loginActivityContainer) return;

        if (!activities || activities.length === 0) {
                    loginActivityContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No login activity yet.</p>';
            return;
        }

                    loginActivityContainer.innerHTML = `
                        <div style="overflow-x: auto;">
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--color-primary); border-radius: var(--border-radius-sm);">
                            <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: var(--color-background-primary); z-index: 10;">
                                    <tr style="border-bottom: 1px solid var(--color-primary);">
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Date/Time</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Status</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Location</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Device</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Browser</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">IP Address</th>
                                        <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">2FA</th>
                                    </tr>
                                </thead>
                                <tbody>
                            ${activities.map(activity => {
                                        const location = activity.location_city && activity.location_country 
                                            ? `${activity.location_city}, ${activity.location_country}`
                                            : activity.location_country || '-';
                                        return `
                                        <tr style="border-bottom: 1px solid var(--color-primary);">
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.formatDate(activity.login_time)}</td>
                                            <td style="padding: var(--spacing-sm);">
                                                <span style="color: ${activity.success ? 'var(--color-success)' : 'var(--color-error)'}; font-weight: 600;">
                                                    ${activity.success ? '✓ Success' : '✗ Failed'}
                                                </span>
                                            </td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${location}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.device_type || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.browser || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary); font-family: monospace;">${activity.ip_address || '-'}</td>
                                            <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${activity.used_2fa ? 'Yes' : 'No'}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                </div>
                        </div>
                    `;
    }

    /**
     * Load activity data
     */
    async loadActivityData() {
        if (!this.currentUser || !window.supabase) return;

        try {
            // Get login activity - load all activities for filtering
            const { data: loginData, error: loginError } = await window.supabase
                .from('user_login_activity')
                .select('login_time, success, ip_address, user_agent, device_type, browser, os, used_2fa, location_city, location_country')
                .eq('user_id', this.currentUser.id)
                .order('login_time', { ascending: false });
                // Removed limit to load ALL login activities

            if (loginError) {
                console.error('❌ Failed to load login activity:', error);
                return;
            }

            // User login activity loaded

            // Display login activity
            const loginActivityContainer = document.getElementById('user-detail-login-activity');
            if (loginActivityContainer) {
                if (!loginData || loginData.length === 0) {
                    loginActivityContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No login activity yet.</p>';
                } else {
                    // Store login activities for filtering
                    this.allLoginActivities = loginData;
                    
                    // Load login activity filters component
                    await this.loadLoginActivityFilters();
                    
                    // Set activities in filter component (wait for component to be ready)
                    if (window.loginActivityFilters) {
                        // Wait a bit for the component to be fully initialized
                        setTimeout(() => {
                            window.loginActivityFilters.setActivities(loginData);
                            // Refresh filter states to restore saved preferences
                            window.loginActivityFilters.refreshFilterStates();
                        }, 100);
                    }
                    
                    // Render the login activity table with scroll limit
                    this.renderLoginActivityTable(loginData);
                }
            }

            // Only show admin actions if user is an admin
            if (this.currentUser.role === 'admin') {
                const { data: adminActions, error: adminError } = await window.supabase
                    .from('admin_activity')
                    .select('action, created_at, admin_id, user_id, details')
                    .eq('admin_id', this.currentUser.id)  // Fixed: query by admin_id, not admin_user_id
                    .order('created_at', { ascending: false });
                    // Removed limit to load ALL activities

                if (!adminError) {
                    // Load admin activity filters component
                    await this.loadAdminActivityFilters();
                    
                    // Admin actions loaded
                    const adminActionsContainer = document.getElementById('user-detail-admin-actions');
                    if (adminActionsContainer) {
                        // Show the parent section
                        const adminActionsSection = adminActionsContainer.closest('.user-detail__section');
                        if (adminActionsSection) {
                            adminActionsSection.style.display = 'block';
                        }
                        
                        // Store activities for filter component
                        this.allAdminActivities = adminActions || [];
                        
                        // Initialize filter component with activities (wait for component to be ready)
                        if (window.adminActivityFilters) {
                            // Wait a bit for the component to be fully initialized
                            setTimeout(() => {
                                window.adminActivityFilters.setActivities(this.allAdminActivities);
                                // Refresh filter states to restore saved preferences
                                window.adminActivityFilters.refreshFilterStates();
                            }, 100);
                        }
                        
                        // Render initial table
                        this.renderAdminActivityTable(this.allAdminActivities);
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

            // Security tab loaded

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
                    `Revoked all sessions for user: ${this.currentUser.username} (${this.currentUser.email})`,
                    this.currentUser.id
                );
            }
            
            // Refresh the session management component
            if (this.sessionManagement) {
                await this.sessionManagement.refresh();
            }
            
            // Refresh the overview stats to update session count
            await this.refreshStats();
            
        } catch (error) {
            console.error('❌ Failed to revoke all sessions:', error);
            this.showError('Failed to revoke all sessions: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Refresh user statistics (for updating counts after changes)
     */
    async refreshStats() {
        try {
            // Refreshing stats
            
            // Call get-user-sessions Edge Function to get accurate count
            // (it also cleans up stale sessions, ensuring accurate count)
            const { data: sessionsData, error } = await window.supabase.functions.invoke('get-user-sessions', {
                body: { user_id: this.currentUser.id }
            });
            
            if (error) {
                console.error('❌ Error fetching sessions:', error);
                throw error;
            }
            
            // Sessions data received
            
            // Count the active sessions returned
            const activeSessionCount = sessionsData?.sessions?.length || 0;
            this.currentUser.active_sessions = activeSessionCount;
            
            // Active sessions updated
            
            // Update display
            if (this.elements.sessionCount) {
                this.elements.sessionCount.textContent = this.currentUser.active_sessions;
                // Session count updated
            } else {
                console.warn('⚠️ sessionCount element not found!');
            }
        } catch (error) {
            console.error('❌ Could not refresh stats:', error);
        }
    }

    async editUser() {
        console.log('✏️ Edit user clicked');
        
        if (!this.currentUser) {
            this.showError('No user data available');
            return;
        }

        try {
            // Check if component is already loaded
            const formContainer = document.getElementById('edit-user-form-container');
            if (!formContainer) {
                this.showError('Edit user form container not found');
                return;
            }

            // If component is already loaded, just show it
            if (this.editUserComponent) {
                formContainer.classList.remove('hidden');
                this.editUserComponent.showEditForm();
                return;
            }

            // Load edit user component HTML
            const response = await fetch('/admin/components/user-detail/components/edit-user/edit-user.html');
            const html = await response.text();
            
            // Load component into the container
            formContainer.innerHTML = html;
            formContainer.classList.remove('hidden');
            
            // Load component CSS
            if (!document.querySelector('link[href*="edit-user.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/admin/components/user-detail/components/edit-user/edit-user.css';
                document.head.appendChild(link);
            }
            
            // Load component JS and initialize
            if (!window.EditUser) {
                await this.loadScript('/admin/components/user-detail/components/edit-user/edit-user.js');
            }
            
            // Load translation system
            if (!window.editUserTranslations) {
                await this.loadScript('/admin/components/user-detail/components/edit-user/edit-user-translations.js');
            }
            
            // Initialize edit user component
            if (window.EditUser) {
                const editUserComponent = new window.EditUser();
                await editUserComponent.init(this.currentUser);
                this.editUserComponent = editUserComponent;
                
                // Listen for user update events
                window.addEventListener('userUpdated', (event) => {
                    console.log('🔄 User updated from edit component:', event.detail);
                    // Reload user data and refresh UI - always reload the current user being viewed
                    this.loadUserData(this.currentUser.id);
                });

                // Listen for close events
                window.addEventListener('editUserClosed', () => {
                    console.log('🔄 Edit user form closed');
                    formContainer.classList.add('hidden');
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to load edit user component:', error);
            this.showError('Failed to load edit user component');
        }
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
                    `Sent password reset email to user: ${this.currentUser.username} (${this.currentUser.email})`,
                    this.currentUser.id
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            this.showError('Failed to send password reset email: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async openContactUser() {
        console.log('📧 Contact user clicked');
        
        if (!this.currentUser) {
            console.error('❌ No user data available');
            return;
        }

        // Open contact user page in new tab
        const contactUrl = `/admin/components/user-detail/components/user-communication/contact-user.html?userId=${this.currentUser.id}&username=${encodeURIComponent(this.currentUser.username)}`;
        window.open(contactUrl, '_blank');
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
            return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    getCountryFlag(countryName) {
        // Map country names to flag emojis (same as personal-info component)
        const flagMap = {
            'Switzerland': '🇨🇭', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
            'France': '🇫🇷', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
            'Japan': '🇯🇵', 'China': '🇨🇳', 'India': '🇮🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
            'Argentina': '🇦🇷', 'South Korea': '🇰🇷', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
            'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Austria': '🇦🇹',
            'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Ireland': '🇮🇪', 'New Zealand': '🇳🇿',
            'Singapore': '🇸🇬', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Philippines': '🇵🇭',
            'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'South Africa': '🇿🇦', 'Egypt': '🇪🇬',
            'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Czech Republic': '🇨🇿',
            'Romania': '🇷🇴', 'Hungary': '🇭🇺', 'Israel': '🇮🇱', 'Saudi Arabia': '🇸🇦',
            'United Arab Emirates': '🇦🇪', 'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Chile': '🇨🇱',
            'Colombia': '🇨🇴', 'Peru': '🇵🇪', 'Venezuela': '🇻🇪', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪',
            'Morocco': '🇲🇦', 'Algeria': '🇩🇿', 'Tunisia': '🇹🇳', 'Lebanon': '🇱🇧', 'Jordan': '🇯🇴',
            'Iraq': '🇮🇶', 'Iran': '🇮🇷', 'Afghanistan': '🇦🇫', 'Sri Lanka': '🇱🇰', 'Nepal': '🇳🇵',
            'Iceland': '🇮🇸', 'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Bulgaria': '🇧🇬', 'Slovakia': '🇸🇰',
            'Slovenia': '🇸🇮', 'Lithuania': '🇱🇹', 'Latvia': '🇱🇻', 'Estonia': '🇪🇪',
            'Luxembourg': '🇱🇺', 'Malta': '🇲🇹', 'Cyprus': '🇨🇾', 'Taiwan': '🇹🇼', 'Hong Kong': '🇭🇰'
        };
        
        return flagMap[countryName] || '🌍';
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

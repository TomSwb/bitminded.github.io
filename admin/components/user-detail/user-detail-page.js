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
            window.logger?.log('User Detail Page: Already initialized');
            return;
        }

        try {
            // Initializing
            
            // Check authentication and admin access
            const hasAccess = await this.checkAdminAccess();
            if (!hasAccess) {
                window.logger?.log('🔒 Access denied, redirecting...');
                window.location.href = '/';
                return;
            }

            this.cacheElements();
            this.setupEventListeners();
            
            // Get user ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('id');
            
            if (!userId) {
                window.logger?.error('❌ No user ID provided');
                this.showError('No user ID provided');
                return;
            }

            // Load user data
            await this.loadUserData(userId);
            
            this.isInitialized = true;
            // Initialized
            
        } catch (error) {
            window.logger?.error('❌ User Detail Page: Failed to initialize:', error);
            this.showError('Failed to initialize user detail page');
        }
    }

    /**
     * Check if user has admin access
     */
    async checkAdminAccess() {
        try {
            if (!window.supabase) {
                window.logger?.error('❌ Supabase not available');
                return false;
            }

            // Check authentication
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                window.logger?.log('🔒 User not authenticated');
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
                window.logger?.log('🔒 User is not admin');
                return false;
            }

            return true;

        } catch (error) {
            window.logger?.error('❌ Error checking admin access:', error);
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
            language: document.getElementById('user-detail-language'),
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
            permanentDeleteButton: document.getElementById('user-detail-permanent-delete')
        };

        // Validate required elements
        const requiredElements = ['username', 'email', 'backButton'];
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                window.logger?.warn(`Required element not found: ${elementName}`);
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


        if (this.elements.permanentDeleteButton) {
            this.elements.permanentDeleteButton.addEventListener('click', () => this.permanentDeleteUser());
        }

        // Language change listener
        window.addEventListener('languageChanged', () => {
            this.updateButtonTranslations();
        });
    }

    /**
     * Load user data from database
     */
    async loadUserData(userId) {
        try {
            window.logger?.log('🔄 Loading user data for ID:', userId);
            
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
                .select('id, username, avatar_url, created_at, email, status, date_of_birth, country, gender, language')
                .eq('id', userId)
                .single();

            if (profileError) {
                window.logger?.error('❌ Failed to load user profile:', profileError);
                throw profileError;
            }

            window.logger?.log('✅ User profile loaded:', profileData);

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
                    window.logger?.warn('⚠️ 2FA table query failed:', error);
                }
            } catch (error) {
                window.logger?.warn('⚠️ 2FA table does not exist or has different structure:', error);
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
            this.updateSuspendButton();
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
                    window.logger?.log('✅ Loading screen hidden directly (fallback)');
                }
            }

            // User data loaded

        } catch (error) {
            window.logger?.error('❌ Failed to load user data:', error);
            this.showError('Failed to load user data');
            
            // Hide loading screen (error case) using proper ready flag system
            window.logger?.log('🔧 Hiding loading screen (error case)...');
            
            if (window.loadingScreen) {
                // Set translation ready flag to true so loading screen can hide
                window.loadingScreen.setReadyFlag('translation', true);
                window.logger?.log('✅ Loading screen ready flag set (error case)');
            } else {
                // Fallback: hide directly if loading screen component not available
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    window.logger?.log('✅ Loading screen hidden directly (error case fallback)');
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
        
        if (this.elements.language) {
            if (userData.language) {
                const languageMap = {
                    'en': '🇬🇧 English',
                    'es': '🇪🇸 Spanish', 
                    'fr': '🇫🇷 French',
                    'de': '🇩🇪 German'
                };
                this.elements.language.textContent = languageMap[userData.language] || userData.language;
            } else {
                this.elements.language.textContent = '-';
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
            window.logger?.error('❌ Failed to load overview data:', error);
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
                window.logger?.error('❌ Failed to load admin notes:', error);
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
            window.logger?.error('❌ Error loading admin notes:', error);
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
            // Load user access management component HTML
            const response = await fetch('/admin/components/user-detail/components/user-access-management/user-access-management.html');
            const html = await response.text();
            
            const container = document.getElementById('user-access-management-container');
            if (container) {
                container.innerHTML = html;
                
                // Load component CSS
                if (!document.querySelector('link[href*="user-access-management.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/admin/components/user-detail/components/user-access-management/user-access-management.css';
                    document.head.appendChild(link);
                }
                
                // Load component JS and initialize
                if (!window.UserAccessManagement) {
                    await this.loadScript('/admin/components/user-detail/components/user-access-management/user-access-management.js');
                }
                
                // Load translations
                if (!window.userAccessManagementTranslations) {
                    await this.loadScript('/admin/components/user-detail/components/user-access-management/user-access-management-translations.js');
                }
                
                // Initialize user access management component
                if (window.UserAccessManagement) {
                    if (!this.userAccessManagement) {
                        this.userAccessManagement = new window.UserAccessManagement();
                    }
                    await this.userAccessManagement.init(this.currentUser.id, this.currentUser);
                }
            }

        } catch (error) {
            window.logger?.error('❌ Error loading subscriptions data:', error);
        }
    }

    async loadAdminActivityFilters() {
        try {
            window.logger?.log('🔍 Loading Admin Activity Filters component...');
            
            // Check if component already exists
            if (window.adminActivityFilters) {
                window.logger?.log('✅ Admin Activity Filters component already loaded');
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
                
                window.logger?.log('✅ Admin Activity Filters component loaded');
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to load Admin Activity Filters component:', error);
        }
    }

    async loadCommunicationActivityFilters() {
        try {
            window.logger?.log('🔍 Loading Communication Activity Filters component...');
            
            // Load CSS
            if (!document.querySelector('link[href*="communication-activity-filters.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/admin/components/user-detail/components/communication-activity-filters/communication-activity-filters.css';
                document.head.appendChild(cssLink);
            }

            // Load translations
            if (!document.querySelector('script[src*="communication-activity-filters-translations.js"]')) {
                const translationsScript = document.createElement('script');
                translationsScript.src = '/admin/components/user-detail/components/communication-activity-filters/communication-activity-filters-translations.js';
                document.head.appendChild(translationsScript);
                
                // Wait for translations to load
                await new Promise((resolve) => {
                    translationsScript.onload = resolve;
                });
            }

            // Load component script
            if (!document.querySelector('script[src*="communication-activity-filters.js"]')) {
                const componentScript = document.createElement('script');
                componentScript.src = '/admin/components/user-detail/components/communication-activity-filters/communication-activity-filters.js';
                document.head.appendChild(componentScript);
                
                // Wait for component to load
                await new Promise((resolve) => {
                    componentScript.onload = resolve;
                });
            }

            // Load HTML content
            const response = await fetch('/admin/components/user-detail/components/communication-activity-filters/communication-activity-filters.html');
            const htmlContent = await response.text();
            
            const container = document.getElementById('communication-activity-filters-container');
            if (container) {
                container.innerHTML = htmlContent;
                
                // Initialize the component
                if (window.CommunicationActivityFilters) {
                    window.communicationActivityFilters = new window.CommunicationActivityFilters();
                    await window.communicationActivityFilters.init();
                }
                
                    // Set up communication activity filter listener
                    if (window.communicationActivityFilters && !this.communicationActivityFilterListenerSet) {
                        window.addEventListener('communicationFiltersChanged', (event) => {
                            window.logger?.log('📧 Communication filters changed:', event.detail.filters);
                            this.renderCommunicationActivityTable(event.detail.filteredActivities);
                        });
                        this.communicationActivityFilterListenerSet = true;
                    }
                    
                    window.logger?.log('✅ Communication Activity Filters component loaded');
            }
        } catch (error) {
            window.logger?.error('❌ Failed to load communication activity filters:', error);
        }
    }

    async loadLoginActivityFilters() {
        try {
            window.logger?.log('🔍 Loading Login Activity Filters component...');
            
            // Check if component already exists
            if (window.loginActivityFilters) {
                window.logger?.log('✅ Login Activity Filters component already loaded');
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
                
                window.logger?.log('✅ Login Activity Filters component loaded');
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to load Login Activity Filters component:', error);
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
            window.logger?.error('❌ Failed to render admin activity table:', error);
            adminActionsContainer.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: var(--spacing-xl);">Failed to load admin activities.</p>';
        }
    }

    /**
     * Render login activity table with scroll limit
     */
    renderCommunicationActivityTable(communications) {
        const communicationActivityContainer = document.getElementById('user-detail-communication-activity');
        if (!communicationActivityContainer) return;

        if (!communications || communications.length === 0) {
            communicationActivityContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No communications yet.</p>';
            return;
        }

        communicationActivityContainer.innerHTML = `
            <div style="overflow-x: auto;">
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--color-primary); border-radius: var(--border-radius-sm);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: var(--color-background-primary); z-index: 10;">
                            <tr style="border-bottom: 1px solid var(--color-primary);">
                                <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Type</th>
                                <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Subject</th>
                                <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Date/Time</th>
                                <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Sender</th>
                                <th style="padding: var(--spacing-sm); text-align: center; color: var(--color-secondary);">Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${communications.map(communication => {
                                const typeIcon = communication.type === 'email' ? '📧' : '🔔';
                                const typeText = communication.type === 'email' ? 'Email' : 'Notification';
                                const subject = communication.subject || (communication.type === 'notification' ? 'In-app Notification' : 'No Subject');
                                const messagePreview = communication.body ? 
                                    (communication.body.length > 100 ? communication.body.substring(0, 100) + '...' : communication.body) : 
                                    'No message content';
                                
                                return `
                                    <tr style="border-bottom: 1px solid var(--color-primary);">
                                        <td style="padding: var(--spacing-sm); color: var(--color-text-primary); text-align: center;">
                                            <span style="display: inline-flex; align-items: center; gap: var(--spacing-xs);">
                                                <span style="font-size: 1.2em;">${typeIcon}</span>
                                                <span>${typeText}</span>
                                            </span>
                                        </td>
                                        <td style="padding: var(--spacing-sm); color: var(--color-text-primary); max-width: 200px;">
                                            <span style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${subject}">
                                                ${subject}
                                            </span>
                                        </td>
                                        <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">${this.formatDate(communication.created_at)}</td>
                                        <td style="padding: var(--spacing-sm); color: var(--color-text-primary);">
                                            <span style="font-family: monospace; font-size: var(--font-size-sm);">${communication.sender_email || 'System'}</span>
                                        </td>
                                        <td style="padding: var(--spacing-sm); color: var(--color-text-primary); max-width: 300px;">
                                            <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${messagePreview}">
                                                    ${messagePreview}
                                                </span>
                                                <button onclick="window.userDetailPage.showMessageModal('${communication.id}', '${communication.type}', '${subject.replace(/'/g, "\\'")}', '${communication.body.replace(/'/g, "\\'").replace(/\n/g, '\\n')}', '${communication.sender_email || 'System'}', '${this.formatDate(communication.created_at)}')" 
                                                        style="padding: var(--spacing-xs); border: 1px solid var(--color-primary); border-radius: var(--border-radius-xs); background: var(--color-background-primary); color: var(--color-primary); cursor: pointer; font-size: var(--font-size-xs);">
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

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
            // Get communication activity - load all communications for filtering
            const { data: communicationData, error: communicationError } = await window.supabase
                .from('user_communications')
                .select('id, type, subject, body, created_at, sender_email, signature_used, language_used')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (communicationError) {
                window.logger?.error('❌ Failed to load communication activity:', communicationError);
            } else {
                // User communication activity loaded
                window.logger?.log('📧 Communication activity loaded:', communicationData?.length || 0, 'communications');

                // Display communication activity
                const communicationActivityContainer = document.getElementById('user-detail-communication-activity');
                if (communicationActivityContainer) {
                    if (!communicationData || communicationData.length === 0) {
                        communicationActivityContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic; text-align: center; padding: var(--spacing-xl);">No communications yet.</p>';
                    } else {
                        // Store communication activities for filtering
                        this.allCommunicationActivities = communicationData;
                        
                        // Load communication activity filters component
                        await this.loadCommunicationActivityFilters();
                        
                        // Set activities in filter component (wait for component to be ready)
                        if (window.communicationActivityFilters) {
                            // Wait a bit for the component to be fully initialized
                            setTimeout(() => {
                                window.communicationActivityFilters.populateFilterOptions(communicationData);
                            }, 100);
                        }
                        
                        // Render the communication activity table
                        this.renderCommunicationActivityTable(communicationData);
                    }
                }
            }

            // Get login activity - load all activities for filtering
            const { data: loginData, error: loginError } = await window.supabase
                .from('user_login_activity')
                .select('login_time, success, ip_address, user_agent, device_type, browser, os, used_2fa, location_city, location_country')
                .eq('user_id', this.currentUser.id)
                .order('login_time', { ascending: false });
                // Removed limit to load ALL login activities

            if (loginError) {
                window.logger?.error('❌ Failed to load login activity:', error);
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
            window.logger?.error('❌ Error loading activity:', error);
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
            window.logger?.error('❌ Error loading security data:', error);
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
        window.logger?.log('💾 Save notes clicked');
        
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
                window.logger?.error('❌ Failed to save note:', error);
                this.showError('Failed to save note');
                return;
            }
            
            window.logger?.log('✅ Note saved:', data);
            this.showSuccess('Note saved successfully');
            
            // Clear the input
            notesInput.value = '';
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            window.logger?.error('❌ Error saving note:', error);
            this.showError('Failed to save note');
        }
    }

    /**
     * Edit a note
     */
    editNote(index) {
        window.logger?.log('✏️ Edit note:', index);
        
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
        window.logger?.log('❌ Cancel edit note:', index);
        
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
        window.logger?.log('💾 Update note:', noteId);
        
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
                window.logger?.error('❌ Failed to update note:', error);
                this.showError('Failed to update note');
                return;
            }
            
            window.logger?.log('✅ Note updated');
            this.showSuccess('Note updated successfully');
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            window.logger?.error('❌ Error updating note:', error);
            this.showError('Failed to update note');
        }
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        window.logger?.log('🗑️ Delete note:', noteId);
        
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
                window.logger?.error('❌ Failed to delete note:', error);
                this.showError('Failed to delete note');
                return;
            }
            
            window.logger?.log('✅ Note deleted');
            this.showSuccess('Note deleted successfully');
            
            // Reload notes
            await this.loadAdminNotes();
            
        } catch (error) {
            window.logger?.error('❌ Error deleting note:', error);
            this.showError('Failed to delete note');
        }
    }

    async grantAccess() {
        window.logger?.log('🎁 Grant access clicked');
        // Open grant access modal from user access management component
        if (this.userAccessManagement && typeof this.userAccessManagement.openGrantAccessModal === 'function') {
            this.userAccessManagement.openGrantAccessModal();
        } else {
            window.logger?.error('❌ User access management component not initialized');
            alert('Please wait for the page to load completely');
        }
    }

    async revokeAllSessions() {
        if (!this.currentUser || !window.supabase) return;
        
        try {
            window.logger?.log('🚫 Revoking all sessions for user:', this.currentUser.email);
            
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
            window.logger?.log('✅ All sessions revoked successfully');
            
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
            window.logger?.error('❌ Failed to revoke all sessions:', error);
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
            const sessionsData = await window.invokeEdgeFunction('get-user-sessions', {
                body: { user_id: this.currentUser.id }
            });
            
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
                window.logger?.warn('⚠️ sessionCount element not found!');
            }
        } catch (error) {
            window.logger?.error('❌ Could not refresh stats:', error);
        }
    }

    async editUser() {
        window.logger?.log('✏️ Edit user clicked');
        
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
                    window.logger?.log('🔄 User updated from edit component:', event.detail);
                    // Reload user data and refresh UI - always reload the current user being viewed
                    this.loadUserData(this.currentUser.id);
                });

                // Listen for close events
                window.addEventListener('editUserClosed', () => {
                    window.logger?.log('🔄 Edit user form closed');
                    formContainer.classList.add('hidden');
                });
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to load edit user component:', error);
            this.showError('Failed to load edit user component');
        }
    }

    async sendPasswordReset() {
        if (!this.currentUser || !window.supabase) return;
        
        try {
            window.logger?.log('🔑 Sending password reset email...');
            
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
            window.logger?.log('✅ Password reset email sent successfully');
            
            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'password_reset_sent',
                    `Sent password reset email to user: ${this.currentUser.username} (${this.currentUser.email})`,
                    this.currentUser.id
                );
            }
            
        } catch (error) {
            window.logger?.error('❌ Failed to send password reset email:', error);
            this.showError('Failed to send password reset email: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async openContactUser() {
        window.logger?.log('📧 Contact user clicked');
        
        if (!this.currentUser) {
            window.logger?.error('❌ No user data available');
            return;
        }

        // Open contact user page in new tab
        const contactUrl = `/admin/components/user-detail/components/user-communication/contact-user.html?userId=${this.currentUser.id}&username=${encodeURIComponent(this.currentUser.username)}`;
        window.open(contactUrl, '_blank');
    }

    async suspendUser() {
        if (!this.currentUser) {
            window.logger?.error('❌ No current user to suspend');
            return;
        }

        // Check if user is already suspended - if so, reactivate
        if (this.currentUser.status === 'suspended') {
            await this.reactivateUser();
            return;
        }

        // Show confirmation modal
        const confirmed = await this.showSuspendConfirmation();
        if (!confirmed) return;

        try {
            // Update user status to suspended
            const { error } = await window.supabase
                .from('user_profiles')
                .update({ 
                    status: 'suspended',
                    suspended_at: new Date().toISOString(),
                    suspended_by: (await window.supabase.auth.getUser()).data.user.id,
                    suspension_reason: confirmed.reason,
                    suspension_followup_sent: false
                })
                .eq('id', this.currentUser.id);

            if (error) {
                window.logger?.error('❌ Failed to suspend user:', error);
                this.showAlert('Failed to suspend user', 'error');
                return;
            }

            // Send suspension email notification
            try {
                const emailResult = await window.invokeEdgeFunction('send-suspension-email', {
                    body: {
                        user_id: this.currentUser.id,
                        suspension_reason: confirmed.reason
                    }
                });
                
                if (emailResult.error) {
                    window.logger?.error('❌ Failed to send suspension email:', emailResult.error);
                } else {
                    window.logger?.log('✅ Suspension email sent:', emailResult);
                }
            } catch (emailError) {
                window.logger?.error('❌ Error sending suspension email:', emailError);
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'suspend_user',
                    `Suspended user: ${this.currentUser.username}`,
                    this.currentUser.id,
                    { reason: confirmed.reason || 'No reason provided' }
                );
            }

            // Update local user data
            this.currentUser.status = 'suspended';
            this.currentUser.suspended_at = new Date().toISOString();
            this.currentUser.suspension_reason = confirmed.reason;

            // Update UI
            this.updateUserStatusDisplay();
            this.updateSuspendButton();

            // Show success notification
            this.showAlert(`User ${this.currentUser.username} has been suspended`, 'success');

            window.logger?.log('✅ User suspended successfully');

        } catch (error) {
            window.logger?.error('❌ Error suspending user:', error);
            this.showAlert('An error occurred while suspending the user', 'error');
        }
    }

    async reactivateUser() {
        // Show confirmation for reactivation
        const confirmed = await this.showReactivateConfirmation();
        if (!confirmed) return;

        try {
            // Update user status to active
            const { error } = await window.supabase
                .from('user_profiles')
                .update({ 
                    status: 'active',
                    suspended_at: null,
                    suspended_by: null,
                    suspension_reason: null,
                    suspension_followup_sent: false,
                    reactivated_at: new Date().toISOString(),
                    reactivated_by: (await window.supabase.auth.getUser()).data.user.id,
                    reactivation_reason: confirmed.reason || null
                })
                .eq('id', this.currentUser.id);

            if (error) {
                window.logger?.error('❌ Failed to reactivate user:', error);
                this.showAlert('Failed to reactivate user', 'error');
                return;
            }

            // Send reactivation email notification
            try {
                const emailResult = await window.invokeEdgeFunction('send-reactivation-email', {
                    body: {
                        user_id: this.currentUser.id,
                        reactivation_reason: confirmed.reason
                    }
                });
                
                if (emailResult.error) {
                    window.logger?.error('❌ Failed to send reactivation email:', emailResult.error);
                } else {
                    window.logger?.log('✅ Reactivation email sent:', emailResult);
                }
            } catch (emailError) {
                window.logger?.error('❌ Error sending reactivation email:', emailError);
            }

            // Log admin action
            if (window.adminLayout) {
                await window.adminLayout.logAdminAction(
                    'reactivate_user',
                    `Reactivated user: ${this.currentUser.username}`,
                    this.currentUser.id,
                    { reason: confirmed.reason || 'No reason provided' }
                );
            }

            // Update local user data
            this.currentUser.status = 'active';
            this.currentUser.suspended_at = null;
            this.currentUser.suspended_by = null;
            this.currentUser.suspension_reason = null;
            this.currentUser.reactivated_at = new Date().toISOString();
            this.currentUser.reactivation_reason = confirmed.reason;

            // Update UI
            this.updateUserStatusDisplay();
            this.updateSuspendButton();

            // Show success notification
            this.showAlert(`User ${this.currentUser.username} has been reactivated`, 'success');

            window.logger?.log('✅ User reactivated successfully');

        } catch (error) {
            window.logger?.error('❌ Error reactivating user:', error);
            this.showAlert('An error occurred while reactivating the user', 'error');
        }
    }

    showAlert(message, type = 'info') {
        // Create a simple alert notification
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                alertDiv.style.backgroundColor = '#28a745';
                break;
            case 'error':
                alertDiv.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                alertDiv.style.backgroundColor = '#ffc107';
                alertDiv.style.color = '#000';
                break;
            default:
                alertDiv.style.backgroundColor = '#17a2b8';
        }

        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    async showSuspendConfirmation() {
        return new Promise((resolve) => {
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--color-background-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--border-radius-md);
                padding: var(--spacing-lg);
                max-width: 500px;
                margin: var(--spacing-md);
                box-shadow: var(--shadow-lg);
            `;

            modalContent.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <h3 style="margin: 0 0 var(--spacing-sm) 0; color: var(--color-text-primary); display: flex; align-items: center; gap: var(--spacing-sm);">
                        <span style="font-size: 1.5em;">⚠️</span>
                        <span>Suspend User</span>
                    </h3>
                    <p style="margin: 0; color: var(--color-text-primary);">
                        Are you sure you want to suspend <strong>${this.currentUser.username}</strong>? 
                        This will prevent them from accessing their account.
                    </p>
                </div>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); color: var(--color-text-primary); font-weight: 600;">
                        Reason for suspension (required):
                    </label>
                    <textarea 
                        id="suspend-reason" 
                        placeholder="Enter the reason for suspending this user..."
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); background: var(--color-background-primary); color: var(--color-text-primary); font-family: inherit; resize: vertical; min-height: 80px;"
                        required></textarea>
                </div>
                
                <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                    <button id="suspend-cancel" style="padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); background: var(--color-background-primary); color: var(--color-text-primary); cursor: pointer;">
                        Cancel
                    </button>
                    <button id="suspend-confirm" style="padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-error); border-radius: var(--border-radius-sm); background: var(--color-error); color: var(--color-background-primary); cursor: pointer;">
                        Suspend User
                    </button>
                </div>
            `;

            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);

            // Focus on reason textarea
            const reasonTextarea = modalContent.querySelector('#suspend-reason');
            reasonTextarea.focus();

            // Event handlers
            const cancelBtn = modalContent.querySelector('#suspend-cancel');
            const confirmBtn = modalContent.querySelector('#suspend-confirm');

            const cleanup = () => {
                document.body.removeChild(modalOverlay);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                const reason = reasonTextarea.value.trim();
                if (!reason) {
                    reasonTextarea.style.borderColor = 'var(--color-error)';
                    reasonTextarea.focus();
                    return;
                }
                cleanup();
                resolve({ reason });
            });

            // Close on overlay click
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    async showReactivateConfirmation() {
        return new Promise((resolve) => {
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--color-background-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--border-radius-md);
                padding: var(--spacing-lg);
                max-width: 500px;
                margin: var(--spacing-md);
                box-shadow: var(--shadow-lg);
            `;

            modalContent.innerHTML = `
                <div style="margin-bottom: var(--spacing-md);">
                    <h3 style="margin: 0 0 var(--spacing-sm) 0; color: var(--color-text-primary); display: flex; align-items: center; gap: var(--spacing-sm);">
                        <span style="font-size: 1.5em;">✅</span>
                        <span>Reactivate User</span>
                    </h3>
                    <p style="margin: 0; color: var(--color-text-primary);">
                        Are you sure you want to reactivate <strong>${this.currentUser.username}</strong>? 
                        This will restore their access to the account.
                    </p>
                </div>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <label style="display: block; margin-bottom: var(--spacing-xs); color: var(--color-text-primary); font-weight: 600;">
                        Reason for reactivation (optional):
                    </label>
                    <textarea 
                        id="reactivate-reason" 
                        placeholder="Enter the reason for reactivating this user..."
                        style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); background: var(--color-background-primary); color: var(--color-text-primary); font-family: inherit; resize: vertical; min-height: 80px;"
                    ></textarea>
                </div>
                
                <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                    <button id="reactivate-cancel" style="padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); background: var(--color-background-primary); color: var(--color-text-primary); cursor: pointer;">
                        Cancel
                    </button>
                    <button id="reactivate-confirm" style="padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-success); border-radius: var(--border-radius-sm); background: var(--color-success); color: var(--color-background-primary); cursor: pointer;">
                        Reactivate User
                    </button>
                </div>
            `;

            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);

            // Focus on reason textarea
            const reasonTextarea = modalContent.querySelector('#reactivate-reason');
            reasonTextarea.focus();

            // Event handlers
            const cancelBtn = modalContent.querySelector('#reactivate-cancel');
            const confirmBtn = modalContent.querySelector('#reactivate-confirm');

            const cleanup = () => {
                document.body.removeChild(modalOverlay);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                const reason = reasonTextarea.value.trim();
                cleanup();
                resolve({ reason });
            });

            // Close on overlay click
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    updateUserStatusDisplay() {
        // Update status badge
        if (this.elements.statusBadge) {
            this.elements.statusBadge.textContent = this.currentUser.status;
            this.elements.statusBadge.className = `user-detail__badge user-detail__badge--status ${this.currentUser.status}`;
        }

        // Update status value in overview
        if (this.elements.statusValue) {
            this.elements.statusValue.textContent = this.currentUser.status;
        }
    }

    updateSuspendButton() {
        if (!this.elements.suspendUserButton) return;

        const buttonSpan = this.elements.suspendUserButton.querySelector('.translatable-content');
        if (!buttonSpan) return;

        if (this.currentUser.status === 'suspended') {
            buttonSpan.setAttribute('data-translation-key', 'reactivate_user');
            buttonSpan.textContent = 'Reactivate User'; // Fallback text
            this.elements.suspendUserButton.className = 'user-detail__action-button user-detail__action-button--success';
        } else {
            buttonSpan.setAttribute('data-translation-key', 'suspend_user');
            buttonSpan.textContent = 'Suspend User'; // Fallback text
            this.elements.suspendUserButton.className = 'user-detail__action-button user-detail__action-button--warning';
        }

        // Update translations for the new button content
        this.updateButtonTranslations();
    }

    updateButtonTranslations() {
        // Apply translations to the suspend button's translatable content
        const buttonSpan = this.elements.suspendUserButton?.querySelector('.translatable-content');
        if (buttonSpan && window.i18next && window.i18next.isInitialized) {
            const key = buttonSpan.getAttribute('data-translation-key');
            if (key) {
                let translation = window.i18next.t(key);
                
                // If translation not found, try converting to snake_case
                if (translation === key) {
                    const snakeCaseKey = key
                        .replace(/\s+/g, '_')
                        .replace(/-/g, '_')
                        .toLowerCase();
                    translation = window.i18next.t(snakeCaseKey);
                }
                
                if (translation && translation !== key) {
                    buttonSpan.textContent = translation;
                }
            }
        }
    }


    async permanentDeleteUser() {
        window.logger?.log('💥 Permanent delete clicked');
        
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
            window.logger?.log('❌ Deletion cancelled by admin');
            return;
        }
        
        try {
            window.logger?.log('🗑️ Proceeding with permanent deletion...');
            
            // Get current session
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                this.showError('You must be logged in to delete users');
                return;
            }
            
            window.logger?.log('🔑 Calling delete-user Edge Function with auth...');
            
            // Call the delete-user Edge Function
            const data = await window.invokeEdgeFunction('delete-user', {
                body: {
                    user_id: this.currentUser.id,
                    username: this.currentUser.username,
                    reason: 'Deleted by admin from user detail page'
                }
            });
            
            window.logger?.log('✅ User permanently deleted:', data);
            alert(`User "${this.currentUser.username}" has been permanently deleted.\n\nYou will now be redirected to the user management page.`);
            
            // Redirect back to user management
            window.location.href = '/admin/?section=users';
            
        } catch (error) {
            window.logger?.error('❌ Error deleting user:', error);
            this.showError(`Failed to delete user: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Format date for display
     */
    showMessageModal(id, type, subject, body, sender, date) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--color-background-primary);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius-md);
            padding: var(--spacing-lg);
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            margin: var(--spacing-md);
            box-shadow: var(--shadow-lg);
        `;

        const typeIcon = type === 'email' ? '📧' : '🔔';
        const typeText = type === 'email' ? 'Email' : 'Notification';

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm);">
                <h3 style="margin: 0; color: var(--color-text-primary); display: flex; align-items: center; gap: var(--spacing-sm);">
                    <span style="font-size: 1.5em;">${typeIcon}</span>
                    <span>${typeText} Details</span>
                </h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--color-text-secondary); padding: var(--spacing-xs);">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: var(--spacing-md);">
                <strong style="color: var(--color-text-primary);">Subject:</strong>
                <p style="margin: var(--spacing-xs) 0; color: var(--color-text-primary); word-wrap: break-word;">${subject}</p>
            </div>
            
            <div style="margin-bottom: var(--spacing-md);">
                <strong style="color: var(--color-text-primary);">From:</strong>
                <p style="margin: var(--spacing-xs) 0; color: var(--color-text-primary); font-family: monospace;">${sender}</p>
            </div>
            
            <div style="margin-bottom: var(--spacing-md);">
                <strong style="color: var(--color-text-primary);">Date:</strong>
                <p style="margin: var(--spacing-xs) 0; color: var(--color-text-primary);">${date}</p>
            </div>
            
            <div style="margin-bottom: var(--spacing-md);">
                <strong style="color: var(--color-text-primary);">Message:</strong>
                <div style="margin: var(--spacing-sm) 0; padding: var(--spacing-md); background: var(--color-background-primary); border-radius: var(--border-radius-sm); border: 1px solid var(--color-border);">
                    <pre style="margin: 0; color: var(--color-text-primary); white-space: pre-wrap; word-wrap: break-word; font-family: inherit;">${body}</pre>
                </div>
            </div>
            
            <div style="text-align: right;">
                <button onclick="this.closest('.modal-overlay').remove()" style="padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); background: var(--color-background-primary); color: var(--color-text-primary); cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        modalOverlay.className = 'modal-overlay';
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Close modal when clicking overlay
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });

        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

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
        window.logger?.error('User Detail Page Error:', message);
        // TODO: Implement error display in UI
        alert(message); // Temporary fallback
    }

    showSuccess(message) {
        window.logger?.log('User Detail Page Success:', message);
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

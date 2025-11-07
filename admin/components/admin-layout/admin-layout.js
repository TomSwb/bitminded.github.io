/**
 * Admin Layout Component
 * Handles admin panel navigation, access control, and section management
 */

if (typeof window.AdminLayout === 'undefined') {
class AdminLayout {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.loadedComponents = new Map();
        this.sections = [
            'dashboard',
            'users', 
            'access-control',
            'subscriptions',
            'products',
            'revenue',
            'analytics',
            'support',
            'communications',
            'bulk-operations'
        ];
    }

    /**
     * Initialize the admin layout component
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {

            // Check if user is admin (critical security check)
            const hasAccess = await this.checkAdminAccess();
            if (!hasAccess) {
                this.redirectToHome();
                return;
            }

            // Setup component
            this.setupEventListeners();
            
            // Initialize translations (updates component elements)
            await this.initializeTranslations();
            
            // Show translatable content by adding loaded class
            this.showTranslatableContent();
            
            // User detail is now a separate page, no need to load modal component
            
            // Check URL for initial section
            const urlParams = new URLSearchParams(window.location.search);
            const sectionParam = urlParams.get('section');
            const initialSection = sectionParam && this.sections.includes(sectionParam) 
                ? sectionParam 
                : 'dashboard';
            
            // Navigate to initial section
            await this.navigateToSection(initialSection);

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Admin Layout: Failed to initialize:', error);
            this.showError('Failed to initialize admin panel');
        }
    }

    /**
     * Check if user has admin access
     * Verifies: 1) Authentication, 2) Admin role, 3) 2FA (if required)
     */
    async checkAdminAccess() {
        try {
            if (typeof window.supabase === 'undefined') {
                console.error('❌ Supabase client not available');
                return false;
            }

            // 1. Check authentication
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                return false;
            }

            this.currentUser = user;

            // 2. Check admin role
            const { data: adminRole, error: roleError } = await window.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle();
            
            if (roleError || !adminRole) {
                return false;
            }

            // 3. Check 2FA requirement (optional but recommended)
            const { data: twoFAData } = await window.supabase
                .from('user_2fa')
                .select('is_enabled')
                .eq('user_id', user.id)
                .maybeSingle();
            
            // Check if admin has 2FA (optional but recommended)
            if (!twoFAData || !twoFAData.is_enabled) {
                // TODO: Optionally enforce 2FA for admins
            }

            // 4. Log admin access
            await this.logAdminAction('admin_panel_access', {
                email: user.email,
                has_2fa: twoFAData?.is_enabled || false
            }); // No user_id - this is an admin-only action

            return true;

        } catch (error) {
            console.error('❌ Error checking admin access:', error);
            return false;
        }
    }

    /**
     * Redirect to home page (unauthorized access)
     */
    redirectToHome() {
        window.location.href = '/';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation items
        const navItems = document.querySelectorAll('.admin-layout__nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                const section = item.dataset.section;
                if (section) {
                    await this.navigateToSection(section);
                }
            });
        });

        // Mobile toggle
        const mobileToggle = document.getElementById('admin-mobile-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Close error/success messages
        const errorClose = document.getElementById('admin-error-close');
        if (errorClose) {
            errorClose.addEventListener('click', () => {
                this.hideError();
            });
        }

        const successClose = document.getElementById('admin-success-close');
        if (successClose) {
            successClose.addEventListener('click', () => {
                this.hideSuccess();
            });
        }

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('admin-sidebar');
            const toggle = document.getElementById('admin-mobile-toggle');
            
            if (sidebar && toggle && 
                sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) && 
                !toggle.contains(e.target)) {
                this.toggleMobileMenu();
            }
        });
    }

    /**
     * Navigate to a specific section
     * @param {string} sectionName - Section to navigate to
     */
    async navigateToSection(sectionName) {
        try {
            if (!this.sections.includes(sectionName)) {
                return;
            }

            if (sectionName === this.currentSection) {
                return; // Already on this section
            }


            // Hide current section
            this.hideCurrentSection();

            // Show new section
            this.showSection(sectionName);

            // Update active nav item
            this.updateActiveNavItem(sectionName);

            // Load section content if not already loaded
            if (!this.loadedComponents.has(sectionName)) {
                await this.loadSectionContent(sectionName);
            }

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('section', sectionName);
            window.history.pushState({}, '', url);

            // Update current section
            this.currentSection = sectionName;

            // Close mobile menu if open
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('admin-sidebar');
                if (sidebar?.classList.contains('open')) {
                    this.toggleMobileMenu();
                }
            }

            // Log navigation
            await this.logAdminAction('section_navigation', {
                from: this.currentSection,
                to: sectionName
            });


        } catch (error) {
            console.error('❌ Failed to navigate:', error);
            this.showError('Failed to navigate to section');
        }
    }

    /**
     * Hide current section
     */
    hideCurrentSection() {
        const currentSectionEl = document.getElementById(`${this.currentSection}-section`);
        if (currentSectionEl) {
            currentSectionEl.classList.remove('active');
        }
    }

    /**
     * Show section
     * @param {string} sectionName - Section to show
     */
    showSection(sectionName) {
        const sectionEl = document.getElementById(`${sectionName}-section`);
        if (sectionEl) {
            sectionEl.classList.add('active');
        }
    }

    /**
     * Update active nav item
     * @param {string} sectionName - Active section
     */
    updateActiveNavItem(sectionName) {
        const navItems = document.querySelectorAll('.admin-layout__nav-item');
        navItems.forEach(item => {
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Load content for a specific section
     * @param {string} sectionName - Section to load
     */
    async loadSectionContent(sectionName) {
        try {

            // Show loading
            this.showLoading();

            const componentMap = {
                'dashboard': 'dashboard',
                'users': 'user-management',
                'access-control': 'access-control',
                'subscriptions': 'subscription-management',
                'products': 'product-management',
                'revenue': 'revenue-reports',
                'analytics': 'analytics-dashboard',
                'support': 'support-desk',
                'communications': 'communication-center',
                'bulk-operations': 'bulk-operations'
            };

            const componentName = componentMap[sectionName];
            if (!componentName) {
                this.showPlaceholder(sectionName);
                this.loadedComponents.set(sectionName, true);
                this.hideLoading();
                return;
            }

            // Check if component exists
            const componentExists = await this.componentExists(componentName);
            if (!componentExists) {
                this.showPlaceholder(sectionName);
                this.loadedComponents.set(sectionName, true);
                this.hideLoading();
                return;
            }

            // Load component
            if (window.componentLoader) {
                const containerId = `#${sectionName}-content`;
                await window.componentLoader.load(componentName, {
                    container: containerId,
                    basePath: 'admin/components'
                });
                
                // Initialize component if it has an init class
                await this.initializeComponent(sectionName, componentName);
                
                this.loadedComponents.set(sectionName, true);
            } else {
                throw new Error('ComponentLoader not available');
            }

            this.hideLoading();

        } catch (error) {
            console.error(`❌ Failed to load section ${sectionName}:`, error);
            this.showPlaceholder(sectionName);
            this.loadedComponents.set(sectionName, true);
            this.hideLoading();
        }
    }

    /**
     * Check if a component exists
     * @param {string} componentName - Component to check
     * @returns {boolean} Whether component exists
     */
    async componentExists(componentName) {
        try {
            const componentPath = `admin/components/${componentName}`;
            const htmlPath = `/${componentPath}/${componentName}.html`;
            
            const response = await fetch(htmlPath, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Initialize component after loading
     * @param {string} sectionName - Section name
     * @param {string} componentName - Component name
     */
    async initializeComponent(sectionName, componentName) {
        try {
            // Load translations file if exists
            await this.loadComponentTranslations(componentName);
            
            // Map component names to their class names
            const componentClassMap = {
                'user-management': 'UserManagement',
                'dashboard': 'Dashboard',
                'access-control': 'AccessControl',
                'subscription-management': 'SubscriptionManagement',
                'product-management': 'ProductManagement',
                'revenue-reports': 'RevenueReports',
                'analytics-dashboard': 'AnalyticsDashboard',
                'support-desk': 'SupportDesk',
                'communication-center': 'CommunicationCenter',
                'bulk-operations': 'BulkOperations'
            };

            const className = componentClassMap[componentName];
            if (!className || !window[className]) {
                return;
            }

            // Create and initialize component instance
            const instance = new window[className]();
            await instance.init();
            
            // Store instance for later use
            window[`${sectionName}Component`] = instance;

        } catch (error) {
            console.error(`❌ Failed to initialize component ${componentName}:`, error);
        }
    }

    /**
     * Load component translations file
     * @param {string} componentName - Component name
     */
    async loadComponentTranslations(componentName) {
        try {
            const translationsPath = `/admin/components/${componentName}/${componentName}-translations.js`;
            
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = translationsPath;
                script.onload = () => {
                    resolve();
                };
                script.onerror = () => {
                    resolve(); // Don't fail if translations missing
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.warn(`Failed to load translations for ${componentName}:`, error);
        }
    }

    // User detail component loading removed - now using separate page

    /**
     * Show placeholder for unimplemented sections
     * @param {string} sectionName - Section name
     */
    showPlaceholder(sectionName) {
        const container = document.getElementById(`${sectionName}-content`);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem;">
                    <h2 class="translatable-content" style="color: var(--color-text-primary); margin-bottom: 1rem;">
                        🚧 ${this.getSectionTitle(sectionName)} - Coming Soon
                    </h2>
                    <p class="translatable-content" style="color: var(--color-text-primary); opacity: 0.7;">
                        This section is currently under development.
                    </p>
                </div>
            `;
        }
    }

    /**
     * Get section title
     * @param {string} sectionName - Section name
     * @returns {string} Section title
     */
    getSectionTitle(sectionName) {
        const titles = {
            'dashboard': 'Dashboard',
            'users': 'User Management',
            'access-control': 'Access Control',
            'subscriptions': 'Subscription Management',
            'products': 'Product Management',
            'revenue': 'Revenue Reports',
            'analytics': 'Analytics Dashboard',
            'communications': 'Communication Center',
            'bulk-operations': 'Bulk Operations'
        };
        return titles[sectionName] || sectionName;
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('admin-sidebar');
        const toggle = document.getElementById('admin-mobile-toggle');
        
        if (sidebar && toggle) {
            sidebar.classList.toggle('open');
            toggle.classList.toggle('open');
        }
    }

    /**
     * Load admin user information
     */
    async loadAdminInfo() {
        try {
            if (!this.currentUser) return;

            // Get username from profile
            const { data: profile } = await window.supabase
                .from('user_profiles')
                .select('username')
                .eq('id', this.currentUser.id)
                .single();

            const displayName = profile?.username || this.currentUser.email?.split('@')[0] || 'Admin';

            // Update UI
            const adminNameEl = document.getElementById('admin-username');
            if (adminNameEl) {
                adminNameEl.textContent = displayName;
            }

        } catch (error) {
            console.error('❌ Failed to load admin info:', error);
        }
    }

    /**
     * Log admin action
     * @param {string} actionType - Type of action
     * @param {Object|string} details - Action details
     * @param {string} userId - Optional: ID of user affected by the action
     */
    async logAdminAction(actionType, details, userId = null) {
        try {
            if (!this.currentUser) return;

            await window.supabase
                .from('admin_activity')
                .insert({
                    admin_id: this.currentUser.id,        // Fixed: was 'admin_user_id'
                    user_id: userId,                      // Target user ID (null for admin-only actions)
                    action: actionType,                   // Fixed: was 'action_type'
                    details: details,
                    ip_address: null // Could fetch from external API if needed
                });

        } catch (error) {
            // Silently fail - logging failure shouldn't break functionality
        }
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        try {
            if (window.adminLayoutTranslations) {
                await window.adminLayoutTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize translations:', error);
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (window.adminLayoutTranslations) {
            window.adminLayoutTranslations.updateTranslations();
        }
        // Also show translatable content
        this.showTranslatableContent();
    }

    /**
     * Show translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = document.querySelectorAll('#admin-layout .translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const loading = document.getElementById('admin-loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loading = document.getElementById('admin-loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorEl = document.getElementById('admin-error');
        const messageEl = document.getElementById('admin-error-message');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.classList.remove('hidden');
            
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
        const errorEl = document.getElementById('admin-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        const successEl = document.getElementById('admin-success');
        const messageEl = document.getElementById('admin-success-message');
        
        if (successEl && messageEl) {
            messageEl.textContent = message;
            successEl.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideSuccess();
            }, 3000);
        }
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        const successEl = document.getElementById('admin-success');
        if (successEl) {
            successEl.classList.add('hidden');
        }
    }

    /**
     * Get current section
     * @returns {string} Current section name
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Check if section is loaded
     * @param {string} sectionName - Section to check
     * @returns {boolean} Whether section is loaded
     */
    isSectionLoaded(sectionName) {
        return this.loadedComponents.has(sectionName);
    }

    /**
     * Reload section
     * @param {string} sectionName - Section to reload
     */
    async reloadSection(sectionName) {
        this.loadedComponents.delete(sectionName);
        await this.loadSectionContent(sectionName);
    }

    /**
     * Get current user
     * @returns {Object} Current user object
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

// Export for use in other scripts
window.AdminLayout = AdminLayout;
} // End of if statement to prevent duplicate class declaration


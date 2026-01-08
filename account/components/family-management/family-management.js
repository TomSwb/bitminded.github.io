/**
 * Family Management Component
 * Manages family group viewing and member management
 */
if (typeof window.FamilyManagement === 'undefined') {
class FamilyManagement {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.familyData = null;
        this.currentUserId = null;
        this.isAdmin = false;
        this.familyGroupId = null;
        
        // Bind methods
        this.handleAddMember = this.handleAddMember.bind(this);
        this.handleRemoveMember = this.handleRemoveMember.bind(this);
        this.handleUpdateRole = this.handleUpdateRole.bind(this);
        this.handleLeaveFamily = this.handleLeaveFamily.bind(this);
    }

    /**
     * Initialize the family management component
     */
    async init(config = {}) {
        if (this.isInitialized) {
            window.logger?.log('Family management component already initialized');
            return;
        }

        try {
            // Show loading state immediately to prevent flash
            this.cacheElements();
            this.showLoading();
            
            // Get current user first
            await this.getCurrentUser();
            
            // Load translations early (needed for empty state)
            await this.loadTranslations();
            
            // Re-cache elements after translations (DOM might have changed)
            this.cacheElements();
            
            // Verify critical elements exist, retry if needed
            if (!this.elements.emptyState || !this.elements.content) {
                await new Promise(resolve => setTimeout(resolve, 100));
                this.cacheElements();
            }
            
            // Check if user is a family member
            const isMember = await this.checkFamilyMembership();
            
            if (!isMember) {
                // Hide loading, show empty state
                this.hideLoading();
                this.showEmptyState();
                this.showTranslatableContent();
                this.bindEvents();
                this.isInitialized = true;
                return;
            }
            
            // Load family data (this will show loading again, then hide it)
            await this.loadFamilyData();
            
            // Set up event listeners
            this.bindEvents();
            
            // Update UI (this will hide loading and show content)
            this.updateUI();
            
            // Make translatable content visible
            this.showTranslatableContent();
            
            this.isInitialized = true;
            window.logger?.log('✅ Family management component initialized');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize family management component:', error);
            this.hideLoading();
            this.showError('Failed to load family information');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            loading: document.getElementById('family-loading'),
            error: document.getElementById('family-error'),
            errorMessage: document.getElementById('family-error-message'),
            success: document.getElementById('family-success'),
            successMessage: document.getElementById('family-success-message'),
            emptyState: document.getElementById('family-empty-state'),
            content: document.getElementById('family-management-content'),
            
            // Overview elements
            familyName: document.getElementById('family-name'),
            familyAdmin: document.getElementById('family-admin'),
            familyMemberCount: document.getElementById('family-member-count'),
            familySubscriptionStatus: document.getElementById('family-subscription-status'),
            familyAvailableSlots: document.getElementById('family-available-slots'),
            familySlotsCount: document.getElementById('family-slots-count'),
            
            // Subscription elements
            subscriptionSection: document.getElementById('family-subscription-section'),
            subscriptionPlan: document.getElementById('subscription-plan'),
            subscriptionPeriod: document.getElementById('subscription-period'),
            subscriptionPerMember: document.getElementById('subscription-per-member'),
            
            // Members elements
            membersList: document.getElementById('family-members-list'),
            addMemberBtn: document.getElementById('add-member-btn'),
            
            // Leave family
            leaveFamilySection: document.getElementById('leave-family-section'),
            leaveFamilyBtn: document.getElementById('leave-family-btn'),
            
            // Modals
            addMemberModal: document.getElementById('add-member-modal'),
            addMemberForm: document.getElementById('add-member-form'),
            addMemberEmail: document.getElementById('add-member-email'),
            addMemberError: document.getElementById('add-member-error'),
            addMemberErrorMessage: document.getElementById('add-member-error-message'),
            closeAddMemberModal: document.getElementById('close-add-member-modal'),
            cancelAddMember: document.getElementById('cancel-add-member'),
            
            removeMemberModal: document.getElementById('remove-member-modal'),
            removeMemberInfo: document.getElementById('remove-member-info'),
            closeRemoveMemberModal: document.getElementById('close-remove-member-modal'),
            cancelRemoveMember: document.getElementById('cancel-remove-member'),
            confirmRemoveMember: document.getElementById('confirm-remove-member'),
            
            updateRoleModal: document.getElementById('update-role-modal'),
            updateRoleForm: document.getElementById('update-role-form'),
            updateRoleSelect: document.getElementById('update-role-select'),
            updateRoleMemberInfo: document.getElementById('update-role-member-info'),
            closeUpdateRoleModal: document.getElementById('close-update-role-modal'),
            cancelUpdateRole: document.getElementById('cancel-update-role'),
            
            // Create family elements
            createFamilyBtn: document.getElementById('create-family-btn'),
            createFamilyModal: document.getElementById('create-family-modal'),
            createFamilyForm: document.getElementById('create-family-form'),
            createFamilyName: document.getElementById('create-family-name'),
            closeCreateFamilyModal: document.getElementById('close-create-family-modal'),
            cancelCreateFamily: document.getElementById('cancel-create-family')
        };
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase client not available');
        }

        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error || !user) {
            throw new Error('User not authenticated');
        }
        
        this.currentUserId = user.id;
    }

    /**
     * Check if user is a family member and get family_group_id
     * Uses API endpoint to avoid RLS recursion issues
     */
    async checkFamilyMembership() {
        try {
            // Get session for Authorization header
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }
            
            // Get Supabase URL
            let supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co'; // Default to prod
            if (window.supabase && window.supabase.supabaseUrl) {
                supabaseUrl = window.supabase.supabaseUrl;
            } else if (typeof envConfig !== 'undefined' && envConfig.supabaseUrl) {
                supabaseUrl = envConfig.supabaseUrl;
            }
            
            // Call GET /my-family-group endpoint
            const response = await fetch(
                `${supabaseUrl}/functions/v1/family-management/my-family-group`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.is_member) {
                return false;
            }
            
            // Store family group info
            this.familyGroupId = data.family_group_id;
            this.isAdmin = data.is_admin || false;
            
            return true;
            
        } catch (error) {
            window.logger?.error('❌ Failed to check family membership:', error);
            return false;
        }
    }

    /**
     * Load family data from API
     */
    async loadFamilyData() {
        try {
            this.showLoading();
            
            // Get session for Authorization header
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }
            
            // Get Supabase URL - try to get from supabase client or use env config
            let supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co'; // Default to prod
            if (window.supabase && window.supabase.supabaseUrl) {
                supabaseUrl = window.supabase.supabaseUrl;
            } else if (typeof envConfig !== 'undefined' && envConfig.supabaseUrl) {
                supabaseUrl = envConfig.supabaseUrl;
            }
            
            // Call GET /family-status endpoint
            const response = await fetch(
                `${supabaseUrl}/functions/v1/family-management/family-status?family_group_id=${this.familyGroupId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.familyData = data;
            
            // Check if user is admin
            this.isAdmin = data.family_group?.admin_user_id === this.currentUserId;
            
            this.hideLoading();
            
        } catch (error) {
            window.logger?.error('❌ Failed to load family data:', error);
            this.hideLoading();
            throw error;
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Add member button
        if (this.elements.addMemberBtn) {
            this.elements.addMemberBtn.addEventListener('click', () => this.openAddMemberModal());
        }
        
        // Add member form
        if (this.elements.addMemberForm) {
            this.elements.addMemberForm.addEventListener('submit', this.handleAddMember);
        }
        
        // Close add member modal
        if (this.elements.closeAddMemberModal) {
            this.elements.closeAddMemberModal.addEventListener('click', () => this.closeAddMemberModal());
        }
        if (this.elements.cancelAddMember) {
            this.elements.cancelAddMember.addEventListener('click', () => this.closeAddMemberModal());
        }
        
        // Remove member modal
        if (this.elements.closeRemoveMemberModal) {
            this.elements.closeRemoveMemberModal.addEventListener('click', () => this.closeRemoveMemberModal());
        }
        if (this.elements.cancelRemoveMember) {
            this.elements.cancelRemoveMember.addEventListener('click', () => this.closeRemoveMemberModal());
        }
        if (this.elements.confirmRemoveMember) {
            this.elements.confirmRemoveMember.addEventListener('click', this.handleRemoveMember);
        }
        
        // Update role form
        if (this.elements.updateRoleForm) {
            this.elements.updateRoleForm.addEventListener('submit', this.handleUpdateRole);
        }
        
        // Close update role modal
        if (this.elements.closeUpdateRoleModal) {
            this.elements.closeUpdateRoleModal.addEventListener('click', () => this.closeUpdateRoleModal());
        }
        if (this.elements.cancelUpdateRole) {
            this.elements.cancelUpdateRole.addEventListener('click', () => this.closeUpdateRoleModal());
        }
        
        // Leave family button
        if (this.elements.leaveFamilyBtn) {
            this.elements.leaveFamilyBtn.addEventListener('click', this.handleLeaveFamily);
        }
        
        // Create family button
        if (this.elements.createFamilyBtn) {
            this.elements.createFamilyBtn.addEventListener('click', () => this.openCreateFamilyModal());
        }
        
        // Create family form
        if (this.elements.createFamilyForm) {
            this.elements.createFamilyForm.addEventListener('submit', this.handleCreateFamily.bind(this));
        }
        
        // Close create family modal
        if (this.elements.closeCreateFamilyModal) {
            this.elements.closeCreateFamilyModal.addEventListener('click', () => this.closeCreateFamilyModal());
        }
        if (this.elements.cancelCreateFamily) {
            this.elements.cancelCreateFamily.addEventListener('click', () => this.closeCreateFamilyModal());
        }
        
        // Close modals on overlay click
        if (this.elements.addMemberModal) {
            this.elements.addMemberModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('family-management__modal-overlay')) {
                    this.closeAddMemberModal();
                }
            });
        }
        if (this.elements.removeMemberModal) {
            this.elements.removeMemberModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('family-management__modal-overlay')) {
                    this.closeRemoveMemberModal();
                }
            });
        }
        if (this.elements.updateRoleModal) {
            this.elements.updateRoleModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('family-management__modal-overlay')) {
                    this.closeUpdateRoleModal();
                }
            });
        }
        if (this.elements.createFamilyModal) {
            this.elements.createFamilyModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('family-management__modal-overlay')) {
                    this.closeCreateFamilyModal();
                }
            });
        }
    }

    /**
     * Load translations
     */
    async loadTranslations() {
        try {
            // Try to load component translations
            const translationsPath = '/account/components/family-management/locales/family-management-locales.json';
            const response = await fetch(translationsPath);
            
            if (response.ok) {
                const translations = await response.json();
                
                // Add to i18next if available
                if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                    Object.keys(translations).forEach(lang => {
                        if (i18next.hasResourceBundle(lang, 'translation')) {
                            i18next.addResourceBundle(lang, 'translation', translations[lang].translation, true, true);
                        }
                    });
                }
            }
            
            // Update translations
            this.updateTranslations();
            
        } catch (error) {
            window.logger?.log('⚠️ Failed to load translations:', error);
            // Continue without translations
        }
    }

    /**
     * Update translations
     */
    updateTranslations() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
            return;
        }

        const translatableElements = document.querySelectorAll('.family-management .translatable-content');
        
        translatableElements.forEach(element => {
            const key = element.dataset.translationKey || element.textContent.trim();
            if (key && i18next.exists(key)) {
                element.textContent = i18next.t(key);
            }
        });
    }

    /**
     * Update UI with family data
     */
    updateUI() {
        if (!this.familyData) {
            return;
        }

        const { family_group, members, subscription, stripe_subscription, available_slots } = this.familyData;

        // Update overview
        if (this.elements.familyName) {
            this.elements.familyName.textContent = family_group?.family_name || 'N/A';
        }
        
        if (this.elements.familyAdmin) {
            // Show admin username, fallback to email, then user ID
            const adminDisplay = family_group?.admin_profile?.username 
                || family_group?.admin_profile?.email 
                || family_group?.admin_user_id 
                || 'N/A';
            this.elements.familyAdmin.textContent = adminDisplay;
        }
        
        if (this.elements.familyMemberCount) {
            const memberCount = members?.length || 0;
            this.elements.familyMemberCount.textContent = `${memberCount} / 6`;
        }
        
        if (this.elements.familySubscriptionStatus) {
            const status = subscription?.status || stripe_subscription?.status || 'No subscription';
            this.elements.familySubscriptionStatus.textContent = this.formatStatus(status);
        }
        
        if (available_slots !== undefined && available_slots > 0) {
            if (this.elements.familyAvailableSlots) {
                this.elements.familyAvailableSlots.classList.remove('hidden');
            }
            if (this.elements.familySlotsCount) {
                this.elements.familySlotsCount.textContent = available_slots.toString();
            }
        }

        // Update subscription section
        if (subscription || stripe_subscription) {
            if (this.elements.subscriptionSection) {
                this.elements.subscriptionSection.classList.remove('hidden');
            }
            
            if (this.elements.subscriptionPlan) {
                const planName = subscription?.plan_name || 'N/A';
                this.elements.subscriptionPlan.textContent = this.formatPlanName(planName);
            }
            
            if (this.elements.subscriptionPeriod && stripe_subscription) {
                const start = stripe_subscription.current_period_start;
                const end = stripe_subscription.current_period_end;
                if (start && end) {
                    const startDate = new Date(start).toLocaleDateString();
                    const endDate = new Date(end).toLocaleDateString();
                    this.elements.subscriptionPeriod.textContent = `${startDate} - ${endDate}`;
                }
            }
            
            // Calculate per-member price (if subscription exists)
            if (this.elements.subscriptionPerMember && stripe_subscription && members?.length) {
                // This would need actual price data from Stripe - placeholder for now
                this.elements.subscriptionPerMember.textContent = 'N/A';
            }
        }

        // Update members list
        this.updateMembersList(members);

        // Show/hide admin features
        if (this.isAdmin) {
            if (this.elements.addMemberBtn) {
                this.elements.addMemberBtn.classList.remove('hidden');
            }
            // Admin can leave if there are other admins, otherwise show delete
            const adminCount = this.familyData?.admin_count || 0;
            if (this.elements.leaveFamilySection) {
                this.elements.leaveFamilySection.classList.remove('hidden');
                const leaveBtn = this.elements.leaveFamilyBtn;
                const warningText = this.elements.leaveFamilySection.querySelector('.family-management__leave-warning');
                
                if (adminCount > 1) {
                    // Other admins exist - show "Leave" button
                    if (leaveBtn) {
                        leaveBtn.textContent = this.t('Leave Family Group');
                        leaveBtn.classList.remove('family-management__leave-btn--danger');
                        leaveBtn.dataset.action = 'leave';
                    }
                    if (warningText) {
                        warningText.textContent = this.t('Warning: Leaving the family group will revoke your access to family subscription benefits.');
                    }
                } else {
                    // Only admin - show "Delete Family Group" button
                    if (leaveBtn) {
                        leaveBtn.textContent = this.t('Delete Family Group');
                        leaveBtn.classList.add('family-management__leave-btn--danger');
                        leaveBtn.dataset.action = 'delete';
                    }
                    if (warningText) {
                        warningText.textContent = this.t('Warning: Deleting the family group will permanently remove all members and cancel any active subscriptions.');
                    }
                }
            }
        } else {
            if (this.elements.addMemberBtn) {
                this.elements.addMemberBtn.classList.add('hidden');
            }
            if (this.elements.leaveFamilySection) {
                this.elements.leaveFamilySection.classList.remove('hidden');
                const leaveBtn = this.elements.leaveFamilyBtn;
                if (leaveBtn) {
                    leaveBtn.textContent = this.t('Leave Family Group');
                    leaveBtn.classList.remove('family-management__leave-btn--danger');
                    leaveBtn.dataset.action = 'leave';
                }
            }
        }

        // Show content, hide empty state and loading using CSS classes
        if (this.elements.content) {
            this.elements.content.classList.remove('hidden');
            this.elements.content.classList.add('visible');
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.remove('visible');
            this.elements.emptyState.classList.add('hidden');
        }
        if (this.elements.loading) {
            this.elements.loading.classList.remove('visible');
            this.elements.loading.classList.add('hidden');
        }
        
        // Make translatable content visible
        this.showTranslatableContent();
    }

    /**
     * Update members list
     */
    updateMembersList(members) {
        if (!this.elements.membersList || !members) {
            return;
        }

        this.elements.membersList.innerHTML = '';

        members.forEach(member => {
            const memberCard = this.createMemberCard(member);
            this.elements.membersList.appendChild(memberCard);
        });
    }

    /**
     * Create member card element
     */
    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'family-management__member-card';
        
        if (member.user_id === this.currentUserId) {
            card.classList.add('current-user');
        }

        const isCurrentUser = member.user_id === this.currentUserId;
        const isAdminMember = member.role === 'admin';

        // Get display name: username > email > user_id
        const displayName = member.profile?.username 
            || member.profile?.email 
            || member.user_id 
            || 'N/A';
        
        // Get user initial for avatar (from display name)
        const initial = displayName && displayName !== 'N/A' 
            ? displayName.charAt(0).toUpperCase() 
            : '?';

        card.innerHTML = `
            <div class="family-management__member-header">
                <div class="family-management__member-avatar">${initial}</div>
                <div class="family-management__member-info">
                    <div class="family-management__member-id">${displayName}</div>
                    <span class="family-management__member-role ${member.role || 'member'}">${this.formatRole(member.role || 'member')}</span>
                </div>
            </div>
            ${member.joined_at ? `<div class="family-management__member-details">${this.t('Joined')}: ${new Date(member.joined_at).toLocaleDateString()}</div>` : ''}
            ${this.isAdmin && !isCurrentUser && !isAdminMember ? `
                <div class="family-management__member-actions">
                    <button class="family-management__member-action-btn update-role-btn" data-user-id="${member.user_id}" data-current-role="${member.role}">${this.t('Update Role')}</button>
                    <button class="family-management__member-action-btn danger remove-member-btn" data-user-id="${member.user_id}">${this.t('Remove')}</button>
                </div>
            ` : ''}
        `;

        // Add event listeners for action buttons
        const updateRoleBtn = card.querySelector('.update-role-btn');
        if (updateRoleBtn) {
            updateRoleBtn.addEventListener('click', () => this.openUpdateRoleModal(member));
        }

        const removeMemberBtn = card.querySelector('.remove-member-btn');
        if (removeMemberBtn) {
            removeMemberBtn.addEventListener('click', () => this.openRemoveMemberModal(member));
        }

        return card;
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const statusMap = {
            'active': 'Active',
            'canceled': 'Canceled',
            'past_due': 'Past Due',
            'unpaid': 'Unpaid',
            'incomplete': 'Incomplete',
            'incomplete_expired': 'Expired',
            'trialing': 'Trialing',
            'paused': 'Paused'
        };
        return statusMap[status] || status;
    }

    /**
     * Format plan name for display
     */
    formatPlanName(planName) {
        const planMap = {
            'family_all_tools': 'Family All Tools',
            'family_supporter': 'Family Supporter'
        };
        return planMap[planName] || planName;
    }

    /**
     * Format role for display
     */
    formatRole(role) {
        const roleMap = {
            'admin': 'Admin',
            'parent': 'Parent',
            'guardian': 'Guardian',
            'member': 'Member',
            'child': 'Child'
        };
        return roleMap[role] || role;
    }

    /**
     * Translation helper
     */
    t(key) {
        if (typeof i18next !== 'undefined' && i18next.isInitialized && i18next.exists(key)) {
            return i18next.t(key);
        }
        return key;
    }

    /**
     * Open add member modal
     */
    openAddMemberModal() {
        if (this.elements.addMemberModal) {
            this.elements.addMemberModal.classList.remove('hidden');
        }
        if (this.elements.addMemberForm) {
            this.elements.addMemberForm.reset();
        }
        // Hide any previous errors
        if (this.elements.addMemberError) {
            this.elements.addMemberError.classList.add('hidden');
        }
    }

    /**
     * Close add member modal
     */
    closeAddMemberModal() {
        if (this.elements.addMemberModal) {
            this.elements.addMemberModal.classList.add('hidden');
        }
        if (this.elements.addMemberForm) {
            this.elements.addMemberForm.reset();
        }
    }

    /**
     * Open create family modal
     */
    openCreateFamilyModal() {
        if (this.elements.createFamilyModal) {
            this.elements.createFamilyModal.classList.remove('hidden');
        }
        if (this.elements.createFamilyForm) {
            this.elements.createFamilyForm.reset();
        }
    }

    /**
     * Close create family modal
     */
    closeCreateFamilyModal() {
        if (this.elements.createFamilyModal) {
            this.elements.createFamilyModal.classList.add('hidden');
        }
    }

    /**
     * Handle add member form submission
     */
    async handleAddMember(e) {
        e.preventDefault();
        
        try {
            const email = this.elements.addMemberEmail?.value?.trim();

            if (!email) {
                this.showError(this.t('Email address is required'));
                return;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showError(this.t('Please enter a valid email address'));
                return;
            }

            this.showLoading();

            // Get session for Authorization header
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Get Supabase URL
            let supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co'; // Default to prod
            if (window.supabase && window.supabase.supabaseUrl) {
                supabaseUrl = window.supabase.supabaseUrl;
            } else if (typeof envConfig !== 'undefined' && envConfig.supabaseUrl) {
                supabaseUrl = envConfig.supabaseUrl;
            }
            
            // Call POST /add-member endpoint
            const response = await fetch(`${supabaseUrl}/functions/v1/family-management/add-member`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_group_id: this.familyGroupId,
                    email: email
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error('Failed to send invitation');
            }

            this.hideLoading();
            this.closeAddMemberModal();
            this.showSuccess(this.t('Invitation sent successfully'));
            
            // Reload family data
            await this.loadFamilyData();
            this.updateUI();

        } catch (error) {
            window.logger?.error('❌ Failed to send invitation:', error);
            this.hideLoading();
            // Show error inside the modal
            this.showModalError(error.message || this.t('Failed to send invitation'));
            // Reload family data to ensure UI is in sync
            try {
                await this.loadFamilyData();
                this.updateUI();
            } catch (reloadError) {
                window.logger?.error('❌ Failed to reload family data after error:', reloadError);
            }
        }
    }

    /**
     * Handle create family form submission
     */
    async handleCreateFamily(e) {
        e.preventDefault();
        
        try {
            const familyName = this.elements.createFamilyName?.value?.trim();

            // Client-side validation
            if (!familyName) {
                this.showError(this.t('Family name is required'));
                return;
            }
            
            if (familyName.length < 1 || familyName.length > 100) {
                this.showError(this.t('Family name must be between 1 and 100 characters'));
                return;
            }

            this.showLoading();

            // Get session for Authorization header
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Get Supabase URL
            let supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co'; // Default to prod
            if (window.supabase && window.supabase.supabaseUrl) {
                supabaseUrl = window.supabase.supabaseUrl;
            } else if (typeof envConfig !== 'undefined' && envConfig.supabaseUrl) {
                supabaseUrl = envConfig.supabaseUrl;
            }
            
            // Call POST /create-family endpoint
            const response = await fetch(`${supabaseUrl}/functions/v1/family-management/create-family`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_name: familyName
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error('Failed to create family');
            }

            this.hideLoading();
            this.closeCreateFamilyModal();
            this.showSuccess(this.t('Family created successfully'));
            
            // Reload family data and update UI
            this.familyGroupId = data.family_group_id;
            this.isAdmin = true;
            await this.loadFamilyData();
            this.updateUI();

        } catch (error) {
            window.logger?.error('❌ Failed to create family:', error);
            this.hideLoading();
            this.showError(error.message || this.t('Failed to create family'));
        }
    }

    /**
     * Open remove member modal
     */
    openRemoveMemberModal(member) {
        if (this.elements.removeMemberModal) {
            this.elements.removeMemberModal.classList.remove('hidden');
        }
        if (this.elements.removeMemberInfo) {
            const displayName = member.profile?.username 
                || member.profile?.email 
                || member.user_id 
                || 'N/A';
            this.elements.removeMemberInfo.textContent = `${this.t('User')}: ${displayName} | ${this.t('Role')}: ${this.formatRole(member.role)}`;
        }
        this.currentRemoveMemberId = member.user_id;
    }

    /**
     * Close remove member modal
     */
    closeRemoveMemberModal() {
        if (this.elements.removeMemberModal) {
            this.elements.removeMemberModal.classList.add('hidden');
        }
        this.currentRemoveMemberId = null;
    }

    /**
     * Handle remove member
     */
    async handleRemoveMember() {
        if (!this.currentRemoveMemberId) {
            return;
        }

        try {
            this.showLoading();

            // Use fetch directly since invokeEdgeFunction doesn't support custom paths
            const { data: { session } } = await window.supabase.auth.getSession();
            const supabaseUrl = window.supabase.supabaseUrl || 'https://dynxqnrkmjcvgzsugxtm.supabase.co';
            
            const response = await fetch(`${supabaseUrl}/functions/v1/family-management/remove-member`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_group_id: this.familyGroupId,
                    user_id: this.currentRemoveMemberId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error('Failed to remove member');
            }

            this.hideLoading();
            this.closeRemoveMemberModal();
            this.showSuccess('Member removed successfully');
            
            // Reload family data
            await this.loadFamilyData();
            this.updateUI();

        } catch (error) {
            window.logger?.error('❌ Failed to remove member:', error);
            this.hideLoading();
            this.showError(error.message || 'Failed to remove member');
        }
    }

    /**
     * Open update role modal
     */
    openUpdateRoleModal(member) {
        if (this.elements.updateRoleModal) {
            this.elements.updateRoleModal.classList.remove('hidden');
        }
        if (this.elements.updateRoleSelect) {
            this.elements.updateRoleSelect.value = member.role || 'member';
        }
        if (this.elements.updateRoleMemberInfo) {
            const displayName = member.profile?.username 
                || member.profile?.email 
                || member.user_id 
                || 'N/A';
            this.elements.updateRoleMemberInfo.textContent = `${this.t('User')}: ${displayName}`;
        }
        this.currentUpdateRoleMemberId = member.user_id;
    }

    /**
     * Close update role modal
     */
    closeUpdateRoleModal() {
        if (this.elements.updateRoleModal) {
            this.elements.updateRoleModal.classList.add('hidden');
        }
        this.currentUpdateRoleMemberId = null;
    }

    /**
     * Handle update role form submission
     */
    async handleUpdateRole(e) {
        e.preventDefault();
        
        if (!this.currentUpdateRoleMemberId) {
            return;
        }

        try {
            const newRole = this.elements.updateRoleSelect?.value;

            if (!newRole) {
                this.showError('Role is required');
                return;
            }

            this.showLoading();

            // Use fetch directly since invokeEdgeFunction doesn't support custom paths
            const { data: { session } } = await window.supabase.auth.getSession();
            const supabaseUrl = window.supabase.supabaseUrl || 'https://dynxqnrkmjcvgzsugxtm.supabase.co';
            
            const response = await fetch(`${supabaseUrl}/functions/v1/family-management/update-member-role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_group_id: this.familyGroupId,
                    user_id: this.currentUpdateRoleMemberId,
                    new_role: newRole
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error('Failed to update role');
            }

            this.hideLoading();
            this.closeUpdateRoleModal();
            this.showSuccess('Role updated successfully');
            
            // Reload family data
            await this.loadFamilyData();
            this.updateUI();

        } catch (error) {
            window.logger?.error('❌ Failed to update role:', error);
            this.hideLoading();
            this.showError(error.message || 'Failed to update role');
        }
    }

    /**
     * Handle leave family or delete family
     */
    async handleLeaveFamily() {
        const action = this.elements.leaveFamilyBtn?.dataset.action || 'leave';
        const isDelete = action === 'delete';
        
        const confirmMessage = isDelete 
            ? this.t('Are you sure you want to delete this family group? This action cannot be undone and will remove all members and cancel any active subscriptions.')
            : this.t('Are you sure you want to leave this family group? This action cannot be undone.');
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            this.showLoading();

            // Get session for Authorization header
            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Get Supabase URL
            let supabaseUrl = 'https://dynxqnrkmjcvgzsugxtm.supabase.co'; // Default to prod
            if (window.supabase && window.supabase.supabaseUrl) {
                supabaseUrl = window.supabase.supabaseUrl;
            } else if (typeof envConfig !== 'undefined' && envConfig.supabaseUrl) {
                supabaseUrl = envConfig.supabaseUrl;
            }
            
            // Call appropriate endpoint
            const endpoint = isDelete ? 'delete-family' : 'leave-family';
            const response = await fetch(`${supabaseUrl}/functions/v1/family-management/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_group_id: this.familyGroupId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error(isDelete ? 'Failed to delete family group' : 'Failed to leave family group');
            }

            this.hideLoading();
            const successMessage = isDelete 
                ? this.t('Successfully deleted family group')
                : this.t('Successfully left family group');
            this.showSuccess(successMessage);
            
            // Reload the page to show empty state
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            window.logger?.error(`❌ Failed to ${isDelete ? 'delete' : 'leave'} family:`, error);
            this.hideLoading();
            const errorMessage = isDelete 
                ? this.t('Failed to delete family group')
                : this.t('Failed to leave family group');
            this.showError(error.message || errorMessage);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.remove('hidden');
            this.elements.loading.classList.add('visible');
        }
        if (this.elements.content) {
            this.elements.content.classList.remove('visible');
            this.elements.content.classList.add('hidden');
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.remove('visible');
            this.elements.emptyState.classList.add('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.classList.remove('visible');
            this.elements.loading.classList.add('hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.elements.error && this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.error.classList.remove('hidden');
        }
        setTimeout(() => this.hideError(), 5000);
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.elements.error) {
            this.elements.error.classList.add('hidden');
        }
    }

    /**
     * Show error message in modal
     */
    showModalError(message) {
        if (this.elements.addMemberError && this.elements.addMemberErrorMessage) {
            this.elements.addMemberErrorMessage.textContent = message;
            this.elements.addMemberError.classList.remove('hidden');
        }
        // Also show in main error area as fallback
        this.showError(message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (this.elements.success && this.elements.successMessage) {
            this.elements.successMessage.textContent = message;
            this.elements.success.classList.remove('hidden');
        }
        setTimeout(() => this.hideSuccess(), 5000);
    }

    /**
     * Hide success message
     */
    hideSuccess() {
        if (this.elements.success) {
            this.elements.success.classList.add('hidden');
        }
    }

    /**
     * Show translatable content (make it visible)
     */
    showTranslatableContent() {
        const container = document.getElementById('family-management');
        if (!container) {
            window.logger?.warn('⚠️ Family Management: Container not found for showTranslatableContent');
            return;
        }

        // Get ALL translatable content, not just those with data-translation-key
        const translatableElements = container.querySelectorAll('.translatable-content');
        window.logger?.log(`🔍 Found ${translatableElements.length} translatable elements`);
        
        translatableElements.forEach((element) => {
            element.classList.add('loaded');
        });
    }


    /**
     * Show empty state
     */
    showEmptyState() {
        window.logger?.log('🔍 Attempting to show empty state...');
        
        // Find empty state element - retry if needed
        let emptyStateElement = this.elements.emptyState;
        if (!emptyStateElement) {
            emptyStateElement = document.getElementById('family-empty-state');
            if (emptyStateElement) {
                this.elements.emptyState = emptyStateElement;
            }
        }
        
        if (!emptyStateElement) {
            window.logger?.error('❌ Empty state element not found! Retrying...');
            setTimeout(() => this.showEmptyState(), 200);
            return;
        }
        
        // Remove hidden, add visible class
        emptyStateElement.classList.remove('hidden');
        emptyStateElement.classList.add('visible');
        window.logger?.log('✅ Empty state made visible');
        
        // Make translatable content visible
        const translatableElements = emptyStateElement.querySelectorAll('.translatable-content');
        translatableElements.forEach((element) => {
            element.classList.add('loaded');
        });
        window.logger?.log(`✅ Made ${translatableElements.length} translatable elements visible`);
        
        // Hide other sections
        if (this.elements.content) {
            this.elements.content.classList.remove('visible');
            this.elements.content.classList.add('hidden');
        }
        if (this.elements.loading) {
            this.elements.loading.classList.remove('visible');
            this.elements.loading.classList.add('hidden');
        }
    }
}

// Make available globally
window.FamilyManagement = FamilyManagement;
}


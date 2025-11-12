/**
 * Bulk Operations Component
 * Provides maintenance mode controls plus placeholders for future bulk tooling
 */

if (typeof window.BulkOperations === 'undefined') {
class BulkOperations {
    constructor() {
        this.isInitialized = false;
        this.state = {
            isEnabled: false,
            bypassIps: [],
            updatedAt: null,
            updatedBy: null,
            bypassLink: null,
            bypassTokenExpiresAt: null
        };
        this.elements = {};
        this.activeTab = 'maintenance';
        this.isSaving = false;
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.cacheElements();
            this.setupTabs();
            this.setupEventListeners();

            await this.initializeTranslations();
            this.showTranslatableContent();

            await this.loadMaintenanceSettings({ showErrors: false });

            window.addEventListener('languageChanged', () => {
                this.updateTranslations();
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ BulkOperations: failed to initialize component', error);
            this.showError(this.translate('Failed to initialize bulk operations.', 'Failed to initialize bulk operations.'));
        }
    }

    cacheElements() {
        const root = document.getElementById('bulk-operations');
        if (!root) {
            throw new Error('Bulk operations root container not found');
        }

        this.elements.root = root;
        this.elements.tabs = root.querySelectorAll('.bulk-operations__tab');
        this.elements.panels = root.querySelectorAll('.bulk-operations__panel');
        this.elements.historyButton = root.querySelector('.bulk-operations__action-btn');

        this.elements.statusPill = root.querySelector('#maintenance-status-pill');
        this.elements.toggleButton = root.querySelector('#maintenance-toggle-button');
        this.elements.refreshButton = root.querySelector('#maintenance-refresh-button');
        this.elements.lastUpdated = root.querySelector('#maintenance-last-updated');
        this.elements.updatedBy = root.querySelector('#maintenance-updated-by');
        this.elements.alert = root.querySelector('#maintenance-alert');
        this.elements.alertMessage = root.querySelector('#maintenance-alert-message');

        this.elements.allowlistForm = root.querySelector('#maintenance-allowlist-form');
        this.elements.allowlistInput = root.querySelector('#maintenance-ip-input');
        this.elements.allowlistList = root.querySelector('#maintenance-ip-list');
        this.elements.allowlistEmpty = root.querySelector('#maintenance-empty-allowlist');

        this.elements.generateBypass = root.querySelector('#maintenance-generate-bypass');
        this.elements.copyBypass = root.querySelector('#maintenance-copy-bypass');
        this.elements.clearBypass = root.querySelector('#maintenance-clear-bypass');
        this.elements.bypassResult = root.querySelector('#maintenance-bypass-result');
        this.elements.bypassLink = root.querySelector('#maintenance-bypass-link');
    }

    setupTabs() {
        if (!this.elements.tabs?.length) {
            return;
        }

        this.elements.tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                if (target) {
                    this.activateTab(target);
                }
            });
        });

        if (this.elements.historyButton) {
            this.elements.historyButton.addEventListener('click', () => {
                this.activateTab('history');
            });
        }

        this.activateTab(this.activeTab);
    }

    activateTab(tabName) {
        this.activeTab = tabName;

        this.elements.tabs.forEach((tab) => {
            const isActive = tab.getAttribute('data-tab') === tabName;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        this.elements.panels.forEach((panel) => {
            const isActive = panel.getAttribute('data-tab-panel') === tabName;
            panel.classList.toggle('bulk-operations__panel--active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
    }

    setupEventListeners() {
        if (this.elements.toggleButton) {
            this.elements.toggleButton.addEventListener('click', () => this.handleToggle());
        }

        if (this.elements.refreshButton) {
            this.elements.refreshButton.addEventListener('click', () => this.handleRefresh());
        }

        if (this.elements.allowlistForm) {
            this.elements.allowlistForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleAllowlistSubmit();
            });
        }

        if (this.elements.allowlistList) {
            this.elements.allowlistList.addEventListener('click', (event) => {
                const target = event.target;
                if (target.matches('button[data-ip]')) {
                    const ip = target.getAttribute('data-ip');
                    this.handleRemoveIp(ip);
                }
            });
        }

        if (this.elements.generateBypass) {
            this.elements.generateBypass.addEventListener('click', () => this.handleGenerateBypass());
        }

        if (this.elements.copyBypass) {
            this.elements.copyBypass.addEventListener('click', () => this.handleCopyBypass());
        }

        if (this.elements.clearBypass) {
            this.elements.clearBypass.addEventListener('click', () => this.handleClearBypass());
        }
    }

    async initializeTranslations() {
        try {
            if (!window.bulkOperationsTranslations) {
                await this.loadScript('/admin/components/bulk-operations/bulk-operations-translations.js');
            }

            if (window.bulkOperationsTranslations && !window.bulkOperationsTranslations.isInitialized) {
                await window.bulkOperationsTranslations.init();
            }
        } catch (error) {
            console.error('❌ Failed to initialize bulk operations translations:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                return resolve();
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script ${src}`));
            document.head.appendChild(script);
        });
    }

    showTranslatableContent() {
        if (this.elements.root) {
            this.elements.root.classList.add('is-ready');
        }

        this.updateTranslations();
    }

    updateTranslations() {
        if (window.bulkOperationsTranslations) {
            window.bulkOperationsTranslations.updateTranslations();
        }
    }

    async loadMaintenanceSettings({ showErrors = true } = {}) {
        try {
            this.setMaintenanceLoading(true);

        const { data, error } = await this.invokeMaintenanceFunction({
            action: 'get'
        });

            if (error) {
                throw error;
            }

            const settings = data?.settings || data || {};

            this.state.isEnabled = Boolean(settings.is_enabled);
            this.state.bypassIps = Array.isArray(settings.bypass_ips) ? settings.bypass_ips : [];
            this.state.updatedAt = settings.updated_at || null;
            this.state.updatedBy = settings.updated_by || settings.updated_by_email || null;
            this.state.bypassLink = settings.last_generated_link || null;
            this.state.bypassTokenExpiresAt = settings.last_generated_link_expires_at || null;

            this.renderMaintenanceStatus();
            this.renderAllowlist();
            this.renderBypassLink();
            this.renderAlert(settings.alert || null);
        } catch (error) {
            console.error('❌ Failed to load maintenance settings:', error);
            if (showErrors) {
                this.showError(this.translate('Failed to load maintenance settings.', 'Failed to load maintenance settings.'));
            } else {
                this.renderAlert(this.translate('Unable to reach maintenance settings. Refresh to try again.', 'Unable to reach maintenance settings. Refresh to try again.'));
            }
        } finally {
            this.setMaintenanceLoading(false);
        }
    }

    setMaintenanceLoading(isLoading) {
        this.state.isLoading = isLoading;

        const elementsToDisable = [
            this.elements.toggleButton,
            this.elements.refreshButton,
            this.elements.allowlistInput,
            this.elements.generateBypass,
            this.elements.copyBypass,
            this.elements.clearBypass
        ];

        elementsToDisable.forEach((el) => {
            if (el) {
                el.disabled = Boolean(isLoading);
            }
        });

        if (this.elements.allowlistForm) {
            const submitButton = this.elements.allowlistForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = Boolean(isLoading);
            }
        }
    }

    renderMaintenanceStatus() {
        if (!this.elements.statusPill) {
            return;
        }

        const isEnabled = Boolean(this.state.isEnabled);
        this.elements.statusPill.classList.toggle('maintenance-status--active', isEnabled);
        this.elements.statusPill.classList.toggle('maintenance-status--inactive', !isEnabled);

        const statusKey = isEnabled ? 'Active' : 'Inactive';
        this.elements.statusPill.textContent = this.translate(statusKey, statusKey);

        if (this.elements.toggleButton) {
            const buttonKey = isEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode';
            this.elements.toggleButton.textContent = this.translate(buttonKey, buttonKey);
        }

        if (this.elements.lastUpdated) {
            this.elements.lastUpdated.textContent = this.state.updatedAt
                ? this.formatDate(this.state.updatedAt)
                : this.translate('Not available', 'Not available');
        }

        if (this.elements.updatedBy) {
            this.elements.updatedBy.textContent = this.state.updatedBy || this.translate('Not available', 'Not available');
        }
    }

    renderAllowlist() {
        if (!this.elements.allowlistList || !this.elements.allowlistEmpty) {
            return;
        }

        const ips = this.state.bypassIps || [];
        this.elements.allowlistList.innerHTML = '';

        if (ips.length === 0) {
            this.elements.allowlistEmpty.hidden = false;
            return;
        }

        this.elements.allowlistEmpty.hidden = true;

        ips.forEach((ip) => {
            const item = document.createElement('li');
            item.className = 'maintenance-allowlist__item';
            item.setAttribute('data-ip', ip);
            item.innerHTML = `
                <span>${this.escapeHtml(ip)}</span>
                <button 
                    type="button" 
                    class="maintenance-allowlist__remove" 
                    aria-label="${this.translate('Remove {{value}} from allowlist', 'Remove {{value}} from allowlist').replace('{{value}}', ip)}"
                    data-ip="${this.escapeHtml(ip)}"
                >
                    ×
                </button>
            `;
            this.elements.allowlistList.appendChild(item);
        });
    }

    renderBypassLink() {
        const hasLink = Boolean(this.state.bypassLink);

        if (this.elements.bypassResult) {
            this.elements.bypassResult.hidden = !hasLink;
        }
        if (this.elements.bypassLink) {
            this.elements.bypassLink.textContent = hasLink ? this.state.bypassLink : '';
        }

        const expiresAt = this.state.bypassTokenExpiresAt
            ? this.formatDate(this.state.bypassTokenExpiresAt)
            : null;

        if (this.elements.bypassResult && expiresAt) {
            const hint = this.elements.bypassResult.querySelector('.maintenance-bypass__hint');
            if (hint) {
                hint.textContent = this.translate('Bypass link expires at {{date}}.', 'Bypass link expires at {{date}}.')
                    .replace('{{date}}', expiresAt);
            }
        }

        if (this.elements.copyBypass) {
            this.elements.copyBypass.disabled = !hasLink;
        }
        if (this.elements.clearBypass) {
            this.elements.clearBypass.disabled = !hasLink;
        }
    }

    renderAlert(message) {
        if (!this.elements.alert || !this.elements.alertMessage) {
            return;
        }

        if (!message) {
            this.elements.alert.hidden = true;
            this.elements.alertMessage.textContent = '';
            return;
        }

        this.elements.alert.hidden = false;
        this.elements.alertMessage.textContent = message;
    }

    async handleToggle() {
        if (this.isSaving) {
            return;
        }

        const nextState = !this.state.isEnabled;
        await this.saveSettings({
            isEnabled: nextState
        });
    }

    async handleRefresh() {
        await this.loadMaintenanceSettings({ showErrors: true });
        this.showSuccess(this.translate('Status refreshed.', 'Status refreshed.'));
    }

    async handleAllowlistSubmit() {
        if (!this.elements.allowlistInput) {
            return;
        }

        const value = (this.elements.allowlistInput.value || '').trim();
        if (!value) {
            return;
        }

        if (!this.isValidIpOrCidr(value)) {
            this.showError(this.translate('Please enter a valid IP address or CIDR range.', 'Please enter a valid IP address or CIDR range.'));
            return;
        }

        if (this.state.bypassIps.includes(value)) {
            this.showError(this.translate('That value is already allowlisted.', 'That value is already allowlisted.'));
            return;
        }

        const newList = [...this.state.bypassIps, value];
        await this.saveSettings({
            bypassIps: newList,
            successMessage: this.translate('Allowlist updated.', 'Allowlist updated.')
        });

        this.elements.allowlistInput.value = '';
    }

    async handleRemoveIp(ip) {
        if (!ip) {
            return;
        }

        const newList = this.state.bypassIps.filter((item) => item !== ip);
        await this.saveSettings({
            bypassIps: newList,
            successMessage: this.translate('Allowlist updated.', 'Allowlist updated.')
        });
    }

    async handleGenerateBypass() {
        if (this.isSaving) {
            return;
        }

        await this.saveSettings({
            generateBypassToken: true,
            successMessage: this.translate('Bypass link generated.', 'Bypass link generated.')
        });
    }

    async handleCopyBypass() {
        if (!this.state.bypassLink) {
            return;
        }

        try {
            await navigator.clipboard.writeText(this.state.bypassLink);
            this.showSuccess(this.translate('Bypass link copied to clipboard.', 'Bypass link copied to clipboard.'));
        } catch (error) {
            console.error('❌ Failed to copy bypass link:', error);
            this.showError(this.translate('Unable to copy link. Try copying manually.', 'Unable to copy link. Try copying manually.'));
        }
    }

    async handleClearBypass() {
        this.state.bypassLink = null;
        this.state.bypassTokenExpiresAt = null;
        this.renderBypassLink();
    }

    async saveSettings(options = {}) {
        if (this.isSaving) {
            return;
        }

        const previousState = this.state.isEnabled;
        const payload = {
            action: 'update',
            is_enabled: options.isEnabled !== undefined ? options.isEnabled : this.state.isEnabled,
            bypass_ips: options.bypassIps || this.state.bypassIps,
            generate_bypass_token: Boolean(options.generateBypassToken)
        };

        this.isSaving = true;
        this.setMaintenanceLoading(true);

        try {
            const { data, error } = await this.invokeMaintenanceFunction(payload);

            if (error) {
                throw error;
            }

            const settings = data?.settings || data || {};

            this.state.isEnabled = Boolean(settings.is_enabled);
            this.state.bypassIps = Array.isArray(settings.bypass_ips) ? settings.bypass_ips : [];
            this.state.updatedAt = settings.updated_at || this.state.updatedAt;
            this.state.updatedBy = settings.updated_by || settings.updated_by_email || this.state.updatedBy;
            this.state.bypassLink = settings.last_generated_link || this.state.bypassLink;
            this.state.bypassTokenExpiresAt = settings.last_generated_link_expires_at || this.state.bypassTokenExpiresAt;

            this.renderMaintenanceStatus();
            this.renderAllowlist();
            this.renderBypassLink();
            this.renderAlert(settings.alert || null);

            const successMessage = options.successMessage ||
                (payload.is_enabled
                    ? this.translate('Maintenance mode enabled.', 'Maintenance mode enabled.')
                    : this.translate('Maintenance mode disabled.', 'Maintenance mode disabled.'));

            this.showSuccess(successMessage);

            if (previousState !== this.state.isEnabled) {
                await this.logAdminAction('maintenance_mode_toggled', {
                    is_enabled: this.state.isEnabled
                });
            } else if (options.bypassIps) {
                await this.logAdminAction('maintenance_allowlist_updated', {
                    count: this.state.bypassIps.length
                });
            } else if (options.generateBypassToken) {
                await this.logAdminAction('maintenance_bypass_generated', {});
            }
        } catch (error) {
            console.error('❌ Failed to update maintenance settings:', error);
            const message = error?.message || this.translate('Failed to update maintenance settings.', 'Failed to update maintenance settings.');
            this.showError(message);
        } finally {
            this.isSaving = false;
            this.setMaintenanceLoading(false);
        }
    }

    async invokeMaintenanceFunction(body) {
        if (!window.supabase || !window.supabase.functions?.invoke) {
            throw new Error('Supabase client not available');
        }

        return await window.supabase.functions.invoke('maintenance-settings', {
            body
        });
    }

    isValidIpOrCidr(value) {
        if (!value) {
            return false;
        }

        const trimmed = value.trim();
        if (trimmed.toLowerCase() === 'localhost') {
            return true;
        }

        const ipv4Segment = '(25[0-5]|2[0-4]\\d|1?\\d?\\d)';
        const ipv4Pattern = new RegExp(`^(${ipv4Segment}\\.){3}${ipv4Segment}(\\/(3[0-2]|[12]?\\d))?$`);

        const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{0,4})(\/(12[0-8]|1[01][0-9]|[1-9]?[0-9]))?$/;

        return ipv4Pattern.test(trimmed) || ipv6Pattern.test(trimmed);
    }

    formatDate(value) {
        if (!value) {
            return this.translate('Not available', 'Not available');
        }

        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return this.translate('Not available', 'Not available');
            }

            return date.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return this.translate('Not available', 'Not available');
        }
    }

    async logAdminAction(action, details) {
        if (!window.adminLayout || typeof window.adminLayout.logAdminAction !== 'function') {
            return;
        }

        try {
            await window.adminLayout.logAdminAction(action, details);
        } catch (error) {
            console.warn('⚠️ Failed to log admin action:', error);
        }
    }

    showError(message) {
        if (window.adminLayout && typeof window.adminLayout.showError === 'function') {
            window.adminLayout.showError(message);
        } else {
            alert(`❌ ${message}`);
        }
    }

    showSuccess(message) {
        if (window.adminLayout && typeof window.adminLayout.showSuccess === 'function') {
            window.adminLayout.showSuccess(message);
        } else {
            console.log(message);
        }
    }

    translate(key, fallback) {
        if (window.bulkOperationsTranslations) {
            const translated = window.bulkOperationsTranslations.getTranslation(key);
            if (translated) {
                return translated;
            }
        }

        if (window.i18next && typeof window.i18next.t === 'function') {
            const result = window.i18next.t(key);
            if (result && result !== key) {
                return result;
            }
        }

        return fallback;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.BulkOperations = BulkOperations;
}


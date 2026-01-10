/**
 * Maintenance Mode Component
 * Handles maintenance flag and IP allowlist management.
 */

if (typeof window.MaintenanceMode === 'undefined') {
class MaintenanceMode {
    constructor(options = {}) {
        this.options = options;
        this.rootSelector = options.rootSelector || '#maintenance-mode-component';
        this.root = null;
        this.elements = {};
        this.isInitialized = false;
        this.isSaving = false;
        this.state = {
            isEnabled: false,
            bypassIps: [],
            updatedAt: null,
            updatedBy: null,
            updatedByEmail: null
        };
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        let translationsReady = false;

        try {
            this.resolveRoot();
            this.cacheElements();
            this.renderAlert(null);
            this.setupEventListeners();

            translationsReady = await this.initializeTranslations();
        } catch (error) {
            window.logger?.error('❌ MaintenanceMode: failed to initialize component', error);
            this.showError(this.translate('Failed to load maintenance settings.', 'Failed to load maintenance settings.'));
        } finally {
            this.showTranslatableContent();
        }

        try {
            await this.loadSettings({ showErrors: false });

            window.addEventListener('languageChanged', () => {
                this.updateTranslations();
            });

            this.isInitialized = true;
        } catch (error) {
            window.logger?.error('❌ MaintenanceMode: failed to load maintenance settings', error);
            if (!translationsReady) {
                this.showError(this.translate('Failed to load maintenance settings.', 'Failed to load maintenance settings.'));
            }
        }
    }

    resolveRoot() {
        const container = document.querySelector(this.rootSelector);
        if (!container) {
            throw new Error('Maintenance mode container not found');
        }

        this.root = container.querySelector('.maintenance-mode') || container;
        this.root.classList.add('maintenance-mode');
    }

    cacheElements() {
        const query = (selector) => this.root.querySelector(selector);

        this.elements.statusPill = query('[data-maintenance="status-pill"]');
        this.elements.toggleButton = query('[data-maintenance="toggle"]');
        this.elements.refreshButton = query('[data-maintenance="refresh"]');
        this.elements.lastUpdated = query('[data-maintenance="last-updated"]');
        this.elements.updatedBy = query('[data-maintenance="updated-by"]');
        this.elements.alert = query('[data-maintenance="alert"]');
        this.elements.alertMessage = query('[data-maintenance="alert-message"]');

        this.elements.allowlistForm = query('[data-maintenance="allowlist-form"]');
        this.elements.allowlistInput = query('[data-maintenance="allowlist-input"]');
        this.elements.allowlistList = query('[data-maintenance="allowlist-list"]');
        this.elements.allowlistEmpty = query('[data-maintenance="allowlist-empty"]');
    }

    setupEventListeners() {
        this.elements.toggleButton?.addEventListener('click', () => this.handleToggle());
        this.elements.refreshButton?.addEventListener('click', () => this.handleRefresh());

        this.elements.allowlistForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleAllowlistSubmit();
        });

        this.elements.allowlistList?.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLButtonElement && target.dataset.ip) {
                this.handleRemoveIp(target.dataset.ip);
            }
        });
    }

    async initializeTranslations() {
        try {
            if (!window.maintenanceModeTranslations) {
                await this.loadScript('/admin/components/maintenance-mode/maintenance-mode-translations.js');
            }

            if (window.maintenanceModeTranslations && !window.maintenanceModeTranslations.isInitialized) {
                await window.maintenanceModeTranslations.init();
            }
            return true; // Indicate translations are ready
        } catch (error) {
            window.logger?.error('❌ Failed to initialize maintenance translations:', error);
            return false; // Indicate translations failed
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
        this.root.classList.add('is-ready');
        const translatable = this.root.querySelectorAll('.translatable-content');
        translatable.forEach((el) => el.classList.add('loaded'));
        this.updateTranslations();
    }

    updateTranslations() {
        if (window.maintenanceModeTranslations) {
            window.maintenanceModeTranslations.updateTranslations(this.root);
        }
    }

    async loadSettings({ showErrors = true } = {}) {
        try {
            this.setLoading(true);

            const response = await this.invokeMaintenanceFunction({ action: 'get' });
            if (response.error) {
                throw new Error(response.error);
            }

            window.logger?.log('📋 Frontend: Full response from API', response);
            
            const settings = response?.settings || {};
            window.logger?.log('📋 Frontend: settings.bypass_ips', settings.bypass_ips, 'Type:', typeof settings.bypass_ips, 'IsArray:', Array.isArray(settings.bypass_ips));
            
            this.state.isEnabled = Boolean(settings.is_enabled);
            this.state.bypassIps = Array.isArray(settings.bypass_ips) ? settings.bypass_ips : [];
            
            window.logger?.log('📋 Frontend: this.state.bypassIps after assignment', this.state.bypassIps, 'Length:', this.state.bypassIps.length);
            
            this.state.updatedAt = settings.updated_at || null;
            this.state.updatedByEmail = settings.updated_by_email || null;
            this.state.updatedBy = settings.updated_by || null;

            this.renderStatus();
            this.renderAllowlist();
            this.renderAlert(settings.alert || null);
        } catch (error) {
            window.logger?.error('❌ Failed to load maintenance settings:', error);
            if (showErrors) {
                this.showError(this.translate('Failed to load maintenance settings.', 'Failed to load maintenance settings.'));
            } else {
                this.renderAlert(this.translate('Unable to reach maintenance settings. Refresh to try again.', 'Unable to reach maintenance settings. Refresh to try again.'));
            }
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        const disabledElements = [
            this.elements.toggleButton,
            this.elements.refreshButton,
            this.elements.allowlistInput
        ];

        disabledElements.forEach((el) => {
            if (el) {
                el.disabled = Boolean(isLoading);
            }
        });

        const submitButton = this.elements.allowlistForm?.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = Boolean(isLoading);
        }
    }

    renderStatus() {
        if (!this.elements.statusPill) {
            return;
        }

        const isEnabled = Boolean(this.state.isEnabled);
        this.elements.statusPill.classList.toggle('maintenance-mode__status--active', isEnabled);
        this.elements.statusPill.classList.toggle('maintenance-mode__status--inactive', !isEnabled);

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
            const displayName = this.state.updatedByEmail || this.state.updatedBy || this.translate('Not available', 'Not available');
            this.elements.updatedBy.textContent = displayName;
        }
    }

    renderAllowlist() {
        if (!this.elements.allowlistList || !this.elements.allowlistEmpty) {
            window.logger?.warn('⚠️ Frontend: Missing DOM elements for allowlist rendering', {
                allowlistList: !!this.elements.allowlistList,
                allowlistEmpty: !!this.elements.allowlistEmpty
            });
            return;
        }

        window.logger?.log('📋 Frontend: renderAllowlist called, this.state.bypassIps', this.state.bypassIps, 'Length:', this.state.bypassIps.length);

        this.elements.allowlistList.innerHTML = '';

        if (!this.state.bypassIps.length) {
            window.logger?.log('📋 Frontend: No IPs to render, showing empty message');
            this.elements.allowlistEmpty.hidden = false;
            return;
        }

        window.logger?.log('📋 Frontend: Rendering', this.state.bypassIps.length, 'IPs:', this.state.bypassIps);
        this.elements.allowlistEmpty.hidden = true;

        this.state.bypassIps.forEach((ip) => {
            const item = document.createElement('li');
            item.className = 'maintenance-mode__allowlist-item';
            item.innerHTML = `
                <span>${this.escapeHtml(ip)}</span>
                <button
                    type="button"
                    class="maintenance-mode__allowlist-remove"
                    data-ip="${this.escapeHtml(ip)}"
                    aria-label="${this.translate('Remove {{value}} from allowlist', 'Remove {{value}} from allowlist').replace('{{value}}', ip)}"
                >
                    ×
                </button>
            `;
            this.elements.allowlistList.appendChild(item);
        });
    }

    renderAlert(message) {
        if (!this.elements.alert || !this.elements.alertMessage) {
            return;
        }

        if (!message) {
            this.elements.alert.hidden = true;
            this.elements.alert.style.display = 'none';
            this.elements.alertMessage.textContent = '';
            return;
        }

        this.elements.alert.hidden = false;
        this.elements.alert.style.display = 'flex';
        this.elements.alertMessage.textContent = message;
    }

    async handleToggle() {
        if (this.isSaving) {
            return;
        }

        const nextState = !this.state.isEnabled;
        await this.saveSettings({ isEnabled: nextState });
    }

    async handleRefresh() {
        await this.loadSettings({ showErrors: true });
        this.showSuccess(this.translate('Status refreshed.', 'Status refreshed.'));
    }

    async handleAllowlistSubmit() {
        const input = this.elements.allowlistInput;
        if (!input) {
            return;
        }

        const value = (input.value || '').trim();
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

        input.value = '';
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

    async saveSettings(options = {}) {
        if (this.isSaving) {
            return;
        }

        const previousState = this.state.isEnabled;
        const isChangingBypassIps = options.bypassIps !== undefined;
        const payload = {
            action: 'update',
            is_enabled: options.isEnabled !== undefined ? options.isEnabled : this.state.isEnabled
        };
        
        // Only include bypass_ips if explicitly changing it (not when just toggling mode)
        if (isChangingBypassIps) {
            payload.bypass_ips = options.bypassIps;
        }

        this.isSaving = true;
        this.setLoading(true);

        try {
            const response = await this.invokeMaintenanceFunction(payload);
            if (response.error) {
                throw new Error(response.error);
            }

            const settings = response?.settings || {};
            this.state.isEnabled = Boolean(settings.is_enabled);
            this.state.bypassIps = Array.isArray(settings.bypass_ips) ? settings.bypass_ips : [];
            this.state.updatedAt = settings.updated_at || this.state.updatedAt;
            this.state.updatedByEmail = settings.updated_by_email || this.state.updatedByEmail;
            this.state.updatedBy = settings.updated_by || this.state.updatedBy;

            // Always reload from server to ensure state is fresh
            await this.loadSettings({ showErrors: false });

            const successMessage = options.successMessage
                || (payload.is_enabled
                    ? this.translate('Maintenance mode enabled.', 'Maintenance mode enabled.')
                    : this.translate('Maintenance mode disabled.', 'Maintenance mode disabled.'));

            this.showSuccess(successMessage);

            if (previousState !== this.state.isEnabled) {
                await this.logAdminAction('maintenance_mode_toggled', {
                    is_enabled: this.state.isEnabled
                });
            } else if (isChangingBypassIps) {
                await this.logAdminAction('maintenance_allowlist_updated', {
                    count: this.state.bypassIps.length
                });
            }
        } catch (error) {
            window.logger?.error('❌ Failed to update maintenance settings:', error);
            const message = error?.message || this.translate('Failed to update maintenance settings.', 'Failed to update maintenance settings.');
            this.showError(message);
        } finally {
            this.isSaving = false;
            this.setLoading(false);
        }
    }

    async invokeMaintenanceFunction(body) {
        if (!window.supabase || !window.supabase.functions?.invoke) {
            throw new Error('Supabase client not available');
        }

        return await window.invokeEdgeFunction('maintenance-settings', { body });
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
            window.logger?.warn('⚠️ Failed to log admin action:', error);
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
            window.logger?.log(message);
        }
    }

    translate(key, fallback) {
        if (window.maintenanceModeTranslations) {
            const translated = window.maintenanceModeTranslations.getTranslation(key);
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

window.MaintenanceMode = MaintenanceMode;
}

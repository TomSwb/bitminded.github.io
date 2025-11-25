/**
 * Bulk Operations Component
 * Handles tab navigation and lazy-loading of tab content.
 */

if (typeof window.BulkOperations === 'undefined') {
class BulkOperations {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.activeTab = 'maintenance';
        this.loadedTabs = new Set();
        this.instances = {};
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        let translationsReady = false;

        try {
            this.cacheElements();
            this.setupTabs();

            translationsReady = await this.initializeTranslations();
        } catch (error) {
            window.logger?.error('❌ BulkOperations: failed to initialize component', error);
            this.showError(this.translate('Failed to initialize bulk operations.', 'Failed to initialize bulk operations.'));
        } finally {
            this.showTranslatableContent();
        }

        try {
            await this.activateTab(this.activeTab);

            window.addEventListener('languageChanged', () => {
                this.updateTranslations();
            });

            this.isInitialized = true;
            
            // Final translation update after everything is loaded
            setTimeout(() => {
                this.updateTranslations();
            }, 200);
        } catch (error) {
            window.logger?.error('❌ BulkOperations: failed to load initial tab', error);
            if (!translationsReady) {
                this.showError(this.translate('Failed to load maintenance controls.', 'Failed to load maintenance controls.'));
            }
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
        this.elements.maintenanceContainer = root.querySelector('#maintenance-mode-container');
    }

    setupTabs() {
        if (!this.elements.tabs?.length) {
            return;
        }

        this.elements.tabs.forEach((tab) => {
            tab.addEventListener('click', async () => {
                const target = tab.getAttribute('data-tab');
                if (target) {
                    await this.activateTab(target);
                }
            });
        });
    }

    async activateTab(tabName) {
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

        if (tabName === 'maintenance') {
            await this.ensureMaintenanceTabLoaded();
        }
        
        // Reapply translations after tab activation
        setTimeout(() => {
            this.updateTranslations();
        }, 100);
    }

    async ensureMaintenanceTabLoaded() {
        if (this.loadedTabs.has('maintenance')) {
            return;
        }

        if (!window.componentLoader || !this.elements.maintenanceContainer) {
            window.logger?.error('❌ Maintenance tab container not available');
            return;
        }

        try {
            const loaderMarkup = `
                <div class="bulk-operations__loader" role="status" aria-live="polite">
                    <span>${this.translate('Loading maintenance controls...', 'Loading maintenance controls...')}</span>
                </div>
            `;
            this.elements.maintenanceContainer.innerHTML = loaderMarkup;

            await window.componentLoader.load('maintenance-mode', {
                container: '#maintenance-mode-container',
                basePath: 'admin/components'
            });

            const loader = this.elements.maintenanceContainer.querySelector('.bulk-operations__loader');
            loader?.remove();

            if (window.MaintenanceMode) {
                this.instances.maintenance = new window.MaintenanceMode({
                    rootSelector: '#maintenance-mode-container'
                });
                await this.instances.maintenance.init();
            }

            this.loadedTabs.add('maintenance');
            
            // Reapply translations after maintenance tab loads
            setTimeout(() => {
                this.updateTranslations();
            }, 150);
        } catch (error) {
            window.logger?.error('❌ Failed to load maintenance mode component:', error);
            this.showError(this.translate('Failed to load maintenance controls.', 'Failed to load maintenance controls.'));
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
            return true; // Indicate translations are ready
        } catch (error) {
            window.logger?.error('❌ Failed to initialize bulk operations translations:', error);
            return false; // Indicate translations failed to initialize
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
            const translatable = this.elements.root.querySelectorAll('.translatable-content');
            translatable.forEach((el) => el.classList.add('loaded'));
        }

        this.updateTranslations();
    }

    updateTranslations() {
        if (window.bulkOperationsTranslations) {
            window.bulkOperationsTranslations.updateTranslations();
        }
    }

    showError(message) {
        if (window.adminLayout && typeof window.adminLayout.showError === 'function') {
            window.adminLayout.showError(message);
        } else {
            alert(`❌ ${message}`);
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
}

window.BulkOperations = BulkOperations;
}


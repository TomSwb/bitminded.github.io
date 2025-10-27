/**
 * Step 5: Cloudflare Configuration
 * Handles subdomain and worker configuration
 */

if (typeof window.StepCloudflareSetup === 'undefined') {
    window.StepCloudflareSetup = class {
        constructor() {
            this.elements = {};
        }

        async init() {
            console.log('☁️ Initializing Step 5: Cloudflare Configuration');
            this.initializeElements();
            this.setupEventListeners();
            this.setupDefaults();
        }

        initializeElements() {
            this.elements.subdomainInput = document.getElementById('cloudflare-subdomain');
            this.elements.workerUrlInput = document.getElementById('cloudflare-worker-url');
            this.elements.subdomainPreview = document.getElementById('subdomain-preview');
        }

        setupEventListeners() {
            // Update subdomain preview
            if (this.elements.subdomainInput) {
                this.elements.subdomainInput.addEventListener('input', () => {
                    this.updateSubdomainPreview();
                    this.saveFormData();
                });
            }

            if (this.elements.workerUrlInput) {
                this.elements.workerUrlInput.addEventListener('input', () => this.saveFormData());
            }
        }

        updateSubdomainPreview() {
            if (this.elements.subdomainInput && this.elements.subdomainPreview) {
                const subdomain = this.elements.subdomainInput.value || '[subdomain]';
                this.elements.subdomainPreview.textContent = `${subdomain}.bitminded.ch`;
            }
        }

        setupDefaults() {
            if (!window.productWizard) return;

            const basicInfo = window.productWizard.formData || {};

            // Load existing data
            if (basicInfo.cloudflare_domain) {
                this.elements.subdomainInput.value = basicInfo.cloudflare_domain.replace('.bitminded.ch', '');
            } else if (basicInfo.slug) {
                // Auto-fill from product slug
                this.elements.subdomainInput.value = basicInfo.slug;
            }

            if (basicInfo.cloudflare_worker_url) {
                this.elements.workerUrlInput.value = basicInfo.cloudflare_worker_url;
            }

            // Update preview
            this.updateSubdomainPreview();

            // Mark step as completed if data exists
            if (basicInfo.cloudflare_domain || basicInfo.cloudflare_worker_url) {
                if (window.productWizard) {
                    window.productWizard.markStepCompleted(5);
                }
            }
        }

        saveFormData() {
            if (!window.productWizard) return;

            const subdomain = this.elements.subdomainInput?.value || '';
            const workerUrl = this.elements.workerUrlInput?.value || '';

            // Save to form data
            window.productWizard.formData.cloudflare_domain = subdomain 
                ? `${subdomain}.bitminded.ch` 
                : null;
            window.productWizard.formData.cloudflare_worker_url = workerUrl || null;

            console.log('💾 Saved Cloudflare data to formData');
        }

        setFormData(formData) {
            // This method is called by the wizard to load existing data
            if (formData) {
                window.productWizard.formData = { ...window.productWizard.formData, ...formData };
            }
        }

        validate() {
            // Cloudflare configuration is optional
            return true;
        }
    };
}


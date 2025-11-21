/**
 * Step 6: Cloudflare Configuration
 * Handles subdomain and worker configuration
 */

if (typeof window.StepCloudflareSetup === 'undefined') {
    window.StepCloudflareSetup = class {
        constructor() {
            this.elements = {};
        }

        async init() {
            window.logger?.log('☁️ Initializing Step 6: Cloudflare Configuration');
            this.initializeElements();
            this.setupEventListeners();
            this.setupDefaults();
        }

        initializeElements() {
            this.elements.subdomainInput = document.getElementById('cloudflare-subdomain');
            this.elements.workerUrlInput = document.getElementById('cloudflare-worker-url');
            this.elements.subdomainPreview = document.getElementById('subdomain-preview');
            this.elements.subdomainPreviewRoute = document.getElementById('subdomain-preview-route');
            this.elements.createWorkerBtn = document.getElementById('create-worker-btn');
            this.elements.recreateWorkerBtn = document.getElementById('recreate-worker-btn');
            this.elements.workerStatus = document.getElementById('worker-status');
            this.elements.createSection = document.querySelector('.step-cloudflare-setup__create-section');
            this.elements.recreateSection = document.getElementById('recreate-worker-section');
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

            // Create worker button
            if (this.elements.createWorkerBtn) {
                this.elements.createWorkerBtn.addEventListener('click', () => this.handleCreateWorker());
            }

            // Recreate worker button
            if (this.elements.recreateWorkerBtn) {
                this.elements.recreateWorkerBtn.addEventListener('click', () => this.handleCreateWorker(true));
            }
        }

        updateSubdomainPreview() {
            if (this.elements.subdomainInput) {
                const subdomain = this.elements.subdomainInput.value || '[subdomain]';
                const fullDomain = `${subdomain}.bitminded.ch`;
                
                if (this.elements.subdomainPreview) {
                    this.elements.subdomainPreview.textContent = fullDomain;
                }
                
                if (this.elements.subdomainPreviewRoute) {
                    this.elements.subdomainPreviewRoute.textContent = fullDomain;
                }
            }
            // Also update GitHub Pages instructions when subdomain changes
            this.updateGitHubPagesInstructions();
        }
        
        updateGitHubPagesInstructions() {
            if (!window.productWizard) return;
            
            const basicInfo = window.productWizard.formData || {};
            const githubRepoUrl = basicInfo.github_repo_url;
            
            // Update GitHub repo link
            const repoLinkEl = document.getElementById('github-repo-link');
            if (repoLinkEl && githubRepoUrl) {
                repoLinkEl.innerHTML = `<a href="${githubRepoUrl}" target="_blank" rel="noopener">${githubRepoUrl}</a>`;
            } else if (repoLinkEl) {
                repoLinkEl.textContent = '[Repository URL from Step 4]';
            }
            
            // Update GitHub Pages URL
            const pagesUrlEl = document.getElementById('github-pages-url');
            if (pagesUrlEl && githubRepoUrl) {
                try {
                    const match = githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                    if (match) {
                        const owner = match[1];
                        const repo = match[2];
                        const pagesUrl = `https://${owner}.github.io/${repo}`;
                        pagesUrlEl.textContent = pagesUrl;
                    } else {
                        pagesUrlEl.textContent = 'https://[username].github.io/[repo-name]';
                    }
                } catch (e) {
                    pagesUrlEl.textContent = 'https://[username].github.io/[repo-name]';
                }
            } else if (pagesUrlEl) {
                pagesUrlEl.textContent = 'https://[username].github.io/[repo-name]';
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
            
            // Update GitHub Pages instructions with dynamic URLs
            this.updateGitHubPagesInstructions();

            // Mark step as completed if data exists
            if (basicInfo.cloudflare_domain || basicInfo.cloudflare_worker_url) {
                if (window.productWizard) {
                    window.productWizard.markStepCompleted(6);
                }
                
                // Restore UI state - show worker status and hide create section
                if (basicInfo.cloudflare_worker_url) {
                    const workerUrl = basicInfo.cloudflare_domain ? `https://${basicInfo.cloudflare_domain}` : '';
                    this.showWorkerStatus({
                        workerDevUrl: basicInfo.cloudflare_worker_url,
                        workerUrl: workerUrl
                    });
                    this.elements.createSection.style.display = 'none';
                    // Show recreate button since worker exists
                    if (this.elements.recreateSection) {
                        this.elements.recreateSection.style.display = 'block';
                    }
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

            window.logger?.log('💾 Saved Cloudflare data to formData');
        }

        setFormData(formData) {
            // This method is called by the wizard to load existing data
            if (formData) {
                window.productWizard.formData = { ...window.productWizard.formData, ...formData };
            }
        }

        async handleCreateWorker(isRecreate = false) {
            const basicInfo = window.productWizard?.formData || {};

            const subdomain = this.elements.subdomainInput?.value;
            if (!subdomain) {
                alert('Please enter a subdomain first');
                this.elements.subdomainInput?.focus();
                return;
            }

            // Disable appropriate button(s)
            const buttonToDisable = isRecreate ? this.elements.recreateWorkerBtn : this.elements.createWorkerBtn;
            if (buttonToDisable) {
                buttonToDisable.disabled = true;
                buttonToDisable.innerHTML = '<span class="btn-icon">⏳</span><span>' + (isRecreate ? 'Recreating Worker...' : 'Creating Worker...') + '</span>';
            }

            // Derive Supabase functions base from frontend config to avoid project mismatch
            const supabaseBaseUrl = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '';
            const supabaseFunctionsUrl = supabaseBaseUrl
                ? supabaseBaseUrl.replace('.supabase.co', '.functions.supabase.co')
                : '';
            const supabaseAnonKey = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '';

            // Extract GitHub repo URL to construct GitHub Pages URL
            const githubRepoUrl = basicInfo.github_repo_url 
                || window.productWizard?.formData?.github_repo_url 
                || null;
            
            // Construct GitHub Pages URL from repo URL if available
            let githubPagesUrl = null;
            if (githubRepoUrl) {
                try {
                    // Extract owner and repo from GitHub URL
                    // URL format: https://github.com/owner/repo
                    const match = githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                    if (match) {
                        const owner = match[1];
                        const repo = match[2];
                        githubPagesUrl = `https://${owner}.github.io/${repo}`;
                        window.logger?.log(`📦 Constructed GitHub Pages URL: ${githubPagesUrl}`);
                    }
                } catch (e) {
                    window.logger?.warn('Failed to construct GitHub Pages URL:', e);
                }
            }

            const workerData = {
                subdomain,
                productName: basicInfo.name || 'Product',
                productSlug: basicInfo.slug || subdomain,
                supabaseFunctionsUrl,
                supabaseAnonKey,
                githubPagesUrl // GitHub Pages URL (public until Enterprise plan)
            };

            window.logger?.log('☁️ Creating Cloudflare Worker:', workerData);

            try {
                const { data, error } = await window.supabase.functions.invoke('create-cloudflare-worker', {
                    body: workerData
                });

                if (error) throw error;

                if (data && data.success) {
                    // Update input fields first
                    this.elements.workerUrlInput.value = data.workerDevUrl;
                    
                    // Then save form data (this will properly reconstruct cloudflare_domain from subdomain input)
                    this.saveFormData();
                    
                    // Override with the actual worker URL from response
                    window.productWizard.formData.cloudflare_worker_url = data.workerDevUrl;
                    
                    // Save to database
                    await window.productWizard.saveDraftToDatabase();

                    // Mark step as completed
                    if (window.productWizard) {
                        window.productWizard.markStepCompleted(6);
                    }

                    // Show status
                    this.showWorkerStatus(data);

                    // Hide create button, show recreate button
                    this.elements.createSection.style.display = 'none';
                    if (this.elements.recreateSection) {
                        this.elements.recreateSection.style.display = 'block';
                    }

                    // Re-enable and reset button state (for recreate button)
                    if (buttonToDisable) {
                        buttonToDisable.disabled = false;
                        if (isRecreate) {
                            buttonToDisable.innerHTML = '<span class="btn-icon">🔄</span><span>Recreate Worker (Use Latest Edge Function)</span>';
                        } else {
                            buttonToDisable.innerHTML = '<span class="btn-icon">☁️</span><span>Create Cloudflare Worker</span>';
                        }
                    }

                    alert('✅ Cloudflare Worker ' + (isRecreate ? 'recreated' : 'created') + ' successfully!');
                } else {
                    throw new Error(data?.error || 'Failed to create Worker');
                }
            } catch (error) {
                window.logger?.error('❌ Error creating Cloudflare Worker:', error);
                alert('Failed to create Cloudflare Worker: ' + error.message);
                
                // Re-enable appropriate button
                if (buttonToDisable) {
                    buttonToDisable.disabled = false;
                    if (isRecreate) {
                        buttonToDisable.innerHTML = '<span class="btn-icon">🔄</span><span>Recreate Worker (Use Latest Edge Function)</span>';
                    } else {
                        buttonToDisable.innerHTML = '<span class="btn-icon">☁️</span><span>Create Cloudflare Worker</span>';
                    }
                }
            }
        }

        showWorkerStatus(data) {
            if (!this.elements.workerStatus) return;

            this.elements.workerStatus.style.display = 'block';
            this.elements.workerStatus.innerHTML = `
                <div class="step-cloudflare-setup__status-item step-cloudflare-setup__status-item--success">
                    <span class="step-cloudflare-setup__status-icon">✅</span>
                    <div class="step-cloudflare-setup__status-content">
                        <strong>Cloudflare Worker Created</strong>
                        <p>Worker URL: <a href="${data.workerDevUrl}" target="_blank">${data.workerDevUrl}</a></p>
                        ${data.workerUrl ? `<p>Custom Domain: <a href="${data.workerUrl}" target="_blank">${data.workerUrl}</a></p>` : ''}
                    </div>
                </div>
            `;
        }

        validate() {
            // Cloudflare configuration is optional
            return true;
        }
    };
}


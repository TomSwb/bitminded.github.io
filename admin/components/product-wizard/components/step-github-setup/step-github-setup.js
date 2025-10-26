/**
 * Step 3: GitHub Repository Setup Component
 * Handles GitHub repository creation and configuration
 */

if (typeof window.StepGithubSetup === 'undefined') {
    window.StepGithubSetup = class StepGithubSetup {
        constructor() {
            this.elements = {};
            this.formData = {
                create_github_repo: true,
                github_repo_name: '',
                github_description: '',
                github_private: true,
                github_repo_url: '',
                github_branch: 'main'
            };
            this.repositoryCreated = false;
            this.specification = null;
        }

        /**
         * Initialize the component
         */
        async init() {
            console.log('📝 Initializing Step 3: GitHub Repository Setup...');
            
            this.initializeElements();
            this.attachEventListeners();
            this.setupDefaults();
            
            console.log('✅ Step 3: GitHub Repository Setup initialized successfully');
        }

        /**
         * Initialize DOM elements
         */
        initializeElements() {
            this.elements = {
                createRepoCheckbox: document.getElementById('create-github-repo'),
                githubConfig: document.getElementById('github-config'),
                repoNameInput: document.getElementById('github-repo-name'),
                descriptionTextarea: document.getElementById('github-description'),
                privateCheckbox: document.getElementById('github-private'),
                repoStructurePreview: document.getElementById('repo-structure-preview'),
                githubStatusSection: document.getElementById('github-status-section'),
                githubStatus: document.getElementById('github-status'),
                cloneInstructionsSection: document.getElementById('clone-instructions-section'),
                cloneCodeContent: document.getElementById('clone-code-content'),
                copyCloneBtn: document.getElementById('copy-clone-commands'),
                createRepoSection: document.getElementById('create-repo-section'),
                createRepoBtn: document.getElementById('create-repo-btn')
            };
        }

        /**
         * Attach event listeners
         */
        attachEventListeners() {
            if (this.elements.createRepoCheckbox) {
                this.elements.createRepoCheckbox.addEventListener('change', () => {
                    this.toggleGitHubConfig();
                });
            }

            if (this.elements.repoNameInput) {
                this.elements.repoNameInput.addEventListener('input', () => {
                    this.updateRepositoryStructure();
                });
            }

            if (this.elements.copyCloneBtn) {
                this.elements.copyCloneBtn.addEventListener('click', () => {
                    this.copyCloneCommands();
                });
            }

            if (this.elements.createRepoBtn) {
                this.elements.createRepoBtn.addEventListener('click', () => {
                    this.handleCreateRepository();
                });
            }
        }


        /**
         * Setup default values from previous steps
         */
        setupDefaults() {
            // Get basic info from Step 1
            if (window.productWizard && window.productWizard.formData) {
                const basicInfo = window.productWizard.formData;
                if (basicInfo.slug) {
                    this.formData.github_repo_name = basicInfo.slug;
                    if (this.elements.repoNameInput) {
                        this.elements.repoNameInput.value = basicInfo.slug;
                    }
                }
                if (basicInfo.short_description) {
                    this.formData.github_description = basicInfo.short_description;
                    if (this.elements.descriptionTextarea) {
                        this.elements.descriptionTextarea.value = basicInfo.short_description;
                    }
                }
                
                // Check if repository was already created
                if (basicInfo.github_repo_created && basicInfo.github_repo_url) {
                    this.repositoryCreated = true;
                    this.formData.github_repo_url = basicInfo.github_repo_url;
                    this.formData.github_repo_name = basicInfo.github_repo_name || basicInfo.github_repo_url.split('/').pop().replace('.git', '');
                    this.formData.github_branch = basicInfo.github_branch || 'main';
                    
                    // Show the final state
                    this.showFinalState();
                }
            }

            // Get technical specification from Step 2
            if (window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2]) {
                const step2Data = window.productWizard.stepData[2];
                if (step2Data.technicalSpecification) {
                    this.specification = step2Data.technicalSpecification;
                    this.updateRepositoryStructure();
                }
            }
        }

        /**
         * Toggle GitHub configuration visibility
         */
        toggleGitHubConfig() {
            const shouldCreate = this.elements.createRepoCheckbox.checked;
            if (this.elements.githubConfig) {
                this.elements.githubConfig.style.display = shouldCreate ? 'block' : 'none';
            }
            this.formData.create_github_repo = shouldCreate;
        }

        /**
         * Update repository structure preview
         */
        updateRepositoryStructure() {
            if (!this.elements.repoStructurePreview || !this.specification) {
                return;
            }

            // This will be enhanced with actual structure generation
            const structure = this.generateRepositoryStructure();
            this.elements.repoStructurePreview.innerHTML = structure;
        }

        /**
         * Generate repository structure based on specification
         */
        generateRepositoryStructure() {
            if (!this.specification) {
                return '<div class="step-github-setup__loading"><p>Loading repository structure...</p></div>';
            }

            // Only show files that will actually be created
            const isNode = /Node\.js/i.test(this.specification) || /npm/i.test(this.specification);

            let structure = `
                <div class="step-github-setup__structure">
                    <div class="step-github-setup__structure-item">
                        <span class="step-github-setup__structure-icon">📋</span>
                        <span class="step-github-setup__structure-name">README.md (Technical Specification)</span>
                    </div>
            `;

            // Add tech-specific files
            if (isNode) {
                structure += `
                    <div class="step-github-setup__structure-item">
                        <span class="step-github-setup__structure-icon">⚙️</span>
                        <span class="step-github-setup__structure-name">package.json</span>
                    </div>
                `;
            }

            structure += `
                    <div class="step-github-setup__structure-item">
                        <span class="step-github-setup__structure-icon">🚫</span>
                        <span class="step-github-setup__structure-name">.gitignore</span>
                    </div>
                </div>
            `;

            return structure;
        }

        /**
         * Get form data
         */
        getFormData() {
            if (this.elements.createRepoCheckbox) {
                this.formData.create_github_repo = this.elements.createRepoCheckbox.checked;
            }
            if (this.elements.repoNameInput) {
                this.formData.github_repo_name = this.elements.repoNameInput.value;
            }
            if (this.elements.descriptionTextarea) {
                this.formData.github_description = this.elements.descriptionTextarea.value;
            }
            if (this.elements.privateCheckbox) {
                this.formData.github_private = this.elements.privateCheckbox.checked;
            }

            return this.formData;
        }

        /**
         * Set form data (for draft/edit mode)
         */
        setFormData(data) {
            if (data) {
                this.formData = { ...this.formData, ...data };
                
                if (this.elements.createRepoCheckbox && data.create_github_repo !== undefined) {
                    this.elements.createRepoCheckbox.checked = data.create_github_repo;
                }
                if (this.elements.repoNameInput && data.github_repo_name) {
                    this.elements.repoNameInput.value = data.github_repo_name;
                }
                if (this.elements.descriptionTextarea && data.github_description) {
                    this.elements.descriptionTextarea.value = data.github_description;
                }
                if (this.elements.privateCheckbox && data.github_private !== undefined) {
                    this.elements.privateCheckbox.checked = data.github_private;
                }
            }
        }

        /**
         * Validate step
         */
        validate() {
            if (!this.elements.createRepoCheckbox.checked) {
                return true; // Optional step
            }

            if (!this.formData.github_repo_name) {
                console.error('❌ Repository name is required');
                return false;
            }

            return true;
        }

        /**
         * Handle create repository button click
         */
        async handleCreateRepository() {
            try {
                if (!this.elements.createRepoBtn) {
                    return;
                }

                // Disable button and show loading
                this.elements.createRepoBtn.disabled = true;
                this.elements.createRepoBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Creating...</span>';

                // Get form data
                this.getFormData();

                // Call Edge Function
                const result = await this.createRepository();

                if (result.success) {
                    // Hide create button
                    if (this.elements.createRepoSection) {
                        this.elements.createRepoSection.style.display = 'none';
                    }

                    // Show success
                    this.updateGitHubStatus(result.data);
                } else {
                    throw new Error(result.error || 'Failed to create repository');
                }

            } catch (error) {
                console.error('❌ Error creating repository:', error);
                
                // Re-enable button
                if (this.elements.createRepoBtn) {
                    this.elements.createRepoBtn.disabled = false;
                    this.elements.createRepoBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Create GitHub Repository</span>';
                }

                alert('Failed to create repository: ' + error.message);
            }
        }

        /**
         * Create GitHub repository (called when user clicks "Create Repository")
         */
        async createRepository() {
            try {
                console.log('🚀 Creating GitHub repository...');
                
                if (!this.validate()) {
                    throw new Error('Invalid form data');
                }

                // Get technical specification from Step 2
                const spec = this.getTechnicalSpecification();
                
                // Call Edge Function to create repository
                const { data, error } = await window.supabase.functions.invoke('create-github-repository', {
                    body: {
                        repoName: this.formData.github_repo_name,
                        description: this.formData.github_description,
                        private: this.formData.github_private,
                        specification: spec,
                        generatedReadme: this.generatedReadme || undefined
                    }
                });

                if (error) throw error;

                if (data && data.success) {
                    this.repositoryCreated = true;
                    this.formData.github_repo_url = data.repoUrl;
                    this.updateGitHubStatus(data);
                    console.log('✅ GitHub repository created successfully');
                    return { success: true, data };
                } else {
                    throw new Error(data?.error || 'Failed to create repository');
                }

            } catch (error) {
                console.error('❌ Error creating GitHub repository:', error);
                throw error;
            }
        }

        /**
         * Get technical specification from Step 2
         */
        getTechnicalSpecification() {
            if (window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2]) {
                return window.productWizard.stepData[2].technicalSpecification;
            }
            return null;
        }

        /**
         * Update GitHub status display
         */
        updateGitHubStatus(data) {
            if (!this.elements.githubStatusSection || !this.elements.githubStatus) {
                return;
            }

            this.elements.githubStatusSection.style.display = 'block';
            
            const statusTitle = data.repoExists ? 'Repository Already Exists' : 'Repository Created';
            const statusIcon = data.repoExists ? 'ℹ️' : '✅';
            
            this.elements.githubStatus.innerHTML = `
                <div class="step-github-setup__status-item step-github-setup__status-item--success">
                    <span class="step-github-setup__status-icon">${statusIcon}</span>
                    <div class="step-github-setup__status-content">
                        <strong>${statusTitle}</strong>
                        <p><a href="${data.repoUrl}" target="_blank">${data.repoUrl}</a></p>
                        ${data.repoExists ? '<p style="color: var(--color-text-primary); font-size: 0.9rem;">You can clone this existing repository to start working locally.</p>' : ''}
                    </div>
                </div>
            `;

            // Save repository status to wizard formData
            if (window.productWizard && window.productWizard.formData) {
                window.productWizard.formData.github_repo_created = true;
                window.productWizard.formData.github_repo_url = data.repoUrl;
                window.productWizard.formData.github_repo_name = data.repoName;
                window.productWizard.formData.github_branch = data.defaultBranch || 'main';
            }

            // Always show clone instructions
            this.showCloneInstructions(data);
        }

        /**
         * Show final state (when repo was already created)
         */
        showFinalState() {
            if (!this.elements.createRepoSection || !this.elements.githubStatusSection) {
                return;
            }

            // Hide the create button section
            this.elements.createRepoSection.style.display = 'none';

            // Show status with existing repo info
            this.elements.githubStatusSection.style.display = 'block';
            this.elements.githubStatus.innerHTML = `
                <div class="step-github-setup__status-item step-github-setup__status-item--success">
                    <span class="step-github-setup__status-icon">✅</span>
                    <div class="step-github-setup__status-content">
                        <strong>Repository Already Created</strong>
                        <p><a href="${this.formData.github_repo_url}" target="_blank">${this.formData.github_repo_url}</a></p>
                    </div>
                </div>
            `;

            // Show clone instructions
            this.showCloneInstructions({
                cloneUrl: this.formData.github_repo_url,
                repoName: this.formData.github_repo_name
            });
        }

        /**
         * Show clone instructions
         */
        showCloneInstructions(data) {
            if (!this.elements.cloneInstructionsSection || !this.elements.cloneCodeContent) {
                return;
            }

            // Convert HTTPS URL to SSH URL
            const httpsUrl = data.cloneUrl;
            const sshUrl = httpsUrl.replace('https://github.com/', 'git@github.com:').replace('.git', '');

            // Get the folder path from your configuration or prompt the user
            const repoName = data.repoName.split('/')[1];
            
            const commands = `# Open your projects folder
cd ~/bitminded-products

# Clone the repository (using SSH)
git clone ${sshUrl}

# Navigate to the project
cd ${repoName}`;

            this.elements.cloneCodeContent.textContent = commands;
            this.elements.cloneInstructionsSection.style.display = 'block';
        }

        /**
         * Copy clone commands to clipboard
         */
        async copyCloneCommands() {
            if (!this.elements.cloneCodeContent) {
                return;
            }

            const text = this.elements.cloneCodeContent.textContent;
            
            try {
                await navigator.clipboard.writeText(text);
                
                // Visual feedback
                if (this.elements.copyCloneBtn) {
                    const originalText = this.elements.copyCloneBtn.textContent;
                    this.elements.copyCloneBtn.textContent = 'Copied!';
                    this.elements.copyCloneBtn.style.background = 'var(--color-success)';
                    
                    setTimeout(() => {
                        this.elements.copyCloneBtn.textContent = originalText;
                        this.elements.copyCloneBtn.style.background = '';
                    }, 2000);
                }
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }

    };
}


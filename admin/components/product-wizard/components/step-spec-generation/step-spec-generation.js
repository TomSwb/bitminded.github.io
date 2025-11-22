class StepSpecGeneration {
    constructor() {
        this.isInitialized = false;
        this.conversationHistory = {};
        this.finalDecisions = {};
        this.recommendations = {};
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            
            this.initializeElements();
            this.attachEventListeners();
            await this.initializeTranslations();
            
            // Set context from Step 1
            this.setContextFromStep1();
            
            // Check if we have saved state
            if (this.hasSavedState()) {
                this.restoreState();
                // Show clear button since we have data
                if (this.clearAiBtn) this.clearAiBtn.style.display = 'inline-flex';
                if (this.loadAiBtn) this.loadAiBtn.style.display = 'none';
            } else {
                // Show the load button and hide clear button
                if (this.loadAiBtn) this.loadAiBtn.style.display = 'inline-flex';
                if (this.clearAiBtn) this.clearAiBtn.style.display = 'none';
            }
            
            this.isInitialized = true;
            
            // Check generation requirements
            this.checkGenerationRequirements();

            // Check if technical specification exists in the database and mark step as completed
            this.checkExistingSpec();
            
        } catch (error) {
            window.logger?.error('❌ Step 2: Failed to initialize:', error);
        }
    }

    initializeElements() {
        // AI Control elements
        this.loadAiBtn = document.getElementById('load-ai-recommendations-btn');
        this.clearAiBtn = document.getElementById('clear-ai-data-btn');
        
        // Context display elements
        this.contextProductName = document.getElementById('context-product-name');
        this.contextProductSlug = document.getElementById('context-product-slug');
        this.contextProductCategory = document.getElementById('context-product-category');
        this.contextProductShortDescription = document.getElementById('context-product-short-description');
        this.contextProductDescription = document.getElementById('context-product-description');
        this.contextProductTags = document.getElementById('context-product-tags');
        
        // AI generation elements
        this.generateSpecBtn = document.getElementById('generate-spec-btn');
        this.generationStatus = document.getElementById('generation-status');
        this.generatedSpecSection = document.getElementById('generated-spec-section');
        this.specContent = document.getElementById('spec-content');
        
        // Requirements elements
        this.requirementsText = document.querySelector('.requirements-text');
        
        // Discrepancy analysis elements
        this.discrepancyAnalysis = document.getElementById('discrepancy-analysis');
        this.discrepancyContent = document.getElementById('discrepancy-content');
        
        // Spec action elements
        this.downloadSpecBtn = document.getElementById('download-spec-btn');
        this.regenerateSpecBtn = document.getElementById('regenerate-spec-btn');
        
        // Additional context elements
        this.targetUsersInput = document.getElementById('target-users');
        this.businessProblemInput = document.getElementById('business-problem');
        this.timelineContextInput = document.getElementById('timeline-context');
    }

    attachEventListeners() {
        // AI Control buttons
        if (this.loadAiBtn) {
            this.loadAiBtn.addEventListener('click', () => {
                this.loadInitialRecommendations();
            });
        }
        
        if (this.clearAiBtn) {
            this.clearAiBtn.addEventListener('click', () => {
                this.clearAllAiData();
            });
        }
        
        // Ask AI buttons
        document.querySelectorAll('.ask-ai-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldName = e.target.dataset.field;
                this.toggleChat(fieldName);
            });
        });

        // Accept buttons
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldName = e.target.dataset.field;
                this.acceptRecommendation(fieldName);
            });
        });

        // Reload buttons
        document.querySelectorAll('.reload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldName = e.target.dataset.field;
                this.reloadRecommendation(fieldName);
            });
        });

        // Send buttons in chat
        document.querySelectorAll('.send-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldName = e.target.dataset.field;
                this.sendChatMessage(fieldName);
            });
        });

        // Enter key in chat inputs
        document.querySelectorAll('.chat-input input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const fieldName = e.target.id.replace('input-', '');
                    this.sendChatMessage(fieldName);
                }
            });
        });

        // Suggestion buttons for additional context
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldName = e.target.dataset.field;
                this.getSuggestion(fieldName);
            });
        });

        // Generate spec button
        if (this.generateSpecBtn) {
            this.generateSpecBtn.addEventListener('click', () => {
                this.generateSpecification();
            });
        }
        
        // Spec action buttons
        if (this.downloadSpecBtn) {
            this.downloadSpecBtn.addEventListener('click', () => {
                this.downloadSpecification();
            });
        }
        
        if (this.regenerateSpecBtn) {
            this.regenerateSpecBtn.addEventListener('click', () => {
                this.generateSpecification();
            });
        }
    }

    async initializeTranslations() {
        try {
            if (window.i18next && window.i18next.isInitialized) {
                // i18next ready
            }
        } catch (error) {
            // i18next not ready, using standalone translations
        }
    }

    setContextFromStep1() {
        if (!window.productWizard || !window.productWizard.formData) {
            return;
        }

        const step1Data = window.productWizard.formData;
        
        if (this.contextProductName) this.contextProductName.textContent = step1Data.name || '';
        if (this.contextProductSlug) this.contextProductSlug.textContent = step1Data.slug || '';
        if (this.contextProductCategory) this.contextProductCategory.textContent = step1Data.category || '';
        if (this.contextProductShortDescription) this.contextProductShortDescription.textContent = step1Data.short_description || '';
        if (this.contextProductDescription) this.contextProductDescription.textContent = step1Data.description || '';
        
        if (this.contextProductTags) {
            const tags = Array.isArray(step1Data.tags) ? step1Data.tags : (step1Data.tags || '').split(',').map(tag => tag.trim());
            this.contextProductTags.textContent = tags.join(', ');
        }
    }

    async loadInitialRecommendations() {
        // Show loading state on button
        if (this.loadAiBtn) {
            this.loadAiBtn.disabled = true;
            this.loadAiBtn.innerHTML = '<span class="btn-icon">⏳</span>Loading AI Recommendations...';
        }
        
        const fields = ['platform-type', 'frontend-tech', 'backend-tech', 'database-type', 'auth-type', 'payment-type'];
        let completed = 0;
        
        for (const fieldName of fields) {
            try {
                await this.getInitialRecommendation(fieldName);
                completed++;
                
                // Update button text with progress
                if (this.loadAiBtn) {
                    this.loadAiBtn.innerHTML = `<span class="btn-icon">⏳</span>Loading AI Recommendations... (${completed}/${fields.length})`;
                }
            } catch (error) {
                window.logger?.error(`❌ Error loading recommendation for ${fieldName}:`, error);
                completed++;
            }
        }
        
        // Update button visibility and restore button text
        if (this.loadAiBtn) {
            this.loadAiBtn.disabled = false;
            this.loadAiBtn.style.display = 'none';
        }
        if (this.clearAiBtn) this.clearAiBtn.style.display = 'inline-flex';
    }

    async getInitialRecommendation(fieldName) {
        try {
            const productContext = this.getProductContext();
            window.logger?.log(`🤖 Getting AI recommendation for ${fieldName}:`, productContext);
            
            const response = await window.supabase.functions.invoke('conversational-tech-guidance', {
                body: {
                    ...productContext,
                    fieldName: fieldName,
                    userQuestion: 'Please provide your initial recommendation with reasoning.'
                }
            });

            window.logger?.log(`📥 Response for ${fieldName}:`, response);

            if (response.error) {
                throw new Error(response.error.message);
            }

            const aiResponse = response.data.response;
            window.logger?.log(`✅ AI Response for ${fieldName}:`, aiResponse);
            
            this.recommendations[fieldName] = aiResponse;
            
            // Display the recommendation
            this.displayRecommendation(fieldName, aiResponse);
            
            // Save state after each recommendation
            this.saveState();
            
        } catch (error) {
            window.logger?.error(`❌ Error getting initial recommendation for ${fieldName}:`, error);
            this.showRecommendationError(fieldName, error.message);
        }
    }

    displayRecommendation(fieldName, recommendation) {
        const recommendationElement = document.getElementById(`recommendation-${fieldName}`);
        const valueElement = document.getElementById(`${fieldName.split('-')[0]}-recommendation`);
        const reasoningElement = document.getElementById(`${fieldName.split('-')[0]}-reasoning`);
        
        // Show the recommendation section first
        if (recommendationElement) {
            recommendationElement.style.display = 'block';
        }
        
        // Show loading text first
        if (valueElement) {
            valueElement.style.display = 'inline';
            valueElement.textContent = 'Loading recommendation...';
        }
        
        if (reasoningElement) {
            reasoningElement.style.display = 'block';
            reasoningElement.textContent = 'Getting AI analysis...';
        }
        
        // Then update with actual recommendation
        setTimeout(() => {
            if (valueElement) {
                valueElement.textContent = this.formatOptionName(recommendation.recommendation);
            }
            
            if (reasoningElement) {
                reasoningElement.textContent = recommendation.reasoning;
            }
        }, 100);
    }

    showRecommendationError(fieldName, errorMessage) {
        const valueElement = document.getElementById(`${fieldName.split('-')[0]}-recommendation`);
        const reasoningElement = document.getElementById(`${fieldName.split('-')[0]}-reasoning`);
        
        if (valueElement) {
            valueElement.textContent = 'Error loading recommendation';
        }
        
        if (reasoningElement) {
            reasoningElement.textContent = errorMessage;
        }
    }

    showNewRecommendation(fieldName, newRecommendation) {
        // Store the new recommendation temporarily
        this.pendingRecommendations = this.pendingRecommendations || {};
        this.pendingRecommendations[fieldName] = newRecommendation;
        
        // Add a special message in the chat with apply option
        const messagesElement = document.getElementById(`messages-${fieldName}`);
        if (messagesElement) {
            const applyDiv = document.createElement('div');
            applyDiv.className = 'chat-message ai new-recommendation';
            applyDiv.innerHTML = `
                <div class="new-recommendation-content">
                    <div class="new-recommendation-header">
                        <strong>🤖 New Recommendation:</strong> ${this.formatOptionName(newRecommendation.recommendation)}
                    </div>
                    <div class="new-recommendation-reasoning">${newRecommendation.reasoning}</div>
                    <div class="new-recommendation-actions">
                        <button type="button" class="btn-primary apply-new-btn" data-field="${fieldName}">Apply This</button>
                        <button type="button" class="btn-secondary keep-original-btn" data-field="${fieldName}">Keep Original</button>
                    </div>
                </div>
            `;
            
            messagesElement.appendChild(applyDiv);
            messagesElement.scrollTop = messagesElement.scrollHeight;
            
            // Attach event listeners to the new buttons
            const applyBtn = applyDiv.querySelector('.apply-new-btn');
            const keepBtn = applyDiv.querySelector('.keep-original-btn');
            
            applyBtn.addEventListener('click', () => {
                this.applyNewRecommendation(fieldName);
                applyDiv.remove();
            });
            
            keepBtn.addEventListener('click', () => {
                applyDiv.remove();
                delete this.pendingRecommendations[fieldName];
            });
        }
    }

    applyNewRecommendation(fieldName) {
        if (this.pendingRecommendations && this.pendingRecommendations[fieldName]) {
            const newRecommendation = this.pendingRecommendations[fieldName];
            
            // Update the stored recommendation
            this.recommendations[fieldName] = newRecommendation;
            
            // Update the display
            this.displayRecommendation(fieldName, newRecommendation);
            
            // Clean up
            delete this.pendingRecommendations[fieldName];
            
            window.logger?.log(`✅ Applied new recommendation for ${fieldName}: ${newRecommendation.recommendation}`);
        }
    }

    toggleChat(fieldName) {
        const chatElement = document.getElementById(`chat-${fieldName}`);
        const inputElement = document.getElementById(`input-${fieldName}`);
        
        if (chatElement.style.display === 'none') {
            chatElement.style.display = 'block';
            if (inputElement) {
                inputElement.focus();
            }
        } else {
            chatElement.style.display = 'none';
        }
    }

    async sendChatMessage(fieldName) {
        const inputElement = document.getElementById(`input-${fieldName}`);
        const messagesElement = document.getElementById(`messages-${fieldName}`);
        
        if (!inputElement || !inputElement.value.trim()) {
            return;
        }

        const userMessage = inputElement.value.trim();
        inputElement.value = '';

        // Add user message to chat
        this.addChatMessage(messagesElement, userMessage, 'user');

        try {
            // Get AI response
            const productContext = this.getProductContext();
            const conversationHistory = this.conversationHistory[fieldName] || '';
            
            const response = await window.supabase.functions.invoke('conversational-tech-guidance', {
                body: {
                    ...productContext,
                    fieldName: fieldName,
                    userQuestion: userMessage,
                    currentDecision: this.finalDecisions[fieldName] || '',
                    conversationHistory: conversationHistory
                }
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const aiResponse = response.data.response;
            
            // Add AI response to chat
            this.addChatMessage(messagesElement, aiResponse.reasoning, 'ai');
            
            // Update conversation history
            this.conversationHistory[fieldName] = (conversationHistory + `\nUser: ${userMessage}\nAI: ${aiResponse.reasoning}`).slice(-1000); // Keep last 1000 chars
            
            // Save state after updating conversation
            this.saveState();
            
            // Update recommendation if changed
            if (aiResponse.recommendation !== this.recommendations[fieldName]?.recommendation) {
                // Show new recommendation with apply option
                this.showNewRecommendation(fieldName, aiResponse);
            }
            
        } catch (error) {
            window.logger?.error(`❌ Error in chat for ${fieldName}:`, error);
            this.addChatMessage(messagesElement, `Error: ${error.message}`, 'ai');
        }
    }

    addChatMessage(messagesElement, message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.textContent = message;
        
        messagesElement.appendChild(messageDiv);
        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    acceptRecommendation(fieldName) {
        const recommendation = this.recommendations[fieldName];
        if (!recommendation) {
            window.logger?.error(`No recommendation available for ${fieldName}`);
            return;
        }

        // Store final decision
        this.finalDecisions[fieldName] = recommendation.recommendation;
        
        // Save state after accepting recommendation
        this.saveState();
        
        // Check if generation requirements are met
        this.checkGenerationRequirements();
        
        // Hide recommendation and chat
        const recommendationElement = document.getElementById(`recommendation-${fieldName}`);
        const chatElement = document.getElementById(`chat-${fieldName}`);
        const decisionElement = document.getElementById(`decision-${fieldName}`);
        const decisionValueElement = document.getElementById(`final-${fieldName}`);
        
        if (recommendationElement) recommendationElement.style.display = 'none';
        if (chatElement) chatElement.style.display = 'none';
        
        if (decisionElement && decisionValueElement) {
            decisionValueElement.textContent = this.formatOptionName(recommendation.recommendation);
            decisionElement.style.display = 'flex';
        }
        
    }

    async getSuggestion(fieldName) {
        const inputElement = document.getElementById(fieldName);
        if (!inputElement) return;

        try {
            const productContext = this.getProductContext();
            
            const response = await window.supabase.functions.invoke('generate-field-suggestion', {
                body: {
                    ...productContext,
                    fieldName: fieldName,
                    currentValue: inputElement.value
                }
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const suggestion = response.data.suggestion;
            if (suggestion && suggestion.trim()) {
                inputElement.value = suggestion;
                inputElement.focus();
            }
            
        } catch (error) {
            window.logger?.error(`❌ Error getting suggestion for ${fieldName}:`, error);
        }
    }

    async generateSpecification() {
        if (!this.generateSpecBtn) return;

        try {
            this.generateSpecBtn.disabled = true;
            this.generateSpecBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
            
            if (this.generationStatus) {
                this.generationStatus.textContent = 'Generating technical specification...';
                this.generationStatus.style.display = 'block';
            }

            const specData = this.collectSpecificationData();
            
            const response = await window.supabase.functions.invoke('generate-product-spec', {
                body: specData
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const specification = response.data.specification;
            
            if (this.specContent) {
                this.specContent.innerHTML = this.formatMarkdown(specification);
            }
            
            if (this.generatedSpecSection) {
                this.generatedSpecSection.style.display = 'block';
            }
            
            if (this.generationStatus) {
                this.generationStatus.textContent = 'Technical specification generated successfully!';
            }
            
            // Save the technical specification to step data
            if (window.productWizard) {
                if (!window.productWizard.stepData) {
                    window.productWizard.stepData = {};
                }
                if (!window.productWizard.stepData[2]) {
                    window.productWizard.stepData[2] = {};
                }
                window.productWizard.stepData[2].technicalSpecification = specification;
            }
            
            // Analyze discrepancies between AI recommendations and generated spec
            this.analyzeDiscrepancies(specification);

            // Mark step as completed
            if (window.productWizard) {
                window.productWizard.markStepCompleted(2);
            }
            
        } catch (error) {
            window.logger?.error('❌ Error generating specification:', error);
            if (this.generationStatus) {
                this.generationStatus.textContent = `Error: ${error.message}`;
            }
        } finally {
            this.generateSpecBtn.disabled = false;
            this.generateSpecBtn.innerHTML = '<span class="btn-icon">🤖</span> Generate Technical Specification';
        }
    }

    collectSpecificationData() {
        const productContext = this.getProductContext();
        
        return {
            ...productContext,
            // Include final decisions
            platformType: this.finalDecisions['platform-type'] || '',
            frontendTech: this.finalDecisions['frontend-tech'] || '',
            backendTech: this.finalDecisions['backend-tech'] || '',
            databaseType: this.finalDecisions['database-type'] || '',
            authType: this.finalDecisions['auth-type'] || '',
            paymentType: this.finalDecisions['payment-type'] || '',
            // Additional context
            targetUsers: this.targetUsersInput?.value || '',
            businessProblem: this.businessProblemInput?.value || '',
            timelineContext: this.timelineContextInput?.value || '',
            // AI data for accurate spec generation
            aiRecommendations: this.recommendations,
            aiFinalDecisions: this.finalDecisions
        };
    }

    getProductContext() {
        if (!window.productWizard || !window.productWizard.formData) {
            return {};
        }

        const step1Data = window.productWizard.formData;
        const tags = Array.isArray(step1Data.tags) ? step1Data.tags : (step1Data.tags || '').split(',').map(tag => tag.trim());
        
        return {
            productName: step1Data.name || '',
            productSlug: step1Data.slug || '',
            category: step1Data.category || '',
            shortDescription: step1Data.short_description || '',
            description: step1Data.description || '',
            tags: tags
        };
    }

    formatOptionName(option) {
        const optionNames = {
            'web-app': 'Web Application',
            'pwa': 'Progressive Web App (PWA)',
            'mobile-ios': 'iOS Mobile App',
            'mobile-android': 'Android Mobile App',
            'desktop': 'Desktop Application',
            'cross-platform': 'Cross-Platform',
            'html-css-js': 'HTML/CSS/JavaScript',
            'react': 'React',
            'vue': 'Vue.js',
            'angular': 'Angular',
            'flutter': 'Flutter',
            'native': 'Native Development',
            'serverless': 'Serverless',
            'nodejs': 'Node.js',
            'python': 'Python',
            'php': 'PHP',
            'dotnet': '.NET',
            'static': 'Static Site',
            'postgresql': 'PostgreSQL',
            'mysql': 'MySQL',
            'mongodb': 'MongoDB',
            'firebase': 'Firebase',
            'supabase': 'Supabase',
            'none': 'None',
            'email-password': 'Email & Password',
            'oauth': 'OAuth',
            'magic-link': 'Magic Link',
            'sso': 'Single Sign-On',
            'stripe': 'Stripe',
            'paypal': 'PayPal',
            'apple-pay': 'Apple Pay',
            'google-pay': 'Google Pay',
            'subscription': 'Subscription'
        };
        
        return optionNames[option] || option;
    }

    formatMarkdown(text) {
        // Simple markdown to HTML conversion
        return text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    }

    updateFormData() {
        // Save state before updating form data
        this.saveState();
        
        const formData = {
            // Final decisions
            platformType: this.finalDecisions['platform-type'] || '',
            frontendTech: this.finalDecisions['frontend-tech'] || '',
            backendTech: this.finalDecisions['backend-tech'] || '',
            databaseType: this.finalDecisions['database-type'] || '',
            authType: this.finalDecisions['auth-type'] || '',
            paymentType: this.finalDecisions['payment-type'] || '',
            // Additional context
            targetUsers: this.targetUsersInput?.value || '',
            businessProblem: this.businessProblemInput?.value || '',
            timelineContext: this.timelineContextInput?.value || ''
        };

        if (window.productWizard) {
            if (!window.productWizard.stepData) {
                window.productWizard.stepData = {};
            }
            window.productWizard.stepData[2] = formData;
        }

        return formData;
    }

    hasSavedState() {
        return window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2];
    }

    saveState() {
        window.logger?.log('💾 Saving Step 2 state:', {
            recommendations: Object.keys(this.recommendations),
            conversationHistory: Object.keys(this.conversationHistory),
            finalDecisions: Object.keys(this.finalDecisions),
            pendingRecommendations: Object.keys(this.pendingRecommendations || {})
        });
        
        if (window.productWizard) {
            if (!window.productWizard.stepData) {
                window.productWizard.stepData = {};
            }
            window.productWizard.stepData[2] = {
                recommendations: this.recommendations,
                conversationHistory: this.conversationHistory,
                finalDecisions: this.finalDecisions,
                pendingRecommendations: this.pendingRecommendations || {}
            };
            
            window.logger?.log('✅ Step 2 state saved to window.productWizard.stepData[2]');
        } else {
            window.logger?.error('❌ window.productWizard not available for saving state');
        }
    }

    restoreState() {
        if (this.hasSavedState()) {
            const savedData = window.productWizard.stepData[2];
            this.recommendations = savedData.recommendations || {};
            this.conversationHistory = savedData.conversationHistory || {};
            this.finalDecisions = savedData.finalDecisions || {};
            this.pendingRecommendations = savedData.pendingRecommendations || {};
            
            // Restore UI state
            this.restoreUIState();
        }
    }

    restoreUIState() {
        // Restore recommendations display
        Object.keys(this.recommendations).forEach(fieldName => {
            this.displayRecommendation(fieldName, this.recommendations[fieldName]);
        });
        
        // Restore final decisions
        Object.keys(this.finalDecisions).forEach(fieldName => {
            const decisionElement = document.getElementById(`decision-${fieldName}`);
            const decisionValueElement = document.getElementById(`final-${fieldName}`);
            
            if (decisionElement && decisionValueElement) {
                decisionValueElement.textContent = this.formatOptionName(this.finalDecisions[fieldName]);
                decisionElement.style.display = 'flex';
                
                // Hide the recommendation element since decision is made
                const recommendationElement = document.getElementById(`recommendation-${fieldName}`);
                if (recommendationElement) {
                    recommendationElement.style.display = 'none';
                }
            }
        });
        
        // Restore conversation history
        Object.keys(this.conversationHistory).forEach(fieldName => {
            const messagesElement = document.getElementById(`messages-${fieldName}`);
            if (messagesElement && this.conversationHistory[fieldName]) {
                // Parse and restore conversation history
                const history = this.conversationHistory[fieldName];
                const lines = history.split('\n').filter(line => line.trim());
                
                lines.forEach(line => {
                    if (line.startsWith('User: ')) {
                        this.addChatMessage(messagesElement, line.replace('User: ', ''), 'user');
                    } else if (line.startsWith('AI: ')) {
                        this.addChatMessage(messagesElement, line.replace('AI: ', ''), 'ai');
                    }
                });
            }
        });
        
        // Restore technical specification if it exists
        if (window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2] && window.productWizard.stepData[2].technicalSpecification) {
            const spec = window.productWizard.stepData[2].technicalSpecification;
            
            if (this.specContent) {
                this.specContent.innerHTML = this.formatMarkdown(spec);
            }
            if (this.generatedSpecSection) {
                this.generatedSpecSection.style.display = 'block';
            }
            if (this.generationStatus) {
                this.generationStatus.innerHTML = '<span class="status-icon">✅</span><span class="status-text">Technical specification loaded from saved data</span>';
                this.generationStatus.style.display = 'block';
            }
        }
        
        // Check generation requirements after restoring state
        this.checkGenerationRequirements();
    }

    async reloadRecommendation(fieldName) {
        try {
            window.logger?.log(`🔄 Reloading recommendation for ${fieldName}`);
            
            // Clear existing recommendation
            const recommendationElement = document.getElementById(`recommendation-${fieldName}`);
            const valueElement = document.getElementById(`${fieldName.split('-')[0]}-recommendation`);
            const reasoningElement = document.getElementById(`${fieldName.split('-')[0]}-reasoning`);
            
            if (valueElement) valueElement.textContent = 'Loading new recommendation...';
            if (reasoningElement) reasoningElement.textContent = 'Getting fresh AI analysis...';
            
            // Get new recommendation
            await this.getInitialRecommendation(fieldName);
            
            // Clear conversation history for this field
            delete this.conversationHistory[fieldName];
            
            // Clear any pending recommendations
            if (this.pendingRecommendations) {
                delete this.pendingRecommendations[fieldName];
            }
            
            // Clear chat messages
            const messagesElement = document.getElementById(`messages-${fieldName}`);
            if (messagesElement) {
                messagesElement.innerHTML = '';
            }
            
            // Hide chat if open
            const chatElement = document.getElementById(`chat-${fieldName}`);
            if (chatElement) {
                chatElement.style.display = 'none';
            }
            
            // Hide final decision if exists
            const decisionElement = document.getElementById(`decision-${fieldName}`);
            if (decisionElement) {
                decisionElement.style.display = 'none';
            }
            
            // Remove from final decisions
            delete this.finalDecisions[fieldName];
            
            window.logger?.log(`✅ Reloaded recommendation for ${fieldName}`);
            
        } catch (error) {
            window.logger?.error(`❌ Error reloading recommendation for ${fieldName}:`, error);
        }
    }

    showError(message) {
        window.logger?.error('Step 2 Error:', message);
        // You can add UI error display here if needed
    }
    
    clearAllAiData() {
        // Add stronger warning dialog
        const confirmed = confirm(
            '⚠️ WARNING: This will permanently delete all AI recommendations, conversations, and the technical specification.\n\n' +
            'This action cannot be undone. Do you want to continue?'
        );
        
        if (!confirmed) {
            window.logger?.log('❌ Clear AI data cancelled by user');
            return;
        }
        
        window.logger?.log('🗑️ Clearing all AI data...');
        
        // Reset all internal state
        this.recommendations = {};
        this.conversationHistory = {};
        this.finalDecisions = {};
        this.pendingRecommendations = {};
        
        // Clear all recommendation displays
        const fields = ['platform-type', 'frontend-tech', 'backend-tech', 'database-type', 'auth-type', 'payment-type'];
        fields.forEach(fieldName => {
            const recommendationElement = document.getElementById(`recommendation-${fieldName}`);
            const chatElement = document.getElementById(`chat-${fieldName}`);
            const decisionElement = document.getElementById(`decision-${fieldName}`);
            const messagesElement = document.getElementById(`messages-${fieldName}`);
            
            if (recommendationElement) {
                recommendationElement.style.display = 'none';
            }
            if (chatElement) {
                chatElement.style.display = 'none';
            }
            if (decisionElement) {
                decisionElement.style.display = 'none';
            }
            if (messagesElement) {
                messagesElement.innerHTML = '';
            }
        });
        
        // Clear technical specification
        if (this.specContent) {
            this.specContent.innerHTML = '';
        }
        if (this.generatedSpecSection) {
            this.generatedSpecSection.style.display = 'none';
        }
        if (this.generationStatus) {
            this.generationStatus.textContent = '';
        }
        
        // Update button visibility
        if (this.loadAiBtn) this.loadAiBtn.style.display = 'inline-flex';
        if (this.clearAiBtn) this.clearAiBtn.style.display = 'none';
        
        // Clear from stepData
        if (window.productWizard && window.productWizard.stepData) {
            delete window.productWizard.stepData[2];
        }
        
        // Set flag to track that data was explicitly cleared
        this.dataCleared = true;
        
        // Manually save null/empty values to DB immediately since user explicitly cleared
        // This ensures the cleared state is persisted and won't be restored on navigation
        if (window.productWizard && window.productWizard.formData && window.productWizard.formData.product_id) {
            // Clear technical specification from formData as well
            if (window.productWizard.stepData && window.productWizard.stepData[2]) {
                delete window.productWizard.stepData[2].technicalSpecification;
            }
            
            // User explicitly cleared, so save empty state to prevent auto-restore
            window.productWizard.saveDraftToDatabase().catch(err => {
                window.logger?.error('❌ Failed to save cleared AI data state:', err);
            });
        }
        
        // Mark step as incomplete since data was cleared
        if (window.productWizard) {
            window.productWizard.markStepIncomplete(2);
        }
        
        window.logger?.log('✅ All AI data cleared and saved to database');
    }
    
    analyzeDiscrepancies(specification) {
        window.logger?.log('🔍 Analyzing discrepancies between AI recommendations and generated specification...');
        
        const discrepancies = [];
        
        // Define field mappings between AI recommendations and spec sections
        const fieldMappings = {
            'platform-type': {
                specSection: 'Platform',
                aiField: 'platform-type',
                keywords: ['platform', 'web', 'mobile', 'desktop', 'responsive']
            },
            'frontend-tech': {
                specSection: 'Frontend',
                aiField: 'frontend-tech',
                keywords: ['react', 'typescript', 'javascript', 'frontend', 'ui', 'interface']
            },
            'backend-tech': {
                specSection: 'Backend',
                aiField: 'backend-tech',
                keywords: ['backend', 'node', 'express', 'api', 'server']
            },
            'database-type': {
                specSection: 'Database',
                aiField: 'database-type',
                keywords: ['database', 'sqlite', 'mongodb', 'mysql', 'postgresql', 'storage']
            },
            'auth-type': {
                specSection: 'Authentication',
                aiField: 'auth-type',
                keywords: ['authentication', 'auth', 'oauth', 'jwt', 'login', 'security']
            },
            'payment-type': {
                specSection: 'Payment',
                aiField: 'payment-type',
                keywords: ['payment', 'subscription', 'monetization', 'billing', 'pricing']
            }
        };
        
        // Check each field for discrepancies
        Object.keys(fieldMappings).forEach(fieldName => {
            const mapping = fieldMappings[fieldName];
            const aiRecommendation = this.recommendations[fieldName];
            const specContent = this.extractSpecSection(specification, mapping.specSection, mapping.keywords);
            
            if (aiRecommendation && specContent) {
                const discrepancy = this.compareRecommendationVsSpec(
                    fieldName,
                    aiRecommendation.recommendation,
                    specContent,
                    mapping.keywords
                );
                
                if (discrepancy) {
                    discrepancies.push(discrepancy);
                }
            }
        });
        
        // Display discrepancies
        this.displayDiscrepancies(discrepancies);
    }
    
    extractSpecSection(specification, sectionName, keywords) {
        // Extract relevant section from specification based on keywords
        const lines = specification.split('\n');
        let relevantContent = '';
        let inRelevantSection = false;
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // Check if we're entering a relevant section
            if (lowerLine.includes(sectionName.toLowerCase()) || 
                keywords.some(keyword => lowerLine.includes(keyword))) {
                inRelevantSection = true;
            }
            
            // Check if we're leaving the section (new major section)
            if (inRelevantSection && line.match(/^\d+\.\s/) && !lowerLine.includes(sectionName.toLowerCase())) {
                break;
            }
            
            if (inRelevantSection) {
                relevantContent += line + '\n';
            }
        }
        
        return relevantContent.trim();
    }
    
    compareRecommendationVsSpec(fieldName, aiRecommendation, specContent, keywords) {
        const lowerSpec = specContent.toLowerCase();
        const lowerRecommendation = aiRecommendation.toLowerCase();
        
        // Check for direct matches
        if (lowerSpec.includes(lowerRecommendation)) {
            return null; // No discrepancy
        }
        
        // Check for keyword-based discrepancies
        const discrepancies = [];
        
        // Platform type discrepancies
        if (fieldName === 'platform-type') {
            if (lowerRecommendation.includes('web') && !lowerSpec.includes('web')) {
                discrepancies.push('Web platform not mentioned in spec');
            }
        }
        
        // Frontend tech discrepancies
        if (fieldName === 'frontend-tech') {
            if (lowerRecommendation.includes('typescript') && !lowerSpec.includes('typescript')) {
                discrepancies.push('TypeScript not mentioned in spec');
            }
            if (lowerRecommendation.includes('react') && !lowerSpec.includes('react')) {
                discrepancies.push('React not mentioned in spec');
            }
        }
        
        // Database discrepancies
        if (fieldName === 'database-type') {
            if (lowerRecommendation.includes('sqlite') && lowerSpec.includes('mongodb')) {
                discrepancies.push('AI recommends SQLite but spec mentions MongoDB');
            }
            if (lowerRecommendation.includes('mongodb') && lowerSpec.includes('sqlite')) {
                discrepancies.push('AI recommends MongoDB but spec mentions SQLite');
            }
        }
        
        // Auth discrepancies
        if (fieldName === 'auth-type') {
            if (lowerRecommendation.includes('oauth') && lowerSpec.includes('jwt')) {
                discrepancies.push('AI recommends OAuth but spec mentions JWT');
            }
            if (lowerRecommendation.includes('jwt') && lowerSpec.includes('oauth')) {
                discrepancies.push('AI recommends JWT but spec mentions OAuth');
            }
        }
        
        // Payment discrepancies
        if (fieldName === 'payment-type') {
            if (lowerRecommendation.includes('subscription') && !lowerSpec.includes('subscription')) {
                discrepancies.push('Subscription model not mentioned in spec');
            }
        }
        
        if (discrepancies.length > 0) {
            return {
                field: fieldName,
                fieldDisplayName: this.formatFieldName(fieldName),
                aiRecommendation: aiRecommendation,
                specContent: specContent,
                discrepancies: discrepancies
            };
        }
        
        return null;
    }
    
    formatFieldName(fieldName) {
        const fieldNames = {
            'platform-type': 'Platform & Deployment',
            'frontend-tech': 'Frontend Technology',
            'backend-tech': 'Backend Technology',
            'database-type': 'Database',
            'auth-type': 'Authentication',
            'payment-type': 'Payment & Monetization'
        };
        return fieldNames[fieldName] || fieldName;
    }
    
    displayDiscrepancies(discrepancies) {
        if (!this.discrepancyAnalysis || !this.discrepancyContent) {
            window.logger?.error('❌ Discrepancy analysis elements not found');
            return;
        }
        
        if (discrepancies.length === 0) {
            this.discrepancyContent.innerHTML = `
                <div class="no-discrepancies">
                    <span class="icon">✅</span>
                    No discrepancies found! The generated specification aligns with AI recommendations.
                </div>
            `;
        } else {
            let html = '';
            discrepancies.forEach(discrepancy => {
                html += `
                    <div class="discrepancy-item">
                        <h6>${discrepancy.fieldDisplayName}</h6>
                        <div class="discrepancy-comparison">
                            <div class="discrepancy-recommendation">
                                <div class="discrepancy-label">🤖 AI Recommendation:</div>
                                <div class="discrepancy-value">${discrepancy.aiRecommendation}</div>
                            </div>
                            <div class="discrepancy-spec">
                                <div class="discrepancy-label">📄 Generated Spec:</div>
                                <div class="discrepancy-value">${discrepancy.specContent.substring(0, 200)}${discrepancy.specContent.length > 200 ? '...' : ''}</div>
                            </div>
                        </div>
                        <div class="discrepancy-details">
                            <strong>Issues:</strong>
                            <ul>
                                ${discrepancy.discrepancies.map(d => `<li>${d}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            });
            this.discrepancyContent.innerHTML = html;
        }
        
        this.discrepancyAnalysis.style.display = 'block';
        window.logger?.log(`✅ Displayed ${discrepancies.length} discrepancies`);
    }
    
    checkGenerationRequirements() {
        const requiredFields = ['platform-type', 'frontend-tech', 'backend-tech', 'database-type', 'auth-type', 'payment-type'];
        const allAccepted = requiredFields.every(fieldName => this.finalDecisions[fieldName]);
        
        if (this.generateSpecBtn) {
            this.generateSpecBtn.disabled = !allAccepted;
            
            if (allAccepted) {
                this.generateSpecBtn.classList.remove('disabled');
                if (this.requirementsText) {
                    this.requirementsText.style.display = 'none';
                }
            } else {
                this.generateSpecBtn.classList.add('disabled');
                if (this.requirementsText) {
                    this.requirementsText.style.display = 'flex';
                }
            }
        }
        
        return allAccepted;
    }
    
    checkExistingSpec() {
        // Check if technical specification exists in the database via stepData
        if (window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2]) {
            const technicalSpec = window.productWizard.stepData[2].technicalSpecification;
            if (technicalSpec && technicalSpec.trim() !== '') {
                window.logger?.log('✅ Technical specification exists in database, marking Step 2 as completed');
                window.productWizard.markStepCompleted(2);
            }
        }
    }
    
    downloadSpecification() {
        window.logger?.log('📥 Downloading specification...');
        
        // Get the current specification content
        const currentSpec = window.productWizard && window.productWizard.stepData && window.productWizard.stepData[2] 
            ? window.productWizard.stepData[2].technicalSpecification 
            : '';
        
        if (!currentSpec) {
            window.logger?.error('❌ No specification to download');
            return;
        }
        
        // Get product name for filename
        const productName = window.productWizard && window.productWizard.formData 
            ? window.productWizard.formData.name || 'product'
            : 'product';
        
        // Create filename
        const filename = `${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-technical-specification.md`;
        
        // Create and download the file
        const blob = new Blob([currentSpec], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.logger?.log(`✅ Specification downloaded as ${filename}`);
    }
}

// Export for use in the main wizard
window.StepSpecGeneration = StepSpecGeneration;
window.StepSpecGeneration = StepSpecGeneration;
/**
 * Contact User Page
 * Handles the message composition interface for contacting users
 */

class ContactUserPage {
    constructor() {
        this.userId = null;
        this.username = null;
        this.userLanguage = 'en';
        this.communicationType = 'notification'; // 'notification' or 'email'
        this.signatures = [];
        this.isInitialized = false;
        
        this.elements = {};
    }

    async init() {
        try {
            window.logger?.log('🚀 Initializing Contact User Page...');
            
            // Get URL parameters
            this.parseUrlParameters();
            
            // Initialize elements
            this.initializeElements();
            
            // Load user data
            await this.loadUserData();
            
            // Load signatures
            await this.loadSignatures();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Wait for translations to be ready, then update UI
            this.waitForTranslationsAndUpdateUI();
            
            this.isInitialized = true;
            window.logger?.log('✅ Contact User Page initialized successfully');
            
        } catch (error) {
            window.logger?.error('❌ Failed to initialize Contact User Page:', error);
            this.showError(`Failed to initialize page: ${error.message}`);
        }
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('userId');
        this.username = urlParams.get('username');
        
        if (!this.userId || !this.username) {
            throw new Error('Missing required URL parameters: userId and username');
        }
        
        window.logger?.log('📋 URL Parameters:', { userId: this.userId, username: this.username });
    }

    initializeElements() {
        this.elements = {
            // Header elements
            backToUsersBtn: document.getElementById('back-to-users'),
            contactUserTitle: document.getElementById('contact-user-title'),
            languageFlag: document.getElementById('language-flag'),
            languageText: document.getElementById('language-text'),
            userEmail: document.getElementById('user-email'),
            
            // Communication type
            sendNotificationBtn: document.getElementById('send-notification-btn'),
            sendEmailBtn: document.getElementById('send-email-btn'),
            
            // Form fields
            subjectSection: document.getElementById('subject-section'),
            senderSection: document.getElementById('sender-section'),
            messageSubject: document.getElementById('message-subject'),
            senderEmail: document.getElementById('sender-email'),
            messageGreeting: document.getElementById('message-greeting'),
            messageBody: document.getElementById('message-body'),
            messageSignature: document.getElementById('message-signature'),
            signaturePreview: document.getElementById('signature-preview'),
            
            // Action buttons
            sendMessageBtn: document.getElementById('send-message-btn'),
            sendBtnText: document.getElementById('send-btn-text'),
            cancelBtn: document.getElementById('cancel-btn')
        };
    }

    async loadUserData() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            // Get user profile data
            const { data: userProfile, error } = await window.supabase
                .from('user_profiles')
                .select('id, username, email, language')
                .eq('id', this.userId)
                .single();

            if (error) {
                throw new Error(`Failed to load user data: ${error.message}`);
            }

            if (!userProfile) {
                throw new Error('User not found');
            }

            this.userLanguage = userProfile.language || 'en';
            this.userEmail = userProfile.email;
            window.logger?.log('👤 User data loaded:', { username: userProfile.username, email: this.userEmail, language: this.userLanguage });

        } catch (error) {
            window.logger?.error('❌ Failed to load user data:', error);
            throw error;
        }
    }

    async loadSignatures() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            // Get current user (admin)
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Admin user not authenticated');
            }

            // Load admin signatures
            const { data: signatures, error } = await window.supabase
                .from('communication_signatures')
                .select('id, name, content, is_default')
                .eq('admin_id', user.id)
                .order('is_default', { ascending: false });

            if (error) {
                throw new Error(`Failed to load signatures: ${error.message}`);
            }

            this.signatures = signatures || [];
            window.logger?.log('📝 Signatures loaded:', this.signatures);
            window.logger?.log('📝 Number of signatures:', this.signatures.length);

        } catch (error) {
            window.logger?.error('❌ Failed to load signatures:', error);
            // Continue without signatures - user can still send messages
            this.signatures = [];
        }
    }

    setupEventListeners() {
        // Back to users button
        if (this.elements.backToUsersBtn) {
            this.elements.backToUsersBtn.addEventListener('click', () => {
                window.close();
            });
        }

        // Communication type buttons
        if (this.elements.sendNotificationBtn) {
            this.elements.sendNotificationBtn.addEventListener('click', () => {
                this.setCommunicationType('notification');
            });
        }

        if (this.elements.sendEmailBtn) {
            this.elements.sendEmailBtn.addEventListener('click', () => {
                this.setCommunicationType('email');
            });
        }

        // Send message button
        if (this.elements.sendMessageBtn) {
            this.elements.sendMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Cancel button
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => {
                window.close();
            });
        }
    }

    waitForTranslationsAndUpdateUI() {
        // Check if i18next is available and initialized
        if (window.i18next && window.i18next.isInitialized) {
            this.updateUI();
            return;
        }

        // Wait for translations to be ready
        const checkTranslations = () => {
            if (window.i18next && window.i18next.isInitialized) {
                this.updateUI();
            } else {
                // Check again in 100ms
                setTimeout(checkTranslations, 100);
            }
        };

        // Start checking
        setTimeout(checkTranslations, 100);
    }

    updateUI() {
        // Update page title
        if (this.elements.contactUserTitle) {
            this.elements.contactUserTitle.textContent = `${i18next.t('Contact User')}: ${this.username}`;
        }

        // Update user email
        if (this.elements.userEmail && this.userEmail) {
            this.elements.userEmail.textContent = this.userEmail;
        }

        // Update language indicator
        this.updateLanguageIndicator();

        // Update greeting
        this.updateGreeting();

        // Populate signature dropdown
        this.populateSignatureDropdown();
        
        // Setup signature preview
        this.setupSignaturePreview();

        // Set initial communication type
        this.setCommunicationType('notification');
    }

    updateLanguageIndicator() {
        const languageMap = {
            'en': { flag: '🇬🇧', name: 'English' },
            'es': { flag: '🇪🇸', name: 'Spanish' },
            'fr': { flag: '🇫🇷', name: 'French' },
            'de': { flag: '🇩🇪', name: 'German' }
        };

        const lang = languageMap[this.userLanguage] || languageMap['en'];
        
        if (this.elements.languageFlag) {
            this.elements.languageFlag.textContent = lang.flag;
        }
        
        if (this.elements.languageText) {
            this.elements.languageText.textContent = lang.name;
        }
    }

    updateGreeting() {
        const greetingMap = {
            'en': `Dear ${this.username},`,
            'es': `Estimado/a ${this.username},`,
            'fr': `Cher/Chère ${this.username},`,
            'de': `Liebe/r ${this.username},`
        };

        const greeting = greetingMap[this.userLanguage] || greetingMap['en'];
        
        if (this.elements.messageGreeting) {
            this.elements.messageGreeting.textContent = greeting;
        }
    }

    populateSignatureDropdown() {
        if (!this.elements.messageSignature) return;

        window.logger?.log('📝 Populating signature dropdown with', this.signatures.length, 'signatures');

        // Clear existing options
        this.elements.messageSignature.innerHTML = '';

        // Add default "No signature" option
        const noSignatureOption = document.createElement('option');
        noSignatureOption.value = '';
        noSignatureOption.textContent = i18next.t('No signature');
        this.elements.messageSignature.appendChild(noSignatureOption);

        // Add signature options
        this.signatures.forEach(signature => {
            const option = document.createElement('option');
            option.value = signature.content;
            
            // Translate signature name based on user's language
            const translatedName = this.translateSignatureName(signature.name);
            option.textContent = translatedName;
            
            if (signature.is_default) {
                option.selected = true;
                window.logger?.log('📝 Set default signature:', translatedName);
            }
            this.elements.messageSignature.appendChild(option);
        });

        window.logger?.log('📝 Signature dropdown populated with', this.elements.messageSignature.options.length, 'options');
        
        // Update signature preview after populating dropdown
        this.updateSignaturePreview();
    }

    setupSignaturePreview() {
        if (!this.elements.messageSignature || !this.elements.signaturePreview) return;

        // Add event listener for signature changes
        this.elements.messageSignature.addEventListener('change', () => {
            this.updateSignaturePreview();
        });

        // Initial preview update
        this.updateSignaturePreview();
    }

    updateSignaturePreview() {
        if (!this.elements.signaturePreview) return;

        const selectedSignature = this.elements.messageSignature.value;
        
        if (!selectedSignature) {
            this.elements.signaturePreview.textContent = '';
        } else {
            // Show translated signature content (what the user will receive)
            const translatedSignature = this.translateSignatureContent(selectedSignature);
            this.elements.signaturePreview.textContent = translatedSignature;
        }
    }

    /**
     * Translate signature name based on user's language
     * @param {string} signatureName - Original signature name
     * @returns {string} Translated signature name
     */
    translateSignatureName(signatureName) {
        // Map signature names to translation keys
        const signatureMap = {
            'Legal Team': 'Legal Team',
            'Contact Team': 'Contact Team',
            'Support Team': 'Support Team',
            'System Team': 'System Team',
            'Development Team': 'Development Team'
        };

        const translationKey = signatureMap[signatureName];
        if (translationKey && typeof i18next !== 'undefined' && i18next.isInitialized) {
            return i18next.t(translationKey);
        }
        
        // Fallback to original name if translation not available
        return signatureName;
    }

    /**
     * Translate signature content based on user's language
     * @param {string} signatureContent - Original signature content
     * @returns {string} Translated signature content
     */
    translateSignatureContent(signatureContent) {
        if (!signatureContent) return null;

        // Map signature content to translation keys
        const contentMap = {
            'Your BitMinded Legal Team': 'Your BitMinded Legal Team',
            'Your BitMinded Contact Team': 'Your BitMinded Contact Team',
            'Your BitMinded Support Team': 'Your BitMinded Support Team',
            'Your BitMinded System Team': 'Your BitMinded System Team',
            'Your BitMinded Development Team': 'Your BitMinded Development Team'
        };

        // Find matching content
        for (const [original, translationKey] of Object.entries(contentMap)) {
            if (signatureContent === original) {
                if (typeof i18next !== 'undefined' && i18next.isInitialized) {
                    return i18next.t(translationKey);
                }
                break;
            }
        }
        
        // Fallback to original content if translation not available
        return signatureContent;
    }

    setCommunicationType(type) {
        this.communicationType = type;
        
        // Update button states
        if (this.elements.sendNotificationBtn) {
            this.elements.sendNotificationBtn.classList.toggle('contact-user-page__type-btn--active', type === 'notification');
        }
        
        if (this.elements.sendEmailBtn) {
            this.elements.sendEmailBtn.classList.toggle('contact-user-page__type-btn--active', type === 'email');
        }

        // Show/hide email-specific fields
        const showEmailFields = type === 'email';
        
        if (this.elements.subjectSection) {
            this.elements.subjectSection.classList.toggle('contact-user-page__section--hidden', !showEmailFields);
            this.elements.subjectSection.classList.toggle('contact-user-page__section--visible', showEmailFields);
        }
        
        if (this.elements.senderSection) {
            this.elements.senderSection.classList.toggle('contact-user-page__section--hidden', !showEmailFields);
            this.elements.senderSection.classList.toggle('contact-user-page__section--visible', showEmailFields);
        }

        // Update send button text
        if (this.elements.sendBtnText) {
            this.elements.sendBtnText.textContent = type === 'email' ? i18next.t('Send Email') : i18next.t('Send Notification');
        }

        window.logger?.log('📧 Communication type set to:', type);
    }

    async sendMessage() {
        try {
            window.logger?.log('📤 Sending message...');

            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Disable send button
            if (this.elements.sendMessageBtn) {
                this.elements.sendMessageBtn.disabled = true;
                if (this.elements.sendBtnText) {
                    this.elements.sendBtnText.textContent = i18next.t('Sending');
                }
            }

            // Prepare message data
            const messageData = {
                target_user_id: this.userId,
                subject: this.elements.messageSubject?.value || null,
                body: this.elements.messageBody.value,
                signature_used: this.elements.messageSignature.value || null,
                language_used: this.userLanguage
            };

            // Add sender email for emails
            if (this.communicationType === 'email') {
                messageData.sender_email = this.elements.senderEmail.value;
            }

            // Call appropriate edge function
            const functionName = this.communicationType === 'email' ? 'send-email' : 'send-notification';
            const response = await this.callEdgeFunction(functionName, messageData);

            if (response.success) {
                this.showSuccess(`${this.communicationType === 'email' ? 'Email' : 'Notification'} sent successfully!`);
                
                // Close window after short delay
                setTimeout(() => {
                    window.close();
                }, 2000);
            } else {
                throw new Error(response.error || 'Failed to send message');
            }

        } catch (error) {
            window.logger?.error('❌ Failed to send message:', error);
            this.showError(`Failed to send ${this.communicationType}: ${error.message}`);
        } finally {
            // Re-enable send button
            if (this.elements.sendMessageBtn) {
                this.elements.sendMessageBtn.disabled = false;
                if (this.elements.sendBtnText) {
                    this.elements.sendBtnText.textContent = this.communicationType === 'email' ? i18next.t('Send Email') : i18next.t('Send Notification');
                }
            }
        }
    }

    validateForm() {
        // Check message body
        if (!this.elements.messageBody.value.trim()) {
            this.showError(i18next.t('Enter your message'));
            return false;
        }

        // Check email-specific fields
        if (this.communicationType === 'email') {
            if (!this.elements.messageSubject?.value.trim()) {
                this.showError(i18next.t('Enter message subject'));
                return false;
            }
            
            if (!this.elements.senderEmail?.value) {
                this.showError(i18next.t('Select sender email'));
                return false;
            }
        }

        return true;
    }

    async callEdgeFunction(functionName, data) {
        // Use global helper function which handles session refresh and 401 retries
        return await window.invokeEdgeFunction(functionName, {
            body: data
        });
    }

    showSuccess(message) {
        // Simple success message - could be enhanced with a proper notification system
        alert(`✅ ${message}`);
    }

    showError(message) {
        // Simple error message - could be enhanced with a proper notification system
        alert(`❌ ${message}`);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const contactUserPage = new ContactUserPage();
        await contactUserPage.init();
        
        // Make it globally available for debugging
        window.contactUserPage = contactUserPage;
        
    } catch (error) {
        window.logger?.error('❌ Failed to initialize Contact User Page:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h1>Error</h1>
                <p>Failed to load the contact user page: ${error.message}</p>
                <button onclick="window.close()">Close</button>
            </div>
        `;
    }
});

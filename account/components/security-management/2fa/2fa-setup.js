/**
 * Two-Factor Authentication Setup Wizard
 * Handles the complete 2FA setup flow with QR generation, verification, and backup codes
 */

class TwoFactorAuthSetup {
    constructor() {
        this.currentStep = 0;
        this.steps = ['intro', 'qr', 'verify', 'backup', 'success'];
        this.secretKey = null;
        this.totp = null;
        this.backupCodes = [];
        this.userEmail = null;
        this.userId = null;
    }

    /**
     * Initialize the setup wizard
     */
    async init() {
        try {
            console.log('🔐 2FA Setup: Initializing...');

            // Apply saved theme
            this.applySavedTheme();

            // Initialize translations
            await this.initializeTranslations();

            // Get current user
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                alert('Failed to load user information. Please try again.');
                window.close();
                return;
            }

            this.userId = user.id;
            this.userEmail = user.email;
            
            console.log('✅ User loaded:', this.userEmail);

            // Generate secret key
            await this.generateSecret();

            // Setup event listeners
            this.setupEventListeners();

            // Show first step
            this.showStep(0);

            // Update translations
            this.updateTranslations();

            console.log('✅ 2FA Setup: Initialized successfully');

        } catch (error) {
            console.error('❌ 2FA Setup: Failed to initialize:', error);
            alert('Failed to initialize 2FA setup. Please try again.');
            window.close();
        }
    }

    /**
     * Apply saved theme from localStorage
     */
    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        console.log(`🎨 Theme applied: ${savedTheme}`);
    }

    /**
     * Initialize translations
     */
    async initializeTranslations() {
        if (window.twoFactorAuthTranslations) {
            await window.twoFactorAuthTranslations.init();
        }
    }

    /**
     * Update all translations
     */
    updateTranslations() {
        if (window.twoFactorAuthTranslations && window.twoFactorAuthTranslations.isReady()) {
            const currentLanguage = localStorage.getItem('language') || 'en';
            const translations = window.twoFactorAuthTranslations.translations[currentLanguage] || window.twoFactorAuthTranslations.translations['en'] || {};

            // Update all translatable content
            document.querySelectorAll('.translatable-content').forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key && translations[key]) {
                    element.textContent = translations[key];
                }
            });

            console.log(`✅ Wizard translations updated for language: ${currentLanguage}`);
        }
    }

    /**
     * Generate TOTP secret key
     */
    async generateSecret() {
        try {
            // Generate TOTP secret
            this.totp = new OTPAuth.TOTP({
                issuer: 'BitMinded',
                label: this.userEmail,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
            });

            this.secretKey = this.totp.secret.base32;
            
            console.log('✅ Secret generated');

        } catch (error) {
            console.error('❌ Failed to generate secret:', error);
            throw error;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Step 0: Introduction
        document.getElementById('btn-start').addEventListener('click', () => this.handleStart());

        // Step 1: QR Code
        document.getElementById('btn-qr-back').addEventListener('click', () => this.previousStep());
        document.getElementById('btn-qr-continue').addEventListener('click', () => this.nextStep());
        document.getElementById('btn-show-manual').addEventListener('click', () => this.toggleManualEntry());
        document.getElementById('btn-copy-secret').addEventListener('click', () => this.copySecret());

        // Step 2: Verify
        document.getElementById('btn-verify-back').addEventListener('click', () => this.previousStep());
        document.getElementById('btn-verify').addEventListener('click', () => this.handleVerify());
        document.getElementById('verify-code-input').addEventListener('input', (e) => this.handleCodeInput(e));
        document.getElementById('verify-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !document.getElementById('btn-verify').disabled) {
                this.handleVerify();
            }
        });

        // Step 3: Backup Codes
        document.getElementById('btn-download-codes').addEventListener('click', () => this.downloadBackupCodes());
        document.getElementById('btn-print-codes').addEventListener('click', () => this.printBackupCodes());
        document.getElementById('codes-saved-checkbox').addEventListener('change', (e) => {
            document.getElementById('btn-complete').disabled = !e.target.checked;
        });
        document.getElementById('btn-complete').addEventListener('click', () => this.handleComplete());

        // Step 4: Success
        document.getElementById('btn-close').addEventListener('click', () => this.closeWindow());
    }

    /**
     * Show a specific step
     */
    showStep(stepIndex) {
        // Hide all steps
        document.querySelectorAll('.setup-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        const stepElement = document.querySelector(`.setup-step[data-step="${stepIndex}"]`);
        if (stepElement) {
            stepElement.classList.add('active');
        }

        // Update progress indicator
        this.updateProgress(stepIndex);

        // Execute step-specific logic
        this.currentStep = stepIndex;
        this.onStepShown(stepIndex);
    }

    /**
     * Update progress indicator
     */
    updateProgress(stepIndex) {
        document.querySelectorAll('.setup-progress__step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index < stepIndex) {
                step.classList.add('completed');
            } else if (index === stepIndex) {
                step.classList.add('active');
            }
        });
    }

    /**
     * Handle step-specific logic when shown
     */
    async onStepShown(stepIndex) {
        switch(stepIndex) {
            case 1: // QR Code step
                await this.generateQRCode();
                break;
            case 2: // Verify step
                document.getElementById('verify-code-input').value = '';
                document.getElementById('verify-code-input').focus();
                break;
            case 3: // Backup codes step
                await this.generateBackupCodes();
                break;
        }
    }

    /**
     * Generate and display QR code
     */
    async generateQRCode() {
        try {
            // Wait for QRCode library to be available
            if (typeof QRCode === 'undefined') {
                console.log('Waiting for QRCode library...');
                await new Promise(resolve => {
                    const checkLibrary = setInterval(() => {
                        if (typeof QRCode !== 'undefined') {
                            clearInterval(checkLibrary);
                            resolve();
                        }
                    }, 100);
                });
            }

            const container = document.getElementById('qr-canvas');
            const otpauthUrl = this.totp.toString();

            // Clear any existing QR code
            container.innerHTML = '<div id="qr-code-display"></div>';
            
            // Generate QR code
            new QRCode(document.getElementById('qr-code-display'), {
                text: otpauthUrl,
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            // Display manual entry code
            document.getElementById('secret-key-text').textContent = this.secretKey;

            console.log('✅ QR Code generated');

        } catch (error) {
            console.error('❌ Failed to generate QR code:', error);
            // Don't alert since QR is showing - just log error
            console.log('Continuing anyway - manual entry available');
        }
    }

    /**
     * Toggle manual entry display
     */
    toggleManualEntry() {
        const content = document.getElementById('manual-entry-content');
        const btn = document.getElementById('btn-show-manual');
        const btnText = btn.querySelector('.translatable-content');
        
        const translations = this.getTranslations();
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            const text = translations['Hide manual entry'] || 'Hide manual entry';
            if (btnText) {
                btnText.textContent = text;
                btnText.setAttribute('data-translation-key', 'Hide manual entry');
            } else {
                btn.textContent = text;
            }
        } else {
            content.style.display = 'none';
            const text = translations["Can't scan? Enter manually"] || "Can't scan? Enter manually";
            if (btnText) {
                btnText.textContent = text;
                btnText.setAttribute('data-translation-key', "Can't scan? Enter manually");
            } else {
                btn.textContent = text;
            }
        }
    }

    /**
     * Get current translations
     */
    getTranslations() {
        const currentLanguage = localStorage.getItem('language') || 'en';
        if (window.twoFactorAuthTranslations && window.twoFactorAuthTranslations.translations) {
            return window.twoFactorAuthTranslations.translations[currentLanguage] || window.twoFactorAuthTranslations.translations['en'] || {};
        }
        return {};
    }

    /**
     * Copy secret key to clipboard
     */
    async copySecret() {
        try {
            await navigator.clipboard.writeText(this.secretKey);
            const btn = document.getElementById('btn-copy-secret');
            const translations = this.getTranslations();
            const originalText = btn.textContent;
            const originalKey = btn.getAttribute('data-translation-key');
            
            btn.textContent = translations['Copied!'] || 'Copied!';
            btn.setAttribute('data-translation-key', 'Copied!');
            
            setTimeout(() => {
                btn.textContent = translations[originalKey] || originalText;
                btn.setAttribute('data-translation-key', originalKey);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy. Please select and copy manually.');
        }
    }

    /**
     * Handle code input
     */
    handleCodeInput(e) {
        const input = e.target;
        const code = input.value.replace(/\D/g, ''); // Only digits
        input.value = code;

        // Enable verify button when 6 digits entered
        const verifyBtn = document.getElementById('btn-verify');
        verifyBtn.disabled = code.length !== 6;

        // Remove error styling
        input.classList.remove('error');
        document.getElementById('verify-error').style.display = 'none';
    }

    /**
     * Handle code verification
     */
    async handleVerify() {
        const code = document.getElementById('verify-code-input').value;
        
        if (code.length !== 6) {
            return;
        }

        this.showLoading(true);

        try {
            // Verify code client-side during setup (secret not in DB yet)
            // Use a time window to allow for clock skew
            const delta = this.totp.validate({ 
                token: code, 
                window: 1  // Allow ±30 seconds clock skew
            });
            
            const isValid = delta !== null;

            if (isValid) {
                console.log('✅ Code verified successfully');
                this.nextStep();
            } else {
                console.log('❌ Code verification failed');
                this.showVerifyError('Invalid code. Please try again.');
            }

        } catch (error) {
            console.error('❌ Verification error:', error);
            this.showVerifyError('Failed to verify code. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show verification error
     */
    showVerifyError(messageKey) {
        const input = document.getElementById('verify-code-input');
        const errorDiv = document.getElementById('verify-error');
        const errorText = document.getElementById('verify-error-text');

        const translations = this.getTranslations();
        const message = translations[messageKey] || messageKey;

        input.classList.add('error');
        errorText.textContent = message;
        errorDiv.style.display = 'flex';

        // Clear input
        input.value = '';
        input.focus();
    }

    /**
     * Generate backup codes
     */
    async generateBackupCodes() {
        try {
            this.backupCodes = [];
            
            // Generate 10 backup codes
            for (let i = 0; i < 10; i++) {
                this.backupCodes.push(this.generateBackupCode());
            }

            // Display codes
            const grid = document.getElementById('backup-codes-grid');
            grid.innerHTML = '';
            
            this.backupCodes.forEach(code => {
                const codeDiv = document.createElement('div');
                codeDiv.className = 'backup-code';
                codeDiv.textContent = code;
                grid.appendChild(codeDiv);
            });

            console.log('✅ Backup codes generated');

        } catch (error) {
            console.error('❌ Failed to generate backup codes:', error);
        }
    }

    /**
     * Generate a single backup code
     */
    generateBackupCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking characters
        let code = '';
        
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i === 3 || i === 7) {
                code += '-'; // Add dashes for readability
            }
        }
        
        return code;
    }

    /**
     * Download backup codes as text file
     */
    downloadBackupCodes() {
        const content = `BitMinded - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}
Account: ${this.userEmail}

IMPORTANT: Store these codes safely. Each code can only be used once.

${this.backupCodes.join('\n')}

If you lose access to your authenticator app, you can use these codes to log in.
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitminded-2fa-backup-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Backup codes downloaded');
    }

    /**
     * Print backup codes
     */
    printBackupCodes() {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>BitMinded - 2FA Backup Codes</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 2rem; }
                    h1 { color: #333; }
                    .code { font-family: 'Courier New', monospace; font-size: 1.2rem; margin: 0.5rem 0; }
                    .warning { color: #d9534f; font-weight: bold; margin: 1rem 0; }
                </style>
            </head>
            <body>
                <h1>BitMinded - 2FA Backup Codes</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Account: ${this.userEmail}</p>
                <p class="warning">⚠️ Store these codes safely. Each code can only be used once.</p>
                ${this.backupCodes.map(code => `<div class="code">${code}</div>`).join('')}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();

        console.log('✅ Backup codes printed');
    }

    /**
     * Complete setup and save to database
     */
    async handleComplete() {
        this.showLoading(true);

        try {
            // Hash backup codes before storing (simple approach for now)
            const hashedCodes = this.backupCodes.map(code => 
                btoa(code) // Base64 encode (in production, use proper hashing)
            );

            // First, delete any existing 2FA record to ensure fresh setup
            // This prevents issues with old secrets when re-enabling
            const { error: deleteError } = await supabase
                .from('user_2fa')
                .delete()
                .eq('user_id', this.userId);

            // Note: delete error is OK if no record exists
            if (deleteError && deleteError.code !== 'PGRST116') {
                console.warn('Delete warning:', deleteError);
            }

            // Insert fresh 2FA record with new secret
            const { error: insertError } = await supabase
                .from('user_2fa')
                .insert({
                    user_id: this.userId,
                    secret_key: this.secretKey,
                    backup_codes: hashedCodes,
                    is_enabled: true
                });

            if (insertError) {
                throw insertError;
            }

            console.log('✅ 2FA saved to database with fresh secret');

            // Show success step
            this.nextStep();

        } catch (error) {
            console.error('❌ Failed to save 2FA:', error);
            alert('Failed to complete setup. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Close window and notify parent
     */
    closeWindow() {
        // Send message to parent window
        if (window.opener) {
            window.opener.postMessage({
                type: '2fa-setup-complete',
                status: 'success'
            }, window.location.origin);
        }

        // Close after a short delay
        setTimeout(() => {
            window.close();
        }, 500);
    }

    /**
     * Navigation methods
     */
    handleStart() {
        this.nextStep();
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const setup = new TwoFactorAuthSetup();
        setup.init();
    });
} else {
    const setup = new TwoFactorAuthSetup();
    setup.init();
}


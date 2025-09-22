// 2fa-setup.js - BitMinded 2FA Setup Logic

console.log('🔧 2FA setup script loaded');

// Create a single Supabase client instance
    const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async function() {
    
    // Check if user is authenticated
    const session = await supabase.auth.getSession();
    const user = session.data?.session?.user;
    
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '../login/';
        return;
    }
    
    // Initialize 2FA setup
    initialize2FASetup();
});

function initialize2FASetup() {
    const content = document.getElementById('2fa-content');
    
    // Show step 1: Enable 2FA
    showStep1();
}

function showStep1() {
    const content = document.getElementById('2fa-content');
    
    content.innerHTML = `
        <div class="fa-progress">
            <div class="fa-progress-step active">1</div>
            <div class="fa-progress-step">2</div>
            <div class="fa-progress-step">3</div>
        </div>
        
        <div class="fa-step active">
            <h3 data-i18n="2fa-step1-title">Enable Two-Factor Authentication</h3>
            <div class="2fa-instructions">
                <h4 data-i18n="2fa-step1-what">What is 2FA?</h4>
                <p data-i18n="2fa-step1-description">Two-Factor Authentication adds an extra layer of security to your account. You'll need both your password and a code from your authenticator app to sign in.</p>
            </div>
            
            <div class="fa-form">
                <button class="fa-btn btn-primary" id="start-2fa-btn" data-i18n="2fa-start-setup">Start 2FA Setup</button>
                <button class="fa-btn btn-secondary" onclick="window.location.href='/account/'" data-i18n="2fa-cancel">Cancel</button>
            </div>
        </div>
    `;
    
    // Update translations for this step
    updateStepTranslations();
    
    // Also update all content if translation system is ready
    if (typeof window.updateContent === 'function') {
        window.updateContent();
    }
    
    // Add event listener to the button
    const startBtn = document.getElementById('start-2fa-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            start2FASetup();
        });
    } else {
        // Use event delegation as fallback
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'start-2fa-btn') {
                start2FASetup();
            }
        });
    }
}

async function start2FASetup() {
    try {
        // Check if user is authenticated
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.session) {
            showStatus('Please sign in to set up 2FA', 'error');
            return;
        }
        
        console.log('Starting 2FA enrollment for user:', session.session.user.id);
        
        // Check if user already has MFA factors
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
            console.error('Error checking existing factors:', factorsError);
            showStatus('Error checking existing 2FA setup: ' + factorsError.message, 'error');
            return;
        }
        
        console.log('Existing factors:', factors);
        console.log('TOTP factors:', factors?.totp);
        console.log('All factors:', JSON.stringify(factors, null, 2));
        
        // Check if user already has TOTP factor
        const existingTotpFactor = factors?.totp?.find(factor => factor.status === 'verified');
        if (existingTotpFactor) {
            showStatus('You already have 2FA enabled! You can manage your existing 2FA settings in your account.', 'success');
            // Redirect to account page after 3 seconds
            setTimeout(() => {
                window.location.href = '/account/';
            }, 3000);
            return;
        }
        
        // Start 2FA enrollment
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp'
        });
        
        if (error) {
            console.error('MFA enrollment error:', error);
            
            // Check for specific "factor already exists" error
            if (error.message.includes('already exists')) {
                showStatus('A 2FA factor already exists. Let me check what factors you have...', 'warning');
                
                // Check existing factors to see what's there
                const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
                if (!factorsError && factors) {
                    console.log('Found existing factors:', JSON.stringify(factors, null, 2));
                    
                    // Show factors in UI
                    const content = document.getElementById('2fa-content');
                    content.innerHTML = `
                        <div class="fa-step active">
                            <h3>Existing 2FA Factors Found</h3>
                            <div class="fa-status warning">
                                We found existing 2FA factors in your account. Here's what we found:
                            </div>
                            <div class="factors-list">
                                ${factors.all ? factors.all.map(factor => `
                                    <div class="factor-item">
                                        <strong>Factor ID:</strong> ${factor.id}<br>
                                        <strong>Type:</strong> ${factor.factor_type}<br>
                                        <strong>Status:</strong> ${factor.status}<br>
                                        <strong>Created:</strong> ${new Date(factor.created_at).toLocaleString()}<br>
                                        <strong>Friendly Name:</strong> ${factor.friendly_name || 'None'}
                                    </div>
                                `).join('') : '<p>No factors found</p>'}
                            </div>
                            <div class="fa-form">
                                <button class="fa-btn secondary" onclick="window.location.href='/account/'">Go to Account</button>
                                <button class="fa-btn" onclick="cleanupFactors()">Clean Up Factors</button>
                            </div>
                        </div>
                    `;
                } else {
                    showStatus('Error checking factors: ' + (factorsError?.message || 'Unknown error'), 'error');
                }
                return;
            }
            
            showStatus('Error starting 2FA setup: ' + error.message, 'error');
            return;
        }
        
        console.log('MFA enrollment successful:', data);
        
        // Show step 2: QR Code
        await showStep2(data);
        
    } catch (err) {
        console.error('Unexpected error in start2FASetup:', err);
        showStatus('Unexpected error: ' + err.message, 'error');
    }
}

async function showStep2(enrollmentData) {
    console.log('Enrollment data received:', enrollmentData);
    
    // Extract the secret from the enrollment data
    const secret = enrollmentData.totp?.secret || enrollmentData.secret;
    const qrCode = enrollmentData.totp?.qr_code || enrollmentData.qr_code;
    
    console.log('Secret:', secret);
    console.log('QR Code:', qrCode);
    
    if (!secret) {
        showStatus('Error: No secret key found in enrollment data', 'error');
        return;
    }
    
    const content = document.getElementById('2fa-content');
    
    content.innerHTML = `
        <div class="fa-progress">
            <div class="fa-progress-step completed">1</div>
            <div class="fa-progress-step active">2</div>
            <div class="fa-progress-step">3</div>
        </div>
        
        <div class="fa-step active">
            <h3 data-i18n="2fa-step2-title">Scan QR Code</h3>
            <div class="2fa-instructions">
                <h4 data-i18n="2fa-step2-instructions">Set up your authenticator app:</h4>
                <div class="instruction-item" data-i18n="2fa-step2-step1">Install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator</div>
                <div class="instruction-item" data-i18n="2fa-step2-step2">Scan the QR code below with your app</div>
            </div>
            
            <div class="qr-container">
                <div class="qr-code" id="qr-code"></div>
            </div>
            
            <div class="secret-key">
                <div class="secret-key-title" data-i18n="2fa-secret-key">Secret Key</div>
                <div class="secret-key-explanation" data-i18n="2fa-secret-explanation">If you can't scan the QR code, you can manually enter this secret key into your authenticator app:</div>
                <div class="secret-key-value" id="secret-key">${secret}</div>
                <div class="secret-key-copy">
                    <button class="fa-btn secondary" onclick="copySecretKey()" data-i18n="2fa-copy">Copy Secret Key</button>
                </div>
            </div>
            
            <div class="fa-form">
                <div data-i18n="2fa-step2-step3">Enter the 6-digit code from your app to verify</div>
                <input type="text" id="verification-code" maxlength="6" placeholder="123456" autocomplete="off">
            </div>
            
            <div class="fa-form">
                <button class="fa-btn" onclick="verify2FACode()" data-i18n="2fa-verify-code">Verify Code</button>
                <button class="fa-btn secondary" onclick="showStep1()" data-i18n="2fa-back">Back</button>
            </div>
        </div>
    `;
    
    // Generate QR code
    await generateQRCode(qrCode || secret);
    
    // Store enrollment data globally
    window.currentEnrollment = enrollmentData;
    console.log('Stored enrollment data:', enrollmentData);
    
    // Update translations for this step
    updateStepTranslations();
}

async function generateQRCode(qrCodeData) {
    console.log('Generating QR code with data:', qrCodeData);
    
    const qrContainer = document.getElementById('qr-code');
    
    if (!qrCodeData) {
        qrContainer.innerHTML = '<p>QR code data not available</p>';
        return;
    }
    
    // Check if it's a data URL (starts with data:)
    if (qrCodeData.startsWith('data:')) {
        // Create image element properly
        const img = document.createElement('img');
        img.src = qrCodeData;
        img.alt = 'QR Code for 2FA setup';
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        // Clear container and add image
        qrContainer.innerHTML = '';
        qrContainer.appendChild(img);
    } else {
        // Generate a proper QR code using a simple method
        // For TOTP, we need to create a proper otpauth URL
        const secret = qrCodeData;
        
        // Get user email from session
        let userEmail = 'user@example.com';
        try {
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user?.email) {
                userEmail = session.session.user.email;
            }
        } catch (err) {
            console.log('Could not get user email, using default');
        }
        
        const issuer = 'BitMinded';
        
        // Create the otpauth URL
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        
        console.log('Generated otpauth URL:', otpauthUrl);
        
        // Use a QR code generation service or library
        // For now, let's use qr-server.com API to generate the QR code
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
        
        // Create image element properly
        const img = document.createElement('img');
        img.src = qrCodeUrl;
        img.alt = 'QR Code for 2FA setup';
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        img.style.border = '2px solid #fff';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        // Clear container and add image
        qrContainer.innerHTML = '';
        qrContainer.appendChild(img);
    }
}

function copySecretKey() {
    const secretKey = document.getElementById('secret-key').textContent;
    navigator.clipboard.writeText(secretKey).then(() => {
        showStatus(typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-status-copied') : 'Secret key copied to clipboard!', 'success');
    });
}

async function verify2FACode() {
    const code = document.getElementById('verification-code').value.trim();
    
    if (!code || code.length !== 6) {
        showStatus(typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-status-enter-code') : 'Please enter a valid 6-digit code', 'error');
        return;
    }
    
    try {
        console.log('Verifying code:', code);
        console.log('Current enrollment:', window.currentEnrollment);
        
        if (!window.currentEnrollment || !window.currentEnrollment.id) {
            showStatus('Error: No enrollment data found. Please restart the setup.', 'error');
            return;
        }
        
        // Get the current factors to find the correct factor ID
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
            console.error('Error getting factors for verification:', factorsError);
            showStatus('Error getting factors: ' + factorsError.message, 'error');
            return;
        }
        
        console.log('Available factors for verification:', factors);
        
        // Find the unverified TOTP factor
        const unverifiedFactor = factors.all?.find(factor => 
            factor.factor_type === 'totp' && factor.status === 'unverified'
        );
        
        if (!unverifiedFactor) {
            showStatus('No unverified TOTP factor found. Please restart the setup.', 'error');
            return;
        }
        
        console.log('Using factor for verification:', unverifiedFactor);
        
        // First challenge the factor, then verify
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: unverifiedFactor.id
        });
        
        if (challengeError) {
            console.error('Challenge error:', challengeError);
            showStatus('Error challenging factor: ' + challengeError.message, 'error');
            return;
        }
        
        console.log('Challenge data:', challengeData);
        
        // Now verify the code with the challenge
        const { data, error } = await supabase.auth.mfa.verify({
            factorId: unverifiedFactor.id,
            code: code,
            challengeId: challengeData.id
        });
        
        console.log('Verification result:', { data, error });
        
        if (error) {
            console.error('Verification error:', error);
            showStatus('Invalid code. Please try again. Error: ' + error.message, 'error');
            return;
        }
        
        console.log('Code verified successfully!');
        
        // Show step 3: Backup codes
        showStep3();
        
    } catch (err) {
        console.error('Unexpected error in verify2FACode:', err);
        showStatus((typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-error-unexpected') : 'Unexpected error: ') + err.message, 'error');
    }
}

async function showStep3() {
    const content = document.getElementById('2fa-content');
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    content.innerHTML = `
        <div class="fa-progress">
            <div class="fa-progress-step completed">1</div>
            <div class="fa-progress-step completed">2</div>
            <div class="fa-progress-step active">3</div>
        </div>
        
        <div class="fa-step active">
            <h3 data-i18n="2fa-step3-title">Save Your Backup Codes</h3>
            <div class="2fa-instructions">
                <h4 data-i18n="2fa-step3-important">Important:</h4>
                <p data-i18n="2fa-step3-description">Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            </div>
            
            <div class="backup-codes">
                <h4 data-i18n="2fa-backup-codes">Your Backup Codes:</h4>
                <div id="backup-codes-list">
                    ${backupCodes.map(code => `<span class="backup-code">${code}</span>`).join('')}
                </div>
                <button class="fa-btn secondary" onclick="downloadBackupCodes()" data-i18n="2fa-download-codes">Download Codes</button>
            </div>
            
            <div class="fa-form">
                <button class="fa-btn" onclick="complete2FASetup()" data-i18n="2fa-complete-setup">Complete Setup</button>
            </div>
        </div>
    `;
    
    // Store backup codes globally
    window.backupCodes = backupCodes;
    
    // Update translations for this step
    updateStepTranslations();
}

function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(generateRandomCode());
    }
    return codes;
}

function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function downloadBackupCodes() {
    const codes = window.backupCodes;
    const content = `BitMinded 2FA Backup Codes\n\nSave these codes in a safe place:\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bitminded-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
}

async function complete2FASetup() {
    try {
        // Use shared Supabase client
        
        // Save backup codes to database
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user.id;
        
        const { error } = await supabase
            .from('two_factor_backup_codes')
            .insert(window.backupCodes.map(code => ({
                user_id: userId,
                code: code
            })));
        
        if (error) {
            console.error('Error saving backup codes:', error);
        }
        
        // Update 2FA settings
        await supabase
            .from('two_factor_settings')
            .upsert({
                user_id: (await supabase.auth.getUser()).data.user.id,
                enabled: true,
                backup_codes_generated: true
            });
        
        showStatus(typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-success') : '🎉 2FA setup completed successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = '/account/';
        }, 2000);
        
    } catch (err) {
        showStatus((typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-error-complete') : 'Error completing setup: ') + err.message, 'error');
    }
}

function updateStepTranslations() {
    // Update all translatable content in current step
    const elements = document.querySelectorAll('.fa-step.active [data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key && typeof i18next !== 'undefined' && i18next.isInitialized) {
            element.textContent = i18next.t(key);
        }
    });
}

async function cleanupFactors() {
    try {
        showStatus('Cleaning up existing factors...', 'warning');
        
        // Get all factors
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
            showStatus('Error getting factors: ' + factorsError.message, 'error');
            return;
        }
        
        console.log('Cleaning up factors:', factors);
        
        // Delete all factors (including unverified ones)
        if (factors.all && factors.all.length > 0) {
            for (const factor of factors.all) {
                console.log('Deleting factor:', factor.id, 'Status:', factor.status);
                const { error: deleteError } = await supabase.auth.mfa.unenroll({
                    factorId: factor.id
                });
                
                if (deleteError) {
                    console.error('Error deleting factor:', factor.id, deleteError);
                    showStatus('Error deleting factor ' + factor.id + ': ' + deleteError.message, 'error');
                    return;
                } else {
                    console.log('Successfully deleted factor:', factor.id);
                }
            }
        }
        
        showStatus('All factors cleaned up! Starting fresh 2FA setup...', 'success');
        
        // Wait a moment then restart the setup process
        setTimeout(async () => {
            try {
                // Try to start 2FA setup again
                await start2FASetup();
            } catch (err) {
                console.error('Error restarting 2FA setup:', err);
                showStatus('Error restarting setup: ' + err.message, 'error');
            }
        }, 2000);
        
    } catch (err) {
        console.error('Error in cleanupFactors:', err);
        showStatus('Error cleaning up factors: ' + err.message, 'error');
    }
}

function showStatus(message, type) {
    // Remove existing status
    const existingStatus = document.querySelector('.fa-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Create new status
    const status = document.createElement('div');
    status.className = `fa-status ${type}`;
    status.textContent = message;
    
    // Insert at top of current step
    const currentStep = document.querySelector('.fa-step.active');
    if (currentStep) {
        currentStep.insertBefore(status, currentStep.firstChild);
    }
}

// Make function globally accessible
window.start2FASetup = start2FASetup;

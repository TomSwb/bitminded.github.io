// login.js - Bitminded Login & Sign Up Authentication

// Supabase client setup
const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co'; // Set your Supabase project URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // Form switcher logic
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showLoginBtn = document.getElementById('show-login');
    const showSignupBtn = document.getElementById('show-signup');
    const authMessage = document.getElementById('auth-message');

    // Enhanced message display function
    function showAuthMessage(message, type = 'info') {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
        
        // Add appropriate styling
        switch(type) {
            case 'success':
                authMessage.style.color = '#22c55e';
                authMessage.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                authMessage.style.border = '1px solid rgba(34, 197, 94, 0.3)';
                break;
            case 'error':
                authMessage.style.color = '#ef4444';
                authMessage.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                authMessage.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                break;
            case 'info':
            default:
                authMessage.style.color = '#3b82f6';
                authMessage.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                authMessage.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                break;
        }
        
        // Add padding and border radius
        authMessage.style.padding = '12px 16px';
        authMessage.style.borderRadius = '8px';
        authMessage.style.marginTop = '16px';
        authMessage.style.fontWeight = '500';
        
        // Trigger animation
        setTimeout(() => {
            authMessage.classList.add('show');
        }, 10);
    }

    function showLogin() {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        showLoginBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
        authMessage.textContent = '';
    }
    function showSignup() {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        showSignupBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        authMessage.textContent = '';
    }
    showLoginBtn.addEventListener('click', showLogin);
    showSignupBtn.addEventListener('click', showSignup);

    // Show correct form if ?signup=true in URL
    if (window.location.search.includes('signup=true')) {
        showSignup();
    } else {
        showLogin();
    }

    // Login logic (email + password + optional 2FA)
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit');
        
        // Clear previous messages
        authMessage.textContent = '';
        authMessage.className = '';
        
        // Show loading state
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        
        try {
            // Check if user has 2FA enabled
            const { data: userData, error: userError } = await supabase
                .from('two_factor_settings')
                .select('enabled')
                .eq('user_id', (await supabase.auth.getUser()).data?.user?.id)
                .single();
            
            // Attempt login
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ 
                email: email, 
                password 
            });
            
            if (loginError) {
                showAuthMessage(loginError.message, 'error');
                return;
            }
            
            // Check if 2FA is required
            if (loginData.session && userData?.enabled) {
                // User has 2FA enabled, show 2FA verification
                show2FAVerification(loginData.session);
            } else {
                // No 2FA required, proceed with normal login
                showAuthMessage('🎉 Login successful! Redirecting...', 'success');
                setTimeout(function() {
                    window.location.href = '../index.html';
                }, 1500);
            }
            
        } catch (err) {
            showAuthMessage('Unexpected error. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    // Sign Up logic
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const submitBtn = document.getElementById('signup-submit');
        
        // Clear previous messages
        authMessage.textContent = '';
        authMessage.className = '';
        
        // Password validation
        if (password !== confirm) {
            showAuthMessage('Passwords do not match.', 'error');
            return;
        }
        
        // Show loading state
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });
            
            if (error) {
                showAuthMessage(error.message, 'error');
            } else {
                // Show success state with better visual feedback
                showAuthMessage('🎉 Account created successfully! Please check your email to verify your account.', 'success');
                
                // Clear form
                signupForm.reset();
                
                // Show success animation and redirect
                setTimeout(() => {
                    showAuthMessage('✅ Redirecting to login...', 'success');
                    setTimeout(() => {
                        showLogin();
                    }, 1500);
                }, 2000);
            }
        } catch (err) {
            showAuthMessage('Unexpected error. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    // 2FA Verification function
    function show2FAVerification(session) {
        // Hide login form and show 2FA verification
        loginForm.style.display = 'none';
        
        // Create 2FA verification form
        const twoFAForm = document.createElement('div');
        twoFAForm.id = '2fa-verification';
        twoFAForm.innerHTML = `
            <div class="auth-form">
                <h3>🔐 Two-Factor Authentication</h3>
                <p>Enter the 6-digit code from your authenticator app:</p>
                
                <form id="2fa-form">
                    <div class="form-group">
                        <label for="2fa-code">Verification Code:</label>
                        <input type="text" id="2fa-code" maxlength="6" placeholder="123456" required>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" id="2fa-submit">Verify & Sign In</button>
                        <button type="button" id="2fa-backup" class="secondary">Use Backup Code</button>
                    </div>
                </form>
                
                <div class="auth-message" id="2fa-message"></div>
            </div>
        `;
        
        // Insert after login form
        loginForm.parentNode.insertBefore(twoFAForm, loginForm.nextSibling);
        
        // Handle 2FA form submission
        document.getElementById('2fa-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            await verify2FACode(session);
        });
        
        // Handle backup code button
        document.getElementById('2fa-backup').addEventListener('click', function() {
            showBackupCodeForm(session);
        });
    }
    
    async function verify2FACode(session) {
        const code = document.getElementById('2fa-code').value.trim();
        const submitBtn = document.getElementById('2fa-submit');
        const message = document.getElementById('2fa-message');
        
        if (!code || code.length !== 6) {
            showAuthMessage('Please enter a valid 6-digit code', 'error', message);
            return;
        }
        
        // Show loading state
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        
        try {
            // Verify 2FA code
            const { data, error } = await supabase.auth.mfa.verify({
                factorId: session.user.id,
                code: code
            });
            
            if (error) {
                showAuthMessage('Invalid code. Please try again.', 'error', message);
            } else {
                showAuthMessage('🎉 2FA verified! Redirecting...', 'success', message);
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1500);
            }
        } catch (err) {
            showAuthMessage('Unexpected error. Please try again.', 'error', message);
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }
    
    function showBackupCodeForm(session) {
        // Hide 2FA form and show backup code form
        document.getElementById('2fa-verification').style.display = 'none';
        
        const backupForm = document.createElement('div');
        backupForm.id = 'backup-verification';
        backupForm.innerHTML = `
            <div class="auth-form">
                <h3>🔑 Backup Code</h3>
                <p>Enter one of your backup codes:</p>
                
                <form id="backup-form">
                    <div class="form-group">
                        <label for="backup-code">Backup Code:</label>
                        <input type="text" id="backup-code" placeholder="XXXXXXXX" required>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" id="backup-submit">Verify & Sign In</button>
                        <button type="button" id="backup-back" class="secondary">Back to 2FA</button>
                    </div>
                </form>
                
                <div class="auth-message" id="backup-message"></div>
            </div>
        `;
        
        document.getElementById('2fa-verification').parentNode.insertBefore(backupForm, document.getElementById('2fa-verification').nextSibling);
        
        // Handle backup form submission
        document.getElementById('backup-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            await verifyBackupCode(session);
        });
        
        // Handle back button
        document.getElementById('backup-back').addEventListener('click', function() {
            backupForm.remove();
            document.getElementById('2fa-verification').style.display = 'block';
        });
    }
    
    async function verifyBackupCode(session) {
        const code = document.getElementById('backup-code').value.trim();
        const submitBtn = document.getElementById('backup-submit');
        const message = document.getElementById('backup-message');
        
        if (!code) {
            showAuthMessage('Please enter a backup code', 'error', message);
            return;
        }
        
        // Show loading state
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        
        try {
            // Check if backup code exists and is unused
            const { data: backupData, error: backupError } = await supabase
                .from('two_factor_backup_codes')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('code', code)
                .eq('used', false)
                .single();
            
            if (backupError || !backupData) {
                showAuthMessage('Invalid or already used backup code.', 'error', message);
                return;
            }
            
            // Mark backup code as used
            await supabase
                .from('two_factor_backup_codes')
                .update({ used: true })
                .eq('id', backupData.id);
            
            showAuthMessage('🎉 Backup code verified! Redirecting...', 'success', message);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
            
        } catch (err) {
            showAuthMessage('Unexpected error. Please try again.', 'error', message);
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }
    
    // Enhanced message display function for 2FA
    function showAuthMessage(message, type = 'info', targetElement = null) {
        const messageEl = targetElement || authMessage;
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        
        // Add appropriate styling
        switch(type) {
            case 'success':
                messageEl.style.color = '#22c55e';
                messageEl.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                messageEl.style.border = '1px solid rgba(34, 197, 94, 0.3)';
                break;
            case 'error':
                messageEl.style.color = '#ef4444';
                messageEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                messageEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                break;
            case 'info':
            default:
                messageEl.style.color = '#3b82f6';
                messageEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                messageEl.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                break;
        }
        
        // Add padding and border radius
        messageEl.style.padding = '12px 16px';
        messageEl.style.borderRadius = '8px';
        messageEl.style.marginTop = '16px';
        messageEl.style.fontWeight = '500';
        
        // Trigger animation
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);
    }
});

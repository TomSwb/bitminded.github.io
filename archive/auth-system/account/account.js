
// account.js - BitMinded Account Page Logic

document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const accountInfo = document.getElementById('account-info');
    const session = await supabase.auth.getSession();
    const user = session.data?.session?.user;
    
    // Wait for translation system to be ready
    const waitForTranslation = () => {
        return new Promise((resolve) => {
            if (window.translationReady && typeof i18next !== 'undefined' && i18next.isInitialized) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.translationReady && typeof i18next !== 'undefined' && i18next.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    };
    
    if (user) {
        await waitForTranslation();
        
        // Check if account content already exists to avoid regenerating it
        const existingContent = document.querySelector('.account-sections');
        if (existingContent) {
            console.log('Account content already exists, skipping regeneration');
            return;
        }
        
        const username = user.user_metadata?.username || '';
        const email = user.email || '';
        const avatarUrl = user.user_metadata?.avatar_url || '';
        // Check 2FA status
        const { data: twoFAData } = await supabase
            .from('two_factor_settings')
            .select('enabled, backup_codes_generated')
            .eq('user_id', user.id)
            .single();
        
        const is2FAEnabled = twoFAData?.enabled || false;
        const hasBackupCodes = twoFAData?.backup_codes_generated || false;
        
        accountInfo.innerHTML = [
            '<div class="account-sections">',
            '  <div class="account-section">',
            `    <h3 data-i18n="profile-section">${i18next.t('profile-section')}</h3>`,
            '    <form id="profile-form">',
            '      <div style="text-align:center;">',
            `        <img src="${avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)}" class="avatar" alt="Avatar">`,
            '      </div>',
            '      <label for="profile-username">Username:</label>',
            `      <input type="text" id="profile-username" name="username" value="${username}" required>`,
            '      <label for="profile-email">Email:</label>',
            `      <input type="email" id="profile-email" name="email" value="${email}" required>`,
            '      <label for="profile-avatar">Avatar URL:</label>',
            `      <input type="text" id="profile-avatar" name="avatar_url" value="${avatarUrl}">`,
            '      <button type="submit">Save Changes</button>',
            '      <div class="status" id="profile-status"></div>',
            '    </form>',
            '  </div>',
            '  <div class="account-section">',
            `    <h3 data-i18n="security-section">${i18next.t('security-section')}</h3>`,
            '    <div class="security-settings">',
            '      <div class="2fa-status">',
            `        <h4 data-i18n="2fa-title">${i18next.t('2fa-title')}</h4>`,
            `        <p data-i18n="2fa-description">${i18next.t('2fa-description')}</p>`,
            '        <div class="2fa-actions">',
            is2FAEnabled ? [
                `          <button id="disable-2fa" class="btn-danger" data-i18n="disable-2fa">${i18next.t('disable-2fa')}</button>`,
                `          <button id="view-backup-codes" class="btn-secondary" data-i18n="view-backup-codes">${i18next.t('view-backup-codes')}</button>`,
                `          <button id="regenerate-backup-codes" class="btn-secondary" data-i18n="regenerate-backup-codes">${i18next.t('regenerate-backup-codes')}</button>`
            ].join('\n') : [
                `          <button id="enable-2fa" class="btn-primary" data-i18n="enable-2fa">${i18next.t('enable-2fa')}</button>`,
                `          <button id="cleanup-factors" class="btn-secondary" style="background-color: #f59e0b; color: white;">Clean Up Old Factors</button>`
            ].join('\n'),
            '        </div>',
            '      </div>',
            '    </div>',
            '    <div class="status" id="security-status"></div>',
            '  </div>',
            '</div>'
        ].join('\n');
        document.getElementById('profile-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const newUsername = document.getElementById('profile-username').value;
            const newEmail = document.getElementById('profile-email').value;
            const newAvatar = document.getElementById('profile-avatar').value;
            const statusDiv = document.getElementById('profile-status');
            statusDiv.textContent = '';
            // Update user metadata (username, avatar)
            let errorMsg = '';
            try {
                // Update username and avatar in user_metadata
                const { error: metaError } = await supabase.auth.updateUser({
                    data: { username: newUsername, avatar_url: newAvatar }
                });
                if (metaError) errorMsg += metaError.message + ' ';
                // Update email if changed
                if (newEmail !== user.email) {
                    const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
                    if (emailError) errorMsg += emailError.message + ' ';
                }
                if (!errorMsg) {
                    statusDiv.textContent = 'Profile updated!';
                    statusDiv.style.color = 'green';
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    statusDiv.textContent = errorMsg.trim();
                    statusDiv.style.color = 'red';
                }
            } catch (err) {
                statusDiv.textContent = 'Unexpected error. Please try again.';
                statusDiv.style.color = 'red';
            }
        });
        
        // 2FA Management Event Handlers
        setup2FAHandlers(user.id, supabase);
        
    } else {
        accountInfo.innerHTML = '<div>Please sign in to view your account.</div>';
    }
});

function setup2FAHandlers(userId, supabase) {
    // Enable 2FA button
    const enable2FABtn = document.getElementById('enable-2fa');
    if (enable2FABtn) {
        enable2FABtn.addEventListener('click', function() {
            window.location.href = '/2fa-setup/';
        });
    }
    
    // Disable 2FA button
    const disable2FABtn = document.getElementById('disable-2fa');
    if (disable2FABtn) {
        disable2FABtn.addEventListener('click', async function() {
            const message = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('disable-confirm') : 'Are you sure you want to disable 2FA? This will make your account less secure.';
            if (confirm(message)) {
                await disable2FA(userId, supabase);
            }
        });
    }
    
    // View backup codes button
    const viewBackupBtn = document.getElementById('view-backup-codes');
    if (viewBackupBtn) {
        viewBackupBtn.addEventListener('click', async function() {
            await showBackupCodes(userId, supabase);
        });
    }
    
    // Regenerate backup codes button
    const regenerateBackupBtn = document.getElementById('regenerate-backup-codes');
    if (regenerateBackupBtn) {
        regenerateBackupBtn.addEventListener('click', async function() {
            const message = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('regenerate-confirm') : 'This will invalidate all your current backup codes. Are you sure?';
            if (confirm(message)) {
                await regenerateBackupCodes(userId, supabase);
            }
        });
    }
    
    // Cleanup factors button (temporary for fixing old factors)
    const cleanupFactorsBtn = document.getElementById('cleanup-factors');
    if (cleanupFactorsBtn) {
        cleanupFactorsBtn.addEventListener('click', async function() {
            if (confirm('This will remove any old 2FA factors from Supabase Auth. This is safe to do if you\'re having trouble enabling 2FA. Continue?')) {
                await cleanupOldFactors(supabase);
            }
        });
    }
}

async function disable2FA(userId, supabase) {
    const statusDiv = document.getElementById('security-status');
    statusDiv.textContent = 'Disabling 2FA...';
    statusDiv.style.color = '#3b82f6';
    
    try {
        // First, get all MFA factors for the user
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
            console.error('Error listing factors:', factorsError);
            statusDiv.textContent = 'Error accessing 2FA settings. Please try again.';
            statusDiv.style.color = '#ef4444';
            return;
        }
        
        // Unenroll all TOTP factors
        for (const factor of factors.totp || []) {
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                factorId: factor.id
            });
            
            if (unenrollError) {
                console.error('Error unenrolling factor:', unenrollError);
            }
        }
        
        // Disable 2FA in settings
        await supabase
            .from('two_factor_settings')
            .update({ enabled: false })
            .eq('user_id', userId);
        
        statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-disabled-success') : '2FA has been disabled successfully.';
        statusDiv.style.color = '#22c55e';
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (err) {
        console.error('Error disabling 2FA:', err);
        statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('2fa-disabled-error') : 'Error disabling 2FA. Please try again.';
        statusDiv.style.color = '#ef4444';
    }
}

async function showBackupCodes(userId, supabase) {
    const statusDiv = document.getElementById('security-status');
    statusDiv.textContent = 'Loading backup codes...';
    statusDiv.style.color = '#3b82f6';
    
    try {
        const { data: backupCodes, error } = await supabase
            .from('two_factor_backup_codes')
            .select('code, used, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('backup-codes-error') : 'Error loading backup codes.';
            statusDiv.style.color = '#ef4444';
            return;
        }
        
        // Create modal to display backup codes
        const modal = document.createElement('div');
        modal.className = 'backup-codes-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 data-i18n="backup-codes-title">Your Backup Codes</h3>
                <p data-i18n="backup-codes-description">Save these codes in a safe place. Each code can only be used once.</p>
                <div class="backup-codes-list">
                    ${backupCodes.map(code => `
                        <div class="backup-code-item ${code.used ? 'used' : 'available'}">
                            <span class="code">${code.code}</span>
                            <span class="status" data-i18n="${code.used ? 'backup-codes-used' : 'backup-codes-available'}">${code.used ? 'Used' : 'Available'}</span>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-primary" data-i18n="close">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        statusDiv.textContent = '';
        
    } catch (err) {
        statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('backup-codes-error') : 'Error loading backup codes.';
        statusDiv.style.color = '#ef4444';
    }
}

async function regenerateBackupCodes(userId, supabase) {
    const statusDiv = document.getElementById('security-status');
    statusDiv.textContent = 'Generating new backup codes...';
    statusDiv.style.color = '#3b82f6';
    
    try {
        // Delete existing backup codes
        await supabase
            .from('two_factor_backup_codes')
            .delete()
            .eq('user_id', userId);
        
        // Generate new backup codes
        const newCodes = [];
        for (let i = 0; i < 10; i++) {
            newCodes.push(generateRandomCode());
        }
        
        // Insert new backup codes
        const codesToInsert = newCodes.map(code => ({
            user_id: userId,
            code: code
        }));
        
        await supabase
            .from('two_factor_backup_codes')
            .insert(codesToInsert);
        
        // Show new codes to user
        const modal = document.createElement('div');
        modal.className = 'backup-codes-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 data-i18n="new-backup-codes-title">New Backup Codes Generated</h3>
                <p data-i18n="new-backup-codes-description"><strong>Important:</strong> Save these new codes immediately. Your old codes are no longer valid.</p>
                <div class="backup-codes-list">
                    ${newCodes.map(code => `
                        <div class="backup-code-item available">
                            <span class="code">${code}</span>
                            <span class="status" data-i18n="backup-codes-available">Available</span>
                        </div>
                    `).join('')}
                </div>
                <button onclick="downloadBackupCodes(['${newCodes.join("','")}'])" class="btn-secondary" data-i18n="download-codes">Download Codes</button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-primary" data-i18n="close">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('regenerate-success') : 'New backup codes generated successfully.';
        statusDiv.style.color = '#22c55e';
        
    } catch (err) {
        statusDiv.textContent = typeof i18next !== 'undefined' && i18next.isInitialized ? i18next.t('regenerate-error') : 'Error generating new backup codes.';
        statusDiv.style.color = '#ef4444';
    }
}

function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function downloadBackupCodes(codes) {
    const content = `BitMinded 2FA Backup Codes\n\nSave these codes in a safe place:\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bitminded-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
}

async function cleanupOldFactors(supabase) {
    const statusDiv = document.getElementById('security-status');
    statusDiv.textContent = 'Cleaning up old 2FA factors...';
    statusDiv.style.color = '#3b82f6';
    
    try {
        // Get all MFA factors for the user
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
            console.error('Error listing factors:', factorsError);
            statusDiv.textContent = 'Error accessing 2FA factors. Please try again.';
            statusDiv.style.color = '#ef4444';
            return;
        }
        
        console.log('Found factors:', factors);
        
        if (!factors.totp || factors.totp.length === 0) {
            statusDiv.textContent = 'No old 2FA factors found. You can now enable 2FA.';
            statusDiv.style.color = '#22c55e';
            return;
        }
        
        // Unenroll all TOTP factors
        let cleanedCount = 0;
        for (const factor of factors.totp) {
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                factorId: factor.id
            });
            
            if (unenrollError) {
                console.error('Error unenrolling factor:', unenrollError);
            } else {
                cleanedCount++;
            }
        }
        
        statusDiv.textContent = `Cleaned up ${cleanedCount} old 2FA factor(s). You can now enable 2FA.`;
        statusDiv.style.color = '#22c55e';
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (err) {
        console.error('Error cleaning up factors:', err);
        statusDiv.textContent = 'Error cleaning up old factors. Please try again.';
        statusDiv.style.color = '#ef4444';
    }
}

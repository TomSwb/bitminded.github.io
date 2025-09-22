
// account.js - BitMinded Account Page Logic

document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const accountInfo = document.getElementById('account-info');
    const session = await supabase.auth.getSession();
    const user = session.data?.session?.user;
    if (user) {
        const username = user.user_metadata?.username || '';
        const email = user.email || '';
        const avatarUrl = user.user_metadata?.avatar_url || '';
        accountInfo.innerHTML = [
            '<form id="profile-form">',
            '  <div style="text-align:center;">',
            `    <img src="${avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)}" class="avatar" alt="Avatar">`,
            '  </div>',
            '  <label for="profile-username">Username:</label>',
            `  <input type="text" id="profile-username" name="username" value="${username}" required>`,
            '  <label for="profile-email">Email:</label>',
            `  <input type="email" id="profile-email" name="email" value="${email}" required>`,
            '  <label for="profile-avatar">Avatar URL:</label>',
            `  <input type="text" id="profile-avatar" name="avatar_url" value="${avatarUrl}">`,
            '  <button type="submit">Save Changes</button>',
            '  <div class="status" id="profile-status"></div>',
            '</form>'
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
    } else {
        accountInfo.innerHTML = '<div>Please sign in to view your account.</div>';
    }
});

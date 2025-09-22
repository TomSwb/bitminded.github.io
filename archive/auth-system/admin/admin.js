// admin.js - BitMinded Admin Page Logic

document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check if user is admin
    const session = await supabase.auth.getSession();
    const user = session.data?.session?.user;
    
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '../login/';
        return;
    }
    
    // Check admin status
    const { data: adminData } = await supabase
        .from('admins')
        .select('is_superadmin')
        .eq('user_id', user.id)
        .single();
    
    if (!adminData?.is_superadmin) {
        // Redirect to home if not admin
        window.location.href = '../';
        return;
    }
    
    // Initialize admin page
    initializeAdminPage();
});

function initializeAdminPage() {
    // Set up admin navigation
    const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
    const adminPanels = document.getElementById('admin-panels');
    
    adminNavBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showAdminSection(section);
            
            // Update active state
            adminNavBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Show default section
    showAdminSection('users');
    document.querySelector('[data-section="users"]').classList.add('active');
}

function showAdminSection(section) {
    const panels = document.getElementById('admin-panels');
    
    switch(section) {
        case 'users':
            panels.innerHTML = `
                <div class="admin-panel active">
                    <h3>User Management</h3>
                    <p>User management functionality will be implemented here.</p>
                    <div class="admin-stats">
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">0</div>
                            <div class="admin-stat-label">Total Users</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">0</div>
                            <div class="admin-stat-label">Active Users</div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'payments':
            panels.innerHTML = `
                <div class="admin-panel active">
                    <h3>Payment Management</h3>
                    <p>Payment management functionality will be implemented here.</p>
                    <div class="admin-stats">
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">$0</div>
                            <div class="admin-stat-label">Total Revenue</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">0</div>
                            <div class="admin-stat-label">Transactions</div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'entitlements':
            panels.innerHTML = `
                <div class="admin-panel active">
                    <h3>Entitlement Management</h3>
                    <p>Entitlement management functionality will be implemented here.</p>
                    <div class="admin-stats">
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">0</div>
                            <div class="admin-stat-label">Active Entitlements</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-number">0</div>
                            <div class="admin-stat-label">Apps</div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'settings':
            panels.innerHTML = `
                <div class="admin-panel active">
                    <h3>System Settings</h3>
                    <p>System settings functionality will be implemented here.</p>
                    <div class="admin-form">
                        <label for="site-name">Site Name:</label>
                        <input type="text" id="site-name" value="BitMinded">
                        
                        <label for="maintenance-mode">Maintenance Mode:</label>
                        <select id="maintenance-mode">
                            <option value="false">Disabled</option>
                            <option value="true">Enabled</option>
                        </select>
                        
                        <button type="button" onclick="saveSettings()">Save Settings</button>
                    </div>
                </div>
            `;
            break;
    }
}

function saveSettings() {
    // Placeholder for settings save functionality
    console.log('Settings save functionality will be implemented here');
}

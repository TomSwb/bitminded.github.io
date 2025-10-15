/**
 * Admin Page Loader
 * Handles initialization of the admin panel
 */

document.addEventListener('DOMContentLoaded', async function() {
    
    try {
        // Load admin layout component
        if (window.componentLoader) {
            await window.componentLoader.load('admin-layout', {
                container: '#admin-layout-container',
                basePath: 'admin/components'
            });
            
            
            // Initialize admin layout (it will hide loading screen when done)
            if (window.AdminLayout) {
                window.adminLayout = new window.AdminLayout();
                await window.adminLayout.init();
            } else {
                throw new Error('AdminLayout class not available');
            }
        } else {
            throw new Error('ComponentLoader not available');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize admin page:', error);
        
        // Force hide loading screen before redirect
        if (window.loadingScreen) {
            window.loadingScreen.forceHide();
        }
        
        // Redirect to home on error
        window.location.href = '/';
    }
});


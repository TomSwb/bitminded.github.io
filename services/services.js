/**
 * Services Page Scripts
 * Handles mission toggle integration and page-specific functionality
 */
document.addEventListener('DOMContentLoaded', () => {
    // Wait for mission toggle to be available
    const initMissionToggle = () => {
        if (window.missionToggle && window.missionToggle.isInitialized) {
            // Mission toggle is already initialized from main script
            console.log('✅ Mission toggle ready');
            return;
        }

        // Wait a bit more if mission toggle hasn't loaded
        setTimeout(() => {
            if (window.missionToggle) {
                console.log('✅ Mission toggle loaded');
            } else {
                console.warn('⚠️ Mission toggle not found');
            }
        }, 500);
    };

    // Initialize after a short delay to ensure scripts are loaded
    setTimeout(initMissionToggle, 200);
});


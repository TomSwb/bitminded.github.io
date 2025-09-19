// ========================================
// CRITICAL JAVASCRIPT - PREVENTS FLASH
// ========================================

// Full init: set theme and language before CSS and JS loads
(function() {
    // Theme preference - apply immediately to prevent flash
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // Language preference
    const lang = localStorage.getItem('language');
    if (lang) {
        document.documentElement.setAttribute('lang', lang);
        // Hide translatable content until language script loads
        document.documentElement.classList.add('hide-translatable');
    } else {
        document.documentElement.setAttribute('lang', 'en');
    }
})();

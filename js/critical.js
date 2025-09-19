// ========================================
// CRITICAL JAVASCRIPT - PREVENTS FLASH
// ========================================

// Full init: set theme and language before CSS and JS loads
(function() {
    // ===== AUTOMATIC THEME DETECTION =====
    function detectAndSetTheme() {
        // Check if user has manually set a preference
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            // User has manually set a preference, respect it
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            }
            // For 'dark' or any other value, don't set data-theme (defaults to dark)
        } else {
            // No manual preference, detect from system
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
            
            if (prefersLight) {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            } else if (prefersDark) {
                // Default is dark theme, so no need to set data-theme
                localStorage.setItem('theme', 'dark');
            } else {
                // Fallback to dark theme if no preference detected
                localStorage.setItem('theme', 'dark');
            }
        }
    }

    // ===== AUTOMATIC LANGUAGE DETECTION =====
    function detectAndSetLanguage() {
        // Check if user has manually set a preference
        const savedLang = localStorage.getItem('language');
        
        if (savedLang) {
            // User has manually set a preference, respect it
            document.documentElement.setAttribute('lang', savedLang);
            document.documentElement.classList.add('hide-translatable');
        } else {
            // No manual preference, detect from browser
            const browserLang = navigator.language || navigator.userLanguage || 'en';
            const supportedLangs = ['en', 'fr']; // Add more languages as needed
            
            // Extract primary language code (e.g., 'en' from 'en-US')
            const primaryLang = browserLang.split('-')[0].toLowerCase();
            
            // Check if browser language is supported
            const detectedLang = supportedLangs.includes(primaryLang) ? primaryLang : 'en';
            
            document.documentElement.setAttribute('lang', detectedLang);
            document.documentElement.classList.add('hide-translatable');
            localStorage.setItem('language', detectedLang);
        }
    }

    // ===== INITIALIZE =====
    detectAndSetTheme();
    detectAndSetLanguage();

    // ===== LISTEN FOR SYSTEM THEME CHANGES =====
    // This allows the theme to update if user changes system preference
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');
        
        // Only auto-update if user hasn't manually set a preference
        function handleThemeChange() {
            const savedTheme = localStorage.getItem('theme');
            if (!savedTheme) {
                if (darkModeQuery.matches) {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('theme', 'dark');
                } else if (lightModeQuery.matches) {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('theme', 'light');
                }
            }
        }
        
        // Listen for changes (when DOM is ready)
        document.addEventListener('DOMContentLoaded', function() {
            darkModeQuery.addEventListener('change', handleThemeChange);
            lightModeQuery.addEventListener('change', handleThemeChange);
        });
    }
})();

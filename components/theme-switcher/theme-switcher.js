/**
 * Theme Switcher Component
 * Handles theme switching functionality (light/dark mode)
 */
class ThemeSwitcher {
    constructor() {
        this.element = null;
        this.toggleButton = null;
        this.icon = null;
        this.isInitialized = false;
        // Initialize config with default values
        this.config = {
            persistTheme: true,
            showAnimation: true
        };
        this.currentTheme = this.getCurrentTheme();
    }

    /**
     * Initialize the theme switcher component
     * @param {Object} config - Configuration options
     */
    init(config = {}) {
        if (this.isInitialized) {
            console.log('Theme switcher already initialized');
            return;
        }

        // Initializing theme switcher

        this.config = {
            ...this.config,
            ...config
        };

        this.element = document.getElementById('theme-switcher');
        if (!this.element) {
            console.error('❌ Theme switcher element not found');
            return;
        }

        this.toggleButton = this.element.querySelector('#theme-toggle');
        this.icon = this.element.querySelector('#theme-icon');

        if (!this.toggleButton || !this.icon) {
            console.error('❌ Theme switcher elements not found');
            return;
        }

        // Theme switcher elements found

        this.setupComponent();
        this.bindEvents();
        this.applySavedTheme();
        
        this.isInitialized = true;
        // Theme switcher initialized successfully
    }

    /**
     * Setup component based on configuration
     */
    setupComponent() {
        // Apply initial theme
        this.updateIcon();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!this.config.persistTheme || !localStorage.getItem('theme')) {
                    this.applySystemTheme();
                }
            });
        }
    }

    /**
     * Get current theme from localStorage or system preference
     * @returns {string} Current theme ('light' or 'dark')
     */
    getCurrentTheme() {
        if (this.config.persistTheme) {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                return savedTheme;
            }
        }
        
        // Fallback to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        
        return 'dark'; // Default to dark theme
    }

    /**
     * Apply saved theme on initialization
     */
    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme, false);
        } else {
            this.applySystemTheme();
        }
    }

    /**
     * Apply system theme preference
     */
    applySystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            this.setTheme('light', false);
        } else {
            this.setTheme('dark', false);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Set specific theme
     * @param {string} theme - Theme to set ('light' or 'dark')
     * @param {boolean} save - Whether to save to localStorage
     */
    setTheme(theme, save = true) {
        if (theme === this.currentTheme) {
            return;
        }

        console.log(`🔄 Changing theme from ${this.currentTheme} to: ${theme}`);

        // Show animation if enabled
        if (this.config.showAnimation) {
            this.showChangeAnimation();
        }

        // Apply theme to document
        const html = document.documentElement;
        if (theme === 'light') {
            html.setAttribute('data-theme', 'light');
        } else {
            html.removeAttribute('data-theme');
        }

        // Update current theme
        this.currentTheme = theme;

        // Save to localStorage if enabled
        if (save && this.config.persistTheme) {
            localStorage.setItem('theme', theme);
        }

        // Update icon
        this.updateIcon();

        // Emit theme change event
        this.emitThemeChangeEvent(theme);

        console.log('✅ Theme change completed');
    }

    /**
     * Update icon based on current theme
     */
    updateIcon() {
        if (!this.icon) return;

        if (this.currentTheme === 'light') {
            // Show moon icon for light theme (clicking will switch to dark)
            this.icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" stroke-width="2"/>
            `;
        } else {
            // Show sun icon for dark theme (clicking will switch to light)
            this.icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
            `;
        }
    }

    /**
     * Show change animation
     */
    showChangeAnimation() {
        this.toggleButton.classList.add('changing');
        setTimeout(() => {
            this.toggleButton.classList.remove('changing');
        }, 300);
    }

    /**
     * Emit theme change event
     * @param {string} theme - New theme
     */
    emitThemeChangeEvent(theme) {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: theme,
                previousTheme: this.currentTheme,
                source: 'theme-switcher'
            },
            bubbles: true
        });
        
        window.dispatchEvent(event);
        console.log(`📢 Theme change event emitted: ${theme}`);
    }

    /**
     * Get current theme
     * @returns {string} Current theme
     */
    getCurrentThemeValue() {
        return this.currentTheme;
    }

    /**
     * Check if theme is light
     * @returns {boolean} True if current theme is light
     */
    isLightTheme() {
        return this.currentTheme === 'light';
    }

    /**
     * Check if theme is dark
     * @returns {boolean} True if current theme is dark
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        // Remove event listeners
        if (this.toggleButton) {
            this.toggleButton.replaceWith(this.toggleButton.cloneNode(true));
        }

        this.isInitialized = false;
        console.log('🗑️ Theme switcher destroyed');
    }
}

// Create global instance
window.themeSwitcher = new ThemeSwitcher();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.themeSwitcher && !window.themeSwitcher.isInitialized) {
            window.themeSwitcher.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSwitcher;
}

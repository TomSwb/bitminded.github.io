/**
 * Navigation Menu Component
 * Handles navigation functionality with mobile hamburger menu
 */
class NavigationMenu {
    constructor() {
        this.element = null;
        this.hamburger = null;
        this.links = null;
        this.mobileComponents = null;
        this.isInitialized = false;
        this.currentPage = this.detectCurrentPage();
        this.translations = null;
        this.eventListeners = new Map();
    }

    /**
     * Initialize the navigation menu component
     * @param {Object} config - Configuration options
     */
    init(config = {}) {
        if (this.isInitialized) {
            console.log('Navigation menu already initialized');
            return;
        }

        console.log('🔄 Initializing navigation menu...');

        this.config = {
            autoDetectPage: true,
            closeOnLinkClick: true,
            ...config
        };

        this.element = document.getElementById('navigation-menu');
        if (!this.element) {
            console.error('❌ Navigation menu element not found');
            return;
        }

        this.hamburger = this.element.querySelector('#nav-hamburger');
        this.links = this.element.querySelector('#nav-links');
        this.mobileComponents = this.element.querySelector('.navigation-menu__mobile-components');

        if (!this.hamburger || !this.links) {
            console.error('❌ Navigation menu elements not found');
            return;
        }

        console.log('✅ Navigation menu elements found');

        this.setupComponent();
        this.bindEvents();
        this.loadTranslations();
        this.updateActivePage();
        
        this.isInitialized = true;
        console.log('✅ Navigation menu initialized successfully');
    }

    /**
     * Setup component based on configuration
     */
    setupComponent() {
        // Set initial active page
        if (this.config.autoDetectPage) {
            this.setActivePage(this.currentPage);
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Hamburger click
        this.hamburger.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Navigation link clicks
        const navLinks = this.links.querySelectorAll('.navigation-menu__link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Add click effect
                link.classList.add('clicked');
                
                // Close mobile menu if configured
                if (this.config.closeOnLinkClick) {
                    this.closeMobileMenu();
                }
                
                // Remove click effect after animation
                setTimeout(() => {
                    link.classList.remove('clicked');
                }, 200);
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen() && 
                !this.element.contains(e.target) &&
                !e.target.closest('.navigation-menu')) {
                this.closeMobileMenu();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations(e.detail.language);
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen()) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Load component translations
     */
    async loadTranslations() {
        try {
            const response = await fetch('/components/navigation-menu/locales/navigation-locales.json');
            if (response.ok) {
                this.translations = await response.json();
                this.updateTranslations(this.getCurrentLanguage());
                console.log('✅ Navigation menu translations loaded');
            } else {
                console.warn('Failed to load navigation menu translations:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load navigation menu translations:', error);
        }
    }

    /**
     * Update translations based on current language
     * @param {string} language - Language code
     */
    updateTranslations(language = this.getCurrentLanguage()) {
        if (!this.translations?.[language]) {
            return;
        }

        const t = this.translations[language].translation;
        
        // Update navigation links
        const navLinks = this.links.querySelectorAll('.navigation-menu__link');
        navLinks.forEach(link => {
            const linkId = link.id;
            const translatedText = t[linkId];
            if (translatedText) {
                link.textContent = translatedText;
            }
        });

        // Update hamburger aria-label
        const hamburgerLabel = t['nav-hamburger-label'];
        if (hamburgerLabel && this.hamburger) {
            this.hamburger.setAttribute('aria-label', hamburgerLabel);
        }
    }

    /**
     * Get current language from language switcher or localStorage
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        if (window.languageSwitcher) {
            return window.languageSwitcher.getCurrentLanguage();
        }
        return localStorage.getItem('language') || 'en';
    }

    /**
     * Detect current page from URL
     * @returns {string} Current page identifier
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') {
            return 'home';
        } else if (path.includes('/contact')) {
            return 'contact';
        }
        return 'home'; // Default fallback
    }

    /**
     * Set active page
     * @param {string} pageId - Page identifier
     */
    setActivePage(pageId) {
        const navLinks = this.links.querySelectorAll('.navigation-menu__link');
        navLinks.forEach(link => {
            const isActive = link.id === `nav-${pageId}`;
            link.classList.toggle('active', isActive);
        });
        this.currentPage = pageId;
    }

    /**
     * Update active page based on current URL
     */
    updateActivePage() {
        const currentPage = this.detectCurrentPage();
        this.setActivePage(currentPage);
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        if (this.isMobileMenuOpen()) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.links.classList.add('active');
        this.hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load mobile components if not already loaded
        this.loadMobileComponents();
        
        console.log('📱 Mobile menu opened');
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.links.classList.remove('active');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
        
        console.log('📱 Mobile menu closed');
    }

    /**
     * Check if mobile menu is open
     * @returns {boolean} True if mobile menu is open
     */
    isMobileMenuOpen() {
        return this.links.classList.contains('active');
    }

    /**
     * Load mobile components (Language Switcher and Theme Switcher)
     */
    async loadMobileComponents() {
        // Move existing Language Switcher to mobile container
        const existingLangSwitcher = document.querySelector('.language-switcher');
        const mobileLangContainer = this.mobileComponents.querySelector('#mobile-language-switcher');
        
        console.log('🔍 Debug - existingLangSwitcher:', existingLangSwitcher);
        console.log('🔍 Debug - mobileLangContainer:', mobileLangContainer);
        console.log('🔍 Debug - already has language switcher:', mobileLangContainer?.querySelector('.language-switcher'));
        
        if (existingLangSwitcher && mobileLangContainer && !mobileLangContainer.querySelector('.language-switcher')) {
            // Clone the existing language switcher
            const langClone = existingLangSwitcher.cloneNode(true);
            langClone.classList.add('compact');
            mobileLangContainer.appendChild(langClone);
            
            console.log('🔍 Debug - langClone created:', langClone);
            
            // Re-initialize the cloned language switcher
            if (window.languageSwitcher) {
                // Create a new instance for the mobile version
                const mobileLangSwitcher = new LanguageSwitcher();
                mobileLangSwitcher.element = langClone;
                mobileLangSwitcher.init({ compact: true });
                console.log('✅ Mobile language switcher moved and initialized');
            } else {
                console.warn('⚠️ window.languageSwitcher not available');
            }
        } else {
            console.log('❌ Language switcher not loaded - conditions not met');
        }

        // Move existing Theme Switcher to mobile container
        const existingThemeSwitcher = document.querySelector('.theme-switcher');
        const mobileThemeContainer = this.mobileComponents.querySelector('#mobile-theme-switcher');
        
        if (existingThemeSwitcher && mobileThemeContainer && !mobileThemeContainer.querySelector('.theme-switcher')) {
            // Clone the existing theme switcher
            const themeClone = existingThemeSwitcher.cloneNode(true);
            mobileThemeContainer.appendChild(themeClone);
            
            // Prevent theme switcher clicks from closing the menu
            const themeButton = themeClone.querySelector('.theme-switcher__button');
            if (themeButton) {
                themeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // Re-initialize the cloned theme switcher
            if (window.themeSwitcher) {
                // Create a new instance for the mobile version
                const mobileThemeSwitcher = new ThemeSwitcher();
                mobileThemeSwitcher.element = themeClone;
                mobileThemeSwitcher.init();
            }
            
            console.log('✅ Mobile theme switcher moved and initialized');
        }
    }

    /**
     * Add new navigation item
     * @param {string} id - Item ID
     * @param {string} text - Display text
     * @param {string} href - Link URL
     */
    addItem(id, text, href) {
        const link = document.createElement('a');
        link.id = `nav-${id}`;
        link.className = 'navigation-menu__link';
        link.href = href;
        link.textContent = text;
        
        // Insert before mobile components
        this.links.insertBefore(link, this.mobileComponents);
        
        // Bind click event
        link.addEventListener('click', () => {
            if (this.config.closeOnLinkClick) {
                this.closeMobileMenu();
            }
        });
        
        console.log(`✅ Added navigation item: ${id}`);
    }

    /**
     * Remove navigation item
     * @param {string} id - Item ID
     */
    removeItem(id) {
        const link = this.links.querySelector(`#nav-${id}`);
        if (link) {
            link.remove();
            console.log(`✅ Removed navigation item: ${id}`);
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        this.element.addEventListener(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        this.element.removeEventListener(event, callback);
    }

    /**
     * Destroy component and clean up
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach((listeners, event) => {
            listeners.forEach(callback => {
                this.element.removeEventListener(event, callback);
            });
        });
        this.eventListeners.clear();

        // Close mobile menu if open
        if (this.isMobileMenuOpen()) {
            this.closeMobileMenu();
        }

        this.isInitialized = false;
        console.log('🗑️ Navigation menu destroyed');
    }
}

// Create global instance
window.navigationMenu = new NavigationMenu();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.navigationMenu && !window.navigationMenu.isInitialized) {
            window.navigationMenu.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationMenu;
}

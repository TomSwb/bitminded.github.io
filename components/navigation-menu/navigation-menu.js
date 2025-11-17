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
        this.mobileComponentsLoaded = false;
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

        // Initializing navigation menu

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

        // Navigation menu elements found

        this.setupComponent();
        this.bindEvents();
        this.loadTranslations();
        this.updateActivePage();
        
        // Fallback: ensure content is visible after initialization
        this.ensureContentVisible();
        
        this.isInitialized = true;
        // Navigation menu initialized successfully
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
                // Navigation menu translations loaded
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
        if (this.translations?.[language]) {
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
        }

        // No need to update mobile auth-buttons since we're using the same element

        // Always show translatable content after translation attempt (even if no translations found)
        this.showTranslatableContent();
    }

    /**
     * Ensure translatable content is visible (fallback method)
     */
    ensureContentVisible() {
        // Add loaded class immediately
        this.showTranslatableContent();
        
        // Also set a timeout as a fallback in case translations take too long
        setTimeout(() => {
            this.showTranslatableContent();
        }, 100);
    }

    /**
     * Show all translatable content by adding loaded class
     */
    showTranslatableContent() {
        const translatableElements = this.element.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
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
        } else if (path.includes('/services')) {
            return 'services';
        } else if (path.includes('/catalog')) {
            return 'catalog';
        } else if (path.includes('/support')) {
            return 'support';
        } else if (path.includes('/auth')) {
            return 'auth'; // Special case for auth page
        } else if (path.includes('/account')) {
            return 'account'; // Account page
        } else if (path.includes('/admin')) {
            return 'admin'; // Admin page - no nav item should be active
        }
        return 'home'; // Default fallback
    }

    /**
     * Set active page
     * @param {string} pageId - Page identifier
     */
    setActivePage(pageId) {
        const navLinks = this.links.querySelectorAll('.navigation-menu__link');
        
        // Special case: if we're on auth or admin page, don't show any active navigation items
        if (pageId === 'auth' || pageId === 'admin') {
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            this.currentPage = pageId;
            return;
        }
        
        // Normal behavior for other pages
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
        if (!this.mobileComponentsLoaded) {
            this.loadMobileComponents();
        }
        
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
     * Load mobile components (Language Switcher, Notification Center, Theme Switcher, and Auth Buttons)
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

        // Move existing Notification Center to mobile container
        const existingNotificationCenter = document.querySelector('.notification-center');
        const mobileNotificationContainer = this.mobileComponents.querySelector('#mobile-notification-center');
        
        if (existingNotificationCenter && mobileNotificationContainer && !mobileNotificationContainer.querySelector('.notification-center')) {
            // Clone the existing notification center
            const notificationClone = existingNotificationCenter.cloneNode(true);
            notificationClone.classList.add('compact');
            mobileNotificationContainer.appendChild(notificationClone);
            
            // Prevent notification center clicks from closing the menu
            const notificationBell = notificationClone.querySelector('.notification-center__bell');
            if (notificationBell) {
                notificationBell.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // Re-initialize the cloned notification center
            if (window.notificationCenter) {
                // Create a new instance for the mobile version
                const mobileNotificationCenter = new NotificationCenter();
                mobileNotificationCenter.element = notificationClone;
                mobileNotificationCenter.init({ compact: true });
                console.log('✅ Mobile notification center moved and initialized');
            } else {
                console.warn('⚠️ window.notificationCenter not available');
            }
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

        // Move existing Auth Buttons to mobile container (no cloning needed)
        const existingAuthButtons = document.querySelector('.auth-buttons');
        const mobileAuthContainer = this.mobileComponents.querySelector('#mobile-auth-buttons');
        
        if (existingAuthButtons && mobileAuthContainer && !mobileAuthContainer.querySelector('.auth-buttons')) {
            // Move the existing auth buttons (not clone) to mobile container
            existingAuthButtons.classList.add('compact');
            mobileAuthContainer.appendChild(existingAuthButtons);
            
            // Prevent auth button clicks from closing the menu
            const authButtons = existingAuthButtons.querySelectorAll('.auth-buttons__button, .auth-buttons__user-button');
            authButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
            
            console.log('✅ Mobile auth buttons moved (no cloning)');
        }
        
        // Mark mobile components as loaded
        this.mobileComponentsLoaded = true;
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

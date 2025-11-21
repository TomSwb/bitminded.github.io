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
        this.subnavLoaded = false;
        this.subnavContainer = null;
        this.accountNavLoaded = false;
        this.accountNavContainer = null;
        this.legalSubnavLoaded = false;
        this.legalSubnavContainer = null;
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
            window.logger?.log('Navigation menu already initialized');
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
            window.logger?.error('❌ Navigation menu element not found');
            return;
        }

        this.hamburger = this.element.querySelector('#nav-hamburger');
        this.links = this.element.querySelector('#nav-links');
        this.mobileComponents = this.element.querySelector('.navigation-menu__mobile-components');

        if (!this.hamburger || !this.links) {
            window.logger?.error('❌ Navigation menu elements not found');
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

        // Close menu when clicking outside (but not on sub-nav links)
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen() && 
                !this.element.contains(e.target) &&
                !e.target.closest('.navigation-menu') &&
                !e.target.closest('.navigation-menu__sublink')) {
                this.closeMobileMenu();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations(e.detail.language);
            // Also update sub-nav translations if loaded
            if (this.subnavLoaded) {
                const currentPage = this.detectCurrentPage();
                if (currentPage === 'services') {
                    this.loadSubnavTranslations('services');
                } else if (currentPage === 'faq') {
                    this.loadSubnavTranslations('faq');
                } else if (currentPage === 'about') {
                    this.loadSubnavTranslations('about');
                }
            }
            // Update legal subnav translations if loaded
            if (this.legalSubnavLoaded) {
                this.loadLegalSubnavTranslations();
            }
            // Update account nav translations if loaded
            if (this.accountNavLoaded) {
                this.updateAccountNavTranslations();
            }
        });

        // Listen for account section changes to sync active state
        if (this.isOnAccountPage()) {
            // Observe account layout for section changes
            const accountLayoutObserver = new MutationObserver(() => {
                if (this.accountNavLoaded) {
                    this.updateAccountNavActiveState();
                }
            });
            
            // Start observing when account layout is available
            const observeAccountLayout = () => {
                const accountLayout = document.getElementById('account-layout');
                if (accountLayout) {
                    accountLayoutObserver.observe(accountLayout, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class']
                    });
                } else {
                    setTimeout(observeAccountLayout, 100);
                }
            };
            observeAccountLayout();
        }

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
                window.logger?.warn('Failed to load navigation menu translations:', response.status);
            }
        } catch (error) {
            window.logger?.warn('Failed to load navigation menu translations:', error);
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
        } else if (path.includes('/faq')) {
            return 'faq'; // FAQ page - no nav item should be active
        } else if (path.includes('/legal')) {
            return 'legal'; // Legal page - no nav item should be active
        } else if (path.includes('/services')) {
            return 'services';
        } else if (path.includes('/catalog')) {
            return 'catalog';
        } else if (path.includes('/about')) {
            return 'about';
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
        
        // Special case: if we're on auth, admin, faq, or legal page, don't show any active navigation items
        if (pageId === 'auth' || pageId === 'admin' || pageId === 'faq' || pageId === 'legal') {
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
        document.body.classList.add('mobile-menu-open');
        
        // Load mobile components if not already loaded
        if (!this.mobileComponentsLoaded) {
            this.loadMobileComponents();
        }
        
        // Load sub-nav if on Services or FAQ page (mobile only)
        if (this.isOnServicesPage() || this.isOnFAQPage() || this.isOnAboutPage()) {
            this.loadSubnav();
        }
        
        // Load legal sub-nav if on Legal page (mobile only)
        if (this.isOnLegalPage()) {
            this.loadLegalSubnav();
        }
        
        // Load account nav if on Account page (mobile only)
        if (this.isOnAccountPage()) {
            this.loadAccountNav();
        }
        
        window.logger?.log('📱 Mobile menu opened');
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.links.classList.remove('active');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('mobile-menu-open');
        
        // Don't clear sub-nav or account nav on close - keep them for next open (if still on same page)
        // They will be cleared when navigating to a different page
        
        window.logger?.log('📱 Mobile menu closed');
    }

    /**
     * Check if mobile menu is open
     * @returns {boolean} True if mobile menu is open
     */
    isMobileMenuOpen() {
        return this.links.classList.contains('active');
    }

    /**
     * Check if current page is a Services page
     * @returns {boolean} True if on Services page
     */
    isOnServicesPage() {
        const path = window.location.pathname;
        return path.includes('/services/');
    }

    /**
     * Check if current page is a FAQ page
     * @returns {boolean} True if on FAQ page
     */
    isOnFAQPage() {
        const path = window.location.pathname;
        return path.includes('/faq/');
    }

    /**
     * Check if current page is an About page
     * @returns {boolean} True if on About page
     */
    isOnAboutPage() {
        const path = window.location.pathname;
        return path.includes('/about/');
    }

    /**
     * Check if current page is an Account page
     * @returns {boolean} True if on Account page
     */
    isOnAccountPage() {
        const path = window.location.pathname;
        return path.includes('/account/');
    }

    /**
     * Check if current page is a Legal page
     * @returns {boolean} True if on Legal page
     */
    isOnLegalPage() {
        const path = window.location.pathname;
        return path.includes('/legal-pages/') || path.includes('/legal/');
    }

    /**
     * Load and inject sub-navigation into hamburger menu (mobile only)
     */
    async loadSubnav() {
        // Only load on mobile
        if (window.innerWidth > 768) {
            return;
        }

        // Check if we still need sub-nav (might have navigated away)
        const needsServicesSubnav = this.isOnServicesPage();
        const needsFAQSubnav = this.isOnFAQPage();
        const needsAboutSubnav = this.isOnAboutPage();
        
        if (!needsServicesSubnav && !needsFAQSubnav && !needsAboutSubnav) {
            // No longer on Services/FAQ/About page - remove sub-nav if exists
            if (this.subnavContainer) {
                this.subnavContainer.remove();
                this.subnavContainer = null;
                this.subnavLoaded = false;
            }
            return;
        }

        // If sub-nav container exists but is empty or wrong type, reset it
        if (this.subnavContainer && this.subnavContainer.children.length === 0) {
            this.subnavLoaded = false;
        }

        // Don't reload if already loaded and correct
        if (this.subnavLoaded && this.subnavContainer) {
            return;
        }

        // Create sub-nav container if it doesn't exist
        if (!this.subnavContainer) {
            this.subnavContainer = document.createElement('div');
            this.subnavContainer.className = 'navigation-menu__subnav';
            this.subnavContainer.id = 'navigation-menu-subnav';
            
            // Insert after main nav links, before mobile-components
            const mainLinks = Array.from(this.links.querySelectorAll('.navigation-menu__link'));
            if (mainLinks.length > 0) {
                mainLinks[mainLinks.length - 1].insertAdjacentElement('afterend', this.subnavContainer);
            } else {
                // Fallback: insert before mobile-components
                this.links.insertBefore(this.subnavContainer, this.mobileComponents);
            }
        }

        try {
            if (this.isOnServicesPage()) {
                await this.loadServicesSubnav();
            } else if (this.isOnFAQPage()) {
                await this.loadFAQSubnav();
            } else if (this.isOnAboutPage()) {
                await this.loadAboutSubnav();
            }
        } catch (error) {
            window.logger?.warn('Failed to load sub-navigation:', error);
        }
    }

    /**
     * Load and inject legal sub-navigation into hamburger menu (mobile only)
     */
    async loadLegalSubnav() {
        // Only load on mobile
        if (window.innerWidth > 768) {
            return;
        }

        // Check if we still need legal sub-nav (might have navigated away)
        if (!this.isOnLegalPage()) {
            // No longer on legal page - remove legal sub-nav if exists
            if (this.legalSubnavContainer) {
                this.legalSubnavContainer.remove();
                this.legalSubnavContainer = null;
                this.legalSubnavLoaded = false;
            }
            return;
        }

        // If legal sub-nav container exists but is empty, reset it
        if (this.legalSubnavContainer && this.legalSubnavContainer.children.length === 0) {
            this.legalSubnavLoaded = false;
        }

        // Don't reload if already loaded and correct
        if (this.legalSubnavLoaded && this.legalSubnavContainer) {
            return;
        }

        try {
            // Create legal sub-nav container if it doesn't exist
            if (!this.legalSubnavContainer) {
                this.legalSubnavContainer = document.createElement('div');
                this.legalSubnavContainer.className = 'navigation-menu__subnav';
                this.legalSubnavContainer.id = 'navigation-menu-legal-subnav';
                
                // Insert after main nav links, before mobile-components
                const mainLinks = Array.from(this.links.querySelectorAll('.navigation-menu__link'));
                if (mainLinks.length > 0) {
                    mainLinks[mainLinks.length - 1].insertAdjacentElement('afterend', this.legalSubnavContainer);
                } else {
                    // Fallback: insert before mobile-components
                    this.links.insertBefore(this.legalSubnavContainer, this.mobileComponents);
                }
            }

            // Add Legal Pages title
            const title = document.createElement('div');
            title.className = 'navigation-menu__subnav-title';
            title.textContent = 'Legal Pages';
            title.setAttribute('data-i18n', 'Legal Pages');
            title.classList.add('translatable-content', 'loaded');
            this.legalSubnavContainer.appendChild(title);

            // Create legal page links
            const legalPages = [
                { href: '/legal-pages/privacy/', id: 'legal-subnav-privacy', icon: '🔒', text: 'Privacy Policy', translationKey: 'Privacy Policy' },
                { href: '/legal-pages/terms/', id: 'legal-subnav-terms', icon: '📄', text: 'Terms of Service', translationKey: 'Terms of Service' },
                { href: '/legal-pages/cookies/', id: 'legal-subnav-cookies', icon: '🍪', text: 'Cookie Notice', translationKey: 'Cookie Notice' },
                { href: '/legal-pages/imprint/', id: 'legal-subnav-imprint', icon: '📋', text: 'Legal Notice', translationKey: 'Legal Notice' }
            ];

            legalPages.forEach(page => {
                const sublink = this.createLegalSubnavLink(page);
                this.legalSubnavContainer.appendChild(sublink);
            });

            // Update active state
            this.updateLegalSubnavActiveState();

            // Load translations
            await this.loadLegalSubnavTranslations();

            // Ensure links are visible immediately
            const legalSubLinks = this.legalSubnavContainer.querySelectorAll('.navigation-menu__sublink');
            legalSubLinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });

            this.legalSubnavLoaded = true;
            window.logger?.log('✅ Legal sub-navigation loaded in hamburger menu');
        } catch (error) {
            window.logger?.warn('Failed to load legal sub-navigation:', error);
        }
    }

    /**
     * Create a legal subnav link element
     * @param {Object} page - Page object with href, id, icon, text, translationKey
     * @returns {HTMLElement} New legal subnav link element
     */
    createLegalSubnavLink(page) {
        const sublink = document.createElement('a');
        sublink.className = 'navigation-menu__sublink';
        sublink.href = page.href;
        sublink.id = page.id;
        
        // Add icon
        if (page.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'navigation-menu__sublink-icon';
            iconSpan.textContent = page.icon;
            sublink.appendChild(iconSpan);
        }
        
        // Add text
        const textSpan = document.createElement('span');
        textSpan.className = 'navigation-menu__sublink-text';
        if (page.translationKey) {
            textSpan.setAttribute('data-i18n', page.translationKey);
        }
        textSpan.textContent = page.text || '';
        textSpan.classList.add('loaded');
        sublink.appendChild(textSpan);

        // Add translatable class
        if (page.translationKey) {
            sublink.classList.add('translatable-content');
        }
        
        // Always add loaded class to ensure visibility
        sublink.classList.add('loaded');

        // Add click handler that prevents menu closing but allows navigation
        sublink.addEventListener('click', (e) => {
            // Prevent event from bubbling up to document listener
            e.stopPropagation();
            // Don't prevent default - allow navigation to happen
            // Menu will stay open until page navigation completes
        });

        // Set initial active state
        this.setLegalSubnavLinkActive(sublink, page.href);

        return sublink;
    }

    /**
     * Set active state for legal subnav link
     * @param {HTMLElement} link - Legal subnav link element
     * @param {string} href - Link href
     */
    setLegalSubnavLinkActive(link, href) {
        const path = window.location.pathname;
        const isActive = path === href || path === href.replace(/\/$/, '') || 
                        (href.includes('/privacy') && path.includes('/privacy')) ||
                        (href.includes('/terms') && path.includes('/terms')) ||
                        (href.includes('/cookies') && path.includes('/cookies')) ||
                        (href.includes('/imprint') && path.includes('/imprint'));
        
        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    }

    /**
     * Update legal subnav active state
     */
    updateLegalSubnavActiveState() {
        if (!this.legalSubnavContainer) return;
        const legalSubLinks = this.legalSubnavContainer.querySelectorAll('.navigation-menu__sublink');
        legalSubLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                this.setLegalSubnavLinkActive(link, href);
            }
        });
    }

    /**
     * Load legal subnav translations
     */
    async loadLegalSubnavTranslations() {
        if (!this.legalSubnavContainer) return;
        
        try {
            // Load navigation menu translations (they contain legal page translations)
            if (!this.translations) {
                await this.loadTranslations();
            }

            const currentLanguage = this.getCurrentLanguage();

            // Update translations for legal subnav title
            const legalSubnavTitle = this.legalSubnavContainer.querySelector('.navigation-menu__subnav-title[data-i18n]');
            if (legalSubnavTitle && this.translations?.[currentLanguage]) {
                const titleKey = legalSubnavTitle.getAttribute('data-i18n');
                if (titleKey) {
                    const t = this.translations[currentLanguage].translation;
                    const titleTranslation = t[titleKey];
                    if (titleTranslation && titleTranslation !== titleKey && titleTranslation.trim() !== '') {
                        legalSubnavTitle.textContent = titleTranslation;
                    }
                }
            }

            // Wait for i18next if not available (for fallback)
            if (typeof i18next === 'undefined') {
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (typeof i18next !== 'undefined') {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 2000);
                });
            }

            // Update translations for legal subnav links using navigation translations or i18next
            const legalSubLinks = this.legalSubnavContainer.querySelectorAll('.navigation-menu__sublink-text[data-i18n]');
            legalSubLinks.forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (key) {
                    let translation = null;
                    
                    // Try navigation translations first
                    if (this.translations?.[currentLanguage]) {
                        const t = this.translations[currentLanguage].translation;
                        translation = t[key];
                    }
                    
                    // Fallback to i18next if available
                    if (!translation && typeof i18next !== 'undefined') {
                        try {
                            translation = i18next.t(key);
                        } catch (error) {
                            // Ignore translation errors
                        }
                    }
                    
                    // Only update if translation exists and is different from key
                    if (translation && translation !== key && translation.trim() !== '') {
                        element.textContent = translation;
                        // Mark as translated
                        element.classList.add('translated');
                    } else {
                        // Keep original text if translation not found
                        element.classList.add('loaded'); // Make sure it's visible
                    }
                } else {
                    // No translation key, just make sure it's visible
                    element.classList.add('loaded');
                }
            });
            
            // Ensure all legal subnav links are visible
            const allLegalSubLinks = this.legalSubnavContainer.querySelectorAll('.navigation-menu__sublink');
            allLegalSubLinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });
            
            window.logger?.log('✅ Legal subnav translations loaded');
        } catch (error) {
            window.logger?.warn('Failed to load legal subnav translations:', error);
        }
    }

    /**
     * Load Services sub-navigation
     */
    async loadServicesSubnav() {
        try {
            // Load CSS
            if (!document.querySelector('link[href*="services-subnav.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/services/components/services-subnav/services-subnav.css';
                document.head.appendChild(cssLink);
            }

            // Load HTML
            const htmlResponse = await fetch('/services/components/services-subnav/services-subnav.html');
            const htmlContent = await htmlResponse.text();
            
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const subnavElement = tempDiv.querySelector('.services-subnav');
            
            if (!subnavElement) {
                throw new Error('Services subnav HTML not found');
            }

            // Extract links and convert to navigation menu format
            const links = subnavElement.querySelectorAll('.services-subnav__link');
            links.forEach(link => {
                const sublink = this.createSubnavLink(link);
                this.subnavContainer.appendChild(sublink);
            });

            // Load JS for active state detection
            if (!window.servicesSubnav) {
                const script = document.createElement('script');
                script.src = '/services/components/services-subnav/services-subnav.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Manually update active state for injected links
                this.updateServicesSubnavActiveState();
            }

            // Ensure links are visible immediately (before translations)
            const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
            sublinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });

            // Load translations after links are created and in DOM
            await this.loadSubnavTranslations('services');

            this.subnavLoaded = true;
        } catch (error) {
            window.logger?.warn('Failed to load Services sub-navigation:', error);
        }
    }

    /**
     * Load About sub-navigation
     */
    async loadAboutSubnav() {
        try {
            // Load CSS
            if (!document.querySelector('link[href*="about-subnav.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/about/components/about-subnav/about-subnav.css';
                document.head.appendChild(cssLink);
            }

            // Load HTML
            const htmlResponse = await fetch('/about/components/about-subnav/about-subnav.html');
            const htmlContent = await htmlResponse.text();
            
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const subnavElement = tempDiv.querySelector('.about-subnav');
            
            if (!subnavElement) {
                throw new Error('About subnav HTML not found');
            }

            // Extract links and convert to navigation menu format
            const links = subnavElement.querySelectorAll('.about-subnav__link');
            links.forEach(link => {
                const sublink = this.createSubnavLink(link, 'about');
                this.subnavContainer.appendChild(sublink);
            });

            // Load JS for active state detection
            if (!window.aboutSubnav) {
                const script = document.createElement('script');
                script.src = '/about/components/about-subnav/about-subnav.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Manually update active state for injected links
                this.updateAboutSubnavActiveState();
            }

            // Ensure links are visible immediately (before translations)
            const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
            sublinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });

            // Load translations after links are created and in DOM
            await this.loadSubnavTranslations('about');

            this.subnavLoaded = true;
        } catch (error) {
            window.logger?.warn('Failed to load About sub-navigation:', error);
        }
    }

    /**
     * Load FAQ sub-navigation
     */
    async loadFAQSubnav() {
        try {
            // Load CSS
            if (!document.querySelector('link[href*="faq-subnav.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '/faq/components/faq-subnav/faq-subnav.css';
                document.head.appendChild(cssLink);
            }

            // Load HTML
            const htmlResponse = await fetch('/faq/components/faq-subnav/faq-subnav.html');
            const htmlContent = await htmlResponse.text();
            
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const subnavElement = tempDiv.querySelector('.faq-subnav');
            
            if (!subnavElement) {
                throw new Error('FAQ subnav HTML not found');
            }

            // Add FAQ title before links
            const title = document.createElement('div');
            title.className = 'navigation-menu__subnav-title';
            title.textContent = 'FAQ';
            title.setAttribute('data-i18n', 'FAQ');
            title.classList.add('translatable-content', 'loaded');
            this.subnavContainer.appendChild(title);

            // Extract links and convert to navigation menu format
            const links = subnavElement.querySelectorAll('.faq-subnav__link');
            links.forEach(link => {
                const sublink = this.createSubnavLink(link, 'faq');
                this.subnavContainer.appendChild(sublink);
            });

            // Load JS for active state detection
            if (!window.faqSubnav) {
                const script = document.createElement('script');
                script.src = '/faq/components/faq-subnav/faq-subnav.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Manually update active state for injected links
                this.updateFAQSubnavActiveState();
            }

            // Ensure links are visible immediately (before translations)
            const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
            sublinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });

            // Load translations after links are created and in DOM
            await this.loadSubnavTranslations('faq');

            this.subnavLoaded = true;
        } catch (error) {
            window.logger?.warn('Failed to load FAQ sub-navigation:', error);
        }
    }

    /**
     * Create a subnav link element from original link
     * @param {HTMLElement} originalLink - Original subnav link element
     * @param {string} type - 'services', 'faq', or 'about'
     * @returns {HTMLElement} New subnav link element
     */
    createSubnavLink(originalLink, type = 'services') {
        const sublink = document.createElement('a');
        sublink.className = 'navigation-menu__sublink';
        sublink.href = originalLink.href;
        sublink.id = originalLink.id;
        
        // Copy icon if exists
        const icon = originalLink.querySelector(`.${type}-subnav__icon`) || originalLink.querySelector('.about-subnav__icon');
        const text = originalLink.querySelector(`.${type}-subnav__text`) || originalLink.querySelector('.about-subnav__text');
        
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'navigation-menu__sublink-icon';
            iconSpan.textContent = icon.textContent;
            sublink.appendChild(iconSpan);
        }
        
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.className = 'navigation-menu__sublink-text';
            // Set initial text content (fallback if translation fails)
            const i18nKey = originalLink.getAttribute('data-i18n');
            if (i18nKey) {
                textSpan.setAttribute('data-i18n', i18nKey);
            }
            // Always set initial text content to ensure visibility
            const initialText = text.textContent || text.textContent.trim() || '';
            textSpan.textContent = initialText;
            // Add loaded class immediately to make it visible
            textSpan.classList.add('loaded');
            sublink.appendChild(textSpan);
        } else {
            // Fallback: use link's text content
            const linkText = originalLink.textContent.trim();
            const textSpan = document.createElement('span');
            textSpan.className = 'navigation-menu__sublink-text';
            const i18nKey = originalLink.getAttribute('data-i18n');
            if (i18nKey) {
                textSpan.setAttribute('data-i18n', i18nKey);
            }
            textSpan.textContent = linkText || '';
            // Add loaded class immediately to make it visible
            textSpan.classList.add('loaded');
            sublink.appendChild(textSpan);
        }

        // Add translatable class if original has it
        if (originalLink.classList.contains('translatable-content')) {
            sublink.classList.add('translatable-content');
            // Add loaded class immediately to make it visible
            sublink.classList.add('loaded');
        }
        
        // Always add loaded class to ensure visibility
        sublink.classList.add('loaded');

        // Add click handler that prevents menu closing but allows navigation
        sublink.addEventListener('click', (e) => {
            // Prevent event from bubbling up to document listener
            e.stopPropagation();
            // Don't prevent default - allow navigation to happen
            // Menu will stay open until page navigation completes
        });

        // Set active state based on current page
        this.setSubnavLinkActive(sublink, type);

        return sublink;
    }

    /**
     * Set active state for subnav link
     * @param {HTMLElement} link - Subnav link element
     * @param {string} type - 'services', 'faq', or 'about'
     */
    setSubnavLinkActive(link, type) {
        const path = window.location.pathname;
        const linkId = link.id;
        let isActive = false;

        if (type === 'services') {
            if (linkId === 'services-subnav-overview' && (path === '/services/' || path === '/services/index.html')) {
                isActive = true;
            } else if (linkId === 'services-subnav-commissioning' && path.includes('/services/commissioning')) {
                isActive = true;
            } else if (linkId === 'services-subnav-tech-support' && path.includes('/services/tech-support')) {
                isActive = true;
            } else if (linkId === 'services-subnav-catalog-access' && path.includes('/services/catalog-access')) {
                isActive = true;
            }
        } else if (type === 'faq') {
            if (linkId === 'faq-subnav-general' && (path === '/faq/' || path === '/faq/index.html' || path.includes('/faq/general'))) {
                isActive = true;
            } else if (linkId === 'faq-subnav-catalog-access' && path.includes('/faq/catalog-access')) {
                isActive = true;
            } else if (linkId === 'faq-subnav-commissioning' && path.includes('/faq/commissioning')) {
                isActive = true;
            } else if (linkId === 'faq-subnav-tech-support' && path.includes('/faq/tech-support')) {
                isActive = true;
            } else if (linkId === 'faq-subnav-account-billing' && path.includes('/faq/account-billing')) {
                isActive = true;
            }
        } else if (type === 'about') {
            if (linkId === 'about-subnav-overview' && (path === '/about/' || path === '/about/index.html')) {
                isActive = true;
            } else if (linkId === 'about-subnav-vision-mission' && path.includes('/about/vision-mission')) {
                isActive = true;
            } else if (linkId === 'about-subnav-team' && path.includes('/about/team')) {
                isActive = true;
            }
        }

        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        }
    }

    /**
     * Update Services subnav active state
     */
    updateServicesSubnavActiveState() {
        if (!this.subnavContainer) return;
        const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
        sublinks.forEach(link => {
            this.setSubnavLinkActive(link, 'services');
        });
    }

    /**
     * Update FAQ subnav active state
     */
    updateFAQSubnavActiveState() {
        if (!this.subnavContainer) return;
        const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
        sublinks.forEach(link => {
            this.setSubnavLinkActive(link, 'faq');
        });
    }

    /**
     * Update About subnav active state
     */
    updateAboutSubnavActiveState() {
        if (!this.subnavContainer) return;
        const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
        sublinks.forEach(link => {
            this.setSubnavLinkActive(link, 'about');
        });
    }

    /**
     * Load subnav translations
     * @param {string} type - 'services', 'faq', or 'about'
     */
    async loadSubnavTranslations(type) {
        if (!this.subnavContainer) return;
        
        try {
            let localePath;
            if (type === 'services') {
                localePath = '/services/components/services-subnav/locales/services-subnav-locales.json';
            } else if (type === 'faq') {
                localePath = '/faq/components/faq-subnav/locales/faq-subnav-locales.json';
            } else if (type === 'about') {
                localePath = '/about/components/about-subnav/locales/about-subnav-locales.json';
            } else {
                window.logger?.warn('Unknown subnav type:', type);
                return;
            }
            
            const response = await fetch(localePath);
            if (!response.ok) {
                window.logger?.warn('Failed to fetch subnav translations:', response.status);
                return;
            }

            const resources = await response.json();
            const currentLanguage = this.getCurrentLanguage();

            // Wait for i18next if not available
            if (typeof i18next === 'undefined') {
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (typeof i18next !== 'undefined') {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 2000);
                });
            }

            if (typeof i18next !== 'undefined') {
                const instance = i18next.createInstance();
                await instance.init({
                    lng: currentLanguage,
                    debug: false,
                    resources
                });

                // Update translations for subnav title (FAQ)
                const subnavTitle = this.subnavContainer.querySelector('.navigation-menu__subnav-title[data-i18n]');
                if (subnavTitle) {
                    const titleKey = subnavTitle.getAttribute('data-i18n');
                    if (titleKey) {
                        try {
                            const titleTranslation = instance.t(titleKey);
                            if (titleTranslation && titleTranslation !== titleKey && titleTranslation.trim() !== '') {
                                subnavTitle.textContent = titleTranslation;
                            }
                        } catch (error) {
                            window.logger?.warn('Translation error for FAQ title:', error);
                        }
                    }
                }

                // Update translations for subnav links
                const sublinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink-text[data-i18n]');
                sublinks.forEach(element => {
                    const key = element.getAttribute('data-i18n');
                    if (key) {
                        try {
                            const translation = instance.t(key);
                            // Only update if translation exists and is different from key
                            if (translation && translation !== key && translation.trim() !== '') {
                                element.textContent = translation;
                                // Mark as translated
                                element.classList.add('translated');
                            } else {
                                // Keep original text if translation not found
                                window.logger?.warn('Translation not found for key:', key);
                                element.classList.add('loaded'); // Make sure it's visible
                            }
                        } catch (error) {
                            window.logger?.warn('Translation error for key:', key, error);
                            element.classList.add('loaded'); // Make sure it's visible
                        }
                    } else {
                        // No translation key, just make sure it's visible
                        element.classList.add('loaded');
                    }
                });
                
                // Ensure all subnav links are visible
                const allSubLinks = this.subnavContainer.querySelectorAll('.navigation-menu__sublink');
                allSubLinks.forEach(link => {
                    link.classList.add('loaded');
                    link.style.opacity = '1';
                    link.style.visibility = 'visible';
                });
                
                window.logger?.log('✅ Subnav translations loaded for', type, 'updated', sublinks.length, 'items');
            } else {
                window.logger?.warn('i18next not available for subnav translations');
            }
        } catch (error) {
            window.logger?.warn('Failed to load subnav translations:', error);
        }
    }

    /**
     * Load mobile components (Language Switcher, Notification Center, Theme Switcher, and Auth Buttons)
     */
    async loadMobileComponents() {
        // Move existing Language Switcher to mobile container
        const existingLangSwitcher = document.querySelector('.language-switcher');
        const mobileLangContainer = this.mobileComponents.querySelector('#mobile-language-switcher');
        
        window.logger?.log('🔍 Debug - existingLangSwitcher:', existingLangSwitcher);
        window.logger?.log('🔍 Debug - mobileLangContainer:', mobileLangContainer);
        window.logger?.log('🔍 Debug - already has language switcher:', mobileLangContainer?.querySelector('.language-switcher'));
        
        if (existingLangSwitcher && mobileLangContainer && !mobileLangContainer.querySelector('.language-switcher')) {
            // Clone the existing language switcher
            const langClone = existingLangSwitcher.cloneNode(true);
            langClone.classList.add('compact');
            mobileLangContainer.appendChild(langClone);
            
            window.logger?.log('🔍 Debug - langClone created:', langClone);
            
            // Re-initialize the cloned language switcher
            if (window.languageSwitcher) {
                // Create a new instance for the mobile version
                const mobileLangSwitcher = new LanguageSwitcher();
                mobileLangSwitcher.element = langClone;
                mobileLangSwitcher.init({ compact: true });
                window.logger?.log('✅ Mobile language switcher moved and initialized');
            } else {
                window.logger?.warn('⚠️ window.languageSwitcher not available');
            }
        } else {
            window.logger?.log('❌ Language switcher not loaded - conditions not met');
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
                window.logger?.log('✅ Mobile notification center moved and initialized');
            } else {
                window.logger?.warn('⚠️ window.notificationCenter not available');
            }
        }

        // Move existing Currency Switcher to mobile container (only if it exists)
        const existingCurrencySwitcher = document.querySelector('.currency-switcher');
        const mobileCurrencyContainer = this.mobileComponents.querySelector('#mobile-currency-switcher');
        
        if (existingCurrencySwitcher && mobileCurrencyContainer && !mobileCurrencyContainer.querySelector('.currency-switcher')) {
            // Clone the existing currency switcher
            const currencyClone = existingCurrencySwitcher.cloneNode(true);
            currencyClone.classList.add('compact');
            mobileCurrencyContainer.appendChild(currencyClone);
            
            // Prevent currency switcher clicks from closing the menu
            const currencyToggle = currencyClone.querySelector('.currency-switcher__toggle');
            if (currencyToggle) {
                currencyToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // Re-initialize the cloned currency switcher
            if (window.CurrencySwitcher) {
                // Create a new instance for the mobile version
                const mobileCurrencySwitcher = new CurrencySwitcher();
                mobileCurrencySwitcher.element = currencyClone;
                mobileCurrencySwitcher.init({ compact: true });
                window.logger?.log('✅ Mobile currency switcher moved and initialized');
            } else {
                window.logger?.warn('⚠️ window.CurrencySwitcher not available');
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
            
            window.logger?.log('✅ Mobile theme switcher moved and initialized');
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
            
            window.logger?.log('✅ Mobile auth buttons moved (no cloning)');
        }
        
        // Mark mobile components as loaded
        this.mobileComponentsLoaded = true;
    }

    /**
     * Load and inject account navigation into hamburger menu (mobile only)
     */
    async loadAccountNav() {
        // Only load on mobile
        if (window.innerWidth > 768) {
            return;
        }

        // Only load if user is logged in
        const authButtons = document.querySelector('.auth-buttons__logged-in');
        if (!authButtons || authButtons.classList.contains('auth-buttons__logged-in--hidden')) {
            return;
        }

        // Check if we still need account nav (might have navigated away or logged out)
        if (!this.isOnAccountPage()) {
            // No longer on account page - remove account nav if exists
            if (this.accountNavContainer) {
                this.accountNavContainer.remove();
                this.accountNavContainer = null;
                this.accountNavLoaded = false;
            }
            return;
        }

        // If account nav container exists but is empty or wrong type, reset it
        if (this.accountNavContainer && this.accountNavContainer.children.length === 0) {
            this.accountNavLoaded = false;
        }

        // Don't reload if already loaded and correct
        if (this.accountNavLoaded && this.accountNavContainer) {
            return;
        }

        try {
            // Find mobile auth buttons container
            const mobileAuthContainer = this.mobileComponents.querySelector('#mobile-auth-buttons');
            if (!mobileAuthContainer) {
                window.logger?.warn('Mobile auth buttons container not found');
                return;
            }

            // Find the logout button (or admin button if admin)
            const authButtonsElement = mobileAuthContainer.querySelector('.auth-buttons');
            if (!authButtonsElement) {
                window.logger?.warn('Auth buttons element not found');
                return;
            }

            const loggedInContainer = authButtonsElement.querySelector('.auth-buttons__logged-in');
            if (!loggedInContainer) {
                window.logger?.warn('Logged in container not found');
                return;
            }

            // For admin: insert between username and admin panel button
            // For regular user: insert between username and logout button
            const adminButton = loggedInContainer.querySelector('#auth-admin-button');
            const logoutButton = loggedInContainer.querySelector('#auth-logout-button');
            const referenceButton = adminButton && !adminButton.classList.contains('auth-buttons__button--hidden') 
                ? adminButton 
                : logoutButton;
            
            // Create account nav container if it doesn't exist
            if (!this.accountNavContainer) {
                this.accountNavContainer = document.createElement('div');
                this.accountNavContainer.className = 'navigation-menu__account-nav';
                this.accountNavContainer.id = 'navigation-menu-account-nav';
                
                // Insert before reference button (admin panel for admin, logout for regular user)
                if (referenceButton) {
                    referenceButton.parentElement.insertBefore(this.accountNavContainer, referenceButton);
                } else {
                    // Fallback: insert at end of logged in container
                    loggedInContainer.appendChild(this.accountNavContainer);
                }
            }

            // Load account navigation HTML
            const htmlResponse = await fetch('/account/components/account-layout/account-layout.html');
            const htmlContent = await htmlResponse.text();
            
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const accountLayout = tempDiv.querySelector('.account-layout');
            
            if (!accountLayout) {
                throw new Error('Account layout HTML not found');
            }

            // Extract navigation items
            const navItems = accountLayout.querySelectorAll('.account-layout__nav-item');
            navItems.forEach(navItem => {
                const navButton = navItem.querySelector('.account-layout__nav-button');
                if (navButton) {
                    const accountNavLink = this.createAccountNavLink(navButton);
                    this.accountNavContainer.appendChild(accountNavLink);
                }
            });

            // Update active state
            this.updateAccountNavActiveState();

            // Load translations
            await this.loadAccountNavTranslations();

            // Ensure links are visible immediately
            const accountNavLinks = this.accountNavContainer.querySelectorAll('.navigation-menu__account-nav-link');
            accountNavLinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });

            this.accountNavLoaded = true;
            window.logger?.log('✅ Account navigation loaded in hamburger menu');
        } catch (error) {
            window.logger?.warn('Failed to load account navigation:', error);
        }
    }

    /**
     * Create an account nav link element from original button
     * @param {HTMLElement} originalButton - Original account nav button element
     * @returns {HTMLElement} New account nav link element
     */
    createAccountNavLink(originalButton) {
        const link = document.createElement('button');
        link.className = 'navigation-menu__account-nav-link';
        link.type = 'button';
        link.id = originalButton.id;
        link.setAttribute('data-section', originalButton.getAttribute('data-section'));
        
        // Copy icon if exists
        const icon = originalButton.querySelector('.account-layout__nav-icon');
        const text = originalButton.querySelector('.account-layout__nav-text');
        
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'navigation-menu__account-nav-icon';
            iconSpan.textContent = icon.textContent;
            link.appendChild(iconSpan);
        }
        
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.className = 'navigation-menu__account-nav-text';
            const translationKey = text.getAttribute('data-translation-key');
            if (translationKey) {
                textSpan.setAttribute('data-translation-key', translationKey);
            }
            textSpan.textContent = text.textContent || text.textContent.trim() || '';
            textSpan.classList.add('loaded');
            link.appendChild(textSpan);
        }

        // Add translatable class if original has it
        if (originalButton.classList.contains('translatable-content') || text?.classList.contains('translatable-content')) {
            link.classList.add('translatable-content');
        }
        
        // Always add loaded class to ensure visibility
        link.classList.add('loaded');

            // Add click handler to switch sections
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const section = link.getAttribute('data-section');
            if (section) {
                // Call AccountLayout switchSection method
                if (window.accountLayout) {
                    window.accountLayout.switchSection(section, true);
                    
                    // Wait a bit for section to switch, then update active state
                    setTimeout(() => {
                        this.updateAccountNavActiveState();
                    }, 100);
                } else {
                    // Fallback: try to trigger click on original button if it exists
                    const originalNavButton = document.querySelector(`#account-layout .account-layout__nav-button[data-section="${section}"]`);
                    if (originalNavButton) {
                        originalNavButton.click();
                        // Update active state after click
                        setTimeout(() => {
                            this.updateAccountNavActiveState();
                        }, 100);
                    }
                }
            }
        });

        // Set initial active state
        const section = link.getAttribute('data-section');
        this.setAccountNavLinkActive(link, section);

        return link;
    }

    /**
     * Set active state for account nav link
     * @param {HTMLElement} link - Account nav link element
     * @param {string} section - Section name
     */
    setAccountNavLinkActive(link, section) {
        // Get current active section
        let activeSection = 'profile'; // default
        const accountLayout = document.getElementById('account-layout');
        if (accountLayout) {
            const activeSectionElement = accountLayout.querySelector('.account-layout__section.active');
            if (activeSectionElement) {
                activeSection = activeSectionElement.getAttribute('data-section') || 'profile';
            }
        }
        
        // Also check URL parameter as fallback
        const urlParams = new URLSearchParams(window.location.search);
        const urlSection = urlParams.get('section');
        if (urlSection) {
            activeSection = urlSection;
        }
        
        // Set active state
        const isActive = section === activeSection;
        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    }

    /**
     * Update account nav active state
     */
    updateAccountNavActiveState() {
        if (!this.accountNavContainer) return;
        
        // Get the current active section from account layout
        let activeSection = 'profile'; // default
        const accountLayout = document.getElementById('account-layout');
        if (accountLayout) {
            const activeSectionElement = accountLayout.querySelector('.account-layout__section.active');
            if (activeSectionElement) {
                activeSection = activeSectionElement.getAttribute('data-section') || 'profile';
            }
        }
        
        // Also check URL parameter as fallback
        const urlParams = new URLSearchParams(window.location.search);
        const urlSection = urlParams.get('section');
        if (urlSection) {
            activeSection = urlSection;
        }
        
        // Update all account nav links
        const accountNavLinks = this.accountNavContainer.querySelectorAll('.navigation-menu__account-nav-link');
        accountNavLinks.forEach(link => {
            const section = link.getAttribute('data-section');
            if (section) {
                const isActive = section === activeSection;
                link.classList.toggle('active', isActive);
                if (isActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            }
        });
    }

    /**
     * Load account nav translations
     */
    async loadAccountNavTranslations() {
        if (!this.accountNavContainer) return;
        
        try {
            // Wait for i18next if not available
            if (typeof i18next === 'undefined') {
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (typeof i18next !== 'undefined') {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 2000);
                });
            }

            // Update translations for account nav links
            const accountNavLinks = this.accountNavContainer.querySelectorAll('.navigation-menu__account-nav-text[data-translation-key]');
            accountNavLinks.forEach(element => {
                const key = element.getAttribute('data-translation-key');
                if (key && typeof i18next !== 'undefined') {
                    try {
                        const translation = i18next.t(key);
                        // Only update if translation exists and is different from key
                        if (translation && translation !== key && translation.trim() !== '') {
                            element.textContent = translation;
                            // Mark as translated
                            element.classList.add('translated');
                        } else {
                            // Keep original text if translation not found
                            element.classList.add('loaded'); // Make sure it's visible
                        }
                    } catch (error) {
                        window.logger?.warn('Translation error for key:', key, error);
                        element.classList.add('loaded'); // Make sure it's visible
                    }
                } else {
                    // No translation key, just make sure it's visible
                    element.classList.add('loaded');
                }
            });
            
            // Ensure all account nav links are visible
            const allAccountNavLinks = this.accountNavContainer.querySelectorAll('.navigation-menu__account-nav-link');
            allAccountNavLinks.forEach(link => {
                link.classList.add('loaded');
                link.style.opacity = '1';
                link.style.visibility = 'visible';
            });
            
            window.logger?.log('✅ Account nav translations loaded');
        } catch (error) {
            window.logger?.warn('Failed to load account nav translations:', error);
        }
    }

    /**
     * Update account nav translations
     */
    updateAccountNavTranslations() {
        if (!this.accountNavContainer) return;
        
        const accountNavLinks = this.accountNavContainer.querySelectorAll('.navigation-menu__account-nav-text[data-translation-key]');
        accountNavLinks.forEach(element => {
            const key = element.getAttribute('data-translation-key');
            if (key && typeof i18next !== 'undefined') {
                try {
                    const translation = i18next.t(key);
                    if (translation && translation !== key && translation.trim() !== '') {
                        element.textContent = translation;
                        element.classList.add('translated');
                    }
                } catch (error) {
                    window.logger?.warn('Translation error for key:', key, error);
                }
            }
            element.classList.add('loaded');
        });
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
        
        window.logger?.log(`✅ Added navigation item: ${id}`);
    }

    /**
     * Remove navigation item
     * @param {string} id - Item ID
     */
    removeItem(id) {
        const link = this.links.querySelector(`#nav-${id}`);
        if (link) {
            link.remove();
            window.logger?.log(`✅ Removed navigation item: ${id}`);
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
        window.logger?.log('🗑️ Navigation menu destroyed');
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

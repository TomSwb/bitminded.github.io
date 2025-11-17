/**
 * FAQ Sub-Navigation Component
 * Only displays on /faq/* pages and highlights the current subpage
 */
(function() {
    class FAQSubnav {
        constructor() {
            this.element = null;
            this.links = [];
            this.currentPage = null;
            this.isInitialized = false;
        }

        /**
         * Initialize the sub-navigation component
         */
        init() {
            // Only initialize if we're on a FAQ page
            if (!this.isFAQPage()) {
                return;
            }

            this.element = document.getElementById('faq-subnav');
            if (!this.element) {
                console.warn('FAQ sub-navigation container not found');
                return;
            }

            this.detectCurrentPage();
            this.cacheLinks();
            this.updateActiveState();
            this.loadTranslations();
            this.isInitialized = true;
        }

        /**
         * Check if current page is a FAQ page
         * @returns {boolean}
         */
        isFAQPage() {
            const path = window.location.pathname;
            return path.includes('/faq/');
        }

        /**
         * Detect current subpage from URL
         */
        detectCurrentPage() {
            const path = window.location.pathname;
            
            if (path === '/faq/' || path === '/faq/index.html' || path.includes('/faq/general')) {
                this.currentPage = 'general';
            } else if (path.includes('/faq/catalog-access')) {
                this.currentPage = 'catalog-access';
            } else if (path.includes('/faq/commissioning')) {
                this.currentPage = 'commissioning';
            } else if (path.includes('/faq/tech-support')) {
                this.currentPage = 'tech-support';
            } else if (path.includes('/faq/account-billing')) {
                this.currentPage = 'account-billing';
            } else {
                this.currentPage = 'general'; // Default fallback
            }
        }

        /**
         * Cache all navigation links
         */
        cacheLinks() {
            this.links = Array.from(this.element.querySelectorAll('.faq-subnav__link'));
        }

        /**
         * Update active state based on current page
         */
        updateActiveState() {
            this.links.forEach(link => {
                const linkId = link.id.replace('faq-subnav-', '');
                const isActive = linkId === this.currentPage;
                
                link.classList.toggle('active', isActive);
                link.setAttribute('aria-current', isActive ? 'page' : null);
            });
        }

        /**
         * Load translations
         */
        async loadTranslations() {
            try {
                const response = await fetch('/faq/components/faq-subnav/locales/faq-subnav-locales.json');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const resources = await response.json();
                
                const currentLanguage = localStorage.getItem('language') || 'en';
                
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
                    this.updateTranslations(instance);
                }
            } catch (error) {
                console.warn('Failed to load sub-navigation translations:', error);
                this.showFallback();
            }
        }

        /**
         * Update translations
         * @param {Object} i18nInstance - i18next instance
         */
        updateTranslations(i18nInstance) {
            const elements = this.element.querySelectorAll('[data-i18n]');
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = i18nInstance.t(key);
                if (translation && translation !== key) {
                    element.textContent = translation;
                }
                element.classList.add('loaded');
            });
        }

        /**
         * Show fallback content if translations fail
         */
        showFallback() {
            const elements = this.element.querySelectorAll('.translatable-content');
            elements.forEach(element => element.classList.add('loaded'));
        }
    }

    // Initialize immediately when script loads (HTML is already in DOM)
    window.faqSubnav = new FAQSubnav();
    window.faqSubnav.init();

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        if (window.faqSubnav && window.faqSubnav.isInitialized) {
            window.faqSubnav.loadTranslations();
        }
    });
})();


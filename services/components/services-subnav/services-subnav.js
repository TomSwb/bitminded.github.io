/**
 * Services Sub-Navigation Component
 * Only displays on /services/* pages and highlights the current subpage
 */
(function() {
    class ServicesSubnav {
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
            // Only initialize if we're on a services page
            if (!this.isServicesPage()) {
                return;
            }

            this.element = document.getElementById('services-subnav');
            if (!this.element) {
                window.logger?.warn('Services sub-navigation container not found');
                return;
            }

            this.detectCurrentPage();
            this.cacheLinks();
            this.updateActiveState();
            this.loadTranslations();
            this.isInitialized = true;
        }

        /**
         * Check if current page is a services page
         * @returns {boolean}
         */
        isServicesPage() {
            const path = window.location.pathname;
            return path.includes('/services/');
        }

        /**
         * Detect current subpage from URL
         */
        detectCurrentPage() {
            const path = window.location.pathname;
            
            if (path === '/services/' || path === '/services/index.html') {
                this.currentPage = 'overview';
            } else if (path.includes('/services/commissioning')) {
                this.currentPage = 'commissioning';
            } else if (path.includes('/services/tech-support')) {
                this.currentPage = 'tech-support';
            } else if (path.includes('/services/catalog-access')) {
                this.currentPage = 'catalog-access';
            } else {
                this.currentPage = 'overview'; // Default fallback
            }
        }

        /**
         * Cache all navigation links
         */
        cacheLinks() {
            this.links = Array.from(this.element.querySelectorAll('.services-subnav__link'));
        }

        /**
         * Update active state based on current page
         */
        updateActiveState() {
            this.links.forEach(link => {
                const linkId = link.id.replace('services-subnav-', '');
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
                const response = await fetch('/services/components/services-subnav/locales/services-subnav-locales.json');
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
                window.logger?.warn('Failed to load sub-navigation translations:', error);
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
                    // Update the span text inside the link, not the link itself
                    const span = element.querySelector('.services-subnav__text');
                    if (span) {
                        span.textContent = translation;
                    } else {
                        // Fallback: update the element itself if no span found
                        element.textContent = translation;
                    }
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.servicesSubnav = new ServicesSubnav();
            window.servicesSubnav.init();
        });
    } else {
        window.servicesSubnav = new ServicesSubnav();
        window.servicesSubnav.init();
    }

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        if (window.servicesSubnav && window.servicesSubnav.isInitialized) {
            window.servicesSubnav.loadTranslations();
        }
    });
})();


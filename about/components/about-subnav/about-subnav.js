/**
 * About Sub-Navigation Component
 * Only displays on /about/* pages and highlights the current subpage
 */
(function() {
    class AboutSubnav {
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
            // Only initialize if we're on an about page
            if (!this.isAboutPage()) {
                return;
            }

            this.element = document.getElementById('about-subnav');
            if (!this.element) {
                window.logger?.warn('About sub-navigation container not found');
                return;
            }

            this.detectCurrentPage();
            this.cacheLinks();
            this.updateActiveState();
            this.loadTranslations();
            this.isInitialized = true;
        }

        /**
         * Check if current page is an about page
         * @returns {boolean}
         */
        isAboutPage() {
            const path = window.location.pathname;
            return path.includes('/about/');
        }

        /**
         * Detect current subpage from URL
         */
        detectCurrentPage() {
            const path = window.location.pathname;
            
            if (path === '/about/' || path === '/about/index.html') {
                this.currentPage = 'overview';
            } else if (path.includes('/about/vision-mission')) {
                this.currentPage = 'vision-mission';
            } else if (path.includes('/about/team')) {
                this.currentPage = 'team';
            } else {
                this.currentPage = 'overview'; // Default fallback
            }
        }

        /**
         * Cache all navigation links
         */
        cacheLinks() {
            this.links = Array.from(this.element.querySelectorAll('.about-subnav__link'));
        }

        /**
         * Update active state based on current page
         */
        updateActiveState() {
            this.links.forEach(link => {
                const linkId = link.id.replace('about-subnav-', '');
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
                const response = await fetch('/about/components/about-subnav/locales/about-subnav-locales.json');
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
                    const span = element.querySelector('.about-subnav__text');
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
            window.aboutSubnav = new AboutSubnav();
            window.aboutSubnav.init();
        });
    } else {
        window.aboutSubnav = new AboutSubnav();
        window.aboutSubnav.init();
    }

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        if (window.aboutSubnav && window.aboutSubnav.isInitialized) {
            window.aboutSubnav.loadTranslations();
        }
    });
})();


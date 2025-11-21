/**
 * About Page Loader
 * Handles loading components and initializing the about page
 */
class AboutPageLoader {
    constructor() {
        this.componentsLoaded = false;
    }

    async init() {
        if (this.componentsLoaded) {
            return;
        }

        try {
            // Load navigation menu
            await this.loadNavigationMenu();
            
            // Load language switcher
            await this.loadLanguageSwitcher();
            
            // Load theme switcher
            await this.loadThemeSwitcher();
            
            // Load site footer
            await this.loadSiteFooter();
            
            // Load about sub-navigation
            await this.loadAboutSubnav();

            this.componentsLoaded = true;
        } catch (error) {
            window.logger?.error('❌ Failed to load about page components:', error);
        }
    }

    async loadNavigationMenu() {
        return new Promise((resolve) => {
            if (window.ComponentLoader) {
                window.ComponentLoader.load('navigation-menu', {
                    container: 'header',
                    priority: 'high'
                }).then(resolve).catch(() => resolve());
            } else {
                // Fallback: wait for component loader
                setTimeout(() => {
                    if (window.ComponentLoader) {
                        window.ComponentLoader.load('navigation-menu', {
                            container: 'header',
                            priority: 'high'
                        }).then(resolve).catch(() => resolve());
                    } else {
                        resolve();
                    }
                }, 100);
            }
        });
    }

    async loadLanguageSwitcher() {
        return new Promise((resolve) => {
            if (window.ComponentLoader) {
                window.ComponentLoader.load('language-switcher', {
                    container: 'header',
                    priority: 'high'
                }).then(resolve).catch(() => resolve());
            } else {
                resolve();
            }
        });
    }

    async loadThemeSwitcher() {
        return new Promise((resolve) => {
            if (window.ComponentLoader) {
                window.ComponentLoader.load('theme-switcher', {
                    container: 'footer',
                    priority: 'medium'
                }).then(resolve).catch(() => resolve());
            } else {
                resolve();
            }
        });
    }

    async loadSiteFooter() {
        return new Promise((resolve) => {
            if (window.ComponentLoader) {
                window.ComponentLoader.load('site-footer', {
                    container: 'footer',
                    priority: 'medium'
                }).then(resolve).catch(() => resolve());
            } else {
                resolve();
            }
        });
    }

    async loadAboutSubnav() {
        return new Promise((resolve) => {
            const container = document.getElementById('about-subnav-container');
            if (!container) {
                resolve();
                return;
            }

            // Load sub-navigation HTML, CSS, and JS
            const loadSubnav = async () => {
                try {
                    // Load CSS
                    const cssLink = document.createElement('link');
                    cssLink.rel = 'stylesheet';
                    cssLink.href = '/about/components/about-subnav/about-subnav.css';
                    document.head.appendChild(cssLink);

                    // Load HTML
                    const htmlResponse = await fetch('/about/components/about-subnav/about-subnav.html');
                    const htmlContent = await htmlResponse.text();
                    container.innerHTML = htmlContent;

                    // Load JS
                    const script = document.createElement('script');
                    script.src = '/about/components/about-subnav/about-subnav.js';
                    script.onload = () => resolve();
                    script.onerror = () => resolve();
                    document.body.appendChild(script);
                } catch (error) {
                    window.logger?.warn('Failed to load about sub-navigation:', error);
                    resolve();
                }
            };

            loadSubnav();
        });
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aboutPageLoader = new AboutPageLoader();
    window.aboutPageLoader.init();
});


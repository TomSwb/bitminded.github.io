/**
 * Commissioning Page Loader
 * Handles loading components and initializing the commissioning page
 */
class CommissioningPageLoader {
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
            
            // Load theme switcher
            await this.loadThemeSwitcher();
            
            // Load site footer
            await this.loadSiteFooter();
            
            // Load services sub-navigation
            await this.loadServicesSubnav();
            
            // Initialize FAQ accordion
            this.initFAQAccordion();
            // Initialize section tabs
            this.initSectionTabs();

            this.componentsLoaded = true;
            console.log('✅ Commissioning page components loaded');
        } catch (error) {
            console.error('❌ Failed to load commissioning page components:', error);
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

    async loadServicesSubnav() {
        return new Promise((resolve) => {
            const container = document.getElementById('services-subnav-container');
            if (!container) {
                resolve();
                return;
            }

            const loadSubnav = async () => {
                try {
                    // Load CSS
                    const cssLink = document.createElement('link');
                    cssLink.rel = 'stylesheet';
                    cssLink.href = '/services/components/services-subnav/services-subnav.css';
                    document.head.appendChild(cssLink);

                    // Load HTML
                    const htmlResponse = await fetch('/services/components/services-subnav/services-subnav.html');
                    const htmlContent = await htmlResponse.text();
                    container.innerHTML = htmlContent;

                    // Load JS
                    const script = document.createElement('script');
                    script.src = '/services/components/services-subnav/services-subnav.js';
                    script.onload = () => resolve();
                    script.onerror = () => resolve();
                    document.body.appendChild(script);
                } catch (error) {
                    console.warn('Failed to load services sub-navigation:', error);
                    resolve();
                }
            };

            loadSubnav();
        });
    }

    initFAQAccordion() {
        const faqButtons = document.querySelectorAll('.commissioning-faq-item__button');
        
        faqButtons.forEach(button => {
            button.addEventListener('click', () => {
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                const answer = button.nextElementSibling;
                
                if (!answer) return;
                
                // Close all other items (optional - remove if you want multiple open)
                if (!isExpanded) {
                    faqButtons.forEach(otherButton => {
                        if (otherButton !== button) {
                            otherButton.setAttribute('aria-expanded', 'false');
                            const otherAnswer = otherButton.nextElementSibling;
                            if (otherAnswer) {
                                // Reset inline styles
                                otherAnswer.style.maxHeight = '0';
                            }
                        }
                    });
                }
                
                if (!isExpanded) {
                    // Open - calculate dynamic height based on content
                    // Set aria-expanded first so CSS padding will apply
                    button.setAttribute('aria-expanded', 'true');
                    
                    // Wait for CSS to apply
                    requestAnimationFrame(() => {
                        // Measure height without causing flash by temporarily cloning the element
                        // Get computed styles from the original element
                        const computedStyle = window.getComputedStyle(answer);
                        const parentWidth = answer.parentElement.offsetWidth;
                        
                        // Clone the answer element to measure its natural height
                        const clone = answer.cloneNode(true);
                        
                        // Apply all necessary styles to match the original element
                        clone.style.cssText = `
                            position: absolute;
                            visibility: hidden;
                            height: auto;
                            max-height: none;
                            overflow: visible;
                            width: ${parentWidth}px;
                            padding: var(--spacing-lg, 1.5rem);
                            font-size: ${computedStyle.fontSize};
                            font-family: ${computedStyle.fontFamily};
                            line-height: ${computedStyle.lineHeight};
                            box-sizing: ${computedStyle.boxSizing};
                        `;
                        document.body.appendChild(clone);
                        
                        // Force reflow to ensure measurement is accurate
                        void clone.offsetHeight;
                        
                        // Measure the cloned element's height
                        const answerHeight = clone.scrollHeight;
                        
                        // Add a small buffer to ensure nothing is cut off
                        const finalHeight = answerHeight + 2;
                        
                        // Remove clone
                        document.body.removeChild(clone);
                        
                        // Reset to 0 for smooth transition
                        answer.style.maxHeight = '0';
                        
                        // Force reflow
                        void answer.offsetHeight;
                        
                        // Animate to calculated height
                        requestAnimationFrame(() => {
                            answer.style.maxHeight = finalHeight + 'px';
                        });
                    });
                } else {
                    // Close
                    button.setAttribute('aria-expanded', 'false');
                    answer.style.maxHeight = '0';
                }
            });
        });
    }

    initSectionTabs() {
        const tabs = Array.from(document.querySelectorAll('.commissioning-section-tab'));
        const panels = Array.from(document.querySelectorAll('.commissioning-section-panel'));
        if (!tabs.length || !panels.length) return;

        const activate = (tab) => {
            // update selected
            tabs.forEach(t => {
                const selected = t === tab;
                t.classList.toggle('is-active', selected);
                t.setAttribute('aria-selected', selected ? 'true' : 'false');
            });
            // show matching panel
            panels.forEach(panel => {
                const isMatch = panel.id === tab.getAttribute('aria-controls');
                if (isMatch) {
                    panel.hidden = false;
                } else {
                    panel.hidden = true;
                }
            });
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => activate(tab));
            tab.addEventListener('keydown', (e) => {
                const idx = tabs.indexOf(tab);
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = tabs[(idx + 1) % tabs.length];
                    next.focus();
                    activate(next);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                    prev.focus();
                    activate(prev);
                }
            });
        });
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.commissioningPageLoader = new CommissioningPageLoader();
    window.commissioningPageLoader.init();
});


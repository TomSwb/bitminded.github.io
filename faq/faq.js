/**
 * FAQ Page Loader
 * Handles loading components, initializing the FAQ page, and accordion functionality
 */
class FAQPageLoader {
    constructor() {
        this.componentsLoaded = false;
        this.accordionInitialized = false;
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
            
            // Load FAQ sub-navigation
            await this.loadFAQSubnav();

            // Center FAQ items when there are fewer than 4 and distribute into columns
            this.centerFAQItems();

            // Initialize accordion after items are distributed
            this.initAccordion();

            // Handle URL hash for direct section links
            this.handleURLHash();

            this.componentsLoaded = true;
            this.accordionInitialized = true;
        } catch (error) {
            window.logger?.error('❌ Failed to load FAQ page components:', error);
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

    async loadFAQSubnav() {
        return new Promise((resolve) => {
            const container = document.getElementById('faq-subnav-container');
            if (!container) {
                resolve();
                return;
            }

            const loadSubnav = async () => {
                try {
                    // Load CSS
                    const cssLink = document.createElement('link');
                    cssLink.rel = 'stylesheet';
                    cssLink.href = '/faq/components/faq-subnav/faq-subnav.css';
                    document.head.appendChild(cssLink);

                    // Load HTML
                    const htmlResponse = await fetch('/faq/components/faq-subnav/faq-subnav.html');
                    const htmlContent = await htmlResponse.text();
                    container.innerHTML = htmlContent;

                    // Load JS
                    const script = document.createElement('script');
                    script.src = '/faq/components/faq-subnav/faq-subnav.js';
                    script.onload = () => resolve();
                    script.onerror = () => resolve();
                    document.body.appendChild(script);
                } catch (error) {
                    window.logger?.warn('Failed to load FAQ sub-navigation:', error);
                    resolve();
                }
            };

            loadSubnav();
        });
    }

    initAccordion() {
        const faqButtons = document.querySelectorAll('.faq-item__button');
        
        faqButtons.forEach(button => {
            // Skip if already initialized
            if (button.dataset.accordionInitialized === 'true') {
                return;
            }
            button.dataset.accordionInitialized = 'true';

            button.addEventListener('click', () => {
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                const answer = button.nextElementSibling;
                
                if (!answer) return;
                
                // Allow multiple FAQs to be open (Option B)
                // Remove the close-others behavior for better UX
                
                if (!isExpanded) {
                    // Open - calculate dynamic height based on content
                    button.setAttribute('aria-expanded', 'true');
                    
                    requestAnimationFrame(() => {
                        const computedStyle = window.getComputedStyle(answer);
                        const parentWidth = answer.parentElement.offsetWidth;
                        
                        const clone = answer.cloneNode(true);
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
                        
                        void clone.offsetHeight;
                        const answerHeight = clone.scrollHeight;
                        const finalHeight = answerHeight + 2;
                        document.body.removeChild(clone);
                        
                        answer.style.maxHeight = '0';
                        void answer.offsetHeight;
                        
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

    centerFAQItems() {
        // Find all FAQ accordions
        const accordions = document.querySelectorAll('.faq-accordion');
        
        accordions.forEach(accordion => {
            const items = Array.from(accordion.querySelectorAll('.faq-item'));
            const itemCount = items.length;
            
            // If there are fewer than 4 items, center them
            if (itemCount < 4 && itemCount > 0) {
                accordion.classList.add('faq-accordion--center');
                accordion.classList.add(`faq-accordion--center-${itemCount}`);
            }
            
            // Distribute items into independent columns
            this.distributeIntoColumns(accordion, items);
        });
    }

    distributeIntoColumns(accordion, items) {
        // Skip if already distributed
        if (accordion.dataset.columnsDistributed === 'true') {
            return;
        }
        
        const itemCount = items.length;
        
        // For centered layouts, don't redistribute
        if (itemCount < 4) {
            accordion.dataset.columnsDistributed = 'true';
            return;
        }
        
        // Create 4 column containers
        const columns = [];
        for (let i = 0; i < 4; i++) {
            const column = document.createElement('div');
            column.className = 'faq-accordion__column';
            columns.push(column);
        }
        
        // Distribute items evenly across columns (round-robin)
        items.forEach((item, index) => {
            const columnIndex = index % 4;
            columns[columnIndex].appendChild(item);
        });
        
        // Clear accordion and add columns
        accordion.innerHTML = '';
        columns.forEach(column => {
            if (column.children.length > 0) {
                accordion.appendChild(column);
            }
        });
        
        accordion.dataset.columnsDistributed = 'true';
    }

    handleURLHash() {
        // Handle direct links to FAQ sections or items
        const hash = window.location.hash;
        if (hash) {
            // Wait for page to load, then scroll to section
            setTimeout(() => {
                const target = document.querySelector(hash);
                if (target) {
                    const headerOffset = 100;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // If it's a FAQ item, try to expand it
                    const faqItem = target.closest('.faq-item');
                    if (faqItem) {
                        const button = faqItem.querySelector('.faq-item__button');
                        if (button && button.getAttribute('aria-expanded') === 'false') {
                            button.click();
                        }
                    }
                }
            }, 500);
        }
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.faqPageLoader = new FAQPageLoader();
    window.faqPageLoader.init();
});


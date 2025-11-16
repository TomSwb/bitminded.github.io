/**
 * Catalog Access Page Loader
 * Handles loading components, initializing the catalog access page, and FAQ accordion functionality
 */
class CatalogAccessPageLoader {
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
            
            // Load services sub-navigation
            await this.loadServicesSubnav();

            // Initialize accordion
            this.initAccordion();

            // Initialize pricing toggle
            this.initPricingToggle();

            // Initialize feature row alignment
            this.initFeatureRowAlignment();

            this.componentsLoaded = true;
            this.accordionInitialized = true;
            console.log('✅ Catalog Access page components loaded');
        } catch (error) {
            console.error('❌ Failed to load catalog access page components:', error);
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

    initAccordion() {
        const faqButtons = document.querySelectorAll('.catalog-access-faq-item__button');
        
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

    initPricingToggle() {
        const toggleButton = document.getElementById('pricing-toggle');
        if (!toggleButton) return;

        let isMonthly = true; // Start with monthly pricing

        toggleButton.addEventListener('click', () => {
            isMonthly = !isMonthly;
            this.updatePricing(isMonthly);
        });
    }

    updatePricing(isMonthly) {
        const toggleButton = document.getElementById('pricing-toggle');
        const toggleText = toggleButton?.querySelector('.catalog-access-pricing-toggle__text');
        const cards = document.querySelectorAll('[data-pricing-toggle="true"]');

        // Update button text
        if (toggleText) {
            const text = isMonthly 
                ? toggleText.getAttribute('data-text-monthly') 
                : toggleText.getAttribute('data-text-yearly');
            toggleText.textContent = text;
        }

        // Update each card's pricing
        cards.forEach(card => {
            const priceElement = card.querySelector('.catalog-access-pricing-comparison-card__price');
            const durationElement = card.querySelector('.catalog-access-pricing-comparison-card__duration');

            if (priceElement && durationElement) {
                const monthlyPrice = priceElement.getAttribute('data-price-monthly');
                const yearlyPrice = priceElement.getAttribute('data-price-yearly');
                const monthlyDuration = durationElement.getAttribute('data-duration-monthly');
                const yearlyDuration = durationElement.getAttribute('data-duration-yearly');

                if (isMonthly) {
                    priceElement.textContent = `CHF ${monthlyPrice}`;
                    durationElement.textContent = monthlyDuration;
                } else {
                    priceElement.textContent = `CHF ${yearlyPrice}`;
                    durationElement.textContent = yearlyDuration;
                }
            }
        });
    }

    initFeatureRowAlignment() {
        // Initialize mutation timeout
        this.mutationTimeout = null;
        
        // Align immediately - run multiple times to catch all cases
        requestAnimationFrame(() => {
            this.alignFeatureRows();
            requestAnimationFrame(() => {
                this.alignFeatureRows();
            });
        });
        
        // Also align after fonts load
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                requestAnimationFrame(() => {
                    this.alignFeatureRows();
                });
            });
        }

        // Re-align when window resizes
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    this.alignFeatureRows();
                });
            }, 50);
        });

        // Re-align after translations are applied (if using i18next)
        if (window.i18next) {
            window.i18next.on('languageChanged', () => {
                // Wait for DOM to update after translation, then align immediately
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this.alignFeatureRows();
                    });
                });
            });
            
            // Also align after initial translation load
            window.i18next.on('initialized', () => {
                requestAnimationFrame(() => {
                    this.alignFeatureRows();
                });
            });
        }
        
        // Also check for any translation system that might update content
        // Listen for content changes in translatable elements
        const translatableElements = document.querySelectorAll('.translatable-content');
        if (translatableElements.length > 0) {
            const textObserver = new MutationObserver(() => {
                // Use requestAnimationFrame for immediate alignment
                requestAnimationFrame(() => {
                    this.alignFeatureRows();
                });
            });
            
            translatableElements.forEach(el => {
                textObserver.observe(el, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            });
        }

        // Also listen for any DOM mutations that might affect content
        const observer = new MutationObserver(() => {
            // Use requestAnimationFrame for immediate alignment
            requestAnimationFrame(() => {
                this.alignFeatureRows();
            });
        });

        const featureComparisonWrapper = document.querySelector('.catalog-access-feature-comparison-wrapper');
        if (featureComparisonWrapper) {
            observer.observe(featureComparisonWrapper, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false // Don't watch attribute changes to avoid loops
            });
        }
    }

    alignFeatureRows() {
        // First, align all header sections to the same height
        this.alignHeaders();
        
        // Then align all feature rows
        this.alignFeatureItems();
    }

    alignHeaders() {
        // Get the left feature card
        const leftFeatureCard = document.querySelector('.catalog-access-features-info');
        const leftTitle = leftFeatureCard?.querySelector('.catalog-access-features-info__title');
        const leftDescription = leftFeatureCard?.querySelector('.catalog-access-features-info__description');
        const leftFirstFeature = leftFeatureCard?.querySelector('.catalog-access-feature-item:first-child');
        
        // Get all pricing card headers and their first feature rows
        const pricingCards = document.querySelectorAll('.catalog-access-pricing-comparison-card');
        
        if (!leftTitle || !leftFirstFeature || pricingCards.length === 0) {
            return;
        }

        let maxHeaderHeight = 0;

        // Reset all heights to get natural measurements
        if (leftDescription) {
            leftDescription.style.marginBottom = '';
        }
        pricingCards.forEach(card => {
            const header = card.querySelector('.catalog-access-pricing-comparison-card__header');
            if (header) {
                header.style.minHeight = '';
            }
        });

        // Force reflow to get accurate measurements
        void document.body.offsetHeight;

        // Measure left card: from top of title to top of first feature item
        const leftTitleRect = leftTitle.getBoundingClientRect();
        const leftFirstFeatureRect = leftFirstFeature.getBoundingClientRect();
        const leftHeaderHeight = leftFirstFeatureRect.top - leftTitleRect.top;
        maxHeaderHeight = Math.max(maxHeaderHeight, leftHeaderHeight);

        // Measure all pricing cards: from top of header to top of first feature row
        pricingCards.forEach(card => {
            const header = card.querySelector('.catalog-access-pricing-comparison-card__header');
            const firstFeatureRow = card.querySelector('.catalog-access-feature-row:first-child');
            
            if (header && firstFeatureRow) {
                const headerRect = header.getBoundingClientRect();
                const firstRowRect = firstFeatureRow.getBoundingClientRect();
                // Measure from top of header to top of first feature row
                const headerHeight = firstRowRect.top - headerRect.top;
                maxHeaderHeight = Math.max(maxHeaderHeight, headerHeight);
            }
        });

        // Apply the maximum height to all headers
        if (maxHeaderHeight > 0) {
            // For pricing cards, adjust header min-height to match maxHeaderHeight
            pricingCards.forEach((card, cardIndex) => {
                const header = card.querySelector('.catalog-access-pricing-comparison-card__header');
                const firstFeatureRow = card.querySelector('.catalog-access-feature-row:first-child');
                
                if (header && firstFeatureRow) {
                    // Force reflow before measuring
                    void header.offsetHeight;
                    void firstFeatureRow.offsetHeight;
                    
                    const headerRect = header.getBoundingClientRect();
                    const firstRowRect = firstFeatureRow.getBoundingClientRect();
                    const currentHeight = firstRowRect.top - headerRect.top;
                    const neededHeight = maxHeaderHeight - currentHeight;
                    
                    if (neededHeight !== 0) {
                        // Get the natural height of the header content
                        const headerContentHeight = header.scrollHeight;
                        // Set min-height to ensure the header is tall enough
                        header.style.minHeight = `${headerContentHeight + neededHeight}px`;
                    } else {
                        // Even if no adjustment needed, ensure min-height is set to natural height
                        const headerContentHeight = header.scrollHeight;
                        header.style.minHeight = `${headerContentHeight}px`;
                    }
                }
            });

            // For left card, adjust the margin-bottom of description to match
            const currentLeftHeight = leftFirstFeatureRect.top - leftTitleRect.top;
            const neededSpacer = maxHeaderHeight - currentLeftHeight;
            
            if (neededSpacer !== 0 && leftDescription) {
                // Get current margin and adjust to achieve target distance
                const currentMargin = parseFloat(window.getComputedStyle(leftDescription).marginBottom) || 0;
                // Reset the ::after pseudo-element by removing margin, then add needed spacer
                leftDescription.style.marginBottom = `${Math.max(0, currentMargin + neededSpacer)}px`;
            }
            
            // Force reflow and re-measure to ensure alignment
            void document.body.offsetHeight;
            
            // Re-measure headers one more time to ensure they're aligned
            requestAnimationFrame(() => {
                // Force reflow
                void document.body.offsetHeight;
                
                // Double-check alignment after applying styles
                const verifyLeftTitleRect = leftTitle.getBoundingClientRect();
                const verifyLeftFirstFeatureRect = leftFirstFeature.getBoundingClientRect();
                const verifyLeftHeight = verifyLeftFirstFeatureRect.top - verifyLeftTitleRect.top;
                
                pricingCards.forEach((card, cardIndex) => {
                    const header = card.querySelector('.catalog-access-pricing-comparison-card__header');
                    const firstRow = card.querySelector('.catalog-access-feature-row:first-child');
                    if (header && firstRow) {
                        // Force reflow for this card
                        void header.offsetHeight;
                        void firstRow.offsetHeight;
                        
                        const verifyHeaderRect = header.getBoundingClientRect();
                        const verifyRowRect = firstRow.getBoundingClientRect();
                        const verifyHeight = verifyRowRect.top - verifyHeaderRect.top;
                        
                        // If still not aligned, adjust
                        const diff = verifyLeftHeight - verifyHeight;
                        if (Math.abs(diff) > 1) {
                            const currentMinHeight = parseFloat(window.getComputedStyle(header).minHeight) || verifyHeaderRect.height;
                            header.style.minHeight = `${currentMinHeight + diff}px`;
                            
                            // Force one more reflow and verify
                            void header.offsetHeight;
                            const finalHeaderRect = header.getBoundingClientRect();
                            const finalRowRect = firstRow.getBoundingClientRect();
                            const finalHeight = finalRowRect.top - finalHeaderRect.top;
                            const finalDiff = verifyLeftHeight - finalHeight;
                            
                            // If still off, make one more adjustment
                            if (Math.abs(finalDiff) > 1) {
                                header.style.minHeight = `${parseFloat(header.style.minHeight) + finalDiff}px`;
                            }
                        }
                    }
                });
            });
        }
    }

    alignFeatureItems() {
        // Get all feature items from the left card
        const leftFeatureItems = document.querySelectorAll('.catalog-access-feature-item');
        
        // Get all feature rows from all pricing cards
        const pricingCards = document.querySelectorAll('.catalog-access-pricing-comparison-card');
        
        if (leftFeatureItems.length === 0 || pricingCards.length === 0) {
            return;
        }

        // For each feature index, find the maximum height
        leftFeatureItems.forEach((leftItem, index) => {
            let maxHeight = 0;

            // Remove inline styles completely to get natural height
            leftItem.style.minHeight = '';
            leftItem.style.height = '';
            
            // Get all corresponding feature rows from pricing cards
            pricingCards.forEach(card => {
                const featureRows = card.querySelectorAll('.catalog-access-feature-row');
                if (featureRows[index]) {
                    featureRows[index].style.minHeight = '';
                    featureRows[index].style.height = '';
                }
            });

            // Force multiple reflows to ensure accurate measurement
            void leftItem.offsetHeight;
            void leftItem.offsetHeight;

            // Measure left item height - use getBoundingClientRect for more accuracy
            const leftRect = leftItem.getBoundingClientRect();
            const leftHeight = leftRect.height;
            maxHeight = Math.max(maxHeight, leftHeight);

            // Also check scrollHeight as fallback
            if (leftItem.scrollHeight > leftHeight) {
                maxHeight = Math.max(maxHeight, leftItem.scrollHeight);
            }

            // Measure corresponding feature rows from all pricing cards
            pricingCards.forEach(card => {
                const featureRows = card.querySelectorAll('.catalog-access-feature-row');
                if (featureRows[index]) {
                    const row = featureRows[index];
                    void row.offsetHeight; // Force reflow
                    const rowRect = row.getBoundingClientRect();
                    const rowHeight = rowRect.height;
                    maxHeight = Math.max(maxHeight, rowHeight);
                    
                    // Also check scrollHeight as fallback
                    if (row.scrollHeight > rowHeight) {
                        maxHeight = Math.max(maxHeight, row.scrollHeight);
                    }
                }
            });

            // Apply the maximum height to all corresponding items
            if (maxHeight > 0) {
                // Add a small buffer to ensure nothing is cut off
                const finalHeight = maxHeight + 4;
                
                leftItem.style.minHeight = `${finalHeight}px`;
                
                pricingCards.forEach(card => {
                    const featureRows = card.querySelectorAll('.catalog-access-feature-row');
                    if (featureRows[index]) {
                        featureRows[index].style.minHeight = `${finalHeight}px`;
                    }
                });
            }
        });
        
        // Force a final reflow to ensure all heights are applied
        void document.body.offsetHeight;
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.catalogAccessPageLoader = new CatalogAccessPageLoader();
    window.catalogAccessPageLoader.init();
});

// Also run alignment after page fully loads (including images, fonts, etc.)
window.addEventListener('load', () => {
    if (window.catalogAccessPageLoader && window.catalogAccessPageLoader.alignFeatureRows) {
        requestAnimationFrame(() => {
            window.catalogAccessPageLoader.alignFeatureRows();
        });
    }
});


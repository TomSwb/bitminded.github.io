/**
 * Catalog Access Page Loader
 * Handles loading components, initializing the catalog access page, and FAQ accordion functionality
 */
class CatalogAccessPageLoader {
    constructor() {
        this.componentsLoaded = false;
        this.accordionInitialized = false;
        this.services = [];
        this.serviceRenderer = null;
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

            // Load service loader and renderer components
            await this.loadServiceComponents();
            
            // Load services from database
            await this.loadServices();

            // Render all services (including single tool license)
            this.renderAllCatalogServices();

            // Initialize accordion
            this.initAccordion();

            // Initialize pricing toggle
            this.initPricingToggle();

            // Listen for currency changes after services are loaded
            this.setupCurrencyListener();

            // Initialize feature row alignment
            this.initFeatureRowAlignment();

            // Initialize mobile collapsible cards
            this.initMobileCollapsible();

            this.componentsLoaded = true;
            this.accordionInitialized = true;
        } catch (error) {
            window.logger?.error('❌ Failed to load catalog access page components:', error);
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

    async loadServiceComponents() {
        // Load service loader
        if (!window.ServiceLoader) {
            const loaderScript = document.createElement('script');
            loaderScript.src = '/services/components/service-loader/service-loader.js';
            await new Promise((resolve, reject) => {
                loaderScript.onload = resolve;
                loaderScript.onerror = reject;
                document.head.appendChild(loaderScript);
            });
        }

        // Load service renderer
        if (!window.ServiceRenderer) {
            const rendererScript = document.createElement('script');
            rendererScript.src = '/services/components/service-renderer/service-renderer.js';
            await new Promise((resolve, reject) => {
                rendererScript.onload = resolve;
                rendererScript.onerror = reject;
                document.head.appendChild(rendererScript);
            });
        }

        // Load badge CSS
        const saleBadgeCSS = document.createElement('link');
        saleBadgeCSS.rel = 'stylesheet';
        saleBadgeCSS.href = '/services/components/sale-badge/sale-badge.css';
        document.head.appendChild(saleBadgeCSS);

        const statusBadgeCSS = document.createElement('link');
        statusBadgeCSS.rel = 'stylesheet';
        statusBadgeCSS.href = '/services/components/status-badge/status-badge.css';
        document.head.appendChild(statusBadgeCSS);

        // Initialize renderer
        if (window.ServiceRenderer) {
            this.serviceRenderer = new window.ServiceRenderer(window.ServiceLoader);
        }
    }

    async loadServices() {
        try {
            if (!window.ServiceLoader) {
                window.logger?.warn('ServiceLoader not available');
                return;
            }

            this.services = await window.ServiceLoader.loadServices('catalog-access');
            
            // Store services by slug for quick lookup
            this.servicesBySlug = {};
            this.services.forEach(service => {
                this.servicesBySlug[service.slug] = service;
            });

        } catch (error) {
            window.logger?.error('Failed to load services:', error);
        }
    }

    /**
     * Render all catalog access services (including single tool license)
     * This ensures all cards get their prices, badges, and featured styling
     */
    renderAllCatalogServices() {
        if (!this.serviceRenderer || !this.servicesBySlug) {
            return;
        }

        const serviceLoader = window.ServiceLoader;
        const currency = serviceLoader ? serviceLoader.currentCurrency : 'CHF';

        // Get all catalog-access cards (both with and without pricing-toggle)
        const allCards = document.querySelectorAll('.catalog-access-pricing-comparison-card[data-service-slug]');

        allCards.forEach(card => {
            const slug = card.getAttribute('data-service-slug');
            if (!slug) return;

            const service = this.servicesBySlug[slug];
            if (!service) return;

            const priceElement = card.querySelector('.catalog-access-pricing-comparison-card__price');
            const durationElement = card.querySelector('.catalog-access-pricing-comparison-card__duration');
            const hasPricingToggle = card.hasAttribute('data-pricing-toggle');

            if (hasPricingToggle) {
                // For membership cards, use the existing updatePricing logic
                // (they'll be handled by updatePricing when toggles change)
                // But we still need to update badges and status here
                this.serviceRenderer.updateSaleBadge(card, service);
                this.serviceRenderer.updateSaleInfo(card, service);
                this.serviceRenderer.updateStatus(card, service);
                this.serviceRenderer.updateFeaturedBadge(card, service);
            } else {
                // For single tool license, render it fully
                if (priceElement && durationElement) {
                    const elements = {
                        card: card,
                        price: priceElement,
                        duration: durationElement,
                        description: card.querySelector('[data-element="description"]')
                    };
                    this.serviceRenderer.renderService(service, elements, currency);
                }
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
                    window.logger?.warn('Failed to load services sub-navigation:', error);
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

    setupCurrencyListener() {
        // Listen for currency changes from both the currency switcher and service loader
        const handleCurrencyChange = () => {
            this.updatePricing();
        };

        // Listen to the service loader's currency change event
        window.addEventListener('servicesCurrencyChanged', handleCurrencyChange);
        
        // Also listen directly to currency switcher events as a fallback
        document.addEventListener('currencyChanged', (event) => {
            if (event.detail && event.detail.currency && window.ServiceLoader) {
                window.ServiceLoader.setCurrency(event.detail.currency);
                handleCurrencyChange();
                // Also re-render all services (including single tool license)
                this.renderAllCatalogServices();
            }
        });
    }

    initPricingToggle() {
        const pricingToggleButton = document.getElementById('pricing-toggle');
        const familyToggleButton = document.getElementById('family-toggle');
        
        if (!pricingToggleButton || !familyToggleButton) return;

        // State management
        this.pricingState = {
            isMonthly: true, // Start with monthly pricing
            isFamily: false  // Start with individual pricing
        };

        // Pricing toggle (monthly/yearly)
        pricingToggleButton.addEventListener('click', () => {
            this.pricingState.isMonthly = !this.pricingState.isMonthly;
            this.updatePricing();
        });

        // Family toggle (individual/family)
        familyToggleButton.addEventListener('click', () => {
            this.pricingState.isFamily = !this.pricingState.isFamily;
            this.updatePricing();
        });

        // Initialize pricing display
        this.updatePricing();
    }

    updatePricing() {
        // Ensure i18next is available
        if (typeof i18next === 'undefined') {
            return;
        }

        const pricingToggleButton = document.getElementById('pricing-toggle');
        const familyToggleButton = document.getElementById('family-toggle');
        const pricingToggleText = pricingToggleButton?.querySelector('.catalog-access-pricing-toggle__text');
        const familyToggleText = familyToggleButton?.querySelector('.catalog-access-pricing-toggle__text');
        const cards = document.querySelectorAll('[data-pricing-toggle="true"]');

        // Update pricing toggle button text using i18next
        if (pricingToggleText) {
            const key = this.pricingState.isMonthly 
                ? pricingToggleText.getAttribute('data-i18n-text-monthly')
                : pricingToggleText.getAttribute('data-i18n-text-yearly');
            if (key) {
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    pricingToggleText.textContent = translation;
                }
            }
        }

        // Update family toggle button text using i18next
        if (familyToggleText) {
            const key = this.pricingState.isFamily 
                ? familyToggleText.getAttribute('data-i18n-text-family')
                : familyToggleText.getAttribute('data-i18n-text-individual');
            if (key) {
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    familyToggleText.textContent = translation;
                }
            }
        }

        // Update aria-labels for toggle buttons
        if (pricingToggleButton) {
            const ariaKey = pricingToggleButton.getAttribute('data-i18n-aria-label');
            if (ariaKey) {
                const translation = i18next.t(ariaKey);
                if (translation && translation !== ariaKey) {
                    pricingToggleButton.setAttribute('aria-label', translation);
                }
            }
        }

        if (familyToggleButton) {
            const ariaKey = familyToggleButton.getAttribute('data-i18n-aria-label');
            if (ariaKey) {
                const translation = i18next.t(ariaKey);
                if (translation && translation !== ariaKey) {
                    familyToggleButton.setAttribute('aria-label', translation);
                }
            }
        }

        // Update each card's pricing from database
        const serviceLoader = window.ServiceLoader;
        const currency = serviceLoader ? serviceLoader.currentCurrency : 'CHF';

        cards.forEach(card => {
            const slug = card.getAttribute('data-service-slug');
            if (!slug) return;

            const service = this.servicesBySlug && this.servicesBySlug[slug];
            if (!service) return;

            const priceElement = card.querySelector('.catalog-access-pricing-comparison-card__price');
            const durationElement = card.querySelector('.catalog-access-pricing-comparison-card__duration');

            if (priceElement && durationElement && this.serviceRenderer) {
                // Use service renderer to update membership pricing
                this.serviceRenderer.updateMembershipPricing(
                    priceElement,
                    service,
                    currency,
                    this.pricingState.isMonthly,
                    this.pricingState.isFamily
                );

                // Update duration text
                const durationKey = this.pricingState.isFamily
                    ? (this.pricingState.isMonthly 
                        ? durationElement.getAttribute('data-i18n-duration-family')
                        : durationElement.getAttribute('data-i18n-duration-family-yearly'))
                    : (this.pricingState.isMonthly
                        ? durationElement.getAttribute('data-i18n-duration-monthly')
                        : durationElement.getAttribute('data-i18n-duration-yearly'));

                if (durationKey && typeof i18next !== 'undefined') {
                    const translation = i18next.t(durationKey);
                    if (translation && translation !== durationKey) {
                        durationElement.textContent = translation;
                    }
                }

                // Update sale badge, sale info, status, and featured badge
                this.serviceRenderer.updateSaleBadge(card, service);
                this.serviceRenderer.updateSaleInfo(card, service);
                this.serviceRenderer.updateStatus(card, service);
                this.serviceRenderer.updateFeaturedBadge(card, service);
            }
        });

        // Update feature indicator aria-labels
        const featureIndicators = document.querySelectorAll('[data-i18n-aria-label]');
        featureIndicators.forEach(indicator => {
            const key = indicator.getAttribute('data-i18n-aria-label');
            if (key) {
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    indicator.setAttribute('aria-label', translation);
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
        // Skip alignment on mobile (screens < 1024px) - left card should be dynamic
        if (window.innerWidth < 1024) {
            return;
        }

        // Get the left feature card
        const leftFeatureCard = document.querySelector('.catalog-access-features-info');
        const leftHeader = leftFeatureCard?.querySelector('.catalog-access-features-info__header');
        const leftTitle = leftFeatureCard?.querySelector('.catalog-access-features-info__title');
        const leftFirstFeature = leftFeatureCard?.querySelector('.catalog-access-feature-item:first-child');
        
        // Get all pricing card headers and their first feature rows
        const pricingCards = document.querySelectorAll('.catalog-access-pricing-comparison-card');
        
        if (!leftHeader || !leftTitle || !leftFirstFeature || pricingCards.length === 0) {
            return;
        }

        let maxHeaderHeight = 0;

        // Reset all heights to get natural measurements
        if (leftHeader) {
            leftHeader.style.minHeight = '';
        }
        pricingCards.forEach(card => {
            const header = card.querySelector('.catalog-access-pricing-comparison-card__header');
            if (header) {
                header.style.minHeight = '';
            }
        });

        // Force reflow to get accurate measurements
        void document.body.offsetHeight;

        // Measure left card: from top of header to top of first feature item
        const leftHeaderRect = leftHeader.getBoundingClientRect();
        const leftFirstFeatureRect = leftFirstFeature.getBoundingClientRect();
        const leftHeaderHeight = leftFirstFeatureRect.top - leftHeaderRect.top;
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

            // For left card, adjust the min-height of header to match
            const currentLeftHeight = leftFirstFeatureRect.top - leftHeaderRect.top;
            const neededHeight = maxHeaderHeight - currentLeftHeight;
            
            if (neededHeight !== 0 && leftHeader) {
                // Get the natural height of the header content
                const headerContentHeight = leftHeader.scrollHeight;
                // Set min-height to ensure the header is tall enough
                leftHeader.style.minHeight = `${headerContentHeight + neededHeight}px`;
            } else if (leftHeader) {
                // Even if no adjustment needed, ensure min-height is set to natural height
                const headerContentHeight = leftHeader.scrollHeight;
                leftHeader.style.minHeight = `${headerContentHeight}px`;
            }
            
            // Force reflow and re-measure to ensure alignment
            void document.body.offsetHeight;
            
            // Re-measure headers one more time to ensure they're aligned
            requestAnimationFrame(() => {
                // Force reflow
                void document.body.offsetHeight;
                
                // Double-check alignment after applying styles
                const verifyLeftHeaderRect = leftHeader.getBoundingClientRect();
                const verifyLeftFirstFeatureRect = leftFirstFeature.getBoundingClientRect();
                const verifyLeftHeight = verifyLeftFirstFeatureRect.top - verifyLeftHeaderRect.top;
                
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
        // Skip alignment on mobile (screens < 1024px) - left card should be dynamic
        if (window.innerWidth < 1024) {
            return;
        }

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

    initMobileCollapsible() {
        // Only initialize on mobile (screens < 1024px)
        const isMobile = () => window.innerWidth < 1024;
        
        // Initialize pricing card headers
        const pricingCardHeaders = document.querySelectorAll('.catalog-access-pricing-comparison-card__header');
        pricingCardHeaders.forEach(header => {
            // Set initial state to collapsed on mobile
            if (isMobile()) {
                header.setAttribute('aria-expanded', 'false');
                // Ensure features are collapsed on initial load
                const features = header.nextElementSibling;
                if (features && features.classList.contains('catalog-access-pricing-comparison-card__features')) {
                    features.style.maxHeight = '0';
                }
            } else {
                header.setAttribute('aria-expanded', 'true');
            }

            header.addEventListener('click', () => {
                // Only handle clicks on mobile
                if (!isMobile()) return;

                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                const features = header.nextElementSibling;
                
                if (!features || !features.classList.contains('catalog-access-pricing-comparison-card__features')) {
                    return;
                }

                if (!isExpanded) {
                    // Open - calculate dynamic height
                    header.setAttribute('aria-expanded', 'true');
                    
                    requestAnimationFrame(() => {
                        // Measure the natural height of the features
                        const computedStyle = window.getComputedStyle(features);
                        const parentWidth = features.parentElement.offsetWidth;
                        
                        // Clone to measure
                        const clone = features.cloneNode(true);
                        clone.style.cssText = `
                            position: absolute;
                            visibility: hidden;
                            height: auto;
                            max-height: none;
                            overflow: visible;
                            width: ${parentWidth}px;
                            font-size: ${computedStyle.fontSize};
                            font-family: ${computedStyle.fontFamily};
                            line-height: ${computedStyle.lineHeight};
                            box-sizing: ${computedStyle.boxSizing};
                        `;
                        document.body.appendChild(clone);
                        
                        void clone.offsetHeight;
                        const featuresHeight = clone.scrollHeight;
                        document.body.removeChild(clone);
                        
                        // Reset for smooth transition
                        features.style.maxHeight = '0';
                        void features.offsetHeight;
                        
                        // Animate to calculated height
                        requestAnimationFrame(() => {
                            features.style.maxHeight = featuresHeight + 'px';
                        });
                    });
                } else {
                    // Close
                    header.setAttribute('aria-expanded', 'false');
                    features.style.maxHeight = '0';
                }
            });
        });

        // Initialize left feature card header
        const leftFeatureHeader = document.querySelector('.catalog-access-features-info__header');
        const leftFeaturesList = document.querySelector('.catalog-access-features-list');
        
        if (leftFeatureHeader) {
            // Set initial state
            if (isMobile()) {
                leftFeatureHeader.setAttribute('aria-expanded', 'false');
                // Ensure features are collapsed on initial load
                if (leftFeaturesList) {
                    leftFeaturesList.style.maxHeight = '0';
                }
            } else {
                leftFeatureHeader.setAttribute('aria-expanded', 'true');
            }

            leftFeatureHeader.addEventListener('click', () => {
                // Only handle clicks on mobile
                if (!isMobile()) return;

                const isExpanded = leftFeatureHeader.getAttribute('aria-expanded') === 'true';
                
                if (!leftFeaturesList) return;

                if (!isExpanded) {
                    // Open - calculate dynamic height
                    leftFeatureHeader.setAttribute('aria-expanded', 'true');
                    
                    requestAnimationFrame(() => {
                        const computedStyle = window.getComputedStyle(leftFeaturesList);
                        const parentWidth = leftFeaturesList.parentElement.offsetWidth;
                        
                        // Clone to measure
                        const clone = leftFeaturesList.cloneNode(true);
                        clone.style.cssText = `
                            position: absolute;
                            visibility: hidden;
                            height: auto;
                            max-height: none;
                            overflow: visible;
                            width: ${parentWidth}px;
                            font-size: ${computedStyle.fontSize};
                            font-family: ${computedStyle.fontFamily};
                            line-height: ${computedStyle.lineHeight};
                            box-sizing: ${computedStyle.boxSizing};
                        `;
                        document.body.appendChild(clone);
                        
                        void clone.offsetHeight;
                        const listHeight = clone.scrollHeight;
                        document.body.removeChild(clone);
                        
                        // Reset for smooth transition
                        leftFeaturesList.style.maxHeight = '0';
                        void leftFeaturesList.offsetHeight;
                        
                        // Animate to calculated height
                        requestAnimationFrame(() => {
                            leftFeaturesList.style.maxHeight = listHeight + 'px';
                        });
                    });
                } else {
                    // Close
                    leftFeatureHeader.setAttribute('aria-expanded', 'false');
                    leftFeaturesList.style.maxHeight = '0';
                }
            });
        }

        // Handle window resize to update state
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const mobile = isMobile();
                
                // Update pricing card headers
                pricingCardHeaders.forEach(header => {
                    if (mobile) {
                        // On mobile, keep current state or default to collapsed
                        if (!header.hasAttribute('aria-expanded')) {
                            header.setAttribute('aria-expanded', 'false');
                        }
                    } else {
                        // On desktop, always expanded
                        header.setAttribute('aria-expanded', 'true');
                        const features = header.nextElementSibling;
                        if (features && features.classList.contains('catalog-access-pricing-comparison-card__features')) {
                            features.style.maxHeight = '';
                        }
                    }
                });

                // Update left feature card
                if (leftFeatureHeader) {
                    if (mobile) {
                        if (!leftFeatureHeader.hasAttribute('aria-expanded')) {
                            leftFeatureHeader.setAttribute('aria-expanded', 'false');
                        }
                    } else {
                        leftFeatureHeader.setAttribute('aria-expanded', 'true');
                        if (leftFeaturesList) {
                            leftFeaturesList.style.maxHeight = '';
                        }
                    }
                }
            }, 100);
        });
    }
}

// Initialize page loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.catalogAccessPageLoader = new CatalogAccessPageLoader();
    window.catalogAccessPageLoader.init();

    // Listen for language changes to update dynamic translations
    window.addEventListener('catalogAccessTranslationsApplied', () => {
        if (window.catalogAccessPageLoader && window.catalogAccessPageLoader.updatePricing) {
            window.catalogAccessPageLoader.updatePricing();
        }
    });

    // Also listen for global language change events
    window.addEventListener('languageChanged', () => {
        // Wait a bit for translations to be applied
        setTimeout(() => {
            if (window.catalogAccessPageLoader && window.catalogAccessPageLoader.updatePricing) {
                window.catalogAccessPageLoader.updatePricing();
            }
        }, 100);
    });
});

// Also run alignment after page fully loads (including images, fonts, etc.)
window.addEventListener('load', () => {
    if (window.catalogAccessPageLoader && window.catalogAccessPageLoader.alignFeatureRows) {
        requestAnimationFrame(() => {
            window.catalogAccessPageLoader.alignFeatureRows();
        });
    }
});


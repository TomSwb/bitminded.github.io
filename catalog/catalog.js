/**
 * Catalog page renderer
 * Fetches product data via catalogData and renders catalog sections.
 */
(function initializeCatalogPage() {
    if (window.catalogPageInitialized) {
        return;
    }

    window.catalogPageInitialized = true;

    const state = {
        products: [],
        filteredProducts: [],
        featuredProducts: [],
        filters: {
            availability: 'all',
            search: ''
        }
    };

    const selectors = {
        featuredGrid: 'catalog-featured-grid',
        productGrid: 'catalog-grid',
        emptyState: 'catalog-empty-state',
        availabilityToggle: '.catalog-filter-bar__toggle',
        searchInput: 'catalog-search'
    };

    function interpolateFallback(fallback, replacements = {}) {
        if (typeof fallback !== 'string') {
            return fallback ?? '';
        }
        return fallback.replace(/\{\{(\w+)\}\}/g, (_, token) => (
            Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : ''
        ));
    }

    function translateText(key, fallback, replacements = {}) {
        if (key && typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
            const translated = i18next.t(key, replacements);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return interpolateFallback(fallback ?? '', replacements);
    }

    function applyTranslationUpdates() {
        if (typeof window.catalogApplyTranslations === 'function') {
            window.catalogApplyTranslations();
        }
    }

    const templates = {
        loadingPlaceholder: `
            <div class="catalog-loading">
                <span class="catalog-loading__spinner" aria-hidden="true"></span>
                <span class="catalog-loading__label translatable-content" data-i18n="catalog-loading-label">
                    Gathering catalog entries...
                </span>
            </div>
        `,
        errorPlaceholder: `
            <div class="catalog-error" role="alert">
                <h3 class="catalog-error__title translatable-content" data-i18n="catalog-error-title">
                    We hit a snag
                </h3>
                <p class="catalog-error__message translatable-content" data-i18n="catalog-error-message">
                    The catalog service is temporarily unavailable.
                </p>
                <button class="catalog-error__retry translatable-content" type="button" data-i18n="catalog-error-retry">
                    Try again
                </button>
            </div>
        `
    };

    document.addEventListener('DOMContentLoaded', async () => {
        // Wait a bit for currency switcher to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        await hydrateCatalog();
    });

    window.addEventListener('languageChanged', (event) => {
        const detailLanguage = event?.detail?.language;
        const languageOverride = typeof detailLanguage === 'string' && detailLanguage.length > 0
            ? detailLanguage
            : (typeof i18next !== 'undefined' && i18next.language ? i18next.language : null);

        if (!state.products.length || !window.catalogData?.transformProduct) {
            applyTranslationUpdates();
            return;
        }

        state.products = state.products.map(product =>
            window.catalogData.transformProduct(product.raw, languageOverride)
        );
        state.featuredProducts = deriveFeatured(state.products);
        applyFilters();
        renderFeaturedSection(state.featuredProducts);
        applyTranslationUpdates();
    });

    // Listen for currency changes
    window.addEventListener('currencyChanged', (event) => {
        const newCurrency = event?.detail?.currency;
        window.logger?.log('💰 Currency changed event received:', newCurrency);
        if (newCurrency && state.products.length > 0) {
            // Re-render catalog with new currency
            // Products don't need to be re-fetched, just re-rendered with new currency
            window.logger?.log('🔄 Re-rendering catalog with currency:', newCurrency);
            renderFeaturedSection(state.featuredProducts);
            renderProductGrid(state.filteredProducts);
            applyTranslationUpdates();
        }
    });
    
    // Also check currency on initial load and periodically until currency switcher is ready
    let currencyCheckAttempts = 0;
    const maxCurrencyCheckAttempts = 20; // Check for up to 2 seconds (20 * 100ms)
    
    function checkAndUpdateCurrency() {
        if (window.currencySwitcher && typeof window.currencySwitcher.getCurrentCurrency === 'function') {
            const currentCurrency = window.currencySwitcher.getCurrentCurrency();
            window.logger?.log('💰 Currency switcher found, current currency:', currentCurrency);
            if (state.products.length > 0) {
                // Re-render with correct currency
                renderFeaturedSection(state.featuredProducts);
                renderProductGrid(state.filteredProducts);
                applyTranslationUpdates();
            }
            return true; // Currency switcher is ready
        }
        return false; // Not ready yet
    }
    
    // Check currency on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        if (!checkAndUpdateCurrency()) {
            // If not ready, check periodically
            const currencyCheckInterval = setInterval(() => {
                currencyCheckAttempts++;
                if (checkAndUpdateCurrency() || currencyCheckAttempts >= maxCurrencyCheckAttempts) {
                    clearInterval(currencyCheckInterval);
                }
            }, 100);
        }
    });

    async function hydrateCatalog() {
        renderLoadingStates();

        try {
            const products = await window.catalogData.fetchProducts({
                filterStatuses: ['active', 'published', 'beta', 'coming-soon']
            });

            state.products = products;
            state.filteredProducts = products; // Show all products by default
            state.featuredProducts = deriveFeatured(products);

            // Filter controls - COMMENTED OUT (portfolio shows all items)
            // setupFilterControls();
            
            // Wait a bit for currency switcher to initialize, then render
            // This ensures we get the correct currency on initial load
            setTimeout(() => {
                renderCatalog();
            }, 100);
        } catch (error) {
            window.logger?.error('Failed to load catalog products', error);
            renderErrorState(error);
        }
    }

    function deriveFeatured(products) {
        const split = window.catalogData.splitProducts(products);

        if (split.featured.length > 0) {
            return split.featured.slice(0, 3);
        }

        // Fallback: highlight first available products
        const fallback = [...split.available, ...split.comingSoon];
        return fallback.slice(0, 3);
    }

    function renderCatalog() {
        renderFeaturedSection(state.featuredProducts);
        renderProductGrid(state.filteredProducts);
        applyTranslationUpdates();
    }

    function renderLoadingStates() {
        const featuredGrid = document.getElementById(selectors.featuredGrid);
        const productGrid = document.getElementById(selectors.productGrid);

        if (featuredGrid) {
            featuredGrid.innerHTML = `<div class="catalog-placeholder">${templates.loadingPlaceholder}</div>`;
        }

        if (productGrid) {
            productGrid.innerHTML = `<div class="catalog-placeholder">${templates.loadingPlaceholder}</div>`;
        }

        applyTranslationUpdates();
    }

    function renderErrorState(error) {
        const featuredGrid = document.getElementById(selectors.featuredGrid);
        const productGrid = document.getElementById(selectors.productGrid);

        const errorHTML = templates.errorPlaceholder;

        if (featuredGrid) {
            featuredGrid.innerHTML = errorHTML;
        }

        if (productGrid) {
            productGrid.innerHTML = errorHTML;
        }

        applyTranslationUpdates();

        const retryButtons = document.querySelectorAll('.catalog-error__retry');
        retryButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                hydrateCatalog();
            });
        });
    }

    function renderFeaturedSection(products) {
        const container = document.getElementById(selectors.featuredGrid);

        if (!container) {
            return;
        }

        if (!products || products.length === 0) {
            container.innerHTML = `
                <p class="catalog-placeholder translatable-content" data-i18n="catalog-featured-placeholder">
                    We’re lining up standout experiences. Check back soon.
                </p>
            `;
            return;
        }

        container.innerHTML = '';

        products.forEach(product => {
            const card = buildFeaturedCard(product);
            container.appendChild(card);
        });
    }

    function renderProductGrid(products) {
        const grid = document.getElementById(selectors.productGrid);
        const emptyState = document.getElementById(selectors.emptyState);

        if (!grid) {
            return;
        }

        grid.innerHTML = '';

        if (!products || products.length === 0) {
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            applyTranslationUpdates();
            return;
        }

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        products.forEach(product => {
            const card = buildCatalogCard(product);
            grid.appendChild(card);
        });

        applyTranslationUpdates();
    }

    function buildFeaturedCard(product) {
        const card = document.createElement('article');
        card.className = 'catalog-card catalog-card--featured';
        card.dataset.productSlug = product.slug;

        const status = buildStatusBadge(product);
        const header = document.createElement('header');
        header.className = 'catalog-card__header';
        header.appendChild(status);
        
        // Add sale badge if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleBadge = buildSaleBadge(product.sale);
            header.appendChild(saleBadge);
        }

        const title = document.createElement('h3');
        title.className = 'catalog-card__title';
        title.textContent = product.name;

        const tagline = document.createElement('p');
        tagline.className = 'catalog-card__tagline';
        if (product.tagline) {
            tagline.textContent = product.tagline;
        } else {
            tagline.classList.add('translatable-content');
            tagline.dataset.i18n = 'catalog-featured-card-placeholder';
            tagline.textContent = translateText(
                'catalog-featured-card-placeholder',
                'Crafted for calm productivity. Full details coming soon.'
            );
        }

        const media = buildMediaPreview(product);

        const body = document.createElement('div');
        body.className = 'catalog-card__body';
        if (media) {
            body.appendChild(media);
        }
        body.appendChild(title);
        body.appendChild(tagline);
        if (media) {
            body.classList.add('catalog-card__body--with-media');
        }
        // Tags - COMMENTED OUT
        // body.appendChild(buildTagList(product));

        // Add sale info if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleInfo = buildSaleInfo(product.sale);
            if (saleInfo) {
                body.appendChild(saleInfo);
            }
        }

        // Add purchase button if product is available for purchase
        if (!product.status.purchaseDisabled && product.status.availability === 'available') {
            const purchaseButton = buildPurchaseButton(product);
            if (purchaseButton) {
                body.appendChild(purchaseButton);
            }
        }
        
        // Add GitHub link if available
        if (product.github && product.github.repoUrl) {
            const githubLink = buildGitHubLink(product);
            if (githubLink) {
                body.appendChild(githubLink);
            }
        }

        card.appendChild(header);
        card.appendChild(body);
        const featuredPanel = buildDetailPanel(product);
        if (featuredPanel) {
            card.appendChild(featuredPanel);
        }

        return card;
    }

    function buildCatalogCard(product) {
        const card = document.createElement('article');
        card.className = 'catalog-card';
        card.dataset.productSlug = product.slug;
        card.dataset.displayStatus = product.status.availability;

        const status = buildStatusBadge(product);
        const header = document.createElement('header');
        header.className = 'catalog-card__header';
        header.appendChild(status);
        
        // Add sale badge if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleBadge = buildSaleBadge(product.sale);
            header.appendChild(saleBadge);
        }

        const title = document.createElement('h3');
        title.className = 'catalog-card__title';
        title.textContent = product.name;

        const tagline = document.createElement('p');
        tagline.className = 'catalog-card__tagline';
        if (product.tagline) {
            tagline.textContent = product.tagline;
        } else {
            tagline.classList.add('translatable-content');
            tagline.dataset.i18n = 'catalog-card-placeholder';
            tagline.textContent = translateText(
                'catalog-card-placeholder',
                'Stay tuned for the upcoming release.'
            );
        }

        // Meta line - COMMENTED OUT
        // const meta = buildMetaLine(product);

        const body = document.createElement('div');
        body.className = 'catalog-card__body';
        const media = buildMediaPreview(product);
        if (media) {
            body.appendChild(media);
        }
        body.appendChild(title);
        // Meta line - COMMENTED OUT
        // if (meta) {
        //     body.appendChild(meta);
        // }
        body.appendChild(tagline);
        // Tags - COMMENTED OUT
        // body.appendChild(buildTagList(product));
        
        // Add sale info if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleInfo = buildSaleInfo(product.sale);
            if (saleInfo) {
                body.appendChild(saleInfo);
            }
        }
        
        // Add purchase button if product is available for purchase
        if (!product.status.purchaseDisabled && product.status.availability === 'available') {
            const purchaseButton = buildPurchaseButton(product);
            if (purchaseButton) {
                body.appendChild(purchaseButton);
            }
        }
        
        // Add GitHub link if available
        if (product.github && product.github.repoUrl) {
            const githubLink = buildGitHubLink(product);
            if (githubLink) {
                body.appendChild(githubLink);
            }
        }
        
        card.appendChild(header);
        card.appendChild(body);
        const detailPanel = buildDetailPanel(product);
        if (detailPanel) {
            card.appendChild(detailPanel);
        }

        return card;
    }

    function buildStatusBadge(product) {
        const badge = document.createElement('span');
        badge.className = `catalog-card__status catalog-card__status--${product.status.badgeVariant}`;
        badge.classList.add('translatable-content');
        const badgeKey = product.status.badgeKey;
        if (badgeKey) {
            badge.dataset.i18n = badgeKey;
        }
        const fallback = product.status.badgeText || '';
        badge.textContent = badgeKey ? translateText(badgeKey, fallback) : fallback;
        return badge;
    }

    function buildSaleBadge(sale) {
        const badge = document.createElement('span');
        badge.className = 'catalog-card__sale-badge';
        
        // Create festive text with emoji
        const badgeText = document.createElement('span');
        const leftEmoji = sale.emojiLeft || '✨';
        const rightEmoji = sale.emojiRight || '✨';
        badgeText.textContent = `${leftEmoji} ON SALE ${rightEmoji}`;
        badge.appendChild(badgeText);
        
        return badge;
    }

    function buildSaleInfo(sale) {
        if (!sale || !sale.isOnSale) {
            return null;
        }

        const saleInfo = document.createElement('div');
        saleInfo.className = 'catalog-card__sale-info';

        // Add sale description if available with custom emojis
        if (sale.description) {
            const description = document.createElement('div');
            description.className = 'catalog-card__sale-info__description';
            const leftEmoji = sale.emojiLeft || '✨';
            const rightEmoji = sale.emojiRight || '✨';
            description.textContent = `${leftEmoji} ${sale.description} ${rightEmoji}`;
            saleInfo.appendChild(description);
        }

        // Add end date and time if available
        if (sale.endDate) {
            const endDate = new Date(sale.endDate);
            
            // Format date as DD/MM/YYYY
            const day = String(endDate.getDate()).padStart(2, '0');
            const month = String(endDate.getMonth() + 1).padStart(2, '0');
            const year = endDate.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;
            
            // Format time as HH:MM
            const hours = String(endDate.getHours()).padStart(2, '0');
            const minutes = String(endDate.getMinutes()).padStart(2, '0');
            const formattedTime = `${hours}:${minutes}`;
            
            const dateInfo = document.createElement('div');
            dateInfo.className = 'catalog-card__sale-info__end-date';
            dateInfo.innerHTML = `
                <div><span class="catalog-card__sale-info__label">Ends:</span> ${formattedDate}</div>
                <div><span class="catalog-card__sale-info__label">Time:</span> ${formattedTime}</div>
            `;
            saleInfo.appendChild(dateInfo);
        }

        return saleInfo;
    }

    function buildMetaLine(product) {
        const items = [];

        if (product.category?.name) {
            items.push(product.category.name);
        }

        if (product.status?.availability === 'available' && product.pricing) {
            const pricingLabel = formatPricingLabel(product.pricing, product);
            if (pricingLabel) {
                items.push(pricingLabel);
            }
        }

        if (items.length === 0) {
            return null;
        }

        const meta = document.createElement('p');
        meta.className = 'catalog-card__meta';
        // Use innerHTML if any item contains HTML (for sale price strikethrough)
        const hasHTML = items.some(item => typeof item === 'string' && item.includes('<'));
        if (hasHTML) {
            meta.innerHTML = items.map(item => `<span>${item}</span>`).join(' • ');
        } else {
            meta.textContent = items.join(' • ');
        }
        return meta;
    }

    function formatPricingLabel(pricing, product = null) {
        if (!pricing) return '';

        if (pricing.pricingType === 'freemium') {
            return translateText('catalog-pricing-freemium', 'Freemium');
        }

        // Get current currency from currency switcher or default to CHF
        const currentCurrency = (window.currencySwitcher?.getCurrentCurrency()) || 'CHF';
        
        // Get regular price for current currency, fallback to default amount/currency
        let regularPriceAmount = null;
        let priceCurrency = currentCurrency;
        
        if (pricing.currencyAmounts && pricing.currencyAmounts[currentCurrency] !== null && pricing.currencyAmounts[currentCurrency] !== undefined) {
            regularPriceAmount = pricing.currencyAmounts[currentCurrency];
            priceCurrency = currentCurrency;
        } else if (typeof pricing.amount === 'number') {
            regularPriceAmount = pricing.amount;
            priceCurrency = pricing.currency || 'USD';
        }

        // Get sale price for current currency if product is on sale
        let salePriceAmount = null;
        const isOnSale = product && product.sale && product.sale.isOnSale;
        if (isOnSale) {
            // First try to get sale price from saleCurrencyAmounts
            if (pricing.saleCurrencyAmounts && pricing.saleCurrencyAmounts[currentCurrency] !== null && pricing.saleCurrencyAmounts[currentCurrency] !== undefined) {
                salePriceAmount = pricing.saleCurrencyAmounts[currentCurrency];
            } 
            // Fallback: calculate sale price from regular price and discount percentage
            else if (regularPriceAmount !== null && regularPriceAmount !== undefined && product.sale && product.sale.discountPercentage) {
                const discountMultiplier = 1 - (product.sale.discountPercentage / 100);
                salePriceAmount = Math.round(regularPriceAmount * discountMultiplier * 100) / 100;
            }
        }

        const hasExplicitPrice = regularPriceAmount !== null && regularPriceAmount !== undefined;
        const isFree = hasExplicitPrice && regularPriceAmount === 0;

        // Format regular price
        const formatRegularPrice = (amount, currency, suffix = '') => {
            if (isFree) {
                return translateText('catalog-pricing-free', 'Free');
            }
            const formatted = formatCurrency(amount, currency);
            return suffix ? `${formatted}${suffix}` : formatted;
        };

        // Format sale price display (strikethrough regular + sale on new line)
        const formatSalePrice = (regularAmount, saleAmount, currency, suffix = '') => {
            const regularFormatted = formatCurrency(regularAmount, currency);
            const saleFormatted = formatCurrency(saleAmount, currency);
            const regularWithSuffix = suffix ? `${regularFormatted}${suffix}` : regularFormatted;
            const saleWithSuffix = suffix ? `${saleFormatted}${suffix}` : saleFormatted;
            return `<div class="catalog-price-wrapper" style="display: flex; flex-direction: column; line-height: 1.4;">
                <div class="catalog-price-original" style="text-decoration: line-through; opacity: 0.6; font-size: 0.9em;">${regularWithSuffix}</div>
                <div class="catalog-price-sale" style="font-weight: 600; color: #ef4444;">${saleWithSuffix}</div>
            </div>`;
        };

        if (pricing.pricingType === 'subscription') {
            if (pricing.subscriptionInterval === 'monthly') {
                if (isFree) {
                    return translateText('catalog-pricing-free', 'Free');
                }
                if (isOnSale && salePriceAmount !== null && regularPriceAmount !== null) {
                    return formatSalePrice(regularPriceAmount, salePriceAmount, priceCurrency, '/mo');
                }
                const formattedPrice = formatRegularPrice(regularPriceAmount, priceCurrency, '/mo');
                return translateText('catalog-pricing-subscription-monthly', formattedPrice, { price: formattedPrice });
            }
            if (pricing.subscriptionInterval === 'yearly') {
                if (isFree) {
                    return translateText('catalog-pricing-free', 'Free');
                }
                if (isOnSale && salePriceAmount !== null && regularPriceAmount !== null) {
                    return formatSalePrice(regularPriceAmount, salePriceAmount, priceCurrency, '/yr');
                }
                const formattedPrice = formatRegularPrice(regularPriceAmount, priceCurrency, '/yr');
                return translateText('catalog-pricing-subscription-yearly', formattedPrice, { price: formattedPrice });
            }
            const intervalLabel = pricing.subscriptionInterval ? capitalize(pricing.subscriptionInterval) : 'Recurring';
            if (hasExplicitPrice && !isFree) {
                if (isOnSale && salePriceAmount !== null && regularPriceAmount !== null) {
                    return formatSalePrice(regularPriceAmount, salePriceAmount, priceCurrency, ` ${intervalLabel.toLowerCase()}`);
                }
                const formattedPrice = formatRegularPrice(regularPriceAmount, priceCurrency);
                return translateText('catalog-pricing-subscription-generic', `${formattedPrice} {{interval}}`, {
                    price: formattedPrice,
                    interval: intervalLabel.toLowerCase()
                });
            }
            return translateText('catalog-pricing-subscription-generic', '{{interval}} subscription', {
                interval: intervalLabel
            });
        }

        if (hasExplicitPrice) {
            if (isFree) {
                return translateText('catalog-pricing-free', 'Free');
            }
            if (isOnSale && salePriceAmount !== null && regularPriceAmount !== null) {
                return formatSalePrice(regularPriceAmount, salePriceAmount, priceCurrency);
            }
            const formattedPrice = formatRegularPrice(regularPriceAmount, priceCurrency);
            return translateText('catalog-pricing-one-time', formattedPrice, { price: formattedPrice });
        }

        return '';
    }

    function formatCurrency(amount, currency = 'USD') {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '';
        }
        
        try {
            // Use appropriate locale for currency formatting
            const localeMap = {
                'CHF': 'de-CH',
                'USD': 'en-US',
                'EUR': 'de-DE',
                'GBP': 'en-GB'
            };
            const locale = localeMap[currency] || 'en-US';
            
            // Use 0-2 decimal places to preserve original precision (3.9 shows as 3.9, 3.95 shows as 3.95)
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback formatting - preserve original decimal places
            const symbolMap = {
                'CHF': 'CHF',
                'USD': '$',
                'EUR': '€',
                'GBP': '£'
            };
            const symbol = symbolMap[currency] || currency;
            // Format with up to 2 decimal places, removing trailing zeros
            const formatted = amount.toFixed(2).replace(/\.?0+$/, '');
            return `${symbol}${formatted}`;
        }
    }

    function buildTagList(product) {
        const tags = product.tags || [];

        if (tags.length === 0) {
            return document.createElement('div');
        }

        const list = document.createElement('ul');
        list.className = 'catalog-card__tags';

        tags.slice(0, 4).forEach(tag => {
            const item = document.createElement('li');
            item.className = 'catalog-card__tag';
            item.textContent = tag;
            list.appendChild(item);
        });

        return list;
    }

    function buildPurchaseButton(product) {
        if (!product || !product.id || product.status.purchaseDisabled) {
            return null;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'catalog-card__action';

        const button = document.createElement('a');
        button.className = 'catalog-card__purchase-button';
        // Link to product subdomain instead of checkout
        button.href = `https://${product.slug}.bitminded.ch/`;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';

        button.classList.add('translatable-content');
        button.dataset.i18n = 'catalog-cta-buy-now';
        button.textContent = translateText('catalog-cta-buy-now', 'Try Now');
        button.setAttribute('aria-label', translateText('catalog-cta-buy-now-aria', `Try ${product.name}`));

        button.addEventListener('click', (event) => {
            // Navigate to product page - let the href handle it
            // Could add analytics or loading state here if needed
            window.logger?.log('🔗 Try Now button clicked:', product.name, product.slug);
        });

        buttonContainer.appendChild(button);
        return buttonContainer;
    }

    function buildGitHubLink(product) {
        if (!product || !product.github || !product.github.repoUrl) {
            return null;
        }

        const linkContainer = document.createElement('div');
        linkContainer.className = 'catalog-card__action';

        const link = document.createElement('a');
        link.className = 'catalog-card__github-link';
        link.href = product.github.repoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        link.classList.add('translatable-content');
        link.dataset.i18n = 'catalog-cta-view-code';
        link.textContent = translateText('catalog-cta-view-code', 'View Code');
        link.setAttribute('aria-label', translateText('catalog-cta-view-code-aria', `View ${product.name} source code on GitHub`));

        // Add GitHub icon (using SVG)
        const icon = document.createElement('span');
        icon.className = 'catalog-card__github-icon';
        icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>';
        link.insertBefore(icon, link.firstChild);

        link.addEventListener('click', (event) => {
            window.logger?.log('🔗 GitHub link clicked:', product.name, product.github.repoUrl);
        });

        linkContainer.appendChild(link);
        return linkContainer;
    }

    function buildMediaPreview(product) {
        if (!product.media.icon) {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'catalog-card__media';

        const image = document.createElement('img');
        image.src = product.media.icon;
        image.alt = `${product.name} icon`;
        image.loading = 'lazy';

        wrapper.appendChild(image);
        return wrapper;
    }

    function buildDetailPanel(product) {
        const panel = document.createElement('section');
        panel.className = 'catalog-card__details';
        panel.id = `details-${product.slug}`;
        panel.hidden = true;

        const description = document.createElement('p');
        description.className = 'catalog-card__description';
        if (product.description) {
            description.textContent = product.description;
        } else {
            description.classList.add('translatable-content');
            description.dataset.i18n = 'catalog-details-fallback';
            description.textContent = translateText(
                'catalog-details-fallback',
                'We’re still writing the full story for this build. If you’re curious, reach out and we’ll share what’s in the works.'
            );
        }

        panel.appendChild(description);

        if (product.media.screenshots.length > 0) {
            const gallery = document.createElement('div');
            gallery.className = 'catalog-card__gallery';

            product.media.screenshots.slice(0, 3).forEach((src, index) => {
                const img = document.createElement('img');
                img.src = src;
                img.alt = `${product.name} preview ${index + 1}`;
                img.loading = 'lazy';
                gallery.appendChild(img);
            });

            panel.appendChild(gallery);
        }

        return panel;
    }

    function capitalize(value = '') {
        if (!value) {
            return '';
        }

        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    let filtersInitialized = false;
    let searchDebounceHandle = null;

    function setupFilterControls() {
        if (filtersInitialized) {
            return;
        }

        filtersInitialized = true;

        const availabilityButtons = document.querySelectorAll(selectors.availabilityToggle);
        availabilityButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filterValue = button.getAttribute('data-filter');
                if (!filterValue || filterValue === state.filters.availability) {
                    return;
                }
                setAvailabilityFilter(filterValue);
            });
        });

        const searchInput = document.getElementById(selectors.searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                const value = event.target.value || '';
                if (searchDebounceHandle) {
                    window.clearTimeout(searchDebounceHandle);
                }
                searchDebounceHandle = window.setTimeout(() => {
                    state.filters.search = value;
                    applyFilters();
                }, 250);
            });
        }

        updateAvailabilityButtons();
    }

    function setAvailabilityFilter(value) {
        state.filters.availability = value;
        updateAvailabilityButtons();
        applyFilters();
    }

    function updateAvailabilityButtons() {
        const buttons = document.querySelectorAll(selectors.availabilityToggle);
        buttons.forEach((button) => {
            const isActive = button.getAttribute('data-filter') === state.filters.availability;
            button.setAttribute('data-active', String(isActive));
        });
    }

    function applyFilters() {
        const availability = state.filters.availability;
        const searchTerm = state.filters.search.trim().toLowerCase();

        const filtered = state.products.filter((product) => {
            if (availability === 'available' && product.status.availability !== 'available') {
                return false;
            }

            if (availability === 'coming-soon' && product.status.availability !== 'coming-soon') {
                return false;
            }

            if (searchTerm.length > 0) {
                const haystack = [
                    product.name,
                    product.tagline,
                    product.description,
                    product.category?.name,
                    ...(product.tags || [])
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!haystack.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        state.filteredProducts = filtered;
        renderProductGrid(filtered);
    }
})();


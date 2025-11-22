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
        if (newCurrency && state.products.length > 0) {
            // Re-render catalog with new currency
            // Products don't need to be re-fetched, just re-rendered with new currency
            renderFeaturedSection(state.featuredProducts);
            renderProductGrid(state.filteredProducts);
            applyTranslationUpdates();
        }
    });

    async function hydrateCatalog() {
        renderLoadingStates();

        try {
            const products = await window.catalogData.fetchProducts({
                filterStatuses: ['active', 'published', 'beta', 'coming-soon']
            });

            state.products = products;
            state.filteredProducts = products;
            state.featuredProducts = deriveFeatured(products);

            setupFilterControls();
            renderCatalog();
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
        body.appendChild(buildTagList(product));

        // Add sale info if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleInfo = buildSaleInfo(product.sale);
            if (saleInfo) {
                body.appendChild(saleInfo);
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

        const meta = buildMetaLine(product);

        const body = document.createElement('div');
        body.className = 'catalog-card__body';
        const media = buildMediaPreview(product);
        if (media) {
            body.appendChild(media);
        }
        body.appendChild(title);
        if (meta) {
            body.appendChild(meta);
        }
        body.appendChild(tagline);
        body.appendChild(buildTagList(product));
        
        // Add sale info if product is on sale
        if (product.sale && product.sale.isOnSale) {
            const saleInfo = buildSaleInfo(product.sale);
            if (saleInfo) {
                body.appendChild(saleInfo);
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
            const pricingLabel = formatPricingLabel(product.pricing);
            if (pricingLabel) {
                items.push(pricingLabel);
            }
        }

        if (items.length === 0) {
            return null;
        }

        const meta = document.createElement('p');
        meta.className = 'catalog-card__meta';
        meta.textContent = items.join(' • ');
        return meta;
    }

    function formatPricingLabel(pricing) {
        if (!pricing) return '';

        if (pricing.pricingType === 'freemium') {
            return translateText('catalog-pricing-freemium', 'Freemium');
        }

        // Get current currency from currency switcher or default to CHF
        const currentCurrency = (window.currencySwitcher?.getCurrentCurrency()) || 'CHF';
        
        // Get price for current currency, fallback to default amount/currency
        let priceAmount = null;
        let priceCurrency = currentCurrency;
        
        if (pricing.currencyAmounts && pricing.currencyAmounts[currentCurrency] !== null && pricing.currencyAmounts[currentCurrency] !== undefined) {
            priceAmount = pricing.currencyAmounts[currentCurrency];
            priceCurrency = currentCurrency;
        } else if (typeof pricing.amount === 'number') {
            priceAmount = pricing.amount;
            priceCurrency = pricing.currency || 'USD';
        }

        const hasExplicitPrice = priceAmount !== null && priceAmount !== undefined;
        const isFree = hasExplicitPrice && priceAmount === 0;

        if (pricing.pricingType === 'subscription') {
            if (pricing.subscriptionInterval === 'monthly') {
                if (isFree) {
                    return translateText('catalog-pricing-free', 'Free');
                }
                const formattedPrice = formatCurrency(priceAmount, priceCurrency);
                return translateText('catalog-pricing-subscription-monthly', `${formattedPrice}/mo`, { price: formattedPrice });
            }
            if (pricing.subscriptionInterval === 'yearly') {
                if (isFree) {
                    return translateText('catalog-pricing-free', 'Free');
                }
                const formattedPrice = formatCurrency(priceAmount, priceCurrency);
                return translateText('catalog-pricing-subscription-yearly', `${formattedPrice}/yr`, { price: formattedPrice });
            }
            const intervalLabel = pricing.subscriptionInterval ? capitalize(pricing.subscriptionInterval) : 'Recurring';
            if (hasExplicitPrice && !isFree) {
                const formattedPrice = formatCurrency(priceAmount, priceCurrency);
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
            const formattedPrice = formatCurrency(priceAmount, priceCurrency);
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
            
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback formatting
            const symbolMap = {
                'CHF': 'CHF',
                'USD': '$',
                'EUR': '€',
                'GBP': '£'
            };
            const symbol = symbolMap[currency] || currency;
            return `${symbol}${amount.toFixed(2)}`;
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


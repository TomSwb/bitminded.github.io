/**
 * Catalog data module
 * Fetches product information from Supabase and shapes it
 * for the catalog presentation layer.
 */
(function initializeCatalogDataModule() {
    if (window.catalogData) {
        return;
    }

    function normalizeLanguageCode(code) {
        if (!code) {
            return '';
        }
        return code.toLowerCase();
    }

    function getPreferredLanguage(languageOverride) {
        if (languageOverride) {
            return normalizeLanguageCode(languageOverride);
        }

        const i18nLang = typeof i18next !== 'undefined' && i18next.language ? i18next.language : null;
        const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null;
        const resolved = i18nLang || storedLang || 'en';
        return normalizeLanguageCode(resolved);
    }

    function pickLocalizedValue(translations, fallback = '', languageOverride) {
        if (!translations || typeof translations !== 'object') {
            return fallback;
        }

        const preferred = getPreferredLanguage(languageOverride);
        const candidates = [];

        if (preferred) {
            candidates.push(preferred);
            const shortCode = preferred.split('-')[0];
            if (shortCode && shortCode !== preferred) {
                candidates.push(shortCode);
            }
        }

        candidates.push('en');

        for (const code of candidates) {
            const value = translations[code];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }

        const firstValue = Object.values(translations).find(
            value => typeof value === 'string' && value.trim().length > 0
        );

        if (firstValue) {
            return firstValue.trim();
        }

        return fallback;
    }

    function pickLocalizedArray(translations, fallbackArray = [], languageOverride) {
        const fallback = Array.isArray(fallbackArray) ? fallbackArray : [];

        if (!translations || typeof translations !== 'object') {
            return fallback;
        }

        const preferred = getPreferredLanguage(languageOverride);
        const candidates = [];

        if (preferred) {
            candidates.push(preferred);
            const shortCode = preferred.split('-')[0];
            if (shortCode && shortCode !== preferred) {
                candidates.push(shortCode);
            }
        }

        candidates.push('en');

        for (const code of candidates) {
            const value = translations[code];
            if (Array.isArray(value) && value.length > 0) {
                return value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
            }
        }

        const firstArray = Object.values(translations).find(Array.isArray);
        if (Array.isArray(firstArray)) {
            return firstArray
                .map(item => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean);
        }

        return fallback;
    }

    const STATUS_BEHAVIOURS = {
        active: {
            visibility: 'visible',
            availability: 'available',
            badgeText: 'Available',
            badgeVariant: 'available',
            badgeKey: 'catalog-badge-available',
            messageKey: 'catalog-status-available',
            ctaKey: 'catalog-cta-purchase',
            hintKey: 'catalog-hint-available',
            isComingSoon: false,
            isPurchasable: true
        },
        published: {
            visibility: 'visible',
            availability: 'available',
            badgeText: 'Available',
            badgeVariant: 'available',
            badgeKey: 'catalog-badge-available',
            messageKey: 'catalog-status-available',
            ctaKey: 'catalog-cta-purchase',
            hintKey: 'catalog-hint-available',
            isComingSoon: false,
            isPurchasable: true
        },
        beta: {
            visibility: 'visible',
            availability: 'coming-soon',
            badgeText: 'Coming Soon',
            badgeVariant: 'coming-soon',
            badgeKey: 'catalog-badge-coming-soon',
            messageKey: 'catalog-status-coming-soon',
            ctaKey: 'catalog-cta-notify',
            hintKey: 'catalog-hint-coming-soon',
            isComingSoon: true,
            isPurchasable: false
        },
        'coming-soon': {
            visibility: 'visible',
            availability: 'coming-soon',
            badgeText: 'Coming Soon',
            badgeVariant: 'coming-soon',
            badgeKey: 'catalog-badge-coming-soon',
            messageKey: 'catalog-status-coming-soon',
            ctaKey: 'catalog-cta-notify',
            hintKey: 'catalog-hint-coming-soon',
            isComingSoon: true,
            isPurchasable: false
        },
        draft: { visibility: 'hidden' },
        archived: { visibility: 'hidden' },
        suspended: { visibility: 'hidden' }
    };

    function getStatusMeta(status) {
        return STATUS_BEHAVIOURS[status] || {
            visibility: 'hidden',
            availability: 'hidden',
            badgeText: status || 'Unknown',
            badgeVariant: 'unknown',
            messageKey: 'catalog-status-hidden',
            ctaKey: 'catalog-cta-hidden',
            hintKey: 'catalog-hint-hidden',
            isComingSoon: false,
            isPurchasable: false
        };
    }

    function mapPricing(product) {
        const amount = typeof product.price_amount === 'number' ? product.price_amount : null;
        const currency = product.price_currency || 'USD';

        return {
            pricingType: product.pricing_type || 'one_time',
            amount,
            currency,
            individualPrice: product.individual_price,
            enterprisePrice: product.enterprise_price,
            subscriptionInterval: product.subscription_interval,
            stripeProductId: product.stripe_product_id,
            stripePriceId: product.stripe_price_id,
            isAvailableForPurchase: product.is_available_for_purchase !== false
        };
    }

    function transformProduct(product, languageOverride) {
        const statusMeta = getStatusMeta(product.status);
        const localizedName = pickLocalizedValue(product.name_translations, product.name, languageOverride);
        const localizedTagline = pickLocalizedValue(
            product.summary_translations,
            product.short_description || '',
            languageOverride
        );
        const localizedDescription = pickLocalizedValue(
            product.description_translations,
            product.description || '',
            languageOverride
        );

        const localizedTags = pickLocalizedArray(product.tag_translations, product.tags, languageOverride);

        const category = product.product_categories
            ? {
                  id: product.product_categories.id,
                  name: pickLocalizedValue(
                      product.product_categories.name_translations,
                      product.product_categories.name,
                      languageOverride
                  ),
                  slug: product.product_categories.slug,
                  description: pickLocalizedValue(
                      product.product_categories.description_translations,
                      product.product_categories.description || '',
                      languageOverride
                  ),
                  translations: {
                      name: product.product_categories.name_translations || {},
                      description: product.product_categories.description_translations || {}
                  }
              }
            : null;

        return {
            id: product.id,
            name: localizedName,
            slug: product.slug,
            tagline: localizedTagline,
            description: localizedDescription,
            status: {
                raw: product.status,
                ...statusMeta,
                isVisible: statusMeta.visibility === 'visible',
                purchaseDisabled: true, // Purchase button intentionally inactive for now
                // Provide a hint if we ever enable purchase in the future
                canTogglePurchase: statusMeta.isPurchasable && product.is_available_for_purchase === true
            },
            category,
            tags: localizedTags,
            isFeatured: Boolean(product.is_featured),
            media: {
                icon: product.icon_url || null,
                screenshots: Array.isArray(product.screenshots) ? product.screenshots : [],
                demoVideo: product.demo_video_url || null
            },
            metrics: {
                createdAt: product.created_at ? new Date(product.created_at) : null,
                updatedAt: product.updated_at ? new Date(product.updated_at) : null,
                publishedAt: product.published_at ? new Date(product.published_at) : null
            },
            visibilityRank: computeVisibilityRank(statusMeta, product),
            pricing: mapPricing(product),
            translations: {
                name: product.name_translations || {},
                summary: product.summary_translations || {},
                description: product.description_translations || {},
                tags: product.tag_translations || {}
            },
            raw: product
        };
    }

    function computeVisibilityRank(statusMeta, product) {
        let rank = 100;

        if (statusMeta.availability === 'available') {
            rank -= 40;
        } else if (statusMeta.availability === 'coming-soon') {
            rank -= 10;
        }

        if (product.is_featured) {
            rank -= 30;
        }

        if (product.published_at) {
            const publishedAt = new Date(product.published_at);
            const now = Date.now();
            const ageDays = (now - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
            rank -= Math.max(0, 20 - Math.min(ageDays, 20));
        }

        return rank;
    }

    async function fetchProducts(options = {}) {
        /**
         * NOTE: Anonymous Supabase policies must allow SELECT on the `products`
         * table for statuses returned here (active/published/beta/coming-soon).
         * Ensure RLS rules include beta visibility once those entries go live.
         */
        if (!window.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { filterStatuses } = options;
        let query = window.supabase
            .from('products')
            .select(`
                id,
                name,
                slug,
                description,
                short_description,
                name_translations,
                summary_translations,
                description_translations,
                tags,
                tag_translations,
                status,
                pricing_type,
                price_amount,
                price_currency,
                subscription_interval,
                individual_price,
                enterprise_price,
                is_available_for_purchase,
                stripe_product_id,
                stripe_price_id,
                icon_url,
                screenshots,
                demo_video_url,
                tags,
                is_featured,
                created_at,
                updated_at,
                published_at,
                product_categories (
                    id,
                    name,
                    slug,
                    description,
                    name_translations,
                    description_translations
                )
            `)
            .order('is_featured', { ascending: false })
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (Array.isArray(filterStatuses) && filterStatuses.length > 0) {
            query = query.in('status', filterStatuses);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return (Array.isArray(data) ? data : [])
            .map(transformProduct)
            .filter(product => product.status.isVisible)
            .sort((a, b) => a.visibilityRank - b.visibilityRank);
    }

    function splitProducts(products) {
        const result = {
            featured: [],
            available: [],
            comingSoon: []
        };

        products.forEach(product => {
            if (product.isFeatured) {
                result.featured.push(product);
            }

            if (product.status.availability === 'available') {
                result.available.push(product);
            } else if (product.status.availability === 'coming-soon') {
                result.comingSoon.push(product);
            }
        });

        return result;
    }

    window.catalogData = {
        fetchProducts,
        transformProduct,
        splitProducts,
        getStatusMeta
    };
})();


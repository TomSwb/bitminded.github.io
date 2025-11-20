/**
 * Service Loader Component
 * Fetches services from database, handles currency conversion, and detects active sales
 */

class ServiceLoader {
    constructor() {
        this.services = new Map(); // Cache services by category
        this.servicesBySlug = new Map(); // Quick lookup by slug
        this.currentCurrency = this.getStoredCurrency() || 'CHF';
        this.currencySymbols = {
            'CHF': 'CHF',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
    }

    /**
     * Get stored currency from localStorage
     */
    getStoredCurrency() {
        try {
            return localStorage.getItem('selectedCurrency') || 'CHF';
        } catch (error) {
            return 'CHF';
        }
    }

    /**
     * Set current currency
     */
    setCurrency(currency) {
        this.currentCurrency = currency;
        try {
            localStorage.setItem('selectedCurrency', currency);
        } catch (error) {
            console.warn('Failed to store currency:', error);
        }
    }

    /**
     * Get currency symbol
     */
    getCurrencySymbol(currency = null) {
        const curr = currency || this.currentCurrency;
        return this.currencySymbols[curr] || curr;
    }

    /**
     * Load services for a specific category
     */
    async loadServices(category) {
        try {
            if (!window.supabase) {
                console.error('Supabase not available');
                return [];
            }

            // Check cache first
            if (this.services.has(category)) {
                return this.services.get(category);
            }

            const { data, error } = await window.supabase
                .from('services')
                .select('*')
                .eq('service_category', category)
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading services:', error);
                return [];
            }

            const services = data || [];
            
            // Cache services
            this.services.set(category, services);
            
            // Index by slug for quick lookup
            services.forEach(service => {
                this.servicesBySlug.set(service.slug, service);
            });

            return services;
        } catch (error) {
            console.error('Failed to load services:', error);
            return [];
        }
    }

    /**
     * Get service by slug
     */
    getServiceBySlug(slug) {
        return this.servicesBySlug.get(slug) || null;
    }

    /**
     * Clear cache for a specific category or all categories
     */
    clearCache(category = null) {
        if (category) {
            this.services.delete(category);
            // Also clear from slug index
            const services = this.services.get(category) || [];
            services.forEach(service => {
                this.servicesBySlug.delete(service.slug);
            });
        } else {
            // Clear all caches
            this.services.clear();
            this.servicesBySlug.clear();
        }
    }

    /**
     * Force reload services for a category (clears cache first)
     */
    async reloadServices(category) {
        this.clearCache(category);
        return await this.loadServices(category);
    }

    /**
     * Check if sale is currently active
     */
    isSaleActive(service) {
        if (!service.is_on_sale) {
            return false;
        }

        // Check if discount percentage is set
        if (!service.sale_discount_percentage || service.sale_discount_percentage <= 0) {
            return false;
        }

        const now = new Date();
        
        // Compare dates only (without time) to allow same-day sales
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (service.sale_start_date) {
            const startDate = new Date(service.sale_start_date);
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            
            // Sale hasn't started yet (before start date)
            if (today < startDateOnly) {
                return false;
            }
        }

        if (service.sale_end_date) {
            const endDate = new Date(service.sale_end_date);
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            
            // Sale has ended (after end date)
            if (today > endDateOnly) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate sale price from regular price and discount percentage
     */
    calculateSalePrice(regularPrice, discountPercentage) {
        if (!regularPrice || !discountPercentage || discountPercentage <= 0) {
            return regularPrice;
        }
        const discount = parseFloat(discountPercentage) / 100;
        return regularPrice * (1 - discount);
    }

    /**
     * Get display price for a service
     */
    getDisplayPrice(service, currency = null, options = {}) {
        const curr = currency || this.currentCurrency;
        const isSaleActive = this.isSaleActive(service);
        const pricing = service.pricing; // Always use regular pricing
        
        if (!pricing || typeof pricing !== 'object') {
            return null;
        }

        const currencyPricing = pricing[curr] || pricing[service.base_price_currency] || {};
        const discountPercentage = service.sale_discount_percentage;
        
        // Handle membership pricing
        if (options.isMembership) {
            const key = options.isFamily 
                ? (options.isMonthly ? 'family_monthly' : 'family_yearly')
                : (options.isMonthly ? 'monthly' : 'yearly');
            
            const regularPrice = currencyPricing[key];
            if (regularPrice === undefined || regularPrice === null) {
                return null;
            }
            
            // Calculate sale price if sale is active
            if (isSaleActive && discountPercentage) {
                return this.calculateSalePrice(regularPrice, discountPercentage);
            }
            
            return regularPrice;
        }

        // Handle range pricing
        if (service.pricing_type === 'range') {
            const min = currencyPricing.min || service.price_range_min;
            const max = currencyPricing.max || service.price_range_max;
            if (min !== undefined && max !== undefined) {
                if (isSaleActive && discountPercentage) {
                    return {
                        min: this.calculateSalePrice(min, discountPercentage),
                        max: this.calculateSalePrice(max, discountPercentage)
                    };
                }
                return { min, max };
            }
            return null;
        }

        // Handle hourly pricing
        if (service.pricing_type === 'hourly') {
            const amount = currencyPricing.amount || service.hourly_rate;
            if (amount !== undefined) {
                if (isSaleActive && discountPercentage) {
                    return { amount: this.calculateSalePrice(amount, discountPercentage), type: 'hourly' };
                }
                return { amount, type: 'hourly' };
            }
            return null;
        }

        // Handle fixed/variable pricing
        const amount = currencyPricing.amount || service.price_range_min;
        if (amount !== undefined) {
            if (isSaleActive && discountPercentage) {
                return { amount: this.calculateSalePrice(amount, discountPercentage) };
            }
            return { amount };
        }
        return null;
    }

    /**
     * Get reduced fare price for a service
     */
    getReducedFarePrice(service, currency = null) {
        if (!service.has_reduced_fare) {
            return null;
        }

        const curr = currency || this.currentCurrency;
        const pricing = service.pricing;
        
        if (!pricing || typeof pricing !== 'object') {
            return null;
        }

        const currencyPricing = pricing[curr] || pricing[service.base_price_currency] || {};
        const reducedAmount = currencyPricing.reduced_amount;
        
        if (reducedAmount === undefined || reducedAmount === null) {
            return null;
        }

        // Handle hourly pricing
        if (service.pricing_type === 'hourly') {
            return { amount: reducedAmount, type: 'hourly' };
        }

        // Handle fixed pricing
        return { amount: reducedAmount };
    }

    /**
     * Format reduced fare price for display
     */
    formatReducedFarePrice(service, currency = null) {
        const curr = currency || this.currentCurrency;
        const symbol = this.getCurrencySymbol(curr);
        const priceData = this.getReducedFarePrice(service, curr);
        
        if (!priceData) {
            return null;
        }

        // Handle hourly pricing
        if (priceData.type === 'hourly') {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}/hour`;
        }

        // Handle fixed pricing
        if (priceData.amount !== undefined) {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}`;
        }

        return null;
    }

    /**
     * Format number to remove trailing .00 but keep other decimals
     */
    formatPriceNumber(num) {
        if (typeof num !== 'number') return num;
        // Format to 2 decimals first
        const formatted = num.toFixed(2);
        // Only remove .00, keep other decimals like .50
        // 5.00 -> 5, 3.50 -> 3.50, 3.55 -> 3.55
        return formatted.replace(/\.00$/, '');
    }

    /**
     * Format price for display
     */
    formatPrice(service, currency = null, options = {}) {
        const curr = currency || this.currentCurrency;
        const symbol = this.getCurrencySymbol(curr);
        const priceData = this.getDisplayPrice(service, curr, options);
        
        if (!priceData) {
            return null;
        }

        // Membership pricing
        if (options.isMembership && typeof priceData === 'number') {
            return `${symbol} ${this.formatPriceNumber(priceData)}`;
        }

        // Range pricing
        if (priceData.min !== undefined && priceData.max !== undefined) {
            const minFormatted = this.formatPriceNumber(priceData.min);
            const maxFormatted = this.formatPriceNumber(priceData.max);
            return `${symbol} ${minFormatted}-${maxFormatted}`;
        }

        // Hourly pricing
        if (priceData.type === 'hourly') {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}/${options.hourlyLabel || 'hour'}`;
        }

        // Fixed pricing
        if (priceData.amount !== undefined) {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}`;
        }

        return null;
    }

    /**
     * Get original price (for strikethrough when on sale)
     */
    getOriginalPrice(service, currency = null, options = {}) {
        if (!this.isSaleActive(service)) {
            return null;
        }

        const curr = currency || this.currentCurrency;
        const pricing = service.pricing;
        
        if (!pricing || typeof pricing !== 'object') {
            return null;
        }

        const currencyPricing = pricing[curr] || pricing[service.base_price_currency] || {};
        
        // Handle membership pricing
        if (options.isMembership) {
            const key = options.isFamily 
                ? (options.isMonthly ? 'family_monthly' : 'family_yearly')
                : (options.isMonthly ? 'monthly' : 'yearly');
            
            return currencyPricing[key] || null;
        }

        // Handle range pricing
        if (service.pricing_type === 'range') {
            const min = currencyPricing.min || service.price_range_min;
            const max = currencyPricing.max || service.price_range_max;
            if (min !== undefined && max !== undefined) {
                return { min, max };
            }
            return null;
        }

        // Handle hourly pricing
        if (service.pricing_type === 'hourly') {
            const amount = currencyPricing.amount || service.hourly_rate;
            return amount !== undefined ? { amount, type: 'hourly' } : null;
        }

        // Handle fixed/variable pricing
        const amount = currencyPricing.amount || service.price_range_min;
        return amount !== undefined ? { amount } : null;
    }

    /**
     * Format original price for display (for strikethrough)
     */
    formatOriginalPrice(service, currency = null, options = {}) {
        const curr = currency || this.currentCurrency;
        const symbol = this.getCurrencySymbol(curr);
        const priceData = this.getOriginalPrice(service, curr, options);
        
        if (!priceData) {
            return null;
        }

        // Membership pricing
        if (options.isMembership && typeof priceData === 'number') {
            return `${symbol} ${this.formatPriceNumber(priceData)}`;
        }

        // Range pricing
        if (priceData.min !== undefined && priceData.max !== undefined) {
            const minFormatted = this.formatPriceNumber(priceData.min);
            const maxFormatted = this.formatPriceNumber(priceData.max);
            return `${symbol} ${minFormatted}-${maxFormatted}`;
        }

        // Hourly pricing
        if (priceData.type === 'hourly') {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}/${options.hourlyLabel || 'hour'}`;
        }

        // Fixed pricing
        if (priceData.amount !== undefined) {
            const amountFormatted = this.formatPriceNumber(priceData.amount);
            return `${symbol} ${amountFormatted}`;
        }

        return null;
    }

    /**
     * Clear cache (useful for refreshing data)
     */
    clearCache(category = null) {
        if (category) {
            this.services.delete(category);
            // Remove slugs for this category
            const services = this.services.get(category) || [];
            services.forEach(service => {
                this.servicesBySlug.delete(service.slug);
            });
        } else {
            this.services.clear();
            this.servicesBySlug.clear();
        }
    }

    /**
     * Initialize currency listener
     */
    initCurrencyListener() {
        window.addEventListener('currencyChanged', (event) => {
            if (event.detail && event.detail.currency) {
                this.setCurrency(event.detail.currency);
                // Dispatch event for renderers to update
                window.dispatchEvent(new CustomEvent('servicesCurrencyChanged', {
                    detail: { currency: event.detail.currency }
                }));
            }
        });
    }
}

// Initialize global instance
if (typeof window.ServiceLoader === 'undefined') {
    window.ServiceLoader = new ServiceLoader();
    window.ServiceLoader.initCurrencyListener();
}


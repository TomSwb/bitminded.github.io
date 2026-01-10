/**
 * Currency Switcher Component
 * Handles currency selection and persistence
 */

if (typeof window.CurrencySwitcher === 'undefined') {
class CurrencySwitcher {
    constructor() {
        this.element = null;
        this.toggle = null;
        this.dropdown = null;
        this.buttons = [];
        this.currentCurrency = 'CHF';
        this.isInitialized = false;
        this.currencies = {
            'CHF': { code: 'CHF', name: 'Swiss Franc' },
            'USD': { code: 'USD', name: 'US Dollar' },
            'EUR': { code: 'EUR', name: 'Euro' },
            'GBP': { code: 'GBP', name: 'British Pound' }
        };
    }

    /**
     * Initialize the currency switcher component
     * @param {Object} config - Configuration options
     */
    async init(config = {}) {
        if (this.isInitialized) {
            return;
        }

        try {
            // Find element (either passed or in DOM)
            if (config.element) {
                this.element = config.element;
            } else {
                this.element = document.getElementById('currency-switcher');
            }

            if (!this.element) {
                window.logger?.warn('⚠️ Currency switcher element not found');
                return;
            }

            // Load saved currency preference (async, may need to wait)
            await this.loadCurrencyPreference();

            // Setup component
            this.setupComponent();

            // Setup event listeners
            this.setupEventListeners();

            // Update display
            this.updateDisplay();

            // Initialize translations if in compact mode
            if (config.compact) {
                this.element.classList.add('compact');
            }

            this.isInitialized = true;

        } catch (error) {
            window.logger?.error('❌ Currency Switcher: Failed to initialize:', error);
        }
    }

    /**
     * Load currency preference from database (if authenticated) or localStorage
     */
    async loadCurrencyPreference() {
        try {
            // First try to load from database if user is authenticated
            if (typeof window.supabase !== 'undefined') {
                const { data: { user }, error: userError } = await window.supabase.auth.getUser();
                
                if (!userError && user) {
                    // Try to load from database
                    const { data: profile, error: profileError } = await window.supabase
                        .from('user_profiles')
                        .select('preferred_currency')
                        .eq('id', user.id)
                        .maybeSingle();
                    
                    if (!profileError && profile?.preferred_currency && this.currencies[profile.preferred_currency]) {
                        this.currentCurrency = profile.preferred_currency;
                        // Also save to localStorage for offline access
                        this.saveCurrencyPreference();
                        return;
                    }
                }
            }
            
            // Fallback to localStorage
            const saved = localStorage.getItem('selectedCurrency');
            if (saved && this.currencies[saved]) {
                this.currentCurrency = saved;
            }
        } catch (error) {
            window.logger?.warn('⚠️ Could not load currency preference:', error);
            // Fallback to localStorage on error
            try {
                const saved = localStorage.getItem('selectedCurrency');
                if (saved && this.currencies[saved]) {
                    this.currentCurrency = saved;
                }
            } catch (localError) {
                window.logger?.warn('⚠️ Could not load currency from localStorage:', localError);
            }
        }
    }

    /**
     * Save currency preference to localStorage
     */
    saveCurrencyPreference() {
        try {
            localStorage.setItem('selectedCurrency', this.currentCurrency);
        } catch (error) {
            window.logger?.warn('⚠️ Could not save currency preference:', error);
        }
    }

    /**
     * Save currency preference to database for authenticated users
     * @param {string} currency - Currency to save
     */
    async saveCurrencyToDatabase(currency) {
        try {
            // Check if Supabase is available
            if (typeof window.supabase === 'undefined') {
                window.logger?.log('Supabase not available, skipping database save');
                return;
            }

            // Check if user is authenticated
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            
            if (userError || !user) {
                // Currency saved to localStorage silently
                return;
            }

            // Update currency in database
            const { error } = await window.supabase
                .from('user_profiles')
                .update({ preferred_currency: currency })
                .eq('id', user.id);

            if (error) {
                window.logger?.error('Failed to save currency to database:', error);
            } else {
                window.logger?.log(`✅ Currency saved to database: ${currency}`);
            }

        } catch (error) {
            window.logger?.error('Error saving currency to database:', error);
            // Don't fail the currency change if database save fails
        }
    }

    /**
     * Setup component elements
     */
    setupComponent() {
        this.toggle = this.element.querySelector('#currency-switcher-toggle');
        this.dropdown = this.element.querySelector('#currency-switcher-dropdown');
        this.buttons = Array.from(this.element.querySelectorAll('.currency-switcher__button'));

        if (!this.toggle || !this.dropdown) {
            throw new Error('Currency switcher elements not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle dropdown
        if (this.toggle) {
            this.toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Currency button clicks
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const currency = button.dataset.currency;
                if (currency) {
                    this.switchCurrency(currency);
                }
            });
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dropdown?.classList.contains('open')) {
                this.closeDropdown();
            }
        });
    }

    /**
     * Toggle dropdown
     */
    toggleDropdown() {
        if (this.dropdown && this.toggle) {
            const isOpen = this.dropdown.classList.contains('open');
            if (isOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        }
    }

    /**
     * Open dropdown
     */
    openDropdown() {
        if (this.dropdown && this.toggle) {
            this.dropdown.classList.add('open');
            this.toggle.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        if (this.dropdown && this.toggle) {
            this.dropdown.classList.remove('open');
            this.toggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Switch currency
     * @param {string} currency - Currency code to switch to
     */
    switchCurrency(currency) {
        if (!this.currencies[currency]) {
            window.logger?.warn(`⚠️ Invalid currency: ${currency}`);
            return;
        }

        if (currency === this.currentCurrency) {
            this.closeDropdown();
            return;
        }

        const previousCurrency = this.currentCurrency;
        this.currentCurrency = currency;

        // Save preference to localStorage (immediate)
        this.saveCurrencyPreference();

        // Save to database if authenticated (async, don't block)
        this.saveCurrencyToDatabase(currency).catch(error => {
            window.logger?.error('Failed to save currency to database:', error);
            // Don't block currency change if database save fails
        });

        // Update display
        this.updateDisplay();

        // Close dropdown
        this.closeDropdown();

        // Emit currency changed event
        this.emitCurrencyChanged(currency, previousCurrency);
    }

    /**
     * Update display
     */
    updateDisplay() {
        // Update toggle button text
        const symbolEl = this.element.querySelector('#currency-symbol');
        if (symbolEl) {
            symbolEl.textContent = this.currentCurrency;
        }

        // Update active button
        this.buttons.forEach(button => {
            if (button.dataset.currency === this.currentCurrency) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Emit currency changed event
     * @param {string} newCurrency - New currency code
     * @param {string} oldCurrency - Previous currency code
     */
    emitCurrencyChanged(newCurrency, oldCurrency) {
        const event = new CustomEvent('currencyChanged', {
            detail: {
                currency: newCurrency,
                previousCurrency: oldCurrency
            },
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current currency
     * @returns {string} Current currency code
     */
    getCurrentCurrency() {
        return this.currentCurrency;
    }

    /**
     * Set currency programmatically
     * @param {string} currency - Currency code to set
     */
    setCurrency(currency) {
        if (this.currencies[currency]) {
            this.switchCurrency(currency);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        // Cleanup if needed
        this.isInitialized = false;
    }
}

// Export class
window.CurrencySwitcher = CurrencySwitcher;
}

// Auto-initialize when DOM is ready (only if element exists)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const currencySwitcherEl = document.getElementById('currency-switcher');
        if (currencySwitcherEl && !currencySwitcherEl.dataset.initialized) {
            window.currencySwitcher = new CurrencySwitcher();
            window.currencySwitcher.init();
            currencySwitcherEl.dataset.initialized = 'true';
        }
    });
} else {
    const currencySwitcherEl = document.getElementById('currency-switcher');
    if (currencySwitcherEl && !currencySwitcherEl.dataset.initialized) {
        window.currencySwitcher = new CurrencySwitcher();
        window.currencySwitcher.init();
        currencySwitcherEl.dataset.initialized = 'true';
    }
}


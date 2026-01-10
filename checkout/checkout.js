/**
 * Checkout Page Handler
 * Handles checkout initiation, success page, and cancel page
 */

(function initializeCheckout() {
    if (window.checkoutInitialized) {
        return;
    }

    window.checkoutInitialized = true;

    // Determine which page we're on
    const pathname = window.location.pathname;
    const isCheckoutPage = pathname === '/checkout/' || pathname === '/checkout' || pathname.endsWith('/checkout/index.html');
    const isSuccessPage = pathname.includes('/checkout/success');
    const isCancelPage = pathname.includes('/checkout/cancel');

    if (isCheckoutPage) {
        handleCheckoutPage();
    } else if (isSuccessPage) {
        handleSuccessPage();
    } else if (isCancelPage) {
        handleCancelPage();
    }

    /**
     * Handle checkout page (index) - redirects to Stripe
     */
    async function handleCheckoutPage() {
        const loadingEl = document.getElementById('checkout-loading');
        const errorEl = document.getElementById('checkout-error');
        const errorMessageEl = document.getElementById('checkout-error-message');
        const retryButton = document.getElementById('checkout-retry-button');

        try {
            // Show loading state
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (errorEl) errorEl.classList.add('hidden');

            // Check authentication
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            const { data: { session: authSession }, error: authError } = await window.supabase.auth.getSession();

            if (authError || !authSession) {
                // Not authenticated - redirect to login
                const returnUrl = window.location.pathname + window.location.search;
                window.location.href = `/auth?redirect=${encodeURIComponent(returnUrl)}`;
                return;
            }

            // Get query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('product_id');
            const serviceId = urlParams.get('service_id');
            const interval = urlParams.get('interval'); // 'monthly' or 'yearly'

            // Validate exactly one ID is provided
            if (!productId && !serviceId) {
                throw new Error('Either product_id or service_id must be provided in URL parameters');
            }

            if (productId && serviceId) {
                throw new Error('Both product_id and service_id provided. Only one is allowed.');
            }

            // Get user's preferred currency (default to CHF)
            let userCurrency = 'CHF';
            try {
                const { data: profile } = await window.supabase
                    .from('user_profiles')
                    .select('preferred_currency')
                    .eq('id', authSession.user.id)
                    .maybeSingle();

                if (profile?.preferred_currency) {
                    userCurrency = profile.preferred_currency;
                }
            } catch (error) {
                window.logger?.warn('⚠️ Could not fetch user preferred currency, using CHF:', error);
            }

            // Build request body
            const requestBody = {
                ...(productId && { product_id: productId }),
                ...(serviceId && { service_id: serviceId }),
                ...(interval && { interval: interval }),
                currency: userCurrency
            };

            // Call create-checkout edge function
            if (!window.invokeEdgeFunction) {
                throw new Error('invokeEdgeFunction helper not available');
            }

            window.logger?.log('🛒 Creating checkout session:', requestBody);
            console.log('📤 Request body being sent:', JSON.stringify(requestBody, null, 2));

            let result;
            try {
                result = await window.invokeEdgeFunction('create-checkout', {
                    body: requestBody
                });
                console.log('✅ Response received:', result);
            } catch (err) {
                console.error('❌ Error details:', {
                    message: err.message,
                    status: err.status,
                    context: err.context,
                    stack: err.stack
                });
                throw err;
            }

            if (!result || !result.checkout_url) {
                // Check if result contains an error
                if (result?.error) {
                    throw new Error(result.error);
                }
                throw new Error('No checkout URL returned');
            }

            // Redirect to Stripe Checkout
            window.logger?.log('✅ Checkout session created, redirecting to Stripe...');
            window.location.href = result.checkout_url;

        } catch (error) {
            window.logger?.error('❌ Checkout error:', error);
            
            // Log full error details for debugging
            if (error.context || error.status || error.message) {
                window.logger?.error('Error details:', {
                    message: error.message,
                    status: error.status,
                    context: error.context
                });
            }
            
            // Hide loading, show error
            if (loadingEl) loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
            
            // Display error message
            let errorMessage = 'An error occurred while preparing your checkout. Please try again.';
            
            if (error.message) {
                if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
                    errorMessage = 'Please log in to continue with checkout.';
                    // Redirect to login after short delay
                    setTimeout(() => {
                        const returnUrl = window.location.pathname + window.location.search;
                        window.location.href = `/auth?redirect=${encodeURIComponent(returnUrl)}`;
                    }, 2000);
                } else if (error.message.includes('not found')) {
                    errorMessage = 'The item you selected is no longer available. Please try selecting a different item.';
                } else if (error.message.includes('does not support Stripe checkout')) {
                    errorMessage = 'This service does not support online checkout. Please use the booking form instead.';
                } else if (error.message.includes('Pricing not configured')) {
                    errorMessage = 'Pricing is not configured for this item. Please contact support.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            if (errorMessageEl) {
                errorMessageEl.textContent = errorMessage;
            }

            // Setup retry button
            if (retryButton) {
                retryButton.onclick = () => {
                    window.location.reload();
                };
            }
        }
    }

    /**
     * Handle success page - display purchase summary
     */
    async function handleSuccessPage() {
        const loadingEl = document.getElementById('success-loading');
        const successEl = document.getElementById('success-content');
        const errorEl = document.getElementById('success-error');

        try {
            // Show loading state
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (successEl) successEl.classList.add('hidden');
            if (errorEl) errorEl.classList.add('hidden');

            // Get session_id from query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');

            if (!sessionId) {
                throw new Error('No session_id provided in URL');
            }

            // Retrieve session details from edge function
            const supabaseUrl = window.SUPABASE_CONFIG?.url || 'https://eygpejbljuqpxwwoawkn.supabase.co';
            const supabaseAnonKey = window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Z3BlamJsanVxcHh3d29hd2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MTYyMjgsImV4cCI6MjA3NjA5MjIyOH0.hOqcc6QX5lhsOIiN3snA-psoGuNP-MGeNVdE7yDVFi8';
            
            const response = await fetch(`${supabaseUrl}/functions/v1/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to retrieve session details');
            }

            const sessionData = await response.json();

            // Hide loading, show success
            if (loadingEl) loadingEl.classList.add('hidden');
            if (successEl) successEl.classList.remove('hidden');

            // Populate summary
            const itemNameEl = document.getElementById('summary-item-name');
            const amountEl = document.getElementById('summary-amount');
            const intervalEl = document.getElementById('summary-interval');
            const intervalContainer = document.getElementById('summary-interval-container');
            const typeEl = document.getElementById('summary-type');

            if (itemNameEl) itemNameEl.textContent = sessionData.item_name || 'Unknown Item';
            
            if (amountEl) {
                const formattedAmount = formatCurrency(sessionData.amount || 0, sessionData.currency || 'CHF');
                amountEl.textContent = formattedAmount;
            }

            if (sessionData.interval) {
                if (intervalContainer) intervalContainer.style.display = 'block';
                if (intervalEl) {
                    const intervalText = sessionData.interval === 'monthly' 
                        ? translateText('checkout-interval-monthly', 'Monthly')
                        : translateText('checkout-interval-yearly', 'Yearly');
                    intervalEl.textContent = intervalText;
                }
            } else {
                if (intervalContainer) intervalContainer.style.display = 'none';
            }

            if (typeEl) {
                const typeText = sessionData.purchase_type === 'subscription'
                    ? translateText('checkout-type-subscription', 'Subscription')
                    : translateText('checkout-type-one-time', 'One-time payment');
                typeEl.textContent = typeText;
            }

            window.logger?.log('✅ Success page loaded with session data:', sessionData);

        } catch (error) {
            window.logger?.error('❌ Error loading success page:', error);
            
            // Hide loading, show generic success message
            if (loadingEl) loadingEl.classList.add('hidden');
            if (successEl) successEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    }

    /**
     * Handle cancel page - display cancellation message
     */
    async function handleCancelPage() {
        const loadingEl = document.getElementById('cancel-loading');
        const cancelEl = document.getElementById('cancel-content');
        const errorEl = document.getElementById('cancel-error');
        const messageEl = document.getElementById('cancel-message');
        const detailsEl = document.getElementById('cancel-details');
        const itemNameEl = document.getElementById('cancel-item-name');
        const statusEl = document.getElementById('cancel-status');
        const retryButton = document.getElementById('cancel-retry-button');

        try {
            // Show loading state
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (cancelEl) cancelEl.classList.add('hidden');
            if (errorEl) errorEl.classList.add('hidden');

            // Get session_id from query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');

            if (!sessionId) {
                // No session ID - show generic cancellation message
                if (loadingEl) loadingEl.classList.add('hidden');
                if (cancelEl) cancelEl.classList.remove('hidden');
                if (messageEl) {
                    messageEl.textContent = translateText(
                        'checkout-cancel-message',
                        'Your payment was cancelled. No charges were made.'
                    );
                }
                return;
            }

            // Retrieve session details from edge function
            const supabaseUrl = window.SUPABASE_CONFIG?.url || 'https://eygpejbljuqpxwwoawkn.supabase.co';
            const supabaseAnonKey = window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Z3BlamJsanVxcHh3d29hd2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MTYyMjgsImV4cCI6MjA3NjA5MjIyOH0.hOqcc6QX5lhsOIiN3snA-psoGuNP-MGeNVdE7yDVFi8';
            
            const response = await fetch(`${supabaseUrl}/functions/v1/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to retrieve session details');
            }

            const sessionData = await response.json();

            // Hide loading, show cancel content
            if (loadingEl) loadingEl.classList.add('hidden');
            if (cancelEl) cancelEl.classList.remove('hidden');

            // Determine status and message
            const isCancelled = sessionData.status === 'expired' || sessionData.payment_status === 'unpaid';
            const isFailed = sessionData.payment_status === 'failed';

            if (isFailed) {
                // Payment failed
                if (messageEl) {
                    messageEl.textContent = translateText(
                        'checkout-cancel-failed-message',
                        'Your payment failed. Please check your payment method and try again.'
                    );
                }
                
                // Show details
                if (detailsEl) detailsEl.style.display = 'block';
                if (itemNameEl && sessionData.item_name) {
                    itemNameEl.textContent = sessionData.item_name;
                }
                if (statusEl) {
                    statusEl.textContent = translateText('checkout-cancel-status-failed', 'Failed');
                }
            } else {
                // Payment cancelled
                if (messageEl) {
                    messageEl.textContent = translateText(
                        'checkout-cancel-message',
                        'Your payment was cancelled. No charges were made.'
                    );
                }
                
                // Show details if we have item info
                if (sessionData.item_name) {
                    if (detailsEl) detailsEl.style.display = 'block';
                    if (itemNameEl) itemNameEl.textContent = sessionData.item_name;
                    if (statusEl) {
                        statusEl.textContent = translateText('checkout-cancel-status-cancelled', 'Cancelled');
                    }
                } else {
                    if (detailsEl) detailsEl.style.display = 'none';
                }
            }

            // Setup retry button - get original item from metadata
            if (retryButton && sessionData.metadata) {
                retryButton.onclick = () => {
                    const returnUrl = sessionData.metadata.item_type === 'product'
                        ? `/checkout?product_id=${sessionData.metadata.item_id}`
                        : `/checkout?service_id=${sessionData.metadata.item_id}`;
                    
                    // Add interval if it was a subscription
                    const url = new URL(window.location.href);
                    const interval = url.searchParams.get('interval');
                    if (interval) {
                        window.location.href = `${returnUrl}&interval=${interval}`;
                    } else {
                        window.location.href = returnUrl;
                    }
                };
            }

            window.logger?.log('✅ Cancel page loaded with session data:', sessionData);

        } catch (error) {
            window.logger?.error('❌ Error loading cancel page:', error);
            
            // Hide loading, show generic cancellation message
            if (loadingEl) loadingEl.classList.add('hidden');
            if (cancelEl) cancelEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    }

    /**
     * Format currency amount
     */
    function formatCurrency(amount, currency) {
        const currencySymbols = {
            'CHF': 'CHF',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
        
        const symbol = currencySymbols[currency] || currency;
        return `${symbol} ${amount.toFixed(2)}`;
    }

    /**
     * Translate text using i18next or return fallback
     */
    function translateText(key, fallback) {
        if (key && typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
            const translated = i18next.t(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return fallback || '';
    }
})();

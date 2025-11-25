/**
 * Service Renderer Component
 * Updates DOM elements with service data, handles pricing types, sales, and status
 */

class ServiceRenderer {
    constructor(serviceLoader) {
        this.serviceLoader = serviceLoader || window.ServiceLoader;
    }

    /**
     * Main rendering function
     */
    renderService(service, elements, currency = null, options = {}) {
        if (!service) {
            return;
        }

        // Check if card has data-force-chf attribute to force CHF pricing
        const forceCHF = elements.card && elements.card.hasAttribute('data-force-chf');
        const curr = forceCHF ? 'CHF' : (currency || this.serviceLoader.currentCurrency);

        // Handle status first
        this.updateStatus(elements.card, service);

        // Update price
        if (elements.price) {
            this.updatePrice(elements.price, service, curr, options);
        }

        // Update duration
        if (elements.duration && service.duration) {
            this.updateDuration(elements.duration, service);
        }

        // Update description
        if (elements.description && service.description) {
            this.updateDescription(elements.description, service);
        }

        // Update sale badge and sale info
        if (elements.card) {
            this.updateSaleBadge(elements.card, service);
            this.updateSaleInfo(elements.card, service);
            this.updateFeaturedBadge(elements.card, service);
            // Payment method badges removed - will be handled in checkout flow (see Item #16 in priority list)
            // this.updatePaymentMethodBadge(elements.card, service);
            // this.updatePaymentMethodInfo(elements.card, service);
        }
    }

    /**
     * Update price display
     */
    updatePrice(element, service, currency, options = {}) {
        if (!element || !service) {
            return;
        }

        // Check if the card has data-force-chf attribute to force CHF pricing
        const card = element.closest('[data-service-slug]');
        const forceCHF = card && card.hasAttribute('data-force-chf');
        const finalCurrency = forceCHF ? 'CHF' : currency;

        const formattedPrice = this.serviceLoader.formatPrice(service, finalCurrency, options);
        
        if (!formattedPrice) {
            return;
        }

        // Check if element has child elements (like translatable content for additional costs)
        const hasChildren = element.children.length > 0;
        let children = [];
        if (hasChildren) {
            // Save children before updating
            children = Array.from(element.children);
        }

        const isSaleActive = this.serviceLoader.isSaleActive(service);
        
        if (isSaleActive) {
            // Show sale price with original price strikethrough on separate lines
            const originalPrice = this.serviceLoader.formatOriginalPrice(service, finalCurrency, options);
            
            if (originalPrice) {
                // Create price container with original price on first line, sale price on second line
                element.innerHTML = `
                    <div class="service-price-wrapper">
                        <div class="service-price-original" style="text-decoration: line-through; opacity: 0.6;">${originalPrice}</div>
                        <div class="service-price-sale">${formattedPrice}</div>
                    </div>
                `;
                // Re-append children if they exist
                if (hasChildren) {
                    children.forEach(child => element.appendChild(child));
                }
            } else {
                // Save children before updating
                if (hasChildren) {
                    element.textContent = formattedPrice + ' ';
                    children.forEach(child => element.appendChild(child));
                } else {
                    element.textContent = formattedPrice;
                }
            }
        } else {
            // Regular price - preserve child elements if they exist
            if (hasChildren) {
                // Find the first text node and update it, or insert before first child
                const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    // Update first text node
                    textNodes[0].textContent = formattedPrice + ' ';
                    // Remove other text nodes (they're just whitespace between children)
                    textNodes.slice(1).forEach(node => node.remove());
                } else {
                    // No text node, create one before first child
                    element.insertBefore(document.createTextNode(formattedPrice + ' '), element.firstChild);
                }
            } else {
                element.textContent = formattedPrice;
            }
        }
    }

    /**
     * Update duration
     */
    updateDuration(element, service) {
        if (!element || !service.duration) {
            return;
        }

        // Only update if element is empty or has default content
        if (!element.textContent.trim() || element.hasAttribute('data-i18n')) {
            element.textContent = service.duration;
        }
    }

    /**
     * Update description
     */
    updateDescription(element, service) {
        if (!element || !service.description) {
            return;
        }

        // Use short_description if available, otherwise description
        const text = service.short_description || service.description;
        
        // Only update if element is empty or has default content
        if (!element.textContent.trim() || element.hasAttribute('data-i18n')) {
            element.textContent = text;
        }
    }

    /**
     * Update sale badge
     */
    updateSaleBadge(cardElement, service) {
        if (!cardElement || !service) {
            return;
        }

        const isSaleActive = this.serviceLoader.isSaleActive(service);
        let badge = cardElement.querySelector('.service-sale-badge');

        if (isSaleActive) {
            if (!badge) {
                // Create sale badge
                badge = document.createElement('div');
                badge.className = 'service-sale-badge';
                
                // Create festive text with emoji
                const badgeText = document.createElement('span');
                badgeText.textContent = '🎉 ON SALE';
                badge.appendChild(badgeText);
                
                // Ensure card has position relative for absolute positioning
                const cardStyle = window.getComputedStyle(cardElement);
                if (cardStyle.position === 'static') {
                    cardElement.style.position = 'relative';
                }
                
                cardElement.appendChild(badge);
            }
            // Force display with important flags
            badge.style.display = 'block';
            badge.style.visibility = 'visible';
            badge.style.opacity = '1';
        } else {
            if (badge) {
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
                badge.style.opacity = '0';
            }
        }
    }

    /**
     * Update sale info (description and end date)
     */
    updateSaleInfo(cardElement, service) {
        if (!cardElement || !service) {
            return;
        }

        const isSaleActive = this.serviceLoader.isSaleActive(service);
        let saleInfo = cardElement.querySelector('.service-sale-info');

        if (isSaleActive && (service.sale_description || service.sale_end_date)) {
            if (!saleInfo) {
                // Create sale info container
                saleInfo = document.createElement('div');
                saleInfo.className = 'service-sale-info';
                cardElement.appendChild(saleInfo);
            }

            saleInfo.innerHTML = '';

            // Add sale description if available with custom emojis
            if (service.sale_description) {
                const description = document.createElement('div');
                description.className = 'service-sale-info__description';
                const leftEmoji = service.sale_emoji_left || '✨';
                const rightEmoji = service.sale_emoji_right || '✨';
                description.textContent = `${leftEmoji} ${service.sale_description} ${rightEmoji}`;
                saleInfo.appendChild(description);
            }

            // Add end date and time if available
            if (service.sale_end_date) {
                const endDate = new Date(service.sale_end_date);
                
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
                dateInfo.className = 'service-sale-info__end-date';
                dateInfo.innerHTML = `
                    <div><span class="service-sale-info__label">Ends:</span> ${formattedDate}</div>
                    <div><span class="service-sale-info__label">Time:</span> ${formattedTime}</div>
                `;
                saleInfo.appendChild(dateInfo);
            }

            saleInfo.style.display = 'block';
        } else {
            if (saleInfo) {
                saleInfo.style.display = 'none';
            }
        }
    }

    /**
     * Update featured badge and styling
     */
    updateFeaturedBadge(cardElement, service) {
        if (!cardElement || !service) {
            return;
        }

        const isFeatured = service.is_featured === true;

        // Determine badge class name based on card type
        let badgeClass = '';
        let featuredClass = '';
        
        if (cardElement.classList.contains('commissioning-pricing-card')) {
            badgeClass = 'commissioning-pricing-card__badge';
            featuredClass = 'commissioning-pricing-card--featured';
        } else if (cardElement.classList.contains('tech-support-service-card')) {
            badgeClass = 'tech-support-service-card__badge';
            featuredClass = 'tech-support-service-card--featured';
        } else if (cardElement.classList.contains('catalog-access-pricing-comparison-card')) {
            badgeClass = 'catalog-access-pricing-comparison-card__badge';
            featuredClass = 'catalog-access-pricing-comparison-card--featured';
        } else {
            // Generic fallback
            badgeClass = 'service-featured-badge';
            featuredClass = 'service-featured';
        }

        // Add or remove featured class
        if (isFeatured) {
            cardElement.classList.add(featuredClass);
        } else {
            cardElement.classList.remove(featuredClass);
        }

        // Handle badge - find existing badge by class name
        let badge = cardElement.querySelector(`.${badgeClass}`);
        if (!badge) {
            // Try alternative selectors
            if (badgeClass.includes('__')) {
                const baseClass = badgeClass.split('__')[0];
                badge = cardElement.querySelector(`.${baseClass}__badge`);
            }
            if (!badge) {
                badge = cardElement.querySelector('.service-featured-badge');
            }
        }


        if (isFeatured) {
            if (!badge) {
                // Create featured badge
                badge = document.createElement('div');
                badge.className = badgeClass;
                badge.classList.add('translatable-content');
                
                // Use appropriate translation key based on page
                if (cardElement.classList.contains('catalog-access-pricing-comparison-card')) {
                    badge.setAttribute('data-i18n', 'catalog-access-popular-badge');
                } else if (cardElement.classList.contains('commissioning-pricing-card')) {
                    badge.setAttribute('data-i18n', 'commissioning-popular-badge');
                } else if (cardElement.classList.contains('tech-support-service-card')) {
                    badge.setAttribute('data-i18n', 'tech-support-popular-badge');
                } else {
                    badge.setAttribute('data-i18n', 'popular-badge');
                }
                
                badge.textContent = 'Popular';
                cardElement.appendChild(badge);
                
                // Trigger translation update if i18next is available
                if (window.i18next && window.updateTranslatableContent) {
                    window.updateTranslatableContent(badge);
                }
            }
            badge.style.display = 'block';
        } else {
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Update payment method badge
     */
    updatePaymentMethodBadge(cardElement, service) {
        if (!cardElement || !service) {
            return;
        }

        // Determine payment method (with fallback logic)
        let paymentMethod = service.payment_method;
        if (!paymentMethod || (typeof paymentMethod === 'string' && paymentMethod.trim() === '')) {
            // Auto-determine based on category if not set
            if (service.service_category === 'commissioning') {
                paymentMethod = 'bank_transfer';
            } else if (service.service_category === 'tech-support') {
                // Check if has travel costs
                const hasTravel = service.additional_costs && 
                    (service.additional_costs.toLowerCase().includes('travel') || 
                     service.additional_costs.toLowerCase().includes('device cost'));
                paymentMethod = hasTravel ? 'bank_transfer' : 'stripe';
            } else if (service.service_category === 'catalog-access') {
                paymentMethod = 'stripe';
            } else {
                paymentMethod = 'stripe'; // Default fallback
            }
        }
        
        // Find or create payment method badge container
        let badgeContainer = cardElement.querySelector('.service-payment-method-badge-container');
        if (!badgeContainer) {
            badgeContainer = document.createElement('div');
            badgeContainer.className = 'service-payment-method-badge-container';
            badgeContainer.style.display = 'flex';
            
            // Insert after title or at the beginning of the card
            const title = cardElement.querySelector('.tech-support-service-card__title') || 
                         cardElement.querySelector('.commissioning-pricing-card__title') ||
                         cardElement.querySelector('.catalog-access-pricing-comparison-card__title');
            
            if (title) {
                title.insertAdjacentElement('afterend', badgeContainer);
            } else {
                cardElement.insertBefore(badgeContainer, cardElement.firstChild);
            }
        }

        // Ensure container is visible and has correct display (flex column)
        badgeContainer.style.display = 'flex';
        badgeContainer.style.flexDirection = 'column';
        badgeContainer.style.alignItems = 'center';
        badgeContainer.style.gap = '0.25rem';
        
        // Clear existing content
        badgeContainer.innerHTML = '';

        // Create "Payment option" label
        const label = document.createElement('span');
        label.className = 'payment-method-label translatable-content';
        label.setAttribute('data-i18n', 'payment-option-label');
        label.textContent = 'Payment option';
        
        // Create container for badges (flex row)
        const badgesRow = document.createElement('div');
        badgesRow.className = 'payment-method-badges-row';
        badgesRow.style.display = 'flex';
        badgesRow.style.gap = '0.5rem';
        badgesRow.style.flexWrap = 'wrap';
        badgesRow.style.justifyContent = 'center';
        badgesRow.style.alignItems = 'center';
        
        // Check if service supports both formats - only if explicitly set to 'both' in database
        const supportsBothFormats = paymentMethod === 'both';

        // Determine label color based on payment method(s)
        let labelColor = '#635bff'; // Default to stripe/online color
        
        if (supportsBothFormats) {
            // Service supports both formats - show both badges
            const onlineBadge = document.createElement('span');
            onlineBadge.className = 'payment-method-badge payment-method-badge--stripe translatable-content';
            onlineBadge.setAttribute('data-i18n', 'payment-method-online');
            onlineBadge.textContent = 'Online';
            onlineBadge.setAttribute('title', '');
            onlineBadge.setAttribute('data-i18n-title', 'payment-method-online-remote-tooltip');
            
            const bankBadge = document.createElement('span');
            bankBadge.className = 'payment-method-badge payment-method-badge--bank-transfer translatable-content';
            bankBadge.setAttribute('data-i18n', 'payment-method-invoice');
            bankBadge.textContent = 'Invoice';
            bankBadge.setAttribute('title', '');
            bankBadge.setAttribute('data-i18n-title', 'payment-method-invoice-inperson-tooltip');
            // Ensure invoice badge has yellow background and black text
            bankBadge.style.backgroundColor = '#ffcc00';
            bankBadge.style.color = '#000000';
            
            badgesRow.appendChild(onlineBadge);
            badgesRow.appendChild(bankBadge);
            
            // Make badges visible immediately
            onlineBadge.classList.add('loaded');
            bankBadge.classList.add('loaded');
            onlineBadge.style.display = 'inline-block';
            bankBadge.style.display = 'inline-block';
            
            // Label color for both: use primary stripe color
            labelColor = '#635bff';
            
            // Apply translations immediately
            this.applyBadgeTranslations(onlineBadge);
            this.applyBadgeTranslations(bankBadge);
            
            // Listen for translation events and update badges
            const updateBadges = () => {
                setTimeout(() => {
                    this.applyBadgeTranslations(onlineBadge);
                    this.applyBadgeTranslations(bankBadge);
                    this.applyLabelTranslation(label);
                }, 50);
            };
            
            // Listen to all possible translation events
            document.addEventListener('techSupportTranslationsApplied', updateBadges);
            document.addEventListener('commissioningTranslationsApplied', updateBadges);
            document.addEventListener('catalogAccessTranslationsApplied', updateBadges);
            document.addEventListener('languageChanged', updateBadges);
            
            // Also listen to i18next language changes directly if available
            if (window.i18next && typeof window.i18next.on === 'function') {
                window.i18next.on('languageChanged', updateBadges);
            }
            
            // Force update after delays to catch translations
            setTimeout(updateBadges, 100);
            setTimeout(updateBadges, 500);
        } else {
            // Single payment method
            const badge = document.createElement('span');
            badge.className = `payment-method-badge payment-method-badge--${paymentMethod} translatable-content`;
            
            if (paymentMethod === 'bank_transfer') {
                badge.setAttribute('data-i18n', 'payment-method-invoice');
                badge.textContent = 'Invoice';
                badge.setAttribute('title', '');
                badge.setAttribute('data-i18n-title', 'payment-method-invoice-tooltip');
                // Ensure invoice badge has yellow background and black text
                badge.style.backgroundColor = '#ffcc00';
                badge.style.color = '#000000';
                labelColor = '#ffcc00'; // Bank transfer/invoice yellow
            } else {
                badge.setAttribute('data-i18n', 'payment-method-online');
                badge.textContent = 'Online';
                badge.setAttribute('title', '');
                badge.setAttribute('data-i18n-title', 'payment-method-online-tooltip');
                // Ensure online badge has white text
                badge.style.color = '#ffffff';
                labelColor = '#635bff'; // Stripe/online purple
            }
            
            badgesRow.appendChild(badge);
            
            // Make badge visible immediately
            badge.classList.add('loaded');
            badge.style.display = 'inline-block';
            
            // Apply translations immediately
            this.applyBadgeTranslations(badge);
            
            // Listen for translation events to update badge when language changes
            const updateBadge = () => {
                setTimeout(() => {
                    this.applyBadgeTranslations(badge);
                    this.applyLabelTranslation(label);
                }, 50);
            };
            
            // Listen to multiple translation events
            document.addEventListener('techSupportTranslationsApplied', updateBadge);
            document.addEventListener('commissioningTranslationsApplied', updateBadge);
            document.addEventListener('catalogAccessTranslationsApplied', updateBadge);
            document.addEventListener('languageChanged', updateBadge);
            
            // Also listen to i18next language changes directly if available
            if (window.i18next && typeof window.i18next.on === 'function') {
                window.i18next.on('languageChanged', updateBadge);
            }
            
            // Force update after delays to catch translations
            setTimeout(updateBadge, 100);
            setTimeout(updateBadge, 500);
        }
        
        // Set label color and store it as data attribute for later reference
        label.style.color = labelColor;
        label.setAttribute('data-label-color', labelColor);
        
        // Apply label translation
        this.applyLabelTranslation(label);
        
        // Add label and badges row to container
        badgeContainer.appendChild(label);
        badgeContainer.appendChild(badgesRow);
    }

    /**
     * Update payment method info text
     * NOTE: Info text removed per user request - payment method details will be handled in checkout workflow
     */
    updatePaymentMethodInfo(cardElement, service) {
        // Remove any existing info containers
        const existingInfo = cardElement.querySelector('.service-payment-method-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        // No longer creating info text - removed per user request
        return;
    }

    /**
     * Handle status (hide/disable/badge)
     */
    updateStatus(cardElement, service) {
        if (!cardElement || !service) {
            return;
        }

        const status = service.status || 'available';

        // Remove existing status classes and badges
        cardElement.classList.remove(
            'service-status-archived',
            'service-status-unavailable',
            'service-status-overbooked',
            'service-status-coming-soon'
        );

        const existingBadge = cardElement.querySelector('.service-status-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        switch (status) {
            case 'archived':
                // Hide card completely
                cardElement.style.display = 'none';
                break;

            case 'unavailable':
            case 'overbooked':
                // Show card with disabled state and badge
                cardElement.style.display = '';
                cardElement.classList.add(`service-status-${status}`);
                this.addStatusBadge(cardElement, status);
                break;

            case 'coming-soon':
                // Show card with badge
                cardElement.style.display = '';
                cardElement.classList.add('service-status-coming-soon');
                this.addStatusBadge(cardElement, status);
                break;

            case 'available':
            case 'on-sale':
            default:
                // Show normally
                cardElement.style.display = '';
                break;
        }
    }

    /**
     * Add status badge
     */
    addStatusBadge(cardElement, status) {
        const badge = document.createElement('div');
        badge.className = 'service-status-badge';
        
        const statusText = {
            'unavailable': 'Unavailable',
            'overbooked': 'Overbooked',
            'coming-soon': 'Coming Soon'
        };

        badge.textContent = statusText[status] || status;
        cardElement.appendChild(badge);
    }

    /**
     * Format membership price
     */
    formatMembershipPrice(service, currency, isMonthly, isFamily) {
        return this.serviceLoader.formatPrice(service, currency, {
            isMembership: true,
            isMonthly,
            isFamily
        });
    }

    /**
     * Update membership pricing (for catalog access)
     */
    updateMembershipPricing(priceElement, service, currency, isMonthly, isFamily) {
        if (!priceElement || !service) {
            return;
        }

        const formattedPrice = this.formatMembershipPrice(service, currency, isMonthly, isFamily);
        
        if (!formattedPrice) {
            return;
        }

        const isSaleActive = this.serviceLoader.isSaleActive(service);
        
        if (isSaleActive) {
            // Show sale price with original price strikethrough on separate lines
            const originalPrice = this.serviceLoader.formatOriginalPrice(service, currency, {
                isMembership: true,
                isMonthly,
                isFamily
            });
            
            if (originalPrice) {
                priceElement.innerHTML = `
                    <div class="service-price-wrapper">
                        <div class="service-price-original" style="text-decoration: line-through; opacity: 0.6;">${originalPrice}</div>
                        <div class="service-price-sale">${formattedPrice}</div>
                    </div>
                `;
            } else {
                priceElement.textContent = formattedPrice;
            }
        } else {
            priceElement.textContent = formattedPrice;
        }
    }

    /**
     * Update reduced fare price in table
     */
    updateReducedFarePrice(element, service, currency) {
        if (!element || !service) {
            return;
        }

        // Check if the table row has data-force-chf attribute to force CHF pricing
        const row = element.closest('tr[data-service-slug]');
        const forceCHF = row && row.hasAttribute('data-force-chf');
        const curr = forceCHF ? 'CHF' : currency;

        const formattedPrice = this.serviceLoader.formatReducedFarePrice(service, curr);
        
        if (!formattedPrice) {
            return;
        }

        // Update the element text
        // For hourly pricing, the formatted price already includes "/hour"
        element.textContent = formattedPrice;
    }

    /**
     * Render all services on a page
     */
    renderAllServices(services, currency = null, options = {}) {
        services.forEach(service => {
            const card = document.querySelector(`[data-service-slug="${service.slug}"]`);
            if (!card) {
                return;
            }

            const elements = {
                card: card,
                price: card.querySelector('[data-service-slug][data-element="price"]') || 
                       card.querySelector('.commissioning-pricing-card__price') ||
                       card.querySelector('.catalog-access-pricing-comparison-card__price') ||
                       card.querySelector('.badge-value'),
                duration: card.querySelector('[data-service-slug][data-element="duration"]') ||
                         card.querySelector('.commissioning-pricing-card__duration') ||
                         card.querySelector('.catalog-access-pricing-comparison-card__duration'),
                description: card.querySelector('[data-service-slug][data-element="description"]') ||
                            card.querySelector('.commissioning-pricing-card__description') ||
                            card.querySelector('.catalog-access-pricing-comparison-card__description')
            };

            this.renderService(service, elements, currency, options);
        });
    }

    /**
     * Apply translations to a badge element
     */
    applyBadgeTranslations(badgeElement) {
        if (!badgeElement) return;

        // Make sure badge is visible immediately
        badgeElement.classList.add('loaded');
        if (badgeElement.style) {
            badgeElement.style.display = badgeElement.style.display || 'inline-block';
        }

        // Apply translations - i18next might be available globally
        if (window.i18next && typeof window.i18next.t === 'function') {
            const key = badgeElement.getAttribute('data-i18n');
            const titleKey = badgeElement.getAttribute('data-i18n-title');
            
            if (key) {
                try {
                    // Try translation with current language
                    const translation = window.i18next.t(key);
                    // Check if translation exists and is different from key
                    if (translation && translation !== key && translation.trim() !== '' && translation.trim() !== key.trim()) {
                        badgeElement.textContent = translation;
                    }
                } catch (e) {
                    // Translation failed, keep default text
                }
            }
            
            if (titleKey) {
                try {
                    const titleTranslation = window.i18next.t(titleKey);
                    if (titleTranslation && titleTranslation !== titleKey && titleTranslation.trim() !== '' && titleTranslation.trim() !== titleKey.trim()) {
                        badgeElement.title = titleTranslation;
                    }
                } catch (e) {
                    // Translation failed, keep default title
                }
            }
        }
    }

    /**
     * Apply translations to label element
     */
    applyLabelTranslation(labelElement) {
        if (!labelElement) return;

        // Make sure label is visible immediately
        labelElement.classList.add('loaded');
        labelElement.style.display = 'block';
        
        // Restore label color from data attribute if it exists
        const savedColor = labelElement.getAttribute('data-label-color');
        if (savedColor) {
            labelElement.style.color = savedColor;
        }

        // Apply translations if i18next is available
        if (window.i18next && typeof window.i18next.t === 'function') {
            const key = labelElement.getAttribute('data-i18n');
            if (key) {
                try {
                    const translation = window.i18next.t(key);
                    if (translation && translation !== key && translation.trim() !== '' && translation.trim() !== key.trim()) {
                        labelElement.textContent = translation;
                    }
                } catch (e) {
                    // Translation failed, keep default text
                }
            }
        }
        
        // Ensure color is still applied after translation
        if (savedColor) {
            labelElement.style.color = savedColor;
        }
    }

    /**
     * Apply translations to info text element
     */
    applyInfoTextTranslations(infoElement) {
        if (!infoElement) return;

        // Make sure info is visible immediately
        infoElement.classList.add('loaded');
        infoElement.style.display = ''; // Ensure it's not hidden

        // Apply translations if i18next is available
        if (window.i18next && window.i18next.isInitialized) {
            const key = infoElement.getAttribute('data-i18n');
            if (key) {
                // Try to translate even if exists check fails
                try {
                    const translation = window.i18next.t(key);
                    if (translation && translation !== key) {
                        infoElement.textContent = translation;
                    }
                } catch (e) {
                    // Translation failed, keep default text
                }
            }
        }
    }
}

// Export for use
if (typeof window.ServiceRenderer === 'undefined') {
    window.ServiceRenderer = ServiceRenderer;
}


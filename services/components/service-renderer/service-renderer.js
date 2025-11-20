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
}

// Export for use
if (typeof window.ServiceRenderer === 'undefined') {
    window.ServiceRenderer = ServiceRenderer;
}


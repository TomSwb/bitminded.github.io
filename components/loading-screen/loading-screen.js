/**
 * Loading Screen Component
 * Handles the loading screen display and hiding logic
 */
class LoadingScreen {
    constructor() {
        this.loadingElement = null;
        this.isVisible = true;
        this.readyFlags = {
            translation: false,
            page: false
        };
    }

    /**
     * Initialize the loading screen component
     * @param {Object} options - Configuration options
     * @param {string} options.container - Container selector to inject into
     * @param {boolean} options.autoHide - Whether to auto-hide when ready
     * @param {number} options.timeout - Maximum time to show loading screen (ms)
     */
    init(options = {}) {
        const defaultOptions = {
            container: 'body',
            autoHide: true,
            timeout: 3000 // 3 second timeout
        };
        
        this.options = { ...defaultOptions, ...options };
        
        // Inject the loading screen HTML
        this.injectHTML();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up timeout fallback
        this.setupTimeout();
        
        // Loading screen component initialized
    }

    /**
     * Inject the loading screen HTML into the page
     */
    injectHTML() {
        const container = document.querySelector(this.options.container);
        if (!container) {
            console.error('Loading screen container not found:', this.options.container);
            return;
        }

        // Create a temporary div to load the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.getHTMLTemplate();
        
        // Get the loading screen element
        const loadingScreen = tempDiv.firstElementChild;
        
        // Insert at the beginning of the container
        container.insertBefore(loadingScreen, container.firstChild);
        
        this.loadingElement = document.getElementById('loading-screen');
        
        if (!this.loadingElement) {
            console.error('Failed to create loading screen element');
        }
    }

    /**
     * Get the HTML template for the loading screen
     * @returns {string} HTML template
     */
    getHTMLTemplate() {
        return `
            <div id="loading-screen">
                <div class="loading-content">
                    <img src="/icons/icon-192x192.png" alt="BitMinded" class="loading-logo">
                    <div class="loading-spinner"></div>
                    <p class="loading-text">Loading...</p>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners for the loading screen
     */
    setupEventListeners() {
        // Listen for translation ready
        document.addEventListener('translationReady', () => {
            this.setReadyFlag('translation', true);
        });

        // Listen for page ready
        document.addEventListener('pageReady', () => {
            this.setReadyFlag('page', true);
        });

        // Legacy support for window.translationReady
        // Check immediately first in case it's already set
        if (window.translationReady) {
            console.log('✅ Translation already ready on init');
            this.setReadyFlag('translation', true);
        } else {
            // If not ready yet, start polling
            let pollCount = 0;
            const maxPolls = 60; // Max 3 seconds (60 * 50ms)
            const checkTranslationReady = () => {
                pollCount++;
                if (window.translationReady) {
                    console.log('✅ Translation ready after polling:', pollCount, 'checks');
                    this.setReadyFlag('translation', true);
                } else if (pollCount >= maxPolls) {
                    console.warn('⚠️ Translation polling timeout, forcing hide');
                    this.forceHide();
                } else {
                    setTimeout(checkTranslationReady, 50); // Check more frequently
                }
            };
            checkTranslationReady();
        }
    }

    /**
     * Set up timeout fallback to ensure loading screen doesn't stay forever
     */
    setupTimeout() {
        if (this.options.timeout > 0) {
            setTimeout(() => {
                if (this.isVisible) {
                    console.warn('⚠️ Loading screen timeout reached, forcing hide');
                    this.forceHide();
                }
            }, this.options.timeout);
        }
    }

    /**
     * Set a ready flag and check if we should hide the loading screen
     * @param {string} flag - The flag to set
     * @param {boolean} value - The value to set
     */
    setReadyFlag(flag, value) {
        this.readyFlags[flag] = value;
        console.log(`🏁 Ready flag set: ${flag} = ${value}`, this.readyFlags);
        
        // Safety check for options
        if (this.options && this.options.autoHide && this.isReadyToHide()) {
            console.log('✅ All conditions met, attempting to hide');
            this.hide();
        } else {
            console.log('⏳ Not ready to hide yet:', {
                hasOptions: !!this.options,
                autoHide: this.options?.autoHide,
                isReadyToHide: this.isReadyToHide()
            });
        }
    }

    /**
     * Check if the loading screen is ready to be hidden
     * @returns {boolean} True if ready to hide
     */
    isReadyToHide() {
        // If translation is ready, we can hide (page flag is optional)
        return this.readyFlags.translation;
    }

    /**
     * Show the loading screen
     */
    show() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('hidden');
            this.isVisible = true;
            console.log('🔄 Loading screen shown');
        }
    }

    /**
     * Hide the loading screen
     */
    hide() {
        if (this.loadingElement && this.isVisible) {
            console.log('✅ Hiding loading screen');
            this.loadingElement.classList.add('hidden');
            this.isVisible = false;
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('loadingScreenHidden'));
        } else {
            console.warn('⚠️ hide() called but conditions not met:', {
                hasElement: !!this.loadingElement,
                isVisible: this.isVisible
            });
        }
    }

    /**
     * Force hide the loading screen (ignores ready flags)
     */
    forceHide() {
        this.hide();
    }

    /**
     * Check if the loading screen is currently visible
     * @returns {boolean} True if visible
     */
    isVisible() {
        return this.isVisible;
    }

    /**
     * Update the loading text
     * @param {string} text - New loading text
     */
    updateText(text) {
        const textElement = this.loadingElement?.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }

    /**
     * Destroy the loading screen component
     */
    destroy() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
        this.isVisible = false;
        console.log('🗑️ Loading screen component destroyed');
    }
}

// Create global instance
window.loadingScreen = new LoadingScreen();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.loadingScreen.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingScreen;
}

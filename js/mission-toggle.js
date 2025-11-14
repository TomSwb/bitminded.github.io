/**
 * Mission Toggle Component
 * Handles switching between "We Build" and "We Guide" missions
 */
class MissionToggle {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.currentMission = 'build'; // Default to "We Build"
        
        this.init();
    }

    /**
     * Initialize the mission toggle component
     */
    init() {
        try {
            this.cacheElements();
            this.loadSavedPreference();
            this.bindEvents();
            this.updateTranslations();
            this.isInitialized = true;
            
            console.log('✅ Mission Toggle initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Mission Toggle:', error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            buildButton: document.getElementById('mission-toggle-build'),
            guideButton: document.getElementById('mission-toggle-guide'),
            buildContent: document.getElementById('mission-build'),
            guideContent: document.getElementById('mission-guide'),
            buildButtonText: document.getElementById('mission-toggle-build-text'),
            guideButtonText: document.getElementById('mission-toggle-guide-text')
        };
    }

    /**
     * Load saved mission preference from localStorage
     */
    loadSavedPreference() {
        const savedMission = localStorage.getItem('selectedMission');
        if (savedMission === 'guide') {
            this.setMission('guide', false, false); // false = don't save to localStorage, false = don't scroll
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.buildButton || !this.elements.guideButton) {
            console.warn('Mission toggle buttons not found');
            return;
        }

        // Build button click
        this.elements.buildButton.addEventListener('click', () => {
            this.setMission('build');
        });

        // Guide button click
        this.elements.guideButton.addEventListener('click', () => {
            this.setMission('guide');
        });

        // Listen for language changes to update button text
        window.addEventListener('languageChanged', (e) => {
            this.updateTranslations();
        });

        // Keyboard navigation
        this.elements.buildButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.setMission('build');
            }
        });

        this.elements.guideButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.setMission('guide');
            }
        });
    }

    /**
     * Update translations for button text
     */
    updateTranslations() {
        // The translations are handled by the main language system
        // This method is here in case we need to manually update text
    }

    /**
     * Set the current mission (build or guide)
     * @param {string} mission - 'build' or 'guide'
     * @param {boolean} save - Whether to save to localStorage (default: true)
     * @param {boolean} shouldScroll - Whether to scroll to content (default: true)
     */
    setMission(mission, save = true, shouldScroll = true) {
        if (mission === this.currentMission) {
            return; // Already on this mission
        }

        // Update current mission
        this.currentMission = mission;

        // Update button states
        this.updateButtonStates();

        // Show/hide content
        this.updateContentVisibility();

        // Save preference
        if (save) {
            localStorage.setItem('selectedMission', mission);
        }

        // Smooth scroll to top of content (only if requested)
        if (shouldScroll) {
            const scrollTarget = mission === 'build' 
                ? this.elements.buildContent 
                : this.elements.guideContent;
            
            if (scrollTarget) {
                scrollTarget.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }

        // Dispatch custom event
        const missionChangedEvent = new CustomEvent('missionChanged', {
            detail: { mission: mission }
        });
        window.dispatchEvent(missionChangedEvent);

        // Announce to screen readers
        this.announceChange(mission);
    }

    /**
     * Update button states based on current mission
     */
    updateButtonStates() {
        const isBuilding = this.currentMission === 'build';

        // Update active classes
        this.elements.buildButton.classList.toggle('mission-toggle__button--active', isBuilding);
        this.elements.guideButton.classList.toggle('mission-toggle__button--active', !isBuilding);

        // Update ARIA attributes
        this.elements.buildButton.setAttribute('aria-pressed', isBuilding);
        this.elements.guideButton.setAttribute('aria-pressed', !isBuilding);
    }

    /**
     * Update content visibility based on current mission
     */
    updateContentVisibility() {
        const isBuilding = this.currentMission === 'build';

        // Show/hide content with hidden class
        this.elements.buildContent.classList.toggle('hidden', !isBuilding);
        this.elements.guideContent.classList.toggle('hidden', isBuilding);

        // Update ARIA attributes
        this.elements.buildContent.setAttribute('aria-hidden', !isBuilding);
        this.elements.guideContent.setAttribute('aria-hidden', isBuilding);
    }

    /**
     * Announce mission change to screen readers
     * @param {string} mission - The newly selected mission
     */
    announceChange(mission) {
        const announcement = mission === 'build' 
            ? 'Showing We Build section'
            : 'Showing We Guide section';
        
        // Create or update announcement element
        let announcer = document.getElementById('mission-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'mission-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.position = 'absolute';
            announcer.style.left = '-10000px';
            announcer.style.width = '1px';
            announcer.style.height = '1px';
            announcer.style.overflow = 'hidden';
            document.body.appendChild(announcer);
        }
        
        announcer.textContent = announcement;
    }

    /**
     * Get current mission
     * @returns {string} Current mission ('build' or 'guide')
     */
    getCurrentMission() {
        return this.currentMission;
    }
}

// Create global instance
window.missionToggle = new MissionToggle();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.missionToggle && !window.missionToggle.isInitialized) {
        window.missionToggle.init();
    }
});

// Also try to initialize when the script loads (in case DOM is already ready)
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already ready, initialize immediately
    setTimeout(() => {
        if (window.missionToggle && !window.missionToggle.isInitialized) {
            window.missionToggle.init();
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionToggle;
}


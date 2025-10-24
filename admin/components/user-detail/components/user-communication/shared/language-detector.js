/**
 * Language Detection Utility
 * Handles user language detection and greeting generation
 */

class LanguageDetector {
    constructor() {
        this.languageMap = {
            'en': { 
                flag: '🇬🇧', 
                name: 'English',
                greeting: 'Hello'
            },
            'es': { 
                flag: '🇪🇸', 
                name: 'Spanish',
                greeting: 'Hola'
            },
            'fr': { 
                flag: '🇫🇷', 
                name: 'French',
                greeting: 'Bonjour'
            },
            'de': { 
                flag: '🇩🇪', 
                name: 'German',
                greeting: 'Hallo'
            }
        };
    }

    /**
     * Get language information by code
     * @param {string} languageCode - Language code (en, es, fr, de)
     * @returns {Object} Language information
     */
    getLanguageInfo(languageCode) {
        return this.languageMap[languageCode] || this.languageMap['en'];
    }

    /**
     * Generate greeting for a user
     * @param {string} username - Username
     * @param {string} languageCode - User's language preference
     * @returns {string} Formatted greeting
     */
    generateGreeting(username, languageCode = 'en') {
        const lang = this.getLanguageInfo(languageCode);
        return `${lang.greeting} ${username},`;
    }

    /**
     * Get all available languages
     * @returns {Array} Array of language objects
     */
    getAvailableLanguages() {
        return Object.entries(this.languageMap).map(([code, info]) => ({
            code,
            ...info
        }));
    }

    /**
     * Validate language code
     * @param {string} languageCode - Language code to validate
     * @returns {boolean} True if valid
     */
    isValidLanguageCode(languageCode) {
        return languageCode in this.languageMap;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LanguageDetector = LanguageDetector;
}
